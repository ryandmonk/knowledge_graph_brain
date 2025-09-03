// Update the main index.ts file to integrate all components
import express, { Request, Response } from 'express';
import cors from 'cors';
import { server, registeredSchemas } from './capabilities';
import { initDriver, setupKB, mergeNodesAndRels, executeCypher, getDriver, semanticSearch } from './ingest';
import { parseSchema, applyMapping } from './dsl';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'crypto';
import { syncStatusHandler, runsHandler, getSystemStatus } from './status/index';
import { getConfig } from './config';
import { EmbeddingProviderFactory } from './embeddings/index';
import axios from 'axios';
import path from 'path';
import fs from 'fs';

// Authentication integration
import { authRouter, initAuthService, getAuthMiddleware, requirePermission, requireKBAccess } from './auth/routes';

// GraphRAG Agent Integration
let GraphRAGAgent: any;
let createGraphRAGAgent: any;

async function initializeGraphRAGAgent() {
  try {
    // Use dynamic import for ES modules
    const graphragModule = await import('../../langgraph/graph_rag_agent/dist/agent.js');
    GraphRAGAgent = graphragModule.GraphRAGAgent;
    createGraphRAGAgent = graphragModule.createGraphRAGAgent;
    console.log('✅ GraphRAG agent loaded successfully');
  } catch (error) {
    console.warn('⚠️ GraphRAG agent not available:', (error as Error).message);
  }
}

// Initialize services
async function initializeServices() {
  try {
    // Initialize Neo4j driver
    initDriver();
    console.log('✅ Neo4j driver initialized');
    
    // Initialize authentication service
    initAuthService();
    console.log('✅ Authentication service initialized');
    
    // Initialize GraphRAG agent asynchronously
    await initializeGraphRAGAgent();
    
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    process.exit(1);
  }
}

// Initialize all services
initializeServices();

const app = express();

// Add basic CORS headers manually
app.use((req, res, next) => {
  console.log('CORS middleware: Processing request for', req.method, req.url, 'from origin:', req.headers.origin);
  res.header('Access-Control-Allow-Origin', 'http://localhost:3100');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    console.log('CORS middleware: Handling OPTIONS preflight request');
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json());

// Authentication routes (public access for API key management)
app.use('/api/auth', authRouter);

// Serve static files from the web UI build
const webUIPath = path.join(__dirname, '../../web-ui/dist');
app.use('/ui', express.static(webUIPath));

// Redirect root to the setup wizard
app.get('/', (req: Request, res: Response) => {
  res.redirect('/ui');
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'mcp-orchestrator' });
});

// Simple REST endpoints for testing
app.post('/api/register-schema', async (req: Request, res: Response) => {
  try {
    const { kb_id, schema_yaml } = req.body;
    
    if (!kb_id || !schema_yaml) {
      return res.status(400).json({ error: 'Missing kb_id or schema_yaml' });
    }
    
    // Parse and validate the schema
    const schema = parseSchema(schema_yaml);
    
    // Store the schema in memory for the MCP system
    registeredSchemas.set(kb_id, schema);
    
    // Setup the knowledge base in Neo4j
    await setupKB(kb_id, schema);
    
    console.log(`✅ Schema registered for KB: ${kb_id}`);
    
    res.json({ 
      success: true, 
      message: 'Schema registered successfully',
      kb_id: kb_id,
      nodes: schema.schema.nodes.length,
      relationships: schema.schema.relationships.length
    });
  } catch (error) {
    console.error('Schema registration error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Enhanced endpoint that accepts raw YAML content
app.post('/api/register-schema-yaml', async (req: Request, res: Response) => {
  try {
    const { kb_id, yaml_content } = req.body;
    
    if (!kb_id || !yaml_content) {
      return res.status(400).json({ error: 'Missing kb_id or yaml_content' });
    }
    
    // Parse and validate the schema
    const schema = parseSchema(yaml_content);
    
    // Verify the kb_id matches
    if (schema.kb_id !== kb_id) {
      return res.status(400).json({ 
        error: `Schema kb_id '${schema.kb_id}' does not match provided kb_id '${kb_id}'` 
      });
    }
    
    // Store the schema in memory for the MCP system
    registeredSchemas.set(kb_id, schema);
    
    // Setup the knowledge base in Neo4j
    await setupKB(kb_id, schema);
    
    console.log(`✅ Schema registered for KB: ${kb_id} via YAML endpoint`);
    
    res.json({ 
      success: true, 
      message: 'Schema registered successfully from YAML',
      kb_id: kb_id,
      embedding_provider: schema.embedding.provider,
      nodes: schema.schema.nodes.length,
      relationships: schema.schema.relationships.length,
      sources: schema.mappings.sources.length
    });
  } catch (error) {
    console.error('YAML schema registration error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      hint: 'Ensure your YAML is properly formatted and includes all required fields'
    });
  }
});

app.post('/api/ingest', async (req: Request, res: Response) => {
  try {
    const { kb_id, source_id } = req.body;
    
    if (!kb_id || !source_id) {
      return res.status(400).json({ error: 'Missing kb_id or source_id' });
    }
    
    // Retrieve the registered schema for this KB
    const schema = registeredSchemas.get(kb_id);
    if (!schema) {
      return res.status(400).json({ 
        error: `No schema registered for kb_id: ${kb_id}. Please register a schema first using /api/register-schema`,
        available_kbs: Array.from(registeredSchemas.keys())
      });
    }    // Find the mapping for this source
    const mapping = schema.mappings.sources.find(s => s.source_id === source_id);
    if (!mapping) {
      return res.status(400).json({ 
        error: `No mapping found for source_id: ${source_id}`,
        available_sources: schema.mappings.sources.map(s => s.source_id)
      });
    }
    
    // Get connector URL from mapping (with fallback for backward compatibility)
    let connectorUrl = (mapping as any).connector_url;
    if (!connectorUrl) {
      // Fallback logic for schemas without explicit connector_url
      if (source_id === 'products' || source_id === 'customers') {
        connectorUrl = `http://localhost:8081/data/${source_id}`;
      } else if (source_id === 'confluence') {
        connectorUrl = 'http://localhost:3001/pull';
      } else {
        return res.status(400).json({ 
          error: `No connector_url found for source_id: ${source_id}. Please update schema to include connector_url in mapping.`,
          mapping_format: 'sources:\n  - source_id: "your-source"\n    connector_url: "http://localhost:port/endpoint"'
        });
      }
    }
    
    // Fetch data from the connector
    let response;
    try {
      response = await axios.get(connectorUrl);
    } catch (error) {
      return res.status(503).json({ 
        error: `Failed to connect to connector at ${connectorUrl}. Ensure connector is running.`,
        connector_url: connectorUrl,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Handle different response formats
    let documents;
    if (source_id === 'confluence') {
      documents = response.data; // Confluence returns array directly
    } else {
      documents = response.data.data || response.data; // Retail returns {data: [...]}
    }
    
    const run_id = randomUUID();
    let totalNodes = 0;
    let totalRels = 0;
    
    console.log(`🔍 Processing ${documents.length} documents from ${source_id}`);
    
    // Process each document using the schema mapping
    for (const doc of documents) {
      console.log(`📄 Processing document:`, doc);
      
      // Apply the mapping to extract nodes and relationships directly from the document
      const { nodes, relationships } = applyMapping(doc, mapping, schema);
      
      console.log(`✅ Extracted ${nodes.length} nodes and ${relationships.length} relationships`);
      
      // Convert to the format expected by mergeNodesAndRels (nodes should already have correct key)
      const formattedNodes = nodes.map(node => ({
        label: node.label,
        key: node.key,
        properties: node.properties
      }));
      
      const formattedRels = relationships.map(rel => ({
        type: rel.type,
        from: {
          label: rel.from.label,
          key: rel.from.key
        },
        to: {
          label: rel.to.label,
          key: rel.to.key
        },
        properties: rel.properties
      }));
      
      // Merge into Neo4j
      const { createdNodes, createdRels } = await mergeNodesAndRels(
        kb_id,
        source_id,
        run_id,
        formattedNodes,
        formattedRels
      );
      
      totalNodes += createdNodes;
      totalRels += createdRels;
    }
    
    console.log(`✅ Ingested data for KB: ${kb_id}, Source: ${source_id}, Nodes: ${totalNodes}, Relationships: ${totalRels}`);
    
    res.json({ 
      success: true, 
      message: 'Data ingested successfully',
      kb_id: kb_id,
      source_id: source_id,
      run_id: run_id,
      processed_documents: documents.length,
      created_nodes: totalNodes,
      created_relationships: totalRels
    });
  } catch (error) {
    console.error('Ingestion error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/api/semantic-search', async (req: Request, res: Response) => {
  try {
    const { kb_id, text, top_k = 5, filters } = req.body;
    
    if (!kb_id || !text) {
      res.status(400).json({ 
        error: 'Missing required parameters: kb_id and text are required' 
      });
      return;
    }
    
    // Get the schema to find the embedding provider
    const schema = registeredSchemas.get(kb_id);
    if (!schema) {
      res.status(404).json({ 
        error: `Schema for knowledge base '${kb_id}' not found. Please register the schema first.` 
      });
      return;
    }

    // Generate embeddings for the search text
    const embeddingProvider = EmbeddingProviderFactory.create(schema.embedding.provider);
    const queryVector = await embeddingProvider.embed(text) as number[];

    // Perform semantic search using vector embeddings with filters
    const results = await semanticSearch(kb_id, queryVector, top_k, filters);

    res.json({
      found: results.length,
      results: results.map(result => ({
        node_id: result.node.id || result.node.kb_id + '_' + (result.node.source_id || 'unknown'),
        score: result.score,
        content: result.node,
        filters_applied: filters ? {
          labels: filters.labels,
          properties: filters.props ? Object.keys(filters.props) : undefined
        } : undefined
      })),
      query: text,
      kb_id,
      embedding_provider: schema.embedding.provider
    });
  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/search-graph', async (req: Request, res: Response) => {
  try {
    const { kb_id, cypher } = req.body;
    
    // Execute the real Cypher query against Neo4j
    console.log(`Executing Cypher query: ${cypher}`);
    const results = await executeCypher(cypher, { kb_id });
    
    res.json({
      rows: results,
      query: cypher,
      kb_id: kb_id,
      count: results.length
    });
  } catch (error) {
    console.error('Graph search error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Status API endpoints
app.get('/api/status', async (req: Request, res: Response) => {
  try {
    const status = await getSystemStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/sync-status/:kb_id', syncStatusHandler);
app.get('/api/runs/:kb_id?', runsHandler);

// Configuration management endpoint
// Configuration API endpoints for connectors
app.get('/api/config', async (req: Request, res: Response) => {
  try {
    const config = getConfig();
    
    // Get current .env file content for editing
    const envPath = path.join(__dirname, '../..', '.env');
    let envContent = '';
    try {
      envContent = fs.readFileSync(envPath, 'utf-8');
    } catch (error) {
      // If .env doesn't exist, create from .env.example
      try {
        envContent = fs.readFileSync(path.join(__dirname, '../..', '.env.example'), 'utf-8');
      } catch (err) {
        envContent = 'DEMO_MODE=true\n';
      }
    }
    
    // Parse current environment variables
    const envVars: Record<string, string> = {};
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && !key.startsWith('#')) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    });
    
    res.json({
      DEMO_MODE: config.DEMO_MODE,
      EMBEDDING_PROVIDER: config.EMBEDDING_PROVIDER,
      EMBEDDING_MODEL: config.EMBEDDING_MODEL,
      NEO4J_URI: config.NEO4J_URI,
      OLLAMA_BASE_URL: config.OLLAMA_BASE_URL,
      LLM_MODEL: config.LLM_MODEL,
      environment: envVars
    });
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

// Update system configuration
app.post('/api/config', async (req: Request, res: Response) => {
  try {
    const { DEMO_MODE, ...otherConfig } = req.body;
    const path = require('path');
    
    // Update .env file
    const envPath = path.join(__dirname, '../..', '.env');
    let envContent = '';
    
    try {
      envContent = fs.readFileSync(envPath, 'utf-8');
    } catch (error) {
      // Create from .env.example if .env doesn't exist
      try {
        envContent = fs.readFileSync(path.join(__dirname, '../..', '.env.example'), 'utf-8');
      } catch (err) {
        envContent = 'DEMO_MODE=true\n';
      }
    }
    
    // Update DEMO_MODE specifically
    const lines = envContent.split('\n');
    let demoModeUpdated = false;
    
    const updatedLines = lines.map(line => {
      if (line.startsWith('DEMO_MODE=')) {
        demoModeUpdated = true;
        return `DEMO_MODE=${DEMO_MODE}`;
      }
      return line;
    });
    
    // Add DEMO_MODE if it wasn't found
    if (!demoModeUpdated) {
      updatedLines.push(`DEMO_MODE=${DEMO_MODE}`);
    }
    
    // Update other config values
    Object.entries(otherConfig).forEach(([key, value]) => {
      let keyUpdated = false;
      const updatedLinesInner = updatedLines.map(line => {
        if (line.startsWith(`${key}=`)) {
          keyUpdated = true;
          return `${key}=${value}`;
        }
        return line;
      });
      
      if (!keyUpdated) {
        updatedLines.push(`${key}=${value}`);
      }
    });
    
    // Write updated .env file
    fs.writeFileSync(envPath, updatedLines.join('\n'));
    
    // Reload environment variables immediately
    const dotenv = require('dotenv');
    
    // Clear the module cache for dotenv
    delete require.cache[require.resolve('dotenv')];
    
    // Reload the .env file
    dotenv.config({ path: envPath, override: true });
    
    res.json({ 
      success: true, 
      message: 'Configuration updated successfully. Environment variables reloaded.',
      requiresRestart: true,
      updatedConfig: { DEMO_MODE, ...otherConfig }
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Restart connector services to apply configuration changes
app.post('/api/services/restart', async (req: Request, res: Response) => {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    console.log('🔄 Restarting connector services to apply configuration changes...');
    
    // Stop existing services
    try {
      await execAsync('pkill -f "node.*connectors" 2>/dev/null || true');
      await execAsync('sleep 2'); // Give services time to stop
    } catch (error) {
      console.log('No existing connector services found to stop');
    }
    
    // Start services using start-services.sh
    const projectRoot = path.join(__dirname, '../..');
    const startScript = path.join(projectRoot, 'start-services.sh');
    
    // Make script executable
    await execAsync(`chmod +x "${startScript}"`);
    
    // Start services in background
    exec(`cd "${projectRoot}" && ./start-services.sh`, (error: any, stdout: any, stderr: any) => {
      if (error) {
        console.error('Error starting services:', error);
        return;
      }
      console.log('✅ Services restarted successfully');
      console.log(stdout);
    });
    
    // Wait a moment for services to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    res.json({
      success: true,
      message: 'Services are being restarted. This may take a few moments.',
      status: 'restarting'
    });
    
  } catch (error) {
    console.error('Error restarting services:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to restart services',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/config', (req: Request, res: Response) => {
  // For now, just return the config - environment variable updates would require restart
  // In a future version, this could update .env files or use a config database
  res.json({ 
    success: false, 
    message: 'Configuration updates require server restart. Use environment variables or .env file.' 
  });
});

// Get available connectors
app.get('/api/connectors', (req: Request, res: Response) => {
  const config = getConfig();
  const isDemo = config.DEMO_MODE;
  
  const allConnectors = [
    {
      id: 'github',
      name: 'GitHub',
      description: isDemo ? 'Connect to GitHub repositories (Demo: using sample repositories)' : 'Connect to GitHub repositories, issues, and pull requests',
      port: 3001,
      status: 'available',
      icon: '🐙',
      requiresAuth: !isDemo,
      authFields: isDemo ? [] : [
        { name: 'GITHUB_TOKEN', label: 'GitHub Personal Access Token', type: 'password', required: true }
      ]
    },
    {
      id: 'slack',
      name: 'Slack',
      description: isDemo ? 'Connect to Slack workspace (Demo: using sample messages)' : 'Connect to Slack workspace messages and channels',
      port: 3003,
      status: 'available',
      icon: '💬',
      requiresAuth: !isDemo,
      authFields: isDemo ? [] : [
        { name: 'SLACK_TOKEN', label: 'Slack Bot Token', type: 'password', required: true }
      ]
    },
    {
      id: 'confluence',
      name: 'Confluence',
      description: isDemo ? 'Connect to Confluence pages (Demo: using sample pages)' : 'Connect to Atlassian Confluence pages and spaces',
      port: 3004,
      status: 'available',
      icon: '📚',
      requiresAuth: !isDemo,
      authFields: isDemo ? [] : [
        { name: 'CONFLUENCE_DOMAIN', label: 'Confluence Domain', type: 'text', required: true },
        { name: 'CONFLUENCE_EMAIL', label: 'Email', type: 'email', required: true },
        { name: 'CONFLUENCE_API_TOKEN', label: 'API Token', type: 'password', required: true }
      ]
    }
  ];

  // Only show retail-mock connector in demo mode
  if (isDemo) {
    allConnectors.push({
      id: 'retail-mock',
      name: 'Retail Mock Data',
      description: 'Sample retail data for testing and demonstration',
      port: 8081,
      status: 'available',
      icon: '🛍️',
      requiresAuth: false,
      authFields: []
    });
  }

  res.json(allConnectors);
});

// Test connector connection
app.post('/api/connectors/:connectorId/test', async (req: Request, res: Response) => {
  const { connectorId } = req.params;
  const connectorPort = {
    'github': 3001,
    'slack': 3003,
    'confluence': 3004,
    'retail-mock': 8081
  }[connectorId];

  if (!connectorPort) {
    return res.status(404).json({ error: 'Connector not found' });
  }

  const config = getConfig();
  const isDemo = config.DEMO_MODE;

  try {
    // First check if the service is running
    const response = await axios.get(`http://localhost:${connectorPort}/health`, { timeout: 5000 });
    
    // In production mode, check for required credentials
    if (!isDemo) {
      const missingCredentials = [];
      
      switch (connectorId) {
        case 'github':
          if (!process.env.GITHUB_TOKEN) {
            missingCredentials.push('GITHUB_TOKEN');
          }
          break;
        case 'slack':
          if (!process.env.SLACK_BOT_TOKEN) {
            missingCredentials.push('SLACK_BOT_TOKEN');
          }
          break;
        case 'confluence':
          if (!process.env.CONFLUENCE_BASE_URL || !process.env.CONFLUENCE_API_TOKEN) {
            if (!process.env.CONFLUENCE_BASE_URL) missingCredentials.push('CONFLUENCE_BASE_URL');
            if (!process.env.CONFLUENCE_API_TOKEN) missingCredentials.push('CONFLUENCE_API_TOKEN');
          }
          break;
      }
      
      if (missingCredentials.length > 0) {
        return res.json({
          success: false,
          status: 'misconfigured',
          message: `Missing required credentials: ${missingCredentials.join(', ')}`,
          missingCredentials,
          details: response.data
        });
      }
    }
    
    res.json({ 
      success: true, 
      status: 'healthy',
      message: isDemo ? 'Connector is running in demo mode' : 'Connector is running and properly configured',
      mode: isDemo ? 'demo' : 'production',
      details: response.data 
    });
  } catch (error) {
    res.status(503).json({ 
      success: false, 
      status: 'unhealthy',
      message: 'Connector is not accessible',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get connector-specific configuration
app.get('/api/connectors/:connectorId/config', (req: Request, res: Response) => {
  const { connectorId } = req.params;
  
  const connectorConfigs: Record<string, any> = {
    'github': {
      port: parseInt(process.env.GITHUB_CONNECTOR_PORT || '3001'),
      credentials: {
        GITHUB_TOKEN: process.env.GITHUB_TOKEN ? '***' : '',
        GITHUB_OWNER: process.env.GITHUB_OWNER || ''
      },
      authFields: [
        { name: 'GITHUB_TOKEN', label: 'GitHub Personal Access Token', type: 'password', required: true, value: process.env.GITHUB_TOKEN ? '***' : '' },
        { name: 'GITHUB_OWNER', label: 'Default Repository Owner', type: 'text', required: false, value: process.env.GITHUB_OWNER || '' }
      ]
    },
    'slack': {
      port: parseInt(process.env.SLACK_CONNECTOR_PORT || '3003'),
      credentials: {
        SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN ? '***' : '',
        SLACK_APP_TOKEN: process.env.SLACK_APP_TOKEN ? '***' : ''
      },
      authFields: [
        { name: 'SLACK_BOT_TOKEN', label: 'Slack Bot Token', type: 'password', required: true, value: process.env.SLACK_BOT_TOKEN ? '***' : '' },
        { name: 'SLACK_APP_TOKEN', label: 'Slack App Token', type: 'password', required: false, value: process.env.SLACK_APP_TOKEN ? '***' : '' }
      ]
    },
    'confluence': {
      port: parseInt(process.env.CONFLUENCE_CONNECTOR_PORT || '3004'),
      credentials: {
        CONFLUENCE_BASE_URL: process.env.CONFLUENCE_BASE_URL || '',
        CONFLUENCE_EMAIL: process.env.CONFLUENCE_EMAIL || '',
        CONFLUENCE_API_TOKEN: process.env.CONFLUENCE_API_TOKEN ? '***' : ''
      },
      authFields: [
        { name: 'CONFLUENCE_BASE_URL', label: 'Confluence Domain', type: 'url', required: true, value: process.env.CONFLUENCE_BASE_URL || '', placeholder: 'https://your-domain.atlassian.net' },
        { name: 'CONFLUENCE_EMAIL', label: 'Email', type: 'email', required: true, value: process.env.CONFLUENCE_EMAIL || '' },
        { name: 'CONFLUENCE_API_TOKEN', label: 'API Token', type: 'password', required: true, value: process.env.CONFLUENCE_API_TOKEN ? '***' : '' }
      ]
    },
    'retail-mock': {
      port: parseInt(process.env.RETAIL_CONNECTOR_PORT || '8081'),
      credentials: {},
      authFields: []
    }
  };

  const config = connectorConfigs[connectorId];
  if (!config) {
    return res.status(404).json({ error: 'Connector not found' });
  }

  res.json(config);
});

// Update connector-specific configuration
app.post('/api/connectors/:connectorId/config', async (req: Request, res: Response) => {
  const { connectorId } = req.params;
  const { credentials, port } = req.body;

  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Read current .env file
    const envPath = path.join(__dirname, '../../../.env');
    let envContent = '';
    
    try {
      envContent = await fs.readFile(envPath, 'utf-8');
    } catch (error) {
      // If .env doesn't exist, start with empty content
      envContent = '';
    }

    // Update port configuration
    if (port !== undefined) {
      const portVar = `${connectorId.toUpperCase()}_CONNECTOR_PORT`;
      const portRegex = new RegExp(`^${portVar}=.*$`, 'm');
      
      if (portRegex.test(envContent)) {
        envContent = envContent.replace(portRegex, `${portVar}=${port}`);
      } else {
        envContent += `\n${portVar}=${port}`;
      }
    }

    // Update credentials
    if (credentials) {
      for (const [key, value] of Object.entries(credentials)) {
        if (typeof value === 'string' && value !== '***') { // Don't update masked values
          const credRegex = new RegExp(`^${key}=.*$`, 'm');
          
          if (credRegex.test(envContent)) {
            envContent = envContent.replace(credRegex, `${key}=${value}`);
          } else {
            envContent += `\n${key}=${value}`;
          }
        }
      }
    }

    // Write updated .env file
    await fs.writeFile(envPath, envContent);

    res.json({ 
      success: true, 
      message: 'Configuration updated successfully. Restart connectors to apply changes.',
      requiresRestart: true
    });

  } catch (error) {
    console.error('Error updating connector config:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update configuration', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get available Ollama models
app.get('/api/ollama/models', async (req: Request, res: Response) => {
  try {
    const currentConfig = getConfig();
    const ollamaUrl = currentConfig.OLLAMA_BASE_URL || 'http://localhost:11434';
    
    const response = await fetch(`${ollamaUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }
    
    const data = await response.json() as { models?: Array<{ name: string; size: number; modified_at: string; digest: string }> };
    const models = data.models?.map((model) => ({
      name: model.name,
      size: model.size,
      modified_at: model.modified_at,
      digest: model.digest
    })) || [];
    
    res.json({
      success: true,
      models,
      current_model: currentConfig.LLM_MODEL,
      ollama_url: ollamaUrl
    });
  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    const currentConfig = getConfig();
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch Ollama models',
      message: error instanceof Error ? error.message : 'Unknown error',
      ollama_url: currentConfig.OLLAMA_BASE_URL || 'http://localhost:11434'
    });
  }
});

// Update LLM model configuration
app.post('/api/config/llm', async (req: Request, res: Response) => {
  try {
    const { model } = req.body;
    
    if (!model) {
      return res.status(400).json({ 
        success: false, 
        error: 'Model name is required' 
      });
    }

    // Validate that the model exists in Ollama
    try {
      const currentConfig = getConfig();
      const ollamaUrl = currentConfig.OLLAMA_BASE_URL || 'http://localhost:11434';
      const modelsResponse = await fetch(`${ollamaUrl}/api/tags`);
      
      if (modelsResponse.ok) {
        const data = await modelsResponse.json() as { models?: Array<{ name: string }> };
        const availableModels = data.models?.map((m) => m.name) || [];
        
        if (!availableModels.includes(model)) {
          return res.status(400).json({
            success: false,
            error: `Model '${model}' not found in Ollama`,
            available_models: availableModels,
            suggestion: `Try running: ollama pull ${model}`
          });
        }
      }
    } catch (ollamaError) {
      console.warn('Could not validate model with Ollama:', ollamaError);
      // Continue anyway - user might know what they're doing
    }

    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Update .env file
    const envPath = path.join(__dirname, '../../../.env');
    let envContent = '';
    
    try {
      envContent = await fs.readFile(envPath, 'utf-8');
    } catch (error) {
      // Create from .env.example if .env doesn't exist
      try {
        envContent = await fs.readFile(path.join(__dirname, '../../../.env.example'), 'utf-8');
      } catch (err) {
        envContent = 'LLM_MODEL=qwen3:8b\n';
      }
    }
    
    // Update LLM_MODEL
    const llmModelRegex = /^LLM_MODEL=.*$/m;
    if (llmModelRegex.test(envContent)) {
      envContent = envContent.replace(llmModelRegex, `LLM_MODEL=${model}`);
    } else {
      envContent += `\nLLM_MODEL=${model}`;
    }
    
    await fs.writeFile(envPath, envContent);
    
    const previousConfig = getConfig();
    res.json({ 
      success: true, 
      message: `LLM model updated to '${model}'. Restart required for LangGraph agent to use new model.`,
      previous_model: previousConfig.LLM_MODEL,
      new_model: model,
      requiresRestart: true,
      affectedServices: ['LangGraph Agent', 'Question Answering']
    });

  } catch (error) {
    console.error('Error updating LLM model:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update LLM model configuration', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get available ports and detect conflicts
app.get('/api/ports/status', (req: Request, res: Response) => {
  const usedPorts = {
    3000: 'Orchestrator',
    7474: 'Neo4j HTTP',
    7687: 'Neo4j Bolt', 
    11434: 'Ollama',
    [parseInt(process.env.GITHUB_CONNECTOR_PORT || '3001')]: 'GitHub Connector',
    [parseInt(process.env.SLACK_CONNECTOR_PORT || '3003')]: 'Slack Connector',
    [parseInt(process.env.CONFLUENCE_CONNECTOR_PORT || '3004')]: 'Confluence Connector',
    [parseInt(process.env.RETAIL_CONNECTOR_PORT || '8081')]: 'Retail Mock Connector'
  };

  res.json({
    usedPorts,
    availablePorts: Array.from({length: 20}, (_, i) => 3000 + i).filter(port => !usedPorts[port]),
    conflicts: Object.entries(usedPorts).filter(([port, service1], index, arr) => 
      arr.find(([otherPort, service2], otherIndex) => 
        port === otherPort && index !== otherIndex
      )
    )
  });
});

// Get available knowledge bases
app.get('/api/knowledge-bases', async (req: Request, res: Response) => {
  try {
    const result = await executeCypher(`
      MATCH (kb:KnowledgeBase) 
      RETURN kb.kb_id as kb_id, kb.name as name, kb.description as description, 
             kb.created_at as created_at, kb.updated_at as updated_at
      ORDER BY kb.created_at DESC
    `);
    
    res.json(result.map(record => ({
      kb_id: record.kb_id,
      name: record.name,
      description: record.description,
      created_at: record.created_at,
      updated_at: record.updated_at
    })));
  } catch (error) {
    console.error('Error fetching knowledge bases:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge bases' });
  }
});

// Create new knowledge base
app.post('/api/knowledge-bases', async (req: Request, res: Response) => {
  try {
    const { kb_id, name, description } = req.body;
    
    if (!kb_id || !name) {
      return res.status(400).json({ error: 'kb_id and name are required' });
    }
    
    await setupKB(kb_id);
    
    // Create the knowledge base node with name and description
    await executeCypher(`
      MERGE (kb:KnowledgeBase {kb_id: $kb_id})
      SET kb.name = $name, 
          kb.description = $description,
          kb.created_at = datetime(),
          kb.updated_at = datetime(),
          kb.source_id = 'system',
          kb.run_id = $run_id
    `, {
      kb_id,
      name,
      description: description || '',
      run_id: `kb-setup-${randomUUID()}`
    });
    
    res.json({ 
      success: true, 
      message: 'Knowledge base created successfully',
      kb_id,
      name,
      description
    });
  } catch (error) {
    console.error('Error creating knowledge base:', error);
    res.status(500).json({ error: 'Failed to create knowledge base' });
  }
});

// Enhanced operational monitoring endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const systemStatus = await getSystemStatus();
    
    // Generate alerts based on system status
    const alerts: Array<{severity: 'info' | 'warning' | 'error', message: string, timestamp: number}> = [];
    
    if (!systemStatus.neo4j_connected) {
      alerts.push({
        severity: 'error',
        message: 'Neo4j database connection failed',
        timestamp: Date.now()
      });
    }
    
    if (systemStatus.health_score < 80) {
      alerts.push({
        severity: 'warning', 
        message: `System health score is low: ${systemStatus.health_score}/100`,
        timestamp: Date.now()
      });
    }
    
    if (systemStatus.active_runs > 10) {
      alerts.push({
        severity: 'warning',
        message: `High number of active runs: ${systemStatus.active_runs}`,
        timestamp: Date.now()
      });
    }
    
    // Check for stale knowledge bases
    const staleKBs = systemStatus.knowledge_bases.filter(kb => kb.health_status === 'stale' || kb.health_status === 'error');
    if (staleKBs.length > 0) {
      alerts.push({
        severity: 'warning',
        message: `${staleKBs.length} knowledge base(s) need attention: ${staleKBs.map(kb => kb.kb_id).join(', ')}`,
        timestamp: Date.now()
      });
    }
    
    res.json({
      status: systemStatus,
      alerts,
      summary: {
        healthy_kbs: systemStatus.knowledge_bases.filter(kb => kb.health_status === 'healthy').length,
        total_kbs: systemStatus.knowledge_bases.length,
        overall_health: systemStatus.health_score >= 90 ? 'excellent' : 
                       systemStatus.health_score >= 70 ? 'good' : 
                       systemStatus.health_score >= 50 ? 'fair' : 'poor'
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      alerts: [{
        severity: 'error',
        message: 'Failed to retrieve system health status',
        timestamp: Date.now()
      }]
    });
  }
});

// Set up the MCP endpoint
app.post('/mcp', async (req: Request, res: Response) => {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// Query endpoint to check what's in the database
app.get('/api/query/:kb_id', async (req: Request, res: Response) => {
  try {
    const { kb_id } = req.params;
    const { cypher = 'MATCH (n) WHERE n.kb_id = $kb_id RETURN n LIMIT 10' } = req.query;
    
    const session = getDriver().session({ database: 'neo4j' });
    
    try {
      const result = await session.run(cypher as string, { kb_id });
      const data = result.records.map((record: any) => record.toObject());
      
      res.json({ 
        success: true, 
        kb_id,
        query: cypher,
        results: data,
        count: data.length
      });
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GraphRAG Ask API - Citation Tracing Detail View
app.post('/api/ask', async (req: Request, res: Response) => {
  try {
    const { question, kb_id = 'retail-demo' } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    if (!createGraphRAGAgent) {
      return res.status(503).json({ 
        error: 'GraphRAG agent not available. Please ensure LangGraph dependencies are installed.' 
      });
    }
    
    // Create GraphRAG agent instance
    const agent = await createGraphRAGAgent('http://localhost:3000');
    
    // Get detailed answer with citations and provenance
    const result = await agent.answerWithDetailedCitations(question, kb_id);
    
    res.json({
      success: true,
      question,
      kb_id,
      answer: result.answer,
      citations: result.citations,
      provenance_chain: result.provenance_chain,
      confidence_breakdown: result.confidence_breakdown,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('GraphRAG Ask error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to process question',
      details: error instanceof Error ? error.stack : undefined
    });
  }
});

app.listen(getConfig().PORT, () => {
  const config = getConfig();
  console.log(`🚀 Knowledge Graph Brain Orchestrator running on http://localhost:${config.PORT}`);
  if (config.DEMO_MODE) {
    console.log('🎭 Running in DEMO MODE - using mock data where credentials are missing');
  }
});