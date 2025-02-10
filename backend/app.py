from fastapi import FastAPI, WebSocket, UploadFile, File, HTTPException
from langchain_community.document_loaders import (
    UnstructuredPDFLoader,
    TextLoader,
    UnstructuredWordDocumentLoader,
)
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.runnables import RunnablePassthrough
from langchain_ollama import ChatOllama
from langchain.prompts import ChatPromptTemplate
from langchain_ollama import OllamaEmbeddings
from fastapi.middleware.cors import CORSMiddleware
import glob
import os
import threading
import asyncio

import boto3
import redis
import os
from dotenv import load_dotenv

load_dotenv()


app = FastAPI()

#CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== AWS S3 Setup =======
# Adding AWS S3 Bucket Authentication Keys
AWS_ACCESS_KEY_ID = os.getenv('ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('SECRET_ACCESS_KEY')
AWS_S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME')
AWS_REGION = "us-east-1"  # Match your bucket's region

s3_client = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)


# ===== Redis Setup =======
redis_client = redis.Redis(host="localhost", port=6379, db=0)



# Configuration
MODEL_NAME = "DR.TRUTH"
MODEL_TONE = "Humorous, satire and sarcasm but end with honesty"
PERSIST_DIR = "./chroma_db"
ALLOWED_EXTENSIONS = {"pdf", "txt", "docx", "doc"}
STREAMING_BUFFER_SIZE = 100  # Characters per chunk
STREAMING_MAX_DELAY = 0.1  # Max seconds between flushes

# Initialize components
vector_db = None
vector_db_lock = threading.Lock()
embeddings = OllamaEmbeddings(model="nomic-embed-text")

# Load existing vector store if available
try:
    vector_db = Chroma(
        persist_directory=PERSIST_DIR,
        embedding_function=embeddings,
        collection_name="document-chatbot",
    )
except:
    print("No existing vector store found, will create new one when needed.")


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# ----------------------------
# File Upload Endpoint with S3 and Redis Integration
# ----------------------------

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    if not allowed_file(file.filename):
        raise HTTPException(400, "Unsupported file type")
    
    temp_dir = "./temp"
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, file.filename)
    
    try:
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        file_ext = file.filename.split(".")[-1].lower()
        loader = {
            "pdf": UnstructuredPDFLoader,
            "txt": TextLoader,
            "docx": UnstructuredWordDocumentLoader,
            "doc": UnstructuredWordDocumentLoader
        }.get(file_ext)
        
        if not loader:
            raise HTTPException(400, "Unsupported file type")
        
        documents = loader(temp_path).load()
        
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1200,
            chunk_overlap=300,
        )
        chunks = text_splitter.split_documents(documents)
        
        # ----------------------------
        # AWS S3: Upload the file to your S3 bucket.
        # ----------------------------
        # This stores the file in S3 so that each user’s document is persistently stored.
        s3_client.upload_file(temp_path, AWS_S3_BUCKET_NAME, file.filename)
        # Constructs the S3 URL for future reference.
        file_url = f"https://{AWS_S3_BUCKET_NAME}.s3.amazonaws.com/{file.filename}"
        
        
        
        # ----------------------------
        # Redis: Cache metadata about the uploaded file.
        # ----------------------------
        # We store the S3 URL and the number of chunks in Redis under a key that can be associated
        # with the user (here, using the filename as an example key).
        redis_client.hset(f"file:{file.filename}", mapping={"s3_url": file_url, "chunks": len(chunks)})
        
        with vector_db_lock:
            global vector_db
            if vector_db is None:
                vector_db = Chroma.from_documents(
                    documents=chunks,
                    embedding=embeddings,
                    collection_name="document-chatbot",
                    persist_directory=PERSIST_DIR,
                )
            else:
                vector_db.add_documents(chunks)
                vector_db.persist()
        
        return {"message": f"File processed successfully! Added {len(chunks)} chunks"}
    
    except Exception as e:
        raise HTTPException(500, f"Error processing file: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.websocket("/chat")
async def chat(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            question = await websocket.receive_text()
            
            # Check if a cached response is available via Redis
            cached_response = redis_client.get(f"chat:{question}")
            if cached_response:
                # If a cached response is found, send it immediately.
                await websocket.send_text(cached_response.decode("utf-8"))
                continue  # Proceed to the next question
            
            if not vector_db:
                await websocket.send_text("Please upload documents first!")
                continue
            
            retriever = vector_db.as_retriever(search_kwargs={"k": 5})
            
            chain = (
                {"context": retriever, "question": RunnablePassthrough()}
                | ChatPromptTemplate.from_template(
                    f"""You are {MODEL_NAME}. Tone: {MODEL_TONE}
                    Context: {{context}}
                    Question: {{question}}"""
                )
                | ChatOllama(
                    model="llama3.2",
                    temperature=0.7,
                    streaming=True,
                    system=f"You are {MODEL_NAME}. Respond with {MODEL_TONE} tone."
                )
            )
            
            buffer = []
            buffer_size = 0
            last_flush = asyncio.get_event_loop().time()
            full_response_chunks = []  # To store the complete answer for caching
            
            async for chunk in chain.astream(question):
                content = chunk.content
                buffer.append(content)
                full_response_chunks.append(content)# Accumulate for caching  
                buffer_size += len(content)
                
                # Flush buffer if size exceeds limit or time threshold passed
                current_time = asyncio.get_event_loop().time()
                if (buffer_size >= STREAMING_BUFFER_SIZE or 
                    (current_time - last_flush) >= STREAMING_MAX_DELAY):
                    await websocket.send_text("".join(buffer))
                    buffer.clear()
                    buffer_size = 0
                    last_flush = current_time
            
            # Send any remaining content
            if buffer:
                await websocket.send_text("".join(buffer))
            # Redis: Cache the full response so subsequent identical questions are faster.
            final_response = "".join(full_response_chunks)
            # Cache the response with an expiration (e.g., 10 minutes).
            redis_client.set(f"chat:{question}", final_response, ex=600)

    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await websocket.close()