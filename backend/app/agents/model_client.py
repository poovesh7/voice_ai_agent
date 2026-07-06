from autogen_core.models import ModelFamily
from autogen_ext.models.openai import OpenAIChatCompletionClient

from app.config import get_settings


def get_model_client() -> OpenAIChatCompletionClient:
    settings = get_settings()
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is required to call the assistant model.")

    return OpenAIChatCompletionClient(
        model=settings.groq_model,
        base_url="https://api.groq.com/openai/v1",
        api_key=settings.groq_api_key,
        model_info={
            "vision": False,
            "function_calling": True,
            "json_output": True,
            "structured_output": False,
            "family": ModelFamily.UNKNOWN,
        },
    )
