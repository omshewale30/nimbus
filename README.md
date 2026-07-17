# Nimbus

This is a AI first platform for F&O staff to use

An AI-native internal web app: **Next.js** frontend, **FastAPI** backend,
**Microsoft Entra ID** auth, **Azure AI Foundry** for AI, deployed to **Azure
Container Apps**. Generated from the `ai-tool-starter` template.

---

## Table of contents

- [What this is](#what-this-is)
- [Architecture overview](#architecture-overview)
- [Tech stack](#tech-stack)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Running the backend](#running-the-backend)
- [Running the frontend](#running-the-frontend)
- [Running tests](#running-tests)
- [Auth setup overview](#auth-setup-overview)
- [Azure setup overview](#azure-setup-overview)
- [Deployment overview](#deployment-overview)
- [Creating a new project from the template](#creating-a-new-project-from-the-template)
- [What to change for a real project](#what-to-change-for-a-real-project)
- [Security notes](#security-notes)
- [Known limitations](#known-limitations)

## What this is

Nimbus is an internal AI enablement hub for Finance & Operations staff: a
browsable library of guides and reusable prompts, an AI project inventory fed by
a lightweight intake workflow, a retrieval-grounded assistant with citations,
and leadership usage metrics.

### Surface map

| Surface | Route(s) | Backed by |
| --- | --- | --- |
| Home (browse-first) | `/` | featured `content_items` |
| Guides (playbooks, guidance, tools) | `/guides`, `/guides/[slug]` | `GET /api/v1/content` |
| Prompt library (copy-to-clipboard) | `/prompts`, `/prompts/[slug]` | `GET /api/v1/content`, copy events |
| Project inventory | `/projects`, `/projects/[id]` | `GET/POST/PATCH /api/v1/projects` |
| Propose an AI use case (intake) | `/propose` | `POST /api/v1/projects/intake` |
| Ask (RAG with citations) | `/ask` | `POST /api/v1/ask` + pgvector `content_chunks` |
| Open-ended assistant | `/chat` | `POST /api/v1/chat` |
| Insights (usage metrics) | `/insights` | `GET /api/v1/insights/summary` |

Content is **git-first**: markdown under `apps/api/content/` is synced into the
DB at startup (see `apps/api/content/README.md`). Retrieval for `/ask` uses
**pgvector on the existing Postgres** (Azure AI Search stays off). Editor-only
actions (triage, project edits) are gated by the `EDITOR_EMAILS` setting.

## Architecture overview

```
Browser ──(MSAL login)──> Microsoft Entra ID
   │  access token (JWT)
   ▼
Next.js frontend  ──HTTPS + Bearer token──>  FastAPI backend
                                               │  validates JWT (issuer/aud/keys)
                                               │  extracts roles/groups
                                               ├─> Azure AI Foundry (via provider)
                                               ├─> Azure PostgreSQL (SQLAlchemy)
                                               ├─> Azure Blob Storage
                                               └─> Azure Key Vault / Managed Identity
```

The frontend **never** calls Azure AI Foundry (or any privileged Azure service)
directly. All privileged calls go through the backend. See
[`docs/architecture.md`](docs/architecture.md) and
[`docs/adr/0002-backend-only-ai-access.md`](docs/adr/0002-backend-only-ai-access.md).

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js (App Router) + TypeScript, MSAL |
| Backend | FastAPI + Python 3.11 |
| Auth | Microsoft Entra ID (OAuth2 / OIDC) |
| AI | Azure AI Foundry (mockable) |
| Database | Azure Database for PostgreSQL (SQLAlchemy + Alembic) |
| Storage | Azure Blob Storage |
| Search/RAG | Azure AI Search (optional) |
| Hosting | Azure Container Apps |
| Secrets | Azure Key Vault |
| Observability | Azure Monitor / App Insights / OpenTelemetry |
| CI/CD | GitHub Actions (OIDC to Azure) |
| Infra | Bicep |
| Tests | pytest, Vitest + React Testing Library, Playwright |

## Local setup

Prerequisites: **Docker**, **Node 20 LTS or 22 LTS**, **Python 3.11+**, and
(optionally) `make`. Full details in
[`docs/local-development.md`](docs/local-development.md).

```bash
cp .env.example .env
make dev        # frontend :3000, backend :8000, PostgreSQL (docker) :5432
```

`make dev` runs everything with `AI_PROVIDER=mock` and `AUTH_MODE=disabled`, so
**no real Azure resources are required** to run locally.
The API container applies Alembic migrations automatically on startup.

Without `make`:

```bash
docker compose up --build
```

## Environment variables

Copy `.env.example` to `.env` and adjust. Frontend-specific values live in
`apps/web/.env.local.example`. Key variables:

| Variable | Where | Default (local) | Purpose |
| --- | --- | --- | --- |
| `AI_PROVIDER` | backend | `mock` | `mock` or `foundry` |
| `AUTH_MODE` | backend | `disabled` | `disabled` (local only!) or `entra` |
| `AZURE_TENANT_ID` | backend | placeholder | Entra tenant |
| `ENTRA_BACKEND_CLIENT_ID` | backend | placeholder | API audience |
| `ENTRA_BACKEND_APP_ID_URI` | backend | placeholder | Expected `aud` |
| `DATABASE_URL` | backend | local PostgreSQL | SQLAlchemy URL |
| `ADMIN_GROUP_ID` | backend | placeholder | Group/role for admin routes |
| `AZURE_AI_FOUNDRY_ENDPOINT` | backend | — | Foundry endpoint (prod) |
| `NEXT_PUBLIC_API_BASE_URL` | frontend | `http://localhost:8000` | Backend base URL |
| `NEXT_PUBLIC_ENTRA_CLIENT_ID` | frontend | placeholder | SPA client id |
| `NEXT_PUBLIC_ENTRA_TENANT_ID` | frontend | placeholder | Tenant |
| `NEXT_PUBLIC_ENTRA_API_SCOPE` | frontend | placeholder | API scope to request |

Full list with descriptions is in `.env.example`.

## Running the backend

```bash
cd apps/api
python3.11 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head           # apply migrations (needs a reachable DB)
uvicorn app.main:app --reload  # http://localhost:8000  (docs at /docs)
```

## Running the frontend

```bash
cd apps/web
cp .env.local.example .env.local
npm install
npm run dev                    # http://localhost:3000
```

## Running tests

```bash
# Backend
cd apps/api && pytest

# Frontend unit/component tests
cd apps/web && npm run test

# Frontend E2E smoke test (Playwright)
cd apps/web && npx playwright install --with-deps && npm run test:e2e
```

Backend tests use the **mock AI provider** and an in-memory SQLite database, so
they need no Azure credentials.

## Auth setup overview

1. Register two apps in Microsoft Entra ID: a **SPA** (frontend) and a **Web/API**
   (backend). Expose an API scope (e.g. `access_as_user`) on the backend app.
2. Grant the SPA delegated permission to the backend API scope.
3. Set the frontend `NEXT_PUBLIC_ENTRA_*` values and the backend
   `AZURE_TENANT_ID` / `ENTRA_BACKEND_*` values.
4. For admin routes, put users in an Entra **group** (or assign an **app role**)
   and set `ADMIN_GROUP_ID`.

Detailed walkthrough: [`docs/security.md`](docs/security.md) and the runbook.

## Azure setup overview

Infrastructure is defined in [`infra/bicep`](infra/bicep). It provisions a
resource group's worth of services (Container Apps, ACR, Key Vault, Azure PostgreSQL,
Storage, App Insights). See [Deployment overview](#deployment-overview).

- `infra/bicep/modules/` — one reusable module per service.
- `infra/bicep/deploy/` — group-scoped entrypoints, one per service, for
  deploying into an **existing** resource group one service at a time.
- `infra/bicep/main.bicep` — legacy all-in-one, subscription-scoped template
  (creates the resource group itself); still used by CI.
- `infra/scripts/` — `deploy-<service>.sh` wrappers around
  `az deployment group create`, one service per run.

## Deployment overview

CI deployment is via GitHub Actions using **OIDC federation** (no stored Azure
passwords) and the legacy all-in-one template. See
[`.github/workflows/deploy-dev.yml`](.github/workflows/deploy-dev.yml).

Manual deployment is **per-service into a manually created resource group**:
create the group once with `az group create`, then run one script per service
in dependency order (identity → observability/registry/storage/postgres →
key-vault → container-apps-env → api/web apps). Each script is idempotent —
re-run it to update just that service.

```bash
az group create --name rg-nimbus --location eastus   # manual, once
export SQL_ADMIN_PASSWORD='...'
infra/scripts/deploy-identity.sh -g rg-nimbus
infra/scripts/deploy-observability.sh -g rg-nimbus
# ... see docs/runbook.md for the full order and options
```

Full step-by-step flow, dependency rationale, and options:
[`docs/runbook.md`](docs/runbook.md).

## Creating a new project from the template

This repo was generated from `ai-tool-starter`:

```bash
cookiecutter path/to/ai-tool-starter
```

## What to change for a real project

- Replace every placeholder GUID (`00000000-...`) with real Entra/Azure values,
  supplied via env vars or Key Vault — never commit them.
- Set `AUTH_MODE=entra` and `AI_PROVIDER=foundry` outside local dev.
- Review `apps/api/app/services/ai/foundry_provider.py` and pin the AI SDK
  version you deploy against.
- Set real `resource_prefix`, region, and SQL admin credentials in Bicep params
  (via Key Vault / pipeline secrets).
- Add your own tables/migrations and domain routes.

## Security notes

- Auth can be disabled locally (`AUTH_MODE=disabled`) — this is **loudly unsafe**
  and must never be used in a deployed environment. The backend logs a warning
  on every request when disabled.
- Privileged calls (AI, DB, storage) only happen server-side.
- Secrets come from Key Vault via managed identity in Azure. Nothing sensitive is
  committed. See [`docs/security.md`](docs/security.md).

## Known limitations

- The Foundry provider is a **scaffold**: it isolates the SDK call in one adapter
  method you must confirm against your installed `azure-ai-*` package version.
- No production-grade rate limiting, caching, or multi-tenant isolation.
- Authorization is coarse (admin group/role); add finer-grained checks as needed.
- Bicep is intentionally minimal (single environment per deployment, basic SKUs).
