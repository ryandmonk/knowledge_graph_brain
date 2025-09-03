<div align="center">
  <img src="./assets/logo.png" alt="Knowledge Graph Brain Logo" width="200"/>

# Knowledge Graph Brain
</div>

---

## 🧠 Overview

**Unify silos into a knowledge graph brain that powers trustworthy RAG and agent workflows — with per-domain schemas, provenance, and pluggable embeddings.**

An MCP-based orchestrator that ingests data from multiple sources, maps them through declarative YAML schemas, stores them in Neo4j with vector embeddings, and enables GraphRAG via a LangGraph agent. 

---

## ✨ Key Features

- **Unify Data Silos**: Connect APIs, databases, document systems, and any source into a single knowledge graph with provenance and citations.  
- **Dynamic Schema Management**: Register unlimited data sources without code changes using YAML-based schemas with connector URLs.  
- **Hybrid Intelligence**: Combine semantic vector search and structured graph queries for richer answers.  
- **Privacy-First AI**: Choose fully local (Ollama) or cloud (OpenAI) embeddings; your data stays under your control.  
- **Enterprise Operations**: Professional health monitoring, alert generation, multi-provider embedding testing, and comprehensive citations.
- **Production-Ready**: Dockerized, TypeScript-based, with identity resolution, security patterns, and operational intelligence.  
- **Extensible**: Pluggable schemas, embeddings, and connectors for any domain or workload.  

---

## 🔌 Universal MCP Integration **NEW**

**Transform any MCP-compatible client into a powerful knowledge graph interface.**

The Universal MCP Server exposes all Knowledge Graph Brain capabilities as standard MCP tools, enabling seamless integration with popular AI interfaces:

### 🌐 OpenAPI/REST Integration **LATEST** ⭐

**Convert MCP tools to standard REST API for universal compatibility:**

```bash
# Start OpenAPI proxy (requires Python 3.11+)
cd mcp-server && npm run build
../.venv/bin/mcpo --port 8080 -- node ./dist/index.js

# All 16 tools now available as REST endpoints
curl -X POST "http://localhost:8080/ask_knowledge_graph" \
     -H "Content-Type: application/json" \
     -d '{"question": "What data do we have?"}'

# Interactive API documentation at:
open http://localhost:8080/docs
```

**Benefits:**
- ✅ **Open WebUI Integration**: Zero-configuration setup with auto-discovery
- ✅ **Universal Compatibility**: Works with any OpenAPI-compatible application  
- ✅ **Interactive Docs**: Swagger UI for testing and exploration
- ✅ **Production Ready**: Built-in authentication, CORS, and monitoring

**[👉 Complete OpenAPI Integration Guide](./docs/openapi-integration.md)**

### 🔗 Ready for Your Favorite AI Tools
- **[Open WebUI](https://openwebui.com)**: Chat interface with knowledge graph superpowers
- **[Claude Desktop](https://claude.ai/download)**: Claude with access to your private knowledge  
- **VS Code with MCP**: Configure our MCP server with MCP-compatible extensions

### 🛠️ 16 Powerful Tools in 3 Categories

**🔍 Knowledge Query Tools**
- `ask_knowledge_graph` - Natural language Q&A with GraphRAG
- `search_semantic` - Vector similarity search with filtering
- `search_graph` - Structured Cypher queries  
- `explore_relationships` - Entity connection exploration

**⚙️ Knowledge Management Tools**
- `switch_knowledge_base` - Context switching between KBs
- `list_knowledge_bases` - Browse all available knowledge bases
- `add_data_source` - Connect GitHub, Slack, Confluence sources
- `start_ingestion` - Trigger data sync and processing
- `get_kb_status` - Monitor health and progress
- `update_schema` - Configure graph structure

**🔎 Discovery Tools**
- `get_overview` - Comprehensive KB insights and recommendations
- `explore_schema` - Analyze graph structure and entity types
- `find_patterns` - Discover centrality, clusters, and anomalies
- `get_session_info` - View context and query history

### ⚡ Quick Start with MCP
```bash
# 1. Build the MCP server
cd mcp-server && npm install && npm run build

# 2. Generate client configurations  
npm run config  # Creates configs for Open WebUI, Claude Desktop, MCP extensions

# 3. Add to your favorite MCP client
# Example: Open WebUI configuration generated in openWebUI-config.json
```

### 💬 Natural Conversations About Your Data
```
You: "What are the main architecture patterns in our codebase?"
AI: Using ask_knowledge_graph tool...
📊 Found 15 architectural documents with high confidence
🏗️ Key patterns: Microservices (8 mentions), Event-driven (12 mentions)
📋 Sources: architecture.md, design-decisions.md, api-guide.md
```

**[👉 See Complete MCP Integration Guide](./mcp-server/README.md)**

---

## 🎨 Web Setup Wizard **NEW** 

**Visual setup replacing complex command-line configuration.**

A modern React-based interface for system configuration and monitoring, eliminating the need for manual environment setup.

### 🚀 Quick Start with Web UI
```bash
# 1. Start the orchestrator with demo mode
cd orchestrator && DEMO_MODE=true npm run dev

# 2. Open the setup wizard
open http://localhost:3000/ui
```

### ✨ Features
- **🔍 Real-time Health Monitoring**: Visual status of Neo4j, Ollama, and all connectors
- **⚙️ Visual Configuration**: Point-and-click credential management for GitHub, Slack, Confluence
- **🎭 Demo Mode**: Zero-configuration experience with realistic mock data for immediate testing
- **📊 4-Step Setup**: Transform the complex README process into guided visual workflow

### 🚧 Current Status
The web UI provides essential setup and monitoring capabilities. Additional features (data exploration, advanced configuration) will be added in upcoming releases.

**[👉 Try the Demo Mode Setup](http://localhost:3000/ui)** (requires orchestrator running)

---

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Data Sources  │────│   Orchestrator   │────│    Neo4j DB     │
│ • Document Sys  │    │ • Schema Parser  │    │ • Graph Data    │
│ • Enterprise DB │    │ • MCP Server     │    │ • Embeddings    │
│ • APIs & Files  │    │ • Ingest Engine  │    │ • Provenance    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                       ┌──────────────────┐    ┌─────────────────┐
                       │  LangGraph Agent │    │ Universal MCP   │
                       │ • Semantic Search│    │ Server (NEW!)   │
                       │ • Graph Queries  │    │ • 16 MCP Tools  │
                       │ • Smart Synthesis│    │ • Session Mgmt  │
                       │ • Ollama LLM     │    │ • External APIs │
                       └──────────────────┘    └─────────────────┘
                                │                        │
                       ┌──────────────────┐    ┌─────────────────┐
                       │   Ollama Service │    │ External Clients│
                       │ • Local LLM      │    │ • Open WebUI    │
                       │ • Embeddings     │    │ • Claude Desktop│
                       │ • No External API│    │ • VS Code Ext   │
                       └──────────────────┘    └─────────────────┘
```

---

## � Data Connectors

**Production-ready connectors for enterprise data sources:**

| Connector | Status | Auth | Objects | Use Cases |
|-----------|--------|------|---------|-----------|
| **Confluence** | 🟢 GA | API Token | Pages, Spaces, Comments | Documentation, Knowledge Base |
| **GitHub** | � GA | PAT/OAuth | Repos, Issues, PRs | Code, Development Workflow |
| **Slack** | 🟡 Beta | Bot Token | Messages, Channels | Team Communication |
| **Retail-Mock** | 🔵 Demo | None | Products, Orders | E-commerce, Demo Data |

**[📋 Complete Connectors Matrix](./connectors/README.md)** - Detailed comparison, auth setup, and integration guides

---

## �🚀 Demo Walkthrough

### Choose Your Setup Method

**🎨 Option A: Web UI Setup (Easiest)** ⭐ **NEW**
```bash
cd orchestrator && DEMO_MODE=true npm run dev
# Then visit: http://localhost:3000/ui for guided setup
```

**⌨️ Option B: Command Line Setup (Advanced)**
Follow the detailed steps below for full manual configuration.

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
- Create a new database with password `password` (or use default database)
- Start the database
- **Optional**: Customize database name via `.env` file (see `orchestrator/.env.example`)

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

# Terminal 3 - Retail Connector (for full demo)
cd connectors/retail-mock
npm install && npm start
```

### 4. Verify All Services Are Running
```bash
# Check service health
curl http://localhost:3000/health    # Orchestrator basic health
curl http://localhost:3000/api/health # Enhanced health monitoring with scoring
curl http://localhost:3001/health    # Confluence connector
curl http://localhost:8081/health    # Retail connector (for full demo)
curl http://localhost:11434/api/tags # Ollama models
```

**🎯 Enhanced Health Monitoring (v0.10.0+)**  
The `/api/health` endpoint provides comprehensive system intelligence:
- **Health Scoring**: 0-100 system performance score
- **Alert Generation**: Automated issue detection and reporting  
- **Operational Metrics**: Memory usage, uptime, active runs tracking
- **Knowledge Base Health**: Per-KB status with data freshness analysis

### 5. Register Schemas - Choose Your Method

#### 🚀 **Option A: Streamlined YAML Registration** ⭐ **Recommended**

New simplified workflow based on user feedback and testing:

```bash
# Simple YAML registration (no JSON escaping needed)
curl -X POST http://localhost:3000/api/register-schema-yaml \
  -H "Content-Type: application/json" \
  -d '{
    "kb_id": "github-demo",
    "yaml_content": "'$(cat examples/github.yaml)'"
  }'

# Ingest with automatic embedding generation
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "kb_id": "github-demo", 
    "source_id": "github-repos"
  }'
```

**✅ Benefits:**
- No complex JSON escaping required
- Automatic embedding generation during ingestion
- Better error messages and validation feedback
- Ready for semantic search immediately

📖 **[Complete GitHub Integration Guide →](docs/workflows/github-integration-guide.md)**

#### **Option B: Advanced JSON Schema Registration**

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

Having issues? Most common problems have quick solutions:

- **Connection refused**: Check all services are running with health endpoints
- **Ollama models missing**: Run `ollama pull mxbai-embed-large` and `ollama pull qwen3:8b`  
- **Neo4j issues**: Ensure Neo4j Desktop is started or Docker container is running
- **Schema registration**: Validate JSON formatting and connector connectivity

For detailed solutions, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) with comprehensive debugging steps.

For quick help, see [TESTING.md](./TESTING.md) for setup validation.

---

## 🏢 Enterprise Value

### Problems Solved
1. **Data Silos** — unify across document systems, databases, CRMs, ticketing, messaging, etc.  
2. **Structured + Unstructured** — capture both with graphs and embeddings.  
3. **Provenance & Trust** — auditable, citation-backed answers.  

### Differentiators
- **Custom Ontologies**: Declarative per-domain schemas.  
- **Multi-Tenant**: Isolated knowledge bases via `kb_id`.  
- **Privacy-First AI**: Full local operation or cloud flexibility.  
- **GraphRAG Intelligence**: Multi-step reasoning, real citations, explainable results.  
- **Modern Architecture**: TypeScript, Docker, CLI tools, health monitoring, basic migrations.  

### Use Cases
- **Healthcare**: Research papers + clinical data → potential treatment insights.  
- **Finance**: Transactions + regulatory docs → potential compliance detection.  
- **Retail**: Orders + support tickets → potential product return analysis.  
- **Software**: Code + docs + chats → potential decision traceability.  
- **Manufacturing**: Processes + reports → potential operational optimization.  
- **Legal**: Case law + contracts → potential regulatory analysis.  

---

## 📋 Usage Examples

### LangGraph Agent
```bash
npm run dev "What documents are available about knowledge graphs?" "confluence-demo"
```

### Direct API
```bash
curl -X POST http://localhost:3000/api/semantic-search \
  -d '{"kb_id": "retail-demo", "text": "electronics headphones", "top_k": 3}'
```

### CLI Tools
```bash
cd cli
./dist/index.js validate ../examples/confluence.yaml
./dist/index.js status retail-demo
```

---

## 🛠️ Extending the System

1. Create connector in `connectors/your-source/`  
2. Write a schema with `connector_url` mappings  
3. Register via `/api/register-schema`  
4. Ingest via `/api/ingest`  

Supports **local Ollama** (`mxbai-embed-large`, `qwen3:8b`, etc.) or **cloud OpenAI** (`text-embedding-ada-002`).

---

## 📚 Documentation

**Core System:**
- [Architecture Guide](./docs/ARCHITECTURE.md)  
- [API Documentation](./docs/API.md) - **Enhanced with v0.10.0 features**
- [Deployment Guide](./docs/DEPLOYMENT.md)  
- [DSL Reference](./docs/dsl.md)  
- [Connectors Guide](./docs/connectors.md)  
- [GraphRAG Guide](./docs/graphrag.md)  

**Enterprise Features:** ⭐ **New in v0.10.0**
- [Identity Resolution Patterns](./docs/identity-resolution.md) - Entity deduplication strategies
- [Security Patterns](./docs/security-patterns.md) - Enterprise credential management

**Operations & Testing:**
- [CLI Tools Guide](./docs/cli.md)
- [Testing Guide](./TESTING.md)  
- [Troubleshooting Guide](./TROUBLESHOOTING.md)  
- [Sample Questions](./langgraph/graph_rag_agent/sample_questions.md)  
- [Roadmap](./TODO.md)

---

## 🤝 Contributing

1. Fork the repo  
2. Create a feature branch  
3. Add tests (`npm test`)  
4. Submit a PR  

---

## 👤 Author

Created by **Ryan Dombrowski**  
[Portfolio](https://www.ryandombrowski.net) • [GitHub](https://github.com/ryandmonk)

---

## 📄 License

Apache License 2.0 – see LICENSE file  

## 🙋 Support

- [Documentation](./docs/)  
- [Sample Questions](./langgraph/graph_rag_agent/sample_questions.md)  
- Open an issue for bugs or feature requests