# ==========================================
# server.py — Druk Health CTG AI Backend (FINAL NO-API PREFIX)
# ==========================================

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from pymongo import MongoClient
import pandas as pd
import numpy as np
import cv2, tempfile, joblib, os
from scipy.signal import find_peaks
from collections import Counter

# ------------------------------
# Initialize FastAPI app
# ------------------------------
app = FastAPI(title="Druk Health CTG AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------
# MongoDB connection
# ------------------------------
client = MongoClient("mongodb://localhost:27017")
db = client["ctg_db"]
ctg_collection = db["ctg_records"]

# ------------------------------
# Load trained model
# ------------------------------
model_ctg_class = joblib.load("decision_tree_all_cardio_features.pkl")
print("✅ Loaded Decision Tree model with features:\n", model_ctg_class.feature_names_in_)

# =======================================================
# HELPER FUNCTIONS
# =======================================================
def extract_ctg_signals(image_path, fhr_top_ratio=0.55, bpm_per_cm=30,
                        toco_per_cm=25, paper_speed_cm_min=2, fhr_min_line=50):
    """Extract FHR and UC signals from CTG image using OpenCV."""
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Cannot read image: {image_path}")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    if np.mean(gray) > 127:
        gray = cv2.bitwise_not(gray)

    height, width = gray.shape
    fhr_img = gray[0:int(fhr_top_ratio * height), :]
    uc_img = gray[int(fhr_top_ratio * height):, :]

    def extract_signal(trace_img):
        _, thresh = cv2.threshold(trace_img, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        h, w = thresh.shape
        signal = []
        for x in range(w):
            y_pixels = np.where(thresh[:, x] > 0)[0]
            y = np.median(y_pixels) if len(y_pixels) > 0 else np.nan
            signal.append(y)
        signal = pd.Series(signal).interpolate(limit_direction="both").values
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


def compute_model_features(fhr_signal, uc_signal, time_axis):
    """Compute SisPorto-style features for classification."""
    features = {}
    duration = time_axis[-1] - time_axis[0]
    baseline = np.mean(fhr_signal)
    fhr_diff = np.diff(fhr_signal)

    # --- Accelerations ---
    accel_count = 0
    in_accel = False
    start_idx = None
    for i in range(len(fhr_signal)):
        if fhr_signal[i] > baseline + 5:
            if not in_accel:
                in_accel = True
                start_idx = i
        else:
            if in_accel:
                dur = time_axis[i - 1] - time_axis[start_idx]
                amp = np.max(fhr_signal[start_idx:i]) - baseline
                if dur >= 5 and amp >= 5:
                    accel_count += 1
                in_accel = False
    features["Accelerations (SisPorto)"] = round(accel_count / (duration / 600.0), 2)

    # --- Uterine contractions & fetal movements ---
    uc_peaks, _ = find_peaks(uc_signal, height=15, distance=int(30 * (len(time_axis) / duration)))
    fm_events, _ = find_peaks(np.diff(uc_signal), height=10, distance=int(5 * (len(time_axis) / duration)))
    features["Uterine contractions (SisPorto)"] = round(len(uc_peaks) / (duration / 600.0), 2)
    features["Fetal movements (SisPorto)"] = round(len(fm_events) / (duration / 600.0), 2)

    # --- Decelerations ---
    dips, _ = find_peaks(-fhr_signal, height=-(baseline - 15), distance=int(15))
    severe, _ = find_peaks(-fhr_signal, height=-(baseline - 25), distance=int(15))
    prolonged = [i for i in range(1, len(dips)) if (dips[i] - dips[i - 1]) > 120]
    repetitive = np.sum(np.diff(dips) < 60)
    features["Light decelerations (raw)"] = round(len(dips) / (duration / 600.0), 2)
    features["Severe decelerations (raw)"] = round(len(severe) / (duration / 600.0), 2)
    features["Prolonged decelerations (raw)"] = round(len(prolonged) / (duration / 600.0), 2)
    features["Repetitive decelerations (raw)"] = round(repetitive / (duration / 600.0), 2)

    # --- Baseline & variability ---
    features["Baseline value (SisPorto)"] = round(float(baseline), 2)
    features["Percentage time with abnormal short-term variability (SisPorto)"] = round(
        np.sum(np.abs(fhr_diff) > 25) / len(fhr_diff), 2
    )
    features["Mean value of short-term variability (SisPorto)"] = round(np.mean(np.abs(fhr_diff)), 2)
    features["Percentage time with abnormal long-term variability (SisPorto)"] = round(
        np.sum(np.abs(fhr_signal - baseline) > 20) / len(fhr_signal), 2
    )
    features["Mean value of long-term variability (SisPorto)"] = round(np.std(fhr_signal), 2)

    # --- Histogram ---
    hist, bins = np.histogram(fhr_signal, bins=10)
    features["Histogram width"] = round(bins[-1] - bins[0], 2)
    features["Histogram minimum frequency"] = round(np.min(fhr_signal), 2)
    features["Histogram maximum frequency"] = round(np.max(fhr_signal), 2)
    features["Number of histogram peaks"] = int(np.max(hist))
    features["Number of histogram zeros"] = int(np.sum(hist == 0))
    features["Histogram mode"] = round(bins[np.argmax(hist)], 2)
    features["Histogram mean"] = round(np.mean(fhr_signal), 2)
    features["Histogram median"] = round(np.median(fhr_signal), 2)
    features["Histogram variance"] = round(np.var(fhr_signal), 2)
    features["Histogram tendency (-1=left asymmetric; 0=symmetric; 1=right asymmetric)"] = round(
        fhr_signal[-1] - fhr_signal[0], 2
    )

    # Fill missing features for model
    for col in model_ctg_class.feature_names_in_:
        if col not in features:
            features[col] = 0

    return features


# =======================================================
# ROUTES
# =======================================================
@app.get("/")
def home():
    return {"message": "CTG AI Prediction API is running 🚀"}


@app.post("/predict/")
async def predict_ctg(file: UploadFile = File(...)):
    """Upload CTG image → classify → save to MongoDB"""
    contents = await file.read()
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        fhr, uc, t = extract_ctg_signals(tmp_path)
        features = compute_model_features(fhr, uc, t)
        df = pd.DataFrame([features])[model_ctg_class.feature_names_in_]
        pred = model_ctg_class.predict(df)[0]
        label = {1: "Normal", 2: "Suspect", 3: "Pathologic"}.get(pred, "Unknown")

        record = {
            "timestamp": datetime.utcnow(),
            "label": label,
            "features": features,
        }
        ctg_collection.insert_one(record)

        print(f"✅ Prediction: {label}")
        return {"prediction": int(pred), "label": label, "features": features}
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.get("/records")
def get_records():
    """Return all prediction records"""
    records = list(ctg_collection.find({}, {"_id": 0}).sort("timestamp", -1))
    return {"records": records}


@app.get("/api/analysis")
def get_analysis():
    """Return summary stats for dashboard"""
    records = list(ctg_collection.find({}, {"_id": 0}))
    if not records:
        return {"predictions": [], "nspStats": {"Normal": 0, "Suspect": 0, "Pathologic": 0}}

    df = pd.DataFrame(records)
    df["date"] = pd.to_datetime(df["timestamp"]).dt.strftime("%Y-%m-%d")

    pivot = df.pivot_table(index="date", columns="label", aggfunc="size", fill_value=0).reset_index()
    pivot = pivot.rename_axis(None, axis=1)
    pivot = pivot.rename(columns={"Normal": "N", "Suspect": "S", "Pathologic": "P"})
    time_series = pivot.to_dict(orient="records")

    counts = Counter(df["label"])
    nspStats = {
        "Normal": int(counts.get("Normal", 0)),
        "Suspect": int(counts.get("Suspect", 0)),
        "Pathologic": int(counts.get("Pathologic", 0)),
    }

    return {"predictions": time_series, "nspStats": nspStats}


# =======================================================
# Run server
# =======================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
