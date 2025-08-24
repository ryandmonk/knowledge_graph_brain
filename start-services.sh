#!/bin/bash

# Startup script for Knowledge Graph Brain services
# This script starts all required services in the correct order

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Knowledge Graph Brain - Service Startup${NC}"
echo "=============================================="

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check if Neo4j is running
    if curl -s -u neo4j:password http://localhost:7474/db/data/ > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Neo4j is running${NC}"
    else
        echo -e "${YELLOW}⚠️ Neo4j not detected. Starting with Docker...${NC}"
        cd infra
        docker-compose up -d neo4j
        cd ..
        
        # Wait for Neo4j to be ready
        echo "Waiting for Neo4j to start..."
        sleep 10
        
        # Test connection
        timeout=30
        while [ $timeout -gt 0 ]; do
            if curl -s -u neo4j:password http://localhost:7474/db/data/ > /dev/null 2>&1; then
                echo -e "${GREEN}✅ Neo4j is now running${NC}"
                break
            fi
            sleep 2
            timeout=$((timeout-2))
        done
        
        if [ $timeout -le 0 ]; then
            echo -e "${RED}❌ Neo4j failed to start${NC}"
            exit 1
        fi
    fi
    
    # Check if Ollama is running
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Ollama is running${NC}"
        
        # Check if mxbai-embed-large model is available
        if curl -s http://localhost:11434/api/tags | grep -q "mxbai-embed-large"; then
            echo -e "${GREEN}✅ mxbai-embed-large model available${NC}"
        else
            echo -e "${YELLOW}⚠️ mxbai-embed-large model not found. Please run: ollama pull mxbai-embed-large${NC}"
        fi
    else
        echo -e "${RED}❌ Ollama not running. Please start Ollama first.${NC}"
        exit 1
    fi
    
    echo ""
}

# Start services
start_services() {
    echo -e "${BLUE}🔧 Starting services...${NC}"
    
    # Build and start orchestrator
    echo -e "${YELLOW}📦 Building and starting MCP Orchestrator...${NC}"
    cd orchestrator
    npm install > /dev/null 2>&1
    npm run build > /dev/null 2>&1
    npm start &
    ORCHESTRATOR_PID=$!
    cd ..
    
    # Wait a moment for orchestrator to start
    sleep 3
    
    # Start Confluence connector
    echo -e "${YELLOW}🔗 Starting Confluence Connector...${NC}"
    cd connectors/confluence
    npm install > /dev/null 2>&1
    npm start &
    CONNECTOR_PID=$!
    cd ../..
    
    # Wait for services to be ready
    echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
    sleep 5
    
    # Test service health
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ MCP Orchestrator ready at http://localhost:3000${NC}"
    else
        echo -e "${RED}❌ MCP Orchestrator failed to start${NC}"
        cleanup
        exit 1
    fi
    
    if curl -s http://localhost:3001/pull > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Confluence Connector ready at http://localhost:3001${NC}"
    else
        echo -e "${RED}❌ Confluence Connector failed to start${NC}"
        cleanup
        exit 1
    fi
    
    echo ""
}

# Cleanup function
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    if [ ! -z "$ORCHESTRATOR_PID" ]; then
        kill $ORCHESTRATOR_PID 2>/dev/null || true
    fi
    if [ ! -z "$CONNECTOR_PID" ]; then
        kill $CONNECTOR_PID 2>/dev/null || true
    fi
    
    # Kill any remaining Node.js processes on our ports
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
}

# Handle script termination
trap cleanup EXIT

# Main execution
main() {
    check_prerequisites
    start_services
    
    echo -e "${GREEN}🎉 All services are running!${NC}"
    echo ""
    echo -e "${BLUE}📋 Service URLs:${NC}"
    echo "  🔧 MCP Orchestrator: http://localhost:3000"
    echo "  🔗 Confluence Connector: http://localhost:3001" 
    echo "  🗄️ Neo4j Browser: http://localhost:7474 (neo4j/password)"
    echo "  🧠 Ollama: http://localhost:11434"
    echo ""
    echo -e "${BLUE}🧪 Ready for testing!${NC}"
    echo "Run the end-to-end test: ./test-e2e.sh"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
    
    # Keep script running
    wait
}

# Handle command line arguments
case "${1:-start}" in
    "start")
        main
        ;;
    "stop")
        cleanup
        echo -e "${GREEN}✅ All services stopped${NC}"
        ;;
    "status")
        echo -e "${BLUE}🔍 Checking service status...${NC}"
        
        # Check each service
        services=(
            "http://localhost:3000/health:MCP Orchestrator"
            "http://localhost:3001/pull:Confluence Connector"
            "http://localhost:7474:Neo4j"
            "http://localhost:11434/api/tags:Ollama"
        )
        
        for service in "${services[@]}"; do
            url=$(echo "$service" | cut -d: -f1,2)
            name=$(echo "$service" | cut -d: -f3)
            
            if curl -s "$url" > /dev/null 2>&1; then
                echo -e "${GREEN}✅ $name${NC}"
            else
                echo -e "${RED}❌ $name${NC}"
            fi
        done
        ;;
    *)
        echo "Usage: $0 [start|stop|status]"
        echo "  start  - Start all services (default)"
        echo "  stop   - Stop all services"
        echo "  status - Check service status"
        ;;
esac
