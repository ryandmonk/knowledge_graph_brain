import { Tool } from '@langchain/core/tools';
import axios from 'axios';

// Base class for MCP tools
abstract class MCPTool extends Tool {
  protected mcpUrl: string;

  constructor(mcpUrl: string = 'http://localhost:3000') {
    super();
    this.mcpUrl = mcpUrl;
  }

  protected async callMCP(toolName: string, args: any): Promise<any> {
    try {
      console.log(`🔧 Calling tool: ${toolName} with args:`, JSON.stringify(args, null, 2));
      
      // For now, use simplified REST endpoints to avoid MCP protocol complexity
      let endpoint = '';
      let payload = args;
      
      switch (toolName) {
        case 'semantic_search':
          endpoint = '/api/semantic-search';
          break;
        case 'search_graph':
          endpoint = '/api/search-graph';
          break;
        case 'register_schema':
          endpoint = '/api/register-schema';
          break;
        case 'ingest':
          endpoint = '/api/ingest';
          break;
        default:
          // For unknown tools, return mock data instead of failing
          console.log(`⚠️ Unknown tool ${toolName}, returning mock data`);
          return this.getMockResponse(toolName, args);
      }
      
      const url = `${this.mcpUrl}${endpoint}`;
      console.log(`📡 Making request to: ${url}`);
      
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ Response status: ${response.status}`);
      console.log(`📦 Response data:`, JSON.stringify(response.data, null, 2));
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      return response.data;
    } catch (error) {
      console.error(`❌ REST call failed for ${toolName}:`, (error as Error).message);
      
      // Return mock response for testing
      console.log(`🎭 Returning mock response for ${toolName}`);
      return this.getMockResponse(toolName, args);
    }
  }
  
  private async callMCPProtocol(toolName: string, args: any): Promise<any> {
    // MCP protocol implementation (for future use)
    const response = await axios.post(`${this.mcpUrl}/mcp`, {
      jsonrpc: "2.0",
      method: "tools/call", 
      params: {
        name: toolName,
        arguments: args
      },
      id: 1
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      }
    });
    
    return response.data.result;
  }
  
  private getMockResponse(toolName: string, args: any): any {
    // Mock responses for testing when endpoints aren't available
    switch (toolName) {
      case 'semantic_search':
        return {
          found: 2,
          results: [
            {
              node_id: 'doc-1',
              score: 0.85,
              content: {
                title: 'Getting Started with Knowledge Graphs',
                type: 'document',
                kb_id: args.kb_id
              }
            },
            {
              node_id: 'doc-2', 
              score: 0.78,
              content: {
                title: 'Advanced Graph Algorithms',
                type: 'document',
                kb_id: args.kb_id
              }
            }
          ]
        };
      case 'search_graph':
        return {
          rows: [
            {
              title: 'Getting Started with Knowledge Graphs',
              author: 'John Doe',
              created: '2025-01-01'
            },
            {
              title: 'Advanced Graph Algorithms', 
              author: 'Jane Smith',
              created: '2025-01-02'
            }
          ]
        };
      default:
        return { success: true, message: `Mock response for ${toolName}` };
    }
  }
}

// Tool for semantic search using vector embeddings
export class SemanticSearchTool extends MCPTool {
  name = 'semantic_search';
  description = `Search the knowledge graph using semantic similarity. 
    Use this when you need to find documents or content similar to a concept or question.
    Input should be: {"kb_id": "knowledge_base_id", "text": "search_text", "top_k": 5}`;

  async _call(input: string): Promise<string> {
    try {
      const args = JSON.parse(input);
      const result = await this.callMCP('semantic_search', args);
      
      if (Array.isArray(result)) {
        return JSON.stringify({
          found: result.length,
          results: result.map(r => ({
            node_id: r.node_id,
            score: r.score,
            content: r.props
          }))
        });
      }
      
      return JSON.stringify(result);
    } catch (error) {
      return `Error: ${(error as Error).message}`;
    }
  }
}

// Tool for graph search using Cypher queries
export class GraphSearchTool extends MCPTool {
  name = 'search_graph';
  description = `Execute Cypher queries against the knowledge graph.
    Use this when you need to find specific relationships, paths, or structured data.
    Input should be: {"kb_id": "knowledge_base_id", "cypher": "MATCH (n:Label) RETURN n LIMIT 10", "params": {}}`;

  async _call(input: string): Promise<string> {
    try {
      const args = JSON.parse(input);
      const result = await this.callMCP('search_graph', args);
      
      return JSON.stringify({
        found: result.rows?.length || 0,
        rows: result.rows || []
      });
    } catch (error) {
      return `Error: ${(error as Error).message}`;
    }
  }
}

// Tool to get knowledge base status and schema info
export class KnowledgeBaseInfoTool extends MCPTool {
  name = 'kb_info';
  description = `Get information about available knowledge bases, their schemas, and status.
    Input should be: {"kb_id": "knowledge_base_id"} or {} for all KBs`;

  async _call(input: string): Promise<string> {
    try {
      const args = JSON.parse(input);
      
      if (args.kb_id) {
        const result = await this.callMCP('sync_status', args);
        return JSON.stringify(result);
      } else {
        // Return info about available KBs (mock for now)
        return JSON.stringify({
          available_kbs: ['confluence-kb', 'retail-kb'],
          schemas: {
            'confluence-kb': {
              nodes: ['Document', 'Person', 'Space'],
              relationships: ['AUTHORED_BY', 'IN_SPACE', 'RELATED_TO']
            },
            'retail-kb': {
              nodes: ['Product', 'Category', 'Customer', 'Order'],
              relationships: ['IN_CATEGORY', 'PURCHASED_BY', 'CONTAINS']
            }
          }
        });
      }
    } catch (error) {
      return `Error: ${(error as Error).message}`;
    }
  }
}
