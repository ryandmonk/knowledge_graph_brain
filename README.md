<div align="center">
  <img src="./assets/logo.png" alt="Knowledge Graph Brain Logo" width="180"/>

# Knowledge Graph Brain
</div>

**An early-stage, composable knowledge graph system for building structured, traceable GraphRAG and agent workflows across multiple data sources.**

Knowledge Graph Brain is a system-level foundation for ingesting, structuring, and querying organizational knowledge using a hybrid of graphs and embeddings. It is designed for experimentation, extension, and clarity rather than turnkey deployment.

---

## What It Does

Knowledge Graph Brain provides building blocks for assembling trustworthy RAG and agent systems:

- **Connect** multiple systems (Confluence, GitHub, Slack, etc.) using declarative YAML schemas
- **Ingest** data into Neo4j with vector embeddings and explicit provenance tracking
- **Query** using hybrid GraphRAG techniques that combine semantic search with graph traversal
- **Expose** capabilities as MCP tools or REST/OpenAPI endpoints
- **Manage access and visibility** through configurable role and policy primitives (work in progress)
- **Observe system behavior** via logs and basic real-time UI indicators
- **Prototype connectors** visually from OpenAPI specifications with AI-assisted scaffolding

The project emphasizes transparency in how knowledge is represented, transformed, and retrieved.

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/ryandmonk/knowledge_graph_brain.git
cd knowledge_graph_brain && npm install

# 2. Start services (Neo4j, orchestrator, connectors)
./start-services.sh

# 3. Register schema & ingest data
curl -X POST http://localhost:3000/api/register-schema-yaml \
  -d '{"kb_id":"demo","yaml_content":"..."}'

curl -X POST http://localhost:3000/api/ingest \
  -d '{"kb_id":"demo"}'

# 4. Ask your first question
node cli query --kb_id=demo "What changed in ENG space this week?"
```

See the full [Setup Guide](./docs/DEPLOYMENT.md) for prerequisites, environment configuration, and troubleshooting.

---

## Web Setup Wizard

A lightweight React-based setup UI is included for exploration and local development:

```bash
cd orchestrator && DEMO_MODE=true npm run dev
open http://localhost:3000/ui
```

Features include:
- Service visibility for Neo4j, connectors, and ingestion status
- Visual configuration for schemas and connectors
- Demo mode using mock data

This UI is intended as a development and learning aid rather than a finished administration console.

---

## MCP and API Integration

Knowledge Graph Brain includes a Universal MCP Server that exposes system capabilities as tools:

- **Knowledge access**: `ask_knowledge_graph`, `search_semantic`, `explore_relationships`
- **Lifecycle management**: `list_knowledge_bases`, `add_data_source`, `start_ingestion`
- **Schema exploration**: `explore_schema`, `find_patterns`, `get_overview`

These tools can be used with MCP-compatible clients such as:
- Open WebUI
- Claude Desktop
- VS Code MCP extensions

The same surface can be exposed as REST/OpenAPI:

```bash
cd mcp-server && npm run build
../.venv/bin/mcpo --port 8080 -- node ./dist/index.js
open http://localhost:8080/docs
```

See the [MCP and OpenAPI Integration Guide](./docs/openapi-integration.md) for details.

---

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Connectors Matrix](./connectors/README.md)
- [GraphRAG Guide](./docs/graphrag.md)
- [CLI Tools](./docs/cli.md)
- [E2E Testing Guide](./tests/e2e/README.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

---

## Quality Assurance

The project includes an end-to-end testing harness using Playwright to validate core workflows during development:

```bash
# Quick validation
cd tests/e2e && ./run-tests.sh smoke

# Full test suite
cd tests/e2e && ./run-tests.sh all
```

Coverage focuses on:
- Core workflows (setup, ingestion, querying)
- API surface validation (REST and MCP tools)
- UI smoke coverage
- Basic performance and stability checks

This test suite supports refactoring and iteration rather than certifying production readiness.

---

## Roadmap

- [ ] Additional connectors (Jira, Google Drive, Notion)
- [ ] Interactive graph exploration in the Web UI
- [ ] Schema-driven tool suggestion
- [x] End-to-end testing harness
- [ ] Evaluation and quality scoring framework

---

## What This Project Is Not

- A turnkey enterprise search product
- A hosted SaaS offering
- A compliance-certified or security-audited system
- A drop-in replacement for a vector database

Knowledge Graph Brain is best suited for system builders, researchers, and teams exploring structured approaches to RAG and agent memory.

---

## License

Apache 2.0. See [LICENSE](./LICENSE).

---

## Support and Contributing

- Open an issue for bugs or feature requests
- See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup
- Testing documentation lives in [TESTING.md](./TESTING.md) and the E2E guide

