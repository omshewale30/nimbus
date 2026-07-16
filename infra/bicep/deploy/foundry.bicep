// Per-service deployment: Azure AI Foundry resource (Azure AI Services/OpenAI).
//
// Group-scoped — deploys into an EXISTING resource group (never creates one).
//   az deployment group create -g rg-nimbus \
//     --template-file infra/bicep/deploy/foundry.bicep
//
// Dependency order: requires `identity` so this template can grant
// "Cognitive Services User" to the app managed identity.
targetScope = 'resourceGroup'

@description('Prefix for resource names.')
param resourcePrefix string = 'nimbus'

@allowed(['dev', 'prod'])
param environmentName string = 'dev'

@description('Azure region. Defaults to the resource group location.')
param location string = resourceGroup().location

@description('Foundry account kind.')
@allowed([
  'AIServices'
  'OpenAI'
])
param accountKind string = 'AIServices'

@description('Foundry SKU name.')
param skuName string = 'S0'

@description('Optional custom subdomain. Leave empty to auto-generate.')
param customSubdomainName string = ''

@description('Disable key auth and allow only Entra ID token auth.')
param disableLocalAuth bool = true

@description('Public network access setting for the Foundry account.')
@allowed([
  'Enabled'
  'Disabled'
])
param publicNetworkAccess string = 'Enabled'

@description('Allow project management for Azure AI Foundry projects.')
param allowProjectManagement bool = true

@description('Embedding model deployment name. Empty string skips the deployment.')
param embeddingDeploymentName string = 'text-embedding-3-small'

@description('Embedding deployment capacity (thousands of tokens per minute).')
param embeddingCapacity int = 30

var namePrefix = '${resourcePrefix}-${environmentName}'
var tags = {
  application: 'nimbus'
  environment: environmentName
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: 'id-${namePrefix}'
}

module foundry '../modules/foundry.bicep' = {
  name: 'foundryModule'
  params: {
    namePrefix: namePrefix
    location: location
    tags: tags
    appPrincipalId: identity.properties.principalId
    accountKind: accountKind
    skuName: skuName
    customSubdomainName: customSubdomainName
    disableLocalAuth: disableLocalAuth
    publicNetworkAccess: publicNetworkAccess
    allowProjectManagement: allowProjectManagement
    embeddingDeploymentName: embeddingDeploymentName
    embeddingCapacity: embeddingCapacity
  }
}

output foundryName string = foundry.outputs.foundryName
output foundryId string = foundry.outputs.foundryId
output foundryKind string = foundry.outputs.foundryKind
output foundryEndpoint string = foundry.outputs.foundryEndpoint
output embeddingDeploymentName string = foundry.outputs.embeddingDeploymentName
