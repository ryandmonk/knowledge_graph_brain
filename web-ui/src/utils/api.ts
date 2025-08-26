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

class KnowledgeGraphAPI {
  private client: AxiosInstance;

  constructor(baseURL: string = 'http://localhost:3000') {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
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
      { name: 'github-connector', url: 'http://localhost:3002/health' },
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

  // Utility methods
  private getServiceName(url: string): string {
    if (url.includes('7474')) return 'Neo4j';
    if (url.includes('11434')) return 'Ollama';
    if (url.includes('3000')) return 'Orchestrator';
    if (url.includes('3002')) return 'GitHub Connector';
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
