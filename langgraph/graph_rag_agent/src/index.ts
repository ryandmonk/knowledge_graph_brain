import { GraphRAGAgent, createGraphRAGAgent } from './agent';
import { SemanticSearchTool, GraphSearchTool, KnowledgeBaseInfoTool } from './tools';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export {
  GraphRAGAgent,
  createGraphRAGAgent,
  SemanticSearchTool,
  GraphSearchTool,
  KnowledgeBaseInfoTool
};

// CLI interface for testing
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: npm run dev "your question here" [kb_id]');
    console.log('Example: npm run dev "What documents are available?" confluence-kb');
    return;
  }

  const question = args[0];
  const kb_id = args[1] || 'confluence-kb';
  const mcpUrl = process.env.MCP_URL || 'http://localhost:3000';
  const ollamaModel = process.env.OLLAMA_MODEL || 'qwen3:8b';

  console.log(`🤖 Graph RAG Agent`);
  console.log(`📊 Knowledge Base: ${kb_id}`);
  console.log(`❓ Question: ${question}`);
  console.log(`🔗 MCP URL: ${mcpUrl}`);
  console.log(`🧠 LLM: Ollama ${ollamaModel}`);
  console.log('='.repeat(50));

  try {
    const agent = await createGraphRAGAgent(mcpUrl, ollamaModel);
    
    console.log('🔍 Processing your question...\n');
    
    // Use the detailed version to show steps
    const result = await agent.answerWithSteps(question, kb_id);
    
    console.log('📋 Search Steps:');
    result.steps.forEach((step, i) => {
      console.log(`\n${i + 1}. ${step.step}`);
      console.log(`   Tool: ${step.tool}`);
      console.log(`   Result: ${JSON.stringify(step.result, null, 2)}`);
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('📝 Final Answer:');
    console.log(result.answer);
    
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main();
}
