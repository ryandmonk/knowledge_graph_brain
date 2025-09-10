import axios, { AxiosInstance, AxiosError } from 'axios';

export interface SystemStatus {
  service: string;
  version: string;
  uptime_seconds: number;
  neo4j_connected: boolean;
  total_kbs: number;
  total_nodes: number;
  total_relationships: number;
  knowledge_bases: KnowledgeBase[];
  health_score: number;
  active_runs: number;
  total_runs_completed: number;
  total_errors: number;
  memory_usage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  last_activity: number;
}

export interface KnowledgeBase {
  kb_id: string;
  created_at: string;
  updated_at: string;
  schema_version: number;
  total_nodes: number;
  total_relationships: number;
  sources: Source[];
  last_error: string | null;
  last_error_at: string | null;
  last_successful_sync: string | null;
  avg_ingestion_time_ms?: number;
  data_freshness_hours?: number;
  node_types: string[];
  health_status: 'healthy' | 'warning' | 'error' | 'stale';
}

export interface Source {
  source_id: string;
  connector_url: string;
  last_sync_status: 'running' | 'completed' | 'error' | null;
  last_sync_at: string | null;
  last_error: string | null;
  records_count: number;
}

export interface ServiceHealthCheck {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'checking';
  message?: string;
  port?: number;
}

export interface SetupProgress {
  neo4j: ServiceHealthCheck;
  ollama: ServiceHealthCheck;
  orchestrator: ServiceHealthCheck;
  connectors: ServiceHealthCheck[];
}

export interface EnvironmentConfig {
  DEMO_MODE: boolean;
  NEO4J_URI: string;
  NEO4J_USER: string;
  NEO4J_PASSWORD: string;
  NEO4J_DATABASE: string;
  EMBEDDING_PROVIDER: 'ollama' | 'openai';
  EMBEDDING_MODEL: string;
  OLLAMA_BASE_URL: string;
  LLM_MODEL: string;
  OPENAI_API_KEY?: string;
}

export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
  digest: string;
}

export interface OllamaModelsResponse {
  success: boolean;
  models: OllamaModel[];
  current_model: string;
  ollama_url: string;
}

// GraphRAG Interfaces
export interface Citation {
  node_id: string;
  node_type: string[];
  relevance_score?: number;
  source_data: any;
  supporting_evidence: string;
  confidence: number;
}

export interface ProvenanceStep {
  step: number;
  action: string;
  tool_used: string;
  query_executed: string;
  results_found: number;
  key_findings: string[];
}

export interface ConfidenceBreakdown {
  overall_confidence: number;
  semantic_confidence: number;
  graph_confidence: number;
  synthesis_confidence: number;
  reasoning: string;
}

export interface GraphRAGResponse {
  success: boolean;
  question: string;
  kb_id: string;
  answer: string;
  citations: Citation[];
  provenance_chain: ProvenanceStep[];
  confidence_breakdown: ConfidenceBreakdown;
  timestamp: string;
}

class KnowledgeGraphAPI {
  private client: AxiosInstance;

  constructor(baseURL: string = 'http://localhost:3000') {
    this.client = axios.create({
      baseURL,
      timeout: 60000, // 60 seconds for general requests
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for better error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 404) {
          throw new Error('Service not found - is the orchestrator running?');
        }
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Cannot connect to orchestrator - please check if it\'s running on port 3000');
        }
        throw error;
      }
    );
  }

  // System Health & Status
  async getSystemHealth(): Promise<{ status: SystemStatus; alerts: any[] }> {
    const response = await this.client.get('/api/health');
    return response.data;
  }

  async getSystemStatus(): Promise<SystemStatus> {
    const response = await this.client.get('/api/status');
    return response.data;
  }

  async askQuestion(question: string, kb_id: string = 'retail-demo'): Promise<GraphRAGResponse> {
    // GraphRAG queries can take longer than normal requests (up to 2 minutes)
    const response = await this.client.post('/api/ask', {
      question,
      kb_id
    }, {
      timeout: 120000 // 2 minutes for GraphRAG processing
    });
    return response.data;
  }

  async basicHealthCheck(): Promise<{ status: string; service: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  // Setup Wizard APIs
  async checkService(url: string): Promise<ServiceHealthCheck> {
    try {
      await axios.get(url, { timeout: 5000 });
      return {
        name: this.getServiceName(url),
        url,
        status: 'healthy',
        message: 'Service is running',
        port: this.extractPort(url)
      };
    } catch (error) {
      return {
        name: this.getServiceName(url),
        url,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Service unavailable',
        port: this.extractPort(url)
      };
    }
  }

  async checkAllServices(): Promise<SetupProgress> {
    const services = [
      { name: 'neo4j', url: 'http://localhost:7474' },
      { name: 'ollama', url: 'http://localhost:11434/api/tags' },
      { name: 'orchestrator', url: 'http://localhost:3000/api/health' },
      { name: 'github-connector', url: 'http://localhost:3001/health' },
      { name: 'confluence-connector', url: 'http://localhost:3004/health' },
      { name: 'slack-connector', url: 'http://localhost:3003/health' }
    ];

    const results = await Promise.all(
      services.map(service => this.checkService(service.url))
    );

    return {
      neo4j: results[0],
      ollama: results[1], 
      orchestrator: results[2],
      connectors: results.slice(3)
    };
  }

  // Environment Configuration
  async getEnvironmentConfig(): Promise<EnvironmentConfig> {
    try {
      const response = await this.client.get('/api/config');
      return response.data;
    } catch (error) {
      // Fallback - get config from system status
      console.warn('Could not get environment config, using fallback:', error);
      return {
        DEMO_MODE: true, // We'll detect this from the system
        NEO4J_URI: 'bolt://localhost:7687',
        NEO4J_USER: 'neo4j', 
        NEO4J_PASSWORD: 'password',
        NEO4J_DATABASE: 'neo4j',
        EMBEDDING_PROVIDER: 'ollama',
        EMBEDDING_MODEL: 'mxbai-embed-large',
        OLLAMA_BASE_URL: 'http://localhost:11434',
        LLM_MODEL: 'qwen3:8b'
      };
    }
  }

  async getConfig(): Promise<EnvironmentConfig & { environment: Record<string, string> }> {
    const response = await this.client.get('/api/config');
    return response.data;
  }

  async updateConfig(config: { DEMO_MODE?: boolean; [key: string]: any }): Promise<any> {
    const response = await this.client.post('/api/config', config);
    return response.data;
  }

  async restartServices(): Promise<any> {
    const response = await this.client.post('/api/services/restart');
    return response.data;
  }

  async getConnectors(): Promise<any[]> {
    const response = await this.client.get('/api/connectors');
    return response.data;
  }

  async testConnector(connectorId: string): Promise<any> {
    const response = await this.client.post(`/api/connectors/${connectorId}/test`);
    return response.data;
  }

  async getConnectorConfig(connectorId: string): Promise<any> {
    const response = await this.client.get(`/api/connectors/${connectorId}/config`);
    return response.data;
  }

  async updateConnectorConfig(connectorId: string, config: { credentials?: any; port?: number }): Promise<any> {
    const response = await this.client.post(`/api/connectors/${connectorId}/config`, config);
    return response.data;
  }

  async getPortStatus(): Promise<any> {
    const response = await this.client.get('/api/ports/status');
    return response.data;
  }

  async updateEnvironmentConfig(config: Partial<EnvironmentConfig>): Promise<void> {
    // This endpoint doesn't exist yet - we'll add it to the orchestrator
    await this.client.post('/api/config', config);
  }

  // Ollama Model Management
  async getAvailableModels(): Promise<OllamaModelsResponse> {
    const response = await this.client.get('/api/ollama/models');
    return response.data;
  }

  async updateLLMModel(model: string): Promise<{ success: boolean; message: string; requiresRestart: boolean; affectedServices: string[] }> {
    const response = await this.client.post('/api/config/llm', { model });
    return response.data;
  }

  // Knowledge Base Management
  async registerSchema(kb_id: string, schema_yaml: string): Promise<void> {
    await this.client.post('/api/register-schema', {
      kb_id,
      schema_yaml
    });
  }

  async startIngestion(kb_id: string, source_id: string): Promise<void> {
    await this.client.post('/api/ingest', {
      kb_id,
      source_id
    });
  }

  // Custom Connector Management
  async parseOpenAPISpec(params: {
    spec_content: string;
    kb_id: string;
    connector_url?: string;
  }): Promise<{
    success: boolean;
    message: string;
    generated_schema: any;
    validation_warnings?: any[];
    api_info: {
      title: string;
      version: string;
      description?: string;
      endpoints_found: number;
      schemas_found: number;
    };
  }> {
    const response = await this.client.post('/api/custom-connectors/parse-openapi', params);
    return response.data;
  }

  async parseOpenAPISpecEnhanced(params: {
    spec_content: string;
    kb_id: string;
    connector_url?: string;
    context?: {
      domain?: string;
      businessGoals?: string[];
      existingKnowledgeGraphs?: string[];
    };
  }): Promise<{
    success: boolean;
    message: string;
    generated_schema: any;
    validation_warnings?: any[];
    llm_insights: {
      confidence: number;
      enhanced_nodes: number;
      intelligent_relationships: number;
      field_suggestions: number;
      optimizations: number;
    };
    api_info: {
      title: string;
      version: string;
      description?: string;
      endpoints_found: number;
      schemas_found: number;
    };
  }> {
    // Determine timeout based on spec size - large specs need more time
    const specSizeKB = params.spec_content.length / 1024;
    let timeout = 180000; // 3 minutes default
    
    if (specSizeKB > 2000) { // >2MB specs like Jira
      timeout = 600000; // 10 minutes for very large specs
    } else if (specSizeKB > 500) { // >500KB specs  
      timeout = 300000; // 5 minutes for large specs
    }
    
    console.log(`🕐 Using ${timeout/1000}s timeout for ${Math.round(specSizeKB)}KB OpenAPI spec`);
    
    const response = await this.client.post('/api/custom-connectors/parse-openapi-enhanced', params, {
      timeout: timeout
    });
    return response.data;
  }

  async analyzeRestAPI(params: {
    api_url: string;
    kb_id: string;
    auth_config?: any;
    sample_endpoints?: string[];
    context?: {
      domain?: string;
      businessGoals?: string[];
    };
  }): Promise<{
    success: boolean;
    message: string;
    generated_schema: any;
    validation_warnings?: any[];
    analysis_insights: {
      confidence: number;
      discovered_entities: number;
      inferred_relationships: number;
      field_mappings: number;
      optimization_opportunities: number;
    };
    recommendations: Array<{
      type: string;
      description: string;
      impact: 'high' | 'medium' | 'low';
    }>;
  }> {
    // Use extended timeout for REST API analysis with LLM
    const response = await this.client.post('/api/custom-connectors/analyze-rest-api', params, {
      timeout: 720000 // 12 minutes for LLM analysis
    });
    return response.data;
  }

  async registerCustomConnectorSchema(params: {
    schema_yaml: string;
    kb_id: string;
  }): Promise<{
    success: boolean;
    message: string;
    kb_id: string;
    validation_warnings?: any[];
    schema_summary: {
      nodes: number;
      relationships: number;
      sources: number;
    };
  }> {
    const response = await this.client.post('/api/custom-connectors/register', params);
    return response.data;
  }

  async getCustomConnectors(): Promise<{
    success: boolean;
    custom_connectors: Array<{
      kb_id: string;
      name: string;
      version: string;
      description?: string;
      created_from: string;
      nodes_count: number;
      relationships_count: number;
      sources_count: number;
    }>;
    total_count: number;
  }> {
    const response = await this.client.get('/api/custom-connectors');
    return response.data;
  }

  async getCustomConnector(kb_id: string): Promise<{
    success: boolean;
    kb_id: string;
    schema: any;
    schema_yaml: string;
  }> {
    const response = await this.client.get(`/api/custom-connectors/${kb_id}`);
    return response.data;
  }

  async deleteCustomConnector(kb_id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await this.client.delete(`/api/custom-connectors/${kb_id}`);
    return response.data;
  }

  // Utility methods
  private getServiceName(url: string): string {
    if (url.includes('7474')) return 'Neo4j';
    if (url.includes('11434')) return 'Ollama';
    if (url.includes('3000')) return 'Orchestrator';
    if (url.includes('3001')) return 'GitHub Connector';
    if (url.includes('3003')) return 'Slack Connector';
    if (url.includes('3004')) return 'Confluence Connector';
    return 'Unknown Service';
  }

  private extractPort(url: string): number | undefined {
    const match = url.match(/:(\d+)/);
    return match ? parseInt(match[1]) : undefined;
  }
}

export const api = new KnowledgeGraphAPI();
export default KnowledgeGraphAPI;
