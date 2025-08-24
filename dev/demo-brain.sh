#!/bin/bash

echo "🧠 KNOWLEDGE GRAPH BRAIN - PROOF OF CONCEPT"
echo "============================================"
echo ""

# Test Neo4j connection
echo "1️⃣ Testing Neo4j graphbrain database connection..."
node_count=$(curl -s -u neo4j:password http://127.0.0.1:7474/db/graphbrain/tx/commit \
  -H "Content-Type: application/json" \
  -d '{"statements":[{"statement":"MATCH (n) RETURN count(n) as count"}]}' | \
  jq -r '.results[0].data[0].row[0]')

echo "📊 Current nodes in graphbrain: $node_count"

# Clear any existing test data
echo ""
echo "2️⃣ Cleaning up old test data..."
curl -s -u neo4j:password http://127.0.0.1:7474/db/graphbrain/tx/commit \
  -H "Content-Type: application/json" \
  -d '{"statements":[{"statement":"MATCH (n:TestDemo) DETACH DELETE n"}]}' > /dev/null

# Create sample knowledge graph
echo ""
echo "3️⃣ Creating sample knowledge graph..."
create_response=$(curl -s -u neo4j:password http://127.0.0.1:7474/db/graphbrain/tx/commit \
  -H "Content-Type: application/json" \
  -d '{
    "statements": [
      {
        "statement": "CREATE (d1:Document:TestDemo {id: \"doc-1\", title: \"Getting Started with Knowledge Graphs\", content: \"Knowledge graphs are powerful data structures that represent information as interconnected entities and relationships. They enable AI systems to understand context and make intelligent connections.\", kb_id: \"demo-brain\", source_id: \"confluence\", created_date: \"2025-01-01\", author_email: \"john@example.com\"})"
      },
      {
        "statement": "CREATE (d2:Document:TestDemo {id: \"doc-2\", title: \"Graph RAG Tutorial\", content: \"Retrieval-Augmented Generation with knowledge graphs combines the power of semantic search with structured data relationships. This enables more accurate and contextual AI responses.\", kb_id: \"demo-brain\", source_id: \"confluence\", created_date: \"2025-01-02\", author_email: \"jane@example.com\"})"
      },
      {
        "statement": "CREATE (p1:Person:TestDemo {email: \"john@example.com\", name: \"John Doe\", role: \"Senior Engineer\", kb_id: \"demo-brain\", expertise: \"Knowledge Graphs, AI Architecture\"})"
      },
      {
        "statement": "CREATE (p2:Person:TestDemo {email: \"jane@example.com\", name: \"Jane Smith\", role: \"AI Researcher\", kb_id: \"demo-brain\", expertise: \"Graph RAG, Machine Learning\"})"
      },
      {
        "statement": "CREATE (t1:Topic:TestDemo {name: \"Knowledge Graphs\", description: \"Graph-based data representation for AI\", kb_id: \"demo-brain\"})"
      },
      {
        "statement": "CREATE (t2:Topic:TestDemo {name: \"RAG\", description: \"Retrieval-Augmented Generation techniques\", kb_id: \"demo-brain\"})"
      }
    ]
  }')

# Create relationships
echo "🔗 Creating knowledge relationships..."
curl -s -u neo4j:password http://127.0.0.1:7474/db/graphbrain/tx/commit \
  -H "Content-Type: application/json" \
  -d '{
    "statements": [
      {
        "statement": "MATCH (d:Document:TestDemo {id: \"doc-1\"}), (p:Person:TestDemo {email: \"john@example.com\"}) CREATE (d)-[:AUTHORED_BY]->(p)"
      },
      {
        "statement": "MATCH (d:Document:TestDemo {id: \"doc-2\"}), (p:Person:TestDemo {email: \"jane@example.com\"}) CREATE (d)-[:AUTHORED_BY]->(p)"
      },
      {
        "statement": "MATCH (d:Document:TestDemo {id: \"doc-1\"}), (t:Topic:TestDemo {name: \"Knowledge Graphs\"}) CREATE (d)-[:MENTIONS]->(t)"
      },
      {
        "statement": "MATCH (d:Document:TestDemo {id: \"doc-2\"}), (t:Topic:TestDemo {name: \"RAG\"}) CREATE (d)-[:MENTIONS]->(t)"
      },
      {
        "statement": "MATCH (p:Person:TestDemo {email: \"john@example.com\"}), (t:Topic:TestDemo {name: \"Knowledge Graphs\"}) CREATE (p)-[:EXPERT_IN]->(t)"
      },
      {
        "statement": "MATCH (p:Person:TestDemo {email: \"jane@example.com\"}), (t:Topic:TestDemo {name: \"RAG\"}) CREATE (p)-[:EXPERT_IN]->(t)"
      }
    ]
  }' > /dev/null

# Verify the knowledge graph
echo ""
echo "4️⃣ Verifying knowledge graph creation..."
new_node_count=$(curl -s -u neo4j:password http://127.0.0.1:7474/db/graphbrain/tx/commit \
  -H "Content-Type: application/json" \
  -d '{"statements":[{"statement":"MATCH (n:TestDemo) RETURN count(n) as count"}]}' | \
  jq -r '.results[0].data[0].row[0]')

echo "📊 Created $new_node_count knowledge nodes"

if [ "$new_node_count" -gt 0 ]; then
    echo ""
    echo "🎉 SUCCESS! Your Knowledge Graph Brain is ALIVE!"
    echo ""
    
    # Show the knowledge structure
    echo "📋 Knowledge Base Structure:"
    curl -s -u neo4j:password http://127.0.0.1:7474/db/graphbrain/tx/commit \
      -H "Content-Type: application/json" \
      -d '{"statements":[{"statement":"MATCH (n:TestDemo) RETURN labels(n)[0] as type, count(n) as count ORDER BY count DESC"}]}' | \
      jq -r '.results[0].data[] | "  📁 \(.row[0]): \(.row[1]) entities"'
    
    echo ""
    echo "🔗 Knowledge Relationships:"
    curl -s -u neo4j:password http://127.0.0.1:7474/db/graphbrain/tx/commit \
      -H "Content-Type: application/json" \
      -d '{"statements":[{"statement":"MATCH (a:TestDemo)-[r]->(b:TestDemo) RETURN type(r) as relationship, count(r) as count ORDER BY count DESC"}]}' | \
      jq -r '.results[0].data[] | "  🔗 \(.row[0]): \(.row[1]) connections"'
    
    echo ""
    echo "📚 Sample Knowledge:"
    curl -s -u neo4j:password http://127.0.0.1:7474/db/graphbrain/tx/commit \
      -H "Content-Type: application/json" \
      -d '{"statements":[{"statement":"MATCH (d:Document:TestDemo)-[:AUTHORED_BY]->(p:Person:TestDemo) RETURN d.title, p.name, p.role"}]}' | \
      jq -r '.results[0].data[] | "  📄 \"\(.row[0])\" by \(.row[1]) (\(.row[2]))"'
    
    echo ""
    echo "🧠 WHY THIS IS A GAME-CHANGER:"
    echo "=============================="
    echo ""
    echo "🤖 Traditional AI Chatbot:"
    echo "   Question: 'What do we know about RAG?'"
    echo "   Answer: Searches documents for 'RAG' → Returns basic content"
    echo ""
    echo "🧠 Your Knowledge Graph Brain:"
    echo "   Question: 'What do we know about RAG?'"
    echo "   Intelligence Process:"
    echo "   1. 🔍 Finds 'Graph RAG Tutorial' document (semantic search)"
    echo "   2. 🕸️  Discovers Jane Smith authored it (relationship traversal)"
    echo "   3. 🧭 Finds Jane is an expert in RAG & ML (expert network)"
    echo "   4. 🔗 Discovers related docs by finding her other work"
    echo "   5. 🧠 Synthesizes: 'RAG combines retrieval with generation."
    echo "      Jane Smith, our RAG expert, wrote our definitive guide."
    echo "      She also has expertise in ML. Related: Knowledge Graphs"
    echo "      by John Doe, who collaborated on similar projects...'"
    echo ""
    echo "🎯 THE DIFFERENCE:"
    echo "   • 📊 CONTEXT: Understands WHO knows WHAT"
    echo "   • 🔍 DISCOVERY: Finds related concepts automatically"
    echo "   • 🏛️  PROVENANCE: Every fact has a source"
    echo "   • 🧠 REASONING: Connects dots across your organization"
    echo ""
    echo "🚀 PRODUCTION FEATURES:"
    echo "   ✅ Complete privacy (local Ollama models)"
    echo "   ✅ Real-time graph queries"
    echo "   ✅ Multi-source data integration"
    echo "   ✅ Expert knowledge tracking"
    echo "   ✅ Citation and evidence trails"
    echo ""
    echo "👀 VIEW IN NEO4J DESKTOP:"
    echo "   MATCH (n:TestDemo)-[r]->(m) RETURN n,r,m"
    echo "   CALL db.schema.visualization()"
    echo ""
    echo "🧪 TEST THE AI BRAIN:"
    echo "   cd langgraph/graph_rag_agent"
    echo "   npm run dev \"What experts do we have?\" \"demo-brain\""
    
else
    echo "❌ Knowledge graph creation failed. Check Neo4j connection."
fi

echo ""
echo "🏁 Knowledge Graph Brain Demonstration Complete!"
