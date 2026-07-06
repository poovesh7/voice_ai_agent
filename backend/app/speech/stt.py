import asyncio
from io import BytesIO

from groq import Groq

from app.config import get_settings


def _extension_for_mime_type(mime_type: str) -> str:
    if "wav" in mime_type:
        return "wav"
    if "mpeg" in mime_type or "mp3" in mime_type:
        return "mp3"
    if "mp4" in mime_type or "m4a" in mime_type:
        return "m4a"
    if "ogg" in mime_type:
        return "ogg"
    return "webm"


async def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/webm") -> str:
    settings = get_settings()
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is required for speech transcription.")
    if not audio_bytes:
        return ""

    def _transcribe() -> str:
        client = Groq(api_key=settings.groq_api_key)
        audio_file = BytesIO(audio_bytes)
        audio_file.name = f"speech.{_extension_for_mime_type(mime_type)}"
        transcript = client.audio.transcriptions.create(
            file=(audio_file.name, audio_file, mime_type),
            model=settings.groq_stt_model,
        )
        return getattr(transcript, "text", "") or ""

    return await asyncio.to_thread(_transcribe)
