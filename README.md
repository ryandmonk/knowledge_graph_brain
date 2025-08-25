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

## 🏗️ Architecture

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

## 🚀 Demo Walkthrough

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

MIT License – see LICENSE file  

## 🙋 Support

- [Documentation](./docs/)  
- [Sample Questions](./langgraph/graph_rag_agent/sample_questions.md)  
- Open an issue for bugs or feature requests