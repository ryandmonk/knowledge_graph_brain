import { parseSchema, applyMapping } from '../src/dsl/index';
import { initDriver, mergeNodesAndRels, setupKB } from '../src/ingest/index';
import { SchemaDSLValidator } from '../src/dsl/validator';

// E2E test for the critical requirement: idempotent ingestion
describe('Idempotent Ingestion E2E', () => {
  
  beforeAll(async () => {
    // Initialize Neo4j driver for testing
    initDriver();
  });

  const testSchemaYaml = `
kb_id: test-idempotent-kb
embedding:
  provider: "ollama:mxbai-embed-large"
  chunking:
    strategy: "by_headings"
    max_tokens: 1200
schema:
  nodes:
    - label: Document
      key: page_id
      props: [page_id, title, content, created_at]
    - label: Person
      key: email
      props: [name, email]
  relationships:
    - type: AUTHORED_BY
      from: Document
      to: Person
mappings:
  sources:
    - source_id: "test-source"
      document_type: "page"
      extract:
        node: Document
        assign:
          page_id: "$.id"
          title: "$.title"
          content: "$.content"
          created_at: "$.created_at"
      edges:
        - type: AUTHORED_BY
          from:
            node: Document
            key: "$.id"
          to:
            node: Person
            key: "$.author.email"
            props:
              name: "$.author.name"
              email: "$.author.email"
`;

  const testDocuments = [
    {
      id: 'doc-1',
      title: 'Test Document 1',
      content: 'This is the first test document',
      created_at: '2025-01-01T00:00:00Z',
      author: {
        name: 'John Doe',
        email: 'john@example.com'
      }
    },
    {
      id: 'doc-2', 
      title: 'Test Document 2',
      content: 'This is the second test document',
      created_at: '2025-01-02T00:00:00Z',
      author: {
        name: 'Jane Smith',
        email: 'jane@example.com'
      }
    }
  ];

  test('should validate schema successfully', () => {
    const schema = parseSchema(testSchemaYaml);
    const validation = SchemaDSLValidator.validate(schema);
    
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test('should setup KB with constraints and indexes', async () => {
    const schema = parseSchema(testSchemaYaml);
    
    // This should create constraints and indexes without error
    await expect(setupKB('test-idempotent-kb', schema)).resolves.not.toThrow();
  });

  test('should ingest data successfully on first run', async () => {
    const schema = parseSchema(testSchemaYaml);
    const mapping = schema.mappings.sources[0];
    
    let totalNodes = 0;
    let totalRels = 0;
    
    for (const document of testDocuments) {
      const { nodes, relationships } = applyMapping(document, mapping);
      
      const { createdNodes, createdRels } = await mergeNodesAndRels(
        'test-idempotent-kb',
        'test-source',
        'run-1',
        nodes,
        relationships
      );
      
      totalNodes += createdNodes;
      totalRels += createdRels;
    }
    
    // Should have created 2 documents + 2 persons = 4 nodes
    // Should have created 2 authored_by relationships = 2 rels
    expect(totalNodes).toBeGreaterThan(0);
    expect(totalRels).toBeGreaterThan(0);
    
    console.log(`First ingestion: ${totalNodes} nodes, ${totalRels} relationships`);
  }, 30000);

  test('should be idempotent - no duplicates on second ingestion', async () => {
    const schema = parseSchema(testSchemaYaml);
    const mapping = schema.mappings.sources[0];
    
    // Get initial counts from database
    const { executeCypher } = await import('../src/ingest/index');
    
    const initialCountResult = await executeCypher(
      'MATCH (n) WHERE n.kb_id = $kb_id RETURN count(n) as nodeCount',
      { kb_id: 'test-idempotent-kb' }
    );
    
    const initialRelCountResult = await executeCypher(
      'MATCH ()-[r]-() WHERE r.kb_id = $kb_id RETURN count(r) as relCount',
      { kb_id: 'test-idempotent-kb' }
    );
    
    const initialNodes = initialCountResult[0]?.nodeCount || 0;
    const initialRels = initialRelCountResult[0]?.relCount || 0;
    
    console.log(`Before second ingestion: ${initialNodes} nodes, ${initialRels} relationships`);
    
    // Ingest the same data again
    let secondRunNodes = 0;
    let secondRunRels = 0;
    
    for (const document of testDocuments) {
      const { nodes, relationships } = applyMapping(document, mapping);
      
      const { createdNodes, createdRels } = await mergeNodesAndRels(
        'test-idempotent-kb',
        'test-source', 
        'run-2',
        nodes,
        relationships
      );
      
      secondRunNodes += createdNodes;
      secondRunRels += createdRels;
    }
    
    // Should have created 0 new nodes and relationships (idempotent)
    expect(secondRunNodes).toBe(0);
    expect(secondRunRels).toBe(0);
    
    // Verify total counts haven't changed
    const finalCountResult = await executeCypher(
      'MATCH (n) WHERE n.kb_id = $kb_id RETURN count(n) as nodeCount',
      { kb_id: 'test-idempotent-kb' }
    );
    
    const finalRelCountResult = await executeCypher(
      'MATCH ()-[r]-() WHERE r.kb_id = $kb_id RETURN count(r) as relCount',
      { kb_id: 'test-idempotent-kb' }
    );
    
    const finalNodes = finalCountResult[0]?.nodeCount || 0;
    const finalRels = finalRelCountResult[0]?.relCount || 0;
    
    expect(finalNodes).toBe(initialNodes);
    expect(finalRels).toBe(initialRels);
    
    console.log(`After second ingestion: ${finalNodes} nodes, ${finalRels} relationships`);
  }, 30000);

  test('should update properties on re-ingestion with updated data', async () => {
    const schema = parseSchema(testSchemaYaml);
    const mapping = schema.mappings.sources[0];
    
    // Create updated version of first document
    const updatedDocument = {
      ...testDocuments[0],
      title: 'Updated Test Document 1',
      content: 'This document has been updated with new content'
    };
    
    const { nodes, relationships } = applyMapping(updatedDocument, mapping);
    
    const { createdNodes, createdRels } = await mergeNodesAndRels(
      'test-idempotent-kb',
      'test-source',
      'run-3',
      nodes,
      relationships
    );
    
    // Should not create new nodes/relationships (idempotent)
    expect(createdNodes).toBe(0);
    expect(createdRels).toBe(0);
    
    // Verify the document was updated
    const { executeCypher } = await import('../src/ingest/index');
    const updateResult = await executeCypher(
      'test-idempotent-kb',
      'MATCH (d:Document {kb_id: $kb_id, page_id: $page_id}) RETURN d.title as title, d.run_id as run_id',
      { kb_id: 'test-idempotent-kb', page_id: 'doc-1' }
    );
    
    const record = updateResult.records[0];
    expect(record?.get('title')).toBe('Updated Test Document 1');
    expect(record?.get('run_id')).toBe('run-3');
    
    console.log('Document successfully updated with new run_id');
  }, 30000);

  test('should enforce provenance on all nodes and relationships', async () => {
    const { executeCypher } = await import('../src/ingest/index');
    
    // Check that all nodes have required provenance fields
    const nodeProvenanceResult = await executeCypher(
      'test-idempotent-kb',
      `MATCH (n) WHERE n.kb_id = $kb_id 
       RETURN count(n) as total,
              count(n.kb_id) as has_kb_id,
              count(n.source_id) as has_source_id, 
              count(n.run_id) as has_run_id,
              count(n.updated_at) as has_timestamp`,
      { kb_id: 'test-idempotent-kb' }
    );
    
    const nodeRecord = nodeProvenanceResult.records[0];
    const total = nodeRecord?.get('total')?.toNumber();
    const hasKbId = nodeRecord?.get('has_kb_id')?.toNumber();
    const hasSourceId = nodeRecord?.get('has_source_id')?.toNumber();
    const hasRunId = nodeRecord?.get('has_run_id')?.toNumber();
    const hasTimestamp = nodeRecord?.get('has_timestamp')?.toNumber();
    
    // All nodes must have all provenance fields
    expect(hasKbId).toBe(total);
    expect(hasSourceId).toBe(total); 
    expect(hasRunId).toBe(total);
    expect(hasTimestamp).toBe(total);
    
    // Check that all relationships have required provenance fields
    const relProvenanceResult = await executeCypher(
      'test-idempotent-kb',
      `MATCH ()-[r]-() WHERE r.kb_id = $kb_id 
       RETURN count(r) as total,
              count(r.kb_id) as has_kb_id,
              count(r.source_id) as has_source_id,
              count(r.run_id) as has_run_id,
              count(r.updated_at) as has_timestamp`,
      { kb_id: 'test-idempotent-kb' }
    );
    
    const relRecord = relProvenanceResult.records[0];
    const relTotal = relRecord?.get('total')?.toNumber();
    const relHasKbId = relRecord?.get('has_kb_id')?.toNumber();
    const relHasSourceId = relRecord?.get('has_source_id')?.toNumber();
    const relHasRunId = relRecord?.get('has_run_id')?.toNumber();
    const relHasTimestamp = relRecord?.get('has_timestamp')?.toNumber();
    
    // All relationships must have all provenance fields
    expect(relHasKbId).toBe(relTotal);
    expect(relHasSourceId).toBe(relTotal);
    expect(relHasRunId).toBe(relTotal);
    expect(relHasTimestamp).toBe(relTotal);
    
    console.log(`Provenance verified: ${total} nodes, ${relTotal} relationships`);
  }, 30000);

  afterAll(async () => {
    // Clean up test data
    const { executeCypher } = await import('../src/ingest/index');
    
    await executeCypher(
      'test-idempotent-kb',
      'MATCH (n) WHERE n.kb_id = $kb_id DETACH DELETE n',
      { kb_id: 'test-idempotent-kb' }
    );
    
    await executeCypher(
      'test-idempotent-kb', 
      'MATCH (kb:KnowledgeBase {kb_id: $kb_id}) DELETE kb',
      { kb_id: 'test-idempotent-kb' }
    );
    
    console.log('Test data cleaned up');
  });
});
