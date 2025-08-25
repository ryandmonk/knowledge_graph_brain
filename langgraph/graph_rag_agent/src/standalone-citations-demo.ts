#!/usr/bin/env npx tsx

/**
 * Standalone Enhanced Citations Demo
 * Showcases comprehensive citation tracking without dependencies
 */

import { 
  CitationEnhancer, 
  DetailedCitation, 
  ProvenanceStep, 
  EnhancedAnswer 
} from './enhanced-citations';

async function runStandaloneCitationsDemo() {
  console.log('🔍 Enhanced Citations Demo - Knowledge Graph RAG Agent');
  console.log('═'.repeat(80));
  
  const question = "What documents are available about Confluence documentation?";
  const kb_id = "confluence-demo";
  
  console.log(`📝 Question: ${question}`);
  console.log(`📊 Knowledge Base: ${kb_id}\n`);
  
  // Simulate the enhanced citations process
  const startTime = Date.now();
  
  // 1. Mock semantic search results
  const mockSemanticResults = {
    found: 3,
    results: [
      {
        node_id: 'doc-confluence-001',
        score: 0.89,
        content: {
          title: 'Getting Started with Confluence',
          content: 'This document explains how to use Confluence for documentation and collaboration...',
          author: 'jane.doe@company.com',
          created_at: '2025-08-20T10:30:00Z'
        }
      },
      {
        node_id: 'doc-api-guide-002', 
        score: 0.74,
        content: {
          title: 'Confluence API Guide',
          content: 'Complete guide to using the Confluence REST API for automation...',
          author: 'john.smith@company.com',
          created_at: '2025-08-18T14:15:00Z'
        }
      }
    ]
  };
  
  // 2. Mock graph query results
  const mockGraphResults = [
    {
      person_id: 'person-jane-doe',
      name: 'Jane Doe',
      relationship: 'AUTHORED_BY',
      target_title: 'Getting Started with Confluence'
    },
    {
      from_id: 'doc-confluence-001',
      from_type: ['Document'],
      relationship: 'BELONGS_TO',
      to_id: 'space-engineering-docs',
      to_type: ['Space']
    }
  ];
  
  // 3. Generate enhanced citations
  const citations: DetailedCitation[] = [];
  
  // Extract citations from semantic results
  for (const result of mockSemanticResults.results) {
    citations.push({
      node_id: result.node_id,
      node_type: ['Document', 'Page'],
      relevance_score: result.score,
      source_data: result.content,
      supporting_evidence: CitationEnhancer.extractSupportingEvidence(result.content, question),
      confidence: CitationEnhancer.calculateConfidenceFromScore(result.score)
    });
  }
  
  // Extract citations from graph results
  for (const row of mockGraphResults) {
    const nodeId = CitationEnhancer.extractNodeId(row);
    if (nodeId) {
      citations.push({
        node_id: nodeId,
        node_type: CitationEnhancer.extractNodeTypes(row),
        source_data: row,
        supporting_evidence: CitationEnhancer.extractGraphEvidence(row, question),
        confidence: 0.82
      });
    }
  }
  
  // 4. Create provenance chain
  const provenanceChain: ProvenanceStep[] = [
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
      results_found: mockSemanticResults.found,
      key_findings: mockSemanticResults.results.slice(0, 2).map(r => 
        `${r.node_id}: ${r.score.toFixed(3)} score - ${CitationEnhancer.truncateText(r.content.title, 50)}`
      )
    },
    {
      step: 3,
      action: 'Executed targeted graph queries for document relationships',
      tool_used: 'search_graph',
      query_executed: 'MATCH (d:Document {kb_id: $kb_id}) WHERE d.content IS NOT NULL RETURN d.id...',
      results_found: mockGraphResults.length,
      key_findings: [
        'Found 2 documents with content',
        'Found 1 authorship relationship',
        'Found 1 space membership relationship'
      ]
    },
    {
      step: 4,
      action: 'Synthesized comprehensive answer with LLM integration',
      tool_used: 'ollama_llm',
      query_executed: 'llm_synthesis(context_tokens=1847)',
      results_found: 1,
      key_findings: [
        'Answer generated with embedded citations',
        'Citations verified against source data',
        'Confidence scores calculated'
      ]
    }
  ];
  
  // 5. Calculate confidence breakdown
  const confidenceBreakdown = CitationEnhancer.calculateConfidenceBreakdown(
    mockSemanticResults,
    mockGraphResults,
    citations
  );
  
  // 6. Generate final answer with citations
  const finalAnswer = `Based on the knowledge base analysis, there are several documents available about Confluence documentation:

**Primary Documents:**
• [doc-confluence-001] "Getting Started with Confluence" - A comprehensive guide that explains how to use Confluence for documentation and collaboration (confidence: 89%)
• [doc-api-guide-002] "Confluence API Guide" - Complete guide to using the Confluence REST API for automation (confidence: 74%)

**Authorship & Organization:**
• [person-jane-doe] Jane Doe authored the getting started guide, providing foundational knowledge for users
• Documents are properly organized within the knowledge base with clear relationships to [space-engineering-docs] Engineering Documentation space

**Content Quality:**
The documentation shows high semantic relevance to Confluence-related queries, with strong evidence of comprehensive coverage including both user-facing documentation and technical API guidance.`;
  
  const processingTime = Date.now() - startTime;
  
  // 7. Create enhanced answer object
  const enhancedAnswer: EnhancedAnswer = {
    answer: finalAnswer,
    citations: CitationEnhancer.deduplicateCitations(citations),
    provenance_chain: provenanceChain,
    confidence_breakdown: confidenceBreakdown,
    metadata: {
      total_sources_consulted: mockSemanticResults.found + mockGraphResults.length,
      unique_node_types: ['Document', 'Person', 'Space'],
      query_complexity_score: CitationEnhancer.calculateQueryComplexity([
        { cypher: 'MATCH (d:Document) WHERE d.content IS NOT NULL RETURN d' }
      ]),
      processing_time_ms: processingTime
    }
  };
  
  // Display the results
  displayEnhancedAnswer(enhancedAnswer);
}

function displayEnhancedAnswer(answer: EnhancedAnswer) {
  console.log('🎯 ENHANCED ANSWER WITH COMPREHENSIVE CITATIONS');
  console.log('═'.repeat(80));
  console.log(answer.answer);
  
  console.log('\n\n📚 DETAILED CITATION ANALYSIS');
  console.log('═'.repeat(80));
  answer.citations.forEach((citation, i) => {
    console.log(`\n${i + 1}. Citation ID: [${citation.node_id}]`);
    console.log(`   Node Type(s): ${citation.node_type.join(' | ')}`);
    console.log(`   Confidence: ${(citation.confidence * 100).toFixed(1)}% ${getConfidenceEmoji(citation.confidence)}`);
    
    if (citation.relevance_score) {
      console.log(`   Relevance Score: ${(citation.relevance_score * 100).toFixed(1)}%`);
    }
    
    console.log(`   Supporting Evidence:`);
    console.log(`   └─ ${citation.supporting_evidence}`);
    
    if (citation.source_data.title) {
      console.log(`   Source Title: "${citation.source_data.title}"`);
    }
  });
  
  console.log('\n\n🔄 COMPREHENSIVE PROVENANCE CHAIN');
  console.log('═'.repeat(80));
  answer.provenance_chain.forEach((step, i) => {
    console.log(`\n📍 Step ${step.step}: ${step.action}`);
    console.log(`   🛠️  Tool Used: ${step.tool_used}`);
    console.log(`   ⚡ Query: ${CitationEnhancer.truncateText(step.query_executed, 70)}`);
    console.log(`   📊 Results Found: ${step.results_found}`);
    
    if (step.key_findings.length > 0) {
      console.log(`   🔍 Key Findings:`);
      step.key_findings.slice(0, 2).forEach(finding => {
        console.log(`      • ${finding}`);
      });
      if (step.key_findings.length > 2) {
        console.log(`      • ... and ${step.key_findings.length - 2} more`);
      }
    }
  });
  
  console.log('\n\n📊 CONFIDENCE BREAKDOWN ANALYSIS');
  console.log('═'.repeat(80));
  const cb = answer.confidence_breakdown;
  
  console.log(`\n🎯 Overall Confidence: ${(cb.overall_confidence * 100).toFixed(1)}% ${getConfidenceEmoji(cb.overall_confidence)}`);
  console.log(`\n📈 Component Breakdown:`);
  console.log(`   🔍 Semantic Search: ${(cb.semantic_confidence * 100).toFixed(1)}% ${getConfidenceEmoji(cb.semantic_confidence)}`);
  console.log(`   🕸️  Graph Queries:   ${(cb.graph_confidence * 100).toFixed(1)}% ${getConfidenceEmoji(cb.graph_confidence)}`);
  console.log(`   🧠 LLM Synthesis:   ${(cb.synthesis_confidence * 100).toFixed(1)}% ${getConfidenceEmoji(cb.synthesis_confidence)}`);
  
  console.log(`\n💡 Confidence Reasoning:`);
  console.log(`   ${cb.reasoning}`);
  
  console.log('\n\n⚡ PERFORMANCE & METADATA');
  console.log('═'.repeat(80));
  console.log(`🕐 Processing Time: ${answer.metadata.processing_time_ms}ms`);
  console.log(`📚 Total Sources Consulted: ${answer.metadata.total_sources_consulted}`);
  console.log(`🎯 Query Complexity Score: ${answer.metadata.query_complexity_score.toFixed(1)}/10`);
  console.log(`🔗 Citations Generated: ${answer.citations.length}`);
  console.log(`🏷️  Node Types Discovered: ${answer.metadata.unique_node_types.join(', ')}`);
  console.log(`📝 Citations in Answer: ${CitationEnhancer.countCitationsInAnswer(answer.answer)}`);
  
  console.log('\n\n🎉 ENHANCED CITATIONS DEMO COMPLETE!');
  console.log('═'.repeat(80));
  console.log('✨ Key Features Demonstrated:');
  console.log('   ✅ Comprehensive citation tracking with node IDs');
  console.log('   ✅ Detailed provenance chain showing reasoning steps');
  console.log('   ✅ Multi-faceted confidence scoring (semantic + graph + synthesis)');
  console.log('   ✅ Supporting evidence extraction from multiple sources');
  console.log('   ✅ Query complexity analysis and performance metrics');
  console.log('   ✅ Citation deduplication and quality scoring');
  console.log('   ✅ Professional formatting for enterprise use');
  
  console.log('\n🚀 Ready for production deployment with full citation transparency!');
}

function getConfidenceEmoji(confidence: number): string {
  if (confidence >= 0.9) return '🟢';
  if (confidence >= 0.8) return '🟡'; 
  if (confidence >= 0.6) return '🟠';
  return '🔴';
}

// Run the demo
runStandaloneCitationsDemo().catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});
