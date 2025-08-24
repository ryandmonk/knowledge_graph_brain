import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { JSONPath } from 'jsonpath-plus';

// Simplified validation interfaces for CLI
export interface ValidationError {
  message: string;
  path?: string;
  suggestion?: string;
}

export interface ValidationWarning {
  message: string;
  path?: string;
  type: 'security' | 'performance' | 'best_practice';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// JSON Schema for basic DSL validation
const schemaDSLJsonSchema = {
  type: 'object',
  properties: {
    kb_id: {
      type: 'string',
      pattern: '^[a-zA-Z0-9_-]+$',
      minLength: 1,
      maxLength: 64
    },
    embedding: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          pattern: '^(ollama|openai):[a-zA-Z0-9_-]+$'
        },
        chunking: {
          type: 'object',
          properties: {
            strategy: {
              type: 'string',
              enum: ['by_headings', 'by_fields', 'sentence', 'paragraph']
            }
          },
          required: ['strategy']
        }
      },
      required: ['provider', 'chunking']
    },
    schema: {
      type: 'object',
      properties: {
        nodes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', minLength: 1 },
              key: { type: 'string', minLength: 1 },
              props: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            required: ['label', 'key', 'props']
          }
        },
        relationships: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', minLength: 1 },
              from: { type: 'string', minLength: 1 },
              to: { type: 'string', minLength: 1 },
              props: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            required: ['type', 'from', 'to']
          }
        }
      },
      required: ['nodes', 'relationships']
    },
    mappings: {
      type: 'object',
      properties: {
        sources: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              source_id: { type: 'string', minLength: 1 },
              document_type: { type: 'string', minLength: 1 },
              extract: {
                type: 'object',
                properties: {
                  node: { type: 'string', minLength: 1 },
                  assign: { type: 'object' }
                },
                required: ['node', 'assign']
              },
              edges: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', minLength: 1 },
                    from: {
                      type: 'object',
                      properties: {
                        node: { type: 'string', minLength: 1 },
                        key: { type: 'string', minLength: 1 }
                      },
                      required: ['node', 'key']
                    },
                    to: {
                      type: 'object',
                      properties: {
                        node: { type: 'string', minLength: 1 },
                        key: { type: 'string', minLength: 1 }
                      },
                      required: ['node', 'key']
                    }
                  },
                  required: ['type', 'from', 'to']
                }
              }
            },
            required: ['source_id', 'document_type', 'extract']
          }
        }
      },
      required: ['sources']
    }
  },
  required: ['kb_id', 'embedding', 'schema', 'mappings']
};

export class SchemaValidator {
  private ajv: Ajv;
  
  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true, 
      verbose: true,
      strict: false
    });
    addFormats(this.ajv);
  }
  
  async validate(schema: any): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Basic JSON Schema validation
    const validate = this.ajv.compile(schemaDSLJsonSchema);
    const isValid = validate(schema);
    
    if (!isValid && validate.errors) {
      for (const error of validate.errors) {
        errors.push({
          message: this.formatAjvError(error),
          path: error.instancePath || error.schemaPath,
          suggestion: this.getErrorSuggestion(error)
        });
      }
    }
    
    // Additional validations
    if (schema && typeof schema === 'object') {
      this.validateCrossReferences(schema, errors, warnings);
      this.validateJSONPaths(schema, errors, warnings);
      this.checkSecurityWarnings(schema, warnings);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  private formatAjvError(error: ErrorObject): string {
    const path = error.instancePath ? ` at '${error.instancePath}'` : '';
    return `${error.message}${path}`;
  }
  
  private getErrorSuggestion(error: ErrorObject): string | undefined {
    if (error.keyword === 'pattern' && error.instancePath?.includes('provider')) {
      return 'Provider should be in format "ollama:model-name" or "openai:model-name"';
    }
    if (error.keyword === 'enum' && error.instancePath?.includes('strategy')) {
      return 'Valid strategies: by_headings, by_fields, sentence, paragraph';
    }
    return undefined;
  }
  
  private validateCrossReferences(schema: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!schema.schema?.nodes || !schema.mappings?.sources) return;
    
    const nodeLabels = new Set(schema.schema.nodes.map((n: any) => n.label));
    
    for (const source of schema.mappings.sources) {
      if (source.extract?.node && !nodeLabels.has(source.extract.node)) {
        errors.push({
          message: `Source mapping references undefined node type '${source.extract.node}'`,
          path: `mappings.sources[source_id=${source.source_id}].extract.node`,
          suggestion: `Available node types: ${Array.from(nodeLabels).join(', ')}`
        });
      }
      
      if (source.edges) {
        for (const edge of source.edges) {
          if (edge.from?.node && !nodeLabels.has(edge.from.node)) {
            errors.push({
              message: `Edge references undefined 'from' node type '${edge.from.node}'`,
              path: `mappings.sources[source_id=${source.source_id}].edges`
            });
          }
          if (edge.to?.node && !nodeLabels.has(edge.to.node)) {
            errors.push({
              message: `Edge references undefined 'to' node type '${edge.to.node}'`,
              path: `mappings.sources[source_id=${source.source_id}].edges`
            });
          }
        }
      }
    }
  }
  
  private validateJSONPaths(schema: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!schema.mappings?.sources) return;
    
    for (const source of schema.mappings.sources) {
      if (source.extract?.assign) {
        for (const [prop, jsonPath] of Object.entries(source.extract.assign)) {
          if (typeof jsonPath === 'string' && jsonPath.startsWith('$')) {
            try {
              // Basic JSONPath syntax validation
              JSONPath({ path: jsonPath, json: {} });
            } catch (error) {
              errors.push({
                message: `Invalid JSONPath expression '${jsonPath}' for property '${prop}'`,
                path: `mappings.sources[source_id=${source.source_id}].extract.assign.${prop}`,
                suggestion: 'Check JSONPath syntax (should start with $ and use valid expressions)'
              });
            }
          }
        }
      }
    }
  }
  
  private checkSecurityWarnings(schema: any, warnings: ValidationWarning[]): void {
    if (!schema.mappings?.sources) return;
    
    for (const source of schema.mappings.sources) {
      if (source.extract?.assign) {
        for (const [prop, jsonPath] of Object.entries(source.extract.assign)) {
          if (typeof jsonPath === 'string') {
            // Check for potentially sensitive fields
            const sensitiveFields = ['password', 'secret', 'token', 'key', 'auth', 'credential', 'ssn', 'email', 'phone'];
            const lowerProp = prop.toLowerCase();
            const lowerPath = jsonPath.toLowerCase();
            
            for (const sensitive of sensitiveFields) {
              if (lowerProp.includes(sensitive) || lowerPath.includes(sensitive)) {
                warnings.push({
                  message: `Potentially sensitive field '${prop}' detected`,
                  path: `mappings.sources[source_id=${source.source_id}].extract.assign.${prop}`,
                  type: 'security'
                });
                break;
              }
            }
          }
        }
      }
    }
  }
}
