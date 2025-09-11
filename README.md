<div align="center">
  <img src="./assets/logo.png" alt="Knowledge Graph Brain Logo" width="180"/>

# Knowledge Graph Brain
</div>

> **Enterprise-ready knowledge graph platform that unifies data silos into intelligent, trustworthy RAG workflows — with complete audit trails, security management, and visual connector building.**

---

## ✨ What It Does

- **Connect** multiple systems (Confluence, GitHub, Slack…) with declarative YAML schemas  
- **Ingest** into Neo4j with vector embeddings and provenance tracking  
- **Query** using hybrid GraphRAG (semantic + graph reasoning)  
- **Expose** everything as MCP tools or REST APIs for your favorite clients
- **Secure** with enterprise-grade RBAC, audit trails, and access control
- **Monitor** with real-time WebSocket dashboards and performance metrics
- **Build** custom connectors visually from OpenAPI specifications with AI assistance  

---

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone https://github.com/ryandmonk/knowledge_graph_brain.git
cd knowledge_graph_brain && npm install

# 2. Start services (Neo4j, orchestrator, connectors)
./start-services.sh

# 3. Register schema & ingest data
curl -X POST http://localhost:3000/api/register-schema-yaml -d '{"kb_id":"demo","yaml_content":"...'"}'
curl -X POST http://localhost:3000/api/ingest -d '{"kb_id":"demo"}'

# 4. Ask your first question
node cli query --kb_id=demo "What changed in ENG space this week?"
```

> 💡 See full [Setup Guide](./docs/DEPLOYMENT.md) for detailed instructions and prerequisites.

---

## 🖥 Web Setup Wizard

Prefer point-and-click? Launch the React-based setup UI:

```bash
cd orchestrator && DEMO_MODE=true npm run dev
open http://localhost:3000/ui
```

- **Real-time Health**: Neo4j, Ollama, connectors at a glance  
- **Visual Config**: Add connectors without editing files  
- **Demo Mode**: Explore with mock data instantly  

---

## 🔌 MCP + API Integration

Knowledge Graph Brain ships with a **Universal MCP Server** exposing 16 tools:

- 🔍 **Knowledge Query:** `ask_knowledge_graph`, `search_semantic`, `explore_relationships`  
- ⚙️ **Management:** `list_knowledge_bases`, `add_data_source`, `start_ingestion`  
- 🔎 **Discovery:** `explore_schema`, `find_patterns`, `get_overview`

Use with:
- [Open WebUI](https://openwebui.com)
- [Claude Desktop](https://claude.ai/download)
- [VS Code MCP Extensions](https://github.com/modelcontextprotocol)

Or convert to REST/OpenAPI:

```bash
cd mcp-server && npm run build
../.venv/bin/mcpo --port 8080 -- node ./dist/index.js
open http://localhost:8080/docs
```

📖 [Complete MCP & OpenAPI Guide](./docs/openapi-integration.md)

---

## 📚 Documentation

- [Architecture](./docs/ARCHITECTURE.md)  
- [Connectors Matrix](./connectors/README.md)  
- [GraphRAG Guide](./docs/graphrag.md)  
- [CLI Tools](./docs/cli.md)  
- [Troubleshooting](./TROUBLESHOOTING.md)  

---

## 🛠 Roadmap

- [ ] More connectors (Jira, Google Drive, Notion)  
- [ ] Live graph exploration in Web UI  
- [ ] Auto-suggested tools from schema analysis  
- [ ] Evaluation harness for quality metrics  

---

## 📄 License

Apache 2.0 — see [LICENSE](./LICENSE)

---

## 🙋 Support & Contributing

- Open an [issue](https://github.com/ryandmonk/knowledge_graph_brain/issues) for bugs or feature requests  
- See [CONTRIBUTING.md](./CONTRIBUTING.md) for dev setup  
- For quick testing, see [TESTING.md](./TESTING.md)