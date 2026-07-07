# Nimbus backend image.
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install dependencies first for better layer caching.
COPY pyproject.toml ./
COPY alembic.ini ./
COPY app ./app
RUN pip install --upgrade pip && pip install ".[postgres,foundry]"

# Git-authored content, synced into the DB at startup (services/content_sync.py).
COPY content ./content

EXPOSE 8000

# Apply migrations, then serve. 4 workers is a reasonable default for
# Container Apps; tune per workload.
CMD ["/bin/bash", "-lc", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4"]
