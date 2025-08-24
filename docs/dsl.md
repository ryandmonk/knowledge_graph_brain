# Domain Schema & Mapping DSL Reference

## Overview

The Knowledge Graph Brain uses a declarative YAML-based DSL for defining domain schemas and mappings. This allows the system to work with multiple domains without requiring code changes.

## Schema Structure

A schema consists of:

- `kb_id` - Unique identifier for the knowledge base
- `embedding` - Configuration for vector embeddings
- `schema` - Definition of nodes and relationships
- `mappings` - How to extract graph entities from source documents

## Example Schema

```yaml
kb_id: example-kb
embedding:
  provider: "ollama:mxbai-embed-large"
  chunking:
    strategy: "by_headings"
    max_tokens: 1200
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
    - source_id: "example-source"
      document_type: "document"
      extract:
        node: Document
        assign:
          id: "$.id"
          title: "$.title"
          content: "$.content"
      edges: []
```

## Schema Components

### kb_id

A unique string identifier for the knowledge base.

### embedding

Configuration for vector embeddings:

- `provider` - The embedding provider to use (e.g., "ollama:mxbai-embed-large")
- `chunking` - Strategy for chunking text before embedding
  - `strategy` - The chunking strategy ("by_headings", "by_fields", etc.)
  - Additional parameters specific to the strategy

### schema.nodes

An array of node definitions:

- `label` - The node label in the graph
- `key` - The property used as a unique identifier
- `props` - An array of property names to extract

### schema.relationships

An array of relationship definitions:

- `type` - The relationship type
- `from` - The label of the source node
- `to` - The label of the target node
- `props` - An optional array of property names to extract

### mappings.sources

An array of source mapping definitions:

- `source_id` - Identifier for the source
- `document_type` - Type of document being processed
- `extract` - How to extract the primary node
  - `node` - The node label to create
  - `assign` - Property mappings using JSONPath expressions
- `edges` - An array of relationship definitions
  - `type` - The relationship type
  - `from` - Source node definition
    - `node` - The node label
    - `key` - JSONPath to the node key
  - `to` - Target node definition
    - `node` - The node label
    - `key` - JSONPath to the node key
    - `props` - Optional property mappings using JSONPath expressions