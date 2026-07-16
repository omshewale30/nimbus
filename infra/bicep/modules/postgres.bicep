// Azure Database for PostgreSQL — Flexible Server.
//
// Uses password authentication; the admin password comes from a pipeline
// secret and the app receives the full connection URL via Key Vault (see
// main.bicep). Keep the password URL-safe (alphanumeric) because it is
// interpolated into a SQLAlchemy URL without encoding.
@description('Prefix used for resource names.')
param namePrefix string
param location string = resourceGroup().location
param tags object = {}

@description('PostgreSQL administrator login name.')
param adminLogin string

@description('PostgreSQL administrator password (store in Key Vault / pipeline secret).')
@secure()
param adminPassword string

param databaseName string = 'appdb'

// Server names are GLOBALLY unique (they form the public FQDN); if taken, change namePrefix.
var serverName = 'pg-${namePrefix}'

resource server 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: serverName
  location: location
  tags: tags
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: adminLogin
    administratorLoginPassword: adminPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: server
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// Allowlist the pgvector extension so migrations can `CREATE EXTENSION vector`
// (Flexible Server rejects extensions not listed in azure.extensions).
resource extensionsAllowlist 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2024-08-01' = {
  parent: server
  name: 'azure.extensions'
  properties: {
    value: 'VECTOR'
    source: 'user-override'
  }
  dependsOn: [database]
}

// Allow other Azure services (e.g. Container Apps) to reach the server.
resource allowAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: server
  name: 'AllowAllAzureIps'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

output serverName string = server.name
output serverFqdn string = server.properties.fullyQualifiedDomainName
output databaseName string = database.name
