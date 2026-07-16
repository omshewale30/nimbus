// Per-service deployment: Azure Container Registry (+ AcrPull for the app identity).
//
// Group-scoped — deploys into an EXISTING resource group (never creates one).
//   az deployment group create -g rg-nimbus \
//     --template-file infra/bicep/deploy/registry.bicep
//
// Dependency order: requires `identity` (looked up by its deterministic name
// `id-<prefix>-<env>` in this resource group).
targetScope = 'resourceGroup'

@description('Prefix for resource names.')
param resourcePrefix string = 'nimbus'

@allowed(['dev', 'prod'])
param environmentName string = 'dev'

@description('Azure region. Defaults to the resource group location.')
param location string = resourceGroup().location

@description('Optional explicit ACR name (globally unique). Empty = acr<prefix><env>.')
param acrName string = ''

var namePrefix = '${resourcePrefix}-${environmentName}'
var tags = {
  application: 'nimbus'
  environment: environmentName
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: 'id-${namePrefix}'
}

module registry '../modules/registry.bicep' = {
  name: 'registryModule'
  params: {
    namePrefix: namePrefix
    location: location
    tags: tags
    appPrincipalId: identity.properties.principalId
    registryName: acrName
  }
}

output registryName string = registry.outputs.registryName
output loginServer string = registry.outputs.loginServer
