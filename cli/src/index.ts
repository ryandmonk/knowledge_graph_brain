#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { validateCommand } from './commands/validate.js';
import { statusCommand } from './commands/status.js';
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
