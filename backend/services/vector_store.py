from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session
from sqlalchemy import select
from models import Paper
import numpy as np

# Load model globally to avoid reloading on every request
# 'all-mpnet-base-v2' is better performance, 'all-MiniLM-L6-v2' is faster.
# Using MiniLM for detailed local development speed.
model = SentenceTransformer('all-MiniLM-L6-v2') 

def generate_embedding(text: str) -> list:
    """
    Generates a vector embedding for the given text.
    """
    embedding = model.encode(text)
    return embedding.tolist()

def search_similar_papers(db: Session, query_text: str, workspace_id: int = None, limit: int = 5):
    """
    Searches for papers similar to the query text using cosine similarity.
    Optionally filters by workspace_id.
    """
    query_embedding = generate_embedding(query_text)
    
    # pgvector uses <-> for L2 distance, <=> for cosine distance, <#> for inner product
    # We want cosine distance for semantic similarity.
    # Note: pgvector's <=> operator returns distance (1 - cosine_similarity).
    # So sorting by distance ASC gives most similar.
    stmt = select(Paper).order_by(Paper.embedding.cosine_distance(query_embedding)).limit(limit)
    
    if workspace_id:
        stmt = stmt.filter(Paper.workspace_id == workspace_id)
    else:
        # If no workspace specified, search only papers without workspace (global)?
        # Or search all? Let's assume search all for now, or filter by None if strict.
        # User requirement implies isolation. So if no workspace, maybe global.
        # But for "My Papers", usually they belong to user. 
        # Let's enforce strict isolation: if workspace_id=None, maybe strict filter.
        # However, to start simply, let's just add the filter if provided.
        # WAIT: cosine_distance sorting must happen AFTER filtering for efficiency? 
        # Actually in SQL, WHERE comes before ORDER BY.
        stmt = select(Paper)
        if workspace_id is not None:
             stmt = stmt.filter(Paper.workspace_id == workspace_id)
        else:
             stmt = stmt.filter(Paper.workspace_id == None) # Strict Global/Default isolation
             
        stmt = stmt.order_by(Paper.embedding.cosine_distance(query_embedding)).limit(limit)

    results = db.execute(stmt).scalars().all()
    return results
