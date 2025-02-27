# AI Document Analyst

![Project Status](https://img.shields.io/badge/status-in%20progress-yellow)
![Python Version](https://img.shields.io/badge/python-3.9%2B-blue)
![FastAPI Version](https://img.shields.io/badge/FastAPI-0.95.0-green)
![Next.js Version](https://img.shields.io/badge/Next.js-13.0.0-blue)

An intelligent document analysis system that allows users to upload documents and interact with them through natural language queries. Built with FastAPI, Next.js, and ChromaDB.

## 🚀 Features

### ✅ Implemented
- **Document Upload & Processing**
  - PDF, DOCX, and TXT file support
  - Automatic text extraction and chunking
  - Metadata extraction and storage
  - **AWS S3 Integration** for document storage
- **Natural Language Querying**
  - Real-time chat interface
  - Context-aware responses
  - Streaming responses
- **User Management**
  - JWT-based authentication
  - User-specific document storage
  - Session management
- **Vector Storage**
  - ChromaDB integration
  - Document embedding
  - Semantic search capabilities
- **Cache Management**
  - **Redis integration via Docker** for caching

### 🚧 In Progress
- **Enhanced Document Processing**
  - Image-based document OCR
  - Multi-language support
  - Document summarization
- **Advanced Query Capabilities**
  - Multi-document querying
  - Contextual follow-up questions
  - Query history and suggestions
- **Storage Optimization**
  - Document compression
  - Automatic cleanup of unused documents

### ⏳ Future Plans
- **Collaboration Features**
  - Shared document spaces
  - Team-based access control
  - Document versioning
- **Analytics & Insights**
  - Usage statistics
  - Query performance metrics
  - Document insights dashboard
- **Mobile Optimization**
  - Progressive Web App (PWA) support
  - Mobile-first UI design
  - Offline capabilities

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI
- **Database**: ChromaDB (Vector Storage)
- **AI Models**: Ollama (LLM)
- **Authentication**: JWT Tokens
- **Storage**: AWS S3
- **Cache**: Redis via Docker

### Frontend
- **Framework**: Next.js 13
- **UI Library**: Tailwind CSS
- **State Management**: React Context
- **Real-time Communication**: WebSockets

## 🧰 Installation

### Prerequisites
- Python 3.9+
- Node.js 16+
- Redis (Docker)
- Ollama server
- AWS S3 credentials

### Backend Setup
```bash
# Clone repository
git clone https://github.com/yourusername/DocumentAnalyst-WebApp-.git
cd ai-document-analyzer/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your AWS S3 and Redis configuration

# Run Redis via Docker
docker run --name redis -d -p 6379:6379 redis

# Run server
uvicorn main:app --reload

# Run UI
cd frontend/my-app
npm run dev
```

### Note
This project is not hosted due to budget constraints. Fork the repository and use your own AWS S3 and Redis keys to set up and run the application.
