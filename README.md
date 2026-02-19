# ResearchHub AI 🧠📚

An AI-powered research assistant that helps you organize, search, and chat with your academic papers. Built with **FastAPI**, **React**, **PostgreSQL (pgvector)**, and **Llama 3**.

## 🚀 Features

- **Workspace Management**: Organize research by topic or project.
- **AI Chat Assistant**: Chat with your papers using RAG (Retrieval-Augmented Generation).
- **PDF Upload**: Automatically extracts text and generates vector embeddings.
- **arXiv Search**: Search for and import global research papers directly.
- **Persistent Chat**: Usage history is saved per workspace.

---

## 🛠️ Tech Stack

- **Backend**: Python (FastAPI), SQLAlchemy, PyPDF/PDFPlumber
- **AI/ML**: Groq (Llama 3.3 70B), Sentence-Transformers (Embeddings)
- **Database**: PostgreSQL with `pgvector` extension
- **Frontend**: React (Vite), TypeScript, Tailwind CSS

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
1.  **Python 3.10+**
2.  **Node.js & npm**
3.  **PostgreSQL** (with `pgvector` extension enabled)

---

## ⚙️ Installation Guide

### 1. Clone the Repository
```bash
git clone https://github.com/Teja-vardhan67/ResearchHub.git
cd ResearchHub
```

### 2. Database Setup
Create a PostgreSQL database and enable the vector extension:
```sql
CREATE DATABASE researchhub;
\c researchhub
CREATE EXTENSION vector;
```

### 3. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Mac/Linux
# source venv/bin/activate

pip install -r requirements.txt
```

**Configuration (.env):**
Create a `.env` file in the `backend` folder:
```ini
DATABASE_URL=postgresql://user:password@localhost/researchhub
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
GROQ_API_KEY=your_groq_api_key_here
```

**Initialize Vector Store:**
```bash
python enable_vector.py
```

### 4. Frontend Setup
```bash
cd ../frontend
npm install
```

---

## ▶️ Running the Application

### Start Backend Server
```bash
cd backend
venv\Scripts\activate
uvicorn main:app --reload
```
*Server runs at: http://localhost:8000*

### Start Frontend Client
```bash
cd frontend
npm run dev
```
*App runs at: http://localhost:5173*

---

## 🧪 Usage

1.  **Register/Login**: Create an account.
2.  **Create Workspace**: Click `+` in the sidebar to create a new project.
3.  **Upload Papers**: Drag & drop PDFs in the "My Papers" tab.
4.  **Chat**: Switch to "AI Assistant" and ask questions about your uploaded papers.
5.  **Search**: Use the "Search arXiv" tab to find new literature.

---

## 🤝 Contributing

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit changes.
4.  Push to the branch.
5.  Open a Pull Request.

---

## 📄 License

MIT License.
