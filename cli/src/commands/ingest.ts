import chalk from 'chalk';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import YAML from 'yaml';

export interface IngestOptions {
  server?: string;
  format?: 'text' | 'json';
  verbose?: boolean;
  sourceId?: string;
  wait?: boolean;
  timeout?: number;
}

interface IngestResult {
  source_id: string;
  run_id: string;
  started: boolean;
  status?: 'completed' | 'failed' | 'running';
  error?: string;
}

export async function ingestCommand(schemaFile: string, options: IngestOptions = {}) {
  const serverUrl = options.server || 'http://localhost:3000';
  const timeout = options.timeout || 300000; // 5 minutes default
  
  try {
    if (options.format !== 'json') {
      console.log(chalk.bold(`\n🔄 Knowledge Graph Brain Ingestion`));
      console.log(chalk.gray(`Schema: ${schemaFile}`));
      console.log(chalk.gray(`Server: ${serverUrl}\\n`));
    }
    
    // Read and parse schema
    const filePath = resolve(schemaFile);
    const yamlContent = readFileSync(filePath, 'utf8');
    let parsedSchema;
    
    try {
      parsedSchema = YAML.parse(yamlContent);
    } catch (parseError) {
      throw new Error(`YAML Parse Error: ${(parseError as Error).message}`);
    }
    
    const kbId = parsedSchema.kb_id;
    if (!kbId) {
      throw new Error('Schema missing required kb_id field');
    }
    
    if (options.format !== 'json') {
      console.log(chalk.blue(`📊 Knowledge Base: ${chalk.cyan(kbId)}`));
    }
    
    // Step 1: Register schema
    if (options.format !== 'json') {
      process.stdout.write(chalk.blue('  Registering schema... '));
    }
    
    const fetch = (await import('node-fetch')).default;
    const registerResponse = await fetch(`${serverUrl}/api/register-schema`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsedSchema),
      timeout: timeout / 3
    });
    
    if (!registerResponse.ok) {
      throw new Error(`Schema registration failed: ${registerResponse.status} ${registerResponse.statusText}`);
    }
    
    if (options.format !== 'json') {
      console.log(chalk.green('✅ REGISTERED'));
    }
    
    // Step 2: Get available sources
    const sources = parsedSchema.mappings?.sources || [];
    if (sources.length === 0) {
      if (options.format === 'json') {
        console.log(JSON.stringify({
          success: true,
          message: 'Schema registered successfully, but no sources to ingest',
          kb_id: kbId
        }, null, 2));
      } else {
        console.log(chalk.yellow('⚠️  No sources defined in schema. Schema registered but no data will be ingested.'));
      }
      return;
    }
    
    // Filter sources if sourceId specified
    const sourcesToIngest = options.sourceId 
      ? sources.filter((s: any) => s.source_id === options.sourceId)
      : sources;
    
    if (sourcesToIngest.length === 0) {
      throw new Error(`Source '${options.sourceId}' not found in schema`);
    }
    
    if (options.format !== 'json') {
      console.log(chalk.blue(`🔌 Sources to ingest: ${sourcesToIngest.length}`));
    }
    
    const ingestResults: IngestResult[] = [];
    
    // Step 3: Add each source and trigger ingestion
    for (const source of sourcesToIngest) {
      const sourceId = source.source_id;
      
      if (options.format !== 'json') {
        process.stdout.write(chalk.blue(`  Adding source '${sourceId}'... `));
      }
      
      // Add source
      const addSourceResponse = await fetch(`${serverUrl}/api/add-source`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kb_id: kbId,
          source_id: sourceId,
          connector_url: source.connector_url,
          document_type: source.document_type || 'document'
        }),
        timeout: timeout / 3
      });
      
      if (!addSourceResponse.ok) {
        throw new Error(`Add source failed for '${sourceId}': ${addSourceResponse.status} ${addSourceResponse.statusText}`);
      }
      
      if (options.format !== 'json') {
        console.log(chalk.green('✅ ADDED'));
        process.stdout.write(chalk.blue(`  Ingesting data from '${sourceId}'... `));
      }
      
      // Trigger ingestion
      const ingestResponse = await fetch(`${serverUrl}/api/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kb_id: kbId,
          source_id: sourceId
        }),
        timeout: timeout / 2
      });
      
      if (!ingestResponse.ok) {
        throw new Error(`Ingestion failed for '${sourceId}': ${ingestResponse.status} ${ingestResponse.statusText}`);
      }
      
      const ingestData = await ingestResponse.json();
      ingestResults.push({
        source_id: sourceId,
        run_id: ingestData.run_id,
        started: true
      });
      
      if (options.format !== 'json') {
        console.log(chalk.green(`✅ STARTED (Run ID: ${ingestData.run_id})`));
      }
    }
    
    // Step 4: Wait for completion if requested
    if (options.wait) {
      if (options.format !== 'json') {
        console.log(chalk.blue('\\n⏳ Waiting for ingestion to complete...'));
      }
      
      const waitStartTime = Date.now();
      let allCompleted = false;
      
      while (!allCompleted && (Date.now() - waitStartTime) < timeout) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
        allCompleted = true;
        for (const result of ingestResults) {
          const statusResponse = await fetch(`${serverUrl}/api/sync-status/${kbId}`);
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            const sourceStatus = statusData.sources?.find((s: any) => s.source_id === result.source_id);
            
            if (sourceStatus?.last_sync_status === 'running') {
              allCompleted = false;
            } else if (sourceStatus?.last_sync_status === 'failed') {
              result.status = 'failed';
              result.error = statusData.last_error;
            } else if (sourceStatus?.last_sync_status === 'success') {
              result.status = 'completed';
            }
          }
        }
      }
      
      if (allCompleted) {
        if (options.format !== 'json') {
          console.log(chalk.green('✅ Ingestion completed!'));
        }
      } else {
        if (options.format !== 'json') {
          console.log(chalk.yellow('⏰ Timeout waiting for ingestion to complete'));
        }
      }
    }
    
    // Final status
    const finalStatus = {
      success: true,
      kb_id: kbId,
      sources_processed: ingestResults.length,
      results: ingestResults,
      message: options.wait ? 'Ingestion completed' : 'Ingestion started'
    };
    
    if (options.format === 'json') {
      console.log(JSON.stringify(finalStatus, null, 2));
    } else {
      console.log(chalk.green(`\\n🎉 Ingestion ${options.wait ? 'completed' : 'started'} successfully!`));
      console.log(chalk.blue(`📊 Knowledge Base: ${kbId}`));
      console.log(chalk.blue(`🔌 Sources processed: ${ingestResults.length}`));
      
      if (!options.wait) {
        console.log(chalk.yellow('\\n💡 Use `kgb status --kb-id ${kbId}` to monitor progress'));
      }
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (options.format === 'json') {
      console.log(JSON.stringify({
        success: false,
        error: errorMessage
      }, null, 2));
    } else {
      console.error(chalk.red('Ingestion failed:'), errorMessage);
      console.log(chalk.yellow('\\nTroubleshooting:'));
      console.log(chalk.yellow('  • Verify the schema file is valid: kgb validate <schema-file>'));
      console.log(chalk.yellow('  • Check that the orchestrator is running'));
      console.log(chalk.yellow('  • Ensure connector services are available'));
      console.log(chalk.yellow('  • Check server URL and connectivity'));
    }
    
    process.exit(1);
  }
}
