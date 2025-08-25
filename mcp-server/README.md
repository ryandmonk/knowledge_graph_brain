# Knowledge Graph Brain Universal MCP Server

Universal Model Context Protocol (MCP) server that exposes all Knowledge Graph Brain capabilities as tools for external clients like Open WebUI, Claude Desktop, VS Code extensions, and other MCP-compatible applications.

## Features

### 🔍 Knowledge Query Tools
- **ask_knowledge_graph**: Natural language Q&A with GraphRAG
- **search_semantic**: Vector similarity search across knowledge bases
- **search_graph**: Execute structured Cypher queries  
- **explore_relationships**: Explore entity relationships and connections

### ⚙️ Knowledge Management Tools
- **switch_knowledge_base**: Switch context between knowledge bases
- **list_knowledge_bases**: List all available knowledge bases
- **add_data_source**: Connect new data sources (GitHub, Slack, Confluence)
- **start_ingestion**: Trigger data ingestion from sources
- **get_kb_status**: Check knowledge base health and statistics
- **update_schema**: Configure knowledge base schema and mappings

### 🔎 Discovery Tools
- **get_overview**: Comprehensive knowledge base overview
- **explore_schema**: Analyze graph structure and entity types
- **find_patterns**: Discover interesting patterns in the data
- **get_session_info**: View session context and query history

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the MCP server
npm start
```

## Configuration

Set environment variables:

```bash
# Required: Knowledge Graph Orchestrator URL
export ORCHESTRATOR_URL="http://localhost:3000"

# Optional: Session timeout (default: 1 hour)
export SESSION_TIMEOUT_MS="3600000"
```

## Usage with External Clients

### Open WebUI

1. Install the MCP integration plugin in Open WebUI
2. Add this server configuration:
   ```json
   {
     "name": "knowledge-graph-brain",
     "command": "node",
     "args": ["/path/to/knowledge-graph-brain/mcp-server/dist/index.js"],
     "env": {
       "ORCHESTRATOR_URL": "http://localhost:3000"
     }
   }
   ```

### Claude Desktop

Add to your Claude Desktop MCP configuration file:

```json
{
  "mcpServers": {
    "knowledge-graph-brain": {
      "command": "node",
      "args": ["/path/to/knowledge-graph-brain/mcp-server/dist/index.js"],
      "env": {
        "ORCHESTRATOR_URL": "http://localhost:3000"
      }
    }
  }
}
```

### VS Code MCP Extension

1. Install a compatible MCP extension
2. Configure server path and environment variables
3. Use tools through the command palette or extension UI

## Getting Started

1. **Start with a knowledge base**:
   ```
   Use: switch_knowledge_base
   - Set kb_id to your knowledge base name
   - Set create_if_missing: true if it doesn't exist
   ```

2. **Add data sources**:
   ```
   Use: add_data_source  
   - Set source_id (unique identifier)
   - Set connector_url (e.g., "http://github-connector:3001")
   - Optionally set auth_ref for authentication
   ```

3. **Start ingestion**:
   ```
   Use: start_ingestion
   - Set source_id to begin syncing data
   ```

4. **Ask questions**:
   ```
   Use: ask_knowledge_graph
   - Ask natural language questions about your data
   - Get comprehensive answers with citations
   ```

## Example Workflow

```bash
# 1. List available knowledge bases
Tool: list_knowledge_bases

# 2. Create or switch to a knowledge base
Tool: switch_knowledge_base
Input: {"kb_id": "my_project", "create_if_missing": true}

# 3. Add a GitHub repository as a data source  
Tool: add_data_source
Input: {
  "source_id": "docs_repo",
  "connector_url": "http://github-connector:3001"
}

# 4. Start syncing data
Tool: start_ingestion
Input: {"source_id": "docs_repo"}

# 5. Ask questions about your data
Tool: ask_knowledge_graph
Input: {"question": "What are the main architecture patterns used in this project?"}

# 6. Explore the data structure
Tool: explore_schema
Input: {}

# 7. Find interesting patterns
Tool: find_patterns
Input: {"pattern_type": "centrality"}
```

## Architecture

The Universal MCP Server acts as a bridge between:

- **External Clients** (Open WebUI, Claude Desktop, etc.)
- **Knowledge Graph Orchestrator** (core knowledge graph operations)
- **Session Management** (maintains context across tool calls)

```
External Client → MCP Server → Knowledge Graph Orchestrator → Neo4j + Vector DB
```

## Session Management

The server maintains session context including:
- Current knowledge base selection
- Query history (last 10 queries per session)
- Tool usage statistics
- Automatic session cleanup (30-minute timeout)

## Error Handling

All tools return structured error responses with:
- Clear error messages
- Contextual suggestions
- Available alternatives
- Debug information when helpful

## Development

```bash
# Development mode with hot reload
npm run dev

# Run tests
npm test

# Clean build artifacts
npm run clean
```

## API Reference

### Tool Response Format

All tools return JSON responses with consistent structure:

```json
{
  "success": true,
  "data": {...},
  "kb_id": "current_kb",
  "message": "Operation completed successfully"
}
```

Error responses:

```json
{
  "error": "Error message",
  "suggestion": "How to fix this",
  "context": {...}
}
```

### Session Context

Each tool call includes session context:
- `currentKnowledgeBase`: Active KB ID
- `queryHistory`: Recent tool usage
- `lastActivity`: Session timestamp

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality  
4. Submit a pull request

## License

MIT License - see LICENSE file for details.
