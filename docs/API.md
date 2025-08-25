# API Documentation

Knowledge Graph Brain exposes multiple API interfaces for different use cases.

## MCP (Model Context Protocol) API

The primary interface for AI agents and MCP-compatible clients.

### Endpoint
```
POST /mcp
Content-Type: application/json
```

### Available Tools

#### 1. register_schema

Register a knowledge base schema from YAML configuration with **dynamic schema management** (v1.2.0+).

The system now supports unlimited data sources through dynamic schema registration. Schemas are stored in memory and enable automatic connector resolution without code changes.

**Input Schema:**
```json
{
  "kb_id": "string (required)",
  "schema_yaml": "string (required - must include connector_url in mappings)"
}
```

**Schema Requirements (v1.2.0+)**:
- Each source mapping must include `connector_url` field
- Connector URLs are resolved dynamically at runtime
- No hardcoded connector logic - completely schema-driven

**Example:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "register_schema",
    "arguments": {
      "kb_id": "my-kb",
      "schema_yaml": "kb_id: my-kb\nembedding:\n  provider: \"ollama:mxbai-embed-large\"\nmappings:\n  sources:\n    - source_id: \"data\"\n      connector_url: \"http://localhost:8080/api\"\n      document_type: \"document\"\n..."
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\": true, \"kb_id\": \"my-kb\", \"nodes\": 3, \"relationships\": 2, \"sources\": 1}"
      }
    ]
  }
}
```

#### 2. add_source

Register a data source for a knowledge base.

**Input Schema:**
```json
{
  "kb_id": "string (required)",
  "source_id": "string (required)",
  "connector_url": "string (required)",
  "auth_ref": "string (required)",
  "mapping_name": "string (required)"
}
```

#### 3. ingest

Ingest data from a registered source into the knowledge base.

**Input Schema:**
```json
{
  "kb_id": "string (required)",
  "source_id": "string (required)",
  "since": "string (optional) - timestamp to ingest from"
}
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"run_id\": \"run-1724508234567\", \"processed\": 25, \"created_nodes\": 50, \"created_rels\": 30, \"errors\": []}"
    }
  ]
}
```

#### 4. semantic_search

Perform vector similarity search across knowledge base content.

**Input Schema:**
```json
{
  "kb_id": "string (required)",
  "text": "string (required) - search query",
  "top_k": "number (optional, default: 5)",
  "min_score": "number (optional, default: 0.7)"
}
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"found\": 3, \"results\": [{\"node_id\": \"doc-1\", \"score\": 0.87, \"content\": {...}}]}"
    }
  ]
}
```

#### 5. search_graph

Execute Cypher queries against the knowledge graph.

**Input Schema:**
```json
{
  "kb_id": "string (required)",
  "cypher": "string (required) - Cypher query"
}
```

**Example:**
```json
{
  "kb_id": "retail-demo",
  "cypher": "MATCH (p:Product)-[:IN_CATEGORY]->(c:Category) WHERE c.name = 'Electronics' RETURN p.name, p.price LIMIT 10"
}
```

#### 6. sync_status

Get operational status and recent runs for a knowledge base.

**Input Schema:**
```json
{
  "kb_id": "string (required)"
}
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"kb_id\": \"retail-demo\", \"total_nodes\": 450, \"total_relationships\": 312, \"sources\": [{\"source_id\": \"products\", \"last_sync_status\": \"success\"}]}"
    }
  ]
}
```

---

## REST API

Simple HTTP endpoints for direct integration and monitoring.

### Base URL
```
http://localhost:3000
```

### Endpoints

#### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "service": "mcp-orchestrator"
}
```

#### **Enhanced System Health API** (v0.10.0+)
```http
GET /api/health
```

**Advanced health monitoring with alert generation and performance scoring.**

**Response:**
```json
{
  "health_score": 100,
  "status": "healthy",
  "alerts": [],
  "last_updated": "2025-12-XX T10:30:00.000Z",
  "summary": "All systems operational. No active alerts.",
  "details": {
    "neo4j_connected": true,
    "embedding_provider": "ollama:mxbai-embed-large",
    "memory_usage_mb": 245.7,
    "uptime_hours": 12.5,
    "active_runs": 0,
    "total_errors": 0
  },
  "knowledge_bases": [
    {
      "kb_id": "confluence-demo",
      "health_status": "healthy",
      "total_nodes": 6,
      "total_relationships": 4,
      "data_freshness_hours": 2.1,
      "node_types": {
        "Document": 2,
        "Person": 2,
        "Topic": 2
      }
    }
  ]
}
```

**Health Score Algorithm:**
- **100**: All systems optimal
- **75-99**: Minor issues or warnings  
- **50-74**: Moderate performance degradation
- **25-49**: Significant issues requiring attention
- **0-24**: Critical system failures

**Alert Types:**
- `neo4j_connection_failed`: Database connectivity issues
- `performance_degraded`: Slow response times detected
- `stale_data_warning`: Knowledge bases not updated recently
- `memory_pressure`: High memory usage detected

#### System Status
```http
GET /api/status
```

**Response:**
```json
{
  "service": "knowledge-graph-orchestrator",
  "version": "1.1.0",
  "uptime_seconds": 9234,
  "neo4j_connected": true,
  "total_kbs": 3,
  "total_nodes": 1247,
  "total_relationships": 892,
  "knowledge_bases": [
    {
      "kb_id": "retail-demo",
      "total_nodes": 450,
      "total_relationships": 312,
      "sources": [
        {
          "source_id": "products",
          "last_sync_status": "success",
          "last_sync_at": 1724508234567,
          "total_runs": 5,
          "error_count": 0
        }
      ]
    }
  ]
}
```

#### Knowledge Base Status
```http
GET /api/sync-status/:kb_id
```

**Parameters:**
- `kb_id` (path) - Knowledge base identifier

**Response:**
```json
{
  "kb_id": "retail-demo",
  "created_at": 1724501234567,
  "updated_at": 1724508234567,
  "schema_version": 1,
  "total_nodes": 450,
  "total_relationships": 312,
  "sources": [
    {
      "source_id": "products",
      "last_run_id": "run-1724508234567",
      "last_sync_at": 1724508234567,
      "last_sync_status": "success",
      "cursor": "page_2_offset_100",
      "error_count": 0,
      "total_runs": 5
    }
  ],
  "last_error": null,
  "last_error_at": null
}
```

#### Ingestion Runs
```http
GET /api/runs
GET /api/runs/:kb_id
```

**Parameters:**
- `kb_id` (path, optional) - Filter runs by knowledge base

**Response:**
```json
{
  "runs": [
    {
      "run_id": "run-1724508234567",
      "kb_id": "retail-demo",
      "source_id": "products",
      "started_at": 1724508234567,
      "completed_at": 1724508245678,
      "status": "completed",
      "nodes_processed": 125,
      "relationships_created": 89,
      "errors": [],
      "duration_ms": 11111
    }
  ]
}
```

#### Simple Testing Endpoints

**Schema Registration**
```http
POST /api/register-schema
Content-Type: application/json

{
  "kb_id": "test-kb",
  "schema_yaml": "kb_id: test-kb\n..."
}
```

**Ingestion**
```http
POST /api/ingest
Content-Type: application/json

{
  "kb_id": "test-kb",
  "source_id": "test-source"
}
```

**Enhanced Semantic Search** (v0.10.0+)
```http
POST /api/semantic-search
Content-Type: application/json

{
  "kb_id": "test-kb",
  "text": "search query",
  "top_k": 5,
  "labels": ["Document", "Person"],
  "properties": {
    "category": "electronics",
    "status": "active"
  }
}
```

**Enhanced Features:**
- **Real Vector Integration**: Uses actual EmbeddingProviderFactory with Ollama/OpenAI embeddings
- **Label Filtering**: Filter results by specific node labels/types  
- **Property Filtering**: Filter by node properties for precise results
- **Multi-Provider Support**: Automatic provider detection (1024-dim Ollama, 1536-dim OpenAI)

**Response:**
```json
{
  "found": 3,
  "results": [
    {
      "node_id": "doc-123",
      "labels": ["Document"],
      "score": 0.87,
      "content": "Relevant document content...",
      "properties": {
        "title": "Product Guide",
        "category": "electronics"
      }
    }
  ],
  "embedding_provider": "ollama:mxbai-embed-large",
  "vector_dimensions": 1024
}
```

**Graph Search**
```http
POST /api/search-graph
Content-Type: application/json

{
  "kb_id": "test-kb",
  "cypher": "MATCH (n) RETURN n LIMIT 10"
}
```

---

## Error Handling

### MCP Errors

MCP errors follow the JSON-RPC 2.0 error format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32603,
    "message": "Internal server error"
  }
}
```

### REST API Errors

REST API errors return HTTP status codes with JSON error details:

```json
{
  "error": "Schema validation failed: missing required field 'kb_id'",
  "details": {
    "field": "kb_id",
    "expected": "string",
    "received": "undefined"
  }
}
```

### Common Error Codes

- `400 Bad Request` - Invalid input parameters or malformed schema
- `404 Not Found` - Knowledge base or source not found
- `409 Conflict` - Resource already exists (duplicate kb_id)
- `500 Internal Server Error` - Database connection issues or system errors
- `503 Service Unavailable` - Neo4j connection failed or service dependencies unavailable

---

## Rate Limiting

Currently no rate limiting is implemented. For production deployments, consider:

- Adding rate limiting middleware (express-rate-limit)
- Connection pooling for Neo4j
- Request queuing for ingestion operations
- Caching for frequently accessed status endpoints

---

## Authentication

Current implementation uses basic authentication references for connectors. For production:

- Implement JWT token validation
- Support for API keys and OAuth 2.0
- Role-based access control (RBAC)
- Per-knowledge-base access permissions

---

## Monitoring Integration

### Prometheus Metrics

Planned metrics endpoints:
- `/metrics` - Prometheus format metrics
- Ingestion run counters
- Query performance histograms  
- Error rate tracking
- Neo4j connection health

### Health Checks

- `/health` - Basic service health
- `/health/deep` - Neo4j connectivity and system dependencies
- `/ready` - Readiness probe for Kubernetes deployments

---

## WebSocket API (Planned)

Future support for real-time updates:

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3000/ws');

// Subscribe to knowledge base updates
ws.send(JSON.stringify({
  type: 'subscribe',
  kb_id: 'retail-demo'
}));

// Receive real-time ingestion progress
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Ingestion progress:', update);
};
```
