#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { validateCommand } from './commands/validate.js';
import { statusCommand } from './commands/status.js';
import { testCommand } from './commands/test.js';
import { ingestCommand } from './commands/ingest.js';
import { packageInfo } from './utils/package.js';

const program = new Command();

program
  .name('kgb')
  .description('Knowledge Graph Brain CLI Tools')
  .version(packageInfo.version);

// Validate command
program
  .command('validate')
  .description('Validate a Knowledge Graph Brain schema file')
  .argument('<schema-file>', 'Path to the YAML schema file to validate')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--format <format>', 'Output format (text|json)', 'text')
  .action(validateCommand);

// Status command  
program
  .command('status')
  .description('Check the status of knowledge bases and ingestion runs')
  .option('-k, --kb-id <kb_id>', 'Show status for specific knowledge base')
  .option('-r, --runs', 'Show recent ingestion runs')
  .option('--server <url>', 'Orchestrator server URL', 'http://localhost:3000')
  .option('--format <format>', 'Output format (text|json)', 'text')
  .action(statusCommand);

// Test command
program
  .command('test')
  .description('Run connectivity and health tests for Knowledge Graph Brain')
  .option('--server <url>', 'Orchestrator server URL', 'http://localhost:3000')
  .option('--format <format>', 'Output format (text|json)', 'text')
  .option('-v, --verbose', 'Enable verbose output with test details')
  .option('--timeout <ms>', 'Test timeout in milliseconds', '30000')
  .action(testCommand);

// Ingest command
program
  .command('ingest')
  .description('Register schema and ingest data from sources')
  .argument('<schema-file>', 'Path to the YAML schema file')
  .option('--server <url>', 'Orchestrator server URL', 'http://localhost:3000')
  .option('--format <format>', 'Output format (text|json)', 'text')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--source-id <source_id>', 'Only ingest from specific source')
  .option('--wait', 'Wait for ingestion to complete')
  .option('--timeout <ms>', 'Ingestion timeout in milliseconds', '300000')
  .action(ingestCommand);

// Error handling for unknown commands
program.on('command:*', () => {
  console.error(chalk.red(`Invalid command: ${program.args.join(' ')}`));
  console.log(chalk.yellow('See --help for a list of available commands.'));
  process.exit(1);
});

// Global error handler
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

// Parse command line arguments
program.parse();
