#!/usr/bin/env node

/**
 * Integration test script for the Universal MCP Server
 * 
 * This script can be used to test the MCP server with various external clients
 * and validate that all tools work correctly.
 */

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

// Test configurations for different clients
const testConfigs = {
  openWebUI: {
    name: "Open WebUI Configuration",
    config: {
      name: "knowledge-graph-brain",
      command: "node",
      args: ["./dist/index.js"],
      env: {
        ORCHESTRATOR_URL: "http://localhost:3000"
      }
    }
  },
  
  claudeDesktop: {
    name: "Claude Desktop Configuration", 
    config: {
      mcpServers: {
        "knowledge-graph-brain": {
          command: "node",
          args: ["./dist/index.js"],
          env: {
            ORCHESTRATOR_URL: "http://localhost:3000"
          }
        }
      }
    }
  },

  vscode: {
    name: "VS Code MCP Extension Configuration",
    config: {
      servers: [{
        name: "knowledge-graph-brain",
        command: "node",
        args: ["./dist/index.js"],
        environment: {
          ORCHESTRATOR_URL: "http://localhost:3000"
        }
      }]
    }
  }
};

// Example tool usage scenarios
const testScenarios = [
  {
    name: "Getting Started Workflow",
    steps: [
      {
        tool: "list_knowledge_bases",
        description: "Check what knowledge bases are available"
      },
      {
        tool: "switch_knowledge_base", 
        args: { kb_id: "test_kb", create_if_missing: true },
        description: "Create and switch to a test knowledge base"
      },
      {
        tool: "get_overview",
        description: "Get overview of the current knowledge base"
      }
    ]
  },

  {
    name: "Data Ingestion Workflow",
    steps: [
      {
        tool: "add_data_source",
        args: {
          source_id: "test_docs",
          connector_url: "http://github-connector:3001"
        },
        description: "Add a GitHub repository as data source"
      },
      {
        tool: "start_ingestion",
        args: { source_id: "test_docs" },
        description: "Start ingesting data from the source"
      },
      {
        tool: "get_kb_status", 
        description: "Check ingestion progress and status"
      }
    ]
  },

  {
    name: "Knowledge Query Workflow", 
    steps: [
      {
        tool: "ask_knowledge_graph",
        args: { 
          question: "What are the main components of this system?",
          search_depth: "deep" 
        },
        description: "Ask a natural language question"
      },
      {
        tool: "search_semantic",
        args: {
          text: "architecture patterns",
          top_k: 5
        },
        description: "Semantic search for architecture content"
      },
      {
        tool: "explore_relationships",
        args: {
          entity_search: "database",
          max_depth: 2
        },
        description: "Explore relationships around database entities"
      }
    ]
  },

  {
    name: "Discovery and Analysis Workflow",
    steps: [
      {
        tool: "explore_schema",
        args: { include_samples: true },
        description: "Analyze the knowledge graph schema"
      },
      {
        tool: "find_patterns", 
        args: { pattern_type: "centrality" },
        description: "Find the most connected entities"
      },
      {
        tool: "get_session_info",
        description: "View session context and query history"
      }
    ]
  }
];

function generateConfigFiles() {
  console.log('🔧 Generating configuration files for external clients...\n');

  Object.entries(testConfigs).forEach(([client, { name, config }]) => {
    const filename = `${client}-config.json`;
    writeFileSync(filename, JSON.stringify(config, null, 2));
    console.log(`✅ Generated ${filename} for ${name}`);
  });

  console.log('\n📁 Configuration files generated. Copy the appropriate config to your client.');
}

function printUsageExamples() {
  console.log('\n🎯 Example Usage Scenarios:\n');

  testScenarios.forEach((scenario, index) => {
    console.log(`${index + 1}. ${scenario.name}`);
    scenario.steps.forEach((step, stepIndex) => {
      console.log(`   ${stepIndex + 1}. ${step.description}`);
      console.log(`      Tool: ${step.tool}`);
      if (step.args) {
        console.log(`      Args: ${JSON.stringify(step.args, null, 6).replace(/\n/g, '\n      ')}`);
      }
      console.log('');
    });
  });
}

function startServer(mode = 'production') {
  console.log(`🚀 Starting MCP Server in ${mode} mode...\n`);

  const serverProcess = spawn('node', ['dist/index.js'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ORCHESTRATOR_URL: process.env.ORCHESTRATOR_URL || 'http://localhost:3000',
      NODE_ENV: mode
    }
  });

  serverProcess.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });

  serverProcess.on('close', (code) => {
    console.log(`\n📊 Server process exited with code ${code}`);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down MCP Server...');
    serverProcess.kill('SIGTERM');
    process.exit(0);
  });

  return serverProcess;
}

function printWelcome() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║        Knowledge Graph Brain Universal MCP Server           ║  
║                                                              ║
║  🔍 Query: Natural language Q&A and semantic search         ║
║  ⚙️  Manage: Knowledge bases and data sources               ║
║  🔎 Discover: Patterns and insights in your data            ║
║                                                              ║
║  Compatible with: Open WebUI, Claude Desktop, VS Code       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);
}

async function main() {
  const command = process.argv[2];

  printWelcome();

  switch (command) {
    case 'start':
    case undefined:
      startServer();
      break;
      
    case 'dev':
      startServer('development');
      break;
      
    case 'config':
      generateConfigFiles();
      break;
      
    case 'examples':
      printUsageExamples();
      break;
      
    case 'help':
      console.log(`
Usage: node integration-test.js [command]

Commands:
  start     Start the MCP server (default)
  dev       Start in development mode
  config    Generate configuration files for external clients
  examples  Show example tool usage scenarios
  help      Show this help message

Environment Variables:
  ORCHESTRATOR_URL    Knowledge Graph Orchestrator URL (default: http://localhost:3000)

Examples:
  node integration-test.js start           # Start the server
  node integration-test.js config          # Generate client configs
  node integration-test.js examples        # Show usage examples
      `);
      break;
      
    default:
      console.log(`❌ Unknown command: ${command}`);
      console.log('Run "node integration-test.js help" for usage information');
      process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Integration test failed:', error);
  process.exit(1);
});
