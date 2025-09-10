import express from 'express';
import { OpenAPIParser } from '../services/openapi-parser';
import { LLMSchemaAnalyzer } from '../services/llm-schema-analyzer';
import { SchemaDSLValidator } from '../dsl/validator';
import { parse as parseYaml } from 'yaml';
import { registeredSchemas } from '../capabilities'; // Import from capabilities module

const router = express.Router();
const llmAnalyzer = new LLMSchemaAnalyzer();

/**
 * Helper function for categorizing entities by name
 */
function inferCategoryFromName(label: string): string {
  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes('user') || lowerLabel.includes('person') || lowerLabel.includes('account')) return 'identity';
  if (lowerLabel.includes('project') || lowerLabel.includes('issue') || lowerLabel.includes('ticket')) return 'work_item';
  if (lowerLabel.includes('comment') || lowerLabel.includes('attachment') || lowerLabel.includes('file')) return 'content';
  if (lowerLabel.includes('status') || lowerLabel.includes('priority') || lowerLabel.includes('type')) return 'metadata';
  if (lowerLabel.includes('organization') || lowerLabel.includes('team') || lowerLabel.includes('group')) return 'organizational';
  return 'entity';
}

/**
 * Custom Connector API Routes
 * Building on v0.15.1 streamlined schema registration workflow
 */

/**
 * Parse OpenAPI specification and generate Knowledge Graph schema
 * POST /api/custom-connectors/parse-openapi
 */
router.post('/parse-openapi', async (req, res) => {
  try {
    const { spec_content, kb_id, connector_url } = req.body;

    if (!spec_content || !kb_id) {
      return res.status(400).json({
        error: 'Missing required fields: spec_content and kb_id are required'
      });
    }

    // Parse OpenAPI specification
    const spec = OpenAPIParser.parseSpec(spec_content);
    
    // Generate connector configuration
    const connectorConfig = OpenAPIParser.generateConnectorConfig(
      spec, 
      kb_id, 
      connector_url
    );

    // Validate generated schema using existing validator
    const validationResult = SchemaDSLValidator.validate(connectorConfig);
    
    if (!validationResult.valid) {
      const formattedErrors = SchemaDSLValidator.formatValidationResults(validationResult);
      return res.status(400).json({
        error: 'Generated schema validation failed',
        validation_errors: formattedErrors,
        generated_schema: connectorConfig
      });
    }

    res.json({
      success: true,
      message: 'OpenAPI specification parsed successfully',
      generated_schema: connectorConfig,
      validation_warnings: validationResult.warnings,
      api_info: {
        title: spec.info.title,
        version: spec.info.version,
        description: spec.info.description,
        endpoints_found: OpenAPIParser.extractEndpoints(spec).length,
        schemas_found: Object.keys(spec.components?.schemas || {}).length
      }
    });

  } catch (error) {
    console.error('OpenAPI parsing error:', error);
    res.status(500).json({
      error: 'Failed to parse OpenAPI specification',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Parse OpenAPI specification with LLM-enhanced intelligence
 * POST /api/custom-connectors/parse-openapi-enhanced
 */
router.post('/parse-openapi-enhanced', async (req, res) => {
  try {
    const { spec_content, kb_id, connector_url, context } = req.body;

    if (!spec_content || !kb_id) {
      return res.status(400).json({
        error: 'Missing required fields: spec_content and kb_id are required'
      });
    }

    // Check spec size before processing
    const specSize = spec_content.length;
    console.log(`📊 OpenAPI spec size: ${(specSize / 1024).toFixed(0)}KB`);
    
    // For very large specs (>5MB), return a helpful error
    if (specSize > 5 * 1024 * 1024) {
      return res.status(400).json({
        error: 'OpenAPI specification too large',
        details: `Specification size (${(specSize / 1024 / 1024).toFixed(1)}MB) exceeds maximum limit of 5MB. Please consider splitting the specification or using a subset of endpoints.`,
        size_info: {
          actual_size_mb: (specSize / 1024 / 1024).toFixed(1),
          max_size_mb: 5,
          suggestion: 'For large APIs like Jira, consider creating focused schemas for specific workflows rather than importing the entire API specification.'
        }
      });
    }

    // Parse OpenAPI specification
    const spec = OpenAPIParser.parseSpec(spec_content);
    
    // Generate basic structure for analysis
    const basicStructure = OpenAPIParser.inferDataStructure(spec);
    const endpoints = OpenAPIParser.extractEndpoints(spec);
    
    console.log('🧠 Starting LLM-enhanced analysis...');
    
    // Use LLM Schema Analyzer for intelligent schema enhancement
    const llmAnalysisResult = await llmAnalyzer.analyzeSchema(
      spec,
      context || {}
    );
    
    console.log('✅ LLM analysis completed with confidence:', llmAnalysisResult.confidence);
    
    // Generate enhanced connector configuration  
    let basicConfig;
    try {
      console.log('🔧 Generating basic connector config...');
      basicConfig = OpenAPIParser.generateConnectorConfig(spec, kb_id, connector_url);
      console.log('✅ Basic connector config generated');
    } catch (error) {
      console.error('❌ Failed to generate basic connector config:', error);
      return res.status(500).json({
        error: 'Failed to generate connector configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Enhance with LLM insights
    let enhancedConfig;
    try {
      console.log('🔧 Creating enhanced schema configuration...');
      
      // Get the actual node labels that exist in the schema
      const existingNodeLabels = new Set(
        llmAnalysisResult.enhancedNodes.map((node: any) => node.label)
      );
      
      // Filter relationships to only include those that reference existing nodes
      const validRelationships = llmAnalysisResult.intelligentRelationships.filter((rel: any) => {
        const hasValidFrom = existingNodeLabels.has(rel.from);
        const hasValidTo = existingNodeLabels.has(rel.to);
        
        if (!hasValidFrom || !hasValidTo) {
          console.log(`⚠️ Filtering out invalid relationship: ${rel.from} -> ${rel.to} (missing nodes)`);
          return false;
        }
        return true;
      });
      
      console.log(`📊 Schema validation: ${existingNodeLabels.size} nodes, ${validRelationships.length}/${llmAnalysisResult.intelligentRelationships.length} valid relationships`);
      
      enhancedConfig = {
        ...basicConfig,
        schema: {
          nodes: llmAnalysisResult.enhancedNodes.map((node: any) => ({
            label: node.label,
            key: node.key,
            props: node.props  // Fixed: Use 'props' not 'properties' for DSL compliance
          })),
          relationships: validRelationships.map((rel: any) => ({
            type: rel.type,
            from: rel.from,
            to: rel.to
          }))
        }
      };
      console.log('✅ Enhanced schema configuration created');
    } catch (error) {
      console.error('❌ Failed to create enhanced schema configuration:', error);
      return res.status(500).json({
        error: 'Failed to create enhanced schema configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Validate enhanced schema
    console.log('🔍 Validating enhanced schema...');
    const validationResult = SchemaDSLValidator.validate(enhancedConfig);
    console.log('📊 Validation result:', {
      valid: validationResult.valid,
      errorCount: validationResult.errors?.length || 0,
      warningCount: validationResult.warnings?.length || 0
    });
    
    if (!validationResult.valid) {
      const formattedErrors = SchemaDSLValidator.formatValidationResults(validationResult);
      console.log('❌ Schema validation failed:', formattedErrors);
      return res.status(400).json({
        error: 'Enhanced schema validation failed',
        validation_errors: formattedErrors,
        generated_schema: enhancedConfig,
        llm_analysis: llmAnalysisResult
      });
    }

    console.log('✅ Schema validation passed, sending success response');
    res.json({
      success: true,
      message: 'OpenAPI specification analyzed with LLM intelligence',
      generated_schema: enhancedConfig,
      validation_warnings: validationResult.warnings,
      llm_insights: {
        confidence: llmAnalysisResult.confidence,
        enhanced_nodes: llmAnalysisResult.enhancedNodes.length,
        intelligent_relationships: llmAnalysisResult.intelligentRelationships.length,
        field_suggestions: llmAnalysisResult.fieldMappingsSuggestions.length,
        optimizations: llmAnalysisResult.schemaOptimizations.length
      },
      api_info: {
        title: spec.info.title,
        version: spec.info.version,
        description: spec.info.description,
        endpoints_found: OpenAPIParser.extractEndpoints(spec).length,
        schemas_found: Object.keys(spec.components?.schemas || {}).length
      }
    });

  } catch (error) {
    console.error('LLM-enhanced OpenAPI parsing error:', error);
    res.status(500).json({
      error: 'Failed to perform LLM-enhanced OpenAPI analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Analyze live REST API endpoints with LLM-powered introspection
 * POST /api/custom-connectors/analyze-rest-api
 */
router.post('/analyze-rest-api', async (req, res) => {
  try {
    const { api_url, auth_config, kb_id, sample_endpoints, context } = req.body;

    if (!api_url || !kb_id) {
      return res.status(400).json({
        error: 'Missing required fields: api_url and kb_id are required'
      });
    }

    // Initialize LLM analyzer
    const llmAnalyzer = new LLMSchemaAnalyzer();

    // Create a synthetic OpenAPI spec from live API analysis
    const syntheticSpec = await createSyntheticOpenAPISpec(
      api_url, 
      auth_config, 
      sample_endpoints || []
    );

    // Perform LLM analysis on the synthetic spec
    const analysisResult = await llmAnalyzer.analyzeSchema(syntheticSpec, {
      ...context,
      domain: context?.domain || 'REST API Analysis',
      businessGoals: context?.businessGoals || ['Data Integration', 'Knowledge Discovery']
    });

    // Generate connector configuration
    const connectorConfig = {
      kb_id,
      name: `${api_url} REST API Knowledge Base`,
      version: "1.0.0",
      embedding: {
        provider: "ollama",
        model: "mxbai-embed-large",
        chunking: {
          strategy: "sentence",
          chunk_size: 512,
          overlap: 50
        }
      },
      schema: {
        nodes: analysisResult.enhancedNodes.map(node => ({
          label: node.label,
          key: node.key,
          properties: node.props,
          description: node.businessContext,
          metadata: {
            entity_type: node.entityType,
            semantic_category: node.semanticCategory,
            recommended_indexes: node.recommendedIndexes,
            data_quality: node.dataQuality
          }
        })),
        relationships: analysisResult.intelligentRelationships.map(rel => ({
          type: rel.type,
          from: rel.from,
          to: rel.to,
          description: rel.businessSemantics,
          metadata: {
            strength: rel.relationshipStrength,
            optimization: rel.graphOptimization,
            query_patterns: rel.queryPatterns
          }
        }))
      },
      mappings: {
        sources: analysisResult.enhancedNodes.map(node => ({
          source_id: node.label.toLowerCase(),
          connector_url: `${api_url}/${node.label.toLowerCase()}`,
          document_type: node.label.toLowerCase(),
          extract: {
            node: node.label,
            assign: analysisResult.fieldMappingsSuggestions
              .filter(suggestion => suggestion.field.includes(node.label.toLowerCase()))
              .reduce((acc, suggestion) => {
                acc[suggestion.field] = suggestion.suggestedJSONPath;
                return acc;
              }, {} as Record<string, string>)
          }
        }))
      },
      rest_api_analysis: {
        confidence: analysisResult.confidence,
        api_url,
        auth_config: auth_config ? 'configured' : 'none',
        field_mapping_suggestions: analysisResult.fieldMappingsSuggestions,
        schema_optimizations: analysisResult.schemaOptimizations,
        analysis_timestamp: new Date().toISOString()
      }
    };

    // Validate generated schema
    const validationResult = SchemaDSLValidator.validate(connectorConfig);
    
    if (!validationResult.valid) {
      const formattedErrors = SchemaDSLValidator.formatValidationResults(validationResult);
      return res.status(400).json({
        error: 'REST API analysis schema validation failed',
        validation_errors: formattedErrors,
        generated_schema: connectorConfig,
        analysis_result: analysisResult
      });
    }

    res.json({
      success: true,
      message: 'REST API analyzed successfully with LLM intelligence',
      generated_schema: connectorConfig,
      validation_warnings: validationResult.warnings,
      analysis_insights: {
        confidence: analysisResult.confidence,
        discovered_entities: analysisResult.enhancedNodes.length,
        inferred_relationships: analysisResult.intelligentRelationships.length,
        field_mappings: analysisResult.fieldMappingsSuggestions.length,
        optimization_opportunities: analysisResult.schemaOptimizations.length
      },
      recommendations: analysisResult.schemaOptimizations.map(opt => ({
        type: opt.type,
        description: opt.description,
        impact: opt.impact
      }))
    });

  } catch (error) {
    console.error('REST API analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze REST API',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Helper function to create synthetic OpenAPI spec from live API analysis
 */
async function createSyntheticOpenAPISpec(
  apiUrl: string, 
  authConfig?: any, 
  sampleEndpoints: string[] = []
): Promise<any> {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: `${apiUrl} REST API`,
      version: '1.0.0',
      description: `Auto-discovered API from ${apiUrl}`
    },
    servers: [{ url: apiUrl }],
    paths: {} as any,
    components: { schemas: {} as any }
  };

  // Add sample endpoints or common REST patterns
  const endpoints = sampleEndpoints.length > 0 ? sampleEndpoints : [
    '/users', '/posts', '/products', '/orders', '/data'
  ];

  for (const endpoint of endpoints) {
    spec.paths[endpoint] = {
      get: {
        summary: `Get ${endpoint.replace('/', '')}`,
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      created_at: { type: 'string', format: 'date-time' },
                      updated_at: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
  }

  return spec;
}

/**
 * Register custom connector schema (leverages existing streamlined workflow)
 * POST /api/custom-connectors/register
 */
router.post('/register', async (req, res) => {
  try {
    const { schema_yaml, kb_id } = req.body;

    if (!schema_yaml || !kb_id) {
      return res.status(400).json({
        error: 'Missing required fields: schema_yaml and kb_id are required'
      });
    }

    // Parse and validate schema using existing infrastructure
    let schema;
    try {
      schema = parseYaml(schema_yaml);
    } catch (parseError) {
      return res.status(400).json({
        error: 'Invalid YAML format',
        details: parseError instanceof Error ? parseError.message : 'YAML parsing failed'
      });
    }

    // Validate schema using existing validator
    const validationResult = SchemaDSLValidator.validate(schema);
    
    if (!validationResult.valid) {
      const formattedErrors = SchemaDSLValidator.formatValidationResults(validationResult);
      return res.status(400).json({
        error: 'Schema validation failed',
        validation_errors: formattedErrors
      });
    }

    // Register schema in global registry (existing pattern)
    registeredSchemas.set(kb_id, schema);

    res.json({
      success: true,
      message: `Custom connector schema registered successfully for kb_id: ${kb_id}`,
      kb_id,
      validation_warnings: validationResult.warnings,
      schema_summary: {
        nodes: schema.schema?.nodes?.length || 0,
        relationships: schema.schema?.relationships?.length || 0,
        sources: schema.mappings?.sources?.length || 0
      }
    });

  } catch (error) {
    console.error('Custom connector registration error:', error);
    res.status(500).json({
      error: 'Failed to register custom connector',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * List all registered custom connectors
 * GET /api/custom-connectors
 */
router.get('/', async (req, res) => {
  try {
    const customConnectors = [];

    for (const [kb_id, schema] of registeredSchemas.entries()) {
      // Identify custom connectors (those not in the default set)
      const isCustom = !['confluence-kb', 'retail-kb', 'github-kb', 'slack-kb'].includes(kb_id);
      
      if (isCustom) {
        customConnectors.push({
          kb_id,
          name: (schema as any).name || kb_id,
          version: (schema as any).version || '1.0.0',
          description: (schema as any).description,
          created_from: (schema as any).generated_from || 'manual',
          nodes_count: (schema as any).schema?.nodes?.length || 0,
          relationships_count: (schema as any).schema?.relationships?.length || 0,
          sources_count: (schema as any).mappings?.sources?.length || 0
        });
      }
    }

    res.json({
      success: true,
      custom_connectors: customConnectors,
      total_count: customConnectors.length
    });

  } catch (error) {
    console.error('Failed to list custom connectors:', error);
    res.status(500).json({
      error: 'Failed to list custom connectors',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get custom connector schema details
 * GET /api/custom-connectors/:kb_id
 */
router.get('/:kb_id', async (req, res) => {
  try {
    const { kb_id } = req.params;
    const schema = registeredSchemas.get(kb_id);

    if (!schema) {
      return res.status(404).json({
        error: `Custom connector not found: ${kb_id}`
      });
    }

    res.json({
      success: true,
      kb_id,
      schema,
      schema_yaml: parseYaml(JSON.stringify(schema)) // Convert back to YAML format
    });

  } catch (error) {
    console.error('Failed to get custom connector:', error);
    res.status(500).json({
      error: 'Failed to get custom connector details',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Delete custom connector
 * DELETE /api/custom-connectors/:kb_id
 */
router.delete('/:kb_id', async (req, res) => {
  try {
    const { kb_id } = req.params;
    
    if (!registeredSchemas.has(kb_id)) {
      return res.status(404).json({
        error: `Custom connector not found: ${kb_id}`
      });
    }

    // Prevent deletion of built-in connectors
    const builtInConnectors = ['confluence-kb', 'retail-kb', 'github-kb', 'slack-kb'];
    if (builtInConnectors.includes(kb_id)) {
      return res.status(400).json({
        error: 'Cannot delete built-in connector'
      });
    }

    registeredSchemas.delete(kb_id);

    res.json({
      success: true,
      message: `Custom connector deleted successfully: ${kb_id}`
    });

  } catch (error) {
    console.error('Failed to delete custom connector:', error);
    res.status(500).json({
      error: 'Failed to delete custom connector',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
