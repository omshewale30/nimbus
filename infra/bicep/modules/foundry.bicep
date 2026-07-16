// Azure AI Foundry (Azure AI Services/OpenAI account). Grants the app's managed
// identity the "Cognitive Services User" role for keyless model access.
@description('Prefix used for resource names.')
param namePrefix string
param location string = resourceGroup().location
param tags object = {}

@description('Principal id of the managed identity that calls Foundry.')
param appPrincipalId string

@description('Foundry account kind.')
@allowed([
  'AIServices'
  'OpenAI'
])
param accountKind string = 'AIServices'

@description('Foundry SKU name.')
param skuName string = 'S0'

@description('Optional custom subdomain (defaults to the generated account name).')
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

@description('Embedding model name (OpenAI format).')
param embeddingModelName string = 'text-embedding-3-small'

@description('Embedding model version.')
param embeddingModelVersion string = '1'

@description('Embedding deployment capacity (thousands of tokens per minute).')
param embeddingCapacity int = 30

// The account name doubles as the default custom subdomain, which is GLOBALLY
// unique across Azure; if taken, change namePrefix or pass customSubdomainName.
var foundryName = take('ai-${namePrefix}', 64)
var resolvedSubdomain = empty(customSubdomainName) ? foundryName : customSubdomainName

// Built-in role: Cognitive Services User
var cognitiveServicesUserRoleId = 'a97b65f3-24c7-4388-baec-2e87135dc908'

var commonProperties = {
  customSubDomainName: resolvedSubdomain
  disableLocalAuth: disableLocalAuth
  publicNetworkAccess: publicNetworkAccess
}

// allowProjectManagement applies to AIServices accounts used by Azure AI Foundry.
var foundryProperties = accountKind == 'AIServices'
  ? union(commonProperties, { allowProjectManagement: allowProjectManagement })
  : commonProperties

resource foundry 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: foundryName
  location: location
  tags: tags
  kind: accountKind
  sku: {
    name: skuName
  }
  properties: foundryProperties
}

// Embedding model for RAG (pgvector). Chat deployments are managed in the
// Foundry portal today; this one is in IaC because the API depends on it.
resource embeddingDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = if (!empty(embeddingDeploymentName)) {
  parent: foundry
  name: embeddingDeploymentName
  sku: {
    name: 'Standard'
    capacity: embeddingCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: embeddingModelName
      version: embeddingModelVersion
    }
  }
}

resource cognitiveServicesUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(foundry.id, appPrincipalId, cognitiveServicesUserRoleId)
  scope: foundry
  properties: {
    principalId: appPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesUserRoleId)
  }
}

output foundryName string = foundry.name
output foundryId string = foundry.id
output foundryKind string = foundry.kind
output foundryEndpoint string = foundry.properties.endpoint
output embeddingDeploymentName string = embeddingDeploymentName
