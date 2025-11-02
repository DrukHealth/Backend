import os
from datetime import datetime
import cv2
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv
from typing import Optional, Dict
import traceback
import certifi

# --------------------------
# Load environment variables
# --------------------------
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI_2")

# --------------------------
# MongoDB connection
# --------------------------
try:
    client = MongoClient(
        MONGO_URI,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=10000,
        socketTimeoutMS=10000
    )
    # Test connection
    client.admin.command('ping')
    db = client['DrukHealthNew']
    records_collection = db['ctg_records']
    print("✓ MongoDB connected successfully!")
    MONGO_CONNECTED = True
except Exception as e:
    print(f"⚠ MongoDB connection failed: {e}")
    print("⚠ App will run without database")
    MONGO_CONNECTED = False
    db = None
    records_collection = None

# --------------------------
# FastAPI app
# --------------------------
app = FastAPI(title="CTG Prediction API")

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# --------------------------
# Load ML model
# --------------------------
MODEL_PATH = "decision_tree_all_cardio_features.pkl"
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model file '{MODEL_PATH}' not found.")

model = joblib.load(MODEL_PATH)
print(f"✓ Model loaded successfully ({len(model.feature_names_in_)} features)")

# --------------------------
# Helper functions
# --------------------------
def extract_ctg_signals(image_path, fhr_top_ratio=0.55, bpm_per_cm=30, toco_per_cm=25,
                        paper_speed_cm_min=2, fhr_min_line=50):
    """Extract FHR and UC signals from CTG image"""
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Failed to read image at {image_path}")
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    if np.mean(gray) > 127:
        gray = cv2.bitwise_not(gray)
    
    height, width = gray.shape
    fhr_img = gray[0:int(fhr_top_ratio*height), :]
    uc_img = gray[int(fhr_top_ratio*height):, :]

    def extract_signal(trace_img):
        _, thresh = cv2.threshold(trace_img, 50, 255, cv2.THRESH_BINARY)
        h, w = thresh.shape
        signal = []
        for x in range(w):
            y_pixels = np.where(thresh[:, x] > 0)[0]
            y = np.median(y_pixels) if len(y_pixels) > 0 else np.nan
            signal.append(y)
        signal = pd.Series(signal).interpolate(limit_direction='both').values
        return h - signal

    fhr_signal = extract_signal(fhr_img)
    uc_signal = extract_signal(uc_img)
    
    px_per_cm = height / 10.0
    bpm_per_px = bpm_per_cm / px_per_cm
    toco_per_px = toco_per_cm / px_per_cm
    fhr_signal = fhr_min_line + fhr_signal * bpm_per_px
    uc_signal = uc_signal * toco_per_px
    px_per_sec = (paper_speed_cm_min / 60.0) * px_per_cm
    time_axis = np.arange(len(fhr_signal)) / px_per_sec
    
    return fhr_signal, uc_signal, time_axis

def compute_ctg_features(fhr_signal, uc_signal, time_axis):
    """Compute CTG features from signals"""
    features = {}
    baseline = np.mean(fhr_signal)
    features['Baseline value (SisPorto)'] = round(float(baseline), 2)
    
    fhr_diff = np.diff(fhr_signal)
    features['Mean value of long-term variability (SisPorto)'] = round(np.std(fhr_signal), 2)
    features['Mean value of short-term variability (SisPorto)'] = round(np.mean(np.abs(fhr_diff)), 2)
    features['Percentage time with abnormal short-term variability (SisPorto)'] = round(np.sum(np.abs(fhr_diff)>25)/len(fhr_diff) * 100, 2)
    features['Percentage time with abnormal long-term variability (SisPorto)'] = round(np.sum(np.abs(fhr_signal-baseline)>20)/len(fhr_signal) * 100, 2)
    
    # Dummy counts for now
    features['Accelerations (SisPorto)'] = 0
    features['Uterine contractions (SisPorto)'] = 0
    features['Fetal movements (SisPorto)'] = 0
    features['Light decelerations (raw)'] = 0
    features['Severe decelerations (raw)'] = 0
    features['Prolonged decelerations (raw)'] = 0
    features['Repetitive decelerations (raw)'] = 0
    
    return features

def prepare_model_df(features):
    """Prepare DataFrame for model"""
    df = pd.DataFrame([features])
    for col in model.feature_names_in_:
        if col not in df.columns:
            df[col] = 0
    df = df[model.feature_names_in_]
    print(f"DEBUG: Model input columns: {df.columns.tolist()}")
    print(f"DEBUG: Model input shape: {df.shape}")
    return df

# --------------------------
# API Endpoints
# --------------------------
@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "CTG Prediction API",
        "model_loaded": True,
        "database_connected": MONGO_CONNECTED
    }

@app.post("/predict/")
async def predict_ctg(file: UploadFile = File(...)):
    print(f"\n{'='*50}")
    print(f"New prediction request: {file.filename}")
    print(f"{'='*50}")

    contents = await file.read()
    timestamp = datetime.now().timestamp()
    file_path = os.path.join(UPLOAD_DIR, f"{timestamp}_{file.filename}")

    with open(file_path, "wb") as f:
        f.write(contents)

    try:
        # Extract signals and compute features
        fhr, uc, t = extract_ctg_signals(file_path)
        features = compute_ctg_features(fhr, uc, t)
        df = prepare_model_df(features)
        pred = model.predict(df)[0]

        label_map = {1: "Normal", 2: "Suspect", 3: "Pathologic"}
        label = label_map.get(pred, "Unknown")
        print(f"✓ Prediction: {label} ({pred})")

        # Prepare record
        record = {
            'scannedDate': datetime.now().strftime('%Y-%m-%d'),
            'scanTime': datetime.now().strftime('%H:%M:%S'),
            'classification': label,
            'predictionValue': int(pred),
            'features': features,
            'imageUrl': f"http://localhost:8000/uploads/{os.path.basename(file_path)}",
            'createdAt': datetime.now()
        }

        record_id = None
        database_saved = False

        # ✅ Corrected check here
        if MONGO_CONNECTED and records_collection is not None:
            try:
                result = records_collection.insert_one(record)
                record_id = str(result.inserted_id)
                database_saved = True
                print(f"✓ Saved to DB: {record_id}")
            except Exception as db_error:
                print(f"⚠ DB save failed: {db_error}")
                record_id = f"temp_{int(timestamp)}"
        else:
            record_id = f"temp_{int(timestamp)}"
            print("⚠ Skipping DB save (not connected)")

        print(f"{'='*50}\n")

        return {
            "success": True,
            "prediction": int(pred),
            "label": label,
            "record_id": record_id,
            "features": features,
            "imageUrl": record['imageUrl'],
            "database_saved": database_saved
        }

    except Exception as e:
        print(f"❌ Prediction error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.get("/records/")
async def get_records(search: Optional[str] = Query(None)):
    if not MONGO_CONNECTED or records_collection is None:
        return {"success": False, "records": [], "count": 0, "error": "Database not connected"}

    try:
        query = {}
        if search:
            try:
                query['$or'] = [
                    {'scannedDate': {'$regex': search, '$options': 'i'}},
                    {'scanTime': {'$regex': search, '$options': 'i'}},
                    {'_id': ObjectId(search)}
                ]
            except:
                query['$or'] = [
                    {'scannedDate': {'$regex': search, '$options': 'i'}},
                    {'scanTime': {'$regex': search, '$options': 'i'}}
                ]

        records = list(records_collection.find(query).sort('createdAt', -1))
        for r in records:
            r['_id'] = str(r['_id'])
            if 'createdAt' in r and isinstance(r['createdAt'], datetime):
                r['createdAt'] = r['createdAt'].isoformat()

        print(f"✓ Fetched {len(records)} records")
        return {"success": True, "records": records, "count": len(records)}

    except Exception as e:
        print(f"❌ Error fetching records: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/records/{record_id}")
async def delete_record(record_id: str):
    if not MONGO_CONNECTED or records_collection is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    try:
        result = records_collection.delete_one({"_id": ObjectId(record_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Record not found")
        print(f"✓ Deleted record: {record_id}")
        return {"success": True, "message": "Record deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/records/{record_id}")
async def update_record(record_id: str, features: Dict):
    if not MONGO_CONNECTED or records_collection is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    try:
        result = records_collection.update_one(
            {"_id": ObjectId(record_id)},
            {"$set": {"features": features, "updatedAt": datetime.now()}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Record not found")
        print(f"✓ Updated record: {record_id}")
        return {"success": True, "message": "Record updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --------------------------
# Run app
# --------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
