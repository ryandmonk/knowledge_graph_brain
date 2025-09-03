// Create corrected authentication migration
// Constraints for API keys
CREATE CONSTRAINT api_key_id_unique IF NOT EXISTS FOR (k:ApiKey) REQUIRE k.key_id IS UNIQUE;
CREATE CONSTRAINT api_key_hash_unique IF NOT EXISTS FOR (k:ApiKey) REQUIRE k.key_hash IS UNIQUE;

// Constraints for roles and permissions  
CREATE CONSTRAINT role_name_unique IF NOT EXISTS FOR (r:Role) REQUIRE r.name IS UNIQUE;
CREATE CONSTRAINT permission_unique IF NOT EXISTS FOR (p:Permission) REQUIRE (p.resource, p.action) IS UNIQUE;

// Performance indexes
CREATE INDEX api_key_active IF NOT EXISTS FOR (k:ApiKey) ON (k.is_active);
CREATE INDEX api_key_expires IF NOT EXISTS FOR (k:ApiKey) ON (k.expires_at);
CREATE INDEX auth_event_type IF NOT EXISTS FOR (e:AuthEvent) ON (e.event_type);
CREATE INDEX auth_event_timestamp IF NOT EXISTS FOR (e:AuthEvent) ON (e.timestamp);

// Default roles
MERGE (admin:Role {name: 'admin'})
ON CREATE SET admin.description = 'Full system administration access';

MERGE (operator:Role {name: 'operator'}) 
ON CREATE SET operator.description = 'Operations access - read/write to knowledge bases';

MERGE (viewer:Role {name: 'viewer'})
ON CREATE SET viewer.description = 'Read-only access to knowledge bases';

// Default permissions
MERGE (p1:Permission {resource: 'kb', action: 'read'});
MERGE (p2:Permission {resource: 'kb', action: 'write'});  
MERGE (p3:Permission {resource: 'kb', action: 'delete'});
MERGE (p4:Permission {resource: 'api', action: 'manage'});
MERGE (p5:Permission {resource: 'auth', action: 'admin'});

// Admin role permissions - full access
MATCH (admin:Role {name: 'admin'})
MATCH (p:Permission)
MERGE (admin)-[:HAS_PERMISSION]->(p);

// Operator role permissions - KB read/write
MATCH (operator:Role {name: 'operator'})
MATCH (p:Permission) WHERE p.resource = 'kb' AND p.action IN ['read', 'write']
MERGE (operator)-[:HAS_PERMISSION]->(p);

// Viewer role permissions - KB read only
MATCH (viewer:Role {name: 'viewer'})
MATCH (p:Permission) WHERE p.resource = 'kb' AND p.action = 'read'
MERGE (viewer)-[:HAS_PERMISSION]->(p);
