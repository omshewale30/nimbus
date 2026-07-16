#!/usr/bin/env bash
# Deploy ONLY the Key Vault (+ seed secrets) into an existing resource group.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

DB_ADMIN_LOGIN=""
DB_ADMIN_PASSWORD="${SQL_ADMIN_PASSWORD:-}"
DATABASE_NAME="appdb"

usage() {
  cat <<EOF
Deploy the Nimbus Key Vault, grant Secrets User to the app identity, and seed
the appinsights-connection-string and database-url secrets.

Requires: identity, observability, and postgres already deployed in the same
group (their values are looked up by name inside the Bicep template). The DB
credentials must match what deploy-postgres.sh used — they are needed here to
compose the database-url secret.

Usage: $(basename "$0") -g <resource-group> --db-admin-password <pw> [options]

Options:
$(common_options_help)
      --db-admin-login <name>      Admin login (default: <prefix>admin)
      --db-admin-password <pw>     Admin password (or set SQL_ADMIN_PASSWORD)
      --database-name <name>       Database name (default: appdb)

Example:
  export SQL_ADMIN_PASSWORD='...'
  $(basename "$0") -g rg-nimbus
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-admin-login)    DB_ADMIN_LOGIN="${2:-}"; shift 2 ;;
    --db-admin-password) DB_ADMIN_PASSWORD="${2:-}"; shift 2 ;;
    --database-name)     DATABASE_NAME="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) parse_common_arg "$@" || { usage >&2; die "unknown option: $1"; }; shift "$ARG_SHIFT" ;;
  esac
done

[[ -n "$DB_ADMIN_PASSWORD" ]] || die "provide --db-admin-password or set SQL_ADMIN_PASSWORD"
DB_ADMIN_LOGIN="${DB_ADMIN_LOGIN:-${RESOURCE_PREFIX}admin}"

run_deployment key-vault \
  dbAdminLogin="$DB_ADMIN_LOGIN" \
  dbAdminPassword="$DB_ADMIN_PASSWORD" \
  databaseName="$DATABASE_NAME"
