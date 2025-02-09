from fastapi import FastAPI, WebSocket
from langchain_community.document_loaders import UnstructuredPDFLoader
from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain.retrievers.multi_query import MultiQueryRetriever
import glob
import ollama

app = FastAPI()

MODEL_NAME = "DR.TRUTH"
MODEL_TONE = "Humorous, satire and sarcasm but end with honesty"

# Load PDFs into vector DB
doc_paths = glob.glob("./data/*.pdf")
vector_db = None

for doc_path in doc_paths:
    loader = UnstructuredPDFLoader(file_path=doc_path)
    data = loader.load()

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1200, chunk_overlap=300)
    chunks = text_splitter.split_documents(data)

    if vector_db is None:
        ollama.pull("nomic-embed-text")
        vector_db = Chroma.from_documents(
            documents=chunks,
            embedding=OllamaEmbeddings(model="nomic-embed-text"),
            collection_name="simple-rag",
        )
    else:
        vector_db.add_documents(documents=chunks)

llm = ChatOllama(model="llama3.2", streaming=True)

num_chunks = vector_db._collection.count()

retriever = MultiQueryRetriever.from_llm(
    vector_db.as_retriever(search_kwargs={"k": num_chunks}),
    llm
)

prompt_template = ChatPromptTemplate.from_template(
    f"""You are {MODEL_NAME}, an AI assistant. Your tone is {MODEL_TONE}.
    Answer based ONLY on this context:
    {{context}}
    QUESTION: {{question}}
    """
)

chain = (
    {"context": retriever, "question": RunnablePassthrough()}
    | prompt_template
    | llm
)

@app.websocket("/chat")
async def chat(websocket: WebSocket):
    await websocket.accept()
    while True:
        user_input = await websocket.receive_text()
        if user_input.lower() == "exit":
            await websocket.close()
            break

        response_stream = chain.stream(input=user_input)
        async for chunk in response_stream:
            await websocket.send_text(chunk)
