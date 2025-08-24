// Neo4j Migration 001: Initial constraints and indexes for Knowledge Graph Brain
// Run this with: cypher-shell -u neo4j -p password < 001_init.cypher

// ==================================================
// KNOWLEDGE GRAPH BRAIN - INITIAL SCHEMA SETUP
// ==================================================
// This migration creates the foundational constraints and indexes
// required for multi-tenant knowledge graph operations with provenance.

// --------------------------------------------------
// 1. CORE CONSTRAINTS - Ensure data integrity
// --------------------------------------------------

// Create unique constraints for common node patterns
// These will be extended dynamically per KB

// Documents - most common entity type
CREATE CONSTRAINT document_kb_key IF NOT EXISTS 
FOR (n:Document) REQUIRE (n.kb_id, n.page_id) IS UNIQUE;

// People - for identity resolution
CREATE CONSTRAINT person_kb_email IF NOT EXISTS 
FOR (n:Person) REQUIRE (n.kb_id, n.email) IS UNIQUE;

// Products - for retail/commerce KBs
CREATE CONSTRAINT product_kb_sku IF NOT EXISTS 
FOR (n:Product) REQUIRE (n.kb_id, n.sku) IS UNIQUE;

// Orders - for transactional data
CREATE CONSTRAINT order_kb_id IF NOT EXISTS 
FOR (n:Order) REQUIRE (n.kb_id, n.order_id) IS UNIQUE;

// Topics/Categories - for classification
CREATE CONSTRAINT topic_kb_name IF NOT EXISTS 
FOR (n:Topic) REQUIRE (n.kb_id, n.name) IS UNIQUE;

// --------------------------------------------------
// 2. PROVENANCE CONSTRAINTS - Enforce traceability
// --------------------------------------------------

// Every node MUST have provenance information
CREATE CONSTRAINT node_provenance_kb IF NOT EXISTS 
FOR (n) REQUIRE n.kb_id IS NOT NULL;

CREATE CONSTRAINT node_provenance_source IF NOT EXISTS 
FOR (n) REQUIRE n.source_id IS NOT NULL;

CREATE CONSTRAINT node_provenance_run IF NOT EXISTS 
FOR (n) REQUIRE n.run_id IS NOT NULL;

CREATE CONSTRAINT node_provenance_timestamp IF NOT EXISTS 
FOR (n) REQUIRE n.updated_at IS NOT NULL;

// Relationships also need provenance
CREATE CONSTRAINT rel_provenance_kb IF NOT EXISTS 
FOR ()-[r]-() REQUIRE r.kb_id IS NOT NULL;

CREATE CONSTRAINT rel_provenance_source IF NOT EXISTS 
FOR ()-[r]-() REQUIRE r.source_id IS NOT NULL;

CREATE CONSTRAINT rel_provenance_run IF NOT EXISTS 
FOR ()-[r]-() REQUIRE r.run_id IS NOT NULL;

// --------------------------------------------------
// 3. PERFORMANCE INDEXES - Optimize common queries
// --------------------------------------------------

// KB-scoped queries (most common access pattern)
CREATE INDEX kb_id_index IF NOT EXISTS FOR (n) ON (n.kb_id);

// Source tracking
CREATE INDEX source_id_index IF NOT EXISTS FOR (n) ON (n.source_id);

// Time-based queries for sync and monitoring
CREATE INDEX updated_at_index IF NOT EXISTS FOR (n) ON (n.updated_at);
CREATE INDEX created_at_index IF NOT EXISTS FOR (n) ON (n.created_at);

// Relationship provenance indexes
CREATE INDEX rel_kb_index IF NOT EXISTS FOR ()-[r]-() ON (r.kb_id);
CREATE INDEX rel_source_index IF NOT EXISTS FOR ()-[r]-() ON (r.source_id);
CREATE INDEX rel_run_index IF NOT EXISTS FOR ()-[r]-() ON (r.run_id);

// --------------------------------------------------
// 4. VECTOR INDEXES - Support semantic search
// --------------------------------------------------

// Vector index for document embeddings (most common)
// Dimension 1024 is common for many embedding models (mxbai-embed-large, etc.)
CREATE VECTOR INDEX document_embeddings IF NOT EXISTS
FOR (n:Document) ON (n.embedding) 
OPTIONS {indexConfig: {
  `vector.dimensions`: 1024,
  `vector.similarity_function`: 'cosine'
}};

// Vector index for person embeddings (for expertise matching)
CREATE VECTOR INDEX person_embeddings IF NOT EXISTS
FOR (n:Person) ON (n.embedding) 
OPTIONS {indexConfig: {
  `vector.dimensions`: 1024,
  `vector.similarity_function`: 'cosine'
}};

// Vector index for topic embeddings (for topic similarity)
CREATE VECTOR INDEX topic_embeddings IF NOT EXISTS
FOR (n:Topic) ON (n.embedding) 
OPTIONS {indexConfig: {
  `vector.dimensions`: 1024,
  `vector.similarity_function`: 'cosine'
}};

// General-purpose vector index for any node type
CREATE VECTOR INDEX node_embeddings IF NOT EXISTS
FOR (n) ON (n.embedding) 
OPTIONS {indexConfig: {
  `vector.dimensions`: 1024,
  `vector.similarity_function`: 'cosine'
}};

// --------------------------------------------------
// 5. DERIVED_FROM PATTERN - Provenance chain
// --------------------------------------------------

// Create the provenance relationship type for audit trails
// This tracks how entities are derived from source artifacts

// Example usage after this migration:
// MERGE (doc:Document {kb_id: $kb_id, page_id: $page_id})
// MERGE (artifact:SourceArtifact {kb_id: $kb_id, external_id: $external_id, source_id: $source_id})
// CREATE (doc)-[:DERIVED_FROM {run_id: $run_id, ts: timestamp(), extraction_method: 'confluence_api'}]->(artifact)

// --------------------------------------------------
// 6. KNOWLEDGE BASE METADATA - Track KB configurations
// --------------------------------------------------

// Create a meta-node to track KB configurations
CREATE CONSTRAINT kb_meta_id IF NOT EXISTS 
FOR (n:KnowledgeBase) REQUIRE n.kb_id IS UNIQUE;

// Index for KB metadata queries
CREATE INDEX kb_meta_created IF NOT EXISTS FOR (n:KnowledgeBase) ON (n.created_at);
CREATE INDEX kb_meta_updated IF NOT EXISTS FOR (n:KnowledgeBase) ON (n.updated_at);

// --------------------------------------------------
// MIGRATION COMPLETE
// --------------------------------------------------

// Log migration completion
CREATE (m:Migration {
  version: '001',
  name: 'Initial constraints and indexes',
  applied_at: timestamp(),
  description: 'Core constraints, provenance enforcement, performance indexes, and vector indexes for Knowledge Graph Brain'
}) RETURN m;

// Verify the migration worked
SHOW CONSTRAINTS;
SHOW INDEXES;

// Expected output should include:
// - Unique constraints for common entity types
// - Provenance constraints ensuring traceability
// - Performance indexes for common query patterns
// - Vector indexes for semantic search
// - KB metadata tracking capabilities
