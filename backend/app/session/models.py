# Models for session data (e.g., Pydantic models for request/response)
from pydantic import BaseModel
from typing import Optional

class SessionStartRequest(BaseModel):
    topic: str
    persona_type: str # Or maybe an Enum later
    # Add any other necessary fields

class Session(BaseModel):
    session_id: str
    topic: str
    persona_type: str
    is_active: bool = True
    # Add history, timestamps, etc. 