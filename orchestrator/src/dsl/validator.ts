import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { JSONPath } from 'jsonpath-plus';

// JSON Schema for the complete DSL structure
const schemaDSLJsonSchema = {
  type: 'object',
  properties: {
    kb_id: {
      type: 'string',
      pattern: '^[a-zA-Z0-9_-]+$',
      minLength: 1,
      maxLength: 64,
      description: 'Knowledge base identifier (alphanumeric, underscore, hyphen only)'
    },
    embedding: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          pattern: '^(ollama|openai):[a-zA-Z0-9_-]+$',
          description: 'Embedding provider in format "provider:model" (e.g., "ollama:mxbai-embed-large")'
        },
        chunking: {
          type: 'object',
          properties: {
            strategy: {
              type: 'string',
              enum: ['by_headings', 'by_fields', 'sentence', 'paragraph'],
              description: 'Chunking strategy for text processing'
            },
            max_tokens: {
              type: 'integer',
              minimum: 100,
              maximum: 8000,
              description: 'Maximum tokens per chunk'
            },
            overlap: {
              type: 'integer',
              minimum: 0,
              maximum: 500,
              description: 'Token overlap between chunks'
            },
            fields: {
              type: 'array',
              items: { type: 'string' },
              description: 'Fields to use for by_fields strategy'
            }
          },
          required: ['strategy'],
          additionalProperties: true
        }
      },
      required: ['provider', 'chunking'],
      additionalProperties: false
    },
    schema: {
      type: 'object',
      properties: {
        nodes: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              label: {
                type: 'string',
                pattern: '^[A-Z][a-zA-Z0-9_]*$',
                description: 'Node label must start with uppercase letter'
              },
              key: {
                type: 'string',
                minLength: 1,
                description: 'Property name used as unique identifier'
              },
              props: {
                type: 'array',
                items: { 
                  type: 'string',
                  pattern: '^[a-zA-Z_][a-zA-Z0-9_]*$'
                },
                minItems: 1,
                description: 'Property names (must be valid identifiers)'
              }
            },
            required: ['label', 'key', 'props'],
            additionalProperties: false
          }
        },
        relationships: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                pattern: '^[A-Z_][A-Z0-9_]*$',
                description: 'Relationship type in UPPER_CASE'
              },
              from: {
                type: 'string',
                description: 'Source node label'
              },
              to: {
                type: 'string',
                description: 'Target node label'
              },
              props: {
                type: 'array',
                items: { 
                  type: 'string',
                  pattern: '^[a-zA-Z_][a-zA-Z0-9_]*$'
                }
              }
            },
            required: ['type', 'from', 'to'],
            additionalProperties: false
          }
        }
      },
      required: ['nodes', 'relationships'],
      additionalProperties: false
    },
    mappings: {
      type: 'object',
      properties: {
        sources: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              source_id: {
                type: 'string',
                pattern: '^[a-zA-Z0-9_-]+$',
                minLength: 1,
                description: 'Source identifier'
              },
              document_type: {
                type: 'string',
                minLength: 1,
                description: 'Type of documents from this source'
              },
              extract: {
                type: 'object',
                properties: {
                  node: {
                    type: 'string',
                    description: 'Target node label for extraction'
                  },
                  assign: {
                    type: 'object',
                    patternProperties: {
                      '^[a-zA-Z_][a-zA-Z0-9_]*$': {
                        type: 'string',
                        pattern: '^\\$\\.',
                        description: 'JSONPath expression starting with $.'
                      }
                    },
                    additionalProperties: false,
                    minProperties: 1
                  }
                },
                required: ['node', 'assign'],
                additionalProperties: false
              },
              edges: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      pattern: '^[A-Z_][A-Z0-9_]*$'
                    },
                    from: {
                      type: 'object',
                      properties: {
                        node: { type: 'string' },
                        key: { 
                          type: 'string',
                          pattern: '^\\$\\.',
                          description: 'JSONPath expression'
                        }
                      },
                      required: ['node', 'key'],
                      additionalProperties: false
                    },
                    to: {
                      type: 'object',
                      properties: {
                        node: { type: 'string' },
                        key: { 
                          type: 'string',
                          pattern: '^\\$\\.',
                          description: 'JSONPath expression'
                        },
                        props: {
                          type: 'object',
                          patternProperties: {
                            '^[a-zA-Z_][a-zA-Z0-9_]*$': {
                              type: 'string',
                              pattern: '^\\$\\.',
                              description: 'JSONPath expression'
                            }
                          },
                          additionalProperties: false
                        }
                      },
                      required: ['node', 'key'],
                      additionalProperties: false
                    }
                  },
                  required: ['type', 'from', 'to'],
                  additionalProperties: false
                }
              }
            },
            required: ['source_id', 'document_type', 'extract', 'edges'],
            additionalProperties: false
          }
        }
      },
      required: ['sources'],
      additionalProperties: false
    }
  },
  required: ['kb_id', 'embedding', 'schema', 'mappings'],
  additionalProperties: false
};

// Validation error interface
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Create AJV instance with formats
const ajv = new Ajv({ 
  allErrors: true, 
  verbose: true,
  removeAdditional: false
});
addFormats(ajv);

const validate = ajv.compile(schemaDSLJsonSchema);

// Enhanced validator class
export class SchemaDSLValidator {
  
  /**
   * Comprehensive validation of a parsed schema object
   */
  static validate(schema: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    // Step 1: JSON Schema validation
    const isValid = validate(schema);
    
    if (!isValid && validate.errors) {
      for (const error of validate.errors) {
        const field = (error as any).instancePath || error.schemaPath || 'root';
        let message = error.message || 'Validation failed';
        let suggestion: string | undefined;
        
        // Provide helpful suggestions for common errors
        if (error.keyword === 'pattern') {
          if ((error as any).instancePath?.includes('kb_id')) {
            suggestion = 'Use only letters, numbers, underscore, and hyphen. Example: "my-kb-name"';
          } else if ((error as any).instancePath?.includes('provider')) {
            suggestion = 'Use format "provider:model". Examples: "ollama:mxbai-embed-large", "openai:text-embedding-ada-002"';
          } else if ((error as any).instancePath?.includes('label')) {
            suggestion = 'Node labels must start with uppercase. Examples: "Document", "Person", "Product"';
          } else if ((error as any).instancePath?.includes('type')) {
            suggestion = 'Relationship types must be UPPER_CASE. Examples: "AUTHORED_BY", "CONTAINS", "RELATES_TO"';
          } else if ((error as any).instancePath?.includes('assign') || (error as any).instancePath?.includes('key')) {
            suggestion = 'JSONPath expressions must start with "$." Examples: "$.id", "$.title", "$.author.email"';
          }
        } else if (error.keyword === 'required') {
          suggestion = `Add the missing required field: ${(error.params as any)?.missingProperty}`;
        } else if (error.keyword === 'enum') {
          suggestion = `Valid values: ${(error.params as any)?.allowedValues?.join(', ')}`;
        }
        
        errors.push({
          field: field.replace(/^\//, '').replace(/\//g, '.'),
          message,
          value: error.data,
          suggestion
        });
      }
    }
    
    // Step 2: Cross-reference validation
    if (schema && typeof schema === 'object') {
      const crossRefErrors = SchemaDSLValidator.validateCrossReferences(schema);
      errors.push(...crossRefErrors);
      
      // Step 3: JSONPath validation
      const jsonPathErrors = SchemaDSLValidator.validateJSONPaths(schema);
      errors.push(...jsonPathErrors);
      
      // Step 4: Security and best practice warnings
      const securityWarnings = SchemaDSLValidator.checkSecurityWarnings(schema);
      warnings.push(...securityWarnings);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Validate cross-references between schema definitions
   */
  private static validateCrossReferences(schema: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!schema.schema?.nodes || !schema.schema?.relationships || !schema.mappings?.sources) {
      return errors;
    }
    
    // Get all defined node labels
    const nodeLabels = new Set(schema.schema.nodes.map((n: any) => n.label));
    
    // Check that relationship from/to references exist
    for (const rel of schema.schema.relationships) {
      if (!nodeLabels.has(rel.from)) {
        errors.push({
          field: `schema.relationships[].from`,
          message: `Referenced node label "${rel.from}" is not defined in schema.nodes`,
          value: rel.from,
          suggestion: `Add a node with label "${rel.from}" or use one of: ${Array.from(nodeLabels).join(', ')}`
        });
      }
      
      if (!nodeLabels.has(rel.to)) {
        errors.push({
          field: `schema.relationships[].to`,
          message: `Referenced node label "${rel.to}" is not defined in schema.nodes`,
          value: rel.to,
          suggestion: `Add a node with label "${rel.to}" or use one of: ${Array.from(nodeLabels).join(', ')}`
        });
      }
    }
    
    // Check that mapping extract and edge references exist
    for (const source of schema.mappings.sources) {
      if (!nodeLabels.has(source.extract?.node)) {
        errors.push({
          field: `mappings.sources[].extract.node`,
          message: `Referenced node label "${source.extract.node}" is not defined in schema.nodes`,
          value: source.extract.node,
          suggestion: `Use one of: ${Array.from(nodeLabels).join(', ')}`
        });
      }
      
      // Check edge references
      if (source.edges) {
        for (const edge of source.edges) {
          if (!nodeLabels.has(edge.from?.node)) {
            errors.push({
              field: `mappings.sources[].edges[].from.node`,
              message: `Referenced node label "${edge.from.node}" is not defined in schema.nodes`,
              value: edge.from.node
            });
          }
          
          if (!nodeLabels.has(edge.to?.node)) {
            errors.push({
              field: `mappings.sources[].edges[].to.node`,
              message: `Referenced node label "${edge.to.node}" is not defined in schema.nodes`,
              value: edge.to.node
            });
          }
        }
      }
    }
    
    return errors;
  }
  
  /**
   * Validate JSONPath expressions
   */
  private static validateJSONPaths(schema: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    const validateJSONPath = (path: string, context: string): void => {
      try {
        // Test if the JSONPath is syntactically valid
        JSONPath({path, json: {}});
      } catch (error) {
        errors.push({
          field: context,
          message: `Invalid JSONPath expression: ${path}`,
          value: path,
          suggestion: 'Use valid JSONPath syntax. Examples: "$.id", "$.author.name", "$.labels[*].name"'
        });
      }
    };
    
    // Check mappings JSONPaths
    if (schema.mappings?.sources) {
      for (const source of schema.mappings.sources) {
        // Check extract assignments
        if (source.extract?.assign) {
          for (const [prop, path] of Object.entries(source.extract.assign)) {
            if (typeof path === 'string') {
              validateJSONPath(path, `mappings.sources[].extract.assign.${prop}`);
            }
          }
        }
        
        // Check edge JSONPaths
        if (source.edges) {
          for (const edge of source.edges) {
            if (edge.from?.key) {
              validateJSONPath(edge.from.key, 'mappings.sources[].edges[].from.key');
            }
            
            if (edge.to?.key) {
              validateJSONPath(edge.to.key, 'mappings.sources[].edges[].to.key');
            }
            
            if (edge.to?.props) {
              for (const [prop, path] of Object.entries(edge.to.props)) {
                if (typeof path === 'string') {
                  validateJSONPath(path, `mappings.sources[].edges[].to.props.${prop}`);
                }
              }
            }
          }
        }
      }
    }
    
    return errors;
  }
  
  /**
   * Check for potential security issues and best practice violations
   */
  private static checkSecurityWarnings(schema: any): ValidationError[] {
    const warnings: ValidationError[] = [];
    
    // Common PII fields that should be flagged
    const piiFields = ['password', 'ssn', 'social_security', 'credit_card', 'bank_account', 'api_key', 'secret'];
    const emailFields = ['email', 'email_address'];
    
    if (schema.schema?.nodes) {
      for (const node of schema.schema.nodes) {
        for (const prop of node.props || []) {
          const lowerprop = prop.toLowerCase();
          
          // Check for PII fields
          for (const piiField of piiFields) {
            if (lowerprop.includes(piiField)) {
              warnings.push({
                field: `schema.nodes[].props`,
                message: `Property "${prop}" may contain sensitive data`,
                value: prop,
                suggestion: 'Consider excluding PII from the graph or implement proper access controls'
              });
            }
          }
          
          // Check for email fields without proper handling
          for (const emailField of emailFields) {
            if (lowerprop.includes(emailField) && node.key !== prop) {
              warnings.push({
                field: `schema.nodes[].props`,
                message: `Email property "${prop}" found but not used as key`,
                value: prop,
                suggestion: 'Consider using email as the node key for identity resolution'
              });
            }
          }
        }
      }
    }
    
    return warnings;
  }
  
  /**
   * Format validation results for user-friendly output
   */
  static formatValidationResults(result: ValidationResult): string {
    const lines: string[] = [];
    
    if (result.valid) {
      lines.push('✅ Schema validation passed!');
    } else {
      lines.push('❌ Schema validation failed:');
      lines.push('');
    }
    
    // Format errors
    if (result.errors.length > 0) {
      lines.push('ERRORS:');
      for (const error of result.errors) {
        lines.push(`  • ${error.field}: ${error.message}`);
        if (error.value !== undefined) {
          lines.push(`    Current value: ${JSON.stringify(error.value)}`);
        }
        if (error.suggestion) {
          lines.push(`    💡 ${error.suggestion}`);
        }
        lines.push('');
      }
    }
    
    // Format warnings
    if (result.warnings.length > 0) {
      lines.push('WARNINGS:');
      for (const warning of result.warnings) {
        lines.push(`  ⚠️  ${warning.field}: ${warning.message}`);
        if (warning.suggestion) {
          lines.push(`    💡 ${warning.suggestion}`);
        }
        lines.push('');
      }
    }
    
    return lines.join('\n');
  }
}
