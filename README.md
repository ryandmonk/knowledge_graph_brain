<div align="center">
  <img src="./assets/logo.png" alt="Knowledge Graph Brain Logo" width="200"/>
  
# Knowledge Graph Brain
</div>

- **Unifies Data Silos**: Connects APIs, databases, document systems, and any data source into a single knowledge graph.  
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

**Option A: Local Privacy (Ollama)**
```bash
# Install any Ollama-compatible models
ollama pull mxbai-embed-large   # embeddings (or nomic-embed-text, etc.)
ollama pull qwen3:8b            # reasoning (or llama3.1, gemma3, etc.)
```

**Option B: Cloud Performance (OpenAI)**
```bash
export OPENAI_API_KEY="your-api-key-here"
# Uses OpenAI's text-embedding-ada-002 model
```

### 2. Start Neo4j
**Option A: Neo4j Desktop**  
- Create a new database with password `password`

**Option B: Docker**
```bash
cd infra
docker-compose up -d neo4j
```

### 3. Start All Services
```bash
./start-services.sh
```

### 4. Run LangGraph Agent
```bash
cd langgraph/graph_rag_agent
npm install && npm run build
npm run dev "What documents are available?" "retail-demo"
```

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

##  Usage Examples

### With LangGraph Agent
```bash
npm run dev "Who are the authors and what expertise do they have?" "retail-demo"
npm run dev "Find content about customer behavior patterns" "retail-demo" 
npm run dev "Show me connections between products and customer segments" "retail-demo"
```

### Direct API
```bash
# Semantic search
curl -X POST http://localhost:3000/api/semantic-search \
  -H "Content-Type: application/json" \
  -d '{"kb_id":"retail-demo","text":"customer purchase patterns","top_k":3}'

# Graph query
curl -X POST http://localhost:3000/api/search-graph \
  -H "Content-Type: application/json" \
  -d '{"kb_id":"retail-demo","cypher":"MATCH (c:Customer)-[r:PURCHASED]->(p:Product) RETURN c.segment,p.category,COUNT(r) as purchases LIMIT 5"}'
```

---

## 🛠️ Extending the System

### Adding a New Data Source
1. Create connector in `connectors/your-source/`  
2. Implement `pull()` endpoint  
3. Add YAML schema in `examples/`  
4. Register with orchestrator  

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

### ✅ Production Ready (v1.1.0)
- **Professional CLI Tools**: `kgb validate` and `kgb status` commands with comprehensive error reporting
- **Schema Validation**: JSON Schema validation with cross-references, JSONPath syntax checking, and security warnings
- **Operational Monitoring**: Complete status tracking, run metrics, and system health APIs
- **Database Migrations**: Automated constraint and index management with versioned migrations
- **Enterprise Documentation**: Comprehensive deployment guides, API docs, and architecture documentation

### 🚀 Core System (v1.0.0)
- **Privacy-First AI**: Complete local operation with Ollama (no external API dependencies)
- **Trustworthy RAG**: Full provenance tracking with source attribution and citations
- **Production Architecture**: Docker deployment, TypeScript codebase, comprehensive testing
- **Hybrid Intelligence**: Semantic vector search + structured graph queries
- **Extensible Design**: Pluggable connectors, embedding providers, and schemas

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