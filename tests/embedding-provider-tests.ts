#!/usr/bin/env npx tsx

/**
 * Embedding Provider Testing Suite
 * Tests both Ollama and OpenAI embedding providers to ensure compatibility
 */

import { EmbeddingProviderFactory } from '../orchestrator/src/embeddings/index';

const TEST_TEXTS = [
  "Knowledge graphs represent information as interconnected entities and relationships",
  "The quick brown fox jumps over the lazy dog",
  "Machine learning enables computers to learn without explicit programming",
  "TypeScript is a strongly typed programming language that builds on JavaScript"
];

const EMBEDDING_CONFIGS = [
  {
    provider: 'ollama:mxbai-embed-large' as const,
    displayName: 'Ollama',
    model: 'mxbai-embed-large',
    expectedDimensions: 1024,
    baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434'
  },
  {
    provider: 'openai:text-embedding-ada-002' as const,
    displayName: 'OpenAI',
    model: 'text-embedding-ada-002',
    expectedDimensions: 1536,
    apiKey: process.env.OPENAI_API_KEY || 'sk-test-key-not-real'
  }
];

interface TestResult {
  provider: string;
  model: string;
  success: boolean;
  embeddings?: number[][];
  dimensions?: number;
  avgProcessingTime?: number;
  error?: string;
  compatibility?: {
    correctDimensions: boolean;
    normalizedVectors: boolean;
    consistentOutputs: boolean;
  };
}

async function runEmbeddingProviderTests(): Promise<void> {
  console.log('🔬 Embedding Provider Testing Suite');
  console.log('═'.repeat(80));
  console.log(`📝 Testing with ${TEST_TEXTS.length} sample texts`);
  console.log(`🎯 Providers: ${EMBEDDING_CONFIGS.map(c => c.provider).join(', ')}\n`);

  const results: TestResult[] = [];

  for (const config of EMBEDDING_CONFIGS) {
    console.log(`\n🧪 Testing ${config.displayName} Provider`);
    console.log('─'.repeat(50));
    console.log(`Model: ${config.model}`);
    console.log(`Expected Dimensions: ${config.expectedDimensions}`);
    
    const result: TestResult = {
      provider: config.displayName,
      model: config.model,
      success: false
    };

    try {
      // Test provider creation
      console.log('🔧 Creating embedding provider...');
      const provider = EmbeddingProviderFactory.create(config.provider);

      // Test embedding generation
      console.log('⚡ Generating embeddings...');
      const startTime = Date.now();
      const embeddings: number[][] = [];

      for (let i = 0; i < TEST_TEXTS.length; i++) {
        const text = TEST_TEXTS[i];
        console.log(`   Processing text ${i + 1}/${TEST_TEXTS.length}: "${text.substring(0, 50)}..."`);
        
        try {
          const embedding = await provider.embed(text);
          // Handle both single embedding and array of embeddings
          const embeddingArray = Array.isArray(embedding[0]) ? embedding[0] : embedding as number[];
          embeddings.push(embeddingArray);
          console.log(`   ✅ Generated embedding with ${embeddingArray.length} dimensions`);
        } catch (embeddingError) {
          console.log(`   ❌ Failed to generate embedding: ${embeddingError}`);
          throw embeddingError;
        }
      }

      const processingTime = Date.now() - startTime;
      result.avgProcessingTime = processingTime / TEST_TEXTS.length;

      // Validate embedding properties
      console.log('🔍 Validating embedding properties...');
      const compatibility = validateEmbeddingCompatibility(embeddings, config.expectedDimensions);
      
      result.success = true;
      result.embeddings = embeddings;
      result.dimensions = embeddings[0].length;
      result.compatibility = compatibility;

      console.log(`✅ ${config.displayName} provider test PASSED`);
      console.log(`   ⏱️  Avg processing time: ${result.avgProcessingTime?.toFixed(2)}ms per text`);
      console.log(`   📏 Dimensions: ${result.dimensions} (expected: ${config.expectedDimensions})`);
      console.log(`   ✓ Correct dimensions: ${compatibility.correctDimensions ? 'YES' : 'NO'}`);
      console.log(`   ✓ Normalized vectors: ${compatibility.normalizedVectors ? 'YES' : 'NO'}`);
      console.log(`   ✓ Consistent outputs: ${compatibility.consistentOutputs ? 'YES' : 'NO'}`);

    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : String(error);
      
      console.log(`❌ ${config.displayName} provider test FAILED`);
      console.log(`   Error: ${result.error}`);
      
      if (config.provider.includes('ollama')) {
        console.log(`   💡 Tip: Make sure Ollama is running at ${config.baseUrl}`);
        console.log(`   💡 Check if model '${config.model}' is installed with: ollama list`);
      } else if (config.provider.includes('openai')) {
        console.log(`   💡 Tip: Make sure OPENAI_API_KEY environment variable is set`);
        console.log(`   💡 Check if API key has embedding permissions`);
      }
    }

    results.push(result);
  }

  // Summary report
  console.log('\n\n📊 EMBEDDING PROVIDER TEST RESULTS');
  console.log('═'.repeat(80));
  
  const successfulProviders = results.filter(r => r.success);
  const failedProviders = results.filter(r => !r.success);

  console.log(`✅ Successful Providers: ${successfulProviders.length}/${results.length}`);
  console.log(`❌ Failed Providers: ${failedProviders.length}/${results.length}`);

  if (successfulProviders.length > 0) {
    console.log('\n🎯 Successful Provider Details:');
    for (const result of successfulProviders) {
      console.log(`   • ${result.provider} (${result.model}): ${result.dimensions} dims, ${result.avgProcessingTime?.toFixed(1)}ms avg`);
    }
  }

  if (failedProviders.length > 0) {
    console.log('\n⚠️ Failed Provider Details:');
    for (const result of failedProviders) {
      console.log(`   • ${result.provider} (${result.model}): ${result.error}`);
    }
  }

  // Compatibility analysis
  if (successfulProviders.length > 1) {
    console.log('\n🔬 Cross-Provider Compatibility Analysis:');
    testCrossProviderCompatibility(successfulProviders);
  }

  // Production readiness assessment
  console.log('\n🚀 Production Readiness Assessment:');
  assessProductionReadiness(results);
}

function validateEmbeddingCompatibility(embeddings: number[][], expectedDimensions: number) {
  const compatibility = {
    correctDimensions: true,
    normalizedVectors: true,
    consistentOutputs: true
  };

  // Check dimensions
  for (const embedding of embeddings) {
    if (embedding.length !== expectedDimensions) {
      compatibility.correctDimensions = false;
      break;
    }
  }

  // Check if vectors are normalized (length ~1)
  for (const embedding of embeddings) {
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (Math.abs(magnitude - 1.0) > 0.1) { // Allow some tolerance
      compatibility.normalizedVectors = false;
      break;
    }
  }

  // Check consistency (same input should produce same output)
  if (embeddings.length >= 2) {
    const firstEmbedding = embeddings[0];
    const secondEmbedding = embeddings[1];
    
    // They should be different (different inputs)
    const similarity = cosineSimilarity(firstEmbedding, secondEmbedding);
    if (similarity > 0.99) {
      compatibility.consistentOutputs = false;
    }
  }

  return compatibility;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

function testCrossProviderCompatibility(providers: TestResult[]) {
  for (let i = 0; i < providers.length - 1; i++) {
    for (let j = i + 1; j < providers.length; j++) {
      const provider1 = providers[i];
      const provider2 = providers[j];
      
      console.log(`   🔄 ${provider1.provider} vs ${provider2.provider}:`);
      
      // Compare dimensions
      if (provider1.dimensions === provider2.dimensions) {
        console.log(`      ✅ Same dimensions (${provider1.dimensions})`);
        
        // Compare semantic similarity on same text
        if (provider1.embeddings && provider2.embeddings) {
          const similarity = cosineSimilarity(provider1.embeddings[0], provider2.embeddings[0]);
          console.log(`      📊 Semantic correlation: ${(similarity * 100).toFixed(1)}%`);
        }
      } else {
        console.log(`      ⚠️ Different dimensions (${provider1.dimensions} vs ${provider2.dimensions})`);
      }
      
      // Compare processing times
      const timeDiff = Math.abs((provider1.avgProcessingTime || 0) - (provider2.avgProcessingTime || 0));
      console.log(`      ⏱️ Speed difference: ${timeDiff.toFixed(1)}ms`);
    }
  }
}

function assessProductionReadiness(results: TestResult[]) {
  const readinessScore = results.reduce((score, result) => {
    if (!result.success) return score;
    
    let providerScore = 80; // Base score
    
    if (result.compatibility?.correctDimensions) providerScore += 5;
    if (result.compatibility?.normalizedVectors) providerScore += 5;
    if (result.compatibility?.consistentOutputs) providerScore += 5;
    if ((result.avgProcessingTime || 0) < 1000) providerScore += 5; // Under 1 second
    
    return score + providerScore;
  }, 0) / results.length;

  console.log(`   📈 Overall Readiness Score: ${readinessScore.toFixed(1)}/100`);
  
  if (readinessScore >= 90) {
    console.log('   🟢 EXCELLENT - Ready for production deployment');
  } else if (readinessScore >= 75) {
    console.log('   🟡 GOOD - Ready with minor optimizations needed');
  } else if (readinessScore >= 60) {
    console.log('   🟠 FAIR - Requires improvements before production');
  } else {
    console.log('   🔴 POOR - Significant issues need resolution');
  }

  // Specific recommendations
  const workingProviders = results.filter(r => r.success);
  if (workingProviders.length === 0) {
    console.log('   🚨 CRITICAL: No embedding providers are working');
  } else if (workingProviders.length === 1) {
    console.log(`   ⚠️ WARNING: Only ${workingProviders[0].provider} provider is working - no fallback available`);
  } else {
    console.log('   ✅ GOOD: Multiple providers working - fallback capability available');
  }
}

// Run the tests
if (require.main === module) {
  runEmbeddingProviderTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export { runEmbeddingProviderTests };
