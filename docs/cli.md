# Knowledge Graph Brain - CLI Tools

Professional command-line interface for the Knowledge Graph Brain system with schema validation, system monitoring, and operational tools.

## Installation

From the CLI directory:
```bash
cd cli/
npm install
npm run build

# Make CLI globally available (optional)
npm link
```

## Commands Overview

The `kgb` CLI provides professional tools for:
- **Schema Validation**: Comprehensive YAML schema validation with error reporting
- **System Monitoring**: Health checks, knowledge base status, and ingestion run tracking
- **Operational Tasks**: Professional tools for deployment and maintenance

## Command Reference

### `kgb validate`

Validate Knowledge Graph Brain schema files with comprehensive error checking.

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
- ✅ Clear error messages with actionable suggestions
- ✅ Schema summary with node types, relationships, and source mappings

**Options:**
- `-v, --verbose` - Enable detailed output including schema summary
- `--format <format>` - Output format: `text` (default) or `json`

**Exit Codes:**
- `0` - Schema is valid
- `1` - Schema validation failed or system error

### `kgb status`

Monitor Knowledge Graph Brain system health and operational status.

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

## Usage Examples

### Schema Validation Workflow

```bash
# 1. Create or edit schema file
vim my-schema.yaml

# 2. Validate schema with detailed output
kgb validate my-schema.yaml --verbose

# 3. Fix any validation errors and re-validate
kgb validate my-schema.yaml

# 4. Use validated schema in your application
```

### System Monitoring Workflow

```bash
# 1. Check overall system health
kgb status

# 2. Monitor specific knowledge base
kgb status --kb-id retail-demo --verbose

# 3. Check recent ingestion activity
kgb status --runs

# 4. Automated monitoring (JSON output for scripts)
kgb status --format json | jq '.neo4j_connected'
```

### Example Schema File

```yaml
kb_id: example-kb
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

## Integration with Orchestrator

The CLI tools integrate with the Knowledge Graph Brain orchestrator:

### MCP Integration
- Uses the same schema validator as the orchestrator
- Consistent error messages and validation rules
- Compatible with MCP `register_schema` capability

### REST API Integration
- Status commands query orchestrator REST endpoints (`/api/status`, `/api/sync-status`, `/api/runs`, `/api/health`)
- Enhanced health monitoring with `/api/health` endpoint provides comprehensive system intelligence (v0.10.0+)
- Real-time operational data from running system
- Supports custom server URLs for different environments

### Development Workflow
```bash
# 1. Start orchestrator in development
cd orchestrator/
npm run dev

# 2. Validate schemas before registration
cd ../cli/
kgb validate ../examples/confluence.yaml

# 3. Monitor system health during development
kgb status --verbose

# 4. Track ingestion runs in real-time
watch -n 5 "kgb status --runs"
```

## Error Handling & Troubleshooting

### Common Validation Errors

**Missing Required Fields:**
```bash
❌ Schema validation failed (1 errors)
   • must have required property 'kb_id'
     Path: 
     Suggestion: Add kb_id field to root level
```

**Invalid JSONPath Expressions:**
```bash
❌ Schema validation failed (1 errors)
   • Invalid JSONPath expression '$.invalid..path'
     Path: mappings.sources[source_id=test].extract.assign.title
     Suggestion: Check JSONPath syntax (should start with $ and use valid expressions)
```

**Cross-Reference Errors:**
```bash
❌ Schema validation failed (1 errors)
   • Source mapping references undefined node type 'UnknownNode'
     Path: mappings.sources[source_id=test].extract.node
     Suggestion: Available node types: Document, Author
```

### Connection Issues

**Orchestrator Not Running:**
```bash
Status check failed: Server responded with 500: Internal Server Error
Hints:
  • Make sure the orchestrator server is running
  • Check server URL: http://localhost:3000
  • Try: npm run dev in the orchestrator directory
```

## Development & Extension

### Building the CLI

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Test commands
node dist/index.js validate test-schema.yaml

# Development mode (auto-rebuild)
npm run dev -- validate test-schema.yaml
```

### Adding New Commands

```typescript
// Add to src/index.ts
program
  .command('new-command')
  .description('Description of new command')
  .option('--option <value>', 'Command option')
  .action(newCommandHandler);

// Implement in src/commands/new-command.ts
export async function newCommandHandler(options: any) {
  // Command implementation
}
```

### Architecture

The CLI is built with professional tools:
- **TypeScript** - Type-safe development with ES modules
- **Commander.js** - Professional command-line interface framework
- **AJV** - JSON Schema validation with comprehensive error reporting
- **Chalk** - Colorized terminal output for better UX
- **YAML** - Human-friendly configuration parsing
- **Node-fetch** - HTTP client for orchestrator API integration

## Related Documentation

- **[Main CLI README](../cli/README.md)** - Detailed CLI documentation with examples
- **[DSL Reference](./dsl.md)** - YAML schema language specification
- **[API Documentation](./API.md)** - REST and MCP API reference
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment with CLI tools