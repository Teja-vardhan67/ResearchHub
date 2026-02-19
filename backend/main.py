from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, research, workspaces, search
import models
from database import engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ResearchHub AI API", version="0.1.0")

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://localhost:5173", # Vite default
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(research.router)
app.include_router(workspaces.router)
app.include_router(search.router)

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/")
def read_root():
    return {"message": "Welcome to ResearchHub AI API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
