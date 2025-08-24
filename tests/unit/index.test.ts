// Import necessary modules
import { parseSchema, applyMapping } from '../../orchestrator/src/dsl';
import { mergeNodesAndRels } from '../../orchestrator/src/ingest';
import { ConnectorClient } from '../../orchestrator/src/connectors';

// Jest globals
declare global {
  function test(name: string, fn: () => void): void;
  function expect(actual: any): jest.Matchers<any>;
}

// Unit tests for DSL parser
test('parseSchema should correctly parse a valid schema', () => {
  const yamlString = `
kb_id: test-kb
embedding:
  provider: "ollama:mxbai-embed-large"
  chunking:
    strategy: "by_headings"
schema:
  nodes:
    - label: Document
      key: id
      props: [title, content]
  relationships:
    - type: RELATED_TO
      from: Document
      to: Document
mappings:
  sources:
    - source_id: "test-source"
      document_type: "document"
      extract:
        node: Document
        assign:
          id: "$.id"
          title: "$.title"
          content: "$.content"
      edges: []
`;

  const schema = parseSchema(yamlString);
  expect(schema.kb_id).toBe('test-kb');
  expect(schema.schema.nodes[0].label).toBe('Document');
});

// Unit tests for mapping application
test('applyMapping should correctly extract nodes and relationships', () => {
  const document = {
    id: 'doc-1',
    title: 'Test Document',
    content: 'This is a test document',
    author: {
      email: 'author@example.com',
      name: 'Test Author'
    }
  };

  const mapping = {
    source_id: "test-source",
    document_type: "document",
    extract: {
      node: "Document",
      assign: {
        id: "$.id",
        title: "$.title",
        content: "$.content"
      }
    },
    edges: [
      {
        type: "AUTHORED_BY",
        from: {
          node: "Document",
          key: "$.id"
        },
        to: {
          node: "Person",
          key: "$.author.email",
          props: {
            name: "$.author.name"
          }
        }
      }
    ]
  };

  const { nodes, relationships } = applyMapping(document, mapping);
  
  expect(nodes).toHaveLength(1);
  expect(nodes[0].label).toBe('Document');
  expect(nodes[0].properties.id).toBe('doc-1');
  
  expect(relationships).toHaveLength(1);
  expect(relationships[0].type).toBe('AUTHORED_BY');
  expect(relationships[0].to.key).toBe('author@example.com');
});

// Unit tests for Neo4j merge functionality
// Note: These would require a running Neo4j instance to test properly
// For now, we'll just verify the function exists
test('mergeNodesAndRels function should be defined', () => {
  expect(mergeNodesAndRels).toBeDefined();
});

// Unit tests for connector client
test('ConnectorClient should be defined', () => {
  expect(ConnectorClient).toBeDefined();
});