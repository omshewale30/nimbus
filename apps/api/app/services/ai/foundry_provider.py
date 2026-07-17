"""Azure AI Foundry provider (scaffold).

This is the single place where the app talks to Azure AI Foundry. The actual SDK
call is isolated in `_invoke_model` so you can adapt it to whatever
`azure-ai-*` / `openai` package version you deploy against without touching the
rest of the codebase.

Authentication uses the API key stored in the environment variables.

Config (from `Settings`, i.e. environment variables):
  - AZURE_AI_FOUNDRY_ENDPOINT
  - AZURE_AI_FOUNDRY_API_KEY
  - AZURE_AI_FOUNDRY_PROJECT_NAME
  - AZURE_AI_FOUNDRY_DEPLOYMENT_NAME (alias: AZURE_AI_FOUNDRY_CHAT_DEPLOYMENT_NAME)
  - AZURE_AI_FOUNDRY_EMBEDDING_DEPLOYMENT_NAME
  - AZURE_AI_FOUNDRY_API_VERSION

Install the SDK extra before enabling this provider:
  pip install -e ".[foundry]"
"""
from __future__ import annotations

from app.core.config import Settings
from app.core.errors import UpstreamServiceError
from app.core.logging import get_logger
from app.services.ai.base import AIProvider, ChatMessage, ChatResult

logger = get_logger(__name__)


class AzureFoundryProvider(AIProvider):
    name = "foundry"

    def __init__(self, settings: Settings):
        if not settings.azure_ai_foundry_endpoint:
            raise UpstreamServiceError("AZURE_AI_FOUNDRY_ENDPOINT is not configured")
        if not settings.azure_ai_foundry_api_key:
            raise UpstreamServiceError("AZURE_AI_FOUNDRY_API_KEY is not configured")
        self._settings = settings
        self._client = None  # created lazily on first use

    def _get_client(self):
        """Build the Azure OpenAI-compatible client using API-key auth.

        NOTE: Confirm this matches your installed `openai` package version.
        Foundry deployments expose an Azure OpenAI-compatible endpoint; if your
        project uses the `azure-ai-projects` / `azure-ai-inference` SDK instead,
        swap the client construction here and the call in `_invoke_model`.
        """
        if self._client is not None:
            return self._client

        # Imported lazily so the mock path needs neither package nor credentials.
        from openai import AsyncAzureOpenAI

        self._client = AsyncAzureOpenAI(
            azure_endpoint=self._settings.azure_ai_foundry_endpoint,
            api_key=self._settings.azure_ai_foundry_api_key,
            api_version=self._settings.azure_ai_foundry_api_version,
        )
        return self._client

    async def _invoke_model(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float,
        max_tokens: int | None,
    ) -> ChatResult:
        """The one adapter method to update if the SDK surface changes."""
        from openai import BadRequestError

        client = self._get_client()
        # Newer model families reject `max_tokens` (and a null value) — send the
        # modern `max_completion_tokens`, and only when a limit was requested.
        kwargs: dict = {
            "model": self._settings.azure_ai_foundry_deployment_name,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
        }
        if max_tokens is not None:
            kwargs["max_completion_tokens"] = max_tokens
        try:
            completion = await client.chat.completions.create(**kwargs)
        except BadRequestError as exc:
            # Reasoning-class deployments only accept the default temperature;
            # retry without it rather than failing the request.
            if "temperature" not in str(exc):
                raise
            kwargs.pop("temperature")
            completion = await client.chat.completions.create(**kwargs)
        choice = completion.choices[0]
        usage = getattr(completion, "usage", None)
        return ChatResult(
            content=choice.message.content or "",
            model=completion.model,
            metadata={
                "provider": self.name,
                "finish_reason": choice.finish_reason,
                "total_tokens": getattr(usage, "total_tokens", None),
            },
        )

    async def chat(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> ChatResult:
        try:
            return await self._invoke_model(
                messages, temperature=temperature, max_tokens=max_tokens
            )
        except UpstreamServiceError:
            raise
        except Exception as exc:  # noqa: BLE001 — normalize all SDK errors
            logger.exception("Azure AI Foundry call failed")
            raise UpstreamServiceError("AI service request failed") from exc


    async def embed(self, texts: list[str]) -> list[list[float]]:
        deployment = self._settings.azure_ai_foundry_embedding_deployment_name
        if not deployment:
            raise UpstreamServiceError(
                "AZURE_AI_FOUNDRY_EMBEDDING_DEPLOYMENT_NAME is not configured"
            )
        try:
            client = self._get_client()
            response = await client.embeddings.create(model=deployment, input=texts)
            # The API may reorder; sort by index to match the input order.
            data = sorted(response.data, key=lambda d: d.index)
            return [d.embedding for d in data]
        except UpstreamServiceError:
            raise
        except Exception as exc:  # noqa: BLE001 — normalize all SDK errors
            logger.exception("Azure AI Foundry embeddings call failed")
            raise UpstreamServiceError("AI embeddings request failed") from exc
