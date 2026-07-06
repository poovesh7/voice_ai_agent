import asyncio
import base64

from groq import Groq

from app.config import get_settings


async def synthesize_speech_base64(text: str) -> str | None:
    settings = get_settings()
    if not settings.enable_groq_tts:
        return None
    if not settings.groq_api_key or not text.strip():
        return None

    def _synthesize() -> bytes | None:
        client = Groq(api_key=settings.groq_api_key)
        response = client.audio.speech.create(
            model=settings.groq_tts_model,
            voice="tara",
            input=text,
            response_format="mp3",
        )
        if hasattr(response, "read"):
            return response.read()
        if isinstance(response, bytes):
            return response
        return None

    audio = await asyncio.to_thread(_synthesize)
    if not audio:
        return None
    return base64.b64encode(audio).decode("ascii")
