#!/usr/bin/env bash
# Deploy ONLY the Azure AI Foundry resource into an existing resource group.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

ACCOUNT_KIND="AIServices"
SKU_NAME="S0"
CUSTOM_SUBDOMAIN_NAME=""
DISABLE_LOCAL_AUTH="true"
PUBLIC_NETWORK_ACCESS="Enabled"
ALLOW_PROJECT_MANAGEMENT="true"

usage() {
  cat <<EOF
Deploy Azure AI Foundry (Azure AI Services/OpenAI account) and grant
'Cognitive Services User' to the app identity.

Requires: identity (deploy-identity.sh) already deployed in the same group.

Usage: $(basename "$0") -g <resource-group> [options]

Options:
$(common_options_help)
      --kind <AIServices|OpenAI>      Foundry account kind (default: AIServices)
      --sku <name>                    SKU name (default: S0)
      --custom-subdomain <name>       Optional custom subdomain (default: auto)
      --disable-local-auth <bool>     true|false (default: true)
      --public-network <setting>      Enabled|Disabled (default: Enabled)
      --allow-project-management <bool> true|false (default: true)

Example:
  $(basename "$0") -g rg-nimbus --kind AIServices --sku S0
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --kind) ACCOUNT_KIND="${2:-}"; shift 2 ;;
    --sku) SKU_NAME="${2:-}"; shift 2 ;;
    --custom-subdomain) CUSTOM_SUBDOMAIN_NAME="${2:-}"; shift 2 ;;
    --disable-local-auth) DISABLE_LOCAL_AUTH="${2:-}"; shift 2 ;;
    --public-network) PUBLIC_NETWORK_ACCESS="${2:-}"; shift 2 ;;
    --allow-project-management) ALLOW_PROJECT_MANAGEMENT="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) parse_common_arg "$@" || { usage >&2; die "unknown option: $1"; }; shift "$ARG_SHIFT" ;;
  esac
done

run_deployment foundry \
  accountKind="$ACCOUNT_KIND" \
  skuName="$SKU_NAME" \
  customSubdomainName="$CUSTOM_SUBDOMAIN_NAME" \
  disableLocalAuth="$DISABLE_LOCAL_AUTH" \
  publicNetworkAccess="$PUBLIC_NETWORK_ACCESS" \
  allowProjectManagement="$ALLOW_PROJECT_MANAGEMENT"
