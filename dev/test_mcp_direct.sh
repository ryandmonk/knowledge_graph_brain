#!/bin/bash

echo "🧠 KNOWLEDGE GRAPH BRAIN - MCP Protocol Test"
echo "============================================="
echo ""

# Test 1: Register schema via MCP
echo "1️⃣ Registering Schema via MCP Protocol..."

cat > test_schema.yaml << 'EOF'
kb_id: demo-brain
embedding:
  provider: ollama:mxbai-embed-large
  chunking:
    strategy: sentence
    chunk_size: 512
    overlap: 50
schema:
  nodes:
    - label: Document
      key: id
      props: [title, content, created_date]
    - label: Person  
      key: email
      props: [name, email, role]
    - label: Topic
      key: name
      props: [name, description]
  relationships:
    - type: AUTHORED_BY
      from: Document
      to: Person
    - type: MENTIONS
      from: Document
      to: Topic
    - type: EXPERT_IN
      from: Person
      to: Topic
mappings:
  sources:
    - source_id: confluence-main
      document_type: page
      extract:
        node: Document
        assign:
          id: $.id
          title: $.title
          content: $.content
          created_date: $.created_date
      edges:
        - type: AUTHORED_BY
          from:
            node: Document
            key: $.id
          to:
            node: Person
            key: $.author.email
            props:
              name: $.author.name
              email: $.author.email
              role: $.author.role
EOF

# Convert YAML to JSON for MCP call
schema_content=$(cat test_schema.yaml)

# Call MCP register_schema
echo "📝 Calling MCP register_schema..."
mcp_response=$(curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "register_schema",
      "arguments": {
        "kb_id": "demo-brain",
        "schema_yaml": "'"$(echo "$schema_content" | sed 's/"/\\"/g' | tr '\n' '\\' | sed 's/\\/\\n/g')"'"
      }
    }
  }')

echo "✅ MCP Response: $mcp_response"

# Test 2: Add source via MCP
echo ""
echo "2️⃣ Adding Data Source via MCP..."
add_source_response=$(curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "add_source",
      "arguments": {
        "kb_id": "demo-brain",
        "source_id": "confluence-main",
        "connector_url": "http://localhost:3001",
        "auth_ref": "default",
        "mapping_name": "confluence-main"
      }
    }
  }')

echo "✅ Add Source Response: $add_source_response"

# Test 3: Ingest data via MCP
echo ""
echo "3️⃣ Ingesting Data via MCP..."
ingest_response=$(curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "ingest",
      "arguments": {
        "kb_id": "demo-brain",
        "source_id": "confluence-main",
        "run_id": "test-run-'$(date +%s)'"
      }
    }
  }')

echo "📥 Ingest Response: $ingest_response"

# Wait for processing
echo ""
echo "⏳ Waiting for data processing..."
sleep 5

# Check Neo4j for new data
echo ""
echo "4️⃣ Checking graphbrain Database..."
node_count=$(curl -s -u neo4j:password http://127.0.0.1:7474/db/graphbrain/tx/commit \
  -H "Content-Type: application/json" \
  -d '{"statements":[{"statement":"MATCH (n) RETURN count(n) as node_count"}]}' | \
  jq -r '.results[0].data[0].row[0]')

echo "📊 Total nodes in graphbrain: $node_count"

if [ "$node_count" -gt 0 ]; then
    echo ""
    echo "🎯 SUCCESS! Data is now in your graphbrain database!"
    echo ""
    
    # Show node types
    echo "📋 Node types:"
    curl -s -u neo4j:password http://127.0.0.1:7474/db/graphbrain/tx/commit \
      -H "Content-Type: application/json" \
      -d '{"statements":[{"statement":"MATCH (n) RETURN labels(n)[0] as label, count(n) as count ORDER BY count DESC"}]}' | \
      jq -r '.results[0].data[] | "  - \(.row[0]): \(.row[1]) nodes"'
    
    # Show sample relationships
    echo ""
    echo "🔗 Sample relationships:"
    curl -s -u neo4j:password http://127.0.0.1:7474/db/graphbrain/tx/commit \
      -H "Content-Type: application/json" \
      -d '{"statements":[{"statement":"MATCH (a)-[r]->(b) RETURN type(r), labels(a)[0], labels(b)[0], count(*) as count ORDER BY count DESC LIMIT 5"}]}' | \
      jq -r '.results[0].data[] | "  - \(.row[0]): \(.row[1]) → \(.row[2]) (\(.row[3]) relationships)"'
    
    echo ""
    echo "🧠 Your Knowledge Graph Brain is ALIVE!"
    echo "======================================"
    echo ""
    echo "Now you can:"
    echo "1. View in Neo4j Desktop: MATCH (n)-[r]->(m) RETURN n,r,m LIMIT 25"
    echo "2. Run graph schema: CALL db.schema.visualization()"
    echo "3. Test the AI agent:"
    echo "   cd langgraph/graph_rag_agent"
    echo '   npm run dev "What documents do we have?" "demo-brain"'
    
else
    echo ""
    echo "⚠️  No data was ingested. Let's debug..."
    echo "Check confluence connector:"
    curl -s http://localhost:3001/health
fi

# Cleanup
rm -f test_schema.yaml

echo ""
echo "🏁 Test Complete!"
