import * as dotenv from 'dotenv';
import * as path from 'path';

export interface BaseConfig {
  // Demo Mode Control
  DEMO_MODE: boolean;
  
  // Database
  NEO4J_URI: string;
  NEO4J_USER: string;
  NEO4J_PASSWORD: string;
  NEO4J_DATABASE: string;
  
  // AI/Embeddings
  EMBEDDING_PROVIDER: 'ollama' | 'openai';
  EMBEDDING_MODEL: string;
  OPENAI_API_KEY?: string;
  OLLAMA_BASE_URL: string;
  LLM_MODEL: string;
  
  // Service Ports
  ORCHESTRATOR_PORT: number;
  GITHUB_CONNECTOR_PORT: number;
  SLACK_CONNECTOR_PORT: number;
  CONFLUENCE_CONNECTOR_PORT: number;
  RETAIL_CONNECTOR_PORT: number;
  
  // Advanced
  LOG_LEVEL: string;
  NODE_ENV: string;
}

export interface ConnectorConfig extends BaseConfig {
  // Service-specific port (dynamically set)
  PORT: number;
  
  // Connector-specific auth (varies by connector)
  [key: string]: any;
}

/**
 * Loads configuration with hierarchical precedence:
 * 1. Environment variables
 * 2. Service-specific .env.local  
 * 3. Central .env file
 * 4. Central .env.example defaults
 */
export function loadConfig(serviceName?: string): BaseConfig {
  // Load central configuration first
  const rootDir = findProjectRoot();
  dotenv.config({ path: path.join(rootDir, '.env') });
  
  // Load service-specific overrides if provided
  if (serviceName) {
    const serviceDir = path.join(rootDir, serviceName);
    dotenv.config({ path: path.join(serviceDir, '.env.local') });
  }
  
  // Parse and validate configuration
  const config: BaseConfig = {
    // Demo Mode Control
    DEMO_MODE: process.env.DEMO_MODE?.toLowerCase() === 'true',
    
    // Database
    NEO4J_URI: process.env.NEO4J_URI || 'bolt://localhost:7687',
    NEO4J_USER: process.env.NEO4J_USER || 'neo4j',
    NEO4J_PASSWORD: process.env.NEO4J_PASSWORD || 'password',
    NEO4J_DATABASE: process.env.NEO4J_DATABASE || 'neo4j',
    
    // AI/Embeddings
    EMBEDDING_PROVIDER: (process.env.EMBEDDING_PROVIDER as 'ollama' | 'openai') || 'ollama',
    EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || 'mxbai-embed-large',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    LLM_MODEL: process.env.LLM_MODEL || 'qwen3:8b',
    
    // Service Ports
    ORCHESTRATOR_PORT: parseInt(process.env.ORCHESTRATOR_PORT || '3000'),
    GITHUB_CONNECTOR_PORT: parseInt(process.env.GITHUB_CONNECTOR_PORT || '3002'),
    SLACK_CONNECTOR_PORT: parseInt(process.env.SLACK_CONNECTOR_PORT || '3003'),
    CONFLUENCE_CONNECTOR_PORT: parseInt(process.env.CONFLUENCE_CONNECTOR_PORT || '3004'),
    RETAIL_CONNECTOR_PORT: parseInt(process.env.RETAIL_CONNECTOR_PORT || '8081'),
    
    // Advanced
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    NODE_ENV: process.env.NODE_ENV || 'development'
  };
  
  // Log demo mode status prominently
  if (config.DEMO_MODE) {
    console.log('🎭 DEMO_MODE is ACTIVE - using mock/demo data for all connectors');
    console.log('   To disable: Set DEMO_MODE=false in .env file');
  } else {
    console.log('🔐 PRODUCTION_MODE is ACTIVE - using real API credentials');
    console.log('   To enable demo mode: Set DEMO_MODE=true in .env file');
  }
  
  return config;
}

/**
 * Loads connector-specific configuration with authentication
 */
export function loadConnectorConfig(connectorName: string, defaultPort: number): ConnectorConfig {
  const baseConfig = loadConfig(`connectors/${connectorName}`);
  
  const connectorConfig: ConnectorConfig = {
    ...baseConfig,
    PORT: getConnectorPort(connectorName, defaultPort),
  };
  
  // Add connector-specific auth based on connector name
  switch (connectorName) {
    case 'github':
      connectorConfig.GITHUB_TOKEN = process.env.GITHUB_TOKEN;
      connectorConfig.GITHUB_OWNER = process.env.GITHUB_OWNER;
      break;
    case 'slack':
      connectorConfig.SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
      connectorConfig.SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN;
      break;
    case 'confluence':
      connectorConfig.CONFLUENCE_BASE_URL = process.env.CONFLUENCE_BASE_URL;
      connectorConfig.CONFLUENCE_EMAIL = process.env.CONFLUENCE_EMAIL;
      connectorConfig.CONFLUENCE_API_TOKEN = process.env.CONFLUENCE_API_TOKEN;
      break;
  }
  
  return connectorConfig;
}

function getConnectorPort(connectorName: string, defaultPort: number): number {
  const envKey = `${connectorName.toUpperCase()}_CONNECTOR_PORT`;
  return parseInt(process.env[envKey] || defaultPort.toString());
}

/**
 * Find the project root directory (where package.json and .env files are located)
 */
function findProjectRoot(): string {
  let currentDir = __dirname;
  
  // Walk up the directory tree to find the project root
  while (currentDir !== path.dirname(currentDir)) {
    if (path.basename(currentDir) === 'knowledge_graph_brain') {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  
  // Fallback: assume we're in shared/ directory, so go up one level
  return path.resolve(__dirname, '..');
}
