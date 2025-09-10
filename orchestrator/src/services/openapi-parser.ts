import { parse as parseYaml } from 'yaml';

/**
 * OpenAPI Parser Service
 * Converts OpenAPI/Swagger specifications into Knowledge Graph schemas
 * Building on v0.15.1 streamlined schema registration workflow
 */

export interface OpenAPISpec {
  openapi?: string;
  swagger?: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
  };
}

export interface APIEndpoint {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  description?: string;
  responses: Record<string, any>;
  parameters?: any[];
}

export interface NodeMapping {
  label: string;
  key: string;
  props: string[];
  description?: string;
}

export interface RelationshipMapping {
  type: string;
  from: string;
  to: string;
  description?: string;
}

export interface ConnectorConfig {
  kb_id: string;
  embedding: {
    provider: string;
    chunking: {
      strategy: string;
      max_tokens: number;
    };
  };
  schema: {
    nodes: NodeMapping[];
    relationships: RelationshipMapping[];
  };
  mappings: {
    sources: Array<{
      source_id: string;
      connector_url?: string;
      document_type: string;
      extract: {
        node: string;
        assign: Record<string, string>;
      };
      edges?: Array<{
        type: string;
        from: { node: string; key: string };
        to: { node: string; key: string };
      }>;
    }>;
  };
}

export class OpenAPIParser {
  /**
   * Parse OpenAPI specification from JSON or YAML string
   */
  static parseSpec(specContent: string): OpenAPISpec {
    try {
      // Try JSON first
      return JSON.parse(specContent);
    } catch {
      try {
        // Fallback to YAML
        return parseYaml(specContent) as OpenAPISpec;
      } catch (error) {
        throw new Error(`Invalid OpenAPI specification format: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Extract API endpoints from OpenAPI spec
   */
  static extractEndpoints(spec: OpenAPISpec): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];

    // Defensive check for missing or null paths
    if (!spec.paths || typeof spec.paths !== 'object') {
      console.warn('⚠️ OpenAPI spec has no paths defined, returning empty endpoints array');
      return endpoints;
    }

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      // Defensive check for null/undefined pathItem
      if (!pathItem || typeof pathItem !== 'object') {
        continue;
      }

      for (const [method, operation] of Object.entries(pathItem)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase()) && 
            typeof operation === 'object' && operation !== null) {
          const op = operation as any;
          endpoints.push({
            path,
            method: method.toLowerCase(),
            operationId: op.operationId,
            summary: op.summary,
            description: op.description,
            responses: op.responses || {},
            parameters: op.parameters || []
          });
        }
      }
    }

    return endpoints;
  }

  /**
   * Infer data structure from OpenAPI components schemas
   */
  static inferDataStructure(spec: OpenAPISpec): { nodes: NodeMapping[]; relationships: RelationshipMapping[] } {
    const nodes: NodeMapping[] = [];
    const relationships: RelationshipMapping[] = [];

    if (!spec.components?.schemas) {
      // For OpenAPI specs without schema components, create a default API node
      // This ensures every spec generates at least one valid node for the knowledge graph
      const apiNode: NodeMapping = {
        label: 'API',
        key: 'name',
        props: ['name', 'title', 'version', 'description', 'endpoint_count'],
        description: `API entity for ${spec.info?.title || 'OpenAPI Specification'}`
      };
      nodes.push(apiNode);
      return { nodes, relationships };
    }

    // Process each schema component
    for (const [schemaName, schemaDefinition] of Object.entries(spec.components.schemas)) {
      if (typeof schemaDefinition === 'object' && schemaDefinition !== null) {
        const schema = schemaDefinition as any;
        
        // Create node mapping
        const nodeMapping: NodeMapping = {
          label: this.capitalizeFirst(schemaName),
          key: this.inferKeyField(schema),
          props: this.extractProperties(schema),
          description: schema.description
        };

        nodes.push(nodeMapping);

        // Infer relationships from references
        const refs = this.extractReferences(schema);
        for (const ref of refs) {
          const refName = this.extractSchemaNameFromRef(ref);
          if (refName && refName !== schemaName) {
            relationships.push({
              type: `RELATED_TO_${refName.toUpperCase()}`,
              from: this.capitalizeFirst(schemaName),
              to: this.capitalizeFirst(refName),
              description: `Relationship between ${schemaName} and ${refName}`
            });
          }
        }
      }
    }

    return { nodes, relationships };
  }

  /**
   * Generate connector configuration from OpenAPI spec
   */
  static generateConnectorConfig(
    spec: OpenAPISpec, 
    kb_id: string,
    connectorUrl?: string
  ): ConnectorConfig {
    const endpoints = this.extractEndpoints(spec);
    const { nodes, relationships } = this.inferDataStructure(spec);

    // Default connector URL from spec servers or manual input
    const defaultUrl = connectorUrl || 
      spec.servers?.[0]?.url || 
      'https://api.example.com';

    // Generate source mappings for each schema in correct DSL format
    const sources = nodes.map((node, index) => {
      const endpoint = endpoints.find(ep => 
        ep.path.toLowerCase().includes(node.label.toLowerCase()) ||
        ep.summary?.toLowerCase().includes(node.label.toLowerCase())
      );

      const endpointPath = endpoint ? endpoint.path : `/${node.label.toLowerCase()}s`;

      return {
        source_id: `${kb_id}-${node.label.toLowerCase()}`,
        connector_url: `${defaultUrl}${endpointPath}`,
        document_type: node.label.toLowerCase(),
        extract: {
          node: node.label,
          assign: this.generateFieldMappings(node.props)
        },
        edges: relationships
          .filter(rel => rel.from === node.label || rel.to === node.label)
          .map(rel => ({
            type: rel.type,
            from: { node: rel.from, key: `$.${node.key}` },
            to: { 
              node: rel.to, 
              key: `$.${rel.to.toLowerCase()}_id`
            }
          }))
      };
    });

    return {
      kb_id,
      embedding: {
        provider: "ollama:mxbai-embed-large",
        chunking: {
          strategy: "paragraph",
          max_tokens: 1000
        }
      },
      schema: {
        nodes,
        relationships
      },
      mappings: {
        sources
      }
    };
  }

  // Helper methods
  private static capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private static inferKeyField(schema: any): string {
    const properties = schema.properties || {};
    
    // Common ID field patterns
    const idFields = ['id', 'uuid', 'identifier', 'key'];
    for (const field of idFields) {
      if (properties[field]) return field;
    }

    // Use first required field as fallback
    if (schema.required && schema.required.length > 0) {
      return schema.required[0];
    }

    // Use first property as last resort
    const firstProp = Object.keys(properties)[0];
    return firstProp || 'id';
  }

  private static extractProperties(schema: any): string[] {
    if (!schema.properties) return [];
    
    return Object.keys(schema.properties).filter(prop => {
      const propDef = schema.properties[prop];
      // Include simple types, exclude complex objects and arrays for now
      return propDef.type && ['string', 'number', 'integer', 'boolean'].includes(propDef.type);
    });
  }

  private static extractReferences(schema: any): string[] {
    const refs: string[] = [];
    
    const findRefs = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) return;
      
      if (obj.$ref && typeof obj.$ref === 'string') {
        refs.push(obj.$ref);
      }
      
      for (const value of Object.values(obj)) {
        findRefs(value);
      }
    };
    
    findRefs(schema);
    return refs;
  }

  private static extractSchemaNameFromRef(ref: string): string | null {
    const match = ref.match(/#\/components\/schemas\/(.+)$/);
    return match ? match[1] : null;
  }

  private static generateFieldMappings(props: string[]): Record<string, string> {
    const mappings: Record<string, string> = {};
    
    for (const prop of props) {
      mappings[prop] = `$.${prop}`;
    }
    
    return mappings;
  }
}
