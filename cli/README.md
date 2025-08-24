# KGB CLI - Knowledge Graph Brain Command Line Tools

Professional CLI tools for managing Knowledge Graph Brain schemas, monitoring system health, and operational tasks.

## Installation

```bash
# From the CLI directory
npm install
npm run build

# Make CLI globally available (optional)
npm link
```

## Commands

### `kgb validate`

Validate a Knowledge Graph Brain schema file with comprehensive error checking.

```bash
# Basic validation
kgb validate schema.yaml

# Verbose output with detailed schema information
kgb validate schema.yaml --verbose

# JSON output for programmatic use
kgb validate schema.yaml --format json
```

**Features:**
- ✅ Complete JSON Schema validation with AJV
- ✅ Cross-reference validation (ensures referenced node types exist)
- ✅ JSONPath syntax verification for all mapping expressions
- ✅ Security warnings for potentially sensitive fields (PII detection)
- ✅ Clear error messages with suggestions
- ✅ Schema summary with node types, relationships, and source mappings

**Options:**
- `-v, --verbose` - Enable detailed output including schema summary
- `--format <format>` - Output format: `text` (default) or `json`

**Exit Codes:**
- `0` - Schema is valid
- `1` - Schema validation failed or system error

### `kgb status`

Check the operational status of Knowledge Graph Brain services.

```bash
# System overview
kgb status

# Specific knowledge base status
kgb status --kb-id my-kb

# Recent ingestion runs
kgb status --runs

# Custom server URL
kgb status --server http://localhost:3001

# JSON output
kgb status --format json
```

**Features:**
- 🔍 System health monitoring (uptime, Neo4j connectivity)
- 📊 Knowledge base statistics (nodes, relationships, sources)
- 🏃 Ingestion run tracking with performance metrics
- ❌ Error reporting and troubleshooting hints
- 📈 Aggregate statistics across all knowledge bases

**Options:**
- `-k, --kb-id <kb_id>` - Show status for specific knowledge base
- `-r, --runs` - Show recent ingestion runs across all KBs
- `--server <url>` - Orchestrator server URL (default: http://localhost:3000)
- `--format <format>` - Output format: `text` (default) or `json`

## Examples

### Validating a Schema

```yaml
# example-schema.yaml
kb_id: my-knowledge-base
embedding:
  provider: "ollama:mxbai-embed-large"
  chunking:
    strategy: "by_fields"
    fields: ["title", "content"]

schema:
  nodes:
    - label: Document
      key: id
      props: ["title", "content", "created_at"]
    - label: Author
      key: email
      props: ["name", "email"]

  relationships:
    - type: AUTHORED_BY
      from: Document
      to: Author

mappings:
  sources:
    - source_id: articles
      document_type: article
      extract:
        node: Document
        assign:
          id: "$.id"
          title: "$.title"
          content: "$.body"
      edges:
        - type: AUTHORED_BY
          from:
            node: Document
            key: "$.id"
          to:
            node: Author
            key: "$.author.email"
```

```bash
$ kgb validate example-schema.yaml --verbose

📄 Validating schema: example-schema.yaml
✅ Schema is valid!
📊 Knowledge Base ID: my-knowledge-base
📦 Node types: 2
   • Document (key: id)
   • Author (key: email)
🔗 Relationship types: 1
   • AUTHORED_BY (Document → Author)
🔌 Source mappings: 1
   • articles (article)
```

### System Status Monitoring

```bash
$ kgb status

🔍 Knowledge Graph Brain Status
Server: http://localhost:3000

✅ System Status: knowledge-graph-orchestrator
📦 Version: 1.0.0
⏱️  Uptime: 2h 34m
🗄️  Neo4j: ✅ Connected
📊 Knowledge Bases: 3
🏷️  Total Nodes: 1,247
🔗 Total Relationships: 892

📚 Knowledge Bases (3):
  • retail-demo ✅ OK
    Nodes: 450, Relations: 312
  • confluence-kb ✅ OK  
    Nodes: 623, Relations: 445
  • test-kb 🔄 Running
    Nodes: 174, Relations: 135
```

### Knowledge Base Specific Status

```bash
$ kgb status --kb-id retail-demo

📊 Knowledge Base: retail-demo
📅 Created: 8/24/2025, 10:30:15 AM
🔄 Last Updated: 8/24/2025, 2:45:22 PM
🏷️  Nodes: 450
🔗 Relationships: 312

🔌 Sources (2):
  • products-api ✅
    Last sync: 8/24/2025, 2:45:22 PM
    Total runs: 5, Errors: 0
  • inventory-feed ✅
    Last sync: 8/24/2025, 1:15:30 PM
    Total runs: 3, Errors: 1
```

## Troubleshooting

### Common Issues

**Schema Validation Errors:**
```bash
❌ Schema validation failed (2 errors)
   • must have required property 'kb_id'
     Path: 
     Suggestion: Add kb_id field to root level
   • Invalid JSONPath expression '$.invalid..path'
     Path: mappings.sources[source_id=test].extract.assign.title
     Suggestion: Check JSONPath syntax (should start with $ and use valid expressions)
```

**Connection Issues:**
```bash
Status check failed: Server responded with 500: Internal Server Error
Hints:
  • Make sure the orchestrator server is running
  • Check server URL: http://localhost:3000
  • Try: npm run dev in the orchestrator directory
```

### Development Setup

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run validation tests
npm test

# Development mode (auto-rebuild)
npm run dev -- validate test-schema.yaml
```

## Architecture

The CLI is built with:

- **TypeScript** - Type-safe development with ES modules
- **Commander.js** - Professional command-line interface
- **AJV** - JSON Schema validation with comprehensive error reporting
- **Chalk** - Colorized terminal output
- **YAML** - Human-friendly configuration parsing
- **JSONPath Plus** - JSONPath expression validation

## Integration

The CLI integrates with the Knowledge Graph Brain orchestrator via:

- **REST API** - Status endpoints (`/api/status`, `/api/sync-status`, `/api/runs`)
- **Schema Validation** - Uses the same validator as the orchestrator
- **Error Handling** - Consistent error formatting across CLI and API

## Contributing

1. **Development**: Make changes in `src/`
2. **Build**: `npm run build`  
3. **Test**: `npm test`
4. **Integration**: Test with orchestrator running locally

## License

MIT License - See LICENSE file for details.
