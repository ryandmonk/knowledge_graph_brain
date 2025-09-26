#!/bin/bash

# Knowledge Graph Brain - Credential Verification Script
# Validates configured credentials before running tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "=========================================="
echo "🔍 Knowledge Graph Brain"
echo "   Credential Verification"  
echo "=========================================="
echo -e "${NC}"

# Load environment variables
ENV_FILE="../../.env"
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
    echo -e "${GREEN}✅ Loaded .env file${NC}"
else
    echo -e "${RED}❌ No .env file found. Run ./setup-credentials.sh first${NC}"
    exit 1
fi

VERIFICATION_RESULTS=()
OVERALL_SUCCESS=true

# Function to test connector health
test_connector_health() {
    local name=$1
    local port=$2
    local connector_id=$3
    
    echo -e "\n${BLUE}🔌 Testing $name Connector (port $port)...${NC}"
    
    # Test if connector is running
    if curl -s -f "http://localhost:$port/health" > /dev/null 2>&1; then
        echo -e "${GREEN}  ✅ $name connector is running${NC}"
        
        # Get health details
        health_response=$(curl -s "http://localhost:$port/health" 2>/dev/null || echo "")
        if echo "$health_response" | grep -q "healthy"; then
            echo -e "${GREEN}  ✅ $name connector reports healthy${NC}"
            if echo "$health_response" | grep -q "demo"; then
                echo -e "${YELLOW}  ⚠️  $name connector is in demo mode${NC}"
            fi
        fi
        
        VERIFICATION_RESULTS+=("$name: ✅ Running")
        return 0
    else
        echo -e "${YELLOW}  ⚠️  $name connector not running (optional)${NC}"
        VERIFICATION_RESULTS+=("$name: ⚠️ Not running")
        return 1
    fi
}

# Function to verify GitHub credentials
verify_github_credentials() {
    echo -e "\n${BLUE}🐙 Verifying GitHub Credentials...${NC}"
    
    if [ -z "$GITHUB_TOKEN" ]; then
        echo -e "${YELLOW}  ⚠️  GITHUB_TOKEN not set${NC}"
        echo "     Set with: export GITHUB_TOKEN=\"your_token\""
        VERIFICATION_RESULTS+=("GitHub Token: ❌ Not configured")
        return 1
    fi
    
    echo -e "${GREEN}  ✅ GITHUB_TOKEN is set${NC}"
    
    # Test GitHub API access
    echo "  🔍 Testing GitHub API access..."
    
    response=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
        "https://api.github.com/user" 2>/dev/null || echo "")
    
    if echo "$response" | grep -q "login"; then
        username=$(echo "$response" | grep -o '"login":"[^"]*"' | cut -d'"' -f4)
        echo -e "${GREEN}  ✅ GitHub API access successful (user: $username)${NC}"
        VERIFICATION_RESULTS+=("GitHub: ✅ Authenticated as $username")
        
        # Check rate limits
        rate_limit=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
            "https://api.github.com/rate_limit" 2>/dev/null || echo "")
        if echo "$rate_limit" | grep -q "remaining"; then
            remaining=$(echo "$rate_limit" | grep -o '"remaining":[0-9]*' | cut -d':' -f2)
            echo -e "${GREEN}  ✅ Rate limit remaining: $remaining requests${NC}"
        fi
        
        return 0
    else
        echo -e "${RED}  ❌ GitHub API access failed${NC}"
        echo "     Check your token permissions and validity"
        VERIFICATION_RESULTS+=("GitHub: ❌ Authentication failed")
        OVERALL_SUCCESS=false
        return 1
    fi
}

# Function to verify Confluence credentials
verify_confluence_credentials() {
    echo -e "\n${BLUE}📚 Verifying Confluence Credentials...${NC}"
    
    if [ -z "$CONFLUENCE_BASE_URL" ] || [ -z "$CONFLUENCE_EMAIL" ] || [ -z "$CONFLUENCE_API_TOKEN" ]; then
        echo -e "${YELLOW}  ⚠️  Confluence credentials not fully configured${NC}"
        [ -z "$CONFLUENCE_BASE_URL" ] && echo "     Missing: CONFLUENCE_BASE_URL"
        [ -z "$CONFLUENCE_EMAIL" ] && echo "     Missing: CONFLUENCE_EMAIL"  
        [ -z "$CONFLUENCE_API_TOKEN" ] && echo "     Missing: CONFLUENCE_API_TOKEN"
        VERIFICATION_RESULTS+=("Confluence: ❌ Incomplete configuration")
        return 1
    fi
    
    echo -e "${GREEN}  ✅ All Confluence credentials are set${NC}"
    echo "     URL: $CONFLUENCE_BASE_URL"
    echo "     Email: $CONFLUENCE_EMAIL"
    
    # Test Confluence API access
    echo "  🔍 Testing Confluence API access..."
    
    # Create auth header
    auth_header=$(echo -n "$CONFLUENCE_EMAIL:$CONFLUENCE_API_TOKEN" | base64)
    
    response=$(curl -s -H "Authorization: Basic $auth_header" \
        "$CONFLUENCE_BASE_URL/wiki/api/v2/spaces?limit=1" 2>/dev/null || echo "")
    
    if echo "$response" | grep -q "results"; then
        echo -e "${GREEN}  ✅ Confluence API access successful${NC}"
        VERIFICATION_RESULTS+=("Confluence: ✅ Authentication successful")
        return 0
    else
        echo -e "${RED}  ❌ Confluence API access failed${NC}"
        echo "     Check your credentials and domain URL"
        if echo "$response" | grep -q "Unauthorized"; then
            echo "     Error: Invalid credentials"
        elif echo "$response" | grep -q "Forbidden"; then
            echo "     Error: Insufficient permissions"
        fi
        VERIFICATION_RESULTS+=("Confluence: ❌ Authentication failed")
        OVERALL_SUCCESS=false
        return 1
    fi
}

# Function to verify Slack credentials (optional)
verify_slack_credentials() {
    echo -e "\n${BLUE}💬 Verifying Slack Credentials...${NC}"
    
    if [ -z "$SLACK_BOT_TOKEN" ]; then
        echo -e "${YELLOW}  ⚠️  SLACK_BOT_TOKEN not set (optional)${NC}"
        VERIFICATION_RESULTS+=("Slack: ⚠️ Not configured")
        return 1
    fi
    
    echo -e "${GREEN}  ✅ SLACK_BOT_TOKEN is set${NC}"
    
    # Test Slack API access
    echo "  🔍 Testing Slack API access..."
    
    response=$(curl -s -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
        "https://slack.com/api/auth.test" 2>/dev/null || echo "")
    
    if echo "$response" | grep -q '"ok":true'; then
        team=$(echo "$response" | grep -o '"team":"[^"]*"' | cut -d'"' -f4 || echo "Unknown")
        echo -e "${GREEN}  ✅ Slack API access successful (team: $team)${NC}"
        VERIFICATION_RESULTS+=("Slack: ✅ Authenticated")
        return 0
    else
        echo -e "${RED}  ❌ Slack API access failed${NC}"
        echo "     Check your bot token validity"
        VERIFICATION_RESULTS+=("Slack: ❌ Authentication failed")
        return 1
    fi
}

# Run all verifications
echo -e "${YELLOW}🔍 Starting credential verification...${NC}\n"

# Test connectors
test_connector_health "GitHub" "3001" "github"
test_connector_health "Confluence" "3004" "confluence"  
test_connector_health "Slack" "3003" "slack"

# Verify credentials
verify_github_credentials
verify_confluence_credentials
verify_slack_credentials

# Summary
echo -e "\n${BLUE}=========================================="
echo "📊 Verification Summary"
echo "=========================================="
echo -e "${NC}"

for result in "${VERIFICATION_RESULTS[@]}"; do
    echo "  $result"
done

echo ""
if [ "$OVERALL_SUCCESS" = true ]; then
    echo -e "${GREEN}🎉 All critical credentials verified successfully!${NC}"
    echo -e "${GREEN}✅ Ready to run production connector tests${NC}"
    echo ""
    echo -e "${BLUE}🚀 Run tests with:${NC}"
    echo "   npm run test:headed github-integration.spec.ts"
    echo "   npm run test:headed confluence-integration.spec.ts"
    echo "   npm run test:headed production-workflow.spec.ts"
else
    echo -e "${YELLOW}⚠️  Some credentials need attention before running production tests${NC}"
    echo -e "${YELLOW}📝 Configure missing credentials with: ./setup-credentials.sh --interactive${NC}"
fi

echo ""
echo -e "${BLUE}📋 Test Options:${NC}"
echo "  • Demo mode tests (no credentials needed): npm run test:smoke" 
echo "  • UI tests (no connectors needed): npm run test:headed ui-comprehensive.spec.ts"
echo "  • Production workflow: npm run test:headed production-workflow.spec.ts"
echo ""