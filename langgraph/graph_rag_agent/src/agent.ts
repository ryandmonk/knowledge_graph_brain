import { ChatOllama } from '@langchain/ollama';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { SemanticSearchTool, GraphSearchTool, KnowledgeBaseInfoTool } from './tools';

export class GraphRAGAgent {
  private tools: any[];
  private llm: ChatOllama;

  constructor(mcpUrl: string = 'http://localhost:3000', ollamaModel: string = 'qwen3:8b') {
    // Initialize LLM with Ollama
    this.llm = new ChatOllama({
      model: ollamaModel,
      temperature: 0,
      baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    });

    console.log(`🧠 Using Ollama model: ${ollamaModel}`);

    // Initialize tools
    this.tools = [
      new SemanticSearchTool(mcpUrl),
      new GraphSearchTool(mcpUrl),
      new KnowledgeBaseInfoTool(mcpUrl),
    ];
  }

  async answer(question: string, kb_id: string = 'confluence-kb'): Promise<string> {
    try {
      // Step 1: Get KB info to understand available schema
      const kbInfoTool = this.tools.find(t => t.name === 'kb_info');
      const kbInfo = await kbInfoTool._call(JSON.stringify({ kb_id }));
      
      // Step 2: Use semantic search to find relevant content
      const semanticTool = this.tools.find(t => t.name === 'semantic_search');
      const semanticResults = await semanticTool._call(JSON.stringify({
        kb_id,
        text: question,
        top_k: 5
      }));
      
      // Step 3: Use graph search to find related entities
      const graphTool = this.tools.find(t => t.name === 'search_graph');
      
      // Create a simple Cypher query based on the question
      let cypher = 'MATCH (n) RETURN n LIMIT 10';
      if (question.toLowerCase().includes('document')) {
        cypher = 'MATCH (n:Document) RETURN n, n.title, n.content LIMIT 5';
      } else if (question.toLowerCase().includes('person') || question.toLowerCase().includes('author')) {
        cypher = 'MATCH (p:Person)-[r]->(n) RETURN p, r, n LIMIT 5';
      } else if (question.toLowerCase().includes('relationship') || question.toLowerCase().includes('connect')) {
        cypher = 'MATCH (a)-[r]->(b) RETURN a, type(r), b LIMIT 10';
      }
      
      const graphResults = await graphTool._call(JSON.stringify({
        kb_id,
        cypher,
        params: {}
      }));
      
      // Step 4: Synthesize the answer using LLM
      const synthesisPrompt = `You are a Knowledge Graph RAG assistant. Answer the user's question based on the search results below.

Question: ${question}
Knowledge Base: ${kb_id}

KB Schema Info:
${kbInfo}

Semantic Search Results:
${semanticResults}

Graph Query Results:
${graphResults}

Provide a comprehensive answer that:
1. Directly answers the user's question
2. Uses specific information from the search results
3. Includes citations with node IDs and key properties when available
4. Explains the relationships between entities when relevant
5. States your confidence level in the answer

Format your response as:
**Answer:** [Your comprehensive answer]

**Sources:** [List specific node IDs and properties that support your answer]

**Confidence:** [High/Medium/Low] - [Brief explanation]`;

      const response = await this.llm.invoke([
        new HumanMessage(synthesisPrompt)
      ]);

      return response.content as string;
      
    } catch (error) {
      return `Error generating answer: ${(error as Error).message}`;
    }
  }

  async answerWithDetailedCitations(question: string, kb_id: string = 'confluence-kb'): Promise<{
    answer: string;
    citations: Array<{
      node_id: string;
      node_type: string[];
      relevance_score?: number;
      source_data: any;
      supporting_evidence: string;
      confidence: number;
    }>;
    provenance_chain: Array<{
      step: number;
      action: string;
      tool_used: string;
      query_executed: string;
      results_found: number;
      key_findings: string[];
    }>;
    confidence_breakdown: {
      overall_confidence: number;
      semantic_confidence: number;
      graph_confidence: number;
      synthesis_confidence: number;
      reasoning: string;
    };
  }> {
    const provenance_chain: Array<{
      step: number;
      action: string;
      tool_used: string;
      query_executed: string;
      results_found: number;
      key_findings: string[];
    }> = [];
    
    const citations: Array<{
      node_id: string;
      node_type: string[];
      relevance_score?: number;
      source_data: any;
      supporting_evidence: string;
      confidence: number;
    }> = [];
    
    try {
      // Step 1: Get KB info with detailed tracking
      const kbInfoTool = this.tools.find(t => t.name === 'kb_info');
      const kbInfoRaw = await kbInfoTool._call(JSON.stringify({ kb_id }));
      const kbInfo = JSON.parse(kbInfoRaw);
      
      provenance_chain.push({
        step: 1,
        action: 'Retrieved knowledge base schema and metadata',
        tool_used: 'kb_info',
        query_executed: `kb_info(kb_id="${kb_id}")`,
        results_found: 1,
        key_findings: [
          `Schema version: ${kbInfo.schema_version || 'unknown'}`,
          `Node types available: ${kbInfo.node_types?.join(', ') || 'unknown'}`,
          `Total nodes: ${kbInfo.total_nodes || 0}`
        ]
      });
      
      // Step 2: Enhanced semantic search with citation tracking
      const semanticTool = this.tools.find(t => t.name === 'semantic_search');
      const semanticResultsRaw = await semanticTool._call(JSON.stringify({
        kb_id,
        text: question,
        top_k: 8
      }));
      const semanticResults = JSON.parse(semanticResultsRaw);
      
      // Extract citations from semantic results
      if (semanticResults.results) {
        for (const result of semanticResults.results) {
          citations.push({
            node_id: result.node_id || 'unknown',
            node_type: result.content ? Object.keys(result.content).filter(k => k.endsWith('_type') || k === 'labels') : ['unknown'],
            relevance_score: result.score,
            source_data: result.content,
            supporting_evidence: this.extractSupportingEvidence(result.content, question),
            confidence: this.calculateConfidenceFromScore(result.score)
          });
        }
      }
      
      provenance_chain.push({
        step: 2,
        action: 'Performed vector similarity search for semantically relevant content',
        tool_used: 'semantic_search',
        query_executed: `semantic_search(text="${question}", top_k=8)`,
        results_found: semanticResults.found || 0,
        key_findings: semanticResults.results?.slice(0, 3).map((r: any) => 
          `${r.node_id}: ${r.score?.toFixed(3)} score - ${this.truncateText(JSON.stringify(r.content), 100)}`
        ) || []
      });
      
      // Step 3: Enhanced graph search with relationship tracking
      const graphTool = this.tools.find(t => t.name === 'search_graph');
      
      // Generate multiple targeted queries based on question analysis
      const queries = this.generateTargetedQueries(question, kb_id);
      let allGraphResults: any[] = [];
      
      for (const query of queries) {
        const graphResultsRaw = await graphTool._call(JSON.stringify({
          kb_id,
          cypher: query.cypher,
          params: query.params || {}
        }));
        const graphResults = JSON.parse(graphResultsRaw);
        
        if (graphResults.rows) {
          allGraphResults.push(...graphResults.rows);
          
          // Add graph-based citations
          for (const row of graphResults.rows.slice(0, 5)) {
            const nodeId = this.extractNodeId(row);
            if (nodeId) {
              citations.push({
                node_id: nodeId,
                node_type: this.extractNodeTypes(row),
                source_data: row,
                supporting_evidence: this.extractGraphEvidence(row, question),
                confidence: 0.8 // Graph queries generally high confidence
              });
            }
          }
        }
        
        provenance_chain.push({
          step: provenance_chain.length + 1,
          action: `Executed targeted graph query: ${query.description}`,
          tool_used: 'search_graph',
          query_executed: query.cypher,
          results_found: graphResults.found || 0,
          key_findings: graphResults.rows?.slice(0, 2).map((r: any) => 
            this.truncateText(JSON.stringify(r), 80)
          ) || []
        });
      }
      
      // Step 4: Synthesize with enhanced citation integration
      const synthesisPrompt = `You are a Knowledge Graph RAG assistant. Answer the user's question with comprehensive citations.

Question: ${question}
Knowledge Base: ${kb_id}

KB Schema: ${JSON.stringify(kbInfo, null, 2)}
Semantic Results: ${JSON.stringify(semanticResults, null, 2)}
Graph Results: ${JSON.stringify(allGraphResults.slice(0, 10), null, 2)}

IMPORTANT: Your answer must include:
1. Direct answer to the question
2. Specific node IDs in [brackets] when referencing information
3. Key properties from the source data
4. Relationship explanations from graph data
5. Confidence assessment

Example citation format: "According to [node-123], the title is 'Example Document' which shows..."`;

      const response = await this.llm.invoke([new HumanMessage(synthesisPrompt)]);
      const answer = response.content as string;
      
      // Calculate confidence breakdown
      const confidence_breakdown = this.calculateConfidenceBreakdown(semanticResults, allGraphResults, citations);
      
      provenance_chain.push({
        step: provenance_chain.length + 1,
        action: 'Synthesized comprehensive answer with LLM integration',
        tool_used: 'ollama_llm',
        query_executed: `llm_synthesis(context_tokens=${this.estimateTokens(synthesisPrompt)})`,
        results_found: 1,
        key_findings: [
          `Answer length: ${answer.length} characters`,
          `Citations embedded: ${this.countCitationsInAnswer(answer)}`,
          `Confidence: ${confidence_breakdown.overall_confidence.toFixed(2)}`
        ]
      });
      
      return {
        answer,
        citations: this.deduplicateCitations(citations),
        provenance_chain,
        confidence_breakdown
      };
      
    } catch (error) {
      return {
        answer: `Error generating answer with citations: ${(error as Error).message}`,
        citations: [],
        provenance_chain,
        confidence_breakdown: {
          overall_confidence: 0,
          semantic_confidence: 0,
          graph_confidence: 0,
          synthesis_confidence: 0,
          reasoning: `Error occurred: ${(error as Error).message}`
        }
      };
    }
  }

  // Helper methods for citation processing
  private extractSupportingEvidence(content: any, question: string): string {
    if (!content) return 'No content available';
    
    const relevantFields = ['content', 'description', 'title', 'name', 'text'];
    for (const field of relevantFields) {
      if (content[field] && typeof content[field] === 'string') {
        const text = content[field];
        if (text.toLowerCase().includes(question.toLowerCase().split(' ')[0])) {
          return this.truncateText(text, 200);
        }
      }
    }
    return this.truncateText(JSON.stringify(content), 150);
  }
  
  private calculateConfidenceFromScore(score?: number): number {
    if (!score) return 0.5;
    return Math.min(score, 1.0);
  }
  
  private generateTargetedQueries(question: string, kb_id: string): Array<{cypher: string, params?: any, description: string}> {
    const queries = [];
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('document') || lowerQuestion.includes('page')) {
      queries.push({
        cypher: 'MATCH (d:Document {kb_id: $kb_id}) RETURN d.id as node_id, d.title as title, d.content as content, labels(d) as node_type LIMIT 5',
        params: { kb_id },
        description: 'Find documents matching the question context'
      });
    }
    
    if (lowerQuestion.includes('author') || lowerQuestion.includes('person') || lowerQuestion.includes('who')) {
      queries.push({
        cypher: 'MATCH (p:Person {kb_id: $kb_id})-[r]->(n) RETURN p.id as person_id, p.name as name, type(r) as relationship, n.title as target LIMIT 5',
        params: { kb_id },
        description: 'Find people and their relationships'
      });
    }
    
    if (lowerQuestion.includes('relationship') || lowerQuestion.includes('connect') || lowerQuestion.includes('related')) {
      queries.push({
        cypher: 'MATCH (a {kb_id: $kb_id})-[r]->(b {kb_id: $kb_id}) RETURN a.id as from_id, labels(a) as from_type, type(r) as relationship, b.id as to_id, labels(b) as to_type LIMIT 8',
        params: { kb_id },
        description: 'Find relationships between entities'
      });
    }
    
    // Fallback query
    if (queries.length === 0) {
      queries.push({
        cypher: 'MATCH (n {kb_id: $kb_id}) RETURN n.id as node_id, labels(n) as node_type, n LIMIT 10',
        params: { kb_id },
        description: 'General node exploration'
      });
    }
    
    return queries;
  }
  
  private extractNodeId(row: any): string | null {
    // Try common ID field patterns
    const idFields = ['node_id', 'id', 'person_id', 'from_id', 'to_id'];
    for (const field of idFields) {
      if (row[field]) return row[field];
    }
    return null;
  }
  
  private extractNodeTypes(row: any): string[] {
    if (row.node_type) return Array.isArray(row.node_type) ? row.node_type : [row.node_type];
    if (row.from_type) return Array.isArray(row.from_type) ? row.from_type : [row.from_type];
    return ['unknown'];
  }
  
  private extractGraphEvidence(row: any, question: string): string {
    const evidence = [];
    if (row.title) evidence.push(`title: "${row.title}"`);
    if (row.name) evidence.push(`name: "${row.name}"`);
    if (row.relationship) evidence.push(`relationship: ${row.relationship}`);
    if (row.content) evidence.push(`content: "${this.truncateText(row.content, 100)}"`);
    
    return evidence.join(', ') || this.truncateText(JSON.stringify(row), 150);
  }
  
  private calculateConfidenceBreakdown(semanticResults: any, graphResults: any[], citations: any[]): any {
    const semanticConfidence = semanticResults.found > 0 ? 
      (semanticResults.results?.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / semanticResults.results?.length) || 0.3 : 0.1;
    
    const graphConfidence = graphResults.length > 0 ? 0.8 : 0.2;
    
    const citationCount = citations.length;
    const synthesisConfidence = Math.min(0.2 + (citationCount * 0.1), 1.0);
    
    const overallConfidence = (semanticConfidence * 0.4 + graphConfidence * 0.4 + synthesisConfidence * 0.2);
    
    return {
      overall_confidence: overallConfidence,
      semantic_confidence: semanticConfidence,
      graph_confidence: graphConfidence,
      synthesis_confidence: synthesisConfidence,
      reasoning: `Based on ${citationCount} citations, ${semanticResults.found || 0} semantic matches, ${graphResults.length} graph results`
    };
  }
  
  private countCitationsInAnswer(answer: string): number {
    return (answer.match(/\[[\w-]+\]/g) || []).length;
  }
  
  private deduplicateCitations(citations: any[]): any[] {
    const seen = new Set();
    return citations.filter(citation => {
      const key = citation.node_id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
  
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4); // Rough estimation
  }
  
  async answerWithSteps(question: string, kb_id: string = 'confluence-kb'): Promise<{
    answer: string;
    steps: Array<{ step: string; tool: string; result: any }>;
  }> {
    const steps: Array<{ step: string; tool: string; result: any }> = [];
    
    try {
      // Step 1: Get KB info
      const kbInfoTool = this.tools.find(t => t.name === 'kb_info');
      const kbInfo = await kbInfoTool._call(JSON.stringify({ kb_id }));
      steps.push({
        step: 'Retrieved knowledge base schema and info',
        tool: 'kb_info',
        result: JSON.parse(kbInfo)
      });
      
      // Step 2: Semantic search
      const semanticTool = this.tools.find(t => t.name === 'semantic_search');
      const semanticResults = await semanticTool._call(JSON.stringify({
        kb_id,
        text: question,
        top_k: 5
      }));
      steps.push({
        step: 'Performed semantic search for relevant content',
        tool: 'semantic_search',
        result: JSON.parse(semanticResults)
      });
      
      // Step 3: Graph search
      const graphTool = this.tools.find(t => t.name === 'search_graph');
      
      // Smart Cypher query generation based on question
      let cypher = 'MATCH (n) RETURN n LIMIT 10';
      if (question.toLowerCase().includes('document')) {
        cypher = 'MATCH (n:Document) RETURN n.kb_id as kb_id, n.title as title, n.content as content LIMIT 5';
      } else if (question.toLowerCase().includes('person') || question.toLowerCase().includes('author')) {
        cypher = 'MATCH (p:Person)-[r]->(n) RETURN p.name as person, type(r) as relationship, n.title as target LIMIT 5';
      } else if (question.toLowerCase().includes('relationship') || question.toLowerCase().includes('connect')) {
        cypher = 'MATCH (a)-[r]->(b) RETURN labels(a) as from_type, type(r) as relationship, labels(b) as to_type LIMIT 10';
      }
      
      const graphResults = await graphTool._call(JSON.stringify({
        kb_id,
        cypher,
        params: {}
      }));
      steps.push({
        step: 'Executed graph query to find relationships',
        tool: 'search_graph',
        result: JSON.parse(graphResults)
      });
      
      // Step 4: Generate final answer
      const answer = await this.synthesizeAnswer(question, kb_id, steps);
      
      return { answer, steps };
      
    } catch (error) {
      return {
        answer: `Error generating answer: ${(error as Error).message}`,
        steps
      };
    }
  }

  private async synthesizeAnswer(question: string, kb_id: string, steps: any[]): Promise<string> {
    const synthesisPrompt = `You are a Knowledge Graph RAG assistant. Based on the search steps below, provide a comprehensive answer to the user's question.

Question: ${question}
Knowledge Base: ${kb_id}

Search Steps:
${steps.map((step, i) => `
Step ${i + 1}: ${step.step}
Tool: ${step.tool}
Result: ${JSON.stringify(step.result, null, 2)}
`).join('\n')}

Provide a response that:
1. Directly answers the question based on the evidence
2. Cites specific node IDs, properties, and relationships from the results
3. Explains how the different pieces of information relate to each other
4. Provides a confidence assessment

Format:
**Answer:** [Direct answer to the question]

**Evidence:** [Specific citations from the search results]

**Confidence:** [High/Medium/Low] - [Reasoning]`;

    const response = await this.llm.invoke([
      new HumanMessage(synthesisPrompt)
    ]);

    return response.content as string;
  }
}

// Export a convenience function
export async function createGraphRAGAgent(mcpUrl?: string, ollamaModel?: string): Promise<GraphRAGAgent> {
  return new GraphRAGAgent(mcpUrl, ollamaModel);
}
