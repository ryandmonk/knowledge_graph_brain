<div align="center">
  <img src="./assets/logo.png" alt="Knowledge Graph Brain Logo" width="200"/>
  
# Knowledge Graph Brain
</div>

- **Unifies Data Silos**: Connects Confluence, APIs, databases, and more into a single knowledge graph.  
- **Trustworthy RAG**: Hybrid semantic + graph search with full provenance and citations for compliance.  
- **Privacy-First**: 100% local AI (Ollama) or cloud AI (OpenAI) — your choice for embeddings.  
- **Production-Ready**: Dockerized, TypeScript-based, extensible with pluggable schemas and connectors.  

---

## 🧠 Overview

**Unify silos into a knowledge graph brain that powers trustworthy RAG and agent workflows — with per-domain schemas, provenance, and pluggable embeddings.**

A **production-ready** MCP-based knowledge graph orchestrator that ingests data from multiple sources, maps them through declarative YAML schemas, stores in Neo4j with vector embeddings, and provides intelligent GraphRAG capabilities through a LangGraph agent.

---

## 🎯 What This System Does

- **📥 Multi-Source Ingestion**: Connects to Confluence, databases, APIs, or custom sources via pluggable connectors  
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
│ • Confluence    │    │ • Schema Parser  │    │ • Graph Data    │
│ • Retail APIs   │    │ • MCP Server     │    │ • Embeddings    │
│ • Custom APIs   │    │ • Ingest Engine  │    │ • Provenance    │
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
npm run dev "What documents are available?" "confluence-demo"
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
1. **Data Silos** — unify Confluence, Jira, Salesforce, ServiceNow, Slack, etc.  
   > *Example: "Show me all projects where customer complaints intersect with product design changes in the last 6 months."*  

2. **Structured + Unstructured Data** — Graph + embeddings captures both.  

3. **Provenance & Trust** — GraphRAG provides traceable, auditable answers.  

### Why This Solution Wins
- **Custom Ontologies** per domain via declarative schemas  
- **Multi-tenant** architecture (kb_id + provenance edges)  
- **Pluggable Embeddings** (local Ollama or cloud)  
- **Agent-Ready Foundation** for LangGraph, CrewAI, autonomous workflows  

### Real Use Cases
- **Pharma R&D**: Papers + trials + lab notes → toxicity insights  
- **Retail**: Orders + tickets → high-return SKUs flagged  
- **Banking**: Transactions + comms → compliance risk detection  
- **Software**: Jira + GitHub + Slack → decision traceability  

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
npm run dev "Who are the authors and what expertise do they have?" "confluence-demo"
npm run dev "Find content about knowledge graphs" "confluence-demo"
npm run dev "Show me connections between authors and topics" "confluence-demo"
```

### Direct API
```bash
# Semantic search
curl -X POST http://localhost:3000/api/semantic-search \
  -H "Content-Type: application/json" \
  -d '{"kb_id":"confluence-demo","text":"knowledge graphs tutorial","top_k":3}'

# Graph query
curl -X POST http://localhost:3000/api/search-graph \
  -H "Content-Type: application/json" \
  -d '{"kb_id":"confluence-demo","cypher":"MATCH (d:Document)-[r:AUTHORED_BY]->(p:Person) RETURN d.title,p.name LIMIT 5"}'
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