import os
from pymongo import MongoClient
import certifi

# Fallback URI if not in env
DEFAULT_URI = "mongodb+srv://santoias26_db_user:TRmDVXTpAQz7e02e@cluster0.x7kn9i5.mongodb.net/?appName=Cluster0"
MONGO_URI = os.getenv("MONGO_URI", DEFAULT_URI)
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "eduface_db")

client = None
db = None

try:
    # Use certifi to avoid SSL issues on Windows
    client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
    db = client[MONGO_DB_NAME]
    
    # Ensure indexes
    db.users.create_index("clerkId", unique=True)
    db.videos.create_index("userId")
    print(f"[SUCCESS] Connected to MongoDB: {MONGO_DB_NAME}")
except Exception as e:
    print(f"[WARNING] Could not connect to MongoDB: {e}")

def get_db():
    return db
