import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Neo4jService } from './neo4j';

/**
 * Authentication context attached to requests
 */
export interface AuthContext {
  api_key_id: string;
  roles: string[];
  kb_scopes: string[]; // KB IDs this key can access, or ['*'] for all
  permissions: {
    resource: string;
    action: string;
  }[];
}

/**
 * API Key data structure
 */
export interface ApiKeyData {
  key_id: string;
  name: string;
  key_hash: string;
  roles: string[];
  kb_scopes: string[];
  is_active: boolean;
  created_at: number;
  expires_at?: number;
  last_used_at?: number;
  created_by?: string;
  description?: string;
}

/**
 * Enterprise-grade authentication service for KB-scoped API keys
 */
export class AuthenticationService {
  private neo4j: Neo4jService;
  
  constructor(neo4j: Neo4jService) {
    this.neo4j = neo4j;
  }

  /**
   * Generate a new API key with KB scopes and roles
   */
  async createApiKey(params: {
    name: string;
    roles: string[];
    kb_scopes: string[]; // KB IDs or ['*'] for all
    expires_in_days?: number;
    description?: string;
    created_by?: string;
  }): Promise<{ key_id: string; api_key: string }> {
    
    const key_id = crypto.randomUUID();
    const api_key = `kgb_${crypto.randomBytes(32).toString('hex')}`;
    const key_hash = this.hashApiKey(api_key);
    
    const expires_at = params.expires_in_days 
      ? Date.now() + (params.expires_in_days * 24 * 60 * 60 * 1000)
      : undefined;

    const query = `
      CREATE (key:ApiKey {
        key_id: $key_id,
        name: $name,
        key_hash: $key_hash,
        kb_scopes: $kb_scopes,
        is_active: true,
        created_at: $created_at,
        expires_at: $expires_at,
        created_by: $created_by,
        description: $description
      })
      
      // Link to roles
      WITH key
      UNWIND $roles AS role_name
      MATCH (role:Role {name: role_name})
      MERGE (key)-[:HAS_ROLE]->(role)
      
      RETURN key.key_id AS key_id
    `;

    await this.neo4j.write(query, {
      key_id,
      name: params.name,
      key_hash,
      kb_scopes: params.kb_scopes,
      created_at: Date.now(),
      expires_at,
      created_by: params.created_by,
      description: params.description,
      roles: params.roles
    });

    // Log key creation for audit
    await this.logAuthEvent({
      event_type: 'api_key_created',
      key_id,
      success: true,
      metadata: { 
        name: params.name, 
        roles: params.roles,
        kb_scopes: params.kb_scopes 
      }
    });

    return { key_id, api_key };
  }

  /**
   * Validate an API key and return auth context
   */
  async validateApiKey(api_key: string): Promise<AuthContext | null> {
    if (!api_key || !api_key.startsWith('kgb_')) {
      return null;
    }

    const key_hash = this.hashApiKey(api_key);
    
    const query = `
      MATCH (key:ApiKey {key_hash: $key_hash})
      WHERE key.is_active = true 
        AND (key.expires_at IS NULL OR key.expires_at > $now)
      
      // Get roles and permissions
      OPTIONAL MATCH (key)-[:HAS_ROLE]->(role:Role)-[:HAS_PERMISSION]->(perm:Permission)
      
      // Update last used timestamp
      SET key.last_used_at = $now
      
      RETURN 
        key.key_id AS key_id,
        key.kb_scopes AS kb_scopes,
        collect(DISTINCT role.name) AS roles,
        collect(DISTINCT {resource: perm.resource, action: perm.action}) AS permissions
    `;

    const result = await this.neo4j.read(query, { 
      key_hash, 
      now: Date.now() 
    });

    if (result.length === 0) {
      await this.logAuthEvent({
        event_type: 'api_key_validation_failed',
        success: false,
        metadata: { reason: 'key_not_found_or_expired' }
      });
      return null;
    }

    const record = result[0];
    
    await this.logAuthEvent({
      event_type: 'api_key_validation_success',
      key_id: record.key_id,
      success: true
    });

    return {
      api_key_id: record.key_id,
      roles: record.roles || [],
      kb_scopes: record.kb_scopes || [],
      permissions: record.permissions || []
    };
  }

  /**
   * List all API keys (without revealing actual keys)
   */
  async listApiKeys(): Promise<Omit<ApiKeyData, 'key_hash'>[]> {
    const query = `
      MATCH (key:ApiKey)
      OPTIONAL MATCH (key)-[:HAS_ROLE]->(role:Role)
      
      RETURN 
        key.key_id AS key_id,
        key.name AS name,
        key.kb_scopes AS kb_scopes,
        key.is_active AS is_active,
        key.created_at AS created_at,
        key.expires_at AS expires_at,
        key.last_used_at AS last_used_at,
        key.created_by AS created_by,
        key.description AS description,
        collect(role.name) AS roles
      
      ORDER BY key.created_at DESC
    `;

    const results = await this.neo4j.read(query, {});
    
    return results.map((record: any) => ({
      key_id: record.key_id,
      name: record.name,
      kb_scopes: record.kb_scopes || [],
      roles: record.roles || [],
      is_active: record.is_active,
      created_at: record.created_at,
      expires_at: record.expires_at,
      last_used_at: record.last_used_at,
      created_by: record.created_by,
      description: record.description
    }));
  }

  /**
   * Revoke (deactivate) an API key
   */
  async revokeApiKey(key_id: string, revoked_by?: string): Promise<boolean> {
    const query = `
      MATCH (key:ApiKey {key_id: $key_id})
      SET key.is_active = false,
          key.revoked_at = $now,
          key.revoked_by = $revoked_by
      RETURN key.key_id AS key_id
    `;

    const result = await this.neo4j.write(query, {
      key_id,
      now: Date.now(),
      revoked_by
    });

    const success = result.length > 0;
    
    await this.logAuthEvent({
      event_type: 'api_key_revoked',
      key_id: success ? key_id : undefined,
      success,
      metadata: { revoked_by }
    });

    return success;
  }

  /**
   * Express middleware for API key authentication
   */
  middleware() {
    return async (req: Request & { auth?: AuthContext }, res: Response, next: NextFunction) => {
      // Extract API key from headers
      const api_key = req.headers['x-api-key'] as string || 
                     req.headers['authorization']?.toString().replace('Bearer ', '');

      if (!api_key) {
        await this.logAuthEvent({
          event_type: 'authentication_failed',
          success: false,
          metadata: { 
            reason: 'missing_api_key',
            path: req.path,
            ip: req.ip
          }
        });
        return res.status(401).json({ 
          error: 'API key required',
          message: 'Provide API key via X-API-Key header or Authorization: Bearer token'
        });
      }

      try {
        const auth_context = await this.validateApiKey(api_key);
        
        if (!auth_context) {
          return res.status(401).json({
            error: 'Invalid or expired API key'
          });
        }

        // Attach auth context to request
        req.auth = auth_context;
        next();

      } catch (error) {
        console.error('Authentication error:', error);
        
        await this.logAuthEvent({
          event_type: 'authentication_error',
          success: false,
          metadata: { 
            error: error instanceof Error ? error.message : 'unknown',
            path: req.path,
            ip: req.ip
          }
        });

        res.status(500).json({
          error: 'Authentication service unavailable'
        });
      }
    };
  }

  /**
   * Hash API key for secure storage
   */
  private hashApiKey(api_key: string): string {
    return crypto.createHash('sha256').update(api_key).digest('hex');
  }

  /**
   * Log authentication events for audit and monitoring
   */
  private async logAuthEvent(event: {
    event_type: string;
    key_id?: string;
    success: boolean;
    metadata?: any;
  }): Promise<void> {
    const query = `
      CREATE (event:AuthEvent {
        event_id: $event_id,
        event_type: $event_type,
        key_id: $key_id,
        success: $success,
        timestamp: $timestamp,
        metadata: $metadata
      })
    `;

    try {
      await this.neo4j.write(query, {
        event_id: crypto.randomUUID(),
        event_type: event.event_type,
        key_id: event.key_id,
        success: event.success,
        timestamp: Date.now(),
        metadata: JSON.stringify(event.metadata || {})
      });
    } catch (error) {
      console.error('Failed to log auth event:', error);
    }
  }
}
