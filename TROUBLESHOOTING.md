# Troubleshooting Guide

This guide covers common issues and their solutions when setting up and running the Knowledge Graph Brain system.

## 🚨 Common Issues

### 1. "Connection refused" errors

**Symptoms:**
- `curl: (7) Failed to connect to localhost port 3000: Connection refused`
- Services not responding to health checks

**Solutions:**
```bash
# Check if all services are running
ps aux | grep -E "(node|ollama|neo4j)"

# Check port usage
lsof -i :3000  # Orchestrator
lsof -i :3001  # Confluence connector
lsof -i :3002  # MCP server (if running)
lsof -i :7687  # Neo4j
lsof -i :11434 # Ollama

# Kill processes on specific ports if needed
lsof -ti :3000 | xargs kill -9
lsof -ti :3001 | xargs kill -9
```

**Prevention:**
- Always use `./start-services.sh` for coordinated startup
- Check health endpoints before proceeding to next steps

---

### 2. Ollama model not found

**Symptoms:**
- `Error: model "mxbai-embed-large" not found`
- Embedding generation fails
- Agent responses indicate missing models

**Solutions:**
```bash
# Verify models are installed
ollama list

# Pull missing embedding models
ollama pull mxbai-embed-large
ollama pull nomic-embed-text    # alternative
ollama pull all-minilm          # alternative

# Pull missing reasoning models
ollama pull qwen3:8b
ollama pull llama3.1            # alternative
ollama pull gemma3:27b          # alternative

# Test model functionality
ollama run qwen3:8b "Hello, test message"
```

**Model Recommendations by Use Case:**
- **Fast Setup**: `mxbai-embed-large` + `qwen3:8b`
- **Best Quality**: `nomic-embed-text` + `llama3.1`
- **Minimal Resources**: `all-minilm` + `qwen3:8b`

---

### 3. Neo4j connection issues

**Symptoms:**
- `Neo4j connection failed`
- Database queries timeout
- Graph visualization shows no data

**Solutions:**

**Neo4j Desktop:**
- Ensure Neo4j Desktop is running
- Check password is set to `password` (default)
- Verify database is started (green play button in Neo4j Desktop)
- Check database name matches environment configuration

**Docker Setup:**
```bash
# Check if Neo4j container is running
docker ps | grep neo4j

# Restart Neo4j if needed
cd infra
docker-compose down neo4j
docker-compose up -d neo4j

# Check logs
docker-compose logs neo4j
```

**Configuration:**
```bash
# Check environment variables
cd orchestrator
cat .env

# Example .env configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
NEO4J_DATABASE=neo4j
```

**Database Testing:**
```bash
# Test connection from orchestrator
curl -X POST http://localhost:3000/api/search-graph \
  -H "Content-Type: application/json" \
  -d '{"kb_id": "test", "cypher": "RETURN 1 as test"}'
```

---

### 4. Schema registration fails

**Symptoms:**
- `Schema validation failed`
- `Invalid JSON format`
- `Connector URL unreachable`

**Solutions:**

**JSON Format Issues:**
```bash
# Validate JSON before sending
echo '{"kb_id": "test", "schema_yaml": "..."}' | jq .

# Use proper escaping for multi-line YAML
curl -X POST http://localhost:3000/api/register-schema \
  -H "Content-Type: application/json" \
  -d @examples/confluence-registration.json
```

**Schema Validation:**
```bash
# Use CLI to validate schema files
cd cli
npm run build
./dist/index.js validate ../examples/confluence.yaml
./dist/index.js validate ../examples/retail.yaml
```

**Connector Connectivity:**
```bash
# Test connector endpoints directly
curl http://localhost:3001/health    # Confluence
curl http://localhost:8081/health    # Retail
curl http://localhost:3001/pull      # Confluence data
curl http://localhost:8081/data/products  # Retail data
```

**View Orchestrator Logs:**
```bash
# Check detailed error messages
cd orchestrator
npm start  # Run in foreground to see logs
```

---

### 5. Build failures

**Symptoms:**
- `npm install` fails with dependency errors
- TypeScript compilation errors
- Missing module errors

**Solutions:**

**Clean Install:**
```bash
# Remove all node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# For all services
find . -name "node_modules" -type d -exec rm -rf {} +
find . -name "package-lock.json" -delete
./start-services.sh
```

**Node.js Version:**
```bash
# Ensure Node.js 18+ is installed
node --version
npm --version

# Use nvm to manage Node versions
nvm install 18
nvm use 18
```

**TypeScript Issues:**
```bash
# Rebuild TypeScript projects
cd orchestrator
npm run build

cd ../cli
npm run build

cd ../langgraph/graph_rag_agent
npm run build
```

---

### 6. Ingestion failures

**Symptoms:**
- `No documents processed`
- `Connector returned empty data`
- `Database shows no nodes/relationships`

**Diagnostics:**
```bash
# Check connector data
curl http://localhost:3001/pull
curl http://localhost:8081/data/products

# Verify schema registration
curl http://localhost:3000/api/status

# Check ingestion logs
cd orchestrator
npm start  # Watch for detailed ingestion logs
```

**Common Fixes:**
- Ensure connectors are running before ingestion
- Verify connector_url in schema matches actual endpoints
- Check that source_id in ingestion request matches schema

---

### 7. GraphRAG Agent issues

**Symptoms:**
- Agent doesn't find relevant information
- No search results returned
- Embedding errors

**Solutions:**

**Knowledge Base Verification:**
```bash
# Check if data was ingested
curl -X POST http://localhost:3000/api/search-graph \
  -H "Content-Type: application/json" \
  -d '{"kb_id": "confluence-demo", "cypher": "MATCH (n) RETURN count(n) as nodes"}'

# Test semantic search
curl -X POST http://localhost:3000/api/semantic-search \
  -H "Content-Type: application/json" \
  -d '{"kb_id": "confluence-demo", "text": "knowledge graph", "top_k": 3}'
```

**Agent Environment:**
```bash
cd langgraph/graph_rag_agent

# Ensure dependencies are installed
npm install && npm run build

# Test with simple question
npm run dev "What data is available?" "confluence-demo"
```

---

### 8. Performance issues

**Symptoms:**
- Slow ingestion
- Timeout errors
- High memory usage

**Optimization:**

**Chunking Strategy:**
```yaml
# Adjust chunking in schema
embedding:
  provider: "ollama:mxbai-embed-large"
  chunking:
    strategy: "by_headings"     # or "by_fields" or "fixed_size"
    max_tokens: 1200            # reduce for faster processing
```

**Parallel Processing:**
```bash
# Ingest sources separately for large datasets
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"kb_id": "retail-demo", "source_id": "products"}'

# Then ingest customers
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"kb_id": "retail-demo", "source_id": "customers"}'
```

---

## 🔧 System Health Checks

### Complete System Verification

```bash
#!/bin/bash
# save as health-check.sh and run

echo "=== Knowledge Graph Brain Health Check ==="

# 1. Check Ollama
echo "1. Checking Ollama..."
curl -s http://localhost:11434/api/tags >/dev/null && echo "✅ Ollama running" || echo "❌ Ollama not running"

# 2. Check Neo4j
echo "2. Checking Neo4j..."
lsof -i :7687 >/dev/null && echo "✅ Neo4j running" || echo "❌ Neo4j not running"

# 3. Check Orchestrator
echo "3. Checking Orchestrator..."
curl -s http://localhost:3000/health >/dev/null && echo "✅ Orchestrator running" || echo "❌ Orchestrator not running"

# 4. Check Connectors
echo "4. Checking Connectors..."
curl -s http://localhost:3001/health >/dev/null && echo "✅ Confluence connector running" || echo "❌ Confluence connector not running"
curl -s http://localhost:8081/health >/dev/null && echo "✅ Retail connector running" || echo "❌ Retail connector not running"

# 5. Check Models
echo "5. Checking Ollama Models..."
ollama list | grep -q mxbai-embed-large && echo "✅ Embedding model available" || echo "❌ Embedding model missing"
ollama list | grep -q qwen3 && echo "✅ Reasoning model available" || echo "❌ Reasoning model missing"

echo "=== Health Check Complete ==="
```

### Port Reference

| Service | Port | Health Check |
|---------|------|--------------|
| Orchestrator | 3000 | `curl http://localhost:3000/health` |
| Confluence Connector | 3001 | `curl http://localhost:3001/health` |
| MCP Server | 3002 | `curl http://localhost:3002/health` |
| Retail Connector | 8081 | `curl http://localhost:8081/health` |
| Neo4j | 7687 | `lsof -i :7687` |
| Neo4j HTTP | 7474 | `curl http://localhost:7474` |
| Ollama | 11434 | `curl http://localhost:11434/api/tags` |

---

## 🧪 Testing & Validation

### End-to-End Testing

```bash
# Complete system test
cd dev
./test-e2e.sh

# Individual component tests
./test-simple.sh           # Basic functionality
./verify_graphbrain.sh     # Database validation
./test_mcp_direct.sh       # MCP integration
```

### Manual Validation Steps

1. **Service Health**: All services respond to health checks
2. **Schema Registration**: Both demo schemas register successfully
3. **Data Ingestion**: Documents and relationships appear in Neo4j
4. **Semantic Search**: Returns relevant results for queries
5. **Graph Queries**: Cypher queries return expected data
6. **GraphRAG Agent**: Provides intelligent answers with citations

---

## 📞 Getting Help

### Log Locations
- **Orchestrator**: Console output when running `npm start`
- **Connectors**: Console output in respective terminals
- **Neo4j**: Neo4j Desktop logs or `docker-compose logs neo4j`
- **Ollama**: `ollama logs` or system logs

### Debugging Commands
```bash
# View running processes
ps aux | grep -E "(node|ollama|neo4j)"

# Check system resources
top -o cpu
df -h

# Network connectivity
netstat -an | grep LISTEN | grep -E "(3000|3001|7687|11434)"
```

### Common Environment Issues
- **macOS**: Ensure Ollama is installed via official installer
- **Linux**: Check firewall settings for local ports
- **Windows**: Use WSL2 for best compatibility
- **Docker**: Ensure Docker Desktop is running and has sufficient resources

### Further Resources
- [Architecture Documentation](./docs/ARCHITECTURE.md)
- [API Reference](./docs/API.md)  
- [Schema Examples](./examples/)
- [Testing Guide](./TESTING.md)

---

Still having issues? [Open an issue](https://github.com/ryandmonk/knowledge_graph_brain/issues) with:
- Your operating system
- Complete error messages
- Output from health checks
- Steps to reproduce the problem
