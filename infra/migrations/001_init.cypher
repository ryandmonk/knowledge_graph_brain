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

// NOTE: Neo4j doesn't support global node constraints without labels.
// Provenance enforcement is handled by the application layer.
// Each specific node type will have its provenance constraints created
// dynamically when KBs are registered.

// Example of provenance constraints (created dynamically per KB):
// CREATE CONSTRAINT document_provenance_kb IF NOT EXISTS 
// FOR (n:Document) REQUIRE n.kb_id IS NOT NULL;
// CREATE CONSTRAINT document_provenance_source IF NOT EXISTS 
// FOR (n:Document) REQUIRE n.source_id IS NOT NULL;

// Relationship provenance constraints - Neo4j 5.0+ syntax with specific rel types
// Note: Relationship constraints without types aren't supported in all Neo4j versions
// These will be created dynamically when needed per relationship type

// --------------------------------------------------
// 3. PERFORMANCE INDEXES - Optimize common queries
// --------------------------------------------------

// Neo4j doesn't support global node indexes without labels.
// Performance indexes are created dynamically per node type when KBs are registered.
// Common patterns include:
// - KB-scoped queries: CREATE INDEX FOR (n:Document) ON (n.kb_id)
// - Time-based queries: CREATE INDEX FOR (n:Document) ON (n.updated_at)
// - Source tracking: CREATE INDEX FOR (n:Document) ON (n.source_id)

// Relationship indexes - also not supported without relationship types in all Neo4j versions
// These will be created dynamically per relationship type when needed

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
