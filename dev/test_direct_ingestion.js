import { parseSchema, applyMapping } from './orchestrator/dist/dsl/index.js';
import { ConnectorClient } from './orchestrator/dist/connectors/index.js';
import { mergeNodesAndRels, setupKB } from './orchestrator/dist/ingest/index.js';
import { initDriver } from './orchestrator/dist/ingest/index.js';
import { EmbeddingProviderFactory } from './orchestrator/dist/embeddings/index.js';

// Test schema YAML
const testSchemaYaml = `
kb_id: demo-brain
embedding:
  provider: ollama:mxbai-embed-large
  chunking:
    strategy: sentence
    chunk_size: 512
    overlap: 50
schema:
  nodes:
    - label: Document
      key: id
      props: [title, content, created_date]
    - label: Person  
      key: email
      props: [name, email, role]
  relationships:
    - type: AUTHORED_BY
      from: Document
      to: Person
mappings:
  sources:
    - source_id: confluence-main
      document_type: page
      extract:
        node: Document
        assign:
          id: $.id
          title: $.title
          content: $.content
          created_date: $.created_date
      edges:
        - type: AUTHORED_BY
          from:
            node: Document
            key: $.id
          to:
            node: Person
            key: $.author.email
            props:
              name: $.author.name
              email: $.author.email
              role: $.author.role
`;

async function testDirectIngestion() {
  console.log('🧠 KNOWLEDGE GRAPH BRAIN - Direct Function Test');
  console.log('================================================');
  
  try {
    // Initialize Neo4j driver
    initDriver();
    console.log('✅ Neo4j driver initialized');
    
    // 1. Parse schema
    console.log('\n1️⃣ Parsing schema...');
    const schema = parseSchema(testSchemaYaml);
    console.log('✅ Schema parsed:', {
      kb_id: schema.kb_id,
      nodes: schema.schema.nodes.length,
      relationships: schema.schema.relationships.length
    });
    
    // 2. Connect to data source
    console.log('\n2️⃣ Connecting to confluence connector...');
    const connector = new ConnectorClient('http://localhost:3001');
    const sourceData = await connector.pull();
    console.log('✅ Data pulled from connector:', {
      documents: sourceData.length,
      sample: sourceData[0]?.title
    });
    
    // 3. Setup KB in Neo4j
    console.log('\n3️⃣ Setting up KB in Neo4j...');
    await setupKB(schema.kb_id);
    console.log('✅ KB setup complete');
    
    // 4. Initialize embedding provider
    console.log('\n4️⃣ Setting up embeddings...');
    const embeddingProvider = EmbeddingProviderFactory.create('ollama:mxbai-embed-large');
    console.log('✅ Embedding provider created');
    
    // 5. Process each document through the mapping
    console.log('\n5️⃣ Processing documents through mapping...');
    const mapping = schema.mappings.sources[0]; // Use first mapping
    let allNodes = [];
    let allRelationships = [];
    
    for (const document of sourceData) {
      console.log(`📄 Processing: ${document.title}`);
      const { nodes, relationships } = applyMapping(document, mapping);
      allNodes.push(...nodes);
      allRelationships.push(...relationships);
    }
    
    console.log(`✅ Processed ${allNodes.length} nodes and ${allRelationships.length} relationships`);
    
    // 6. Generate embeddings for nodes
    console.log('\n6️⃣ Generating embeddings...');
    for (const node of allNodes) {
      if (node.properties.content) {
        const embedding = await embeddingProvider.embed(node.properties.content);
        node.properties.embedding = embedding;
        console.log(`📡 Generated embedding for ${node.label}: ${node.properties.title || node.properties.name || 'unknown'}`);
      }
    }
    
    // 7. Merge data into Neo4j
    console.log('\n7️⃣ Merging data into graphbrain...');
    const result = await mergeNodesAndRels(
      schema.kb_id,
      'confluence-main',
      `test-run-${Date.now()}`,
      allNodes,
      allRelationships
    );
    
    console.log('✅ Data merged into Neo4j:', result);
    
    console.log('\n🎯 SUCCESS! Real data has been ingested into your graphbrain database!');
    console.log('\nNow check Neo4j Desktop with:');
    console.log('MATCH (n) RETURN labels(n), count(n)');
    console.log('MATCH (n)-[r]->(m) RETURN n,r,m LIMIT 10');
    
  } catch (error) {
    console.error('❌ Error during direct ingestion:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
testDirectIngestion().catch(console.error);
