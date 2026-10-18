import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from groq import Groq
import datetime

from routes.recommendation_routes import recommendation_router
from routes.rag_routes import rag_router

SECRET_KEY = os.getenv("JWT_SECRET", "synaptiqsecret2026")
ALGORITHM = "HS256"

app = FastAPI(title="SYNAPTIQ AI Services", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(recommendation_router)
app.include_router(rag_router)

mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
mongo_db_name = os.getenv("MONGODB_DB", "ai_campus")
mongo_client = MongoClient(mongo_uri)
db = mongo_client[mongo_db_name]
collection = db['uploads']

def get_groq_client():
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if api_key:
        try:
            return Groq(api_key=api_key)
        except Exception:
            return None
    return None

@app.post("/ask")
async def ask(question: str = Form(...)):
    client = get_groq_client()
    if not client:
        return {
            "answer": "Groq AI Assistant is currently operating in offline mode. Please add your GROQ_API_KEY to backend/.env to enable live Llama 3.3 completions."
        }
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "user",
                "content": question
            }
        ]
    )
    return {
        "answer": response.choices[0].message.content
    }
@app.post('/upload')
async def upload(
fileName:str=Form(...),
email:str=Form(...),
userId:str=Form(...),
fileType:str=Form(...),
file:UploadFile=File(...)
):
    os.makedirs("uploads", exist_ok=True)
    file_path=f"uploads/{file.filename}"
    with open(file_path,"wb") as f:
        f.write(
           await file.read()
        )

    file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
    now_iso = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M")

    result = collection.insert_one({
       "fileName":fileName,
       "email":email,
       "userId":userId,
       "fileType":fileType,
       "filePath":file_path,
       "fileSize":file_size,
       "uploadedAt":now_iso
    })

    return{
      "message":"File uploaded successfully",
      "fileId": str(result.inserted_id),
      "fileName": fileName,
      "filePath": file_path
    }
