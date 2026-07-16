#!/usr/bin/env bash
# Deploy ONLY the web (Next.js) container app into an existing resource group.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

WEB_IMAGE=""
ACR_NAME=""

usage() {
  cat <<EOF
Deploy the Nimbus web container app (ca-<prefix>-<env>-web).

Requires: identity, registry, and container-apps-env already deployed in the
same group. The image must already be pushed to the ACR — use a public
bootstrap image (mcr.microsoft.com/k8se/quickstart:latest) for the very first
deploy if yours isn't built yet.

Note: NEXT_PUBLIC_* values are baked into the web image at BUILD time; the env
vars set here are a fallback. Build the image with the right build args.

Usage: $(basename "$0") -g <resource-group> --web-image <image> [options]

Options:
$(common_options_help)
      --web-image <image>   Container image (required),
                            e.g. <acr>.azurecr.io/nimbus-web:sha
      --acr-name <name>     ACR name, if the registry was deployed with a
                            non-default name. Defaults to the saved output of
                            deploy-registry.sh if present.

Example:
  $(basename "$0") -g rg-nimbus --web-image myacr.azurecr.io/nimbus-web:latest
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --web-image) WEB_IMAGE="${2:-}"; shift 2 ;;
    --acr-name)  ACR_NAME="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) parse_common_arg "$@" || { usage >&2; die "unknown option: $1"; }; shift "$ARG_SHIFT" ;;
  esac
done

[[ -n "$WEB_IMAGE" ]] || die "--web-image is required"

# Pick up the actual ACR name from deploy-registry.sh's saved outputs.
[[ -n "$ACR_NAME" ]] || ACR_NAME="$(state_get registry registryName)"

run_deployment web-app webImage="$WEB_IMAGE" acrName="$ACR_NAME"
