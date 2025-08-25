import * as dotenv from 'dotenv';
import * as path from 'path';

interface OrchestratorConfig {
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
  
  // Service Configuration
  PORT: number;
  
  // Advanced
  LOG_LEVEL: string;
  NODE_ENV: string;
}

export function getConfig(): OrchestratorConfig {
  // Load central configuration first
  const rootDir = path.resolve(__dirname, '../..');
  dotenv.config({ path: path.join(rootDir, '.env') });
  
  // Load service-specific overrides
  dotenv.config({ path: path.join(__dirname, '../.env.local') });
  
  const config: OrchestratorConfig = {
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
    LLM_MODEL: process.env.LLM_MODEL || 'qwen2.5:7b',
    
    // Service Configuration
    PORT: parseInt(process.env.ORCHESTRATOR_PORT || '3000'),
    
    // Advanced
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    NODE_ENV: process.env.NODE_ENV || 'development'
  };
  
  // Log demo mode status prominently
  if (config.DEMO_MODE) {
    console.log('🎭 Orchestrator: DEMO_MODE is ACTIVE - using mock/demo data where applicable');
    console.log('   To disable: Set DEMO_MODE=false in .env file');
  } else {
    console.log('🔐 Orchestrator: PRODUCTION_MODE is ACTIVE - using real API credentials');
    console.log('   To enable demo mode: Set DEMO_MODE=true in .env file');
  }
  
  return config;
}

export const config = getConfig();
