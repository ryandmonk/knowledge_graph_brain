import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { OrchestratorClient } from './client/orchestrator.js';
import { SessionManager, MCPServerConfig } from './config.js';
import { KnowledgeQueryTools } from './tools/knowledge-query.js';
import { KnowledgeManagementTools } from './tools/knowledge-management.js';
import { DiscoveryTools } from './tools/discovery.js';
import { convertToolForMCP, MCPToolDefinition } from './utils/schema.js';

/**
 * Universal MCP Server for Knowledge Graph Brain
 * 
 * Exposes all knowledge graph capabilities as MCP tools for external clients
 * like Open WebUI, Claude Desktop, VS Code extensions, etc.
 */
export class UniversalMCPServer {
  private server: McpServer;
  private client: OrchestratorClient;
  private sessionManager: SessionManager;
  private queryTools: KnowledgeQueryTools;
  private managementTools: KnowledgeManagementTools;
  private discoveryTools: DiscoveryTools;

  constructor(config: MCPServerConfig) {
    // Initialize MCP server
    this.server = new McpServer({
      name: 'knowledge-graph-brain',
      version: '1.0.0',
    });

    // Initialize components
    this.client = new OrchestratorClient(config.orchestratorUrl);
    this.sessionManager = new SessionManager();
    this.queryTools = new KnowledgeQueryTools(this.client, this.sessionManager);
    this.managementTools = new KnowledgeManagementTools(this.client, this.sessionManager);
    this.discoveryTools = new DiscoveryTools(this.client, this.sessionManager);

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // Knowledge Query Tools - Primary user-facing tools
    this.registerTool(this.queryTools.askKnowledgeGraph);
    this.registerTool(this.queryTools.searchSemantic);
    this.registerTool(this.queryTools.searchGraph);
    this.registerTool(this.queryTools.exploreRelationships);

    // Knowledge Management Tools - Administrative functions
    this.registerTool(this.managementTools.switchKnowledgeBase);
    this.registerTool(this.managementTools.listKnowledgeBases);
    this.registerTool(this.managementTools.addDataSource);
    this.registerTool(this.managementTools.startIngestion);
    this.registerTool(this.managementTools.getKBStatus);
    this.registerTool(this.managementTools.updateSchema);

    // Discovery Tools - Exploration and insights
    this.registerTool(this.discoveryTools.getOverview);
    this.registerTool(this.discoveryTools.exploreSchema);
    this.registerTool(this.discoveryTools.findPatterns);
    this.registerTool(this.discoveryTools.getSessionInfo);
  }

  private registerTool(toolDef: any) {
    // Convert Zod object schema to MCP SDK format
    const mcpTool = convertToolForMCP(toolDef);
    
    this.server.registerTool(
      mcpTool.name,
      {
        description: mcpTool.description,
        inputSchema: mcpTool.inputSchema,
      },
      async (args: any) => {
        try {
          // Generate session ID from request context
          const sessionId = this.generateSessionId();
          
          // Call the tool handler - MCP SDK handles validation
          const result = await mcpTool.handler(args, sessionId);
          
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          console.error(`Error in tool ${mcpTool.name}:`, error);
          
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                }, null, 2),
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  private generateSessionId(): string {
    // In a real implementation, this would be based on client connection
    // For now, use a simple time-based ID
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Start the MCP server
   */
  async start() {
    // Test connection to orchestrator
    try {
      const health = await this.client.healthCheck();
      if (!health) {
        console.error('Warning: Cannot connect to Knowledge Graph Orchestrator');
        console.error('Please ensure the orchestrator is running at the configured URL');
      } else {
        console.log('Successfully connected to Knowledge Graph Orchestrator');
        
        // Get system overview
        const systemHealth = await this.client.getSystemHealth();
        console.log(`System Health Score: ${systemHealth.health_score}/100`);
        console.log(`Available Knowledge Bases: ${systemHealth.knowledge_bases.length}`);
        console.log(`Embedding Provider: ${systemHealth.embedding_provider}`);
      }
    } catch (error) {
      console.error('Failed to connect to orchestrator:', error);
    }

    // Start MCP server with stdio transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.log('Knowledge Graph Brain MCP Server started successfully!');
    console.log('Available tools:');
    console.log('');
    console.log('🔍 Knowledge Query Tools:');
    console.log('  • ask_knowledge_graph - Natural language Q&A with GraphRAG');
    console.log('  • search_semantic - Vector similarity search');
    console.log('  • search_graph - Structured Cypher queries');
    console.log('  • explore_relationships - Entity relationship exploration');
    console.log('');
    console.log('⚙️  Knowledge Management Tools:');
    console.log('  • switch_knowledge_base - Switch context between KBs');
    console.log('  • list_knowledge_bases - List all available KBs');
    console.log('  • add_data_source - Connect new data sources');
    console.log('  • start_ingestion - Trigger data ingestion');
    console.log('  • get_kb_status - Check KB health and stats');
    console.log('  • update_schema - Configure KB schema');
    console.log('');
    console.log('🔎 Discovery Tools:');
    console.log('  • get_overview - Comprehensive KB overview');
    console.log('  • explore_schema - Analyze graph structure');
    console.log('  • find_patterns - Discover data patterns');
    console.log('  • get_session_info - Session context and history');
    console.log('');
    console.log('Ready for external client connections!');
  }

  /**
   * Get server statistics for monitoring
   */
  async getStats() {
    try {
      const systemHealth = await this.client.getSystemHealth();
      
      return {
        server: {
          name: 'knowledge-graph-brain',
          version: '1.0.0',
          uptime: process.uptime(),
          tools_registered: 16
        },
        orchestrator: {
          health_score: systemHealth.health_score,
          status: systemHealth.status,
          knowledge_bases: systemHealth.knowledge_bases.length,
          embedding_provider: systemHealth.embedding_provider,
          uptime_hours: systemHealth.uptime_hours
        },
        sessions: {
          active: this.sessionManager.getActiveSessions(),
          total: this.sessionManager.getTotalSessions()
        }
      };
    } catch (error) {
      return {
        server: {
          name: 'knowledge-graph-brain',
          version: '1.0.0',
          uptime: process.uptime(),
          tools_registered: 16
        },
        error: 'Cannot connect to orchestrator'
      };
    }
  }
}

/**
 * Main entry point
 */
async function main() {
  const config: MCPServerConfig = {
    orchestratorUrl: process.env.ORCHESTRATOR_URL || 'http://localhost:3000',
  };

  console.log('Starting Knowledge Graph Brain Universal MCP Server...');
  console.log(`Orchestrator URL: ${config.orchestratorUrl}`);
  
  const server = new UniversalMCPServer(config);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\\nShutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\\nReceived SIGTERM, shutting down gracefully...');
    process.exit(0);
  });

  await server.start();
}

// Start the server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}
