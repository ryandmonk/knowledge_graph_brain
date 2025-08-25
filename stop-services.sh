#!/bin/bash

# Stop all Knowledge Graph Brain services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping Knowledge Graph Brain Services...${NC}"

# Function to stop a service
stop_service() {
    local service_name=$1
    local pid_file="logs/${service_name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 $pid 2>/dev/null; then
            echo -e "${BLUE}🛑 Stopping ${service_name}...${NC}"
            kill $pid
            rm "$pid_file"
            echo -e "${GREEN}✅ ${service_name} stopped${NC}"
        else
            echo -e "${RED}⚠️  ${service_name} was not running${NC}"
            rm "$pid_file"
        fi
    else
        echo -e "${RED}⚠️  No PID file found for ${service_name}${NC}"
    fi
}

# Stop all services
if [ -d "logs" ]; then
    stop_service "Orchestrator"
    stop_service "GitHub-Connector"
    stop_service "Slack-Connector" 
    stop_service "Confluence-Connector"
    stop_service "Retail-Mock-Connector"
else
    echo -e "${RED}⚠️  No logs directory found. Services may not have been started with start-services.sh${NC}"
fi

# Clean up any remaining node processes (be careful with this)
echo -e "${BLUE}🧹 Cleaning up any remaining processes...${NC}"
pkill -f "knowledge-graph" 2>/dev/null || true
pkill -f "github-connector" 2>/dev/null || true
pkill -f "slack-connector" 2>/dev/null || true
pkill -f "confluence-connector" 2>/dev/null || true

echo -e "${GREEN}✅ All Knowledge Graph Brain services stopped${NC}"
