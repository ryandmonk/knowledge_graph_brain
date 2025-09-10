import express from 'express';
import { Request, Response } from 'express';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const router = express.Router();
const execAsync = promisify(exec);

interface ServiceInfo {
  id: string;
  name: string;
  type: 'orchestrator' | 'connector' | 'database' | 'ai-service' | 'external';
  status: 'healthy' | 'warning' | 'error' | 'starting' | 'stopping' | 'unknown';
  url?: string;
  port?: number;
  dependencies: string[];
  dependents: string[];
  metrics?: {
    uptime_seconds: number;
    cpu_usage: number;
    memory_usage_mb: number;
    requests_per_minute: number;
    error_rate: number;
    last_restart?: number;
  };
  health_details?: {
    last_check: number;
    response_time_ms: number;
    error_message?: string;
  };
  restart_policy?: {
    max_retries: number;
    backoff_seconds: number;
    auto_restart: boolean;
  };
}

interface RestartSequence {
  id: string;
  services: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  current_step: number;
  total_steps: number;
  estimated_duration_seconds: number;
  errors: string[];
  started_at: number;
}

interface DependencyGraph {
  nodes: Array<{ id: string; name: string; type: string }>;
  edges: Array<{ from: string; to: string; type: 'depends_on' | 'provides_to' }>;
}

// In-memory storage for restart sequences and service metrics
const restartSequences: Map<string, RestartSequence> = new Map();
const serviceStartTime = Date.now();

// Service definitions with their dependencies
const serviceDefinitions: ServiceInfo[] = [
  {
    id: 'neo4j',
    name: 'Neo4j Database',
    type: 'database',
    status: 'unknown',
    url: 'http://localhost:7474',
    port: 7687,
    dependencies: [],
    dependents: ['orchestrator', 'confluence-connector', 'github-connector', 'slack-connector', 'retail-connector'],
    restart_policy: {
      max_retries: 3,
      backoff_seconds: 10,
      auto_restart: true
    }
  },
  {
    id: 'ollama',
    name: 'Ollama AI Service',
    type: 'ai-service',
    status: 'unknown',
    url: 'http://localhost:11434',
    port: 11434,
    dependencies: [],
    dependents: ['orchestrator'],
    restart_policy: {
      max_retries: 2,
      backoff_seconds: 15,
      auto_restart: true
    }
  },
  {
    id: 'orchestrator',
    name: 'MCP Orchestrator',
    type: 'orchestrator',
    status: 'unknown',
    url: 'http://localhost:3000',
    port: 3000,
    dependencies: ['neo4j', 'ollama'],
    dependents: ['web-ui'],
    restart_policy: {
      max_retries: 3,
      backoff_seconds: 5,
      auto_restart: true
    }
  },
  {
    id: 'confluence-connector',
    name: 'Confluence Connector',
    type: 'connector',
    status: 'unknown',
    url: 'http://localhost:3001',
    port: 3001,
    dependencies: ['neo4j', 'orchestrator'],
    dependents: [],
    restart_policy: {
      max_retries: 2,
      backoff_seconds: 5,
      auto_restart: true
    }
  },
  {
    id: 'github-connector',
    name: 'GitHub Connector',
    type: 'connector',
    status: 'unknown',
    url: 'http://localhost:3002',
    port: 3002,
    dependencies: ['neo4j', 'orchestrator'],
    dependents: [],
    restart_policy: {
      max_retries: 2,
      backoff_seconds: 5,
      auto_restart: true
    }
  },
  {
    id: 'slack-connector',
    name: 'Slack Connector',
    type: 'connector',
    status: 'unknown',
    url: 'http://localhost:3003',
    port: 3003,
    dependencies: ['neo4j', 'orchestrator'],
    dependents: [],
    restart_policy: {
      max_retries: 2,
      backoff_seconds: 5,
      auto_restart: true
    }
  },
  {
    id: 'retail-connector',
    name: 'Retail Mock Connector',
    type: 'connector',
    status: 'unknown',
    url: 'http://localhost:8081',
    port: 8081,
    dependencies: ['neo4j', 'orchestrator'],
    dependents: [],
    restart_policy: {
      max_retries: 2,
      backoff_seconds: 5,
      auto_restart: true
    }
  },
  {
    id: 'web-ui',
    name: 'Web UI',
    type: 'external',
    status: 'unknown',
    url: 'http://localhost:5173',
    port: 5173,
    dependencies: ['orchestrator'],
    dependents: [],
    restart_policy: {
      max_retries: 2,
      backoff_seconds: 10,
      auto_restart: false
    }
  }
];

// Health check functions
async function checkServiceHealth(service: ServiceInfo): Promise<ServiceInfo> {
  const startTime = Date.now();
  
  try {
    if (!service.url) {
      return { ...service, status: 'unknown' };
    }
    
    const healthUrl = service.url.includes('/health') ? service.url : `${service.url}/health`;
    const response = await fetch(healthUrl, { 
      timeout: 5000,
      signal: AbortSignal.timeout(5000)
    } as any);
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      return {
        ...service,
        status: 'healthy',
        health_details: {
          last_check: Date.now(),
          response_time_ms: responseTime
        },
        metrics: {
          uptime_seconds: Math.floor((Date.now() - serviceStartTime) / 1000),
          cpu_usage: Math.random() * 50 + 10, // Simulated
          memory_usage_mb: Math.random() * 500 + 100, // Simulated
          requests_per_minute: Math.floor(Math.random() * 100),
          error_rate: Math.random() * 5
        }
      };
    } else {
      return {
        ...service,
        status: 'error',
        health_details: {
          last_check: Date.now(),
          response_time_ms: responseTime,
          error_message: `HTTP ${response.status}: ${response.statusText}`
        }
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Check if service is running on the port
    try {
      const { stdout } = await execAsync(`lsof -i :${service.port} | grep LISTEN`);
      if (stdout.trim()) {
        return {
          ...service,
          status: 'warning',
          health_details: {
            last_check: Date.now(),
            response_time_ms: responseTime,
            error_message: 'Service running but health endpoint not responding'
          }
        };
      }
    } catch (portError) {
      // Port not in use, service is down
    }
    
    return {
      ...service,
      status: 'error',
      health_details: {
        last_check: Date.now(),
        response_time_ms: responseTime,
        error_message: error instanceof Error ? error.message : 'Service not accessible'
      }
    };
  }
}

// Intelligent restart sequencing
function calculateRestartSequence(serviceIds: string[], intelligent: boolean = true): string[] {
  if (!intelligent) {
    return serviceIds;
  }
  
  const servicesToRestart = new Set(serviceIds);
  const allServices = serviceDefinitions;
  const sequence: string[] = [];
  const processed = new Set<string>();
  
  // Build dependency graph for selected services
  const dependencyMap = new Map<string, string[]>();
  const dependentMap = new Map<string, string[]>();
  
  for (const service of allServices) {
    dependencyMap.set(service.id, service.dependencies);
    dependentMap.set(service.id, service.dependents);
  }
  
  // First, stop services in reverse dependency order
  function addToStopSequence(serviceId: string) {
    if (processed.has(serviceId) || !servicesToRestart.has(serviceId)) {
      return;
    }
    
    // First stop all dependents
    const dependents = dependentMap.get(serviceId) || [];
    for (const dependent of dependents) {
      if (servicesToRestart.has(dependent)) {
        addToStopSequence(dependent);
      }
    }
    
    if (!processed.has(serviceId)) {
      sequence.push(serviceId);
      processed.add(serviceId);
    }
  }
  
  // Add services to stop sequence
  for (const serviceId of serviceIds) {
    addToStopSequence(serviceId);
  }
  
  // Then start services in dependency order (reverse the stop sequence)
  return sequence.reverse();
}

// Get all services with health status
router.get('/', async (req: Request, res: Response) => {
  try {
    const healthChecks = await Promise.all(
      serviceDefinitions.map(service => checkServiceHealth(service))
    );
    
    res.json({ services: healthChecks });
  } catch (error) {
    console.error('Error getting service status:', error);
    res.status(500).json({ 
      error: 'Failed to get service status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get dependency graph
router.get('/dependencies', (req: Request, res: Response) => {
  try {
    const nodes = serviceDefinitions.map(service => ({
      id: service.id,
      name: service.name,
      type: service.type
    }));
    
    const edges: DependencyGraph['edges'] = [];
    
    for (const service of serviceDefinitions) {
      for (const dependency of service.dependencies) {
        edges.push({
          from: dependency,
          to: service.id,
          type: 'provides_to'
        });
      }
    }
    
    const graph: DependencyGraph = { nodes, edges };
    res.json({ graph });
  } catch (error) {
    console.error('Error getting dependency graph:', error);
    res.status(500).json({ error: 'Failed to get dependency graph' });
  }
});

// Start services
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { service_ids } = req.body;
    
    if (!Array.isArray(service_ids) || service_ids.length === 0) {
      return res.status(400).json({ error: 'service_ids must be a non-empty array' });
    }
    
    // For demo purposes, we'll simulate starting services
    // In production, this would actually start the services
    console.log(`Starting services: ${service_ids.join(', ')}`);
    
    // Simulate start delay
    setTimeout(async () => {
      console.log(`Services started: ${service_ids.join(', ')}`);
    }, 2000);
    
    res.json({ 
      success: true, 
      message: `Starting ${service_ids.length} service(s)`,
      service_ids 
    });
  } catch (error) {
    console.error('Error starting services:', error);
    res.status(500).json({ error: 'Failed to start services' });
  }
});

// Stop services
router.post('/stop', async (req: Request, res: Response) => {
  try {
    const { service_ids } = req.body;
    
    if (!Array.isArray(service_ids) || service_ids.length === 0) {
      return res.status(400).json({ error: 'service_ids must be a non-empty array' });
    }
    
    // For demo purposes, we'll simulate stopping services
    console.log(`Stopping services: ${service_ids.join(', ')}`);
    
    // Simulate stop delay
    setTimeout(async () => {
      console.log(`Services stopped: ${service_ids.join(', ')}`);
    }, 1000);
    
    res.json({ 
      success: true, 
      message: `Stopping ${service_ids.length} service(s)`,
      service_ids 
    });
  } catch (error) {
    console.error('Error stopping services:', error);
    res.status(500).json({ error: 'Failed to stop services' });
  }
});

// Restart services with intelligent sequencing
router.post('/restart', async (req: Request, res: Response) => {
  try {
    const { service_ids, intelligent_sequencing = true, rolling_restart = false } = req.body;
    
    if (!Array.isArray(service_ids) || service_ids.length === 0) {
      return res.status(400).json({ error: 'service_ids must be a non-empty array' });
    }
    
    const sequence = calculateRestartSequence(service_ids, intelligent_sequencing);
    const restartId = `restart_${Date.now()}`;
    
    const restartSequence: RestartSequence = {
      id: restartId,
      services: sequence,
      status: 'running',
      current_step: 0,
      total_steps: sequence.length * 2, // Stop + Start for each service
      estimated_duration_seconds: sequence.length * 10, // Rough estimate
      errors: [],
      started_at: Date.now()
    };
    
    restartSequences.set(restartId, restartSequence);
    
    // Execute restart sequence asynchronously
    executeRestartSequence(restartId, sequence, rolling_restart);
    
    res.json({ restart_sequence: restartSequence });
  } catch (error) {
    console.error('Error restarting services:', error);
    res.status(500).json({ error: 'Failed to restart services' });
  }
});

// Get restart sequence status
router.get('/restart/:id', (req: Request, res: Response) => {
  try {
    const restartId = req.params.id;
    const restartSequence = restartSequences.get(restartId);
    
    if (!restartSequence) {
      return res.status(404).json({ error: 'Restart sequence not found' });
    }
    
    res.json({ restart_sequence: restartSequence });
  } catch (error) {
    console.error('Error getting restart status:', error);
    res.status(500).json({ error: 'Failed to get restart status' });
  }
});

// Execute restart sequence
async function executeRestartSequence(restartId: string, sequence: string[], rollingRestart: boolean) {
  const restartSequence = restartSequences.get(restartId);
  if (!restartSequence) return;
  
  try {
    let step = 0;
    
    if (rollingRestart) {
      // Rolling restart: restart services one by one
      for (const serviceId of sequence) {
        restartSequence.current_step = step++;
        
        console.log(`Rolling restart: stopping ${serviceId}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        restartSequence.current_step = step++;
        
        console.log(`Rolling restart: starting ${serviceId}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        restartSequences.set(restartId, restartSequence);
      }
    } else {
      // Standard restart: stop all, then start all
      for (const serviceId of sequence) {
        restartSequence.current_step = step++;
        console.log(`Standard restart: stopping ${serviceId}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        restartSequences.set(restartId, restartSequence);
      }
      
      // Wait a bit between stop and start
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      for (const serviceId of sequence.reverse()) {
        restartSequence.current_step = step++;
        console.log(`Standard restart: starting ${serviceId}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        restartSequences.set(restartId, restartSequence);
      }
    }
    
    restartSequence.status = 'completed';
    restartSequence.current_step = restartSequence.total_steps;
    restartSequences.set(restartId, restartSequence);
    
    console.log(`Restart sequence ${restartId} completed successfully`);
  } catch (error) {
    console.error(`Restart sequence ${restartId} failed:`, error);
    
    restartSequence.status = 'failed';
    restartSequence.errors.push(error instanceof Error ? error.message : 'Unknown error');
    restartSequences.set(restartId, restartSequence);
  }
}

export default router;
