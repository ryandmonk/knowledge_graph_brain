<div align="center">
  <img src="./assets/logo.png" alt="Knowledge Graph Brain Logo" width="200"/>
  
# Knowledge Graph Brain
</div>

- **Unifies Data Silos**: Connects APIs, databases, document systems, and any data source into a single knowledge graph.  
- **Dynamic Schema Management**: Register unlimited data sources without code changes using YAML schemas with connector URLs.
- **Trustworthy RAG**: Hybrid semantic + graph search with full provenance and citations for compliance.  
- **Privacy-First**: 100% local AI (Ollama) or cloud AI (OpenAI) — your choice for embeddings.  
- **Production-Ready**: Dockerized, TypeScript-based, extensible with pluggable schemas and connectors.  

---

## 🧠 Overview

**Unify silos into a knowledge graph brain that powers trustworthy RAG and agent workflows — with per-domain schemas, provenance, and pluggable embeddings.**

A **production-ready** MCP-based knowledge graph orchestrator that ingests data from multiple sources, maps them through declarative YAML schemas, stores in Neo4j with vector embeddings, and provides intelligent GraphRAG capabilities through a LangGraph agent.

---

## 🎯 What This System Does

- **📥 Multi-Source Ingestion**: Connects to document systems, databases, APIs, or any data source via pluggable connectors  
- **🗺️ Smart Mapping**: Declarative YAML schemas with JSONPath expressions for mapping to graph structures  
- **🧠 Knowledge Graph**: Stores structured data in Neo4j with provenance (source_id, run_id, timestamps)  
- **🔍 Vector Search**: Local Ollama embeddings for semantic similarity search (no external API required)  
- **🤖 GraphRAG Agent**: LangGraph agent that combines graph queries + semantic search with local LLM reasoning  
- **🔗 MCP Integration**: All capabilities exposed as Model Context Protocol tools  
- **🔒 Privacy First**: 100% local operation — your data never leaves your machine  

---

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Data Sources  │────│   Orchestrator   │────│    Neo4j DB     │
│ • Document Sys  │    │ • Schema Parser  │    │ • Graph Data    │
│ • Enterprise DB │    │ • MCP Server     │    │ • Embeddings    │
│ • APIs & Files  │    │ • Ingest Engine  │    │ • Provenance    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                       ┌──────────────────┐
                       │  LangGraph Agent │
                       │ • Semantic Search│
                       │ • Graph Queries  │
                       │ • Smart Synthesis│
                       │ • Ollama LLM     │
                       └──────────────────┘
                                │
                       ┌──────────────────┐
                       │   Ollama Service │
                       │ • Local LLM      │
                       │ • Embeddings     │
                       │ • No External API│
                       └──────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+  
- Docker & Docker Compose (for Neo4j)  
- **Ollama** (for local LLM + embeddings)  
- Neo4j Desktop (recommended) or Docker  

### 1. Choose Your AI Provider

**Option A: Local Privacy (Ollama)** ⭐ **Recommended**
```bash
# Install Ollama if not already installed
# Visit: https://ollama.ai/download

# Pull required models
ollama pull mxbai-embed-large   # embeddings (or nomic-embed-text, etc.)
ollama pull qwen3:8b            # reasoning (or llama3.1, gemma3, etc.)

# Verify models are available
ollama list
```

**Option B: Cloud Performance (OpenAI)**
```bash
export OPENAI_API_KEY="your-api-key-here"
# Uses OpenAI's text-embedding-ada-002 model
```

### 2. Start Neo4j
**Option A: Neo4j Desktop** ⭐ **Recommended**  
- Download and install Neo4j Desktop
- Create a new database with password `password`
- Start the database

**Option B: Docker**
```bash
cd infra
docker-compose up -d neo4j
```

### 3. Install Dependencies & Start Services
```bash
# Option A: Automated startup (recommended)
./start-services.sh

# Option B: Manual startup for debugging
# Terminal 1 - Orchestrator
cd orchestrator
npm install && npm run build
npm start

# Terminal 2 - Confluence Connector  
cd connectors/confluence
npm install && npm start

# Terminal 3 - Retail Connector (optional)
cd connectors/retail-mock
npm install && npm start
```

### 4. Verify All Services Are Running
```bash
# Check service health
curl http://localhost:3000/health    # Orchestrator
curl http://localhost:3001/health    # Confluence connector
curl http://localhost:8081/health    # Retail connector (optional)
curl http://localhost:11434/api/tags # Ollama models
```

### 5. Register Schemas (Required First Step)
**The system now supports unlimited data sources through dynamic schema registration!**

```bash
# Register the Confluence demo schema
curl -X POST http://localhost:3000/api/register-schema \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "kb_id": "confluence-demo",
  "schema_yaml": "kb_id: confluence-demo\nembedding:\n  provider: \"ollama:mxbai-embed-large\"\n  chunking:\n    strategy: \"by_headings\"\n    max_tokens: 1200\nschema:\n  nodes:\n    - label: Document\n      key: page_id\n      props: [page_id, title, url, space, created, content]\n    - label: Person\n      key: email\n      props: [name, email]\n    - label: Topic\n      key: name\n      props: [name]\n  relationships:\n    - type: AUTHORED_BY\n      from: Document\n      to: Person\n    - type: DISCUSSES\n      from: Document\n      to: Topic\nmappings:\n  sources:\n    - source_id: \"confluence\"\n      connector_url: \"http://localhost:3001/pull\"\n      document_type: \"page\"\n      extract:\n        node: Document\n        assign:\n          page_id: \"$.id\"\n          title: \"$.title\"\n          url: \"$.url\"\n          space: \"$.space\"\n          created: \"$.created_date\"\n          content: \"$.content\"\n      edges:\n        - type: AUTHORED_BY\n          from: { node: Document, key: \"$.id\" }\n          to:\n            node: Person\n            key: \"$.author.email\"\n            props:\n              name: \"$.author.name\"\n              email: \"$.author.email\"\n        - type: DISCUSSES\n          from: { node: Document, key: \"$.id\" }\n          to:\n            node: Topic\n            key: \"$.labels[*]\"\n            props:\n              name: \"$.labels[*]\""
}
EOF

# Register the Retail demo schema
curl -X POST http://localhost:3000/api/register-schema \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "kb_id": "retail-demo",
  "schema_yaml": "kb_id: retail-demo\nembedding:\n  provider: \"ollama:mxbai-embed-large\"\n  chunking:\n    strategy: \"by_fields\"\n    fields: [\"description\"]\nschema:\n  nodes:\n    - label: Product\n      key: sku\n      props: [sku, name, description, category, price]\n    - label: Customer\n      key: email\n      props: [email, name, segment]\n  relationships:\n    - type: PURCHASED_BY\n      from: Product\n      to: Customer\nmappings:\n  sources:\n    - source_id: \"products\"\n      connector_url: \"http://localhost:8081/data/products\"\n      document_type: \"product\"\n      extract:\n        node: Product\n        assign:\n          sku: \"$.sku\"\n          name: \"$.name\"\n          description: \"$.description\"\n          category: \"$.category\"\n          price: \"$.price\"\n      edges: []\n    - source_id: \"customers\"\n      connector_url: \"http://localhost:8081/data/customers\"\n      document_type: \"customer\"\n      extract:\n        node: Customer\n        assign:\n          email: \"$.email\"\n          name: \"$.name\"\n          segment: \"$.segment\"\n      edges: []"
}
EOF
```

### 6. Ingest Data from Multiple Sources
```bash
# Ingest Confluence documents
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"kb_id": "confluence-demo", "source_id": "confluence"}'

# Ingest retail products
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"kb_id": "retail-demo", "source_id": "products"}'

# Ingest customer data  
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"kb_id": "retail-demo", "source_id": "customers"}'
```

### 7. Test with Multiple Knowledge Bases
```bash
# Test Confluence knowledge base
cd langgraph/graph_rag_agent
npm install && npm run build
npm run dev "What documents are available about knowledge graphs?" "confluence-demo"

# Test Retail knowledge base
npm run dev "What products are available in the Electronics category?" "retail-demo"
npm run dev "Which customers are in the premium segment?" "retail-demo"
```

### 🎉 Expected Output
You should see successful ingestion from multiple sources:
```bash
# Confluence ingestion
🔍 Processing 2 documents from confluence
✅ Extracted 3 nodes and 3 relationships per document

# Retail ingestion  
🔍 Processing 5 documents from products
🔍 Processing 3 documents from customers
✅ Extracted Product and Customer nodes with relationships
```

Then test the GraphRAG agent:
```bash
🤖 Graph RAG Agent
📊 Knowledge Base: confluence-demo
❓ Question: What documents are available about knowledge graphs?
...
📝 Final Answer:
Two documents are available about knowledge graphs...
**Confidence:** High - Both semantic search and graph query tools 
independently identified the same documents
```

### 🛠️ Troubleshooting

**Common Issues:**

1. **"Connection refused" errors:**
   ```bash
   # Check if all services are running
   ps aux | grep -E "(node|ollama|neo4j)"
   
   # Check port usage
   lsof -i :3000  # Orchestrator
   lsof -i :3001  # Confluence connector
   lsof -i :7687  # Neo4j
   lsof -i :11434 # Ollama
   ```

2. **Ollama model not found:**
   ```bash
   # Verify models are installed
   ollama list
   
   # Pull missing models
   ollama pull mxbai-embed-large
   ollama pull qwen3:8b
   ```

3. **Neo4j connection issues:**
   - Ensure Neo4j Desktop is running
   - Check password is set to `password`
   - Verify database is started (green play button in Neo4j Desktop)

4. **Schema registration fails:**
   - Ensure orchestrator is running (`curl http://localhost:3000/health`)
   - Check JSON formatting in the curl command
   - View orchestrator logs for detailed errors

5. **Build failures:**
   ```bash
   # Clean install if npm install fails
   rm -rf node_modules package-lock.json
   npm install
   ```

For more help, see [TESTING.md](./TESTING.md) for comprehensive setup validation.

---

## 🎊 Achievements & Differentiators

- **🔒 Privacy-First**: Fully local pipeline with Ollama — no API calls  
- **🧠 Intelligent Reasoning**: Multi-step answers combining semantic + graph with citations  
- **🏗️ Production-Ready**: TypeScript, error handling, full test suite, Docker infra  
- **🔌 Extensible**: Pluggable schemas + connectors, clean MCP integration  
- **⚡ Fast**: Optimized queries, caching, responsive for real-time enterprise queries  

---

## 🏢 Why Enterprises Need This

### Problems Solved
1. **Data Silos** — unify document systems, databases, CRM, ticketing, messaging platforms, etc.  
   > *Example: "Show me all projects where customer complaints intersect with product design changes in the last 6 months."*  

2. **Structured + Unstructured Data** — Graph + embeddings captures both.  

3. **Provenance & Trust** — GraphRAG provides traceable, auditable answers.  

### Why This Solution Wins
- **Custom Ontologies** per domain via declarative schemas  
- **Multi-tenant** architecture (kb_id + provenance edges)  
- **Pluggable Embeddings** (local Ollama or cloud)  
- **Agent-Ready Foundation** for LangGraph, CrewAI, autonomous workflows  

### Real Use Cases
- **Healthcare**: Research papers + clinical trials + lab notes → treatment insights  
- **Financial Services**: Transaction data + regulatory docs → compliance risk detection  
- **Retail & E-commerce**: Orders + support tickets → high-return product insights  
- **Software Development**: Code repos + documentation + communications → decision traceability  
- **Manufacturing**: Process docs + quality reports → operational optimization  
- **Legal & Compliance**: Case law + contracts + policies → regulatory analysis  

---

### 💎 **What Makes This Special**
1. **Complete Privacy**: Your data never leaves your machine
2. **Local AI Models**: Uses Ollama for both embeddings and reasoning
3. **Hybrid Intelligence**: Combines vector search with graph relationships
4. **Real Citations**: Provides actual node IDs and properties as evidence
5. **Multi-step Reasoning**: Shows its work with detailed search steps
6. **Production Architecture**: TypeScript, comprehensive testing, Docker ready

### 🎯 **Proven Capabilities**
- ✅ **Complex Question Answering** with evidence and citations
- ✅ **Multi-source Data Integration** with full provenance tracking  
- ✅ **Real-time Semantic Search** using local embeddings
- ✅ **Graph Relationship Discovery** via Cypher queries
- ✅ **Intelligent Synthesis** combining multiple evidence sources
- ✅ **Privacy-preserving AI** with local model execution

---
## 📋 Usage Examples

### With LangGraph Agent
```bash
# After completing the Quick Start setup above
cd langgraph/graph_rag_agent

# Ask questions about the demo knowledge base
npm run dev "What documents are available about knowledge graphs?" "confluence-demo"
npm run dev "Who are the authors mentioned in the system?" "confluence-demo" 
npm run dev "Tell me about knowledge graph tutorials" "confluence-demo"
```

### Direct API Testing with Multiple Knowledge Bases
```bash
# Test Confluence semantic search
curl -X POST http://localhost:3000/api/semantic-search \
  -H "Content-Type: application/json" \
  -d '{
    "kb_id": "confluence-demo",
    "text": "knowledge graphs tutorial",
    "top_k": 3
  }'

# Test Retail semantic search
curl -X POST http://localhost:3000/api/semantic-search \
  -H "Content-Type: application/json" \
  -d '{
    "kb_id": "retail-demo", 
    "text": "electronics headphones",
    "top_k": 3
  }'

# Test Confluence graph queries
curl -X POST http://localhost:3000/api/search-graph \
  -H "Content-Type: application/json" \
  -d '{
    "kb_id": "confluence-demo",
    "cypher": "MATCH (d:Document)-[:AUTHORED_BY]->(p:Person) RETURN d.title, p.name LIMIT 5"
  }'

# Test Retail graph queries  
curl -X POST http://localhost:3000/api/search-graph \
  -H "Content-Type: application/json" \
  -d '{
    "kb_id": "retail-demo",
    "cypher": "MATCH (p:Product) WHERE p.category = \"Electronics\" RETURN p.name, p.price LIMIT 5"
  }'

# Check system status
curl http://localhost:3000/api/status
```

### Using the CLI Tools
```bash
# Validate multiple schema files
cd cli
npm run build
./dist/index.js validate ../examples/confluence.yaml
./dist/index.js validate ../examples/retail.yaml

# Check system status for multiple knowledge bases
./dist/index.js status confluence-demo
./dist/index.js status retail-demo
```

---

## 🛠️ Extending the System

### Adding a New Data Source
**The system now supports unlimited data sources without code changes!**

1. Create connector in `connectors/your-source/`  
2. Implement `pull()` endpoint that returns JSON data
3. Create YAML schema with `connector_url` in mappings:
   ```yaml
   mappings:
     sources:
       - source_id: "your-source"
         connector_url: "http://localhost:your-port/endpoint"
         document_type: "your-type"
         extract:
           node: YourNode
           assign:
             field: "$.json.path"
   ```
4. Register schema via `/api/register-schema`
5. Ingest data via `/api/ingest` with automatic connector resolution  

### AI Provider Options
**Choose between local privacy or cloud performance:**

**🔒 Ollama (Local/Private)**
- **Embeddings**: `mxbai-embed-large`, `nomic-embed-text`, `all-minilm`  
- **LLMs**: `qwen3:8b`, `llama3.1`, `qwen3:32b`, `gemma3:27b`, `mistral`
- Configure in YAML: `provider: "ollama:model-name"`

**☁️ OpenAI (Cloud/Fast)**
- **Embeddings**: `text-embedding-ada-002` (automatic)
- **LLMs**: Use Ollama for reasoning, OpenAI for embeddings
- Configure in YAML: `provider: "openai:text-embedding-ada-002"`
- Set: `OPENAI_API_KEY=your-key`

### Configuration Examples
```yaml
# Local Ollama setup
embedding:
  provider: "ollama:mxbai-embed-large"

# Or OpenAI for embeddings
embedding:
  provider: "openai:text-embedding-ada-002"
```

---

## 📚 Documentation

### Core Documentation
- **[Architecture Guide](./docs/ARCHITECTURE.md)** - Complete system architecture and design patterns
- **[API Documentation](./docs/API.md)** - MCP and REST API reference with examples  
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment for Docker, Kubernetes, and scaling
- **[CLI Tools Guide](./cli/README.md)** - Professional CLI tools for validation and monitoring

### Schema & Configuration
- **[DSL Reference](./docs/dsl.md)** - YAML schema language specification
- **[Connectors Guide](./docs/connectors.md)** - Data source connector development
- **[GraphRAG Guide](./docs/graphrag.md)** - Intelligent question answering capabilities

### Examples & Testing
- **[Testing Guide](./TESTING.md)** - Comprehensive testing procedures and validation
- **[Schema Examples](./examples/)** - Enterprise data source demonstration schemas
- **[Sample Questions](./langgraph/graph_rag_agent/sample_questions.md)** - Example queries and expected responses

### Project Management
- **[Changelog](./CHANGELOG.md)** - Detailed release history and feature updates
- **[TODO & Roadmap](./TODO.md)** - Current status and future development plans

---

## 🔧 Enterprise Features

### 🚀 Dynamic Schema Management
- **Unlimited Data Sources**: Register any number of schemas without code changes using YAML configuration
- **Runtime Schema Registration**: Add new knowledge bases via REST API with automatic connector resolution
- **Multi-Knowledge Base Support**: Isolated data domains with `kb_id` separation for multi-tenant deployments
- **Connector URL Mapping**: Dynamic connector resolution from schema configuration eliminates hardcoded limitations

### 🛠️ Production Operations
- **Professional CLI Tools**: `kgb validate` and `kgb status` commands with comprehensive error reporting
- **Schema Validation**: JSON Schema validation with cross-references, JSONPath syntax checking, and security warnings
- **Operational Monitoring**: Complete status tracking, run metrics, and system health APIs
- **Database Migrations**: Automated constraint and index management with versioned migrations
- **Enterprise Documentation**: Comprehensive deployment guides, API docs, and architecture documentation

### � Privacy & Intelligence
- **Privacy-First AI**: Complete local operation with Ollama (no external API dependencies)
- **Trustworthy RAG**: Full provenance tracking with source attribution and citations
- **Production Architecture**: Docker deployment, TypeScript codebase, comprehensive testing
- **Hybrid Intelligence**: Semantic vector search + structured graph queries
- **Extensible Design**: Pluggable connectors, embedding providers, and infinitely scalable schemas

---

## 🤝 Contributing

1. Fork the repo  
2. Create a feature branch  
3. Add tests (`npm test`)  
4. Submit a PR  

---

## 👤 Author

Created by **Ryan Dombrowski**  
[GitHub Profile](https://github.com/ryandmonk)

---

## 📄 License

MIT License – see LICENSE file  

## 🙋 Support

- [Documentation](./docs/)  
- [Sample Questions](./langgraph/graph_rag_agent/sample_questions.md)  
- Open an issue for bugs or feature requests