# Development Scripts

This folder contains development and testing scripts for contributors and advanced users.

## 🧪 Test Scripts

- **`test-simple.sh`** - Basic REST API connectivity tests
- **`test-e2e.sh`** - Complete end-to-end workflow testing
- **`test_mcp_direct.sh`** - MCP protocol testing
- **`demo-brain.sh`** - Interactive proof of concept demo
- **`verify_graphbrain.sh`** - System verification script
- **`test_direct_ingestion.js`** - Direct ingestion testing

## 🚀 Usage

Make sure all services are running, then:

```bash
# Basic connectivity test
./dev/test-simple.sh

# Full end-to-end test
./dev/test-e2e.sh

# Interactive demo
./dev/demo-brain.sh
```

## 📋 Prerequisites

- All services running (`./start-services.sh`)
- Neo4j with `graphbrain` database
- Ollama with required models
- curl and jq installed

## 🎯 For Contributors

These scripts are useful for:
- Validating your development setup
- Testing new features
- Debugging integration issues
- Understanding the complete workflow
