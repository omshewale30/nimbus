"""The AI provider abstraction.

The chat endpoint depends only on `AIProvider`. Concrete providers (mock, Azure
AI Foundry) implement it. This keeps privileged AI access on the backend and
makes local development and testing possible without any Azure dependency.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

EMBEDDING_DIM = 1536
# Backward-compatible alias for any older imports.
EMBEDDING_DIMENSION = EMBEDDING_DIM


@dataclass
class ChatMessage:
    role: str  # "system" | "user" | "assistant"
    content: str


@dataclass
class ChatResult:
    content: str
    model: str
    # Provider-specific metadata (token usage, finish reason, ...).
    metadata: dict | None = None


class AIProvider(ABC):
    """Backend-only interface for AI chat/completion."""

    name: str = "base"

    @abstractmethod
    async def chat(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> ChatResult:
        """Return a single assistant response for the given conversation."""
        raise NotImplementedError

    @abstractmethod
    async def embed(
        self,
        texts: list[str],
    ) -> list[list[float]]:
        """Return embeddings for the given texts."""
        raise NotImplementedError
