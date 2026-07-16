// Per-service deployment: Azure AI Search (OPTIONAL — for RAG scenarios).
//
// Group-scoped — deploys into an EXISTING resource group (never creates one).
//   az deployment group create -g rg-nimbus \
//     --template-file infra/bicep/deploy/search.bicep
//
// Dependency order: requires `identity`. Skip entirely if search is not needed;
// nothing else depends on it (the api app takes searchEndpoint as an optional
// parameter).
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

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: 'id-${namePrefix}'
}

module search '../modules/search.bicep' = {
  name: 'searchModule'
  params: {
    namePrefix: namePrefix
    location: location
    tags: tags
    appPrincipalId: identity.properties.principalId
  }
}

output searchName string = search.outputs.searchName
output searchEndpoint string = search.outputs.searchEndpoint
