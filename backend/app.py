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

app = FastAPI()

#CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    pass

def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

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
            
            async for chunk in chain.astream(question):
                content = chunk.content
                buffer.append(content)
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
    
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await websocket.close()