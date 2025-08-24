#!/bin/bash

# End-to-End Test Script for Knowledge Graph Brain
# This script tests the complete workflow from schema registration to agent queries

set -e

echo "🧪 Knowledge Graph Brain - End-to-End Test"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
KB_ID="confluence-demo"
SOURCE_ID="confluence"
MCP_URL="http://localhost:3000"
CONNECTOR_URL="http://localhost:3001"

echo -e "${BLUE}📋 Configuration:${NC}"
echo "  KB ID: $KB_ID"
echo "  Source ID: $SOURCE_ID"
echo "  MCP URL: $MCP_URL"
echo "  Connector URL: $CONNECTOR_URL"
echo ""

# Helper function to make MCP calls
call_mcp() {
    local capability=$1
    local args=$2
    
    echo -e "${YELLOW}🔧 Calling MCP capability: $capability${NC}"
    
    response=$(curl -s -X POST "$MCP_URL/mcp" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json, text/event-stream" \
        -d "{
            \"jsonrpc\": \"2.0\",
            \"method\": \"tools/call\",
            \"params\": {
                \"name\": \"$capability\",
                \"arguments\": $args
            },
            \"id\": 1
        }")
    
    echo "Response: $response"
    echo ""
    
    # Check if response contains error
    if echo "$response" | grep -q '"error"'; then
        echo -e "${RED}❌ Error in $capability${NC}"
        return 1
    else
        echo -e "${GREEN}✅ $capability succeeded${NC}"
        return 0
    fi
}

# Test functions
test_neo4j_connection() {
    echo -e "${BLUE}🔌 Testing Neo4j connection...${NC}"
    
    # Simple connection test using cypher-shell if available, or curl to HTTP endpoint
    if command -v cypher-shell &> /dev/null; then
        echo "RETURN 'Connection successful' as status" | cypher-shell -u neo4j -p password --format plain
    else
        # Test via HTTP API
        curl -s -u neo4j:password http://localhost:7474/db/data/ > /dev/null
        echo "Neo4j HTTP API accessible"
    fi
    
    echo -e "${GREEN}✅ Neo4j connection verified${NC}"
    echo ""
}

test_services_running() {
    echo -e "${BLUE}🚀 Checking if services are running...${NC}"
    
    # Check MCP Orchestrator
    if curl -s "$MCP_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ MCP Orchestrator running${NC}"
    else
        echo -e "${RED}❌ MCP Orchestrator not running at $MCP_URL${NC}"
        echo "Please start with: cd orchestrator && npm start"
        exit 1
    fi
    
    # Check Confluence Connector
    if curl -s "$CONNECTOR_URL/pull" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Confluence Connector running${NC}"
    else
        echo -e "${RED}❌ Confluence Connector not running at $CONNECTOR_URL${NC}"
        echo "Please start with: cd connectors/confluence && npm start"
        exit 1
    fi
    
    # Check Ollama
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Ollama running${NC}"
    else
        echo -e "${RED}❌ Ollama not running${NC}"
        echo "Please start Ollama"
        exit 1
    fi
    
    echo ""
}

test_register_schema() {
    echo -e "${BLUE}📝 Step 1: Registering Confluence schema...${NC}"
    
    # Read the schema file
    schema_yaml=$(cat examples/confluence.yaml)
    
    # Escape the YAML for JSON
    schema_json=$(echo "$schema_yaml" | jq -Rs .)
    
    # Call register_schema
    call_mcp "register_schema" "{\"kb_id\": \"$KB_ID\", \"schema_yaml\": $schema_json}"
}

test_add_source() {
    echo -e "${BLUE}🔗 Step 2: Adding Confluence source...${NC}"
    
    call_mcp "add_source" "{
        \"kb_id\": \"$KB_ID\",
        \"source_id\": \"$SOURCE_ID\",
        \"connector_url\": \"$CONNECTOR_URL\",
        \"auth_ref\": \"confluence-token\",
        \"mapping_name\": \"confluence_pages\"
    }"
}

test_ingest_data() {
    echo -e "${BLUE}📥 Step 3: Ingesting data...${NC}"
    
    call_mcp "ingest" "{
        \"kb_id\": \"$KB_ID\",
        \"source_id\": \"$SOURCE_ID\"
    }"
}

test_semantic_search() {
    echo -e "${BLUE}🔍 Step 4: Testing semantic search...${NC}"
    
    call_mcp "semantic_search" "{
        \"kb_id\": \"$KB_ID\",
        \"text\": \"knowledge graphs tutorial\",
        \"top_k\": 3
    }"
}

test_graph_search() {
    echo -e "${BLUE}🕸️ Step 5: Testing graph search...${NC}"
    
    call_mcp "search_graph" "{
        \"kb_id\": \"$KB_ID\",
        \"cypher\": \"MATCH (d:Document)-[r:AUTHORED_BY]->(p:Person) RETURN d.title, p.name, p.email LIMIT 5\"
    }"
}

test_sync_status() {
    echo -e "${BLUE}📊 Step 6: Checking sync status...${NC}"
    
    call_mcp "sync_status" "{\"kb_id\": \"$KB_ID\"}"
}

test_langgraph_agent() {
    echo -e "${BLUE}🤖 Step 7: Testing LangGraph agent...${NC}"
    
    # Check if .env file exists
    if [[ ! -f "langgraph/graph_rag_agent/.env" ]]; then
        echo -e "${YELLOW}⚠️ Please add your OpenAI API key to langgraph/graph_rag_agent/.env${NC}"
        echo "OPENAI_API_KEY=your-key-here"
        return 1
    fi
    
    cd langgraph/graph_rag_agent
    
    # Test questions
    echo "Testing: 'What documents are available?'"
    npm run dev "What documents are available and who wrote them?" "$KB_ID" || true
    
    echo ""
    echo "Testing: 'Find content about knowledge graphs'"
    npm run dev "Find content about knowledge graphs and algorithms" "$KB_ID" || true
    
    cd ../..
}

# Main execution
main() {
    echo -e "${BLUE}Starting end-to-end test...${NC}"
    echo ""
    
    # Prerequisite checks
    test_neo4j_connection
    test_services_running
    
    # Core workflow tests
    test_register_schema
    test_add_source
    test_ingest_data
    test_semantic_search
    test_graph_search
    test_sync_status
    
    # Agent test
    test_langgraph_agent
    
    echo ""
    echo -e "${GREEN}🎉 End-to-end test completed!${NC}"
    echo ""
    echo -e "${BLUE}📋 Summary:${NC}"
    echo "  ✅ Schema registered and validated"
    echo "  ✅ Data source connected"
    echo "  ✅ Mock Confluence data ingested"
    echo "  ✅ Semantic search working"
    echo "  ✅ Graph queries working"
    echo "  ✅ LangGraph agent tested"
    echo ""
    echo -e "${YELLOW}🔍 Next steps:${NC}"
    echo "  - Check Neo4j browser: http://localhost:7474"
    echo "  - Run custom queries with the agent"
    echo "  - Add more test data as needed"
}

# Run the test
main "$@"
