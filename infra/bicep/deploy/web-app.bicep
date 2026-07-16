// Per-service deployment: web (Next.js) container app.
//
// Group-scoped — deploys into an EXISTING resource group (never creates one).
//   az deployment group create -g rg-nimbus \
//     --template-file infra/bicep/deploy/web-app.bicep \
//     --parameters webImage=<acr>.azurecr.io/nimbus-web:<tag>
//
// Dependency order: requires `identity`, `registry`, and `container-apps-env`.
// The API app does not need to exist yet (the API base URL is precomputed from
// the environment default domain), but deploy it around the same time.
targetScope = 'resourceGroup'

@description('Prefix for resource names.')
param resourcePrefix string = 'nimbus'

@allowed(['dev', 'prod'])
param environmentName string = 'dev'

@description('Azure region. Defaults to the resource group location.')
param location string = resourceGroup().location

@description('Frontend container image, e.g. myacr.azurecr.io/web:sha.')
param webImage string

@description('Microsoft Entra tenant id.')
param tenantId string = '58b3d54f-16c9-42d3-af08-1fcabd095666'

@description('Entra frontend (SPA) app registration client id.')
param entraFrontendClientId string = '9025831a-9aee-4244-89c8-98d0814a5889'

@description('Entra backend app id URI (used to build the API scope).')
param entraBackendAppIdUri string = 'api://nimbus'

@description('Optional explicit ACR name (must match the registry deployment). Empty = acr<prefix><env>.')
param acrName string = ''

var namePrefix = '${resourcePrefix}-${environmentName}'
var tags = {
  application: 'nimbus'
  environment: environmentName
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: 'id-${namePrefix}'
}

resource registry 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' existing = {
  name: empty(acrName) ? take('acr${replace(namePrefix, '-', '')}', 50) : acrName
}

resource env 'Microsoft.App/managedEnvironments@2024-03-01' existing = {
  name: 'cae-${namePrefix}'
}

// Precompute FQDNs from the environment default domain to avoid a circular
// dependency between the frontend and backend apps.
var apiAppName = 'ca-${namePrefix}-api'
var webAppName = 'ca-${namePrefix}-web'
var apiBaseUrl = 'https://${apiAppName}.${env.properties.defaultDomain}'
var webOrigin = 'https://${webAppName}.${env.properties.defaultDomain}'

module webApp '../modules/container-app.bicep' = {
  name: 'webApp'
  params: {
    name: webAppName
    location: location
    tags: tags
    environmentId: env.id
    userAssignedIdentityId: identity.id
    registryServer: registry.properties.loginServer
    image: webImage
    targetPort: 3000
    external: true
    envVars: [
      // NOTE: NEXT_PUBLIC_* values are inlined at image BUILD time. Set these as
      // build args in CI; the runtime values below are a convenience/fallback.
      { name: 'NEXT_PUBLIC_API_BASE_URL', value: apiBaseUrl }
      { name: 'NEXT_PUBLIC_AUTH_DISABLED', value: 'false' }
      { name: 'NEXT_PUBLIC_ENTRA_CLIENT_ID', value: entraFrontendClientId }
      { name: 'NEXT_PUBLIC_ENTRA_TENANT_ID', value: tenantId }
      { name: 'NEXT_PUBLIC_ENTRA_REDIRECT_URI', value: webOrigin }
      { name: 'NEXT_PUBLIC_ENTRA_API_SCOPE', value: '${entraBackendAppIdUri}/access_as_user' }
    ]
  }
}

output webAppName string = webApp.outputs.name
output webFqdn string = webApp.outputs.fqdn
output webUrl string = webOrigin
