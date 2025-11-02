from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

# Old DB (optional, if still needed)
# MONGO_URI = os.getenv("MONGO_URI")  

# New DB
MONGO_URI_2 = os.getenv("MONGO_URI_2")
client = MongoClient(MONGO_URI_2)
db = client['DrukHealthNew']  # name of new DB
records_collection = db['ctg_records']  # collection for records
