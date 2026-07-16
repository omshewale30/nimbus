#!/usr/bin/env bash
# Deploy ONLY the Azure Container Registry into an existing resource group.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

ACR_NAME=""

usage() {
  cat <<EOF
Deploy the Nimbus container registry (ACR) and grant AcrPull to the app identity.

Requires: identity (deploy-identity.sh) already deployed in the same group.

Usage: $(basename "$0") -g <resource-group> [options]

Options:
$(common_options_help)
      --acr-name <name>   Explicit ACR name. ACR names are GLOBALLY unique
                          across Azure — use this when the default
                          acr<prefix><env> is already taken. The api/web app
                          scripts pick it up automatically from the state file.

Example:
  $(basename "$0") -g rg-nimbus --acr-name acrnimbusdev01
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --acr-name) ACR_NAME="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) parse_common_arg "$@" || { usage >&2; die "unknown option: $1"; }; shift "$ARG_SHIFT" ;;
  esac
done

run_deployment registry acrName="$ACR_NAME"
