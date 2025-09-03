// Neo4j Migration 002: Authentication and Authorization Schema
// Run this with: cypher-shell -u neo4j -p password < 002_auth.cypher

// ==================================================
// AUTHENTICATION & AUTHORIZATION SCHEMA
// ==================================================
// This migration adds API key management and KB-scoped permissions
// for single-tenant deployments with enterprise security features.

// --------------------------------------------------
// 1. API KEY CONSTRAINTS - Ensure key uniqueness
// --------------------------------------------------

// API Keys - enterprise authentication
CREATE CONSTRAINT api_key_unique IF NOT EXISTS 
FOR (n:ApiKey) REQUIRE n.key_id IS UNIQUE;

// API Key hash for secure lookup
CREATE CONSTRAINT api_key_hash_unique IF NOT EXISTS 
FOR (n:ApiKey) REQUIRE n.key_hash IS UNIQUE;

// --------------------------------------------------
// 2. AUTHORIZATION CONSTRAINTS - Role and permission integrity
// --------------------------------------------------

// Roles - Admin, Operator, Viewer
CREATE CONSTRAINT role_name_unique IF NOT EXISTS 
FOR (n:Role) REQUIRE n.name IS UNIQUE;

// Permissions - per-resource actions
CREATE CONSTRAINT permission_unique IF NOT EXISTS 
FOR (n:Permission) REQUIRE (n.resource, n.action) IS UNIQUE;

// --------------------------------------------------
// 3. PERFORMANCE INDEXES - Optimize auth queries
// --------------------------------------------------

// API key lookup performance (most frequent auth operation)
CREATE INDEX api_key_lookup IF NOT EXISTS
FOR (n:ApiKey) ON (n.key_hash);

// Active key filtering
CREATE INDEX api_key_active IF NOT EXISTS
FOR (n:ApiKey) ON (n.is_active);

// Expiration checks
CREATE INDEX api_key_expires IF NOT EXISTS
FOR (n:ApiKey) ON (n.expires_at);

// Role-based queries
CREATE INDEX role_lookup IF NOT EXISTS
FOR (n:Role) ON (n.name);

// KB-scoped permission queries  
CREATE INDEX permission_resource IF NOT EXISTS
FOR (n:Permission) ON (n.resource);

// --------------------------------------------------
// 4. SEED DATA - Initialize default roles and permissions
// --------------------------------------------------

// Create default roles
MERGE (admin:Role {name: 'admin', description: 'Full system access'})
MERGE (operator:Role {name: 'operator', description: 'Read/write access to assigned KBs'})  
MERGE (viewer:Role {name: 'viewer', description: 'Read-only access to assigned KBs'});

// Create base permissions
MERGE (p1:Permission {resource: 'kb:*', action: 'read', description: 'Read any knowledge base'})
MERGE (p2:Permission {resource: 'kb:*', action: 'write', description: 'Write to any knowledge base'})
MERGE (p3:Permission {resource: 'kb:*', action: 'admin', description: 'Admin any knowledge base'})
MERGE (p4:Permission {resource: 'api:status', action: 'read', description: 'Read system status'})
MERGE (p5:Permission {resource: 'api:health', action: 'read', description: 'Read system health'})
MERGE (p6:Permission {resource: 'api:search', action: 'read', description: 'Search knowledge bases'})
MERGE (p7:Permission {resource: 'api:ingest', action: 'write', description: 'Ingest data into KBs'});

// Assign permissions to roles
MATCH (admin:Role {name: 'admin'}), (p:Permission)
MERGE (admin)-[:HAS_PERMISSION]->(p);

MATCH (operator:Role {name: 'operator'})
MATCH (p:Permission) WHERE p.action IN ['read', 'write'] OR p.resource LIKE 'api:%'
MERGE (operator)-[:HAS_PERMISSION]->(p);

MATCH (viewer:Role {name: 'viewer'})  
MATCH (p:Permission) WHERE p.action = 'read' OR p.resource IN ['api:status', 'api:health', 'api:search']
MERGE (viewer)-[:HAS_PERMISSION]->(p);

// --------------------------------------------------
// 5. AUTH AUDIT SCHEMA - Security monitoring
// --------------------------------------------------

// Auth events for security monitoring
CREATE CONSTRAINT auth_event_id IF NOT EXISTS 
FOR (n:AuthEvent) REQUIRE n.event_id IS UNIQUE;

// Performance index for audit queries
CREATE INDEX auth_event_timestamp IF NOT EXISTS
FOR (n:AuthEvent) ON (n.timestamp);

CREATE INDEX auth_event_type IF NOT EXISTS
FOR (n:AuthEvent) ON (n.event_type);

CREATE INDEX auth_event_success IF NOT EXISTS
FOR (n:AuthEvent) ON (n.success);

// --------------------------------------------------
// 6. RELATIONSHIP CONSTRAINTS - Data integrity
// --------------------------------------------------

// API Key to Role relationships
// Note: These will be created dynamically when API keys are created
// as Neo4j doesn't support global relationship constraints without types

SHOW CONSTRAINTS;
SHOW INDEXES;
