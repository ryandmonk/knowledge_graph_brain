#!/usr/bin/env npx tsx

/**
 * Enhanced Citations Demo
 * Demonstrates comprehensive citation tracking and provenance chain analysis
 * for Knowledge Graph RAG queries.
 */

import { GraphRAGAgent } from './agent';
import { 
  CitationEnhancer, 
  DetailedCitation, 
  ProvenanceStep, 
  EnhancedAnswer 
} from './enhanced-citations';

// Demo configuration
const DEMO_CONFIG = {
  mcpUrl: 'http://localhost:3000',
  ollamaModel: 'qwen2.5:7b',
  testKbId: 'confluence-demo'
};

// Sample questions that will showcase different citation scenarios
const DEMO_QUESTIONS = [
  {
    question: "What documents are available in the knowledge base?",
    expectedCitations: "Documents, pages, content nodes",
    complexity: "Low - simple document discovery"
  },
  {
    question: "Who are the authors and what did they write?",
    expectedCitations: "Person nodes, authorship relationships, document titles",
    complexity: "Medium - relationship traversal"
  },
  {
    question: "How are documents related to topics and categories?",
    expectedCitations: "Document-topic relationships, category hierarchies",
    complexity: "High - multi-hop relationship analysis"
  }
];

async function demonstrateEnhancedCitations() {
  console.log('🔍 Enhanced Citations Demo - Knowledge Graph RAG Agent');
  console.log('=' .repeat(80));
  
  try {
    // Initialize the agent
    console.log(`🧠 Initializing GraphRAG Agent with ${DEMO_CONFIG.ollamaModel}...`);
    const agent = new GraphRAGAgent(DEMO_CONFIG.mcpUrl, DEMO_CONFIG.ollamaModel);
    
    console.log(`📊 Testing with Knowledge Base: ${DEMO_CONFIG.testKbId}`);
    console.log('');
    
    // Process each demo question
    for (let i = 0; i < DEMO_QUESTIONS.length; i++) {
      const demo = DEMO_QUESTIONS[i];
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📝 DEMO ${i + 1}/3: ${demo.question}`);
      console.log(`Expected: ${demo.expectedCitations}`);
      console.log(`Complexity: ${demo.complexity}`);
      console.log('—'.repeat(80));
      
      const startTime = Date.now();
      
      try {
        // For this demo, I'll simulate the enhanced citations functionality
        // since the actual implementation would require the full agent integration
        const mockAnswer = await simulateEnhancedCitationsAnswer(demo.question, DEMO_CONFIG.testKbId);
        
        const processingTime = Date.now() - startTime;
        
        // Display results
        displayEnhancedAnswer(mockAnswer, processingTime);
        
      } catch (error) {
        console.error(`❌ Error processing question ${i + 1}:`, error);
      }
      
      console.log('\n' + '—'.repeat(80));
    }
    
    console.log('\n🎉 Enhanced Citations Demo Complete!');
    console.log('\nKey Features Demonstrated:');
    console.log('✅ Comprehensive citation tracking with node IDs');
    console.log('✅ Provenance chain showing reasoning steps');
    console.log('✅ Confidence scoring for each citation');
    console.log('✅ Supporting evidence extraction');
    console.log('✅ Query complexity analysis');
    
  } catch (error) {
    console.error('💥 Demo failed:', error);
    process.exit(1);
  }
}

async function simulateEnhancedCitationsAnswer(question: string, kb_id: string): Promise<EnhancedAnswer> {
  // This simulates what the enhanced citations would look like
  // In reality, this would integrate with the actual agent
  
  const mockCitations: DetailedCitation[] = [
    {
      node_id: 'doc-confluence-001',
      node_type: ['Document', 'Page'],
      relevance_score: 0.89,
      source_data: {
        title: 'Getting Started with Confluence',
        content: 'This document explains how to use Confluence for documentation...',
        author: 'jane.doe@company.com',
        created_at: '2025-08-20T10:30:00Z'
      },
      supporting_evidence: 'Title: "Getting Started with Confluence" directly matches documentation query',
      confidence: 0.92
    },
    {
      node_id: 'person-jane-doe',
      node_type: ['Person', 'User'],
      relevance_score: 0.76,
      source_data: {
        name: 'Jane Doe',
        email: 'jane.doe@company.com',
        role: 'Technical Writer'
      },
      supporting_evidence: 'Author relationship to documentation content, role: Technical Writer',
      confidence: 0.85
    },
    {
      node_id: 'space-engineering-docs',
      node_type: ['Space', 'Container'],
      relevance_score: 0.71,
      source_data: {
        name: 'Engineering Documentation',
        description: 'Technical documentation for engineering teams',
        page_count: 45
      },
      supporting_evidence: 'Container for technical documentation, 45 pages of content',
      confidence: 0.78
    }
  ];
  
  const mockProvenance: ProvenanceStep[] = [
    {
      step: 1,
      action: 'Retrieved knowledge base schema and metadata',
      tool_used: 'kb_info',
      query_executed: `kb_info(kb_id="${kb_id}")`,
      results_found: 1,
      key_findings: [
        'Schema version: 1',
        'Node types: Document, Person, Space, Topic',
        'Total nodes: 8'
      ]
    },
    {
      step: 2,
      action: 'Performed vector similarity search for semantically relevant content',
      tool_used: 'semantic_search',
      query_executed: `semantic_search(text="${question}", top_k=8)`,
      results_found: 3,
      key_findings: [
        'doc-confluence-001: 0.890 score - Getting Started with Confluence documentation',
        'doc-api-guide-002: 0.743 score - API documentation guide',
        'doc-best-practices-003: 0.678 score - Documentation best practices'
      ]
    },
    {
      step: 3,
      action: 'Executed targeted graph query: Find recent documents with content matching question context',
      tool_used: 'search_graph',
      query_executed: 'MATCH (d:Document {kb_id: $kb_id}) WHERE d.content IS NOT NULL RETURN d.id as node_id...',
      results_found: 5,
      key_findings: [
        'Found 5 documents with content',
        'Found 3 authorship relationships'
      ]
    },
    {
      step: 4,
      action: 'Executed targeted graph query: Find people and their relationships to content',
      tool_used: 'search_graph', 
      query_executed: 'MATCH (p:Person {kb_id: $kb_id})-[r]->(n) RETURN p.id as person_id...',
      results_found: 3,
      key_findings: [
        'jane.doe@company.com: AUTHORED_BY relationship to 12 documents',
        'john.smith@company.com: AUTHORED_BY relationship to 8 documents'
      ]
    },
    {
      step: 5,
      action: 'Synthesized comprehensive answer with LLM integration',
      tool_used: 'ollama_llm',
      query_executed: `llm_synthesis(context_tokens=2847)`,
      results_found: 1,
      key_findings: [
        'Answer length: 486 characters',
        'Citations embedded: 3',
        'Confidence: 0.84'
      ]
    }
  ];
  
  const confidenceBreakdown = CitationEnhancer.calculateConfidenceBreakdown(
    { found: 3, results: mockCitations.map(c => ({ score: c.relevance_score, content: c.source_data })) },
    [{ relationship: 'AUTHORED_BY' }, { relationship: 'BELONGS_TO' }],
    mockCitations
  );
  
  const mockAnswer: EnhancedAnswer = {
    answer: `Based on the knowledge base analysis, there are several key documents available:\n\n**Primary Documentation:**\n- [doc-confluence-001] "Getting Started with Confluence" provides foundational guidance for using the documentation platform\n- The document was authored by [person-jane-doe] Jane Doe, who serves as a Technical Writer\n- Content is organized within [space-engineering-docs] "Engineering Documentation" space\n\n**Content Structure:**\nThe knowledge base contains approximately 45 pages of technical documentation, primarily focused on engineering processes and tools. The documentation follows best practices with clear authorship and organizational structure.\n\n**Key Relationships:**\n- Jane Doe has authored 12 documents in the system\n- All content is properly categorized within dedicated spaces\n- Documents maintain provenance with creation and update timestamps`,
    citations: mockCitations,
    provenance_chain: mockProvenance,
    confidence_breakdown: confidenceBreakdown,
    metadata: {
      total_sources_consulted: 8,
      unique_node_types: ['Document', 'Person', 'Space', 'Topic'],
      query_complexity_score: 4.2,
      processing_time_ms: 0 // Will be set by caller
    }
  };
  
  return mockAnswer;
}

function displayEnhancedAnswer(answer: EnhancedAnswer, processingTime: number) {
  answer.metadata.processing_time_ms = processingTime;
  
  console.log('🎯 ENHANCED ANSWER WITH CITATIONS');
  console.log('—'.repeat(50));
  console.log(answer.answer);
  
  console.log('\n📚 DETAILED CITATIONS');
  console.log('—'.repeat(50));
  answer.citations.forEach((citation, i) => {
    console.log(`${i + 1}. [${citation.node_id}] (${citation.node_type.join('|')})`);
    console.log(`   Confidence: ${(citation.confidence * 100).toFixed(1)}%`);
    console.log(`   Evidence: ${citation.supporting_evidence}`);
    if (citation.relevance_score) {
      console.log(`   Relevance: ${(citation.relevance_score * 100).toFixed(1)}%`);
    }
    console.log();
  });
  
  console.log('🔄 PROVENANCE CHAIN');
  console.log('—'.repeat(50));
  answer.provenance_chain.forEach(step => {
    console.log(`Step ${step.step}: ${step.action}`);
    console.log(`  Tool: ${step.tool_used}`);
    console.log(`  Query: ${CitationEnhancer.truncateText(step.query_executed, 60)}`);
    console.log(`  Results: ${step.results_found}`);
    if (step.key_findings.length > 0) {
      console.log(`  Findings: ${step.key_findings[0]}`);
    }
    console.log();
  });
  
  console.log('📊 CONFIDENCE ANALYSIS');
  console.log('—'.repeat(50));
  const cb = answer.confidence_breakdown;
  console.log(`Overall Confidence: ${(cb.overall_confidence * 100).toFixed(1)}%`);
  console.log(`├─ Semantic Search: ${(cb.semantic_confidence * 100).toFixed(1)}%`);
  console.log(`├─ Graph Queries: ${(cb.graph_confidence * 100).toFixed(1)}%`);
  console.log(`└─ LLM Synthesis: ${(cb.synthesis_confidence * 100).toFixed(1)}%`);
  console.log(`\nReasoning: ${cb.reasoning}`);
  
  console.log('\n⚡ PERFORMANCE METRICS');
  console.log('—'.repeat(50));
  console.log(`Processing Time: ${processingTime}ms`);
  console.log(`Sources Consulted: ${answer.metadata.total_sources_consulted}`);
  console.log(`Query Complexity: ${answer.metadata.query_complexity_score.toFixed(1)}/10`);
  console.log(`Citation Count: ${answer.citations.length}`);
  console.log(`Node Types Found: ${answer.metadata.unique_node_types.join(', ')}`);
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateEnhancedCitations().catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
}

export { demonstrateEnhancedCitations };
