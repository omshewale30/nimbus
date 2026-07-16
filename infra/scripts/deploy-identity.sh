#!/usr/bin/env bash
# Deploy ONLY the user-assigned managed identity into an existing resource group.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

usage() {
  cat <<EOF
Deploy the Nimbus managed identity (id-<prefix>-<env>).

Deploy this FIRST — every other service grants roles to this identity.

Usage: $(basename "$0") -g <resource-group> [options]

Options:
$(common_options_help)

Example:
  $(basename "$0") -g rg-nimbus
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    *) parse_common_arg "$@" || { usage >&2; die "unknown option: $1"; }; shift "$ARG_SHIFT" ;;
  esac
done

run_deployment identity
