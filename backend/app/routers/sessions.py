from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import crud
from app.db.session import get_db
from app.schemas import SessionRead, SessionWithMessages

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", response_model=SessionRead)
async def create_session(db: AsyncSession = Depends(get_db)):
    return await crud.create_session(db)


@router.get("", response_model=list[SessionRead])
async def list_sessions(db: AsyncSession = Depends(get_db)):
    return await crud.list_sessions(db)


@router.get("/{session_id}", response_model=SessionWithMessages)
async def get_session(session_id: UUID, db: AsyncSession = Depends(get_db)):
    session = await crud.get_session_with_messages(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session
