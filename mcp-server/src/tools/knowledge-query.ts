import { z } from 'zod';
import { OrchestratorClient, SearchResult, GraphResult } from '../client/orchestrator.js';
import { SessionManager, SessionContext } from '../config.js';

/**
 * Knowledge query tools for natural language and structured search
 */
export class KnowledgeQueryTools {
  constructor(
    private client: OrchestratorClient,
    private sessionManager: SessionManager
  ) {}

  /**
   * Natural language question answering using GraphRAG
   * This is the primary tool users will interact with
   */
  askKnowledgeGraph = {
    name: 'ask_knowledge_graph',
    description: 'Ask natural language questions about your knowledge graph using advanced GraphRAG. Combines semantic search with graph reasoning for comprehensive answers.',
    inputSchema: z.object({
      question: z.string().describe('Your question in natural language'),
      kb_id: z.string().optional().describe('Knowledge base ID (optional - uses current context)'),
      include_sources: z.boolean().optional().default(true).describe('Include source citations in response'),
      search_depth: z.enum(['shallow', 'deep']).optional().default('deep').describe('Search depth - shallow for quick answers, deep for comprehensive analysis')
    }),
    handler: async (args: any, sessionId: string) => {
      const session = this.sessionManager.getSession(sessionId);
      const kb_id = args.kb_id || session.currentKnowledgeBase;
      
      if (!kb_id) {
        return {
          error: 'No knowledge base specified. Use switch_knowledge_base tool first or provide kb_id parameter.',
          available_knowledge_bases: await this.getAvailableKBs()
        };
      }

      try {
        // Step 1: Semantic search for relevant content
        const semanticResults = await this.client.semanticSearch({
          kb_id,
          text: args.question,
          top_k: args.search_depth === 'deep' ? 10 : 5
        });

        // Step 2: Graph exploration based on semantic results
        let graphResults: GraphResult | null = null;
        if (semanticResults.results.length > 0) {
          // Extract entities mentioned in top results
          const nodeIds = semanticResults.results.slice(0, 3).map(r => `"${r.node_id}"`).join(',');
          
          const cypher = `
            MATCH (n)-[r]-(connected)
            WHERE n.id IN [${nodeIds}] OR id(n) IN [${nodeIds}]
            RETURN n, type(r) as relationship_type, connected
            LIMIT ${args.search_depth === 'deep' ? 50 : 20}
          `;
          
          try {
            graphResults = await this.client.graphSearch({ kb_id, cypher });
          } catch (error) {
            console.warn('Graph exploration failed, using semantic results only:', error);
          }
        }

        // Step 3: Synthesize response
        const response = this.synthesizeResponse(args.question, semanticResults, graphResults, args.include_sources);
        
        // Update session history
        this.sessionManager.updateSession(sessionId, {
          currentKnowledgeBase: kb_id,
          queryHistory: [
            ...session.queryHistory.slice(-9), // Keep last 9
            {
              timestamp: Date.now(),
              tool: 'ask_knowledge_graph',
              query: args.question,
              kb_id,
              resultCount: semanticResults.found
            }
          ]
        });

        return response;
        
      } catch (error) {
        return {
          error: `Failed to process question: ${error instanceof Error ? error.message : 'Unknown error'}`,
          question: args.question,
          kb_id
        };
      }
    }
  };

  /**
   * Semantic vector search with filtering
   */
  searchSemantic = {
    name: 'search_semantic',
    description: 'Search knowledge base content using semantic similarity. Great for finding documents and content related to specific topics.',
    inputSchema: z.object({
      text: z.string().describe('Search query text'),
      kb_id: z.string().optional().describe('Knowledge base ID (optional - uses current context)'),
      top_k: z.number().optional().default(5).describe('Number of results to return (1-20)'),
      labels: z.array(z.string()).optional().describe('Filter by node labels/types (e.g., ["Document", "Person"])'),
      properties: z.record(z.any()).optional().describe('Filter by node properties (e.g., {"category": "research"})')
    }),
    handler: async (args: any, sessionId: string) => {
      const session = this.sessionManager.getSession(sessionId);
      const kb_id = args.kb_id || session.currentKnowledgeBase;
      
      if (!kb_id) {
        return {
          error: 'No knowledge base specified. Use switch_knowledge_base tool first or provide kb_id parameter.',
          available_knowledge_bases: await this.getAvailableKBs()
        };
      }

      try {
        const results = await this.client.semanticSearch({
          kb_id,
          text: args.text,
          top_k: Math.min(args.top_k || 5, 20),
          labels: args.labels,
          properties: args.properties
        });

        // Update session
        this.sessionManager.updateSession(sessionId, {
          currentKnowledgeBase: kb_id,
          queryHistory: [
            ...session.queryHistory.slice(-9),
            {
              timestamp: Date.now(),
              tool: 'search_semantic',
              query: args.text,
              kb_id,
              resultCount: results.found
            }
          ]
        });

        return {
          found: results.found,
          results: results.results.map(r => ({
            content: r.content,
            score: r.score,
            node_type: r.labels.join(', '),
            properties: r.properties,
            relevance: r.score > 0.8 ? 'high' : r.score > 0.6 ? 'medium' : 'low'
          })),
          search_info: {
            kb_id,
            embedding_provider: results.embedding_provider,
            filters: {
              labels: args.labels,
              properties: args.properties
            }
          }
        };
        
      } catch (error) {
        return {
          error: `Semantic search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          query: args.text,
          kb_id
        };
      }
    }
  };

  /**
   * Structured graph queries using Cypher
   */
  searchGraph = {
    name: 'search_graph',
    description: 'Execute structured graph queries using Cypher. For advanced users who want precise control over graph traversal and relationships.',
    inputSchema: z.object({
      cypher: z.string().describe('Cypher query to execute'),
      kb_id: z.string().optional().describe('Knowledge base ID (optional - uses current context)'),
      params: z.record(z.any()).optional().describe('Query parameters')
    }),
    handler: async (args: any, sessionId: string) => {
      const session = this.sessionManager.getSession(sessionId);
      const kb_id = args.kb_id || session.currentKnowledgeBase;
      
      if (!kb_id) {
        return {
          error: 'No knowledge base specified. Use switch_knowledge_base tool first or provide kb_id parameter.',
          available_knowledge_bases: await this.getAvailableKBs()
        };
      }

      // Safety check for Cypher query
      const safeCypher = args.cypher.trim();
      if (safeCypher.toLowerCase().includes('delete') || 
          safeCypher.toLowerCase().includes('remove') || 
          safeCypher.toLowerCase().includes('create') ||
          safeCypher.toLowerCase().includes('merge')) {
        return {
          error: 'Write operations (CREATE, DELETE, REMOVE, MERGE) are not allowed through this interface.',
          suggestion: 'Use read-only queries (MATCH, RETURN, WHERE, ORDER BY, LIMIT)'
        };
      }

      try {
        const results = await this.client.graphSearch({
          kb_id,
          cypher: safeCypher,
          params: args.params
        });

        // Update session
        this.sessionManager.updateSession(sessionId, {
          currentKnowledgeBase: kb_id,
          queryHistory: [
            ...session.queryHistory.slice(-9),
            {
              timestamp: Date.now(),
              tool: 'search_graph',
              query: safeCypher,
              kb_id,
              resultCount: results.data.length
            }
          ]
        });

        return {
          results: results.data,
          summary: results.summary,
          kb_id,
          cypher: safeCypher
        };
        
      } catch (error) {
        return {
          error: `Graph query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          cypher: safeCypher,
          kb_id,
          suggestion: 'Check your Cypher syntax. Common issues: missing RETURN clause, incorrect node/relationship patterns, typos in property names.'
        };
      }
    }
  };

  /**
   * Explore entity relationships
   */
  exploreRelationships = {
    name: 'explore_relationships',
    description: 'Explore relationships and connections around specific entities in the knowledge graph.',
    inputSchema: z.object({
      entity_search: z.string().describe('Search term to find the entity (e.g., person name, document title)'),
      kb_id: z.string().optional().describe('Knowledge base ID (optional - uses current context)'),
      max_depth: z.number().optional().default(2).describe('Maximum relationship depth to explore (1-3)'),
      relationship_types: z.array(z.string()).optional().describe('Filter by specific relationship types')
    }),
    handler: async (args: any, sessionId: string) => {
      const session = this.sessionManager.getSession(sessionId);
      const kb_id = args.kb_id || session.currentKnowledgeBase;
      
      if (!kb_id) {
        return {
          error: 'No knowledge base specified. Use switch_knowledge_base tool first or provide kb_id parameter.',
          available_knowledge_bases: await this.getAvailableKBs()
        };
      }

      try {
        // First, find the entity using semantic search
        const entitySearch = await this.client.semanticSearch({
          kb_id,
          text: args.entity_search,
          top_k: 3
        });

        if (entitySearch.found === 0) {
          return {
            error: 'No entities found matching the search term.',
            search_term: args.entity_search,
            suggestion: 'Try different search terms or check if the entity exists in the knowledge base.'
          };
        }

        // Take the best match
        const targetEntity = entitySearch.results[0];
        const maxDepth = Math.min(args.max_depth || 2, 3);
        
        // Build relationship exploration query
        const relationshipFilter = args.relationship_types 
          ? `AND type(r) IN [${args.relationship_types.map((t: string) => `"${t}"`).join(',')}]`
          : '';
          
        const cypher = `
          MATCH path = (start)-[r*1..${maxDepth}]-(connected)
          WHERE start.id = "${targetEntity.node_id}" OR id(start) = ${targetEntity.node_id}
          ${relationshipFilter}
          RETURN path, length(path) as depth
          ORDER BY depth, type(r[0])
          LIMIT 50
        `;

        const results = await this.client.graphSearch({ kb_id, cypher });

        // Update session
        this.sessionManager.updateSession(sessionId, {
          currentKnowledgeBase: kb_id,
          queryHistory: [
            ...session.queryHistory.slice(-9),
            {
              timestamp: Date.now(),
              tool: 'explore_relationships',
              query: args.entity_search,
              kb_id,
              resultCount: results.data.length
            }
          ]
        });

        return {
          center_entity: {
            search_term: args.entity_search,
            found_entity: targetEntity.properties,
            node_type: targetEntity.labels.join(', ')
          },
          relationships: results.data,
          exploration_summary: {
            max_depth: maxDepth,
            relationship_filter: args.relationship_types || 'all',
            paths_found: results.data.length
          },
          kb_id
        };
        
      } catch (error) {
        return {
          error: `Relationship exploration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          entity_search: args.entity_search,
          kb_id
        };
      }
    }
  };

  private async getAvailableKBs(): Promise<string[]> {
    try {
      const kbs = await this.client.listKnowledgeBases();
      return kbs.map(kb => kb.kb_id);
    } catch (error) {
      return [];
    }
  }

  private synthesizeResponse(
    question: string,
    semanticResults: { found: number; results: SearchResult[] },
    graphResults: GraphResult | null,
    includeSources: boolean
  ) {
    const hasResults = semanticResults.found > 0;
    
    if (!hasResults) {
      return {
        answer: "I couldn't find any relevant information in the knowledge base for your question. The knowledge base might not contain data related to this topic, or you might want to try rephrasing your question.",
        question,
        confidence: 'low',
        sources_consulted: 0
      };
    }

    // Build answer from semantic results
    let answer = `Based on the knowledge base, here's what I found:\n\n`;
    
    // Include top semantic results
    const topResults = semanticResults.results.slice(0, 3);
    topResults.forEach((result, index) => {
      answer += `${index + 1}. ${this.extractKeyInfo(result.content)}\n`;
    });

    // Add graph insights if available
    if (graphResults && graphResults.data.length > 0) {
      answer += `\n**Additional connections found:** The knowledge graph reveals ${graphResults.data.length} related entities and relationships that provide broader context to your question.\n`;
    }

    // Determine confidence
    const avgScore = topResults.reduce((sum, r) => sum + r.score, 0) / topResults.length;
    const confidence = avgScore > 0.8 ? 'high' : avgScore > 0.6 ? 'medium' : 'low';

    const response: any = {
      answer,
      question,
      confidence,
      sources_consulted: semanticResults.found,
      reasoning: `I found ${semanticResults.found} relevant pieces of information using semantic search` +
                (graphResults ? ` and explored ${graphResults.data.length} graph relationships` : '') +
                ` to provide a comprehensive answer.`
    };

    if (includeSources) {
      response.sources = topResults.map(r => ({
        content_preview: r.content.substring(0, 200) + '...',
        relevance_score: r.score,
        node_type: r.labels.join(', '),
        key_properties: r.properties
      }));
    }

    return response;
  }

  private extractKeyInfo(content: string): string {
    // Simple extraction - take first sentence or up to 150 characters
    const sentences = content.split(/[.!?]+/);
    const firstSentence = sentences[0]?.trim();
    if (firstSentence && firstSentence.length < 150) {
      return firstSentence + '.';
    }
    return content.substring(0, 150) + '...';
  }
}
