// Per-service deployment: Container Apps managed environment.
//
// Group-scoped — deploys into an EXISTING resource group (never creates one).
//   az deployment group create -g rg-nimbus \
//     --template-file infra/bicep/deploy/container-apps-env.bicep
//
// Dependency order: requires `observability` (the module wires app logs to the
// Log Analytics workspace `log-<prefix>-<env>` in this resource group).
targetScope = 'resourceGroup'

@description('Prefix for resource names.')
param resourcePrefix string = 'nimbus'

@allowed(['dev', 'prod'])
param environmentName string = 'dev'

@description('Azure region. Defaults to the resource group location.')
param location string = resourceGroup().location

var namePrefix = '${resourcePrefix}-${environmentName}'
var tags = {
  application: 'nimbus'
  environment: environmentName
}

module env '../modules/container-apps-env.bicep' = {
  name: 'containerAppsEnv'
  params: {
    namePrefix: namePrefix
    location: location
    tags: tags
    logAnalyticsName: 'log-${namePrefix}'
  }
}

output environmentId string = env.outputs.environmentId
output defaultDomain string = env.outputs.defaultDomain
