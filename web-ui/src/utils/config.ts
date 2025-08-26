export const APP_CONFIG = {
  API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  APP_VERSION: '1.0.0',
  APP_NAME: 'Knowledge Graph Brain'
};

export const SERVICES = {
  NEO4J: {
    name: 'Neo4j Database',
    port: 7474,
    healthCheck: 'http://localhost:7474'
  },
  OLLAMA: {
    name: 'Ollama AI',
    port: 11434,
    healthCheck: 'http://localhost:11434/api/tags'
  },
  ORCHESTRATOR: {
    name: 'Orchestrator',
    port: 3000,
    healthCheck: 'http://localhost:3000/api/health'
  },
  GITHUB_CONNECTOR: {
    name: 'GitHub Connector',
    port: 3002,
    healthCheck: 'http://localhost:3002/health'
  },
  CONFLUENCE_CONNECTOR: {
    name: 'Confluence Connector',
    port: 3004,
    healthCheck: 'http://localhost:3004/health'
  },
  SLACK_CONNECTOR: {
    name: 'Slack Connector',
    port: 3003,
    healthCheck: 'http://localhost:3003/health'
  }
};

export const SETUP_STEPS = [
  {
    id: 'services',
    title: 'Check Core Services',
    description: 'Verify that Neo4j and Ollama are running'
  },
  {
    id: 'configuration',
    title: 'Configure Environment',
    description: 'Set up connection details and AI models'
  },
  {
    id: 'connectors',
    title: 'Setup Connectors',
    description: 'Configure data source connections'
  },
  {
    id: 'validation',
    title: 'Validate Setup',
    description: 'Test the complete system configuration'
  }
];
