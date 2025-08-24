import { parse } from 'yaml';
import { JSONPath } from 'jsonpath-plus';

// Define interfaces for our DSL structure
interface NodeSchema {
  label: string;
  key: string;
  props: string[];
}

interface RelationshipSchema {
  type: string;
  from: string;
  to: string;
  props?: string[];
}

interface MappingSource {
  source_id: string;
  document_type: string;
  extract: {
    node: string;
    assign: { [key: string]: string };
  };
  edges: Array<{
    type: string;
    from: {
      node: string;
      key: string;
    };
    to: {
      node: string;
      key: string;
      props?: { [key: string]: string };
    };
  }>;
}

interface SchemaDSL {
  kb_id: string;
  embedding: {
    provider: string;
    chunking: {
      strategy: string;
      [key: string]: any;
    };
  };
  schema: {
    nodes: NodeSchema[];
    relationships: RelationshipSchema[];
  };
  mappings: {
    sources: MappingSource[];
  };
}

// Function to parse and validate the YAML schema
export function parseSchema(yamlString: string): SchemaDSL {
  try {
    const schema = parse(yamlString) as SchemaDSL;
    
    // Basic validation
    if (!schema.kb_id) {
      throw new Error('Schema must have a kb_id');
    }
    
    if (!schema.schema) {
      throw new Error('Schema must have a schema section');
    }
    
    if (!schema.schema.nodes || !Array.isArray(schema.schema.nodes)) {
      throw new Error('Schema nodes must be an array');
    }
    
    if (!schema.schema.relationships || !Array.isArray(schema.schema.relationships)) {
      throw new Error('Schema relationships must be an array');
    }
    
    if (!schema.mappings || !schema.mappings.sources || !Array.isArray(schema.mappings.sources)) {
      throw new Error('Schema mappings.sources must be an array');
    }
    
    // Validate each node
    for (const node of schema.schema.nodes) {
      if (!node.label || !node.key || !node.props) {
        throw new Error(`Invalid node schema: ${JSON.stringify(node)}`);
      }
    }
    
    // Validate each relationship
    for (const rel of schema.schema.relationships) {
      if (!rel.type || !rel.from || !rel.to) {
        throw new Error(`Invalid relationship schema: ${JSON.stringify(rel)}`);
      }
    }
    
    // Validate each mapping source
    for (const source of schema.mappings.sources) {
      if (!source.source_id || !source.document_type || !source.extract || !source.edges) {
        throw new Error(`Invalid mapping source: ${JSON.stringify(source)}`);
      }
      
      if (!source.extract.node || !source.extract.assign) {
        throw new Error(`Invalid extract in mapping source: ${JSON.stringify(source.extract)}`);
      }
      
      for (const edge of source.edges) {
        if (!edge.type || !edge.from || !edge.to) {
          throw new Error(`Invalid edge in mapping source: ${JSON.stringify(edge)}`);
        }
      }
    }
    
    return schema;
  } catch (error) {
    throw new Error(`Failed to parse schema: ${(error as Error).message}`);
  }
}

// Function to extract data using JSONPath
export function extractData(document: any, path: string): any {
  try {
    const result = JSONPath({ path, json: document });
    return result;
  } catch (error) {
    throw new Error(`Failed to extract data with path '${path}': ${(error as Error).message}`);
  }
}

// Function to apply mapping to a document
export function applyMapping(document: any, mapping: MappingSource): { nodes: any[]; relationships: any[] } {
  const nodes: any[] = [];
  const relationships: any[] = [];
  
  // Extract node
  const nodeLabel = mapping.extract.node;
  const nodeProps: any = {};
  
  for (const [prop, path] of Object.entries(mapping.extract.assign)) {
    const extracted = extractData(document, path);
    // For simplicity, we take the first value if multiple are returned
    nodeProps[prop] = Array.isArray(extracted) ? extracted[0] : extracted;
  }
  
  nodes.push({
    label: nodeLabel,
    properties: nodeProps
  });
  
  // Extract relationships
  for (const edge of mapping.edges) {
    const fromKey = extractData(document, edge.from.key);
    const toKeys = extractData(document, edge.to.key);
    
    // Handle both single values and arrays
    const toArray = Array.isArray(toKeys) ? toKeys : [toKeys];
    
    for (const toKey of toArray) {
      const relProps: any = {};
      
      if (edge.to.props) {
        for (const [prop, path] of Object.entries(edge.to.props)) {
          const extracted = extractData(document, path);
          // For simplicity, we take the first value if multiple are returned
          relProps[prop] = Array.isArray(extracted) ? extracted[0] : extracted;
        }
      }
      
      relationships.push({
        type: edge.type,
        from: {
          label: edge.from.node,
          key: Array.isArray(fromKey) ? fromKey[0] : fromKey
        },
        to: {
          label: edge.to.node,
          key: toKey
        },
        properties: relProps
      });
    }
  }
  
  return { nodes, relationships };
}