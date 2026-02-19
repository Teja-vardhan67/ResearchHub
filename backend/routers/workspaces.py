from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import database, models, schemas
from routers import auth

router = APIRouter(
    prefix="/workspaces",
    tags=["workspaces"]
)

class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None

class WorkspaceResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    owner_id: int

    class Config:
        from_attributes = True

@router.post("/", response_model=WorkspaceResponse)
def create_workspace(
    workspace: WorkspaceCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    db_workspace = models.Workspace(**workspace.dict(), owner_id=current_user.id)
    db.add(db_workspace)
    db.commit()
    db.refresh(db_workspace)
    return db_workspace

@router.get("/", response_model=List[WorkspaceResponse])
def get_workspaces(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    return db.query(models.Workspace).filter(models.Workspace.owner_id == current_user.id).all()

@router.delete("/{workspace_id}")
def delete_workspace(
    workspace_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    workspace = db.query(models.Workspace).filter(
        models.Workspace.id == workspace_id,
        models.Workspace.owner_id == current_user.id
    ).first()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Cascade Delete / Unlink Logic:
    
    # 1. Delete Chat Messages associated with this workspace
    db.query(models.ChatMessage).filter(models.ChatMessage.workspace_id == workspace_id).delete()
    
    # 2. Unlink Papers (Set workspace_id to NULL) 
    # Use update() for bulk operation
    db.query(models.Paper).filter(models.Paper.workspace_id == workspace_id).update({models.Paper.workspace_id: None})
    
    # 3. Delete the Workspace itself
    db.delete(workspace)
    db.commit()
    
    return {"message": "Workspace deleted successfully"}
