# Shared helpers for the per-service deploy scripts. Sourced, never executed.
#
# Dependency flow between services is resolved inside the Bicep entrypoints
# (infra/bicep/deploy/*.bicep): each entrypoint looks up the resources it
# depends on by their deterministic names derived from <prefix>-<env>
# (e.g. id-nimbus-dev, acrnimbusdev), so scripts only need to pass secrets
# and images.
#
# For convenience, every deployment's outputs are also saved to
# infra/scripts/.state/<resource-group>/<service>.env — scripts can read
# values from there (see state_get), and you can source the files yourself.
#
# shellcheck shell=bash

REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOY_DIR="$REPO_ROOT/infra/bicep/deploy"
STATE_DIR="$SCRIPT_DIR/.state"

# Shared flag defaults (override via parse_common_arg flags).
RESOURCE_GROUP=""
RESOURCE_PREFIX="nimbus"
ENVIRONMENT_NAME="dev"
LOCATION=""

die() {
  echo "error: $*" >&2
  exit 1
}

common_options_help() {
  cat <<'EOF'
  -g, --resource-group <name>   Existing resource group to deploy into (required)
  -p, --prefix <prefix>         Resource name prefix (default: nimbus)
  -e, --environment <env>       dev | prod (default: dev)
  -l, --location <region>       Azure region (default: the resource group's location)
  -h, --help                    Show this help and exit
EOF
}

# Handles one shared flag. Sets ARG_SHIFT to how many args were consumed;
# returns non-zero if the flag is not a shared one.
parse_common_arg() {
  case "$1" in
    -g|--resource-group) RESOURCE_GROUP="${2:-}"; ARG_SHIFT=2 ;;
    -p|--prefix)         RESOURCE_PREFIX="${2:-}"; ARG_SHIFT=2 ;;
    -e|--environment)    ENVIRONMENT_NAME="${2:-}"; ARG_SHIFT=2 ;;
    -l|--location)       LOCATION="${2:-}"; ARG_SHIFT=2 ;;
    *) return 1 ;;
  esac
}

# run_deployment <service> [extra --parameters key=value ...]
#
# Runs an idempotent `az deployment group create` of
# infra/bicep/deploy/<service>.bicep into $RESOURCE_GROUP (which must already
# exist — this never creates resource groups), then prints the deployment
# outputs and saves them to .state/<resource-group>/<service>.env.
run_deployment() {
  local service="$1"
  shift
  local template="$DEPLOY_DIR/$service.bicep"

  [[ -n "$RESOURCE_GROUP" ]] || die "--resource-group is required (see --help)"
  command -v az >/dev/null || die "azure-cli (az) is required"
  [[ -f "$template" ]] || die "template not found: $template"

  az group show --name "$RESOURCE_GROUP" --output none 2>/dev/null \
    || die "resource group '$RESOURCE_GROUP' not found. Create it first, e.g.: az group create -n $RESOURCE_GROUP -l eastus"

  local params=(resourcePrefix="$RESOURCE_PREFIX" environmentName="$ENVIRONMENT_NAME")
  [[ -n "$LOCATION" ]] && params+=(location="$LOCATION")

  echo ">> deploying '$service' into resource group '$RESOURCE_GROUP' (prefix=$RESOURCE_PREFIX, env=$ENVIRONMENT_NAME)"
  az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$service" \
    --template-file "$template" \
    --parameters "${params[@]}" "$@" \
    --output none

  local outputs state_file
  outputs="$(az deployment group show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$service" \
    --query properties.outputs \
    --output json)"

  mkdir -p "$STATE_DIR/$RESOURCE_GROUP"
  state_file="$STATE_DIR/$RESOURCE_GROUP/$service.env"
  python3 - "$outputs" > "$state_file" <<'PY'
import json, sys
for key, item in (json.loads(sys.argv[1]) or {}).items():
    print(f"{key}={item['value']}")
PY

  echo ">> '$service' deployed. Outputs (saved to ${state_file#"$REPO_ROOT"/}):"
  sed 's/^/   /' "$state_file"
}

# state_get <service> <key> — prints a previously saved deployment output for
# the current $RESOURCE_GROUP, or nothing if it isn't there.
state_get() {
  local file="$STATE_DIR/$RESOURCE_GROUP/$1.env"
  if [[ -f "$file" ]]; then
    sed -n "s/^$2=//p" "$file"
  fi
}
