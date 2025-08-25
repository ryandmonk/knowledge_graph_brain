import { z } from 'zod';
import { OrchestratorClient } from '../client/orchestrator.js';
import { SessionManager } from '../config.js';

/**
 * Discovery and exploration tools for understanding the knowledge graph structure
 */
export class DiscoveryTools {
  constructor(
    private client: OrchestratorClient,
    private sessionManager: SessionManager
  ) {}

  /**
   * Get overview statistics and health of current knowledge base
   */
  getOverview = {
    name: 'get_overview',
    description: 'Get a comprehensive overview of the current knowledge base including statistics, health, and structure.',
    inputSchema: z.object({
      kb_id: z.string().optional().describe('Knowledge base ID (optional - uses current context)')
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
        // Get system health to find this KB
        const health = await this.client.getSystemHealth();
        const kb = health.knowledge_bases.find(k => k.kb_id === kb_id);
        
        if (!kb) {
          return {
            error: `Knowledge base '${kb_id}' not found.`,
            available_knowledge_bases: health.knowledge_bases.map(k => k.kb_id)
          };
        }

        // Get detailed status
        const status = await this.client.getKnowledgeBaseStatus(kb_id);
        
        return {
          knowledge_base: {
            id: kb_id,
            health_status: kb.health_status,
            health_details: {
              total_nodes: kb.total_nodes,
              total_relationships: kb.total_relationships,
              data_freshness_hours: kb.data_freshness_hours
            }
          },
          node_types: kb.node_types,
          sources: status.sources.map((source: any) => ({
            source_id: source.source_id,
            status: source.status || 'unknown',
            last_run: source.last_run,
            documents_processed: source.documents_processed || 0
          })),
          system_context: {
            embedding_provider: health.embedding_provider,
            system_health_score: health.health_score,
            uptime_hours: health.uptime_hours
          },
          last_error: status.last_error,
          recommendations: this.generateRecommendations(kb, status)
        };

      } catch (error) {
        return {
          error: `Failed to get overview: ${error instanceof Error ? error.message : 'Unknown error'}`,
          kb_id
        };
      }
    }
  };

  /**
   * Explore the graph schema and structure
   */
  exploreSchema = {
    name: 'explore_schema',
    description: 'Explore the structure and schema of the knowledge graph - see what types of entities and relationships exist.',
    inputSchema: z.object({
      kb_id: z.string().optional().describe('Knowledge base ID (optional - uses current context)'),
      include_samples: z.boolean().optional().default(true).describe('Include sample nodes for each type')
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
        // Get node types and counts
        const nodeTypesQuery = `
          CALL db.labels() YIELD label
          CALL apoc.cypher.run('MATCH (n:' + label + ') RETURN count(n) as count LIMIT 1', {}) YIELD value
          RETURN label, value.count as count
          ORDER BY count DESC
        `;
        
        const nodeTypes = await this.client.graphSearch({
          kb_id,
          cypher: nodeTypesQuery
        });

        // Get relationship types and counts
        const relationshipTypesQuery = `
          CALL db.relationshipTypes() YIELD relationshipType as type
          CALL apoc.cypher.run('MATCH ()-[r:' + type + ']->() RETURN count(r) as count LIMIT 1', {}) YIELD value  
          RETURN type, value.count as count
          ORDER BY count DESC
        `;
        
        const relationshipTypes = await this.client.graphSearch({
          kb_id,
          cypher: relationshipTypesQuery
        });

        let samples: any = {};
        if (args.include_samples) {
          // Get sample nodes for each type
          for (const nodeType of nodeTypes.data.slice(0, 5)) { // Limit to top 5 types
            const sampleQuery = `
              MATCH (n:${nodeType.label})
              RETURN n
              LIMIT 3
            `;
            
            try {
              const sampleResult = await this.client.graphSearch({
                kb_id,
                cypher: sampleQuery
              });
              samples[nodeType.label] = sampleResult.data.map((row: any) => ({
                properties: row.n.properties || {},
                example_keys: Object.keys(row.n.properties || {}).slice(0, 5)
              }));
            } catch (error) {
              samples[nodeType.label] = ['Error getting samples'];
            }
          }
        }

        // Update session
        this.sessionManager.updateSession(sessionId, {
          currentKnowledgeBase: kb_id,
          queryHistory: [
            ...session.queryHistory.slice(-9),
            {
              timestamp: Date.now(),
              tool: 'explore_schema',
              query: 'schema exploration',
              kb_id,
              resultCount: nodeTypes.data.length + relationshipTypes.data.length
            }
          ]
        });

        return {
          kb_id,
          schema: {
            node_types: nodeTypes.data.map((row: any) => ({
              label: row.label,
              count: row.count,
              sample_properties: args.include_samples ? 
                (samples[row.label]?.[0]?.example_keys || []) : undefined
            })),
            relationship_types: relationshipTypes.data.map((row: any) => ({
              type: row.type,
              count: row.count
            }))
          },
          samples: args.include_samples ? samples : undefined,
          summary: {
            total_node_types: nodeTypes.data.length,
            total_relationship_types: relationshipTypes.data.length,
            largest_node_type: nodeTypes.data[0]?.label,
            most_common_relationship: relationshipTypes.data[0]?.type
          },
          exploration_tips: [
            'Use search_semantic to find content by meaning',
            'Use search_graph with Cypher to explore specific patterns',
            'Use explore_relationships to see how entities connect'
          ]
        };

      } catch (error) {
        return {
          error: `Failed to explore schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
          kb_id,
          fallback: 'Try using get_overview tool for basic statistics'
        };
      }
    }
  };

  /**
   * Find interesting patterns and insights in the data
   */
  findPatterns = {
    name: 'find_patterns',
    description: 'Discover interesting patterns, clusters, and insights in the knowledge graph data.',
    inputSchema: z.object({
      kb_id: z.string().optional().describe('Knowledge base ID (optional - uses current context)'),
      pattern_type: z.enum(['centrality', 'clusters', 'frequent_paths', 'anomalies']).optional().default('centrality').describe('Type of patterns to find')
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
        let results: any = {};
        
        switch (args.pattern_type) {
          case 'centrality':
            // Find most connected nodes
            const centralityQuery = `
              MATCH (n)
              WITH n, size((n)--()) as connections
              WHERE connections > 1
              RETURN labels(n) as labels, n.name as name, n.title as title, 
                     coalesce(n.name, n.title, n.id, 'Unknown') as display_name,
                     connections
              ORDER BY connections DESC
              LIMIT 10
            `;
            
            const centralNodes = await this.client.graphSearch({
              kb_id,
              cypher: centralityQuery
            });
            
            results.most_connected = centralNodes.data.map((row: any) => ({
              name: row.display_name,
              type: row.labels.join(', '),
              connections: row.connections
            }));
            break;

          case 'clusters':
            // Find densely connected groups
            const clustersQuery = `
              CALL gds.wcc.stream('myGraph') 
              YIELD nodeId, componentId
              WITH componentId, collect(nodeId) as nodes
              WHERE size(nodes) >= 3 AND size(nodes) <= 20
              RETURN componentId, size(nodes) as cluster_size, nodes[0..5] as sample_nodes
              ORDER BY cluster_size DESC
              LIMIT 5
            `;
            
            try {
              const clusters = await this.client.graphSearch({
                kb_id,
                cypher: clustersQuery
              });
              results.clusters = clusters.data;
            } catch (error) {
              // Fallback: simple grouping
              const fallbackQuery = `
                MATCH (n)--(connected)
                WITH n, collect(distinct connected) as connections
                WHERE size(connections) >= 2
                RETURN labels(n) as type, count(n) as nodes_in_group
                ORDER BY nodes_in_group DESC
                LIMIT 5
              `;
              
              const fallback = await this.client.graphSearch({
                kb_id,
                cypher: fallbackQuery
              });
              results.node_groupings = fallback.data;
            }
            break;

          case 'frequent_paths':
            // Find common relationship patterns
            const pathsQuery = `
              MATCH path = (a)-[r1]->(b)-[r2]->(c)
              WITH type(r1) + ' -> ' + type(r2) as pattern, count(path) as frequency
              WHERE frequency >= 2
              RETURN pattern, frequency
              ORDER BY frequency DESC
              LIMIT 10
            `;
            
            const paths = await this.client.graphSearch({
              kb_id,
              cypher: pathsQuery
            });
            
            results.relationship_patterns = paths.data.map((row: any) => ({
              pattern: row.pattern,
              frequency: row.frequency
            }));
            break;

          case 'anomalies':
            // Find unusual or isolated nodes
            const anomaliesQuery = `
              MATCH (n)
              WITH n, size((n)--()) as connections
              WHERE connections = 0 OR connections > 20
              RETURN labels(n) as labels, 
                     coalesce(n.name, n.title, n.id, 'Unknown') as display_name,
                     connections,
                     CASE WHEN connections = 0 THEN 'isolated' ELSE 'highly_connected' END as anomaly_type
              ORDER BY connections
              LIMIT 10
            `;
            
            const anomalies = await this.client.graphSearch({
              kb_id,
              cypher: anomaliesQuery
            });
            
            results.anomalies = anomalies.data.map((row: any) => ({
              name: row.display_name,
              type: row.labels.join(', '),
              connections: row.connections,
              anomaly_type: row.anomaly_type
            }));
            break;
        }

        // Update session
        this.sessionManager.updateSession(sessionId, {
          currentKnowledgeBase: kb_id,
          queryHistory: [
            ...session.queryHistory.slice(-9),
            {
              timestamp: Date.now(),
              tool: 'find_patterns',
              query: `pattern analysis: ${args.pattern_type}`,
              kb_id,
              resultCount: Object.keys(results).length
            }
          ]
        });

        return {
          kb_id,
          pattern_type: args.pattern_type,
          patterns: results,
          insights: this.generatePatternInsights(args.pattern_type, results),
          next_steps: [
            'Use ask_knowledge_graph to ask questions about interesting patterns',
            'Use explore_relationships to dive deeper into specific entities',
            'Try different pattern_type values to see other aspects of your data'
          ]
        };

      } catch (error) {
        return {
          error: `Failed to find patterns: ${error instanceof Error ? error.message : 'Unknown error'}`,
          kb_id,
          pattern_type: args.pattern_type,
          suggestion: 'The knowledge base might be too small for pattern analysis, or the graph database might not support the required operations.'
        };
      }
    }
  };

  /**
   * Get session context and query history
   */
  getSessionInfo = {
    name: 'get_session_info',
    description: 'Get information about your current session including knowledge base context and recent query history.',
    inputSchema: z.object({}),
    handler: async (args: any, sessionId: string) => {
      const session = this.sessionManager.getSession(sessionId);
      const availableKBs = await this.getAvailableKBs();
      
      return {
        session_id: sessionId,
        current_knowledge_base: session.currentKnowledgeBase || 'none',
        available_knowledge_bases: availableKBs,
        recent_queries: session.queryHistory.slice(-10).map(query => ({
          timestamp: new Date(query.timestamp).toISOString(),
          tool: query.tool,
          query: query.query,
          kb_id: query.kb_id,
          results: query.resultCount
        })),
        session_stats: {
          total_queries: session.queryHistory.length,
          knowledge_bases_used: [...new Set(session.queryHistory.map(q => q.kb_id))].length,
          most_used_tool: this.getMostUsedTool(session.queryHistory)
        },
        tips: session.currentKnowledgeBase ? [
          'You can ask questions directly with ask_knowledge_graph',
          'Explore your data structure with explore_schema',
          'Find interesting patterns with find_patterns'
        ] : [
          'Start by choosing a knowledge base with switch_knowledge_base',
          'See all available knowledge bases with list_knowledge_bases',
          'Create a new knowledge base by using switch_knowledge_base with create_if_missing: true'
        ]
      };
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

  private generateRecommendations(kb: any, status: any): string[] {
    const recommendations: string[] = [];
    
    if (kb.total_nodes === 0) {
      recommendations.push('Knowledge base is empty. Add data sources and start ingestion.');
    } else if (kb.total_nodes < 100) {
      recommendations.push('Knowledge base is small. Consider adding more data sources for richer insights.');
    }
    
    if (kb.data_freshness_hours > 24) {
      recommendations.push('Data is getting stale. Consider running fresh ingestion.');
    }
    
    if (status.last_error) {
      recommendations.push('There are recent errors. Check source configurations and connectivity.');
    }
    
    if (kb.total_relationships === 0 && kb.total_nodes > 0) {
      recommendations.push('No relationships found. Review schema mappings to create entity connections.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Knowledge base looks healthy! Try asking questions or exploring patterns.');
    }
    
    return recommendations;
  }

  private generatePatternInsights(patternType: string, results: any): string[] {
    const insights: string[] = [];
    
    switch (patternType) {
      case 'centrality':
        if (results.most_connected?.length > 0) {
          const top = results.most_connected[0];
          insights.push(`"${top.name}" is the most connected entity with ${top.connections} connections.`);
          insights.push('Highly connected entities often represent important concepts or hub documents.');
        }
        break;
        
      case 'clusters':
        if (results.clusters?.length > 0) {
          insights.push(`Found ${results.clusters.length} distinct clusters in the data.`);
          insights.push('Clusters may represent different topics, projects, or knowledge domains.');
        } else if (results.node_groupings?.length > 0) {
          insights.push('Data shows groupings by entity type, suggesting structured content.');
        }
        break;
        
      case 'frequent_paths':
        if (results.relationship_patterns?.length > 0) {
          const top = results.relationship_patterns[0];
          insights.push(`Most common relationship pattern: "${top.pattern}" (${top.frequency} occurrences)`);
          insights.push('Frequent patterns reveal how information flows through your knowledge base.');
        }
        break;
        
      case 'anomalies':
        if (results.anomalies?.length > 0) {
          const isolated = results.anomalies.filter((a: any) => a.anomaly_type === 'isolated').length;
          const connected = results.anomalies.filter((a: any) => a.anomaly_type === 'highly_connected').length;
          
          if (isolated > 0) {
            insights.push(`${isolated} isolated entities found - these might need better integration.`);
          }
          if (connected > 0) {
            insights.push(`${connected} highly connected entities found - these are likely important hubs.`);
          }
        }
        break;
    }
    
    if (insights.length === 0) {
      insights.push('No significant patterns detected. The knowledge base might need more data or different analysis approaches.');
    }
    
    return insights;
  }

  private getMostUsedTool(queryHistory: any[]): string {
    if (queryHistory.length === 0) return 'none';
    
    const toolCounts = queryHistory.reduce((acc, query) => {
      acc[query.tool] = (acc[query.tool] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(toolCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0][0];
  }
}
