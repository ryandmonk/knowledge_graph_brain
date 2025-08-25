#!/bin/bash

# Knowledge Graph Brain - Centralized Service Startup
# Uses centralized .env configuration for all services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Knowledge Graph Brain Services...${NC}"

# Check if central .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}📋 No .env file found. Creating from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file. Please review and customize if needed.${NC}"
fi

# Load environment to show current configuration
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
fi

echo ""
echo -e "${BLUE}🔧 Current Configuration:${NC}"
echo "   DEMO_MODE: ${DEMO_MODE:-true}"
echo "   EMBEDDING_PROVIDER: ${EMBEDDING_PROVIDER:-ollama}"
echo "   NEO4J_URI: ${NEO4J_URI:-bolt://localhost:7687}"
echo ""

if [ "${DEMO_MODE:-true}" = "true" ]; then
    echo -e "${YELLOW}🎭 DEMO MODE is ACTIVE - all connectors will use mock data${NC}"
    echo "   To disable: Set DEMO_MODE=false in .env file"
else
    echo -e "${GREEN}🔐 PRODUCTION MODE is ACTIVE - connectors will use real API credentials${NC}"
    echo "   Make sure all required API tokens are set in .env file"
fi

echo ""

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check if Neo4j is running
    if curl -s -u ${NEO4J_USER:-neo4j}:${NEO4J_PASSWORD:-password} http://localhost:7474/db/data/ > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Neo4j is running${NC}"
    else
        echo -e "${YELLOW}⚠️ Neo4j not detected. Please start Neo4j Desktop or Docker.${NC}"
        echo "   For Docker: cd infra && docker-compose up -d neo4j"
        echo "   For Neo4j Desktop: Start your database"
        exit 1
    fi
    
    # Check if Ollama is running (if using ollama)
    if [ "${EMBEDDING_PROVIDER:-ollama}" = "ollama" ]; then
        if curl -s ${OLLAMA_BASE_URL:-http://localhost:11434}/api/tags > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Ollama is running${NC}"
        else
            echo -e "${YELLOW}⚠️ Ollama not detected. Please start Ollama service.${NC}"
            echo "   Visit: https://ollama.ai/download"
            exit 1
        fi
    fi
}

check_prerequisites

echo ""
echo -e "${BLUE}🏗️  Building and starting services...${NC}"

# Function to start a service in background
start_service() {
    local service_name=$1
    local service_path=$2
    local port=$3
    
    echo -e "${BLUE}📡 Starting ${service_name} (Port: ${port})...${NC}"
    cd ${service_path}
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "   Installing dependencies..."
        npm install > /dev/null 2>&1
    fi
    
    # Build if TypeScript project
    if [ -f "tsconfig.json" ]; then
        echo "   Building TypeScript..."
        npm run build > /dev/null 2>&1
    fi
    
    # Start the service in background
    npm start > "../logs/${service_name}.log" 2>&1 &
    echo $! > "../logs/${service_name}.pid"
    
    cd ..
    echo -e "${GREEN}✅ ${service_name} starting...${NC}"
}

# Create logs directory
mkdir -p logs

# Start orchestrator
start_service "Orchestrator" "orchestrator" "${ORCHESTRATOR_PORT:-3000}"

# Start connectors
start_service "GitHub-Connector" "connectors/github" "${GITHUB_CONNECTOR_PORT:-3002}"
start_service "Slack-Connector" "connectors/slack" "${SLACK_CONNECTOR_PORT:-3003}"
start_service "Confluence-Connector" "connectors/confluence" "${CONFLUENCE_CONNECTOR_PORT:-3004}"
start_service "Retail-Mock-Connector" "connectors/retail-mock" "${RETAIL_CONNECTOR_PORT:-8081}"

echo ""
echo -e "${GREEN}✅ All services are starting up...${NC}"
echo ""
echo -e "${BLUE}🔍 Service URLs:${NC}"
echo "   Orchestrator:          http://localhost:${ORCHESTRATOR_PORT:-3000}"
echo "   GitHub Connector:      http://localhost:${GITHUB_CONNECTOR_PORT:-3002}" 
echo "   Slack Connector:       http://localhost:${SLACK_CONNECTOR_PORT:-3003}"
echo "   Confluence Connector:  http://localhost:${CONFLUENCE_CONNECTOR_PORT:-3004}"
echo "   Retail Mock Connector: http://localhost:${RETAIL_CONNECTOR_PORT:-8081}"
echo ""
echo -e "${YELLOW}⏳ Services are starting... Check logs/ directory for detailed output${NC}"
echo -e "${BLUE}🩺 Run 'curl http://localhost:${ORCHESTRATOR_PORT:-3000}/health' to check orchestrator status${NC}"
echo ""
echo -e "${YELLOW}📋 To stop all services: ./stop-services.sh${NC}"
echo -e "${YELLOW}📋 To view logs: tail -f logs/*.log${NC}"

# Wait a moment for services to start
sleep 3

echo ""
echo -e "${BLUE}🎉 Knowledge Graph Brain is ready!${NC}"
echo ""
if [ "${DEMO_MODE:-true}" = "true" ]; then
    echo -e "${YELLOW}🎭 Running in DEMO MODE with safe mock data${NC}"
else
    echo -e "${GREEN}🔐 Running in PRODUCTION MODE with real API connections${NC}"
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
