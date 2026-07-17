"""Deterministic mock AI provider for local development and tests.

Requires no network or credentials. It echoes a short, predictable response so
tests can assert on it and developers can exercise the full request path.
"""
from __future__ import annotations

import hashlib
import math
import re

from app.services.ai.base import EMBEDDING_DIM, AIProvider, ChatMessage, ChatResult

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _tokens(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


class MockAIProvider(AIProvider):
    name = "mock"

    async def chat(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> ChatResult:
        last_user = next(
            (m.content for m in reversed(messages) if m.role == "user"),
            "",
        )
        preview = last_user.strip()
        if len(preview) > 200:
            preview = preview[:200] + "…"
        content = (
            f"[mock] You said: {preview}"
            if preview
            else "[mock] Hello from the mock AI provider."
        )
        return ChatResult(
            content=content,
            model="mock-1",
            metadata={"provider": self.name, "echoed_chars": len(last_user)},
        )

    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Return deterministic lexical vectors for local RAG.

        Each token hashes into a shared 1536-dim bucket space. Texts with
        overlapping vocabulary therefore have a higher cosine similarity, which
        makes local pgvector and SQLite fallback retrieval meaningful offline.
        """
        vectors: list[list[float]] = []
        for text in texts:
            vector = [0.0] * EMBEDDING_DIM
            for token in _tokens(text):
                digest = hashlib.sha256(token.encode("utf-8")).digest()
                bucket = int.from_bytes(digest[:8], "big") % EMBEDDING_DIM
                vector[bucket] += 1.0

            norm = math.sqrt(sum(value * value for value in vector))
            if norm:
                vector = [value / norm for value in vector]
            vectors.append(vector)
        return vectors
