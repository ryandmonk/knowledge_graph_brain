#!/bin/bash

# Simple REST API Test for Knowledge Graph Brain
# This tests the basic connectivity without MCP protocol complexity

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Knowledge Graph Brain - Simple REST Test${NC}"
echo "=============================================="

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

# Test service health
test_services_health() {
    echo -e "${BLUE}🚀 Testing service health...${NC}"
    
    # Test MCP Orchestrator
    echo -e "${YELLOW}Testing MCP Orchestrator...${NC}"
    response=$(curl -s http://localhost:3000/health)
    echo "Response: $response"
    if echo "$response" | grep -q '"status":"ok"'; then
        echo -e "${GREEN}✅ MCP Orchestrator healthy${NC}"
    else
        echo -e "${RED}❌ MCP Orchestrator not healthy${NC}"
        return 1
    fi
    
    # Test Confluence Connector
    echo -e "${YELLOW}Testing Confluence Connector...${NC}"
    response=$(curl -s http://localhost:3001/health)
    echo "Response: $response"
    if echo "$response" | grep -q '"status":"ok"'; then
        echo -e "${GREEN}✅ Confluence Connector healthy${NC}"
    else
        echo -e "${RED}❌ Confluence Connector not healthy${NC}"
        return 1
    fi
    
    # Test Confluence pull endpoint
    echo -e "${YELLOW}Testing Confluence pull endpoint...${NC}"
    response=$(curl -s http://localhost:3001/pull)
    echo "Response: $response"
    if echo "$response" | grep -q '"available_pages"'; then
        echo -e "${GREEN}✅ Confluence data available${NC}"
    else
        echo -e "${RED}❌ Confluence data not available${NC}"
        return 1
    fi
    
    echo ""
}

# Test REST API endpoints
test_rest_api() {
    echo -e "${BLUE}🔧 Testing REST API endpoints...${NC}"
    
    # Test schema registration endpoint
    echo -e "${YELLOW}Testing schema registration...${NC}"
    response=$(curl -s -X POST http://localhost:3000/api/register-schema \
        -H "Content-Type: application/json" \
        -d "{\"kb_id\": \"$KB_ID\", \"schema_yaml\": \"test\"}")
    echo "Response: $response"
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ Schema registration endpoint working${NC}"
    else
        echo -e "${RED}❌ Schema registration endpoint failed${NC}"
        return 1
    fi
    
    # Test ingest endpoint
    echo -e "${YELLOW}Testing ingest endpoint...${NC}"
    response=$(curl -s -X POST http://localhost:3000/api/ingest \
        -H "Content-Type: application/json" \
        -d "{\"kb_id\": \"$KB_ID\", \"source_id\": \"$SOURCE_ID\"}")
    echo "Response: $response"
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ Ingest endpoint working${NC}"
    else
        echo -e "${RED}❌ Ingest endpoint failed${NC}"
        return 1
    fi
    
    echo ""
}

# Test Neo4j connectivity
test_neo4j() {
    echo -e "${BLUE}🗄️ Testing Neo4j connectivity...${NC}"
    
    # Test basic connection
    if command -v cypher-shell &> /dev/null; then
        echo -e "${YELLOW}Testing with cypher-shell...${NC}"
        result=$(echo "RETURN 'Connection successful' as status" | cypher-shell -u neo4j -p password --format plain 2>/dev/null || echo "failed")
        if [[ "$result" != "failed" ]]; then
            echo "Result: $result"
            echo -e "${GREEN}✅ Neo4j cypher-shell working${NC}"
        else
            echo -e "${YELLOW}⚠️ cypher-shell not working, trying HTTP API${NC}"
            test_neo4j_http
        fi
    else
        echo -e "${YELLOW}cypher-shell not available, testing HTTP API...${NC}"
        test_neo4j_http
    fi
    
    echo ""
}

test_neo4j_http() {
    response=$(curl -s -u neo4j:password http://127.0.0.1:7474/ 2>/dev/null)
    if [[ $? -eq 0 ]] && echo "$response" | grep -q "neo4j_version"; then
        echo -e "${GREEN}✅ Neo4j HTTP API accessible${NC}"
        version=$(echo "$response" | grep -o '"neo4j_version":"[^"]*"' | cut -d'"' -f4)
        echo "  Neo4j Version: $version"
    else
        echo -e "${RED}❌ Neo4j not accessible${NC}"
        return 1
    fi
}

# Test Ollama
test_ollama() {
    echo -e "${BLUE}🧠 Testing Ollama...${NC}"
    
    echo -e "${YELLOW}Checking Ollama status...${NC}"
    response=$(curl -s http://localhost:11434/api/tags)
    if echo "$response" | grep -q "models"; then
        echo -e "${GREEN}✅ Ollama API accessible${NC}"
        
        # Check for embedding model
        if echo "$response" | grep -q "mxbai-embed-large"; then
            echo -e "${GREEN}✅ mxbai-embed-large model available${NC}"
        else
            echo -e "${YELLOW}⚠️ mxbai-embed-large model not found${NC}"
            echo "Available models:"
            echo "$response" | grep -o '"name":"[^"]*"' | sed 's/"name":"//g' | sed 's/"//g' | head -5
        fi
    else
        echo -e "${RED}❌ Ollama not accessible${NC}"
        return 1
    fi
    
    echo ""
}

# Main test execution
main() {
    echo -e "${BLUE}Starting basic connectivity tests...${NC}"
    echo ""
    
    # Run all tests
    test_services_health
    test_rest_api
    test_neo4j
    test_ollama
    
    echo -e "${GREEN}🎉 Basic connectivity test completed!${NC}"
    echo ""
    echo -e "${BLUE}📋 Summary:${NC}"
    echo "  ✅ MCP Orchestrator health check"
    echo "  ✅ Confluence Connector health check"
    echo "  ✅ REST API endpoints accessible"
    echo "  ✅ Neo4j connectivity verified"
    echo "  ✅ Ollama embedding service verified"
    echo ""
    echo -e "${YELLOW}🔍 Next steps:${NC}"
    echo "  - The services are ready for MCP protocol testing"
    echo "  - You can restart the orchestrator to pick up the new REST endpoints"
    echo "  - Then run the full MCP test suite"
}

# Run the test
main "$@"
