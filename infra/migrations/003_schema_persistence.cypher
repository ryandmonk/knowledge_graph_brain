// Neo4j Migration 003: Schema and Source Persistence
// Stores SchemaDefinition and SourceDefinition nodes so schemas survive restarts.

// --------------------------------------------------
// 1. SCHEMA DEFINITION CONSTRAINTS
// --------------------------------------------------

// One schema per knowledge base
CREATE CONSTRAINT schema_def_kb_id IF NOT EXISTS
FOR (s:SchemaDefinition) REQUIRE s.kb_id IS UNIQUE;

// --------------------------------------------------
// 2. SOURCE DEFINITION CONSTRAINTS
// --------------------------------------------------

// One source per kb_id + source_id combination
CREATE CONSTRAINT source_def_key IF NOT EXISTS
FOR (s:SourceDefinition) REQUIRE (s.kb_id, s.source_id) IS UNIQUE;

// --------------------------------------------------
// 3. PERFORMANCE INDEXES
// --------------------------------------------------

CREATE INDEX schema_def_updated IF NOT EXISTS
FOR (s:SchemaDefinition) ON (s.updated_at);

CREATE INDEX source_def_kb IF NOT EXISTS
FOR (s:SourceDefinition) ON (s.kb_id);

// --------------------------------------------------
// MIGRATION COMPLETE
// --------------------------------------------------

CREATE (m:Migration {
  version: '003',
  name: 'Schema and source persistence',
  applied_at: timestamp(),
  description: 'Add SchemaDefinition and SourceDefinition nodes for persistent schema storage across restarts'
}) RETURN m;
