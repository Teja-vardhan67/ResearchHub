from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from services import arxiv_service
from pydantic import BaseModel

router = APIRouter(
    prefix="/search",
    tags=["search"]
)

class SearchResult(BaseModel):
    title: str
    authors: List[str]
    summary: str
    pdf_url: str
    published: str

@router.get("/arxiv", response_model=List[SearchResult])
async def search_arxiv(query: str, max_results: int = 10):
    """
    Searches arXiv for papers matching the query.
    """
    if not query:
        raise HTTPException(status_code=400, detail="Query parameter is required")
    
    results = arxiv_service.search_arxiv(query, max_results=max_results)
    return results
