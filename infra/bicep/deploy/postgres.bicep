// Per-service deployment: Azure Database for PostgreSQL — Flexible Server.
//
// Group-scoped — deploys into an EXISTING resource group (never creates one).
//   az deployment group create -g rg-nimbus \
//     --template-file infra/bicep/deploy/postgres.bicep \
//     --parameters dbAdminPassword=$SQL_ADMIN_PASSWORD
//
// Dependency order: none — independent of other services. Deploy BEFORE
// key-vault (which seeds the database-url secret from this server).
targetScope = 'resourceGroup'

@description('Prefix for resource names.')
param resourcePrefix string = 'nimbus'

@allowed(['dev', 'prod'])
param environmentName string = 'dev'

@description('Azure region. Defaults to the resource group location.')
param location string = resourceGroup().location

@description('PostgreSQL administrator login name.')
param dbAdminLogin string = '${resourcePrefix}admin'

@description('PostgreSQL administrator password. Keep it URL-safe (alphanumeric): it is interpolated into the SQLAlchemy DATABASE_URL.')
@secure()
param dbAdminPassword string

@description('Application database name.')
param databaseName string = 'appdb'

var namePrefix = '${resourcePrefix}-${environmentName}'
var tags = {
  application: 'nimbus'
  environment: environmentName
}

module db '../modules/postgres.bicep' = {
  name: 'postgresModule'
  params: {
    namePrefix: namePrefix
    location: location
    tags: tags
    adminLogin: dbAdminLogin
    adminPassword: dbAdminPassword
    databaseName: databaseName
  }
}

output serverName string = db.outputs.serverName
output serverFqdn string = db.outputs.serverFqdn
output databaseName string = db.outputs.databaseName
