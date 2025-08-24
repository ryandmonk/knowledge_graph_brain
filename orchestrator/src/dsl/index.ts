import { parse } from 'yaml';
import { JSONPath } from 'jsonpath-plus';
import { SchemaDSLValidator } from './validator';

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
    
    // Use comprehensive validator
    const validationResult = SchemaDSLValidator.validate(schema);
    
    if (!validationResult.valid) {
      const formattedErrors = SchemaDSLValidator.formatValidationResults(validationResult);
      throw new Error(`Schema validation failed:
${formattedErrors}`);
    }
    
    // Log warnings if any
    if (validationResult.warnings.length > 0) {
      const warningMessages = validationResult.warnings
        .map(w => `⚠️  ${w.field}: ${w.message}`)
        .join('\n');
      console.warn(`Schema validation warnings:
${warningMessages}`);
    }
    
    return schema;
  } catch (error) {
    throw new Error(`Failed to parse schema: ${(error as Error).message}`);
  }
}// Function to extract data using JSONPath
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