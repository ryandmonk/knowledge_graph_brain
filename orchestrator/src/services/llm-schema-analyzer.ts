import axios from 'axios';
import { OpenAPISpec, APIEndpoint, NodeMapping, RelationshipMapping, ConnectorConfig, OpenAPIParser } from './openapi-parser';

/**
 * LLM-Enhanced Schema Analyzer
 * Provides intelligent schema generation using existing GraphRAG agent infrastructure
 * Building on established LLM infrastructure with Ollama qwen3:8b model
 */

export interface SchemaAnalysisResult {
  enhancedNodes: EnhancedNodeMapping[];
  intelligentRelationships: IntelligentRelationshipMapping[];
  fieldMappingsSuggestions: FieldMappingSuggestion[];
  schemaOptimizations: SchemaOptimization[];
  confidence: number;
}

export interface EnhancedNodeMapping extends NodeMapping {
  entityType: 'primary' | 'secondary' | 'lookup';
  semanticCategory: string;
  businessContext: string;
  recommendedIndexes: string[];
  dataQuality: {
    keyStability: number; // 0-1 score
    propertyCompleteness: number; // 0-1 score
    businessRelevance: number; // 0-1 score
  };
}

export interface IntelligentRelationshipMapping extends RelationshipMapping {
  relationshipStrength: number; // 0-1 score
  businessSemantics: string;
  graphOptimization: 'high_cardinality' | 'low_cardinality' | 'hierarchical' | 'networked';
  queryPatterns: string[]; // Common Cypher patterns for this relationship
}

export interface FieldMappingSuggestion {
  field: string;
  suggestedJSONPath: string;
  confidence: number;
  alternatives: Array<{
    path: string;
    confidence: number;
    reason: string;
  }>;
  dataTransformation?: {
    type: 'date_parse' | 'string_normalize' | 'number_convert' | 'array_flatten';
    expression: string;
  };
}

export interface SchemaOptimization {
  type: 'merge_nodes' | 'split_node' | 'add_relationship' | 'optimize_indexes' | 'improve_mapping';
  description: string;
  impact: 'high' | 'medium' | 'low';
  implementation: string;
  reasoning: string;
}

export class LLMSchemaAnalyzer {
  private readonly ollamaUrl: string;
  private readonly ollamaModel: string;
  private readonly maxRetries = 3;

  constructor(ollamaModel: string = 'qwen3:8b') {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.ollamaModel = ollamaModel;

    console.log(`🧠 LLM Schema Analyzer initialized with model: ${ollamaModel}`);
  }

  /**
   * Analyze OpenAPI specification with AI-powered insights
   * Includes fallback strategies for very large specifications
   */
  async analyzeSchema(spec: OpenAPISpec, context?: {
    domain?: string;
    businessGoals?: string[];
    existingKnowledgeGraphs?: string[];
  }): Promise<SchemaAnalysisResult> {
    console.log('🔍 Starting LLM-enhanced schema analysis...');

    try {
      // Step 1: Get basic structure from existing parser
      const basicStructure = OpenAPIParser.inferDataStructure(spec);
      const endpoints = OpenAPIParser.extractEndpoints(spec);

      // Step 2: Aggressive optimization for M3 MAX + qwen3:8b consistency
      const specSize = JSON.stringify(spec).length;
      const nodeCount = basicStructure.nodes.length;
      const endpointCount = endpoints.length;
      
      console.log(`📊 Spec complexity: ${(specSize / 1024).toFixed(0)}KB, ${nodeCount} nodes, ${endpointCount} endpoints`);

      // Very aggressive thresholds for consistent performance
      if (specSize > 300000 || nodeCount > 10 || endpointCount > 30) {
        console.log('⚡ Using fast-path optimization for consistent performance');
        return this.analyzeLargeSpecOptimized(basicStructure, endpoints, spec, context);
      } else if (specSize > 100000 || nodeCount > 5) {
        console.log('🚀 Using selective analysis to maintain speed');
        return this.analyzeSelectiveOptimized(basicStructure, endpoints, spec, context);
      }

      // Step 3: Standard analysis for smaller specs
      const [enhancedNodes, intelligentRelationships, fieldMappings, optimizations] = await Promise.all([
        this.enhanceNodeMappings(basicStructure.nodes, spec, context),
        this.inferIntelligentRelationships(basicStructure.relationships, spec, context),
        this.generateFieldMappingSuggestions(endpoints, spec, context),
        this.identifySchemaOptimizations(basicStructure, spec, context)
      ]);

      // Step 4: Calculate overall confidence
      const confidence = this.calculateAnalysisConfidence(enhancedNodes, intelligentRelationships, fieldMappings);

      console.log(`✅ LLM schema analysis complete. Confidence: ${(confidence * 100).toFixed(1)}%`);

      return {
        enhancedNodes,
        intelligentRelationships,
        fieldMappingsSuggestions: fieldMappings,
        schemaOptimizations: optimizations,
        confidence
      };

    } catch (error) {
      console.error('❌ LLM schema analysis failed:', error);
      throw new Error(`Schema analysis failed: ${(error as Error).message}`);
    }
  }

  /**
   * Fast-path optimization for large specs - minimal LLM calls, maximum speed
   */
  private async analyzeLargeSpecOptimized(
    basicStructure: any, 
    endpoints: APIEndpoint[], 
    spec: OpenAPISpec, 
    context?: any
  ): Promise<SchemaAnalysisResult> {
    console.log('⚡ Fast-path analysis: Using intelligent defaults with minimal LLM calls');

    // Only analyze the top 3 most important nodes with LLM
    const topNodes = basicStructure.nodes
      .sort((a: NodeMapping, b: NodeMapping) => b.props.length - a.props.length)
      .slice(0, 3);

    let enhancedTopNodes: EnhancedNodeMapping[] = [];
    
    // Try LLM enhancement, but use smart defaults if it fails
    try {
      if (topNodes.length > 0) {
        enhancedTopNodes = await this.enhanceNodeMappings(topNodes, spec, context);
      }
    } catch (error) {
      console.warn('⚠️ LLM enhancement failed, using smart defaults for all nodes:', error);
      // Generate smart defaults for top nodes too
      enhancedTopNodes = topNodes.map((node: NodeMapping) => ({
        ...node,
        entityType: node.props.length > 5 ? 'primary' : 'secondary' as const,
        semanticCategory: this.inferCategoryFromName(node.label),
        businessContext: `${context?.domain || 'System'} entity: ${node.label}`,
        recommendedIndexes: [node.key, ...node.props.slice(0, 2)],
        dataQuality: {
          keyStability: 0.8,
          propertyCompleteness: 0.7,
          businessRelevance: 0.6
        }
      }));
    }

    // Generate smart defaults for remaining nodes
    const remainingNodes = basicStructure.nodes.slice(3).map((node: NodeMapping) => ({
      ...node,
      entityType: node.props.length > 5 ? 'primary' : 'secondary' as const,
      semanticCategory: this.inferCategoryFromName(node.label),
      businessContext: `${context?.domain || 'System'} entity: ${node.label}`,
      recommendedIndexes: [node.key, ...node.props.slice(0, 2)],
      dataQuality: {
        keyStability: 0.8,
        propertyCompleteness: 0.7,
        businessRelevance: 0.6
      }
    }));

    const allEnhancedNodes = [...enhancedTopNodes, ...remainingNodes];

    // Generate intelligent relationships without LLM
    const intelligentRelationships = this.generateSmartDefaultRelationships(
      basicStructure.relationships, 
      spec,
      context
    );

    // Generate basic field mappings
    const fieldMappings = this.generateBasicFieldMappings(endpoints.slice(0, 5)); // Only top 5 endpoints

    // Generate optimization recommendations
    const optimizations = this.generateBasicOptimizations(allEnhancedNodes, intelligentRelationships);

    return {
      enhancedNodes: allEnhancedNodes,
      intelligentRelationships,
      fieldMappingsSuggestions: fieldMappings,
      schemaOptimizations: optimizations,
      confidence: 0.75 // Good confidence for fast analysis
    };
  }

  /**
   * Selective optimization for medium specs - balanced LLM usage
   */
  private async analyzeSelectiveOptimized(
    basicStructure: any, 
    endpoints: APIEndpoint[], 
    spec: OpenAPISpec, 
    context?: any
  ): Promise<SchemaAnalysisResult> {
    console.log('🚀 Selective analysis: Balanced LLM usage for optimal speed/quality');

    // Analyze top 5 nodes with LLM, use smart defaults for rest
    const topNodes = basicStructure.nodes
      .sort((a: NodeMapping, b: NodeMapping) => b.props.length - a.props.length)
      .slice(0, 5);

    let enhancedTopNodes: EnhancedNodeMapping[] = [];
    let basicRelationships: IntelligentRelationshipMapping[] = [];

    // Try LLM enhancement with full fallback
    try {
      const [enhancedNodesResult, relationshipsResult] = await Promise.all([
        this.enhanceNodeMappings(topNodes, spec, context),
        this.inferIntelligentRelationships(basicStructure.relationships.slice(0, 3), spec, context)
      ]);
      enhancedTopNodes = enhancedNodesResult;
      basicRelationships = relationshipsResult;
    } catch (error) {
      console.warn('⚠️ LLM enhancement failed in selective mode, using smart defaults:', error);
      // Generate smart defaults for top nodes
      enhancedTopNodes = topNodes.map((node: NodeMapping) => ({
        ...node,
        entityType: node.props.length > 5 ? 'primary' : 'secondary' as const,
        semanticCategory: this.inferCategoryFromName(node.label),
        businessContext: `${context?.domain || 'System'} entity: ${node.label}`,
        recommendedIndexes: [node.key, ...node.props.slice(0, 2)],
        dataQuality: {
          keyStability: 0.8,
          propertyCompleteness: 0.7,
          businessRelevance: 0.6
        }
      }));
      // Generate smart default relationships
      basicRelationships = this.generateSmartDefaultRelationships(
        basicStructure.relationships.slice(0, 3), 
        spec,
        context
      );
    }

    // Smart defaults for remaining nodes
    const remainingNodes = basicStructure.nodes.slice(5).map((node: NodeMapping) => ({
      ...node,
      entityType: node.props.length > 5 ? 'primary' : 'secondary' as const,
      semanticCategory: this.inferCategoryFromName(node.label),
      businessContext: `${context?.domain || 'System'} entity: ${node.label}`,
      recommendedIndexes: [node.key, ...node.props.slice(0, 2)],
      dataQuality: {
        keyStability: 0.8,
        propertyCompleteness: 0.7,
        businessRelevance: 0.6
      }
    }));

    const allEnhancedNodes = [...enhancedTopNodes, ...remainingNodes];

    // Generate field mappings for top endpoints only
    const fieldMappings = this.generateBasicFieldMappings(endpoints.slice(0, 8));

    // Generate optimizations
    const optimizations = this.generateBasicOptimizations(allEnhancedNodes, basicRelationships);

    return {
      enhancedNodes: allEnhancedNodes,
      intelligentRelationships: basicRelationships,
      fieldMappingsSuggestions: fieldMappings,
      schemaOptimizations: optimizations,
      confidence: 0.85 // Higher confidence for selective analysis
    };
  }

  /**
   * Enhance basic node mappings with AI insights
   * Uses chunking for large specifications to avoid timeout issues
   */
  private async enhanceNodeMappings(
    basicNodes: NodeMapping[], 
    spec: OpenAPISpec, 
    context?: any
  ): Promise<EnhancedNodeMapping[]> {
    const enhancedNodes: EnhancedNodeMapping[] = [];
    
    // Process nodes in chunks for large specifications
    const chunkSize = Math.min(5, basicNodes.length); // Max 5 nodes per LLM call
    const chunks = [];
    for (let i = 0; i < basicNodes.length; i += chunkSize) {
      chunks.push(basicNodes.slice(i, i + chunkSize));
    }

    console.log(`🔍 Processing ${basicNodes.length} nodes in ${chunks.length} chunks of max ${chunkSize}`);

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      console.log(`📊 Processing chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} nodes)`);
      
      try {
        const prompt = this.buildBatchNodeAnalysisPrompt(chunk, spec, context);
        const response = await this.callLLMWithRetry(prompt);
        const enhancements = this.parseBatchNodeEnhancement(response, chunk);
        enhancedNodes.push(...enhancements);
      } catch (error) {
        console.warn(`⚠️ Failed to enhance chunk ${chunkIndex + 1}, using basic mappings:`, error);
        // Fallback to basic nodes with minimal enhancement
        for (const node of chunk) {
          enhancedNodes.push({
            ...node,
            entityType: 'secondary',
            semanticCategory: 'general',
            businessContext: `Entity representing ${node.label}`,
            recommendedIndexes: [node.key],
            dataQuality: {
              keyStability: 0.7,
              propertyCompleteness: 0.6,
              businessRelevance: 0.5
            }
          });
        }
      }
    }

    return enhancedNodes;
  }

  /**
   * Generate intelligent relationship mappings using LLM
   */
  private async inferIntelligentRelationships(
    basicRelationships: RelationshipMapping[], 
    spec: OpenAPISpec, 
    context?: any
  ): Promise<IntelligentRelationshipMapping[]> {
    if (basicRelationships.length === 0) {
      // No basic relationships found, let LLM suggest some
      return this.suggestRelationshipsFromSchema(spec, context);
    }

    const intelligentRelationships: IntelligentRelationshipMapping[] = [];

    for (const rel of basicRelationships) {
      try {
        const prompt = this.buildRelationshipAnalysisPrompt(rel, spec, context);
        const response = await this.callLLMWithRetry(prompt);
        const enhancement = this.parseRelationshipEnhancement(response, rel);
        intelligentRelationships.push(enhancement);
      } catch (error) {
        console.warn(`⚠️ Failed to enhance relationship ${rel.type}, using basic mapping:`, error);
        // Fallback to basic relationship with minimal enhancement
        intelligentRelationships.push({
          ...rel,
          relationshipStrength: 0.5,
          businessSemantics: `Relationship between ${rel.from} and ${rel.to}`,
          graphOptimization: 'networked',
          queryPatterns: [`MATCH (a:${rel.from})-[:${rel.type}]->(b:${rel.to}) RETURN a, b`]
        });
      }
    }

    return intelligentRelationships;
  }

  /**
   * Generate smart field mapping suggestions
   */
  private async generateFieldMappingSuggestions(
    endpoints: APIEndpoint[], 
    spec: OpenAPISpec, 
    context?: any
  ): Promise<FieldMappingSuggestion[]> {
    const suggestions: FieldMappingSuggestion[] = [];

    // Analyze response schemas to suggest optimal JSONPath mappings
    for (const endpoint of endpoints.slice(0, 5)) { // Limit to first 5 endpoints
      try {
        const prompt = this.buildFieldMappingPrompt(endpoint, spec, context);
        const response = await this.callLLMWithRetry(prompt);
        const endpointSuggestions = this.parseFieldMappingSuggestions(response, endpoint);
        suggestions.push(...endpointSuggestions);
      } catch (error) {
        console.warn(`⚠️ Failed to analyze endpoint ${endpoint.path}, skipping:`, error);
      }
    }

    return suggestions;
  }

  /**
   * Identify schema optimization opportunities
   */
  private async identifySchemaOptimizations(
    basicStructure: { nodes: NodeMapping[]; relationships: RelationshipMapping[] },
    spec: OpenAPISpec,
    context?: any
  ): Promise<SchemaOptimization[]> {
    try {
      const prompt = this.buildOptimizationPrompt(basicStructure, spec, context);
      const response = await this.callLLMWithRetry(prompt);
      return this.parseOptimizationSuggestions(response);
    } catch (error) {
      console.warn('⚠️ Failed to generate optimization suggestions:', error);
      return [];
    }
  }

  /**
   * Build LLM prompt for node analysis
   */
  private buildNodeAnalysisPrompt(node: NodeMapping, spec: OpenAPISpec, context?: any): string {
    return `Analyze this API entity for knowledge graph optimization:

API: ${spec.info.title}
Entity: ${node.label}
Properties: ${node.props.join(', ')}
Key Field: ${node.key}
${context?.domain ? `Domain: ${context.domain}` : ''}

Provide analysis in JSON format:
{
  "entityType": "primary|secondary|lookup",
  "semanticCategory": "brief category description",
  "businessContext": "business meaning and importance",
  "recommendedIndexes": ["field1", "field2"],
  "dataQuality": {
    "keyStability": 0.0-1.0,
    "propertyCompleteness": 0.0-1.0,
    "businessRelevance": 0.0-1.0
  }
}

Focus on graph query optimization and business value.`;
  }

  /**
   * Build LLM prompt for batch node analysis (more efficient for large specs)
   */
  private buildBatchNodeAnalysisPrompt(nodes: NodeMapping[], spec: OpenAPISpec, context?: any): string {
    const nodeDescriptions = nodes.map(node => 
      `- ${node.label}: [${node.props.join(', ')}] (key: ${node.key})`
    ).join('\n');

    return `Analyze these API entities for knowledge graph optimization:

API: ${spec.info.title}
${context?.domain ? `Domain: ${context.domain}` : ''}

Entities:
${nodeDescriptions}

Provide analysis for ALL entities in JSON array format:
[
  {
    "label": "EntityName",
    "entityType": "primary|secondary|lookup",
    "semanticCategory": "brief category description",
    "businessContext": "business meaning and importance",
    "recommendedIndexes": ["field1", "field2"],
    "dataQuality": {
      "keyStability": 0.0-1.0,
      "propertyCompleteness": 0.0-1.0,
      "businessRelevance": 0.0-1.0
    }
  }
]

Focus on graph query optimization and business value. Return valid JSON array.`;
  }

  /**
   * Build LLM prompt for relationship analysis
   */
  private buildRelationshipAnalysisPrompt(rel: RelationshipMapping, spec: OpenAPISpec, context?: any): string {
    return `Analyze this entity relationship for graph optimization:

API: ${spec.info.title}
Relationship: ${rel.from} -[${rel.type}]-> ${rel.to}
${rel.description ? `Description: ${rel.description}` : ''}
${context?.domain ? `Domain: ${context.domain}` : ''}

Provide analysis in JSON format:
{
  "relationshipStrength": 0.0-1.0,
  "businessSemantics": "business meaning of this relationship",
  "graphOptimization": "high_cardinality|low_cardinality|hierarchical|networked",
  "queryPatterns": ["common cypher patterns for this relationship"]
}

Focus on query performance and business logic.`;
  }

  /**
   * Build LLM prompt for field mapping analysis
   */
  private buildFieldMappingPrompt(endpoint: APIEndpoint, spec: OpenAPISpec, context?: any): string {
    const responseSchema = this.extractResponseSchema(endpoint, spec);
    
    return `Analyze this API endpoint for optimal field mappings:

Endpoint: ${endpoint.method.toUpperCase()} ${endpoint.path}
${endpoint.summary ? `Summary: ${endpoint.summary}` : ''}
Response Schema: ${JSON.stringify(responseSchema, null, 2)}

Suggest optimal JSONPath mappings in JSON format:
{
  "mappings": [
    {
      "field": "property_name",
      "suggestedJSONPath": "$.optimal.path",
      "confidence": 0.0-1.0,
      "alternatives": [
        {"path": "$.alternative", "confidence": 0.0-1.0, "reason": "explanation"}
      ],
      "dataTransformation": {
        "type": "date_parse|string_normalize|number_convert|array_flatten",
        "expression": "transformation logic"
      }
    }
  ]
}

Focus on robust data extraction and type safety.`;
  }

  /**
   * Build LLM prompt for optimization analysis
   */
  private buildOptimizationPrompt(
    structure: { nodes: NodeMapping[]; relationships: RelationshipMapping[] },
    spec: OpenAPISpec,
    context?: any
  ): string {
    return `Analyze this schema structure for optimization opportunities:

API: ${spec.info.title}
Nodes: ${structure.nodes.map(n => n.label).join(', ')}
Relationships: ${structure.relationships.map(r => `${r.from}-[${r.type}]->${r.to}`).join(', ')}
${context?.domain ? `Domain: ${context.domain}` : ''}

Suggest optimizations in JSON format:
{
  "optimizations": [
    {
      "type": "merge_nodes|split_node|add_relationship|optimize_indexes|improve_mapping",
      "description": "what to do",
      "impact": "high|medium|low",
      "implementation": "how to implement",
      "reasoning": "why this helps"
    }
  ]
}

Focus on query performance, data consistency, and business logic.`;
  }

  /**
   * Call LLM via HTTP API with retry logic
   */
  private async callLLMWithRetry(prompt: string): Promise<string> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
          model: this.ollamaModel,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.2, // Slightly higher for creative schema insights
            num_predict: 2048 // Ensure enough tokens for detailed analysis
          }
        }, {
          timeout: 600000 // 10 minutes timeout for very large spec analysis
        });

        if (response.data && response.data.response) {
          return response.data.response;
        } else {
          throw new Error('Invalid response format from Ollama API');
        }
      } catch (error) {
        console.warn(`LLM call attempt ${attempt} failed:`, error);
        if (attempt === this.maxRetries) {
          throw error;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    throw new Error('All LLM call attempts failed');
  }

  /**
   * Parse node enhancement response from LLM
   */
  private parseNodeEnhancement(response: string, originalNode: NodeMapping): EnhancedNodeMapping {
    try {
      // Clean the response to extract JSON - handle thinking tokens and other artifacts
      const cleanedResponse = this.extractJsonFromResponse(response);
      const parsed = JSON.parse(cleanedResponse);
      
      return {
        ...originalNode,
        entityType: parsed.entityType || 'secondary',
        semanticCategory: parsed.semanticCategory || 'general',
        businessContext: parsed.businessContext || `Entity representing ${originalNode.label}`,
        recommendedIndexes: parsed.recommendedIndexes || [originalNode.key],
        dataQuality: {
          keyStability: parsed.dataQuality?.keyStability || 0.7,
          propertyCompleteness: parsed.dataQuality?.propertyCompleteness || 0.6,
          businessRelevance: parsed.dataQuality?.businessRelevance || 0.5
        }
      };
    } catch (error) {
      console.warn('Failed to parse node enhancement, using defaults:', error);
      return {
        ...originalNode,
        entityType: 'secondary',
        semanticCategory: 'general',
        businessContext: `Entity representing ${originalNode.label}`,
        recommendedIndexes: [originalNode.key],
        dataQuality: {
          keyStability: 0.7,
          propertyCompleteness: 0.6,
          businessRelevance: 0.5
        }
      };
    }
  }

  /**
   * Parse batch node enhancement response from LLM
   */
  private parseBatchNodeEnhancement(response: string, originalNodes: NodeMapping[]): EnhancedNodeMapping[] {
    try {
      // Clean the response to extract JSON - handle thinking tokens and other artifacts
      const cleanedResponse = this.extractJsonFromResponse(response);
      const parsed = JSON.parse(cleanedResponse);
      
      if (!Array.isArray(parsed)) {
        throw new Error('Expected JSON array from batch analysis');
      }

      const enhancedNodes: EnhancedNodeMapping[] = [];
      
      for (const originalNode of originalNodes) {
        // Find the corresponding analysis by label
        const analysis = parsed.find(p => p.label === originalNode.label);
        
        if (analysis) {
          enhancedNodes.push({
            ...originalNode,
            entityType: analysis.entityType || 'secondary',
            semanticCategory: analysis.semanticCategory || 'general',
            businessContext: analysis.businessContext || `Entity representing ${originalNode.label}`,
            recommendedIndexes: analysis.recommendedIndexes || [originalNode.key],
            dataQuality: {
              keyStability: analysis.dataQuality?.keyStability || 0.7,
              propertyCompleteness: analysis.dataQuality?.propertyCompleteness || 0.6,
              businessRelevance: analysis.dataQuality?.businessRelevance || 0.5
            }
          });
        } else {
          // Fallback if no analysis found for this node
          enhancedNodes.push({
            ...originalNode,
            entityType: 'secondary',
            semanticCategory: 'general',
            businessContext: `Entity representing ${originalNode.label}`,
            recommendedIndexes: [originalNode.key],
            dataQuality: {
              keyStability: 0.7,
              propertyCompleteness: 0.6,
              businessRelevance: 0.5
            }
          });
        }
      }

      return enhancedNodes;
    } catch (error) {
      console.warn('Failed to parse batch node enhancement, using defaults:', error);
      // Return fallback enhancements for all nodes
      return originalNodes.map(originalNode => ({
        ...originalNode,
        entityType: 'secondary' as const,
        semanticCategory: 'general',
        businessContext: `Entity representing ${originalNode.label}`,
        recommendedIndexes: [originalNode.key],
        dataQuality: {
          keyStability: 0.7,
          propertyCompleteness: 0.6,
          businessRelevance: 0.5
        }
      }));
    }
  }

  /**
   * Parse relationship enhancement response from LLM
   */
  private parseRelationshipEnhancement(response: string, originalRel: RelationshipMapping): IntelligentRelationshipMapping {
    try {
      const cleanedResponse = this.extractJsonFromResponse(response);
      const parsed = JSON.parse(cleanedResponse);
      return {
        ...originalRel,
        relationshipStrength: parsed.relationshipStrength || 0.5,
        businessSemantics: parsed.businessSemantics || `Relationship between ${originalRel.from} and ${originalRel.to}`,
        graphOptimization: parsed.graphOptimization || 'networked',
        queryPatterns: parsed.queryPatterns || [`MATCH (a:${originalRel.from})-[:${originalRel.type}]->(b:${originalRel.to}) RETURN a, b`]
      };
    } catch (error) {
      console.warn('Failed to parse relationship enhancement, using defaults:', error);
      return {
        ...originalRel,
        relationshipStrength: 0.5,
        businessSemantics: `Relationship between ${originalRel.from} and ${originalRel.to}`,
        graphOptimization: 'networked',
        queryPatterns: [`MATCH (a:${originalRel.from})-[:${originalRel.type}]->(b:${originalRel.to}) RETURN a, b`]
      };
    }
  }

  /**
   * Parse field mapping suggestions from LLM response
   */
  private parseFieldMappingSuggestions(response: string, endpoint: APIEndpoint): FieldMappingSuggestion[] {
    try {
      const cleanedResponse = this.extractJsonFromResponse(response);
      const parsed = JSON.parse(cleanedResponse);
      return parsed.mappings || [];
    } catch (error) {
      console.warn(`Failed to parse field mapping suggestions for ${endpoint.path}:`, error);
      return [];
    }
  }

  /**
   * Parse optimization suggestions from LLM response
   */
  private parseOptimizationSuggestions(response: string): SchemaOptimization[] {
    try {
      const cleanedResponse = this.extractJsonFromResponse(response);
      const parsed = JSON.parse(cleanedResponse);
      return parsed.optimizations || [];
    } catch (error) {
      console.warn('Failed to parse optimization suggestions:', error);
      return [];
    }
  }

  /**
   * Calculate overall analysis confidence
   */
  private calculateAnalysisConfidence(
    nodes: EnhancedNodeMapping[], 
    relationships: IntelligentRelationshipMapping[], 
    fieldMappings: FieldMappingSuggestion[]
  ): number {
    if (nodes.length === 0) return 0;

    const nodeConfidence = nodes.reduce((sum, node) => sum + node.dataQuality.businessRelevance, 0) / nodes.length;
    const relationshipConfidence = relationships.length > 0 
      ? relationships.reduce((sum, rel) => sum + rel.relationshipStrength, 0) / relationships.length
      : 0.5;
    const mappingConfidence = fieldMappings.length > 0
      ? fieldMappings.reduce((sum, mapping) => sum + mapping.confidence, 0) / fieldMappings.length
      : 0.6;

    return (nodeConfidence * 0.4 + relationshipConfidence * 0.3 + mappingConfidence * 0.3);
  }

  /**
   * Suggest relationships when none found in basic analysis
   */
  private async suggestRelationshipsFromSchema(spec: OpenAPISpec, context?: any): Promise<IntelligentRelationshipMapping[]> {
    try {
      const prompt = `Analyze this API to suggest entity relationships:

API: ${spec.info.title}
Description: ${spec.info.description || 'No description provided'}
Schemas: ${JSON.stringify(Object.keys(spec.components?.schemas || {}), null, 2)}
${context?.domain ? `Domain: ${context.domain}` : ''}

Suggest relationships in JSON format:
{
  "relationships": [
    {
      "type": "RELATIONSHIP_NAME",
      "from": "SourceEntity", 
      "to": "TargetEntity",
      "description": "relationship description",
      "relationshipStrength": 0.0-1.0,
      "businessSemantics": "business meaning",
      "graphOptimization": "high_cardinality|low_cardinality|hierarchical|networked",
      "queryPatterns": ["cypher patterns"]
    }
  ]
}`;

      const response = await this.callLLMWithRetry(prompt);
      const cleanedResponse = this.extractJsonFromResponse(response);
      const parsed = JSON.parse(cleanedResponse);
      return parsed.relationships || [];
    } catch (error) {
      console.warn('Failed to suggest relationships from schema:', error);
      return [];
    }
  }

  /**
   * Extract response schema from endpoint definition
   */
  private extractResponseSchema(endpoint: APIEndpoint, spec: OpenAPISpec): any {
    const response200 = endpoint.responses['200'];
    if (!response200?.content) return {};

    const jsonContent = response200.content['application/json'];
    if (!jsonContent?.schema) return {};

    return jsonContent.schema;
  }

  /**
   * Helper methods for aggressive optimization
   */
  private inferCategoryFromName(label: string): string {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('user') || lowerLabel.includes('person') || lowerLabel.includes('account')) return 'identity';
    if (lowerLabel.includes('project') || lowerLabel.includes('issue') || lowerLabel.includes('ticket')) return 'work_item';
    if (lowerLabel.includes('comment') || lowerLabel.includes('attachment') || lowerLabel.includes('file')) return 'content';
    if (lowerLabel.includes('status') || lowerLabel.includes('priority') || lowerLabel.includes('type')) return 'metadata';
    if (lowerLabel.includes('organization') || lowerLabel.includes('team') || lowerLabel.includes('group')) return 'organizational';
    return 'entity';
  }

  private generateSmartDefaultRelationships(
    basicRelationships: RelationshipMapping[], 
    spec: OpenAPISpec, 
    context?: any
  ): IntelligentRelationshipMapping[] {
    return basicRelationships.map(rel => ({
      ...rel,
      relationshipStrength: 0.7,
      businessSemantics: `${rel.from} ${rel.type.toLowerCase().replace('_', ' ')} ${rel.to}`,
      graphOptimization: rel.type.includes('MANY') ? 'high_cardinality' : 'low_cardinality' as const,
      queryPatterns: [`MATCH (a:${rel.from})-[:${rel.type}]->(b:${rel.to}) RETURN a, b LIMIT 100`]
    }));
  }

  private generateBasicFieldMappings(endpoints: APIEndpoint[]): FieldMappingSuggestion[] {
    const mappings: FieldMappingSuggestion[] = [];
    
    endpoints.forEach(endpoint => {
      // Generate basic field mappings for common fields
      ['id', 'name', 'title', 'description', 'status', 'created', 'updated'].forEach(field => {
        mappings.push({
          field,
          suggestedJSONPath: `$.${field}`,
          confidence: 0.8,
          alternatives: [
            { path: `$.${field}`, confidence: 0.8, reason: 'Direct field mapping' },
            { path: `$.data.${field}`, confidence: 0.6, reason: 'Nested data structure' }
          ]
        });
      });
    });

    return mappings.slice(0, 20); // Limit to prevent bloat
  }

  private generateBasicOptimizations(
    nodes: EnhancedNodeMapping[], 
    relationships: IntelligentRelationshipMapping[]
  ): SchemaOptimization[] {
    const optimizations: SchemaOptimization[] = [];

    // Index recommendations
    const primaryNodes = nodes.filter(n => n.entityType === 'primary');
    if (primaryNodes.length > 0) {
      optimizations.push({
        type: 'optimize_indexes',
        description: `Create indexes on primary entity key fields: ${primaryNodes.map(n => n.key).join(', ')}`,
        impact: 'high',
        reasoning: 'Primary entities need fast key-based lookups for optimal query performance',
        implementation: primaryNodes.map(n => `CREATE INDEX IF NOT EXISTS FOR (n:${n.label}) ON (n.${n.key})`).join('; ')
      });
    }

    // Relationship optimization
    const highCardinalityRels = relationships.filter(r => r.graphOptimization === 'high_cardinality');
    if (highCardinalityRels.length > 0) {
      optimizations.push({
        type: 'add_relationship',
        description: 'Consider partitioning strategies for high-cardinality relationships',
        impact: 'medium',
        reasoning: 'High-cardinality relationships can impact traversal performance',
        implementation: 'Review query patterns and consider relationship direction optimization'
      });
    }

    return optimizations;
  }

  /**
   * Extract JSON from LLM response, handling thinking tokens and other artifacts
   */
  private extractJsonFromResponse(response: string): string {
    try {
      // Remove thinking tokens and similar artifacts
      let cleaned = response.trim();
      
      // Remove common LLM artifacts (more comprehensive)
      cleaned = cleaned.replace(/<think>.*?<\/think>/gs, '');
      cleaned = cleaned.replace(/<thinking>.*?<\/thinking>/gs, '');
      cleaned = cleaned.replace(/```json\s*/g, '');
      cleaned = cleaned.replace(/```\s*/g, '');
      
      // More aggressive JSON extraction - find the largest valid JSON structure
      const jsonPatterns = [
        /(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/g, // Objects
        /(\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\])/g // Arrays
      ];
      
      let bestMatch = '';
      for (const pattern of jsonPatterns) {
        const matches = cleaned.match(pattern);
        if (matches) {
          for (const match of matches) {
            if (match.length > bestMatch.length) {
              try {
                JSON.parse(match);
                bestMatch = match;
              } catch {
                // Invalid JSON, continue searching
              }
            }
          }
        }
      }
      
      if (bestMatch) {
        return bestMatch;
      }
      
      // Fallback: try line-by-line parsing for malformed JSON
      const lines = cleaned.split('\n');
      let jsonStart = -1;
      let jsonEnd = -1;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if ((line.startsWith('{') || line.startsWith('[')) && jsonStart === -1) {
          jsonStart = i;
        }
        if ((line.endsWith('}') || line.endsWith(']')) && jsonStart !== -1) {
          jsonEnd = i;
          break;
        }
      }
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const potentialJson = lines.slice(jsonStart, jsonEnd + 1).join('\n');
        try {
          JSON.parse(potentialJson);
          return potentialJson;
        } catch {
          // Still invalid, fall through to fallback
        }
      }
      
      // Ultimate fallback - return safe empty structure
      throw new Error('No valid JSON found in response');
      
    } catch (error) {
      console.warn('⚠️ Failed to extract valid JSON from LLM response, using fallback:', error);
      console.warn('Response excerpt:', response.substring(0, 500));
      
      // Return a safe fallback based on response content
      if (response.includes('[') || response.includes('array')) {
        return '[]'; // Empty array fallback
      } else {
        return '{}'; // Empty object fallback
      }
    }
  }
}
