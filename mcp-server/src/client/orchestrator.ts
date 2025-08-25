import axios, { AxiosInstance } from 'axios';

export interface KnowledgeBase {
  kb_id: string;
  health_status: 'healthy' | 'warning' | 'error' | 'stale';
  total_nodes: number;
  total_relationships: number;
  node_types: Record<string, number>;
  data_freshness_hours: number;
}

export interface SystemStatus {
  health_score: number;
  status: 'healthy' | 'warning' | 'error';
  neo4j_connected: boolean;
  embedding_provider: string;
  memory_usage_mb: number;
  uptime_hours: number;
  active_runs: number;
  knowledge_bases: KnowledgeBase[];
}

export interface SearchResult {
  node_id: string;
  labels: string[];
  score: number;
  content: string;
  properties: Record<string, any>;
}

export interface GraphResult {
  data: any[];
  summary: {
    total_records: number;
    execution_time_ms: number;
  };
}

/**
 * Client for interacting with the Knowledge Graph Brain Orchestrator
 */
export class OrchestratorClient {
  private client: AxiosInstance;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get comprehensive system health status
   */
  async getSystemHealth(): Promise<SystemStatus> {
    const response = await this.client.get('/api/health');
    return response.data;
  }

  /**
   * Get list of available knowledge bases
   */
  async listKnowledgeBases(): Promise<KnowledgeBase[]> {
    const health = await this.getSystemHealth();
    return health.knowledge_bases;
  }

  /**
   * Perform semantic search across a knowledge base
   */
  async semanticSearch(params: {
    kb_id: string;
    text: string;
    top_k?: number;
    labels?: string[];
    properties?: Record<string, any>;
  }): Promise<{ found: number; results: SearchResult[]; embedding_provider: string }> {
    const response = await this.client.post('/api/semantic-search', params);
    return response.data;
  }

  /**
   * Execute Cypher graph queries
   */
  async graphSearch(params: {
    kb_id: string;
    cypher: string;
    params?: Record<string, any>;
  }): Promise<GraphResult> {
    const response = await this.client.post('/api/search-graph', params);
    return response.data;
  }

  /**
   * Register a new knowledge base schema
   */
  async registerSchema(params: {
    kb_id: string;
    schema_yaml: string;
  }): Promise<{ success: boolean; kb_id: string; message: string }> {
    const response = await this.client.post('/api/register-schema', params);
    return response.data;
  }

  /**
   * Add a data source to a knowledge base
   */
  async addDataSource(params: {
    kb_id: string;
    source_id: string;
    connector_url: string;
    auth_ref?: string;
  }): Promise<{ success: boolean; message: string }> {
    const response = await this.client.post('/api/add-source', params);
    return response.data;
  }

  /**
   * Trigger data ingestion from a source
   */
  async ingestData(params: {
    kb_id: string;
    source_id: string;
  }): Promise<{ success: boolean; run_id: string; message: string }> {
    const response = await this.client.post('/api/ingest', params);
    return response.data;
  }

  /**
   * Get knowledge base status and recent runs
   */
  async getKnowledgeBaseStatus(kb_id: string): Promise<{
    kb_id: string;
    total_nodes: number;
    total_relationships: number;
    sources: any[];
    last_error: string | null;
  }> {
    const response = await this.client.get(`/api/sync-status/${kb_id}`);
    return response.data;
  }

  /**
   * Get schema information for a knowledge base
   */
  async getSchema(kb_id: string): Promise<{
    kb_id: string;
    schema: any;
    sources: string[];
  }> {
    // This endpoint might not exist yet, but we'll add it
    try {
      const response = await this.client.get(`/api/schema/${kb_id}`);
      return response.data;
    } catch (error) {
      // Fallback: get from status endpoint
      const status = await this.getKnowledgeBaseStatus(kb_id);
      return {
        kb_id,
        schema: null,
        sources: status.sources.map(s => s.source_id) || []
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'ok';
    } catch (error) {
      return false;
    }
  }
}
