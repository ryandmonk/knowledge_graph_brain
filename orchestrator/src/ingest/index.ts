import neo4j, { Driver, Session } from 'neo4j-driver';
import { MigrationRunner } from '../migrations/runner';

// Define interfaces for our graph entities
interface Node {
  label: string;
  key: string;
  properties: { [key: string]: any };
}

interface Relationship {
  type: string;
  from: {
    label: string;
    key: string;
  };
  to: {
    label: string;
    key: string;
  };
  properties: { [key: string]: any };
}

// Neo4j connection configuration
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';
const NEO4J_DATABASE = process.env.NEO4J_DATABASE || 'neo4j';

// Initialize Neo4j driver
let driver: Driver;
let migrationRunner: MigrationRunner;

export function initDriver(): void {
  driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  migrationRunner = new MigrationRunner(driver);
  
  // Initialize database with migrations on startup
  migrationRunner.initializeDatabase().catch(error => {
    console.error('❌ Failed to initialize database:', error);
  });
}

export function getDriver(): Driver {
  if (!driver) {
    throw new Error('Neo4j driver not initialized. Call initDriver() first.');
  }
  return driver;
}

// Function to create constraints and vector indexes for a KB
export async function setupKB(kb_id: string, schema?: any): Promise<void> {
  if (!migrationRunner) {
    throw new Error('Migration runner not initialized. Call initDriver() first.');
  }
  
  console.log(`🔧 Setting up KB: ${kb_id}`);
  
  try {
    // Create KB-specific constraints if schema is provided
    if (schema) {
      await migrationRunner.createKBConstraints(kb_id, schema);
      await migrationRunner.createKBVectorIndexes(kb_id, schema);
    }
    
    // Register KB metadata with proper provenance
    const session = getDriver().session({ database: NEO4J_DATABASE });
    
    try {
      await session.run(`
        MERGE (kb:KnowledgeBase {kb_id: $kb_id})
        ON CREATE SET kb.created_at = timestamp(),
                      kb.source_id = 'system',
                      kb.run_id = 'kb-setup-' + $kb_id
        SET kb.updated_at = timestamp(),
            kb.schema_version = COALESCE(kb.schema_version, 0) + 1
        RETURN kb
      `, { kb_id });
      
      console.log(`✅ KB ${kb_id} setup complete`);
      
    } finally {
      await session.close();
    }
    
  } catch (error) {
    console.error('Failed to setup KB:', kb_id, error);
    throw error;
  }
}

// Function to merge nodes and relationships into Neo4j
export async function mergeNodesAndRels(
  kb_id: string,
  source_id: string,
  run_id: string,
  nodes: Node[],
  relationships: Relationship[]
): Promise<{ createdNodes: number; createdRels: number }> {
  const session = getDriver().session({ database: NEO4J_DATABASE });
  
  try {
    let createdNodes = 0;
    let createdRels = 0;
    
    // Merge nodes
    for (const node of nodes) {
      const result = await session.run(`
        MERGE (n:\`${node.label}\` {kb_id: $kb_id, key: $key})
        SET n += $properties,
            n.source_id = $source_id,
            n.run_id = $run_id,
            n.updated_at = timestamp()
        RETURN n
      `, {
        kb_id,
        key: node.key,
        properties: node.properties,
        source_id,
        run_id
      });
      
      createdNodes += result.summary.counters.updates().nodesCreated;
    }
    
    // Merge relationships
    for (const rel of relationships) {
      const result = await session.run(`
        MATCH (from:\`${rel.from.label}\` {kb_id: $kb_id, key: $fromKey})
        MATCH (to:\`${rel.to.label}\` {kb_id: $kb_id, key: $toKey})
        MERGE (from)-[r:\`${rel.type}\`]->(to)
        SET r += $properties,
            r.source_id = $source_id,
            r.run_id = $run_id,
            r.updated_at = timestamp()
        RETURN r
      `, {
        kb_id,
        fromKey: rel.from.key,
        toKey: rel.to.key,
        properties: rel.properties,
        source_id,
        run_id
      });
      
      createdRels += result.summary.counters.updates().relationshipsCreated;
    }
    
    return { createdNodes, createdRels };
  } finally {
    await session.close();
  }
}

// Function to execute Cypher queries
export async function executeCypher(cypher: string, params: Record<string, any> = {}): Promise<any[]> {
  const session = getDriver().session({ database: NEO4J_DATABASE });
  
  try {
    const result = await session.run(cypher, params);
    return result.records.map(record => record.toObject());
  } finally {
    await session.close();
  }
}

// Function to perform semantic search
export async function semanticSearch(
  kb_id: string,
  queryVector: number[],
  top_k: number,
  filters: { labels?: string[]; props?: { [key: string]: any } } = {}
): Promise<any[]> {
  const session = getDriver().session({ database: NEO4J_DATABASE });
  
  try {
    let cypher = `
      CALL db.index.vector.queryNodes($indexName, $top_k, $queryVector)
      YIELD node, score
    `;
    
    // Add label filters if specified
    if (filters.labels && filters.labels.length > 0) {
      const labelConditions = filters.labels.map((label, i) => `node:\`${label}\``).join(' OR ');
      cypher += `WHERE (${labelConditions})
`;
    }
    
    // Add property filters if specified
    if (filters.props) {
      const propConditions = Object.entries(filters.props)
        .map(([key, value]) => `node.${key} = $prop_${key}`)
        .join(' AND ');
      
      if (propConditions) {
        cypher += `AND ${propConditions}
`;
        // Add property values to params
        Object.entries(filters.props).forEach(([key, value]) => {
          params[`prop_${key}`] = value;
        });
      }
    }
    
    cypher += 'RETURN node, score';
    
    const params: any = {
      indexName: `${kb_id}_vector_index`,
      top_k,
      queryVector
    };
    
    const result = await session.run(cypher, params);
    return result.records.map(record => ({
      node: record.get('node').properties,
      score: record.get('score')
    }));
  } finally {
    await session.close();
  }
}