import chalk from 'chalk';

export interface StatusOptions {
  kbId?: string;
  runs?: boolean;
  server?: string;
  format?: 'text' | 'json';
}

export async function statusCommand(options: StatusOptions = {}) {
  try {
    const serverUrl = options.server || 'http://localhost:3000';
    
    if (options.format === 'json') {
      // JSON output format
      const result = await fetchStatusData(serverUrl, options);
      console.log(JSON.stringify(result, null, 2));
    } else {
      // Text output format
      console.log(chalk.bold(`\n🔍 Knowledge Graph Brain Status`));
      console.log(chalk.gray(`Server: ${serverUrl}`));
      
      if (options.kbId) {
        await displayKnowledgeBaseStatus(serverUrl, options.kbId, options);
      } else if (options.runs) {
        await displayRecentRuns(serverUrl, options);
      } else {
        await displaySystemStatus(serverUrl, options);
      }
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (options.format === 'json') {
      console.log(JSON.stringify({
        error: errorMessage,
        server: options.server
      }, null, 2));
    } else {
      console.error(chalk.red('Status check failed:'), errorMessage);
      console.log(chalk.yellow('Hints:'));
      console.log(chalk.yellow('  • Make sure the orchestrator server is running'));
      console.log(chalk.yellow(`  • Check server URL: ${options.server || 'http://localhost:3000'}`));
      console.log(chalk.yellow('  • Try: npm run dev in the orchestrator directory'));
    }
    
    process.exit(1);
  }
}

async function fetchStatusData(serverUrl: string, options: StatusOptions): Promise<any> {
  const fetch = (await import('node-fetch')).default;
  
  if (options.kbId) {
    const response = await fetch(`${serverUrl}/api/sync-status/${options.kbId}`);
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } else if (options.runs) {
    const url = options.kbId 
      ? `${serverUrl}/api/runs/${options.kbId}`
      : `${serverUrl}/api/runs`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } else {
    const response = await fetch(`${serverUrl}/api/status`);
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  }
}

async function displaySystemStatus(serverUrl: string, options: StatusOptions): Promise<void> {
  const status = await fetchStatusData(serverUrl, options);
  
  console.log(chalk.green(`\n✅ System Status: ${status.service || 'Unknown'}`));
  
  if (status.version) {
    console.log(chalk.blue(`📦 Version: ${status.version}`));
  }
  
  if (status.uptime_seconds !== undefined) {
    const uptimeHours = Math.floor(status.uptime_seconds / 3600);
    const uptimeMinutes = Math.floor((status.uptime_seconds % 3600) / 60);
    console.log(chalk.blue(`⏱️  Uptime: ${uptimeHours}h ${uptimeMinutes}m`));
  }
  
  if (status.neo4j_connected !== undefined) {
    const dbStatus = status.neo4j_connected ? 
      chalk.green('✅ Connected') : 
      chalk.red('❌ Disconnected');
    console.log(chalk.blue(`🗄️  Neo4j: ${dbStatus}`));
  }
  
  if (status.total_kbs !== undefined) {
    console.log(chalk.blue(`📊 Knowledge Bases: ${status.total_kbs}`));
  }
  
  if (status.total_nodes !== undefined) {
    console.log(chalk.blue(`🏷️  Total Nodes: ${status.total_nodes.toLocaleString()}`));
  }
  
  if (status.total_relationships !== undefined) {
    console.log(chalk.blue(`🔗 Total Relationships: ${status.total_relationships.toLocaleString()}`));
  }
  
  if (status.knowledge_bases && status.knowledge_bases.length > 0) {
    console.log(chalk.yellow(`\n📚 Knowledge Bases (${status.knowledge_bases.length}):`));
    status.knowledge_bases.forEach((kb: any) => {
      const lastSync = kb.sources?.some((s: any) => s.last_sync_status === 'running') ? 
        chalk.yellow('🔄 Running') :
        kb.sources?.some((s: any) => s.last_sync_status === 'failed') ?
        chalk.red('❌ Failed') :
        chalk.green('✅ OK');
      
      console.log(chalk.gray(`  • ${kb.kb_id} ${lastSync}`));
      if (kb.total_nodes) {
        console.log(chalk.gray(`    Nodes: ${kb.total_nodes}, Relations: ${kb.total_relationships || 0}`));
      }
    });
  }
}

async function displayKnowledgeBaseStatus(serverUrl: string, kbId: string, options: StatusOptions): Promise<void> {
  const kbStatus = await fetchStatusData(serverUrl, { ...options, kbId });
  
  console.log(chalk.green(`\n📊 Knowledge Base: ${chalk.cyan(kbId)}`));
  
  if (kbStatus.created_at) {
    const createdDate = new Date(kbStatus.created_at).toLocaleString();
    console.log(chalk.blue(`📅 Created: ${createdDate}`));
  }
  
  if (kbStatus.updated_at) {
    const updatedDate = new Date(kbStatus.updated_at).toLocaleString();
    console.log(chalk.blue(`🔄 Last Updated: ${updatedDate}`));
  }
  
  if (kbStatus.total_nodes !== undefined) {
    console.log(chalk.blue(`🏷️  Nodes: ${kbStatus.total_nodes.toLocaleString()}`));
  }
  
  if (kbStatus.total_relationships !== undefined) {
    console.log(chalk.blue(`🔗 Relationships: ${kbStatus.total_relationships.toLocaleString()}`));
  }
  
  if (kbStatus.sources && kbStatus.sources.length > 0) {
    console.log(chalk.yellow(`\n🔌 Sources (${kbStatus.sources.length}):`));
    kbStatus.sources.forEach((source: any) => {
      const statusIcon = source.last_sync_status === 'success' ? '✅' :
                        source.last_sync_status === 'failed' ? '❌' :
                        source.last_sync_status === 'running' ? '🔄' : '⏸️';
      
      console.log(chalk.gray(`  • ${source.source_id} ${statusIcon}`));
      
      if (source.last_sync_at) {
        const lastSync = new Date(source.last_sync_at).toLocaleString();
        console.log(chalk.gray(`    Last sync: ${lastSync}`));
      }
      
      if (source.total_runs) {
        console.log(chalk.gray(`    Total runs: ${source.total_runs}, Errors: ${source.error_count || 0}`));
      }
    });
  }
  
  if (kbStatus.last_error) {
    console.log(chalk.red(`\n❌ Last Error: ${kbStatus.last_error}`));
    if (kbStatus.last_error_at) {
      const errorDate = new Date(kbStatus.last_error_at).toLocaleString();
      console.log(chalk.red(`   At: ${errorDate}`));
    }
  }
}

async function displayRecentRuns(serverUrl: string, options: StatusOptions): Promise<void> {
  const runsData = await fetchStatusData(serverUrl, { ...options, runs: true });
  
  if (!runsData.runs || runsData.runs.length === 0) {
    console.log(chalk.yellow('\n📭 No recent runs found'));
    return;
  }
  
  console.log(chalk.green(`\n🏃 Recent Runs (${runsData.runs.length})`));
  
  runsData.runs.forEach((run: any) => {
    const statusIcon = run.status === 'completed' ? '✅' :
                      run.status === 'failed' ? '❌' :
                      run.status === 'running' ? '🔄' : '⏸️';
    
    const startTime = new Date(run.started_at).toLocaleString();
    const duration = run.duration_ms ? `${Math.round(run.duration_ms / 1000)}s` : 'ongoing';
    
    console.log(chalk.gray(`\n  ${statusIcon} ${run.run_id}`));
    console.log(chalk.gray(`     KB: ${run.kb_id}, Source: ${run.source_id}`));
    console.log(chalk.gray(`     Started: ${startTime}, Duration: ${duration}`));
    
    if (run.nodes_processed || run.relationships_created) {
      console.log(chalk.gray(`     Processed: ${run.nodes_processed || 0} nodes, ${run.relationships_created || 0} relationships`));
    }
    
    if (run.errors && run.errors.length > 0) {
      console.log(chalk.red(`     Errors: ${run.errors.length}`));
    }
  });
}
