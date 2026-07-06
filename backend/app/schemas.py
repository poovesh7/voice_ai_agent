from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class MessageRead(BaseModel):
    id: UUID
    session_id: UUID
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SessionRead(BaseModel):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class SessionWithMessages(SessionRead):
    messages: list[MessageRead] = []


class ChatRequest(BaseModel):
    session_id: UUID | None = None
    message: str = Field(min_length=1)


class ChatResponse(BaseModel):
    session_id: UUID
    user_message: MessageRead
    assistant_message: MessageRead
