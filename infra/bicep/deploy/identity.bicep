// Per-service deployment: user-assigned managed identity.
//
// Group-scoped — deploys into an EXISTING resource group (never creates one).
//   az deployment group create -g rg-nimbus \
//     --template-file infra/bicep/deploy/identity.bicep
//
// Dependency order: none — deploy this first; everything else grants roles
// to this identity.
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

module identity '../modules/identity.bicep' = {
  name: 'identityModule'
  params: {
    namePrefix: namePrefix
    location: location
    tags: tags
  }
}

output identityId string = identity.outputs.id
output principalId string = identity.outputs.principalId
output clientId string = identity.outputs.clientId
