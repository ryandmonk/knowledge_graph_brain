# Knowledge Graph Brain - GraphRAG Integration

Advanced Graph-enhanced Retrieval-Augmented Generation using LangGraph agents with semantic search, knowledge graph traversal, and hybrid reasoning patterns.

## Overview

Knowledge Graph Brain provides sophisticated GraphRAG capabilities that combine:
- **Semantic Search** - Vector-based similarity search for content discovery
- **Graph Traversal** - Relationship-aware entity exploration  
- **Hybrid Reasoning** - Multi-modal information retrieval patterns
- **LangGraph Integration** - Professional agent framework for complex reasoning workflows

## Architecture

### GraphRAG Components

```typescript
// Core GraphRAG capabilities in the orchestrator
interface GraphRAGCapabilities {
  // Semantic search with vector embeddings
  semantic_search(query: string, options: SearchOptions): VectorResults;
  
  // Cypher-based graph queries
  search_graph(cypher: string, params?: object): GraphResults;
  
  // Hybrid search combining both approaches
  hybrid_search(query: string, options: HybridOptions): CombinedResults;
  
  // Graph-aware reasoning paths
  explore_relationships(entityId: string, depth: number): RelationshipPaths;
}
```

### Integration with LangGraph

The system includes a production-ready LangGraph agent:

**Location**: `/langgraph/graph_rag_agent/`

**Features**:
- ✅ Multi-strategy reasoning (graph-first, semantic-first, hybrid)
- ✅ Tool integration with orchestrator APIs
- ✅ Context-aware response generation
- ✅ Error handling and fallback strategies
- ✅ Performance monitoring and metrics

## GraphRAG Patterns

### Pattern 1: Graph-First Reasoning

Start with structured knowledge graph queries, then use semantic search for content enrichment.

```typescript
// LangGraph agent implementation
import { Agent, Tool } from '@langchain/langgraph';

class GraphRAGAgent {
  constructor(orchestratorUrl: string) {
    this.tools = [
      new GraphSearchTool(orchestratorUrl),
      new SemanticSearchTool(orchestratorUrl),
      new HybridSearchTool(orchestratorUrl)
    ];
  }

  async answerQuestion(question: string, strategy: 'graph-first' | 'semantic-first' | 'hybrid') {
    switch (strategy) {
      case 'graph-first':
        return this.graphFirstReasoning(question);
      case 'semantic-first':
        return this.semanticFirstReasoning(question);
      case 'hybrid':
        return this.hybridReasoning(question);
    }
  }

  private async graphFirstReasoning(question: string): Promise<AgentResponse> {
    // 1. Extract entities from question
    const entities = await this.extractEntities(question);
    
    // 2. Query knowledge graph for relationships
    const graphResults = await this.searchGraph({
      query: `MATCH (n)-[r]-(m) WHERE n.name IN $entities RETURN n, r, m`,
      params: { entities }
    });
    
    // 3. Use semantic search to enrich with content
    const semanticResults = await this.semanticSearch({
      query: question,
      entities: graphResults.entities,
      top_k: 10
    });
    
    // 4. Synthesize answer
    return this.synthesizeAnswer(question, { graphResults, semanticResults });
  }
}
```

### Pattern 2: Semantic-First Discovery

Use semantic search for broad content discovery, then use graph traversal for precise relationship exploration.

```typescript
private async semanticFirstReasoning(question: string): Promise<AgentResponse> {
  // 1. Semantic search for relevant content
  const semanticResults = await this.semanticSearch({
    query: question,
    top_k: 20,
    include_metadata: true
  });
  
  // 2. Extract entities from semantic results
  const discoveredEntities = this.extractEntitiesFromResults(semanticResults);
  
  // 3. Explore relationships in knowledge graph
  const graphResults = await this.exploreRelationships(discoveredEntities, {
    max_depth: 3,
    relationship_types: ['RELATED_TO', 'AUTHORED_BY', 'CONTAINS']
  });
  
  // 4. Synthesize comprehensive answer
  return this.synthesizeAnswer(question, { semanticResults, graphResults });
}
```

### Pattern 3: Multi-Hop Reasoning

Handle complex questions requiring multiple reasoning steps across the knowledge graph.

```typescript
private async multiHopReasoning(question: string): Promise<AgentResponse> {
  const reasoningSteps: ReasoningStep[] = [];
  
  // Step 1: Initial entity identification
  let currentContext = await this.semanticSearch({
    query: question,
    top_k: 5
  });
  
  reasoningSteps.push({
    step: 1,
    action: 'initial_discovery',
    results: currentContext
  });
  
  // Step 2-N: Iterative graph exploration
  for (let hop = 1; hop <= 3; hop++) {
    const entities = this.extractEntitiesFromContext(currentContext);
    
    const graphStep = await this.searchGraph({
      query: `
        MATCH (start)-[r1:*1..${hop}]-(intermediate)-[r2]-(target)
        WHERE start.id IN $entities
        RETURN start, intermediate, target, r1, r2
        LIMIT 50
      `,
      params: { entities }
    });
    
    // Evaluate if this step answers the question
    const relevanceScore = await this.evaluateRelevance(question, graphStep);
    
    reasoningSteps.push({
      step: hop + 1,
      action: `graph_traversal_hop_${hop}`,
      results: graphStep,
      relevance: relevanceScore
    });
    
    if (relevanceScore > 0.8) break; // Found sufficient information
    currentContext = this.mergeContext(currentContext, graphStep);
  }
  
  // Final synthesis
  return this.synthesizeAnswer(question, { reasoningSteps });
}
```

## Production Implementation

### LangGraph Agent Setup

```typescript
// /langgraph/graph_rag_agent/src/agent.ts
import { StateGraph, END } from '@langchain/langgraph';

export class ProductionGraphRAGAgent {
  private graph: StateGraph;
  
  constructor(config: AgentConfig) {
    this.graph = new StateGraph({
      channels: {
        question: { reducer: (x, y) => y },
        context: { reducer: (x, y) => [...x, ...y] },
        reasoning_steps: { reducer: (x, y) => [...x, ...y] },
        final_answer: { reducer: (x, y) => y }
      }
    });
    
    this.buildGraph();
  }
  
  private buildGraph() {
    // Node definitions
    this.graph.addNode('analyze_question', this.analyzeQuestion.bind(this));
    this.graph.addNode('semantic_search', this.performSemanticSearch.bind(this));
    this.graph.addNode('graph_search', this.performGraphSearch.bind(this));
    this.graph.addNode('hybrid_reasoning', this.performHybridReasoning.bind(this));
    this.graph.addNode('synthesize_answer', this.synthesizeAnswer.bind(this));
    
    // Edge definitions with conditional routing
    this.graph.addConditionalEdges(
      'analyze_question',
      this.routeStrategy.bind(this),
      {
        'semantic_first': 'semantic_search',
        'graph_first': 'graph_search',
        'hybrid': 'hybrid_reasoning'
      }
    );
    
    this.graph.addEdge('semantic_search', 'graph_search');
    this.graph.addEdge('graph_search', 'synthesize_answer');
    this.graph.addEdge('hybrid_reasoning', 'synthesize_answer');
    this.graph.addEdge('synthesize_answer', END);
    
    // Set entry point
    this.graph.setEntryPoint('analyze_question');
  }
  
  private async analyzeQuestion(state: AgentState): Promise<AgentState> {
    const analysis = await this.questionAnalyzer.analyze(state.question);
    
    return {
      ...state,
      question_type: analysis.type,
      entities: analysis.entities,
      complexity: analysis.complexity,
      suggested_strategy: analysis.suggested_strategy
    };
  }
  
  private routeStrategy(state: AgentState): string {
    // Intelligent routing based on question analysis
    if (state.complexity === 'high' && state.entities.length > 3) {
      return 'hybrid';
    } else if (state.question_type === 'relationship') {
      return 'graph_first';
    } else {
      return 'semantic_first';
    }
  }
}
```

### Tool Integration

```typescript
// Integration with Knowledge Graph Brain orchestrator
export class GraphSearchTool extends Tool {
  constructor(private orchestratorUrl: string) {
    super({
      name: 'graph_search',
      description: 'Search the knowledge graph using Cypher queries'
    });
  }
  
  async _call(input: string): Promise<string> {
    try {
      const response = await fetch(`${this.orchestratorUrl}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kb_id: this.kbId,
          cypher: input,
          params: {}
        })
      });
      
      const results = await response.json();
      return JSON.stringify(results.data);
      
    } catch (error) {
      console.error('Graph search error:', error);
      return JSON.stringify({ error: 'Graph search failed', details: error.message });
    }
  }
}

export class SemanticSearchTool extends Tool {
  constructor(private orchestratorUrl: string) {
    super({
      name: 'semantic_search',
      description: 'Perform semantic similarity search using vector embeddings'
    });
  }
  
  async _call(input: string): Promise<string> {
    try {
      const response = await fetch(`${this.orchestratorUrl}/api/semantic-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kb_id: this.kbId,
          query: input,
          top_k: 10,
          include_content: true
        })
      });
      
      const results = await response.json();
      return JSON.stringify(results.results);
      
    } catch (error) {
      console.error('Semantic search error:', error);
      return JSON.stringify({ error: 'Semantic search failed', details: error.message });
    }
  }
}
```

## **Enhanced Citation Framework** (v0.10.0+)

Knowledge Graph Brain now provides research-grade citation and provenance tracking for all GraphRAG responses.

### **Citation Data Structures**

```typescript
interface Citation {
  source_id: string;
  source_type: 'document' | 'database_record' | 'api_response';
  title: string;
  url?: string;
  confidence_level: 'high' | 'medium' | 'low';
  relevance_score: number; // 0.0-1.0
  supporting_evidence: string[];
  provenance_chain: ProvenanceStep[];
}

interface ProvenanceStep {
  step_id: string;
  operation: 'semantic_search' | 'graph_traversal' | 'inference';
  timestamp: string;
  confidence: number;
  source_nodes: string[];
  reasoning: string;
}

interface EnhancedAgentResponse {
  answer: string;
  confidence_level: 'high' | 'medium' | 'low';
  primary_sources: Citation[];
  supporting_sources: Citation[];
  reasoning_path: string[];
  total_sources_consulted: number;
  provenance_summary: string;
}
```

### **Professional Citation Generation**

```typescript
class CitationFramework {
  async generateCitations(
    searchResults: SearchResult[], 
    graphResults: GraphResult[]
  ): Promise<Citation[]> {
    const citations: Citation[] = [];
    
    // Process semantic search results
    for (const result of searchResults) {
      citations.push({
        source_id: result.node_id,
        source_type: 'document',
        title: result.properties.title,
        url: result.properties.url,
        confidence_level: this.calculateConfidence(result.score),
        relevance_score: result.score,
        supporting_evidence: [result.content.substring(0, 200)],
        provenance_chain: [{
          step_id: `sem_${Date.now()}`,
          operation: 'semantic_search',
          timestamp: new Date().toISOString(),
          confidence: result.score,
          source_nodes: [result.node_id],
          reasoning: `Vector similarity match for query with score ${result.score}`
        }]
      });
    }
    
    // Process graph traversal results  
    for (const result of graphResults) {
      citations.push({
        source_id: result.node.id,
        source_type: this.inferSourceType(result.node.labels),
        title: result.node.properties.name || result.node.properties.title,
        confidence_level: 'high', // Graph relationships are highly reliable
        relevance_score: 0.9, // Structural relevance
        supporting_evidence: this.extractEvidence(result.relationships),
        provenance_chain: [{
          step_id: `graph_${Date.now()}`,
          operation: 'graph_traversal', 
          timestamp: new Date().toISOString(),
          confidence: 0.95,
          source_nodes: result.path.map(n => n.id),
          reasoning: `Graph relationship traversal via ${result.relationship_type}`
        }]
      });
    }
    
    return this.dedupAndRank(citations);
  }
  
  private calculateConfidence(score: number): 'high' | 'medium' | 'low' {
    if (score > 0.8) return 'high';
    if (score > 0.6) return 'medium'; 
    return 'low';
  }
}
```

### **Example Enhanced Response**

```typescript
// Example output with comprehensive citations
const response: EnhancedAgentResponse = {
  answer: "Based on the knowledge graph analysis, there are three key documents about knowledge graphs: the 'Graph Database Fundamentals' guide authored by Dr. Sarah Chen, the 'Neo4j Implementation Patterns' document by the Engineering Team, and the 'Semantic Knowledge Representation' research paper by Dr. Michael Torres.",
  
  confidence_level: 'high',
  
  primary_sources: [
    {
      source_id: "doc-graph-fundamentals",
      source_type: 'document',
      title: "Graph Database Fundamentals",
      url: "https://company.com/docs/graph-fundamentals",
      confidence_level: 'high',
      relevance_score: 0.94,
      supporting_evidence: [
        "Comprehensive overview of graph database concepts...",
        "Detailed explanation of node and relationship modeling..."
      ],
      provenance_chain: [
        {
          step_id: "sem_1703123456789",
          operation: 'semantic_search',
          timestamp: "2024-12-20T14:30:56.789Z",
          confidence: 0.94,
          source_nodes: ["doc-graph-fundamentals"],
          reasoning: "Vector similarity match for 'knowledge graphs' with score 0.94"
        }
      ]
    }
  ],
  
  supporting_sources: [
    {
      source_id: "person-sarah-chen",
      source_type: 'database_record', 
      title: "Dr. Sarah Chen - Author Profile",
      confidence_level: 'high',
      relevance_score: 0.85,
      supporting_evidence: ["Primary author of foundational graph theory documentation"],
      provenance_chain: [
        {
          step_id: "graph_1703123456790",
          operation: 'graph_traversal',
          timestamp: "2024-12-20T14:30:57.790Z", 
          confidence: 0.95,
          source_nodes: ["doc-graph-fundamentals", "person-sarah-chen"],
          reasoning: "Graph relationship traversal via AUTHORED_BY relationship"
        }
      ]
    }
  ],
  
  reasoning_path: [
    "1. Executed semantic search for 'knowledge graphs' - found 3 highly relevant documents",
    "2. Performed graph traversal to identify document authors and relationships",
    "3. Cross-referenced document topics and author expertise",
    "4. Synthesized comprehensive answer with high confidence citations"
  ],
  
  total_sources_consulted: 8,
  provenance_summary: "Answer derived from 3 primary document sources with 95% confidence through combined semantic search and graph relationship analysis"
};
```

This enhanced citation framework ensures every GraphRAG response includes complete source attribution with confidence scoring and detailed provenance chains for research-grade transparency.

## Query Examples

### Complex Business Intelligence

**Question**: "Which products were purchased by customers who also bought items from the same category as our top-selling product last quarter?"

```cypher
// Multi-step Cypher query
MATCH (topProduct:Product)-[:SOLD_IN]->(q:Quarter {name: 'Q4 2024'})
WITH topProduct ORDER BY topProduct.sales_count DESC LIMIT 1

MATCH (topProduct)-[:BELONGS_TO]->(category:Category)

MATCH (customer:Customer)-[:PURCHASED]->(item:Product)-[:BELONGS_TO]->(category)
MATCH (customer)-[:PURCHASED]->(otherProducts:Product)
WHERE otherProducts <> topProduct AND otherProducts <> item

RETURN DISTINCT otherProducts.name, otherProducts.category, COUNT(customer) as purchase_count
ORDER BY purchase_count DESC
```

### Knowledge Discovery

**Question**: "Find research papers that cite documents authored by people who have published in similar domains to machine learning but focus on healthcare applications."

```cypher
// Complex relationship traversal
MATCH (ml_author:Author)-[:AUTHORED]->(ml_doc:Document)
WHERE ml_doc.domain CONTAINS 'machine learning'

MATCH (similar_author:Author)-[:AUTHORED]->(similar_doc:Document)
WHERE similar_author <> ml_author
  AND similar_doc.domain =~ '.*health.*|.*medical.*|.*clinical.*'

MATCH (citing_paper:Document)-[:CITES]->(similar_doc)

RETURN citing_paper.title, citing_paper.abstract, 
       similar_author.name, similar_doc.title
LIMIT 20
```

### Temporal Analysis

**Question**: "Show the evolution of topics in our knowledge base over the last year and identify emerging trends."

```cypher
// Time-series analysis with graph patterns
MATCH (doc:Document)-[:HAS_TOPIC]->(topic:Topic)
WHERE doc.created_at >= date('2024-01-01')

WITH topic, 
     date.truncate('month', doc.created_at) as month,
     COUNT(doc) as doc_count

ORDER BY month, doc_count DESC

WITH month, COLLECT({topic: topic.name, count: doc_count})[..10] as top_topics

RETURN month, top_topics
ORDER BY month
```

## Performance Optimization

### Caching Strategies

```typescript
class CachedGraphRAGAgent {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 300000; // 5 minutes
  
  async answerQuestion(question: string): Promise<AgentResponse> {
    const cacheKey = this.generateCacheKey(question);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.response;
    }
    
    const response = await this.processQuestion(question);
    
    this.cache.set(cacheKey, {
      response,
      timestamp: Date.now(),
      hits: (cached?.hits || 0) + 1
    });
    
    return response;
  }
  
  private generateCacheKey(question: string): string {
    // Create cache key considering semantic similarity
    return `${this.hashNormalized(question)}_${this.extractKeyEntities(question).join('_')}`;
  }
}
```

### Parallel Processing

```typescript
async performHybridSearch(query: string): Promise<HybridResults> {
  // Execute semantic and graph searches in parallel
  const [semanticResults, graphResults] = await Promise.all([
    this.semanticSearch({ query, top_k: 15 }),
    this.exploreEntities(this.extractEntities(query))
  ]);
  
  // Merge and rank results
  return this.mergeResults(semanticResults, graphResults, {
    semantic_weight: 0.6,
    graph_weight: 0.4
  });
}
```

## Monitoring & Analytics

### GraphRAG Metrics

```typescript
interface GraphRAGMetrics {
  query_performance: {
    semantic_search_latency: number;
    graph_traversal_latency: number;
    total_response_time: number;
  };
  
  accuracy_metrics: {
    answer_relevance: number;
    entity_extraction_accuracy: number;
    relationship_precision: number;
  };
  
  usage_patterns: {
    strategy_distribution: Record<string, number>;
    common_entity_types: Record<string, number>;
    query_complexity_distribution: Record<string, number>;
  };
}

class GraphRAGMonitor {
  async recordQuery(question: string, response: AgentResponse, metrics: QueryMetrics) {
    await this.metricsCollector.record({
      timestamp: new Date().toISOString(),
      question_hash: this.hashQuestion(question),
      strategy_used: response.strategy,
      response_time: metrics.total_time,
      semantic_results_count: metrics.semantic_results,
      graph_results_count: metrics.graph_results,
      answer_confidence: response.confidence,
      user_feedback: null // Populated later if feedback provided
    });
  }
}
```

## Best Practices

### Query Optimization

1. **Entity Extraction Tuning**: Use domain-specific NER models for better entity recognition
   ```typescript
   const entities = await this.nerModel.extractEntities(question, {
     model: 'domain-specific-ner',
     confidence_threshold: 0.8,
     entity_types: ['PERSON', 'ORGANIZATION', 'PRODUCT', 'CONCEPT']
   });
   ```

2. **Graph Query Optimization**: Use indexed properties and limit result sets
   ```cypher
   // Optimized query with proper indexing
   MATCH (n:Document {kb_id: $kb_id})
   WHERE n.created_at >= $start_date
   WITH n LIMIT 1000
   MATCH (n)-[r:RELATED_TO]-(m)
   RETURN n, r, m
   ```

3. **Semantic Search Tuning**: Adjust embedding parameters for domain-specific content
   ```yaml
   embedding:
     provider: "custom-domain-model:latest"
     chunking:
       strategy: "by_fields"
       fields: ["title", "content", "technical_terms"]
       max_tokens: 384  # Optimized for technical content
   ```

### Error Handling

```typescript
class RobustGraphRAGAgent {
  async answerQuestion(question: string): Promise<AgentResponse> {
    try {
      return await this.processQuestion(question);
    } catch (error) {
      // Fallback strategies
      if (error instanceof GraphConnectionError) {
        console.warn('Graph unavailable, using semantic-only strategy');
        return this.semanticOnlyResponse(question);
      }
      
      if (error instanceof EmbeddingError) {
        console.warn('Embeddings unavailable, using graph-only strategy');
        return this.graphOnlyResponse(question);
      }
      
      // Ultimate fallback
      return this.generateFallbackResponse(question, error);
    }
  }
}
```

## Development & Testing

### Local Development Setup

```bash
# Start development environment
cd langgraph/graph_rag_agent/
npm install
npm run dev

# Run with sample questions
npm run test:questions

# Performance testing
npm run test:performance
```

### Testing Framework

```typescript
// Sample test questions for GraphRAG evaluation
export const SAMPLE_QUESTIONS = [
  {
    question: "Which products are most popular with customers in the healthcare sector?",
    expected_strategy: "graph-first",
    expected_entities: ["Product", "Customer", "Sector"],
    complexity: "medium"
  },
  {
    question: "Find documents similar to the latest AI research papers that mention neural networks",
    expected_strategy: "semantic-first",
    expected_entities: ["Document", "Research", "AI", "Neural Networks"],
    complexity: "high"
  },
  {
    question: "Who are the most influential authors in machine learning based on citation patterns?",
    expected_strategy: "hybrid",
    expected_entities: ["Author", "Citation", "Machine Learning"],
    complexity: "high"
  }
];
```

## Related Documentation

- **[API Reference](./API.md)** - MCP and REST endpoints for GraphRAG
- **[Architecture](./ARCHITECTURE.md)** - System design and component integration
- **[DSL Reference](./dsl.md)** - Schema language for knowledge graph definition
- **[CLI Tools](./cli.md)** - Development and testing tools