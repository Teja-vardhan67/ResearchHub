from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship, Mapped
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    papers = relationship("Paper", back_populates="owner")
    workspaces = relationship("Workspace", back_populates="owner")
    chat_messages = relationship("ChatMessage", back_populates="user")

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="workspaces")
    papers = relationship("Paper", back_populates="workspace")
    chat_messages = relationship("ChatMessage", back_populates="workspace")

class Paper(Base):
    __tablename__ = "papers"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    authors = Column(String) # Could be JSON or comma-separated
    abstract = Column(Text)
    content = Column(Text) # Full text if needed
    
    # Vector Embedding (Need to decide dimension, e.g., 1536 for OpenAI, 
    # but for Llama via HuggingFace models, maybe 384 or 768 or 1024 depending on the embedding model used)
    embedding = Column(Vector(384)) # Using all-MiniLM-L6-v2 dimension 

    # Link to Workspace instead of User directly (or both)
    # Sticking to workspace linking for organization
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True) # Nullable for direct uploads maybe?
    owner_id = Column(Integer, ForeignKey("users.id")) # Keep owner for permission checks
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="papers")
    workspace = relationship("Workspace", back_populates="papers")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String) # user, assistant, system
    content = Column(Text)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    user_id = Column(Integer, ForeignKey("users.id"))
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True) # Optional for global chat
    
    user = relationship("User", back_populates="chat_messages")
    workspace = relationship("Workspace", back_populates="chat_messages")
