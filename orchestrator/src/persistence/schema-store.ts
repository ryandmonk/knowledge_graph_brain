import { getDriver } from '../ingest/index';
import type { Schema, SourceConfig } from '../capabilities/index';

const NEO4J_DATABASE = process.env.NEO4J_DATABASE || 'neo4j';

/**
 * Persist a schema to Neo4j as a :SchemaDefinition node.
 * Stores both raw YAML (for UI display) and JSON (for fast deserialization).
 */
export async function persistSchema(kb_id: string, schema: Schema, yamlContent: string): Promise<void> {
  const driver = getDriver();
  const session = driver.session({ database: NEO4J_DATABASE });

  try {
    await session.run(`
      MERGE (s:SchemaDefinition {kb_id: $kb_id})
      SET s.yaml_content = $yamlContent,
          s.schema_json = $schemaJson,
          s.embedding_provider = $embeddingProvider,
          s.nodes_count = $nodesCount,
          s.relationships_count = $relsCount,
          s.sources_count = $sourcesCount,
          s.updated_at = timestamp()
      WITH s
      MERGE (kb:KnowledgeBase {kb_id: $kb_id})
      MERGE (s)-[:DEFINES]->(kb)
    `, {
      kb_id,
      yamlContent,
      schemaJson: JSON.stringify(schema),
      embeddingProvider: schema.embedding.provider,
      nodesCount: schema.schema.nodes.length,
      relsCount: schema.schema.relationships.length,
      sourcesCount: schema.mappings.sources.length,
    });
  } finally {
    await session.close();
  }
}

/**
 * Persist a source configuration to Neo4j as a :SourceDefinition node.
 */
export async function persistSource(sourceKey: string, source: SourceConfig): Promise<void> {
  const driver = getDriver();
  const session = driver.session({ database: NEO4J_DATABASE });

  try {
    await session.run(`
      MERGE (s:SourceDefinition {kb_id: $kb_id, source_id: $source_id})
      SET s.connector_url = $connector_url,
          s.auth_ref = $auth_ref,
          s.mapping_name = $mapping_name,
          s.updated_at = timestamp()
      WITH s
      MERGE (kb:KnowledgeBase {kb_id: $kb_id})
      MERGE (s)-[:FEEDS]->(kb)
    `, {
      kb_id: source.kb_id,
      source_id: source.source_id,
      connector_url: source.connector_url,
      auth_ref: source.auth_ref,
      mapping_name: source.mapping_name,
    });
  } finally {
    await session.close();
  }
}

/**
 * Delete a persisted schema and all its source definitions from Neo4j.
 */
export async function deletePersistedSchema(kb_id: string): Promise<void> {
  const driver = getDriver();
  const session = driver.session({ database: NEO4J_DATABASE });

  try {
    await session.run(`
      MATCH (s:SourceDefinition {kb_id: $kb_id}) DETACH DELETE s
    `, { kb_id });

    await session.run(`
      MATCH (s:SchemaDefinition {kb_id: $kb_id}) DETACH DELETE s
    `, { kb_id });
  } finally {
    await session.close();
  }
}

/**
 * Load all persisted schemas and sources from Neo4j.
 * Called once during startup to hydrate the in-memory Maps.
 */
export async function loadAllSchemasAndSources(): Promise<{
  schemas: Map<string, Schema>;
  sources: Map<string, SourceConfig>;
}> {
  const driver = getDriver();
  const session = driver.session({ database: NEO4J_DATABASE });

  const schemas = new Map<string, Schema>();
  const sources = new Map<string, SourceConfig>();

  try {
    // Load schemas
    const schemaResult = await session.run(
      'MATCH (s:SchemaDefinition) RETURN s.kb_id AS kb_id, s.schema_json AS schema_json'
    );

    for (const record of schemaResult.records) {
      const kb_id = record.get('kb_id');
      const schemaJson = record.get('schema_json');

      if (kb_id && schemaJson) {
        try {
          const schema = JSON.parse(schemaJson) as Schema;
          schemas.set(kb_id, schema);
        } catch (err) {
          console.error(`Failed to deserialize schema for ${kb_id}:`, err);
        }
      }
    }

    // Load sources
    const sourceResult = await session.run(
      'MATCH (s:SourceDefinition) RETURN s.kb_id AS kb_id, s.source_id AS source_id, s.connector_url AS connector_url, s.auth_ref AS auth_ref, s.mapping_name AS mapping_name'
    );

    for (const record of sourceResult.records) {
      const kb_id = record.get('kb_id');
      const source_id = record.get('source_id');

      if (kb_id && source_id) {
        const sourceKey = `${kb_id}:${source_id}`;
        sources.set(sourceKey, {
          kb_id,
          source_id,
          connector_url: record.get('connector_url') || '',
          auth_ref: record.get('auth_ref') || '',
          mapping_name: record.get('mapping_name') || '',
        });
      }
    }

    return { schemas, sources };
  } finally {
    await session.close();
  }
}
