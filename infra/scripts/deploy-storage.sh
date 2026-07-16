#!/usr/bin/env bash
# Deploy ONLY the storage account + uploads container into an existing resource group.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

CONTAINER_NAME="uploads"

usage() {
  cat <<EOF
Deploy Nimbus blob storage (account + container) and grant Blob Data
Contributor to the app identity.

Requires: identity (deploy-identity.sh) already deployed in the same group.

Usage: $(basename "$0") -g <resource-group> [options]

Options:
$(common_options_help)
      --container-name <name>   Blob container name (default: uploads)

Example:
  $(basename "$0") -g rg-nimbus
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --container-name) CONTAINER_NAME="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) parse_common_arg "$@" || { usage >&2; die "unknown option: $1"; }; shift "$ARG_SHIFT" ;;
  esac
done

run_deployment storage containerName="$CONTAINER_NAME"
