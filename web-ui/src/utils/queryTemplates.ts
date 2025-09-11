/**
 * Query Templates for Knowledge Graph Brain
 * Provides common query patterns to help users get started
 */

export interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  query: string;
  category: 'exploration' | 'analysis' | 'research' | 'documentation' | 'data-quality' | 'relationships';
  tags: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

export const queryTemplates: QueryTemplate[] = [
  // Exploration Templates
  {
    id: 'overview',
    name: 'Knowledge Base Overview',
    description: 'Get a high-level summary of the knowledge base content',
    query: 'What is this knowledge base about? Can you provide a comprehensive overview of the main topics and themes?',
    category: 'exploration',
    tags: ['overview', 'summary', 'introduction'],
    complexity: 'beginner'
  },
  {
    id: 'topics',
    name: 'Main Topics',
    description: 'Identify the key topics and themes in the knowledge base',
    query: 'What are the main topics, themes, and subject areas covered in this knowledge base?',
    category: 'exploration',
    tags: ['topics', 'themes', 'categories'],
    complexity: 'beginner'
  },
  {
    id: 'entities',
    name: 'Key Entities',
    description: 'Find the most important entities and concepts',
    query: 'What are the most important entities, people, organizations, or concepts mentioned in this knowledge base?',
    category: 'exploration',
    tags: ['entities', 'people', 'organizations', 'concepts'],
    complexity: 'beginner'
  },

  // Analysis Templates
  {
    id: 'trends',
    name: 'Trends and Patterns',
    description: 'Analyze trends and patterns in the data',
    query: 'What trends, patterns, or recurring themes can you identify across the knowledge base?',
    category: 'analysis',
    tags: ['trends', 'patterns', 'analysis'],
    complexity: 'intermediate'
  },
  {
    id: 'connections',
    name: 'Key Connections',
    description: 'Discover important relationships and connections',
    query: 'What are the most significant connections and relationships between different entities or concepts?',
    category: 'analysis',
    tags: ['relationships', 'connections', 'network'],
    complexity: 'intermediate'
  },
  {
    id: 'insights',
    name: 'Key Insights',
    description: 'Extract the most valuable insights from the knowledge base',
    query: 'What are the most important insights, findings, or conclusions that can be drawn from this knowledge base?',
    category: 'analysis',
    tags: ['insights', 'findings', 'conclusions'],
    complexity: 'intermediate'
  },

  // Research Templates
  {
    id: 'research-gaps',
    name: 'Research Gaps',
    description: 'Identify areas where more information is needed',
    query: 'What are the main gaps, limitations, or areas where more research or information would be valuable?',
    category: 'research',
    tags: ['gaps', 'limitations', 'research'],
    complexity: 'advanced'
  },
  {
    id: 'contradictions',
    name: 'Contradictions & Conflicts',
    description: 'Find conflicting information or contradictory statements',
    query: 'Are there any contradictions, conflicts, or inconsistencies in the information within this knowledge base?',
    category: 'research',
    tags: ['contradictions', 'conflicts', 'inconsistencies'],
    complexity: 'advanced'
  },
  {
    id: 'methodology',
    name: 'Methodologies & Approaches',
    description: 'Understand the methodologies and approaches mentioned',
    query: 'What methodologies, approaches, frameworks, or best practices are discussed or recommended?',
    category: 'research',
    tags: ['methodology', 'approaches', 'frameworks', 'best-practices'],
    complexity: 'intermediate'
  },

  // Documentation Templates
  {
    id: 'how-to',
    name: 'How-To Guide',
    description: 'Get step-by-step instructions for common tasks',
    query: 'How do I [describe your task]? Can you provide step-by-step instructions with examples?',
    category: 'documentation',
    tags: ['how-to', 'instructions', 'tutorial'],
    complexity: 'beginner'
  },
  {
    id: 'troubleshooting',
    name: 'Troubleshooting',
    description: 'Find solutions to common problems',
    query: 'I\'m having trouble with [describe your issue]. What are the common causes and solutions?',
    category: 'documentation',
    tags: ['troubleshooting', 'problems', 'solutions'],
    complexity: 'intermediate'
  },
  {
    id: 'best-practices',
    name: 'Best Practices',
    description: 'Learn about recommended practices and standards',
    query: 'What are the best practices, recommendations, and standards for [topic area]?',
    category: 'documentation',
    tags: ['best-practices', 'recommendations', 'standards'],
    complexity: 'intermediate'
  },

  // Data Quality Templates
  {
    id: 'completeness',
    name: 'Data Completeness',
    description: 'Assess the completeness of information',
    query: 'How complete is the information in this knowledge base? What key areas or details might be missing?',
    category: 'data-quality',
    tags: ['completeness', 'coverage', 'gaps'],
    complexity: 'advanced'
  },
  {
    id: 'confidence',
    name: 'Information Confidence',
    description: 'Evaluate the confidence and reliability of information',
    query: 'How confident can I be in the information provided? What sources support the key claims?',
    category: 'data-quality',
    tags: ['confidence', 'reliability', 'sources'],
    complexity: 'advanced'
  },

  // Relationship Templates
  {
    id: 'network-analysis',
    name: 'Network Analysis',
    description: 'Analyze the network structure of relationships',
    query: 'Can you analyze the network of relationships in this knowledge base? Who or what are the most connected entities?',
    category: 'relationships',
    tags: ['network', 'centrality', 'structure'],
    complexity: 'advanced'
  },
  {
    id: 'influence-mapping',
    name: 'Influence Mapping',
    description: 'Map influence and impact relationships',
    query: 'What entities, people, or concepts have the most influence or impact based on their connections and mentions?',
    category: 'relationships',
    tags: ['influence', 'impact', 'importance'],
    complexity: 'advanced'
  }
];

// Helper functions for working with templates
export function getTemplatesByCategory(category: QueryTemplate['category']): QueryTemplate[] {
  return queryTemplates.filter(template => template.category === category);
}

export function getTemplatesByComplexity(complexity: QueryTemplate['complexity']): QueryTemplate[] {
  return queryTemplates.filter(template => template.complexity === complexity);
}

export function searchTemplates(searchTerm: string): QueryTemplate[] {
  const term = searchTerm.toLowerCase();
  return queryTemplates.filter(template => 
    template.name.toLowerCase().includes(term) ||
    template.description.toLowerCase().includes(term) ||
    template.query.toLowerCase().includes(term) ||
    template.tags.some(tag => tag.toLowerCase().includes(term))
  );
}

export function getRandomTemplate(): QueryTemplate {
  return queryTemplates[Math.floor(Math.random() * queryTemplates.length)];
}

export function getTemplateById(id: string): QueryTemplate | undefined {
  return queryTemplates.find(template => template.id === id);
}

// Template categories with descriptions
export const templateCategories = {
  exploration: {
    name: 'Exploration',
    description: 'Get familiar with the knowledge base content',
    icon: '🔍'
  },
  analysis: {
    name: 'Analysis', 
    description: 'Analyze patterns and extract insights',
    icon: '📊'
  },
  research: {
    name: 'Research',
    description: 'Advanced research and investigation queries',
    icon: '🔬'
  },
  documentation: {
    name: 'Documentation',
    description: 'Find instructions and guidance',
    icon: '📖'
  },
  'data-quality': {
    name: 'Data Quality',
    description: 'Assess information quality and completeness',
    icon: '✅'
  },
  relationships: {
    name: 'Relationships',
    description: 'Explore connections and network structure',
    icon: '🔗'
  }
} as const;
