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
