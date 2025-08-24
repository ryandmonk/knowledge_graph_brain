# Knowledge Graph Brain - CLI

A command-line interface for the Knowledge Graph Brain system.

## Installation

```bash
npm install -g knowledge-graph-brain-cli
```

## Usage

```bash
# Register a schema
kb register ./examples/confluence.yaml

# Add a source
kb add-source confluence-demo confluence http://localhost:8080

# Ingest data
kb ingest confluence-demo confluence --since=2025-01-01

# Search the graph
kb search confluence-demo "MATCH (d:Document {kb_id:'confluence-demo'}) RETURN d LIMIT 5"

# Semantic search
kb semsearch confluence-demo "vector databases for graphs" --top-k 5
```

## Commands

- `kb register <schema-file>` - Register a schema from a YAML file
- `kb add-source <kb-id> <source-id> <connector-url>` - Add a data source
- `kb ingest <kb-id> <source-id> [--since=<date>]` - Ingest data from a source
- `kb search <kb-id> <cypher-query>` - Execute a Cypher query
- `kb semsearch <kb-id> <query-text> [--top-k=<number>]` - Perform semantic search