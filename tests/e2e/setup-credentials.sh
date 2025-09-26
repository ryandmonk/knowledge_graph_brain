#!/bin/bash

# Knowledge Graph Brain - Connector Credential Setup Script
# This script helps set up credentials for comprehensive connector testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "=========================================="
echo "🔑 Knowledge Graph Brain"
echo "   Connector Credential Setup"
echo "=========================================="
echo -e "${NC}"

# Check if .env file exists
ENV_FILE="../../.env"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
    if [ -f "../../.env.example" ]; then
        cp "../../.env.example" "$ENV_FILE"
        echo -e "${GREEN}✅ Created .env file from example${NC}"
    else
        echo -e "${RED}❌ No .env.example found. Creating basic .env file...${NC}"
        cat > "$ENV_FILE" << 'EOF'
# Knowledge Graph Brain Configuration
DEMO_MODE=false

# Database
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
NEO4J_DATABASE=neo4j

# AI/Embeddings
EMBEDDING_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
EMBEDDING_MODEL=mxbai-embed-large
LLM_MODEL=llama3.2

# Connector Credentials (Configure these for production testing)
GITHUB_TOKEN=
GITHUB_OWNER=
GITHUB_REPOSITORIES=

CONFLUENCE_BASE_URL=
CONFLUENCE_EMAIL=
CONFLUENCE_API_TOKEN=

SLACK_BOT_TOKEN=
SLACK_APP_TOKEN=
EOF
        echo -e "${GREEN}✅ Created basic .env file${NC}"
    fi
fi

echo -e "\n${YELLOW}📋 Credential Configuration Required${NC}"
echo "To run comprehensive connector tests, you need to configure:"
echo ""

# GitHub Credentials
echo -e "${BLUE}🐙 GitHub Connector:${NC}"
echo "   GITHUB_TOKEN=your_personal_access_token"
echo "   GITHUB_REPOSITORIES=owner1/repo1,owner2/repo2"
echo ""
echo "   📝 GitHub Token Setup:"
echo "   1. Go to GitHub → Settings → Developer settings → Personal access tokens"
echo "   2. Generate new token (classic) with scopes:"
echo "      - repo (for private repos) or public_repo (for public)"
echo "      - read:org, read:user"
echo "   3. Add token to .env file"
echo ""

# Confluence Credentials  
echo -e "${BLUE}📚 Confluence Connector:${NC}"
echo "   CONFLUENCE_BASE_URL=https://your-domain.atlassian.net"
echo "   CONFLUENCE_EMAIL=your-email@company.com"
echo "   CONFLUENCE_API_TOKEN=your_api_token"
echo ""
echo "   📝 Confluence Token Setup:"
echo "   1. Go to Atlassian Account Settings → Security → API tokens"
echo "   2. Create API token"
echo "   3. Add credentials to .env file"
echo ""

# Slack Credentials
echo -e "${BLUE}💬 Slack Connector (Optional):${NC}"
echo "   SLACK_BOT_TOKEN=xoxb-your-bot-token"
echo "   SLACK_APP_TOKEN=xapp-your-app-token (optional)"
echo ""

echo -e "${YELLOW}⚙️  Configuration Options:${NC}"
echo ""
echo "1. Interactive Configuration (Recommended):"
echo "   ./setup-credentials.sh --interactive"
echo ""
echo "2. Manual Configuration:"
echo "   Edit .env file directly: nano ../../.env"
echo ""
echo "3. Export Environment Variables:"
echo "   export GITHUB_TOKEN=\"your_token\""
echo "   export CONFLUENCE_URL=\"your_url\""
echo ""

# Interactive mode
if [[ "$1" == "--interactive" ]]; then
    echo -e "\n${BLUE}🔧 Interactive Credential Setup${NC}"
    echo "Press Enter to skip any credential you don't want to configure now."
    echo ""
    
    # GitHub configuration
    echo -e "${YELLOW}GitHub Configuration:${NC}"
    read -p "GitHub Personal Access Token: " github_token
    read -p "GitHub Repositories (owner/repo,owner/repo): " github_repos
    
    # Confluence configuration
    echo -e "\n${YELLOW}Confluence Configuration:${NC}"
    read -p "Confluence Domain (https://company.atlassian.net): " confluence_url
    read -p "Confluence Email: " confluence_email
    read -p "Confluence API Token: " confluence_token
    
    # Update .env file
    if [ ! -z "$github_token" ]; then
        sed -i.bak "s|^GITHUB_TOKEN=.*|GITHUB_TOKEN=$github_token|" "$ENV_FILE"
        echo -e "${GREEN}✅ Updated GitHub token${NC}"
    fi
    
    if [ ! -z "$github_repos" ]; then
        sed -i.bak "s|^GITHUB_REPOSITORIES=.*|GITHUB_REPOSITORIES=$github_repos|" "$ENV_FILE"
        echo -e "${GREEN}✅ Updated GitHub repositories${NC}"
    fi
    
    if [ ! -z "$confluence_url" ]; then
        sed -i.bak "s|^CONFLUENCE_BASE_URL=.*|CONFLUENCE_BASE_URL=$confluence_url|" "$ENV_FILE"
        echo -e "${GREEN}✅ Updated Confluence URL${NC}"
    fi
    
    if [ ! -z "$confluence_email" ]; then
        sed -i.bak "s|^CONFLUENCE_EMAIL=.*|CONFLUENCE_EMAIL=$confluence_email|" "$ENV_FILE"
        echo -e "${GREEN}✅ Updated Confluence email${NC}"
    fi
    
    if [ ! -z "$confluence_token" ]; then
        sed -i.bak "s|^CONFLUENCE_API_TOKEN=.*|CONFLUENCE_API_TOKEN=$confluence_token|" "$ENV_FILE"
        echo -e "${GREEN}✅ Updated Confluence token${NC}"
    fi
    
    # Clean up backup file
    rm -f "$ENV_FILE.bak"
    
    echo -e "\n${GREEN}✅ Configuration updated in .env file${NC}"
fi

echo -e "\n${BLUE}🚀 Next Steps:${NC}"
echo ""
echo "1. Verify your credentials:"
echo "   ./verify-credentials.sh"
echo ""
echo "2. Run connector tests with credentials:"
echo "   npm run test:headed github-integration.spec.ts"
echo "   npm run test:headed confluence-integration.spec.ts" 
echo "   npm run test:headed production-workflow.spec.ts"
echo ""
echo "3. Run all production tests:"
echo "   npm run test:production"
echo ""

echo -e "${YELLOW}📄 Current .env file location: $ENV_FILE${NC}"
echo -e "${YELLOW}📝 Edit manually with: nano $ENV_FILE${NC}"
echo ""
echo -e "${GREEN}🎯 For troubleshooting, see: ./README.md${NC}"