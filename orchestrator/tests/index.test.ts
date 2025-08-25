// Import necessary modules
import { parseSchema, applyMapping } from '../src/dsl';
import { mergeNodesAndRels } from '../src/ingest';
import { ConnectorClient } from '../src/connectors';

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
    - label: Person
      key: email  
      props: [name, email]
  relationships:
    - type: RELATED_TO
      from: Document
      to: Document
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
          id: "$.id"
          title: "$.title"
          content: "$.content"
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
  
  const schema = parseSchema(yamlString);
  expect(schema.kb_id).toBe('test-kb');
  expect(schema.schema.nodes[0].label).toBe('Document');
});

test('applyMapping should correctly extract nodes and relationships', () => {
  // Create a test schema
  const testSchema = {
    kb_id: 'test-kb',
    embedding: {
      provider: "ollama:mxbai-embed-large",
      chunking: {
        strategy: "by_headings"
      }
    },
    schema: {
      nodes: [
        {
          label: 'Document',
          key: 'id',
          props: ['id', 'title', 'content']
        },
        {
          label: 'Person',
          key: 'email',
          props: ['name', 'email']
        }
      ],
      relationships: [
        {
          type: 'AUTHORED_BY',
          from: 'Document',
          to: 'Person'
        }
      ]
    },
    mappings: {
      sources: []
    }
  };

  const mapping = {
    source_id: "test-source",
    document_type: "page",
    extract: {
      node: 'Document',
      assign: {
        id: "$.id",
        title: "$.title",
        content: "$.content"
      }
    },
    edges: [{
      type: 'AUTHORED_BY',
      from: {
        node: 'Document',
        key: "$.id"
      },
      to: {
        node: 'Person',
        key: "$.author.email",
        props: {
          name: "$.author.name",
          email: "$.author.email"
        }
      }
    }]
  };

  const document = {
    id: 'doc-1',
    title: 'Test Document',
    content: 'This is a test document',
    author: {
      name: 'John Doe',
      email: 'author@example.com'
    }
  };

  const result = applyMapping(document, mapping, testSchema);
  const { nodes, relationships } = result;

  expect(nodes).toHaveLength(2); // Document + Person node
  expect(nodes[0].label).toBe('Document');
  expect(nodes[0].properties.id).toBe('doc-1');

  expect(relationships).toHaveLength(1);
  expect(relationships[0].type).toBe('AUTHORED_BY');
});

// Unit tests for ingest functions
test('mergeNodesAndRels function should be defined', () => {
  expect(mergeNodesAndRels).toBeDefined();
});

// Unit tests for connector client
test('ConnectorClient should be defined', () => {
  expect(ConnectorClient).toBeDefined();
});
