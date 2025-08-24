// Define the EmbeddingProvider interface
export interface EmbeddingProvider {
  name: string;
  embed(input: string | string[]): Promise<number[] | number[][]>;
}

// OllamaEmbeddingProvider implementation
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  name = 'ollama';
  private baseUrl: string;
  
  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.OLLAMA_URL || 'http://localhost:11434';
  }
  
  async embed(input: string | string[]): Promise<number[] | number[][]> {
    // Call the actual Ollama API
    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mxbai-embed-large',
          prompt: typeof input === 'string' ? input : input.join(' ')
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json() as { embedding: number[] };
      
      if (typeof input === 'string') {
        return data.embedding;
      } else {
        // For multiple inputs, we'll embed each separately
        const embeddings = [];
        for (const text of input) {
          const resp = await fetch(`${this.baseUrl}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'mxbai-embed-large',
              prompt: text
            })
          });
          const result = await resp.json() as { embedding: number[] };
          embeddings.push(result.embedding);
        }
        return embeddings;
      }
    } catch (error) {
      console.warn('Ollama embedding failed, using mock:', error);
      // Fallback to mock embeddings
      if (typeof input === 'string') {
        return Array(1024).fill(0).map(() => Math.random());
      } else {
        return input.map(() => Array(1024).fill(0).map(() => Math.random()));
      }
    }
  }
}

// OpenAIEmbeddingProvider implementation
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  name = 'openai';
  private apiKey: string;
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
  }
  
  async embed(input: string | string[]): Promise<number[] | number[][]> {
    // For simplicity, we're just returning mock embeddings
    // In a real implementation, you would call the OpenAI API
    
    if (typeof input === 'string') {
      // Return a mock 1536-dimensional vector
      return Array(1536).fill(0).map(() => Math.random());
    } else {
      // Return an array of mock vectors
      return input.map(() => Array(1536).fill(0).map(() => Math.random()));
    }
  }
}

// Provider factory
export class EmbeddingProviderFactory {
  static create(providerName: string): EmbeddingProvider {
    if (providerName.startsWith('ollama:')) {
      return new OllamaEmbeddingProvider();
    } else if (providerName.startsWith('openai:')) {
      return new OpenAIEmbeddingProvider();
    } else {
      throw new Error(`Unsupported embedding provider: ${providerName}`);
    }
  }
}

// Chunking strategies
export function chunkByHeadings(content: string, maxTokens: number = 1200): string[] {
  // This is a simplified implementation
  // In a real implementation, you would need to properly parse HTML/markdown
  // and split by headings while respecting the token limit
  
  // For now, we'll just split by paragraphs
  const paragraphs = content.split('\n\n');
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxTokens * 4) { // Rough approximation
      chunks.push(currentChunk);
      currentChunk = paragraph;
    } else {
      currentChunk += '\n\n' + paragraph;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

export function chunkByFields(obj: any, fields: string[]): string[] {
  return fields.map(field => obj[field]).filter(Boolean);
}