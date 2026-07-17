# Runbook

Operational procedures for Nimbus.

## Deploy

### Prerequisites (one-time)

1. Create the two Entra app registrations (frontend SPA, backend API) — see
   [security.md](security.md) and the auth troubleshooting section below.
2. Create an Entra app registration for the deploy pipeline and configure a
   **federated credential** for GitHub OIDC (subject
   `repo:<org>/<repo>:environment:dev`). Grant it `Contributor` (+ `User Access
   Administrator` for role assignments) on the target subscription.
3. Configure GitHub repository **secrets** and **variables**:

   | Kind | Name | Example |
   | --- | --- | --- |
   | secret | `AZURE_CLIENT_ID` | pipeline app client id |
   | secret | `AZURE_TENANT_ID` | tenant id |
   | secret | `AZURE_SUBSCRIPTION_ID` | subscription id |
   | secret | `SQL_ADMIN_PASSWORD` | strong password |
   | var | `AZURE_LOCATION` | `eastus` |
   | var | `ADMIN_GROUP_ID` | admin group object id |
   | var | `ENTRA_FRONTEND_CLIENT_ID` | SPA client id |
   | var | `ENTRA_BACKEND_APP_ID_URI` | `api://nimbus` |
   | var | `AZURE_AI_FOUNDRY_ENDPOINT` | Foundry endpoint |

### Automated deploy

Push to `main` or run the **Deploy (dev)** workflow manually. It:

1. Logs in to Azure via OIDC.
2. Provisions infrastructure with Bicep (seeding a public bootstrap image so the
   first run succeeds before your images exist).
3. Builds and pushes the API and web images to ACR.
4. Rolls out the new images with `az containerapp update`.

CI uses the legacy all-in-one `infra/bicep/main.bicep` (subscription-scoped; it
creates the resource group itself). Manual deploys use the per-service flow
below instead.

### Manual per-service deploy (from a workstation)

Manual deploys are one-service-per-run into a resource group **you create
yourself** — nothing in `infra/bicep/deploy/` or `infra/scripts/` ever creates
a resource group. Each script wraps `az deployment group create` around one
group-scoped template in `infra/bicep/deploy/`, which reuses the modules in
`infra/bicep/modules/`. All deployments are idempotent: re-running a script
updates the service in place.

**How dependencies are handled.** Resource names are deterministic and derived
from `<prefix>-<env>` (e.g. `id-nimbus-dev`, `acrnimbusdev`, `pg-nimbus-dev`),
so each template looks up the services it depends on by name with `existing`
references — no outputs need to be threaded between runs. ACR, storage, Key
Vault, PostgreSQL, search, and Foundry names are globally unique across Azure:
if a name is already taken by someone else, pick a different `--prefix` (use it
consistently for every script). Exception: the default ACR name `acrnimbusdev`
is known to be taken, so pass `--acr-name` to `deploy-registry.sh` — the api
and web app scripts then pick the real name up from the state file (or accept
their own `--acr-name`). The only cross-service inputs you pass are
secrets (the DB password, needed by both `postgres` and `key-vault` to compose
the `database-url` secret) and container images. Every script also saves its
deployment outputs to `infra/scripts/.state/<rg>/<service>.env` (gitignored);
`deploy-api-app.sh` reads the search endpoint from there automatically if you
deployed search.

**Deployment order** (and why):

| # | Script | Why here |
| --- | --- | --- |
| 1 | `deploy-identity.sh` | Everything else grants RBAC roles to this identity. |
| 2 | `deploy-observability.sh` | Key Vault seeds the App Insights connection string; the Container Apps env wires logs to Log Analytics. |
| 3 | `deploy-registry.sh` | Needs identity (AcrPull). Apps pull images from it. |
| 4 | `deploy-storage.sh` | Needs identity (Blob Data Contributor). |
| 5 | `deploy-postgres.sh` | Independent, but must exist before Key Vault seeds `database-url`. |
| 6 | `deploy-key-vault.sh` | Needs identity + observability + postgres to compose its seed secrets. |
| 7 | `deploy-search.sh` | Optional; needs identity. Skip if you don't need RAG. |
| 8 | `deploy-container-apps-env.sh` | Needs observability (Log Analytics keys). |
| 9 | `deploy-api-app.sh` | Needs 1–6 and 8 (and optionally 7). |
| 10 | `deploy-web-app.sh` | Needs 1, 3, 8. |

Steps 2–5 are mutually independent — the order among them doesn't matter as
long as identity is first and Key Vault comes after 2 and 5.

**Full sequence for a fresh `rg-nimbus`:**

```bash
az login
az account set --subscription <sub-id>

# 0. Resource group — created manually, once:
az group create --name rg-nimbus --location eastus

export SQL_ADMIN_PASSWORD='<url-safe-alphanumeric>'   # not stored anywhere

infra/scripts/deploy-identity.sh            -g rg-nimbus
infra/scripts/deploy-observability.sh       -g rg-nimbus
infra/scripts/deploy-registry.sh            -g rg-nimbus --acr-name acrnimbusdev01
infra/scripts/deploy-storage.sh             -g rg-nimbus
infra/scripts/deploy-postgres.sh            -g rg-nimbus
infra/scripts/deploy-key-vault.sh           -g rg-nimbus
# optional: infra/scripts/deploy-search.sh  -g rg-nimbus
infra/scripts/deploy-container-apps-env.sh  -g rg-nimbus

# First run: bootstrap with a public image (ACR is empty), then build/push and
# re-run with the real images.
infra/scripts/deploy-api-app.sh -g rg-nimbus \
  --api-image mcr.microsoft.com/k8se/quickstart:latest \
  --foundry-endpoint "$AZURE_AI_FOUNDRY_ENDPOINT" \
  --admin-group-id "$ADMIN_GROUP_ID"
infra/scripts/deploy-web-app.sh -g rg-nimbus \
  --web-image mcr.microsoft.com/k8se/quickstart:latest

# Build/push real images (ACR name is in the registry outputs / state file):
ACR=$(sed -n 's/^registryName=//p' infra/scripts/.state/rg-nimbus/registry.env)
az acr build -r "$ACR" -t nimbus-api:latest apps/api
az acr build -r "$ACR" -t nimbus-web:latest apps/web
infra/scripts/deploy-api-app.sh -g rg-nimbus --api-image "$ACR.azurecr.io/nimbus-api:latest" \
  --foundry-endpoint "$AZURE_AI_FOUNDRY_ENDPOINT" --admin-group-id "$ADMIN_GROUP_ID"
infra/scripts/deploy-web-app.sh -g rg-nimbus --web-image "$ACR.azurecr.io/nimbus-web:latest"
```

Every script supports `-p/--prefix` (default `nimbus`), `-e/--environment`
(`dev`|`prod`, default `dev`), `-l/--location` (defaults to the resource
group's location), and `--help` for the full option list. To update a single
service later, just re-run its script.

Apply database migrations after the first deploy (from a machine that can reach
Azure PostgreSQL, or a one-off job):

```bash
alembic upgrade head
```

## RAG / retrieval operations

The `/ask` endpoint retrieves from **pgvector** on the existing PostgreSQL
server — Azure AI Search is not used.

**Embedding deployment (one-time, manual).** The Foundry/AI resource is
provisioned outside this repo. In Azure AI Foundry, create a
`text-embedding-3-small` model deployment on the resource, then set
`AZURE_AI_FOUNDRY_EMBEDDING_DEPLOYMENT_NAME` (accepted alias for the chat
deployment: `AZURE_AI_FOUNDRY_CHAT_DEPLOYMENT_NAME`) on the api app.

**pgvector allowlisting.** On Azure Database for PostgreSQL Flexible Server the
`vector` extension must be allowlisted before `CREATE EXTENSION` works.
`infra/bicep/modules/postgres.bicep` sets the `azure.extensions = VECTOR`
server configuration; migration `0003_pgvector` then runs
`CREATE EXTENSION IF NOT EXISTS vector`. Locally the
`pgvector/pgvector:pg16` docker image ships it pre-installed.

**Editor gating.** Set `EDITOR_EMAILS` (comma-separated, case-insensitive) to
the people allowed to triage/edit projects. The local dev principal
(`AUTH_MODE=disabled`) is always an editor.

**Reindexing.** The retrieval index (`content_chunks`) refreshes incrementally
by checksum at API startup and inline on project writes. To force a manual
refresh: `make reindex`. **After switching AI providers or embedding models**
the checksums still match, so old vectors are NOT re-embedded — wipe the index
first:

```bash
docker compose exec db psql -U nimbus -d nimbus -c "DELETE FROM content_chunks;"
make reindex   # or restart the api; startup reindex rebuilds it
```

## Rotate secrets

- **SQL admin password**: update the GitHub secret `SQL_ADMIN_PASSWORD`, then
  re-run the deploy (Bicep updates the server and the Key Vault seed secret). Or
  rotate directly with `az sql server update` and update Key Vault.
- **Key Vault secrets**: `az keyvault secret set --vault-name <kv> --name <n>
  --value <v>`. Container Apps pick up new versions on the next revision; restart
  with `az containerapp revision restart` if needed.
- **Entra client secrets**: prefer managed identity / federated credentials so
  there are no client secrets to rotate. If one exists, roll it in Entra and
  update the corresponding Key Vault secret.

## Inspect logs

```bash
# Live tail from a container app
az containerapp logs show -n <app-name> -g <rg> --follow

# Structured queries in Log Analytics (App Insights)
# Portal > Logs, or:
az monitor log-analytics query -w <workspace-id> \
  --analytics-query "ContainerAppConsoleLogs_CL | where Log_s has 'correlation_id' | take 50"
```

Every log line and error response carries a `correlationId` — use it to trace a
single request end to end.

## Troubleshoot auth issues

| Symptom | Likely cause / fix |
| --- | --- |
| `401 unauthorized` for all calls | Token audience/issuer mismatch. Confirm `ENTRA_BACKEND_APP_ID_URI` and `AZURE_TENANT_ID`, and that the SPA requests the correct scope. |
| `401` intermittently | Clock skew or expired token; MSAL should refresh. Check `jwt_leeway_seconds`. |
| `403 forbidden` on admin routes | User lacks the `admin` role or `ADMIN_GROUP_ID` membership. |
| Works locally, fails deployed | You were running with `AUTH_MODE=disabled`. Test with `AUTH_MODE=entra` and a real token. |
| Login loop / redirect error | `NEXT_PUBLIC_ENTRA_REDIRECT_URI` must be registered as a redirect URI on the SPA app registration. |

Decode a token at <https://jwt.ms> to inspect `aud`, `iss`, `roles`, `groups`.

## Troubleshoot Foundry calls

| Symptom | Likely cause / fix |
| --- | --- |
| `502 upstream_error` from `/chat` | Foundry call failed. Check backend logs for the wrapped exception. |
| `AZURE_AI_FOUNDRY_ENDPOINT is not configured` | Set the endpoint and switch `AI_PROVIDER=foundry`. |
| `403` from Foundry | The managed identity lacks a role on the AI resource, or the wrong `AZURE_CLIENT_ID` is set. Grant `Cognitive Services User`. |
| SDK / signature errors | Confirm the installed `openai`/`azure-ai-*` version matches `foundry_provider._invoke_model`; update that one adapter method. |
| Deployment name errors | `AZURE_AI_FOUNDRY_DEPLOYMENT_NAME` must match a real model deployment. |
| `AZURE_AI_FOUNDRY_EMBEDDING_DEPLOYMENT_NAME is not configured` | Create the embedding deployment and set the env var (see RAG operations above). |
| `/ask` always returns the fallback answer | Retrieval index empty or embedded with a different provider/model — wipe `content_chunks` and `make reindex`. |

To bisect, set `AI_PROVIDER=mock` — if `/chat` then works, the issue is isolated
to the Foundry integration.

## Onboard a new developer

1. Install prerequisites (Docker, Node 20 LTS/22 LTS, Python 3.11+). See
   [local-development.md](local-development.md).
2. `cp .env.example .env` and `make dev`.
3. Open http://localhost:3000 (auth disabled, mock AI — no Azure needed).
4. Grant Azure access only when they need to deploy or use real Foundry.
