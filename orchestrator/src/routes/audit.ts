import { Router, Request, Response } from 'express';
import { createNeo4jService } from '../../../shared/dist/neo4j';

const router = Router();
const neo4j = createNeo4jService();

interface AuditEvent {
  id: string;
  timestamp: number;
  event_type: string;
  user_id?: string;
  resource: string;
  action: string;
  success: boolean;
  details?: any;
  ip_address?: string;
  user_agent?: string;
}

interface ConfigChange {
  id: string;
  timestamp: number;
  user_id?: string;
  component: string;
  field: string;
  old_value: any;
  new_value: any;
  reason?: string;
  ip_address?: string;
}

interface SecurityAlert {
  id: string;
  timestamp: number;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: any;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: number;
}

/**
 * Get configuration changes history
 * GET /api/audit/config-changes
 */
router.get('/config-changes', async (req: Request, res: Response) => {
  try {
    const timeRange = req.query.timeRange as string || '24h';
    const timeMs = getTimeRangeMs(timeRange);
    const cutoffTime = Date.now() - timeMs;

    // Mock configuration changes data
    // In production, this would query actual configuration change logs
    const configChanges: ConfigChange[] = [
      {
        id: 'change-1',
        timestamp: Date.now() - 3600000, // 1 hour ago
        user_id: 'admin-user',
        component: 'neo4j',
        field: 'NEO4J_URI',
        old_value: 'bolt://localhost:7686',
        new_value: 'bolt://localhost:7687',
        reason: 'Port correction',
        ip_address: '127.0.0.1'
      },
      {
        id: 'change-2',
        timestamp: Date.now() - 7200000, // 2 hours ago
        user_id: 'admin-user',
        component: 'ollama',
        field: 'OLLAMA_MODEL',
        old_value: 'llama2',
        new_value: 'llama3.1',
        reason: 'Model upgrade',
        ip_address: '127.0.0.1'
      },
      {
        id: 'change-3',
        timestamp: Date.now() - 10800000, // 3 hours ago
        component: 'security',
        field: 'API_RATE_LIMIT',
        old_value: '100',
        new_value: '200',
        reason: 'Performance optimization',
        ip_address: '127.0.0.1'
      }
    ].filter(change => change.timestamp >= cutoffTime);

    res.json({
      success: true,
      changes: configChanges
    });

  } catch (error) {
    console.error('Failed to get configuration changes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve configuration changes'
    });
  }
});

/**
 * Get audit events
 * GET /api/audit/events
 */
router.get('/events', async (req: Request, res: Response) => {
  try {
    const timeRange = req.query.timeRange as string || '24h';
    const timeMs = getTimeRangeMs(timeRange);
    const cutoffTime = Date.now() - timeMs;

    // Query authentication events from Neo4j
    const query = `
      MATCH (event:AuthEvent)
      WHERE event.timestamp >= $cutoffTime
      RETURN event
      ORDER BY event.timestamp DESC
      LIMIT 100
    `;

    const result = await neo4j.read(query, { cutoffTime });
    
    const auditEvents: AuditEvent[] = result.map((record: any) => {
      const event = record.event.properties;
      return {
        id: event.event_id,
        timestamp: parseInt(event.timestamp),
        event_type: event.event_type,
        user_id: event.key_id,
        resource: event.metadata ? JSON.parse(event.metadata).resource || 'system' : 'system',
        action: event.metadata ? JSON.parse(event.metadata).action || 'unknown' : 'unknown',
        success: event.success,
        details: event.metadata ? JSON.parse(event.metadata) : {},
        ip_address: event.metadata ? JSON.parse(event.metadata).ip : undefined
      };
    });

    res.json({
      success: true,
      events: auditEvents
    });

  } catch (error) {
    console.error('Failed to get audit events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit events'
    });
  }
});

/**
 * Get security alerts
 * GET /api/audit/security-alerts
 */
router.get('/security-alerts', async (req: Request, res: Response) => {
  try {
    const timeRange = req.query.timeRange as string || '24h';
    const timeMs = getTimeRangeMs(timeRange);
    const cutoffTime = Date.now() - timeMs;

    // Mock security alerts data
    // In production, this would query actual security monitoring systems
    const securityAlerts: SecurityAlert[] = [
      {
        id: 'alert-1',
        timestamp: Date.now() - 1800000, // 30 minutes ago
        alert_type: 'MULTIPLE_FAILED_LOGINS',
        severity: 'high' as const,
        description: 'Multiple failed login attempts detected from same IP',
        details: {
          ip_address: '192.168.1.100',
          failed_attempts: 5,
          time_window: '5 minutes'
        },
        resolved: false
      },
      {
        id: 'alert-2',
        timestamp: Date.now() - 3600000, // 1 hour ago
        alert_type: 'WEAK_PASSWORD_DETECTED',
        severity: 'medium' as const,
        description: 'Default password detected in configuration',
        details: {
          component: 'neo4j',
          field: 'NEO4J_PASSWORD',
          recommendation: 'Change to a strong password'
        },
        resolved: true,
        resolved_by: 'admin-user',
        resolved_at: Date.now() - 1800000
      }
    ].filter(alert => alert.timestamp >= cutoffTime);

    res.json({
      success: true,
      alerts: securityAlerts
    });

  } catch (error) {
    console.error('Failed to get security alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security alerts'
    });
  }
});

/**
 * Get audit metrics and analytics
 * GET /api/audit/metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const timeRange = req.query.timeRange as string || '24h';
    const timeMs = getTimeRangeMs(timeRange);
    const cutoffTime = Date.now() - timeMs;

    // Query audit metrics from Neo4j
    const eventCountQuery = `
      MATCH (event:AuthEvent)
      WHERE event.timestamp >= $cutoffTime
      RETURN 
        count(event) as total_events,
        count(CASE WHEN event.success = true THEN 1 END) as successful_logins,
        count(CASE WHEN event.success = false THEN 1 END) as failed_logins,
        count(CASE WHEN event.event_type CONTAINS 'denied' THEN 1 END) as permission_denials
    `;

    const eventCountResult = await neo4j.read(eventCountQuery, { cutoffTime });
    const eventMetrics = eventCountResult[0] || {
      total_events: 0,
      successful_logins: 0,
      failed_logins: 0,
      permission_denials: 0
    };

    // Event types breakdown
    const eventTypesQuery = `
      MATCH (event:AuthEvent)
      WHERE event.timestamp >= $cutoffTime
      RETURN event.event_type as event_type, count(*) as count
    `;

    const eventTypesResult = await neo4j.read(eventTypesQuery, { cutoffTime });
    const eventsByType: Record<string, number> = {};
    eventTypesResult.forEach((record: any) => {
      eventsByType[record.event_type] = parseInt(record.count);
    });

    // Daily activity (mock data for now)
    const eventsByDay = generateDailyActivity(timeMs);

    const auditMetrics = {
      total_events: parseInt(eventMetrics.total_events),
      config_changes: 3, // Mock data
      security_alerts: 2, // Mock data
      failed_logins: parseInt(eventMetrics.failed_logins),
      successful_logins: parseInt(eventMetrics.successful_logins),
      permission_denials: parseInt(eventMetrics.permission_denials),
      events_by_type: eventsByType,
      events_by_day: eventsByDay
    };

    res.json({
      success: true,
      metrics: auditMetrics
    });

  } catch (error) {
    console.error('Failed to get audit metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit metrics'
    });
  }
});

/**
 * Resolve a security alert
 * POST /api/audit/security-alerts/:alertId/resolve
 */
router.post('/security-alerts/:alertId/resolve', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    
    // In production, this would update the alert status in the database
    console.log(`Resolving security alert: ${alertId}`);

    res.json({
      success: true,
      message: 'Security alert resolved successfully'
    });

  } catch (error) {
    console.error('Failed to resolve security alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve security alert'
    });
  }
});

// Helper functions
function getTimeRangeMs(timeRange: string): number {
  switch (timeRange) {
    case '1h': return 60 * 60 * 1000;
    case '24h': return 24 * 60 * 60 * 1000;
    case '7d': return 7 * 24 * 60 * 60 * 1000;
    case '30d': return 30 * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}

function generateDailyActivity(timeRangeMs: number): Array<{ date: string; count: number }> {
  const days = Math.min(7, Math.ceil(timeRangeMs / (24 * 60 * 60 * 1000)));
  const result = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    result.push({
      date: date.toLocaleDateString(),
      count: Math.floor(Math.random() * 50) + 10 // Mock activity
    });
  }
  
  return result;
}

export { router as auditRouter };
