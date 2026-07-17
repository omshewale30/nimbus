# Architecture

Nimbus is a two-tier web application: a Next.js
frontend and a FastAPI backend, with Microsoft Entra ID for identity and Azure
services for AI, data, and storage. Everything privileged happens on the backend.

## Component diagram

```mermaid
flowchart TD
    subgraph Browser
      UI[Next.js App Router UI]
      MSAL[MSAL.js]
    end

    Entra[Microsoft Entra ID]
    API[FastAPI backend]
    Foundry[Azure AI Foundry]
    SQL[(Azure PostgreSQL)]
    Blob[(Azure Blob Storage)]
    Search[(Azure AI Search - optional)]
    KV[Azure Key Vault]
    AI2[App Insights / Log Analytics]

    UI -->|login redirect| MSAL
    MSAL -->|OIDC| Entra
    Entra -->|access token| MSAL
    UI -->|"HTTPS + Bearer token"| API
    API -->|validate JWT / JWKS| Entra
    API -->|provider abstraction| Foundry
    API --> SQL
    API --> Blob
    API -.-> Search
    API -->|secrets via managed identity| KV
    API -->|telemetry| AI2
```

## Request flow (chat)

1. The user signs in via MSAL; Entra returns an access token scoped to the API.
2. The frontend calls `POST /api/v1/chat` with the token in the `Authorization`
   header (added by the typed API client).
3. The backend validates the token (issuer, audience, signature via JWKS) and
   resolves a `Principal` with roles/groups.
4. The chat route calls the `AIProvider` abstraction. In production this is the
   Azure AI Foundry provider; locally/in tests it is the mock provider.
5. The backend records an audit event and returns `{ "response": "..." }`.

## What belongs where

| Concern | Frontend | Backend |
| --- | --- | --- |
| Rendering, UX, client state | ✅ | |
| Sign-in / token acquisition (MSAL) | ✅ | |
| Attaching tokens to requests | ✅ | |
| **Token validation** | | ✅ |
| **Authorization decisions** | UX hints only | ✅ enforced |
| **AI / Foundry calls** | ❌ never | ✅ |
| Database, storage, search | ❌ | ✅ |
| Secrets / credentials | ❌ | ✅ (Key Vault + MI) |
| Business logic | thin | ✅ |

The frontend may *hint* at authorization (e.g. hide an admin link), but the
backend is the only enforcement point. See
[`adr/0002-backend-only-ai-access.md`](adr/0002-backend-only-ai-access.md).

## RAG flow (`/ask`)

Retrieval runs on **pgvector** over the existing Postgres — no Azure AI Search.
Sources are the git-authored content and the project inventory, chunked and
embedded into `content_chunks` (1536-dim vectors):

```mermaid
flowchart LR
    subgraph sources
      MD[content/*.md] -->|content_sync| CI[(content_items)]
      PF[/propose + editor CRUD/] --> PR[(projects)]
    end
    CI -->|"indexer: chunk by heading"| CH[(content_chunks\nvector 1536)]
    PR -->|"indexer: synthetic doc"| CH
    IDX[embed via AIProvider.embed] -.-> CH

    Q[POST /ask] --> R{get_retriever}
    R -->|postgresql| PGR["PgVectorRetriever\ncosine top-k + floor"]
    R -->|sqlite/tests| MR[MockRetriever keyword]
    PGR & MR --> CTX[grounded prompt + citations]
    CTX --> CHAT[AIProvider.chat]
    CHAT --> A["answer + citations[]"]
```

The index is refreshed incrementally by checksum: at API startup (after the
content sync), inline from the project routes, and manually via `make reindex`.
If retrieval finds nothing above the similarity floor, `/ask` returns a
fallback answer without calling the LLM. On SQLite (tests) the keyword
`MockRetriever` keeps the whole route testable without a vector extension.

## Backend module map

- `core/` — config, structured logging, JWT security, error envelope, middleware.
- `api/v1/` — router + routes (`health`, `me`, `chat`, `content`, `projects`,
  `ask`, `insights`, `admin`).
- `services/ai/` — `AIProvider` abstraction (chat + embeddings), mock + Foundry
  providers, factory.
- `services/rag/` — `indexer` (chunking + incremental embedding into
  `content_chunks`) and `retriever` (`PgVectorRetriever` / `MockRetriever`).
- `services/content_sync` — git-authored markdown → `content_items` at startup.
- `services/storage`, `services/search`, `services/identity`, `services/audit`.
- `db/` — SQLAlchemy engine/session, declarative base, Alembic migrations.
- `models/`, `schemas/` — persistence models vs. API request/response models.

## Configuration & environments

All backend config is centralized in `core/config.py` (typed Pydantic settings).
Two switches make the app run anywhere:

- `AI_PROVIDER` — `mock` (local/tests) or `foundry` (deployed).
- `AUTH_MODE` — `disabled` (local only) or `entra`.

## Observability

Structured JSON logs carry a per-request `correlationId` (also returned in the
`X-Correlation-ID` response header). When an App Insights connection string is
present, Azure Monitor OpenTelemetry is enabled at startup.
