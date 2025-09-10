import express from 'express';
import { monitoringService } from '../services/monitoring';

const router = express.Router();

// Get current performance metrics
router.get('/performance', async (req, res) => {
  try {
    const performanceHistory = monitoringService.getPerformanceHistory();
    const latest = performanceHistory[performanceHistory.length - 1];
    
    res.json({
      current: latest,
      history: performanceHistory,
      points: performanceHistory.length
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get performance metrics' 
    });
  }
});

// Get historical performance data for specific time period
router.get('/performance/history', async (req, res) => {
  try {
    const { period = '1h', points = 100 } = req.query;
    const history = monitoringService.getPerformanceHistory();
    
    let filteredHistory = history;
    const now = Date.now();
    
    // Filter by time period
    switch (period) {
      case '15m':
        filteredHistory = history.filter(point => 
          now - point.timestamp <= 15 * 60 * 1000
        );
        break;
      case '1h':
        filteredHistory = history.filter(point => 
          now - point.timestamp <= 60 * 60 * 1000
        );
        break;
      case '6h':
        filteredHistory = history.filter(point => 
          now - point.timestamp <= 6 * 60 * 60 * 1000
        );
        break;
      case '24h':
        filteredHistory = history.filter(point => 
          now - point.timestamp <= 24 * 60 * 60 * 1000
        );
        break;
    }
    
    // Sample data points if too many
    const maxPoints = parseInt(points as string);
    if (filteredHistory.length > maxPoints) {
      const step = Math.floor(filteredHistory.length / maxPoints);
      filteredHistory = filteredHistory.filter((_, index) => index % step === 0);
    }
    
    res.json({
      period,
      points: filteredHistory.length,
      data: filteredHistory
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get performance history' 
    });
  }
});

// Get service health status
router.get('/services', async (req, res) => {
  try {
    const performanceHistory = monitoringService.getPerformanceHistory();
    const latest = performanceHistory[performanceHistory.length - 1];
    
    // Service health is included in the monitoring service broadcasts
    // For REST API, we can provide a snapshot
    const services = [
      {
        service_name: 'Orchestrator',
        status: 'healthy',
        response_time: 5,
        last_check: Date.now(),
        details: {
          version: '1.0.0',
          uptime: Math.floor(process.uptime()),
          performance_score: 95,
          memory_usage: latest?.memory?.heapUsed || 0,
          cpu_usage: latest?.cpu_usage || 0
        }
      }
    ];
    
    res.json({
      services,
      total_services: services.length,
      healthy_services: services.filter(s => s.status === 'healthy').length,
      last_updated: Date.now()
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get service health' 
    });
  }
});

// Get system alerts
router.get('/alerts', async (req, res) => {
  try {
    const { severity, limit = 50 } = req.query;
    
    // For now, generate alerts based on current system state
    const alerts = [];
    const performanceHistory = monitoringService.getPerformanceHistory();
    const latest = performanceHistory[performanceHistory.length - 1];
    
    if (latest) {
      // Check for high memory usage
      if (latest.memory.heapUsed > 500) {
        alerts.push({
          id: `mem-${Date.now()}`,
          severity: 'warning',
          message: `High memory usage detected: ${latest.memory.heapUsed}MB`,
          timestamp: latest.timestamp,
          resolved: false
        });
      }
      
      // Check for high CPU usage
      if (latest.cpu_usage > 80) {
        alerts.push({
          id: `cpu-${Date.now()}`,
          severity: 'warning',
          message: `High CPU usage detected: ${latest.cpu_usage}%`,
          timestamp: latest.timestamp,
          resolved: false
        });
      }
      
      // Check for high error rate
      if (latest.error_rate > 5) {
        alerts.push({
          id: `err-${Date.now()}`,
          severity: 'error',
          message: `High error rate detected: ${latest.error_rate}%`,
          timestamp: latest.timestamp,
          resolved: false
        });
      }
    }
    
    // Filter by severity if specified
    let filteredAlerts = alerts;
    if (severity) {
      filteredAlerts = alerts.filter(alert => alert.severity === severity);
    }
    
    // Limit results
    const limitNum = parseInt(limit as string);
    filteredAlerts = filteredAlerts.slice(0, limitNum);
    
    res.json({
      alerts: filteredAlerts,
      total: filteredAlerts.length,
      summary: {
        error: alerts.filter(a => a.severity === 'error').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        info: alerts.filter(a => a.severity === 'info').length
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get alerts' 
    });
  }
});

// Acknowledge an alert
router.post('/alerts/:alertId/acknowledge', async (req, res) => {
  try {
    const { alertId } = req.params;
    
    // In a real implementation, this would update the alert in a database
    res.json({
      success: true,
      message: `Alert ${alertId} acknowledged`,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to acknowledge alert' 
    });
  }
});

// Get monitoring statistics
router.get('/stats', async (req, res) => {
  try {
    const performanceHistory = monitoringService.getPerformanceHistory();
    const latest = performanceHistory[performanceHistory.length - 1];
    
    if (!latest) {
      return res.json({
        message: 'No performance data available yet',
        uptime: Math.floor(process.uptime())
      });
    }
    
    // Calculate statistics from recent data
    const recentData = performanceHistory.slice(-60); // Last 10 minutes
    const avgCpu = recentData.reduce((sum, p) => sum + p.cpu_usage, 0) / recentData.length;
    const avgMemory = recentData.reduce((sum, p) => sum + p.memory.heapUsed, 0) / recentData.length;
    const avgResponseTime = recentData.reduce((sum, p) => sum + p.response_time_avg, 0) / recentData.length;
    
    res.json({
      uptime_seconds: Math.floor(process.uptime()),
      data_points: performanceHistory.length,
      current_metrics: latest,
      averages_10min: {
        cpu_usage: Math.round(avgCpu * 100) / 100,
        memory_mb: Math.round(avgMemory * 100) / 100,
        response_time_ms: Math.round(avgResponseTime * 100) / 100
      },
      monitoring: {
        active_connections: latest.active_connections,
        collection_interval: '10s',
        broadcast_interval: '5s'
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get monitoring stats' 
    });
  }
});

export default router;
