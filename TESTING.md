# End-to-End Testing Guide

This guide walks you through testing the complete Knowledge Graph Brain system with your local setup.

## Prerequisites Checklist

Before running tests, ensure you have:

### 1. OpenAI API Key
Add your OpenAI API key to the LangGraph agent environment file:

```bash
echo "OPENAI_API_KEY=your-actual-api-key-here" >> langgraph/graph_rag_agent/.env
```

### 2. Ollama Setup
Verify Ollama is running with the embedding model:

```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# Pull the embedding model if not available
ollama pull mxbai-embed-large
```

### 3. Neo4j Setup
The system expects Neo4j running on bolt://localhost:7687 with credentials `neo4j/password`.

## Quick Start Testing

### Option 1: Automated Setup and Test

```bash
# Start all services automatically
./start-services.sh

# In another terminal, run the complete test
./test-e2e.sh
```

### Option 2: Manual Step-by-Step

1. **Start Neo4j (if not running):**
   ```bash
   cd infra
   docker-compose up -d neo4j
   ```

2. **Start the MCP Orchestrator:**
   ```bash
   cd orchestrator
   npm install && npm run build && npm start
   ```

3. **Start the Confluence Connector (in another terminal):**
   ```bash
   cd connectors/confluence
   npm install && npm start
   ```

4. **Run the end-to-end test (in another terminal):**
   ```bash
   ./test-e2e.sh
   ```

## What the Test Does

The end-to-end test validates the complete workflow:

### 1. Infrastructure Checks
- ✅ Neo4j connection (bolt://localhost:7687)
- ✅ MCP Orchestrator health (http://localhost:3000)
- ✅ Confluence Connector health (http://localhost:3001)
- ✅ Ollama embedding service (http://localhost:11434)

### 2. Schema Management
- 📝 Register the Confluence schema from `examples/confluence.yaml`
- 🔍 Validate schema parsing and storage

### 3. Data Source Configuration
- 🔗 Add Confluence as a data source
- 🗝️ Configure authentication and mapping

### 4. Data Ingestion
- 📥 Pull mock Confluence data
- 🧠 Generate embeddings using Ollama (mxbai-embed-large)
- 🗄️ Store in Neo4j with relationships

### 5. Search Functionality
- 🔍 Semantic search: "knowledge graphs tutorial"
- 🕸️ Graph query: Find documents and authors
- 📊 Sync status check

### 6. LangGraph Agent
- 🤖 Multi-step reasoning queries
- 🔧 Tool usage (semantic search + graph queries)
- 📋 Structured responses with citations

## Expected Results

### Successful Schema Registration
```json
{
  "success": true,
  "message": "Schema registered successfully",
  "kb_id": "confluence-demo"
}
```

### Successful Data Ingestion
```json
{
  "success": true,
  "documents_processed": 5,
  "embeddings_generated": 5,
  "graph_nodes_created": 15,
  "relationships_created": 10
}
```

### Semantic Search Results
```json
{
  "results": [
    {
      "document_id": "doc-123",
      "title": "Knowledge Graphs in Practice",
      "content": "...",
      "similarity_score": 0.87,
      "metadata": {...}
    }
  ]
}
```

### LangGraph Agent Response
```
Based on my search, I found several documents about knowledge graphs:

1. **"Knowledge Graphs in Practice"** by John Doe (john@company.com)
   - Discusses practical implementation approaches
   - Covers Neo4j integration patterns

2. **"Graph RAG Tutorial"** by Jane Smith (jane@company.com)  
   - Step-by-step guide for building graph-enhanced retrieval
   - Includes code examples and best practices

The documents show that knowledge graphs enable more structured information retrieval...

**Sources:**
- Document ID: doc-123 (Knowledge Graphs in Practice)
- Document ID: doc-456 (Graph RAG Tutorial)
```

## Troubleshooting

### Common Issues

#### 1. "MCP Orchestrator not running"
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill existing process if needed
lsof -ti:3000 | xargs kill -9

# Restart orchestrator
cd orchestrator && npm start
```

#### 2. "Ollama embeddings failed"
```bash
# Check Ollama status
ollama list

# Pull model if missing
ollama pull mxbai-embed-large

# Test embedding API
curl -X POST http://localhost:11434/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model": "mxbai-embed-large", "prompt": "test"}'
```

#### 3. "Neo4j connection failed"
```bash
# Check Neo4j container
docker ps | grep neo4j

# Restart if needed
cd infra && docker-compose restart neo4j

# Test connection
echo "RETURN 'test' as result" | cypher-shell -u neo4j -p password
```

#### 4. "OpenAI API errors"
```bash
# Verify API key is set
grep OPENAI_API_KEY langgraph/graph_rag_agent/.env

# Test API key
curl -H "Authorization: Bearer your-api-key" \
  https://api.openai.com/v1/models
```

### Debug Mode

For detailed debugging, set environment variables:

```bash
# Enable debug logging
export DEBUG=true
export LOG_LEVEL=debug

# Run test with verbose output
./test-e2e.sh
```

### Manual Verification

#### Check Neo4j Data
1. Open Neo4j Browser: http://localhost:7474
2. Login: neo4j/password
3. Run query: `MATCH (n) RETURN n LIMIT 10`

#### Test MCP Capabilities Directly
```bash
# Test semantic search
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "capability": "semantic_search",
    "args": {
      "kb_id": "confluence-demo",
      "text": "knowledge graphs",
      "top_k": 3
    }
  }'
```

#### Test LangGraph Agent Manually
```bash
cd langgraph/graph_rag_agent
npm run dev "What documents do we have about AI?" "confluence-demo"
```

## Performance Expectations

With the test data (5 mock documents):

- **Schema Registration:** < 1 second
- **Data Ingestion:** 2-5 seconds (including embeddings)
- **Semantic Search:** < 1 second  
- **Graph Queries:** < 500ms
- **LangGraph Agent:** 3-10 seconds (depending on OpenAI API)

## Next Steps After Successful Testing

1. **Add Real Data Sources:**
   - Configure actual Confluence credentials
   - Add more connectors (Notion, Slack, etc.)

2. **Scale Testing:**
   - Test with larger datasets (100+ documents)
   - Monitor performance and memory usage

3. **Production Deployment:**
   - Use the Docker infrastructure in `infra/`
   - Configure environment-specific credentials
   - Set up monitoring and logging

4. **Custom Queries:**
   - Experiment with different LangGraph questions
   - Build domain-specific query templates
   - Add more sophisticated reasoning patterns

---

## 🧪 **NEW: Comprehensive E2E Testing with Playwright**

For thorough QA testing and regression detection, we've implemented a **production-grade Playwright E2E testing suite**:

### **Quick Start E2E Testing**
```bash
# Navigate to E2E test directory
cd tests/e2e

# Install dependencies (one-time setup)
npm install && npx playwright install

# Run quick smoke tests (2-3 minutes)
./run-tests.sh smoke

# Run full comprehensive test suite (15-20 minutes)
./run-tests.sh all
```

### **Test Categories Available**
- 🔄 **Core Workflows**: Complete user journeys from setup to querying
- 🔌 **API Integration**: REST endpoints, MCP tools, authentication testing
- 📷 **Visual Regression**: UI component screenshots and responsive design
- ⚡ **Performance Testing**: Load times, memory usage, rendering benchmarks
- 💨 **Smoke Tests**: Quick validation of essential functionality

### **Development Testing**
```bash
# Watch tests run in visible browser
./run-tests.sh core --headed

# Debug mode with breakpoints
./run-tests.sh api --debug

# Update visual baselines after UI changes
./run-tests.sh visual --update-snapshots
```

### **Comprehensive Coverage**
The Playwright suite tests:
- ✅ **Complete Setup Wizard workflows**
- ✅ **Knowledge base creation and schema configuration**
- ✅ **Data ingestion and connector management**
- ✅ **All search interfaces (semantic, graph, GraphRAG)**
- ✅ **3D graph visualization interactions**
- ✅ **Real-time monitoring dashboards**
- ✅ **Error handling and recovery scenarios**
- ✅ **Cross-browser compatibility (Chrome, Firefox, Safari)**
- ✅ **Mobile and tablet responsive design**
- ✅ **Performance benchmarks and memory usage**

### **View Test Results**
```bash
# Interactive HTML report with screenshots
open tests/e2e/playwright-report/index.html

# Or use the built-in viewer
cd tests/e2e && npm run show-report
```

**📚 Complete Documentation:** See `tests/e2e/README.md` for full details on the testing architecture, configuration options, and CI/CD integration.

---

## Support

If you encounter issues:

1. Check the service logs in your terminals
2. Verify all prerequisites are met
3. Review the troubleshooting section above
4. Check Neo4j Browser for data verification

The system is designed to be robust with fallbacks, but real-world integration always has edge cases!
