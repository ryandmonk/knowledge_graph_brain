/**
 * Enhanced Citations Module for Knowledge Graph RAG Agent
 * Provides comprehensive citation tracking and provenance chain analysis
 */

export interface DetailedCitation {
  node_id: string;
  node_type: string[];
  relevance_score?: number;
  source_data: any;
  supporting_evidence: string;
  confidence: number;
}

export interface ProvenanceStep {
  step: number;
  action: string;
  tool_used: string;
  query_executed: string;
  results_found: number;
  key_findings: string[];
}

export interface ConfidenceBreakdown {
  overall_confidence: number;
  semantic_confidence: number;
  graph_confidence: number;
  synthesis_confidence: number;
  reasoning: string;
}

export interface EnhancedAnswer {
  answer: string;
  citations: DetailedCitation[];
  provenance_chain: ProvenanceStep[];
  confidence_breakdown: ConfidenceBreakdown;
  metadata: {
    total_sources_consulted: number;
    unique_node_types: string[];
    query_complexity_score: number;
    processing_time_ms: number;
  };
}

export class CitationEnhancer {
  
  static extractSupportingEvidence(content: any, question: string): string {
    if (!content) return 'No content available';
    
    const relevantFields = ['content', 'description', 'title', 'name', 'text', 'summary'];
    const questionTerms = question.toLowerCase().split(' ').filter(word => word.length > 2);
    
    // Find the most relevant field based on question terms
    for (const field of relevantFields) {
      if (content[field] && typeof content[field] === 'string') {
        const text = content[field].toLowerCase();
        const matchCount = questionTerms.filter(term => text.includes(term)).length;
        
        if (matchCount > 0) {
          return this.truncateText(content[field], 200);
        }
      }
    }
    
    // Fallback to any available text content
    for (const field of relevantFields) {
      if (content[field] && typeof content[field] === 'string') {
        return this.truncateText(content[field], 150);
      }
    }
    
    return this.truncateText(JSON.stringify(content), 100);
  }
  
  static calculateConfidenceFromScore(score?: number): number {
    if (!score) return 0.5;
    
    // Convert various score ranges to 0-1 confidence
    if (score > 1) {
      // Assume it's a percentage or large number
      return Math.min(score / 100, 1.0);
    }
    
    return Math.min(Math.max(score, 0), 1.0);
  }
  
  static generateTargetedQueries(question: string, kb_id: string): Array<{
    cypher: string;
    params?: any;
    description: string;
    priority: number;
  }> {
    const queries = [];
    const lowerQuestion = question.toLowerCase();
    
    // Document/Page queries (high priority for content questions)
    if (lowerQuestion.includes('document') || lowerQuestion.includes('page') || lowerQuestion.includes('content')) {
      queries.push({
        cypher: `MATCH (d:Document {kb_id: $kb_id}) 
                 WHERE d.content IS NOT NULL 
                 RETURN d.id as node_id, d.title as title, d.content as content, 
                        labels(d) as node_type, d.created_at as created_at
                 ORDER BY d.updated_at DESC LIMIT 5`,
        params: { kb_id },
        description: 'Find recent documents with content matching question context',
        priority: 1
      });
    }
    
    // People/Author queries 
    if (lowerQuestion.includes('author') || lowerQuestion.includes('person') || 
        lowerQuestion.includes('who') || lowerQuestion.includes('user')) {
      queries.push({
        cypher: `MATCH (p:Person {kb_id: $kb_id})-[r]->(n) 
                 RETURN p.id as person_id, p.name as name, p.email as email,
                        type(r) as relationship, n.title as target_title,
                        labels(n) as target_type
                 LIMIT 8`,
        params: { kb_id },
        description: 'Find people and their relationships to content',
        priority: 2
      });
    }
    
    // Relationship queries
    if (lowerQuestion.includes('relationship') || lowerQuestion.includes('connect') || 
        lowerQuestion.includes('related') || lowerQuestion.includes('link')) {
      queries.push({
        cypher: `MATCH (a {kb_id: $kb_id})-[r]->(b {kb_id: $kb_id}) 
                 WHERE a.id IS NOT NULL AND b.id IS NOT NULL
                 RETURN a.id as from_id, labels(a) as from_type, a.title as from_title,
                        type(r) as relationship, 
                        b.id as to_id, labels(b) as to_type, b.title as to_title
                 LIMIT 10`,
        params: { kb_id },
        description: 'Find relationships between entities in the knowledge base',
        priority: 2
      });
    }
    
    // Topic/Category queries
    if (lowerQuestion.includes('topic') || lowerQuestion.includes('category') || 
        lowerQuestion.includes('tag') || lowerQuestion.includes('subject')) {
      queries.push({
        cypher: `MATCH (t:Topic {kb_id: $kb_id})-[r]-(n) 
                 RETURN t.id as topic_id, t.name as topic_name, 
                        type(r) as relationship, n.title as content_title,
                        labels(n) as content_type
                 LIMIT 6`,
        params: { kb_id },
        description: 'Find topics and their associated content',
        priority: 2
      });
    }
    
    // Fallback comprehensive query
    if (queries.length === 0 || lowerQuestion.includes('overview') || lowerQuestion.includes('summary')) {
      queries.push({
        cypher: `MATCH (n {kb_id: $kb_id}) 
                 WHERE n.id IS NOT NULL
                 RETURN n.id as node_id, labels(n) as node_type, 
                        n.title as title, n.name as name,
                        n.created_at as created_at, n.updated_at as updated_at
                 ORDER BY n.updated_at DESC 
                 LIMIT 15`,
        params: { kb_id },
        description: 'General exploration of knowledge base entities',
        priority: 3
      });
    }
    
    // Sort by priority
    return queries.sort((a, b) => a.priority - b.priority);
  }
  
  static extractNodeId(row: any): string | null {
    const idFields = ['node_id', 'id', 'person_id', 'from_id', 'to_id', 'topic_id'];
    for (const field of idFields) {
      if (row[field] && typeof row[field] === 'string') {
        return row[field];
      }
    }
    return null;
  }
  
  static extractNodeTypes(row: any): string[] {
    const typeFields = ['node_type', 'from_type', 'to_type', 'content_type'];
    for (const field of typeFields) {
      if (row[field]) {
        return Array.isArray(row[field]) ? row[field] : [row[field]];
      }
    }
    return ['unknown'];
  }
  
  static extractGraphEvidence(row: any, question: string): string {
    const evidence = [];
    const fields = ['title', 'name', 'content_title', 'from_title', 'to_title', 
                   'topic_name', 'relationship', 'email'];
    
    for (const field of fields) {
      if (row[field] && typeof row[field] === 'string') {
        if (field === 'relationship') {
          evidence.push(`${field}: ${row[field]}`);
        } else {
          evidence.push(`${field}: "${this.truncateText(row[field], 50)}"`);
        }
      }
    }
    
    if (evidence.length === 0) {
      return this.truncateText(JSON.stringify(row), 120);
    }
    
    return evidence.slice(0, 4).join(', ');
  }
  
  static calculateConfidenceBreakdown(
    semanticResults: any, 
    graphResults: any[], 
    citations: DetailedCitation[]
  ): ConfidenceBreakdown {
    // Semantic confidence based on search results quality
    let semanticConfidence = 0.1;
    if (semanticResults.found > 0 && semanticResults.results) {
      const avgScore = semanticResults.results.reduce((sum: number, r: any) => 
        sum + (r.score || 0.5), 0) / semanticResults.results.length;
      semanticConfidence = Math.min(avgScore * 1.2, 1.0); // Boost slightly
    }
    
    // Graph confidence based on result richness
    const graphConfidence = graphResults.length > 0 ? 
      Math.min(0.3 + (graphResults.length * 0.08), 1.0) : 0.2;
    
    // Synthesis confidence based on citation quality
    const citationCount = citations.length;
    const avgCitationConfidence = citations.length > 0 ? 
      citations.reduce((sum, c) => sum + c.confidence, 0) / citations.length : 0.3;
    
    const synthesisConfidence = Math.min(
      0.2 + (citationCount * 0.05) + (avgCitationConfidence * 0.3), 
      1.0
    );
    
    // Weighted overall confidence
    const overallConfidence = (
      semanticConfidence * 0.4 + 
      graphConfidence * 0.35 + 
      synthesisConfidence * 0.25
    );
    
    const reasoning = `Confidence based on ${citationCount} citations (avg: ${avgCitationConfidence.toFixed(2)}), ` +
                     `${semanticResults.found || 0} semantic matches (avg score: ${semanticConfidence.toFixed(2)}), ` +
                     `and ${graphResults.length} graph relationships.`;
    
    return {
      overall_confidence: overallConfidence,
      semantic_confidence: semanticConfidence,
      graph_confidence: graphConfidence,
      synthesis_confidence: synthesisConfidence,
      reasoning
    };
  }
  
  static countCitationsInAnswer(answer: string): number {
    // Count [node-id] patterns in the answer
    const citationPattern = /\[[a-zA-Z0-9_-]+\]/g;
    return (answer.match(citationPattern) || []).length;
  }
  
  static deduplicateCitations(citations: DetailedCitation[]): DetailedCitation[] {
    const seenIds = new Set<string>();
    const deduplicated: DetailedCitation[] = [];
    
    for (const citation of citations) {
      if (!seenIds.has(citation.node_id)) {
        seenIds.add(citation.node_id);
        deduplicated.push(citation);
      } else {
        // If duplicate, merge evidence if it's different
        const existing = deduplicated.find(c => c.node_id === citation.node_id);
        if (existing && existing.supporting_evidence !== citation.supporting_evidence) {
          existing.supporting_evidence += ` | ${citation.supporting_evidence}`;
          existing.confidence = Math.max(existing.confidence, citation.confidence);
        }
      }
    }
    
    // Sort by confidence descending
    return deduplicated.sort((a, b) => b.confidence - a.confidence);
  }
  
  static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
  
  static estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
  
  static calculateQueryComplexity(queries: any[]): number {
    let complexity = 0;
    for (const query of queries) {
      // Basic complexity scoring
      complexity += (query.cypher.match(/MATCH/g) || []).length * 1;
      complexity += (query.cypher.match(/WHERE/g) || []).length * 0.5;
      complexity += (query.cypher.match(/ORDER BY/g) || []).length * 0.3;
      complexity += (query.cypher.match(/LIMIT/g) || []).length * 0.2;
    }
    return complexity;
  }
}
