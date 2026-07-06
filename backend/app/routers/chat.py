from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.assistant import run_agent_text
from app.db import crud
from app.db.session import get_db
from app.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    session = await crud.get_or_create_session(db, request.session_id)
    previous_messages = await crud.get_recent_messages(db, session.id, limit=10)
    history = [{"role": message.role, "content": message.content} for message in previous_messages]
    user_message = await crud.add_message(db, session.id, "user", request.message)
    try:
        answer = await run_agent_text(request.message, history=history)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    assistant_message = await crud.add_message(db, session.id, "assistant", answer)
    return ChatResponse(
        session_id=session.id,
        user_message=user_message,
        assistant_message=assistant_message,
    )
