// Per-service deployment: Log Analytics workspace + Application Insights.
//
// Group-scoped — deploys into an EXISTING resource group (never creates one).
//   az deployment group create -g rg-nimbus \
//     --template-file infra/bicep/deploy/observability.bicep
//
// Dependency order: none — independent of other services.
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

module observability '../modules/observability.bicep' = {
  name: 'observabilityModule'
  params: {
    namePrefix: namePrefix
    location: location
    tags: tags
  }
}

output logAnalyticsId string = observability.outputs.logAnalyticsId
output logAnalyticsName string = observability.outputs.logAnalyticsName
output logAnalyticsCustomerId string = observability.outputs.logAnalyticsCustomerId
output appInsightsConnectionString string = observability.outputs.appInsightsConnectionString
