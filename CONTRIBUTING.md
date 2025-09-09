# 🤝 Contributing to Knowledge Graph Brain

Thank you for your interest in contributing! 🎉 This project is connector‑first and MCP‑native, so contributions that improve connectors, ingestion, graph quality, or user experience are especially welcome.

---

## 🛠 Local Development Setup

1. **Fork and clone** the repo
```bash
git clone https://github.com/ryandmonk/knowledge_graph_brain.git
cd knowledge_graph_brain
```

2. **Install dependencies**
```bash
npm install
```

3. **Start services** (Neo4j, orchestrator, connectors)
```bash
./start-services.sh
```

4. **Run tests**
```bash
npm test
```

> 💡 See [TESTING.md](./TESTING.md) for manual validation steps.

---

## 🧩 Adding a New Connector

1. **Create a folder** under `connectors/<connector-name>/`  
2. **Implement pull endpoint** to return JSON documents  
3. **Document auth setup** in `connectors/<connector-name>/README.md`  
4. **Add schema example** under `examples/<connector-name>.yaml`  
5. **Register schema and ingest** to verify it works:
```bash
curl -X POST http://localhost:3000/api/register-schema-yaml -d '{"kb_id":"test","yaml_content":"...'"}'
curl -X POST http://localhost:3000/api/ingest -d '{"kb_id":"test"}'
```

---

## 🔍 Submitting a Pull Request

1. **Create a branch**
```bash
git checkout -b feature/my-new-feature
```

2. **Commit with clear messages**
```bash
git commit -m "Add <connector-name> connector with schema example"
```

3. **Push and open a PR**
```bash
git push origin feature/my-new-feature
```

> Please describe what you changed, why, and any testing you performed.

---

## ✅ Contribution Checklist

- [ ] My code follows project style and is linted (`npm run lint`)  
- [ ] Added/updated tests for my changes  
- [ ] Updated documentation if needed (README, connector guide, examples)  
- [ ] Verified local ingest + query works end‑to‑end  

---

## 🗺 Roadmap Contributions

Feature ideas, connectors, or UX improvements? Open a [GitHub issue](https://github.com/ryandmonk/knowledge_graph_brain/issues) and label it as **enhancement**.

---

## 📄 Code of Conduct

Be respectful, inclusive, and collaborative. This project follows the [Contributor Covenant](https://www.contributor-covenant.org/).
