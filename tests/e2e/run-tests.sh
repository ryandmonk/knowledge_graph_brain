#!/bin/bash

# Knowledge Graph Brain - E2E Test Setup and Execution Script
# Comprehensive testing orchestration for all test categories

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Knowledge Graph Brain - E2E Testing Suite${NC}"
echo -e "${BLUE}====================================================${NC}"
echo ""

# Configuration
E2E_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$E2E_DIR")")"
TEST_RESULTS_DIR="$E2E_DIR/test-results"
REPORTS_DIR="$E2E_DIR/playwright-report"

# Test environment configuration
export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://localhost:3000}"
export ORCHESTRATOR_URL="${ORCHESTRATOR_URL:-http://localhost:3000}"
export NEO4J_URI="${NEO4J_URI:-bolt://localhost:7687}"
export NEO4J_USER="${NEO4J_USER:-neo4j}"
export NEO4J_PASSWORD="${NEO4J_PASSWORD:-password}"

# Parse command line arguments
TEST_CATEGORY=""
BROWSER=""
HEADED=false
DEBUG=false
UPDATE_SNAPSHOTS=false
PARALLEL=true
VERBOSE=false

show_help() {
    echo "Knowledge Graph Brain E2E Testing Script"
    echo ""
    echo "Usage: $0 [OPTIONS] [TEST_CATEGORY]"
    echo ""
    echo "Test Categories:"
    echo "  all          Run all test categories (default)"
    echo "  core         Core user workflows"
    echo "  api          API integration tests"
    echo "  visual       Visual regression tests"
    echo "  performance  Performance benchmarks"
    echo "  smoke        Quick smoke tests"
    echo ""
    echo "Options:"
    echo "  --browser BROWSER    Run on specific browser (chromium, firefox, webkit)"
    echo "  --headed            Show browser during tests"
    echo "  --debug             Enable debug mode with pauses"
    echo "  --update-snapshots  Update visual regression snapshots"
    echo "  --no-parallel       Run tests sequentially"
    echo "  --verbose           Verbose output"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Run all tests"
    echo "  $0 core --headed                     # Run core tests with visible browser"
    echo "  $0 visual --update-snapshots         # Update visual regression baselines"
    echo "  $0 performance --browser chromium    # Performance tests on Chrome only"
    echo "  $0 api --verbose                     # API tests with detailed output"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --browser)
            BROWSER="$2"
            shift 2
            ;;
        --headed)
            HEADED=true
            shift
            ;;
        --debug)
            DEBUG=true
            shift
            ;;
        --update-snapshots)
            UPDATE_SNAPSHOTS=true
            shift
            ;;
        --no-parallel)
            PARALLEL=false
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        core|api|visual|performance|smoke|all)
            TEST_CATEGORY="$1"
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Default test category
if [ -z "$TEST_CATEGORY" ]; then
    TEST_CATEGORY="all"
fi

echo -e "${BLUE}📋 Test Configuration:${NC}"
echo "   Category: $TEST_CATEGORY"
echo "   Browser: ${BROWSER:-all}"
echo "   Headed: $HEADED"
echo "   Debug: $DEBUG"
echo "   Update Snapshots: $UPDATE_SNAPSHOTS"
echo "   Parallel: $PARALLEL"
echo "   Verbose: $VERBOSE"
echo ""

# Check if we're in the right directory
if [ ! -f "$E2E_DIR/package.json" ]; then
    echo -e "${RED}❌ Error: Must run from tests/e2e directory or use full path${NC}"
    exit 1
fi

# Function to check service health
check_service_health() {
    local service_name=$1
    local service_url=$2
    local max_attempts=${3:-30}
    local attempt=0

    echo -e "${YELLOW}⏳ Waiting for $service_name to be ready...${NC}"
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f "$service_url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is ready${NC}"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    echo -e "${RED}❌ $service_name failed to start within $(($max_attempts * 2)) seconds${NC}"
    return 1
}

# Function to setup test environment
setup_test_environment() {
    echo -e "${BLUE}🔧 Setting up test environment...${NC}"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing test dependencies..."
        npm install
    fi
    
    # Install Playwright browsers if needed
    if [ ! -d "$HOME/.cache/ms-playwright" ]; then
        echo "🌐 Installing Playwright browsers..."
        npx playwright install
    fi
    
    # Create results directories
    mkdir -p "$TEST_RESULTS_DIR"
    mkdir -p "$REPORTS_DIR"
    
    echo -e "${GREEN}✅ Test environment setup complete${NC}"
}

# Function to validate services are running
validate_services() {
    echo -e "${BLUE}🏥 Validating service health...${NC}"
    
    # Check Neo4j using HTTP interface (works with Neo4j Desktop)
    if ! curl -s -f "http://localhost:7474/" > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ Neo4j not accessible. Starting with Docker...${NC}"
        cd "$PROJECT_ROOT/infra" && docker-compose up -d neo4j
        sleep 10
    else
        echo -e "${GREEN}✅ Neo4j Desktop is running and accessible${NC}"
    fi
    
    # Check Orchestrator
    if ! check_service_health "Orchestrator" "$ORCHESTRATOR_URL/api/status"; then
        echo -e "${YELLOW}⚠️ Starting Orchestrator service...${NC}"
        cd "$PROJECT_ROOT" && ./start-services.sh &
        sleep 15
        check_service_health "Orchestrator" "$ORCHESTRATOR_URL/api/status" || {
            echo -e "${RED}❌ Failed to start required services${NC}"
            exit 1
        }
    fi
    
    # Check Web UI
    check_service_health "Web UI" "$PLAYWRIGHT_BASE_URL/ui" || {
        echo -e "${RED}❌ Web UI not accessible${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ All required services are healthy${NC}"
}

# Function to build Playwright command
build_playwright_command() {
    local cmd="npx playwright test"
    
    # Add browser filter
    if [ -n "$BROWSER" ]; then
        cmd="$cmd --project=$BROWSER"
    fi
    
    # Add test file filter based on category
    case $TEST_CATEGORY in
        core)
            cmd="$cmd tests/core-workflows.spec.ts"
            ;;
        api)
            cmd="$cmd tests/api/"
            ;;
        visual)
            cmd="$cmd tests/visual/"
            ;;
        performance)
            cmd="$cmd tests/performance/"
            ;;
        smoke)
            cmd="$cmd --grep '@smoke'"
            ;;
        all)
            # Run all tests
            ;;
    esac
    
    # Add execution options
    if [ "$HEADED" = true ]; then
        cmd="$cmd --headed"
    fi
    
    if [ "$DEBUG" = true ]; then
        cmd="$cmd --debug"
    fi
    
    if [ "$UPDATE_SNAPSHOTS" = true ]; then
        cmd="$cmd --update-snapshots"
    fi
    
    if [ "$PARALLEL" = false ]; then
        cmd="$cmd --workers=1"
    fi
    
    # Add reporters
    cmd="$cmd --reporter=html --reporter=list"
    
    if [ "$VERBOSE" = true ]; then
        cmd="$cmd --reporter=verbose"
    fi
    
    echo "$cmd"
}

# Function to run tests
run_tests() {
    echo -e "${PURPLE}🚀 Starting E2E tests...${NC}"
    echo ""
    
    local start_time=$(date +%s)
    local cmd=$(build_playwright_command)
    
    echo -e "${BLUE}🔬 Executing: $cmd${NC}"
    echo ""
    
    # Run the tests
    if eval "$cmd"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo ""
        echo -e "${GREEN}🎉 Tests completed successfully in ${duration}s!${NC}"
        
        # Show report location
        if [ -f "$REPORTS_DIR/index.html" ]; then
            echo -e "${BLUE}📊 View detailed report: file://$REPORTS_DIR/index.html${NC}"
        fi
        
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo ""
        echo -e "${RED}❌ Tests failed after ${duration}s${NC}"
        
        # Show report location for debugging
        if [ -f "$REPORTS_DIR/index.html" ]; then
            echo -e "${YELLOW}🔍 Debug with report: file://$REPORTS_DIR/index.html${NC}"
        fi
        
        return 1
    fi
}

# Function to generate summary
generate_summary() {
    echo ""
    echo -e "${BLUE}📋 Test Execution Summary${NC}"
    echo -e "${BLUE}=========================${NC}"
    
    if [ -f "$TEST_RESULTS_DIR/results.json" ]; then
        # Parse results if available
        local results=$(cat "$TEST_RESULTS_DIR/results.json")
        echo "📊 Detailed results available in: $TEST_RESULTS_DIR/results.json"
    fi
    
    echo "📁 Test artifacts:"
    echo "   📊 HTML Report: $REPORTS_DIR/index.html"
    echo "   📷 Screenshots: $TEST_RESULTS_DIR/"
    echo "   📹 Videos: $TEST_RESULTS_DIR/"
    echo ""
    
    if [ "$TEST_CATEGORY" = "performance" ]; then
        echo -e "${PURPLE}⚡ Performance testing completed${NC}"
        echo "   Check HTML report for performance metrics and benchmarks"
    fi
    
    if [ "$TEST_CATEGORY" = "visual" ] || [ "$UPDATE_SNAPSHOTS" = true ]; then
        echo -e "${PURPLE}📷 Visual regression testing completed${NC}"
        if [ "$UPDATE_SNAPSHOTS" = true ]; then
            echo "   ⚠️ Snapshots updated - review changes before committing"
        fi
    fi
}

# Main execution
main() {
    echo -e "${BLUE}Starting Knowledge Graph Brain E2E Test Execution...${NC}"
    echo ""
    
    # Change to E2E directory
    cd "$E2E_DIR"
    
    # Setup and validation
    setup_test_environment
    validate_services
    
    echo ""
    echo -e "${PURPLE}🎬 Ready to run tests!${NC}"
    echo ""
    
    # Run the tests
    if run_tests; then
        generate_summary
        exit 0
    else
        generate_summary
        echo -e "${RED}❌ E2E tests failed. Check the report for details.${NC}"
        exit 1
    fi
}

# Handle script interruption
trap 'echo -e "\n${YELLOW}⚠️ Test execution interrupted${NC}"; exit 130' INT

# Run main function
main "$@"