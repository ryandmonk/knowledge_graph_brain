import { Request, Response } from 'express';
import { executeCypher } from '../ingest/index';

export interface RunStats {
  run_id: string;
  kb_id: string;
  source_id: string;
  started_at: number;
  completed_at?: number;
  status: 'running' | 'completed' | 'failed';
  nodes_processed: number;
  relationships_created: number;
  errors: string[];
  duration_ms?: number;
}

export interface KnowledgeBaseStatus {
  kb_id: string;
  created_at: number;
  updated_at: number;
  schema_version: number;
  total_nodes: number;
  total_relationships: number;
  sources: SourceStatus[];
  last_error?: string;
  last_error_at?: number;
  // Enhanced operational details
  last_successful_sync?: number;
  avg_ingestion_time_ms?: number;
  data_freshness_hours?: number;
  node_types: Array<{ type: string; count: number }>;
  health_status: 'healthy' | 'warning' | 'error' | 'stale';
}

export interface SourceStatus {
  source_id: string;
  last_run_id?: string;
  last_sync_at?: number;
  last_sync_status: 'success' | 'failed' | 'running' | 'never';
  cursor?: string;
  error_count: number;
  total_runs: number;
}

export interface SystemStatus {
  service: string;
  version: string;
  uptime_seconds: number;
  neo4j_connected: boolean;
  total_kbs: number;
  total_nodes: number;
  total_relationships: number;
  knowledge_bases: KnowledgeBaseStatus[];
  // Enhanced operational details
  active_runs: number;
  total_runs_completed: number;
  total_errors: number;
  memory_usage?: NodeJS.MemoryUsage;
  last_activity?: number;
  health_score: number; // 0-100
}

// In-memory storage for run statistics (in production, store in Neo4j or external store)
const runStats: Map<string, RunStats> = new Map();
const systemStartTime = Date.now();

/**
 * Track a new ingestion run
 */
export function startRun(kb_id: string, source_id: string, run_id: string): void {
  const runStat: RunStats = {
    run_id,
    kb_id,
    source_id,
    started_at: Date.now(),
    status: 'running',
    nodes_processed: 0,
    relationships_created: 0,
    errors: []
  };
  
  runStats.set(run_id, runStat);
  console.log(`📊 Started tracking run: ${run_id} for ${kb_id}:${source_id}`);
}

/**
 * Update run statistics during processing
 */
export function updateRunStats(
  run_id: string, 
  updates: Partial<Pick<RunStats, 'nodes_processed' | 'relationships_created' | 'errors'>>
): void {
  const run = runStats.get(run_id);
  if (run) {
    Object.assign(run, updates);
  }
}

/**
 * Complete a run with final statistics
 */
export function completeRun(
  run_id: string, 
  status: 'completed' | 'failed', 
  final_stats?: Partial<RunStats>
): void {
  const run = runStats.get(run_id);
  if (run) {
    run.status = status;
    run.completed_at = Date.now();
    run.duration_ms = run.completed_at - run.started_at;
    
    if (final_stats) {
      Object.assign(run, final_stats);
    }
    
    console.log(`📊 Completed run: ${run_id} (${status}) - ${run.duration_ms}ms`);
  }
}

/**
 * Add error to a run
 */
export function addRunError(run_id: string, error: string): void {
  const run = runStats.get(run_id);
  if (run) {
    run.errors.push(error);
  }
}

/**
 * Get status for a specific knowledge base
 */
export async function getKnowledgeBaseStatus(kb_id: string): Promise<KnowledgeBaseStatus | null> {
  try {
    // Get KB metadata
    const kbResult = await executeCypher(
      'MATCH (kb:KnowledgeBase {kb_id: $kb_id}) RETURN kb',
      { kb_id }
    );
    
    if (kbResult.length === 0) {
      return null;
    }
    
    const kb = kbResult[0].kb;
    
    // Get node and relationship counts
    const countsResult = await executeCypher(`
      MATCH (n {kb_id: $kb_id})
      WITH count(n) as nodeCount
      MATCH ()-[r {kb_id: $kb_id}]-()
      RETURN nodeCount, count(r) as relCount
    `, { kb_id });
    
    const counts = countsResult[0] || { nodeCount: 0, relCount: 0 };
    
    // Get node type breakdown
    const nodeTypesResult = await executeCypher(`
      MATCH (n {kb_id: $kb_id})
      RETURN labels(n) as labels, count(n) as count
    `, { kb_id });
    
    const nodeTypes = nodeTypesResult.map(record => ({
      type: record.labels.join(':'),
      count: record.count
    }));
    
    // Get source statistics from recent runs
    const recentRuns = Array.from(runStats.values())
      .filter(run => run.kb_id === kb_id)
      .sort((a, b) => b.started_at - a.started_at);
    
    // Aggregate by source_id
    const sourceStatusMap = new Map<string, SourceStatus>();
    
    for (const run of recentRuns) {
      if (!sourceStatusMap.has(run.source_id)) {
        sourceStatusMap.set(run.source_id, {
          source_id: run.source_id,
          last_run_id: run.run_id,
          last_sync_at: run.completed_at || run.started_at,
          last_sync_status: run.status === 'running' ? 'running' : 
                           run.status === 'completed' ? 'success' : 'failed',
          error_count: run.errors.length,
          total_runs: 1
        });
      } else {
        const existing = sourceStatusMap.get(run.source_id)!;
        existing.total_runs++;
        existing.error_count += run.errors.length;
      }
    }
    
    // Find last error and last successful sync
    const failedRuns = recentRuns.filter(run => run.status === 'failed');
    const successfulRuns = recentRuns.filter(run => run.status === 'completed');
    const lastFailedRun = failedRuns[0];
    const lastSuccessfulRun = successfulRuns[0];
    
    // Calculate average ingestion time
    const completedRuns = recentRuns.filter(run => run.duration_ms !== undefined);
    const avgIngestionTime = completedRuns.length > 0 
      ? completedRuns.reduce((sum, run) => sum + (run.duration_ms || 0), 0) / completedRuns.length
      : undefined;
    
    // Calculate data freshness
    const dataFreshnessHours = lastSuccessfulRun 
      ? (Date.now() - lastSuccessfulRun.completed_at!) / (1000 * 60 * 60)
      : undefined;
    
    // Determine health status
    let healthStatus: 'healthy' | 'warning' | 'error' | 'stale' = 'healthy';
    if (failedRuns.length > 0 && (!lastSuccessfulRun || failedRuns[0].started_at > lastSuccessfulRun.started_at)) {
      healthStatus = 'error';
    } else if (dataFreshnessHours && dataFreshnessHours > 24) {
      healthStatus = 'stale';
    } else if (dataFreshnessHours && dataFreshnessHours > 6) {
      healthStatus = 'warning';
    }

    return {
      kb_id,
      created_at: kb.created_at,
      updated_at: kb.updated_at,
      schema_version: kb.schema_version || 1,
      total_nodes: counts.nodeCount,
      total_relationships: counts.relCount,
      sources: Array.from(sourceStatusMap.values()),
      last_error: lastFailedRun?.errors[0],
      last_error_at: lastFailedRun?.completed_at,
      // Enhanced operational details
      last_successful_sync: lastSuccessfulRun?.completed_at,
      avg_ingestion_time_ms: avgIngestionTime,
      data_freshness_hours: dataFreshnessHours,
      node_types: nodeTypes,
      health_status: healthStatus
    };
    
  } catch (error) {
    console.error(`Error getting KB status for ${kb_id}:`, error);
    throw error;
  }
}

/**
 * Get system-wide status
 */
export async function getSystemStatus(): Promise<SystemStatus> {
  try {
    // Test Neo4j connection
    let neo4jConnected = false;
    try {
      await executeCypher('RETURN 1 as test');
      neo4jConnected = true;
    } catch (error) {
      console.warn('Neo4j connection test failed:', error);
    }
    
    // Get system-wide statistics
    const systemStatsResult = await executeCypher(`
      MATCH (kb:KnowledgeBase)
      WITH count(kb) as kbCount
      MATCH (n) WHERE n.kb_id IS NOT NULL
      WITH kbCount, count(n) as totalNodes
      MATCH ()-[r]-() WHERE r.kb_id IS NOT NULL
      RETURN kbCount, totalNodes, count(r) as totalRels
    `);
    
    const systemStats = systemStatsResult[0] || { kbCount: 0, totalNodes: 0, totalRels: 0 };
    
    // Get all KB statuses
    const kbsResult = await executeCypher('MATCH (kb:KnowledgeBase) RETURN kb.kb_id as kb_id');
    const knowledgeBases: KnowledgeBaseStatus[] = [];
    
    for (const kbRecord of kbsResult) {
      const kbStatus = await getKnowledgeBaseStatus(kbRecord.kb_id);
      if (kbStatus) {
        knowledgeBases.push(kbStatus);
      }
    }
    
    // Calculate operational metrics
    const allRuns = Array.from(runStats.values());
    const activeRuns = allRuns.filter(run => run.status === 'running').length;
    const completedRuns = allRuns.filter(run => run.status === 'completed').length;
    const totalErrors = allRuns.reduce((sum, run) => sum + run.errors.length, 0);
    const lastActivity = allRuns.length > 0 ? Math.max(...allRuns.map(run => run.completed_at || run.started_at)) : systemStartTime;
    
    // Calculate health score (0-100)
    let healthScore = 100;
    if (!neo4jConnected) healthScore -= 50; // Major penalty for DB issues
    if (totalErrors > 0) healthScore -= Math.min(totalErrors * 5, 30); // Errors impact health
    if (activeRuns > 5) healthScore -= 10; // Too many active runs might indicate issues
    healthScore = Math.max(0, healthScore);

    return {
      service: 'Knowledge Graph Orchestrator',
      version: '1.0.0',
      uptime_seconds: Math.floor((Date.now() - systemStartTime) / 1000),
      neo4j_connected: neo4jConnected,
      total_kbs: systemStats.kbCount,
      total_nodes: systemStats.totalNodes,
      total_relationships: systemStats.totalRels,
      knowledge_bases: knowledgeBases,
      // Enhanced operational metrics
      active_runs: activeRuns,
      total_runs_completed: completedRuns,
      total_errors: totalErrors,
      memory_usage: process.memoryUsage(),
      last_activity: lastActivity,
      health_score: healthScore
    };
    
  } catch (error) {
    console.error('Error getting system status:', error);
    throw error;
  }
}

/**
 * Express middleware for /api/sync-status endpoint
 */
export async function syncStatusHandler(req: Request, res: Response): Promise<void> {
  try {
    const { kb_id } = req.query;
    
    if (kb_id && typeof kb_id === 'string') {
      // Get status for specific KB
      const kbStatus = await getKnowledgeBaseStatus(kb_id);
      
      if (!kbStatus) {
        res.status(404).json({ 
          error: `Knowledge base '${kb_id}' not found` 
        });
        return;
      }
      
      res.json(kbStatus);
    } else {
      // Get system-wide status
      const systemStatus = await getSystemStatus();
      res.json(systemStatus);
    }
    
  } catch (error) {
    console.error('Error in sync status endpoint:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Express middleware for /api/runs endpoint - get recent run statistics
 */
export async function runsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { kb_id, source_id, limit = 10 } = req.query;
    
    let filteredRuns = Array.from(runStats.values());
    
    if (kb_id && typeof kb_id === 'string') {
      filteredRuns = filteredRuns.filter(run => run.kb_id === kb_id);
    }
    
    if (source_id && typeof source_id === 'string') {
      filteredRuns = filteredRuns.filter(run => run.source_id === source_id);
    }
    
    // Sort by most recent first
    filteredRuns.sort((a, b) => b.started_at - a.started_at);
    
    // Limit results
    const limitNum = typeof limit === 'string' ? parseInt(limit) : 10;
    filteredRuns = filteredRuns.slice(0, limitNum);
    
    res.json({
      runs: filteredRuns,
      total: runStats.size,
      filtered_count: filteredRuns.length
    });
    
  } catch (error) {
    console.error('Error in runs endpoint:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
