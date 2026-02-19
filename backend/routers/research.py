from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import database, models, schemas
from services import pdf_service, vector_store, groq_service, arxiv_service
from routers import auth

router = APIRouter(
    prefix="/research",
    tags=["research"]
)

class ChatRequest(BaseModel):
    message: str
    workspace_id: Optional[int] = None
    chat_history: Optional[List[dict]] = [] # Deprecated, using DB persistence

@router.post("/upload")
async def upload_paper(
    workspace_id: Optional[int] = Form(None),
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    content = await file.read()
    text = pdf_service.extract_text_from_pdf(content)
    
    if not text:
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")
    
    # Generate abstract (naive: first 1000 chars) or use LLM to summarize
    abstract = text[:1000] + "..." 
    
    # Generate embedding
    embedding = vector_store.generate_embedding(text[:8000]) # Limit text for embedding model if needed
    
    new_paper = models.Paper(
        title=file.filename,
        authors="Unknown", # Requires metadata extraction
        abstract=abstract,
        content=text,
        embedding=embedding,
        owner_id=current_user.id,
        workspace_id=workspace_id
    )
    
    db.add(new_paper)
    db.commit()
    db.refresh(new_paper)
    
    return {"filename": file.filename, "id": new_paper.id, "message": "Paper processed successfully"}

class ImportRequest(BaseModel):
    pdf_url: str
    title: str
    workspace_id: Optional[int] = None

@router.post("/import")
async def import_paper(
    request: ImportRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    import httpx
    
    async with httpx.AsyncClient() as client:
        response = await client.get(request.pdf_url)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Could not download PDF from URL")
        content = response.content

    text = pdf_service.extract_text_from_pdf(content)
    
    if not text:
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")
    
    # Generate abstract (naive: first 1000 chars)
    abstract = text[:1000] + "..." 
    
    # Generate embedding
    embedding = vector_store.generate_embedding(text[:8000])
    
    new_paper = models.Paper(
        title=request.title,
        authors="Unknown", # Requires metadata or scraping
        abstract=abstract,
        content=text,
        embedding=embedding,
        owner_id=current_user.id,
        workspace_id=request.workspace_id
    )
    
    db.add(new_paper)
    db.commit()
    db.refresh(new_paper)
    
    return {"filename": request.title, "id": new_paper.id, "message": "Paper imported successfully"}

@router.post("/ask")
async def ask_research_assistant(
    request: ChatRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    # 1. Search for relevant papers
    # Filter by workspace to ensure context isolation
    relevant_papers = vector_store.search_similar_papers(
        db, 
        request.message, 
        workspace_id=request.workspace_id,
        limit=3
    )
    
    context = ""
    for paper in relevant_papers:
        context += f"Title: {paper.title}\nAbstract: {paper.abstract}\n\n"
    
    # 2. Construct Prompt
    system_prompt = (
        "You are an intelligent Research Assistant. Use the following context from the user's papers to answer their question. "
        "Formulate your answer based ONLY on the provided context if possible. If the answer is not in the context, state that."
        "\n\nContext:\n" + context
    )
    
    messages = [{"role": "system", "content": system_prompt}]
    
    # Retrieve chat history from DB
    history_query = db.query(models.ChatMessage).filter(
        models.ChatMessage.user_id == current_user.id
    )
    if request.workspace_id:
        history_query = history_query.filter(models.ChatMessage.workspace_id == request.workspace_id)
    else:
        history_query = history_query.filter(models.ChatMessage.workspace_id == None)
        
    recent_history = history_query.order_by(models.ChatMessage.timestamp.desc()).limit(5).all()
    # Re-order to chronological
    for msg in reversed(recent_history):
        messages.append({"role": msg.role, "content": msg.content})
    
    messages.append({"role": "user", "content": request.message})
    
    # Save User Message
    user_msg_db = models.ChatMessage(
        role="user", 
        content=request.message, 
        user_id=current_user.id, 
        workspace_id=request.workspace_id
    )
    db.add(user_msg_db)
    db.commit()
    
    # 3. Get Response
    response = groq_service.get_chat_response(messages)
    
    # Save Assistant Message
    ai_msg_db = models.ChatMessage(
        role="assistant", 
        content=response, 
        user_id=current_user.id, 
        workspace_id=request.workspace_id
    )
    db.add(ai_msg_db)
    db.commit()
    
    return {"response": response, "context_used": [p.title for p in relevant_papers]}

@router.get("/chat/history")
def get_chat_history(
    workspace_id: Optional[int] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    query = db.query(models.ChatMessage).filter(models.ChatMessage.user_id == current_user.id)
    if workspace_id:
        query = query.filter(models.ChatMessage.workspace_id == workspace_id)
    else:
        query = query.filter(models.ChatMessage.workspace_id == None)
        
    messages = query.order_by(models.ChatMessage.timestamp).all()
    return [{"role": msg.role, "content": msg.content, "timestamp": msg.timestamp} for msg in messages]

@router.get("/papers")
def get_papers(
    workspace_id: Optional[int] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    query = db.query(models.Paper).filter(models.Paper.owner_id == current_user.id)
    if workspace_id:
        query = query.filter(models.Paper.workspace_id == workspace_id)
    else:
        query = query.filter(models.Paper.workspace_id == None)
        
    papers = query.order_by(models.Paper.created_at.desc()).all()
    return [{"id": p.id, "title": p.title, "abstract": p.abstract, "authors": p.authors, "created_at": p.created_at} for p in papers]
