# GitHub Integration - Streamlined Workflow

## 🚀 Quick Start (New Simplified Process)

Based on our learnings from implementing live GitHub integration, here's the streamlined workflow for users:

### Option A: Direct YAML Schema Registration (Easiest)

```bash
# 1. Register schema from YAML file in one step
curl -X POST http://localhost:3000/api/register-schema-yaml \
  -H "Content-Type: application/json" \
  -d '{
    "kb_id": "my-github-kb",
    "yaml_content": "'$(cat examples/github.yaml)'"
  }'

# 2. Ingest with automatic embedding generation
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "kb_id": "my-github-kb",
    "source_id": "github-repos"
  }'

# 3. Query immediately (embeddings now generated automatically)
curl -X POST http://localhost:3000/api/semantic-search \
  -H "Content-Type: application/json" \
  -d '{
    "kb_id": "my-github-kb",
    "text": "AI and machine learning projects",
    "top_k": 5
  }'
```

### Option B: Use Examples Directory

```bash
# Use pre-built schemas from examples/
curl -X POST http://localhost:3000/api/register-schema-yaml \
  -H "Content-Type: application/json" \
  -d '{
    "kb_id": "github-demo",
    "yaml_content": "'$(cat /Users/ryandombrowski/Desktop/knowledge_graph_brain/examples/github.yaml)'"
  }'
```

### Option C: Web UI (Coming Soon)

Visit `http://localhost:3000/ui` for point-and-click schema registration and GitHub integration.

## 🔧 What Changed

### ✅ Improvements Made
1. **Automatic Embedding Generation**: No more missing semantic search functionality
2. **YAML Direct Processing**: New `/api/register-schema-yaml` endpoint accepts raw YAML
3. **Better Error Messages**: More helpful validation feedback
4. **Enhanced Response Data**: Schema registration returns useful metadata

### 🔄 Behind the Scenes
- **Embedding Generation**: Added during ingestion process automatically
- **Vector Index Setup**: Happens during schema registration
- **Progress Feedback**: Better logging and status reporting
- **Error Handling**: Graceful degradation if embeddings fail

## 📋 Complete GitHub Repository Integration

### For Your Own Repository

```bash
# 1. Create custom schema for your repo
cat > my-repo-schema.yaml << 'EOF'
kb_id: my-repo-analysis

embedding:
  provider: "ollama:mxbai-embed-large"
  chunking:
    strategy: "paragraph"
    max_tokens: 1000

schema:
  nodes:
    - label: Repository
      key: id
      props: [id, name, description, content, url, language, stars, forks, created_at, updated_at, topics, license, default_branch, is_private, is_fork]
    
    - label: Person
      key: login
      props: [login, name, type, url]

  relationships:
    - type: OWNS
      from: Person
      to: Repository

mappings:
  sources:
    - source_id: github-main-repo
      connector_url: "http://localhost:3001/pull?owner=YOUR_USERNAME&repo=YOUR_REPO"
      document_type: repository
      extract:
        node: Repository
        assign:
          id: "$.id"
          name: "$.title"
          description: "$.description"
          content: "$.content"
          url: "$.url"
          language: "$.language"
          stars: "$.stars"
          forks: "$.forks"
          created_at: "$.created_at"
          updated_at: "$.updated_at"
          topics: "$.topics"
          license: "$.license"
          default_branch: "$.default_branch"
          is_private: "$.is_private"
          is_fork: "$.is_fork"
      edges:
        - type: OWNS
          from: { node: Person, key: "$.owner.login" }
          to: { node: Repository, key: "$.id" }
EOF

# 2. Register and ingest
curl -X POST http://localhost:3000/api/register-schema-yaml \
  -H "Content-Type: application/json" \
  -d '{
    "kb_id": "my-repo-analysis",
    "yaml_content": "'$(cat my-repo-schema.yaml)'"
  }'

curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "kb_id": "my-repo-analysis",
    "source_id": "github-main-repo"
  }'
```

## 🔍 Testing Your Integration

### Verify Schema Registration
```bash
curl -s http://localhost:3000/api/status | jq '.knowledge_bases'
```

### Test Graph Queries
```bash
# Find repositories by programming language
curl -X POST http://localhost:3000/api/search-graph \
  -H "Content-Type: application/json" \
  -d '{
    "kb_id": "my-github-kb",
    "cypher": "MATCH (r:Repository) WHERE r.language = \"TypeScript\" RETURN r.name, r.stars ORDER BY r.stars DESC"
  }'
```

### Test Semantic Search
```bash
# Find AI-related projects
curl -X POST http://localhost:3000/api/semantic-search \
  -H "Content-Type: application/json" \
  -d '{
    "kb_id": "my-github-kb",
    "text": "artificial intelligence machine learning",
    "top_k": 3
  }'
```

## 🚨 Troubleshooting

### Common Issues

**Schema Validation Errors**
- Ensure YAML is properly formatted
- Check that `kb_id` in YAML matches the request parameter
- Verify all required fields are present

**Missing Embeddings** 
- This is now handled automatically during ingestion
- Check logs for embedding generation status
- Ensure Ollama is running for local embeddings

**No Data Returned**
- Verify GitHub connector is accessible at http://localhost:3001
- Check that connector returns data: `curl "http://localhost:3001/pull?owner=ryandmonk&repo=knowledge_graph_brain"`
- Review ingestion logs for errors

### Health Checks

```bash
# System health
curl http://localhost:3000/health

# GitHub connector health  
curl http://localhost:3001/health

# Check knowledge bases
curl http://localhost:3000/api/status
```

## 🎯 Next Steps

1. **Try with Your Repository**: Replace `ryandmonk/knowledge_graph_brain` with your repo
2. **Add More Data Types**: Include issues, PRs, commits in your schema
3. **Experiment with Queries**: Build complex graph analytics
4. **Set Up Authentication**: For private repositories, add GitHub token to connector

## 💡 Pro Tips

- **Use Demo Mode**: Start with public repos to test the workflow
- **Monitor Logs**: Watch orchestrator logs during ingestion for progress
- **Start Simple**: Begin with just repository data, then add issues/PRs
- **Check Examples**: The `examples/` directory has working schemas for reference
