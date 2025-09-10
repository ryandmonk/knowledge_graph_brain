import WebSocket from 'ws';
import { getSystemStatus, type SystemStatus } from '../status';
import { executeCypher } from '../ingest';
import { performance } from 'perf_hooks';

export interface PerformanceMetrics {
  timestamp: number;
  cpu_usage: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  response_time_avg: number;
  error_rate: number;
  active_connections: number;
}

export interface ServiceHealth {
  service_name: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  response_time: number;
  last_check: number;
  details: {
    version?: string;
    uptime?: number;
    error_message?: string;
    performance_score?: number;
  };
}

export interface MonitoringUpdate {
  type: 'system_status' | 'performance_metrics' | 'service_health' | 'alert';
  data: any;
  timestamp: number;
}

class MonitoringService {
  private wss: WebSocket.Server | null = null;
  private clients: Set<WebSocket> = new Set();
  private updateInterval: NodeJS.Timeout | null = null;
  private performanceHistory: PerformanceMetrics[] = [];
  private requestTimes: number[] = [];
  private errorCount: number = 0;
  private requestCount: number = 0;

  initialize(server: any) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws/monitoring'
    });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('🔌 New monitoring client connected');
      this.clients.add(ws);

      // Send initial data to new client
      this.sendInitialData(ws);

      ws.on('close', () => {
        console.log('🔌 Monitoring client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });

    this.startMonitoring();
    console.log('📊 Monitoring service initialized with WebSocket support');
  }

  private async sendInitialData(ws: WebSocket) {
    try {
      const systemStatus = await getSystemStatus();
      const performanceMetrics = await this.getCurrentPerformanceMetrics();
      const serviceHealth = await this.getAllServiceHealth();

      this.sendToClient(ws, {
        type: 'system_status',
        data: { systemStatus, performanceMetrics, serviceHealth },
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to send initial monitoring data:', error);
    }
  }

  private startMonitoring() {
    // Update every 5 seconds for real-time monitoring
    this.updateInterval = setInterval(async () => {
      await this.broadcastSystemUpdate();
    }, 5000);

    // Collect performance metrics every 10 seconds
    setInterval(async () => {
      await this.collectPerformanceMetrics();
    }, 10000);

    console.log('📊 Real-time monitoring started');
  }

  private async broadcastSystemUpdate() {
    if (this.clients.size === 0) return;

    try {
      const systemStatus = await getSystemStatus();
      const performanceMetrics = await this.getCurrentPerformanceMetrics();
      const serviceHealth = await this.getAllServiceHealth();

      this.broadcast({
        type: 'system_status',
        data: { systemStatus, performanceMetrics, serviceHealth },
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to broadcast system update:', error);
    }
  }

  private async collectPerformanceMetrics() {
    try {
      const metrics = await this.getCurrentPerformanceMetrics();
      this.performanceHistory.push(metrics);

      // Keep only last 24 hours of data (8640 points at 10s intervals)
      if (this.performanceHistory.length > 8640) {
        this.performanceHistory = this.performanceHistory.slice(-8640);
      }
    } catch (error) {
      console.error('Failed to collect performance metrics:', error);
    }
  }

  private async getCurrentPerformanceMetrics(): Promise<PerformanceMetrics> {
    const memory = process.memoryUsage();
    const cpuUsage = await this.getCPUUsage();
    
    // Calculate average response time from recent requests
    const avgResponseTime = this.requestTimes.length > 0
      ? this.requestTimes.reduce((sum, time) => sum + time, 0) / this.requestTimes.length
      : 0;

    // Calculate error rate
    const errorRate = this.requestCount > 0 
      ? (this.errorCount / this.requestCount) * 100 
      : 0;

    return {
      timestamp: Date.now(),
      cpu_usage: cpuUsage,
      memory: {
        rss: Math.round(memory.rss / (1024 * 1024)), // MB
        heapTotal: Math.round(memory.heapTotal / (1024 * 1024)),
        heapUsed: Math.round(memory.heapUsed / (1024 * 1024)),
        external: Math.round(memory.external / (1024 * 1024))
      },
      response_time_avg: Math.round(avgResponseTime),
      error_rate: Math.round(errorRate * 100) / 100,
      active_connections: this.clients.size
    };
  }

  private async getCPUUsage(): Promise<number> {
    try {
      // Simple CPU usage approximation using process.cpuUsage()
      const startUsage = process.cpuUsage();
      const startTime = performance.now();
      
      // Wait 100ms and measure again
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const endUsage = process.cpuUsage(startUsage);
      const endTime = performance.now();
      
      const elapsedTime = (endTime - startTime) * 1000; // Convert to microseconds
      const totalUsage = endUsage.user + endUsage.system;
      
      return Math.round((totalUsage / elapsedTime) * 100 * 100) / 100; // Percentage
    } catch (error) {
      console.warn('CPU usage calculation failed:', error);
      return 0;
    }
  }

  private async getAllServiceHealth(): Promise<ServiceHealth[]> {
    const services: ServiceHealth[] = [];

    // Check Orchestrator health
    services.push(await this.checkOrchestratorHealth());

    // Check Neo4j health
    services.push(await this.checkNeo4jHealth());

    // Check LLM Provider health
    services.push(await this.checkLLMProviderHealth());

    return services;
  }

  private async checkOrchestratorHealth(): Promise<ServiceHealth> {
    const startTime = performance.now();
    try {
      const memory = process.memoryUsage();
      const responseTime = performance.now() - startTime;
      
      return {
        service_name: 'Orchestrator',
        status: 'healthy',
        response_time: Math.round(responseTime),
        last_check: Date.now(),
        details: {
          version: '1.0.0',
          uptime: Math.floor(process.uptime()),
          performance_score: 95
        }
      };
    } catch (error) {
      return {
        service_name: 'Orchestrator',
        status: 'error',
        response_time: performance.now() - startTime,
        last_check: Date.now(),
        details: {
          error_message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private async checkNeo4jHealth(): Promise<ServiceHealth> {
    const startTime = performance.now();
    try {
      await executeCypher('RETURN 1 as test');
      const responseTime = performance.now() - startTime;
      
      // Get Neo4j performance metrics
      const dbStats = await executeCypher(`
        CALL apoc.monitor.kernel() YIELD kernelInfo
        RETURN kernelInfo
      `).catch(() => []);
      
      return {
        service_name: 'Neo4j',
        status: responseTime < 100 ? 'healthy' : responseTime < 500 ? 'warning' : 'error',
        response_time: Math.round(responseTime),
        last_check: Date.now(),
        details: {
          performance_score: responseTime < 100 ? 95 : responseTime < 500 ? 70 : 40
        }
      };
    } catch (error) {
      return {
        service_name: 'Neo4j',
        status: 'error',
        response_time: performance.now() - startTime,
        last_check: Date.now(),
        details: {
          error_message: error instanceof Error ? error.message : 'Connection failed'
        }
      };
    }
  }

  private async checkLLMProviderHealth(): Promise<ServiceHealth> {
    const startTime = performance.now();
    try {
      // Check if Ollama is configured and available
      const axios = (await import('axios')).default;
      const response = await axios.get('http://localhost:11434/api/tags', { timeout: 5000 });
      const responseTime = performance.now() - startTime;
      
      return {
        service_name: 'LLM Provider (Ollama)',
        status: responseTime < 2000 ? 'healthy' : 'warning',
        response_time: Math.round(responseTime),
        last_check: Date.now(),
        details: {
          version: 'Ollama',
          performance_score: responseTime < 2000 ? 90 : 60
        }
      };
    } catch (error) {
      return {
        service_name: 'LLM Provider (Ollama)',
        status: 'error',
        response_time: performance.now() - startTime,
        last_check: Date.now(),
        details: {
          error_message: 'Ollama not available'
        }
      };
    }
  }

  // Public methods for tracking requests
  recordRequestStart(): number {
    return performance.now();
  }

  recordRequestEnd(startTime: number, isError: boolean = false) {
    const duration = performance.now() - startTime;
    this.requestTimes.push(duration);
    this.requestCount++;
    
    if (isError) {
      this.errorCount++;
    }

    // Keep only recent request times (last 1000 requests)
    if (this.requestTimes.length > 1000) {
      this.requestTimes = this.requestTimes.slice(-1000);
    }

    // Reset counters every hour
    if (this.requestCount > 10000) {
      this.requestCount = Math.floor(this.requestCount / 2);
      this.errorCount = Math.floor(this.errorCount / 2);
    }
  }

  // Send alert to all connected clients
  sendAlert(severity: 'info' | 'warning' | 'error', message: string, details?: any) {
    this.broadcast({
      type: 'alert',
      data: {
        severity,
        message,
        details,
        id: Date.now().toString()
      },
      timestamp: Date.now()
    });
  }

  private broadcast(update: MonitoringUpdate) {
    const message = JSON.stringify(update);
    
    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message);
        } catch (error) {
          console.error('Failed to send to client:', error);
          this.clients.delete(ws);
        }
      } else {
        this.clients.delete(ws);
      }
    });
  }

  private sendToClient(ws: WebSocket, update: MonitoringUpdate) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(update));
      } catch (error) {
        console.error('Failed to send to specific client:', error);
        this.clients.delete(ws);
      }
    }
  }

  getPerformanceHistory(): PerformanceMetrics[] {
    return this.performanceHistory;
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    this.clients.clear();
    console.log('📊 Monitoring service stopped');
  }
}

export const monitoringService = new MonitoringService();
