import base64
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.agents.assistant import stream_agent_text
from app.db import crud
from app.db.session import SessionLocal
from app.speech.stt import transcribe_audio
from app.speech.tts import synthesize_speech_base64

router = APIRouter(tags=["voice"])
MIN_AUDIO_BYTES = 2048


async def _persist_turn(session_id: UUID, transcript: str, answer: str) -> None:
    async with SessionLocal() as db:
        session = await crud.get_or_create_session(db, session_id)
        await crud.add_message(db, session.id, "user", transcript)
        await crud.add_message(db, session.id, "assistant", answer)


async def _history_for_session(session_id: UUID) -> list[dict[str, str]]:
    async with SessionLocal() as db:
        session = await crud.get_or_create_session(db, session_id)
        messages = await crud.get_recent_messages(db, session.id, limit=10)
        return [{"role": message.role, "content": message.content} for message in messages]


async def _handle_prompt(websocket: WebSocket, session_id: UUID, prompt: str) -> None:
    if not prompt.strip():
        await websocket.send_json({"type": "error", "message": "I did not catch any speech."})
        return

    await websocket.send_json({"type": "transcript", "text": prompt})
    await websocket.send_json({"type": "status", "status": "thinking"})

    history = await _history_for_session(session_id)
    answer_parts: list[str] = []
    await websocket.send_json({"type": "status", "status": "speaking"})
    async for chunk in stream_agent_text(prompt, history=history):
        answer_parts.append(chunk)
        await websocket.send_json({"type": "response_chunk", "text": chunk})

    answer = "".join(answer_parts).strip()
    if not answer:
        answer = "I could not generate a clear response. Please try again."
        await websocket.send_json({"type": "response_chunk", "text": answer})

    audio_data = await synthesize_speech_base64(answer)
    if audio_data:
        await websocket.send_json({"type": "audio_chunk", "data": audio_data, "mime_type": "audio/mpeg"})

    await _persist_turn(session_id, prompt, answer)
    await websocket.send_json({"type": "response_end", "text": answer, "audio_sent": bool(audio_data)})


@router.websocket("/ws/{session_id}")
async def voice_socket(websocket: WebSocket, session_id: UUID):
    await websocket.accept()
    audio_chunks: list[bytes] = []
    audio_mime_type = "audio/webm"

    try:
        while True:
            message = await websocket.receive_json()
            message_type = message.get("type")

            if message_type == "audio_chunk":
                audio_mime_type = str(message.get("mime_type") or audio_mime_type)
                audio_chunks.append(base64.b64decode(message.get("data", "")))
            elif message_type == "audio_end":
                await websocket.send_json({"type": "status", "status": "transcribing"})
                audio_mime_type = str(message.get("mime_type") or audio_mime_type)
                audio_bytes = b"".join(audio_chunks)
                audio_chunks.clear()
                if len(audio_bytes) < MIN_AUDIO_BYTES:
                    await websocket.send_json(
                        {"type": "error", "message": "I did not receive enough audio. Hold the mic and speak again."}
                    )
                    continue
                try:
                    transcript = await transcribe_audio(audio_bytes, audio_mime_type)
                except Exception:
                    await websocket.send_json(
                        {
                            "type": "error",
                            "message": "I could not process that recording. Try holding the mic for a full sentence.",
                        }
                    )
                    continue
                await _handle_prompt(websocket, session_id, transcript)
            elif message_type == "text_input":
                await _handle_prompt(websocket, session_id, str(message.get("data", "")))
            else:
                await websocket.send_json({"type": "error", "message": f"Unknown message type: {message_type}"})
    except WebSocketDisconnect:
        return
    except Exception:
        await websocket.send_json({"type": "error", "message": "The assistant hit a backend error. Please try again."})
