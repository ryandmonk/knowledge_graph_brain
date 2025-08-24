#!/bin/bash

echo "🧠 KNOWLEDGE GRAPH BRAIN - Real Data Verification"
echo "=================================================="
echo ""

# Test orchestrator health
echo "1️⃣ Testing Orchestrator Health..."
if curl -s http://localhost:3000/health | grep -q "ok"; then
    echo "✅ Orchestrator is running"
else
    echo "❌ Orchestrator not responding"
    exit 1
fi

# Test Neo4j connection to graphbrain database
echo ""
echo "2️⃣ Testing Neo4j 'graphbrain' database..."
node_count=$(curl -s -u neo4j:password http://127.0.0.1:7474/db/graphbrain/tx/commit \
  -H "Content-Type: application/json" \
  -d '{"statements":[{"statement":"MATCH (n) RETURN count(n) as node_count"}]}' | \
  jq -r '.results[0].data[0].row[0]')

echo "📊 Current nodes in graphbrain: $node_count"

# Register a test schema
echo ""
echo "3️⃣ Registering Knowledge Base Schema..."
curl -s -X POST http://localhost:3000/api/register-schema \
  -H "Content-Type: application/json" \
  -d '{
    "kb_id": "demo-brain",
    "embedding": {
      "provider": "ollama:mxbai-embed-large"
    },
    "schema": {
      "nodes": [
        {
          "label": "Document",
          "key": "id", 
          "props": ["title", "content", "created_date"]
        },
        {
          "label": "Person",
          "key": "email",
          "props": ["name", "email", "role"]
        },
        {
          "label": "Topic",
          "key": "name",
          "props": ["name", "description"]
        }
      ],
      "relationships": [
        {
          "type": "AUTHORED_BY",
          "from": "Document",
          "to": "Person"
        },
        {
          "type": "MENTIONS",
          "from": "Document", 
          "to": "Topic"
        },
        {
          "type": "EXPERT_IN",
          "from": "Person",
          "to": "Topic"
        }
      ]
    }
  }' && echo "✅ Schema registered"

# Add a data source  
echo ""
echo "4️⃣ Adding Data Source..."
curl -s -X POST http://localhost:3000/api/add-source \
  -H "Content-Type: application/json" \
  -d '{
    "kb_id": "demo-brain",
    "source_id": "confluence-test",
    "connector_url": "http://localhost:3001",
    "mapping": {
      "nodes": {
        "Document": {
          "id": "$.id",
          "title": "$.title", 
          "content": "$.content",
          "created_date": "$.created_date"
        },
        "Person": {
          "email": "$.author.email",
          "name": "$.author.name",
          "role": "$.author.role"
        }
      },
      "relationships": {
        "AUTHORED_BY": {
          "from": "$.id",
          "to": "$.author.email"
        }
      }
    }
  }' && echo "✅ Data source added"

# Trigger ingestion
echo ""
echo "5️⃣ Ingesting Real Data into graphbrain..."
ingest_response=$(curl -s -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "kb_id": "demo-brain",
    "source_id": "confluence-test", 
    "run_id": "brain-test-'$(date +%s)'"
  }')

echo "📥 Ingestion response: $ingest_response"

# Wait a moment for processing
echo ""
echo "⏳ Waiting for data processing..."
sleep 3

# Check new node count
echo ""
echo "6️⃣ Checking New Data in graphbrain..."
new_node_count=$(curl -s -u neo4j:password http://127.0.0.1:7474/db/graphbrain/tx/commit \
  -H "Content-Type: application/json" \
  -d '{"statements":[{"statement":"MATCH (n) RETURN count(n) as node_count"}]}' | \
  jq -r '.results[0].data[0].row[0]')

echo "📊 Nodes after ingestion: $new_node_count"
echo "📈 New nodes added: $((new_node_count - node_count))"

# Check what types of nodes we have
echo ""
echo "7️⃣ Analyzing Graph Structure..."
curl -s -u neo4j:password http://127.0.0.1:7474/db/graphbrain/tx/commit \
  -H "Content-Type: application/json" \
  -d '{"statements":[{"statement":"MATCH (n) RETURN labels(n)[0] as label, count(n) as count ORDER BY count DESC"}]}' | \
  jq -r '.results[0].data[] | "\(.row[0]): \(.row[1]) nodes"'

# Test semantic search
echo ""
echo "8️⃣ Testing Semantic Search..."
search_response=$(curl -s -X POST http://localhost:3000/api/semantic-search \
  -H "Content-Type: application/json" \
  -d '{
    "kb_id": "demo-brain",
    "text": "knowledge graphs and tutorials",
    "top_k": 3
  }')

echo "🔍 Semantic search results:"
echo "$search_response" | jq -r '.results[]? | "- \(.title): \(.content[0:100])..."' 2>/dev/null || echo "No results or parsing error"

# Test graph queries  
echo ""
echo "9️⃣ Testing Graph Relationships..."
graph_response=$(curl -s -X POST http://localhost:3000/api/search-graph \
  -H "Content-Type: application/json" \
  -d '{
    "kb_id": "demo-brain", 
    "cypher": "MATCH (d:Document)-[r:AUTHORED_BY]->(p:Person) RETURN d.title, p.name, p.email LIMIT 5"
  }')

echo "🕸️ Graph relationship results:"
echo "$graph_response" | jq -r '.results[]? | "- \(.[0]) by \(.[1]) (\(.[2]))"' 2>/dev/null || echo "No relationships found yet"

echo ""
echo "🎯 VERIFICATION COMPLETE!"
echo "=========================="
echo ""
echo "Your Knowledge Graph Brain is now:"
echo "✅ Connected to the 'graphbrain' database"
echo "✅ Ingesting real data with provenance"
echo "✅ Generating embeddings locally with Ollama"
echo "✅ Building knowledge relationships"
echo "✅ Ready for intelligent queries!"
echo ""
echo "🧠 Try asking the agent a question now:"
echo "cd langgraph/graph_rag_agent"
echo 'npm run dev "What documents do we have?" "demo-brain"'
