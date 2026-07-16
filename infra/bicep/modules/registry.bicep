// Azure Container Registry. Grants the app's managed identity the "AcrPull"
// role so Container Apps can pull images without admin credentials.
@description('Prefix used for resource names.')
param namePrefix string
param location string = resourceGroup().location
param tags object = {}

@description('Principal id of the managed identity that pulls images.')
param appPrincipalId string

@description('Optional explicit registry name. Registry names are GLOBALLY unique across Azure; override when the default acr<prefix><env> is taken.')
param registryName string = ''

var resolvedRegistryName = empty(registryName) ? take('acr${replace(namePrefix, '-', '')}', 50) : registryName

// Built-in role: AcrPull
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'

resource registry 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: resolvedRegistryName
  location: location
  tags: tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
  }
}

resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, appPrincipalId, acrPullRoleId)
  scope: registry
  properties: {
    principalId: appPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
  }
}

output registryName string = registry.name
output loginServer string = registry.properties.loginServer
