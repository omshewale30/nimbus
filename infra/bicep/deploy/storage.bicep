// Per-service deployment: Storage account + uploads container (+ Blob Data
// Contributor for the app identity).
//
// Group-scoped — deploys into an EXISTING resource group (never creates one).
//   az deployment group create -g rg-nimbus \
//     --template-file infra/bicep/deploy/storage.bicep
//
// Dependency order: requires `identity`.
targetScope = 'resourceGroup'

@description('Prefix for resource names.')
param resourcePrefix string = 'nimbus'

@allowed(['dev', 'prod'])
param environmentName string = 'dev'

@description('Azure region. Defaults to the resource group location.')
param location string = resourceGroup().location

@description('Blob container name for uploads.')
param containerName string = 'uploads'

var namePrefix = '${resourcePrefix}-${environmentName}'
var tags = {
  application: 'nimbus'
  environment: environmentName
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: 'id-${namePrefix}'
}

module storage '../modules/storage.bicep' = {
  name: 'storageModule'
  params: {
    namePrefix: namePrefix
    location: location
    tags: tags
    appPrincipalId: identity.properties.principalId
    containerName: containerName
  }
}

output storageAccountName string = storage.outputs.storageAccountName
output blobEndpoint string = storage.outputs.blobEndpoint
output containerName string = storage.outputs.containerName
