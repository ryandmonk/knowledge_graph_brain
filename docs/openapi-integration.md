# OpenAPI Integration Guide

**Transform Knowledge Graph Brain into a standard REST API for seamless integration with Open WebUI, Postman, and any OpenAPI-compatible application.**

## Overview

The OpenAPI integration uses the `mcpo` (Model Context Protocol to OpenAPI) proxy to automatically convert our Universal MCP Server into a standard REST API with auto-generated OpenAPI documentation.

### Architecture

```
Open WebUI / Apps → REST/OpenAPI → mcpo Proxy → MCP Protocol → Knowledge Graph MCP Server → Orchestrator
```

## Key Benefits

- ✅ **Zero Configuration for Apps**: Open WebUI automatically discovers all 16 knowledge graph tools
- ✅ **Interactive Documentation**: Swagger UI at `/docs` for testing and exploration
- ✅ **Standard REST API**: All tools accessible via POST endpoints
- ✅ **Type Safety**: Auto-generated OpenAPI schema ensures proper validation
- ✅ **Production Ready**: Handles authentication, CORS, and error handling

## Quick Start

### Prerequisites
- Knowledge Graph Brain orchestrator running
- Python 3.11+ environment
- `mcpo` package installed

### 1. Install mcpo
```bash
# Create Python virtual environment (if not exists)
python3.13 -m venv .venv
source .venv/bin/activate  # or `.venv\Scripts\activate` on Windows

# Install mcpo
pip install mcpo
```

### 2. Start the Proxy
```bash
cd mcp-server

# Build MCP server
npm install && npm run build

# Start mcpo proxy (this starts both the proxy and MCP server)
../.venv/bin/mcpo --port 8080 -- node ./dist/index.js
```

### 3. Verify Installation
```bash
# Check proxy health
curl http://localhost:8080/docs

# Test an endpoint
curl -X POST "http://localhost:8080/list_knowledge_bases" \
     -H "Content-Type: application/json" \
     -d '{"include_stats": true}'
```

## Available REST Endpoints

All 16 MCP tools are automatically exposed as POST endpoints:

### Knowledge Query Tools
- `POST /ask_knowledge_graph` - Natural language Q&A with GraphRAG
- `POST /search_semantic` - Vector similarity search  
- `POST /search_graph` - Structured Cypher queries
- `POST /explore_relationships` - Entity relationship exploration

### Knowledge Management Tools  
- `POST /switch_knowledge_base` - Switch context between KBs
- `POST /list_knowledge_bases` - List all available KBs
- `POST /add_data_source` - Connect new data sources
- `POST /start_ingestion` - Trigger data ingestion
- `POST /get_kb_status` - Check KB health and stats
- `POST /update_schema` - Configure KB schema

### Discovery Tools
- `POST /get_overview` - Comprehensive KB overview
- `POST /explore_schema` - Analyze graph structure  
- `POST /find_patterns` - Discover data patterns
- `POST /get_session_info` - Session context and history

## Integration Examples

### Open WebUI Setup

1. **Start the proxy** as shown above
2. **Configure Open WebUI** to use the API:
   - Base URL: `http://localhost:8080`
   - API Type: OpenAPI/REST
   - Documentation: `http://localhost:8080/docs`

3. **Test integration**:
   ```bash
   # In Open WebUI chat:
   "List all available knowledge bases"
   # Open WebUI will automatically call POST /list_knowledge_bases
   ```

### Postman Collection

1. **Import OpenAPI spec**: `http://localhost:8080/openapi.json`
2. **Set base URL**: `http://localhost:8080`
3. **Test endpoints**: All 16 tools available as POST requests

### Custom Application Integration

```javascript
// Example: JavaScript client
const KnowledgeGraphAPI = {
  baseURL: 'http://localhost:8080',
  
  async askQuestion(question, kbId = null) {
    const response = await fetch(`${this.baseURL}/ask_knowledge_graph`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        kb_id: kbId,
        include_sources: true,
        search_depth: 'deep'
      })
    });
    return response.json();
  },
  
  async listKnowledgeBases() {
    const response = await fetch(`${this.baseURL}/list_knowledge_bases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ include_stats: true })
    });
    return response.json();
  }
};

// Usage
const kbs = await KnowledgeGraphAPI.listKnowledgeBases();
const answer = await KnowledgeGraphAPI.askQuestion(
  "What are the main components of our system?",
  "my-project"
);
```

## Advanced Configuration

### Custom Port and Host
```bash
# Start on different port
../.venv/bin/mcpo --port 9090 --host 0.0.0.0 -- node ./dist/index.js

# With custom path prefix
../.venv/bin/mcpo --port 8080 --path-prefix /api/v1 -- node ./dist/index.js
```

### Multiple MCP Servers
```bash
# Create mcpo config file
cat > mcpo.config.json << EOF
{
  "servers": {
    "knowledge-graph": {
      "command": ["node", "./dist/index.js"],
      "env": {
        "ORCHESTRATOR_URL": "http://localhost:3000"
      }
    }
  },
  "port": 8080,
  "cors": {
    "origins": ["http://localhost:3001", "https://my-app.com"]
  }
}
EOF

# Start with config
../.venv/bin/mcpo --config mcpo.config.json
```

### Authentication Setup
```bash
# With API key authentication
../.venv/bin/mcpo --port 8080 --api-key "your-secure-api-key" -- node ./dist/index.js

# Then use in requests:
curl -X POST "http://localhost:8080/ask_knowledge_graph" \
     -H "Authorization: Bearer your-secure-api-key" \
     -H "Content-Type: application/json" \
     -d '{"question": "What data do we have?"}'
```

## Production Deployment

### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine

# Install Python and mcpo
RUN apk add --no-cache python3 py3-pip
RUN pip3 install mcpo

WORKDIR /app
COPY mcp-server/package*.json ./
RUN npm ci --only=production

COPY mcp-server/ ./
RUN npm run build

EXPOSE 8080
CMD ["mcpo", "--port", "8080", "--host", "0.0.0.0", "--", "node", "./dist/index.js"]
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: knowledge-graph-openapi
spec:
  replicas: 3
  selector:
    matchLabels:
      app: knowledge-graph-openapi
  template:
    metadata:
      labels:
        app: knowledge-graph-openapi
    spec:
      containers:
      - name: openapi-proxy
        image: knowledge-graph-openapi:latest
        ports:
        - containerPort: 8080
        env:
        - name: ORCHESTRATOR_URL
          value: "http://orchestrator-service:3000"
---
apiVersion: v1
kind: Service
metadata:
  name: knowledge-graph-openapi
spec:
  selector:
    app: knowledge-graph-openapi
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
```

### Nginx Reverse Proxy
```nginx
# /etc/nginx/sites-available/knowledge-graph-api
server {
    listen 80;
    server_name api.example.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Authorization";
    }
}
```

## Monitoring and Observability

### Health Checks
```bash
# Proxy health
curl http://localhost:8080/health

# Test core functionality  
curl -X POST "http://localhost:8080/list_knowledge_bases" \
     -H "Content-Type: application/json" -d '{}'
```

### Logging
```bash
# Start with verbose logging
../.venv/bin/mcpo --port 8080 --log-level DEBUG -- node ./dist/index.js

# Or capture logs
../.venv/bin/mcpo --port 8080 -- node ./dist/index.js > mcpo.log 2>&1
```

### Metrics Collection
The mcpo proxy provides basic metrics at `/metrics` (if enabled):
```bash
curl http://localhost:8080/metrics
```

## Troubleshooting

### Common Issues

**Connection Refused**
```bash
# Check if orchestrator is running
curl http://localhost:3000/health

# Check if MCP server builds correctly
cd mcp-server && npm run build
```

**Schema Validation Errors**
```bash
# Verify MCP server starts standalone
cd mcp-server && node dist/index.js
# Should show "Available tools: ..." without errors
```

**CORS Issues**
```bash
# Start with permissive CORS for testing
../.venv/bin/mcpo --port 8080 --cors-origins "*" -- node ./dist/index.js
```

**Authentication Problems**
```bash
# Test without authentication first
../.venv/bin/mcpo --port 8080 -- node ./dist/index.js

# Then add authentication step by step
```

### Debug Mode
```bash
# Enable verbose logging
export MCPO_LOG_LEVEL=DEBUG
../.venv/bin/mcpo --port 8080 -- node ./dist/index.js
```

## API Schema Reference

### Request Format
All endpoints accept POST requests with JSON bodies:
```json
{
  "parameter1": "value1",
  "parameter2": "value2"
}
```

### Response Format
All endpoints return consistent JSON responses:
```json
{
  "success": true,
  "data": {...},
  "message": "Operation completed successfully"
}
```

### Error Format
```json
{
  "error": "Error description",
  "details": {
    "code": "ERROR_CODE",
    "suggestion": "How to fix this issue"
  }
}
```

## Migration from Direct MCP

If you're currently using the MCP server directly:

### Before (Direct MCP)
```javascript
// MCP client configuration
{
  "command": "node",
  "args": ["./mcp-server/dist/index.js"]
}
```

### After (OpenAPI via mcpo)
```javascript
// REST API client
const response = await fetch('http://localhost:8080/ask_knowledge_graph', {
  method: 'POST',
  body: JSON.stringify({ question: "..." })
});
```

## Related Documentation

- **[Universal MCP Server](../mcp-server/README.md)** - Core MCP server documentation
- **[API Reference](./API.md)** - Complete API documentation
- **[Architecture Overview](./ARCHITECTURE.md)** - System design
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment patterns

## Contributing

Found an issue or want to improve the OpenAPI integration?

1. **Report bugs**: Issues with mcpo proxy or OpenAPI generation
2. **Suggest features**: New endpoints or authentication methods
3. **Contribute examples**: Integration patterns for other platforms
4. **Improve docs**: Help make this guide more comprehensive

## External Resources

- **[mcpo Documentation](https://github.com/modelcontextprotocol/mcpo)** - Official mcpo proxy documentation
- **[OpenAPI Specification](https://openapi-generator.tech/)** - OpenAPI standard
- **[Open WebUI](https://docs.openwebui.com/)** - Open WebUI integration guides
