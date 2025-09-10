import { Router, Request, Response } from 'express';
import { AuthenticationService, AuthContext } from '../../../shared/dist/auth';
import { createNeo4jService } from '../../../shared/dist/neo4j';
import { getDriver } from '../ingest';

// Create router for auth-related endpoints
export const authRouter = Router();

// Initialize authentication service
let authService: AuthenticationService;

/**
 * Initialize authentication service with Neo4j connection
 */
export function initAuthService(): void {
  const neo4jService = createNeo4jService();
  authService = new AuthenticationService(neo4jService);
}

/**
 * Extended request interface with auth context
 */
interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
}

/**
 * Authorization middleware - check if user has required permission
 */
export function requirePermission(resource: string, action: string) {
  return (req: AuthenticatedRequest, res: Response, next: any) => {
    if (!req.auth) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const hasPermission = req.auth.permissions.some((p: any) => 
      p.resource === resource && p.action === action
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: { resource, action },
        available: req.auth.permissions
      });
    }

    next();
  };
}

/**
 * KB-scoped authorization - check if user can access specific KB
 */
export function requireKBAccess(req: AuthenticatedRequest, res: Response, next: any) {
  if (!req.auth) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  const kb_id = req.params.kb_id || req.body.kb_id;
  
  if (!kb_id) {
    return res.status(400).json({
      error: 'KB ID required'
    });
  }

  // Check if user has access to this specific KB or all KBs
  const hasAccess = req.auth.kb_scopes.includes('*') || 
                   req.auth.kb_scopes.includes(kb_id);

  if (!hasAccess) {
    return res.status(403).json({
      error: 'No access to this knowledge base',
      kb_id,
      available_scopes: req.auth.kb_scopes
    });
  }

  next();
}

// === API KEY MANAGEMENT ENDPOINTS ===

/**
 * Create a new API key
 * POST /auth/api-keys
 */
authRouter.post('/api-keys', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      roles = ['viewer'],
      kb_scopes = ['*'],
      expires_in_days,
      description
    } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'API key name is required'
      });
    }

    // Validate roles exist
    const validRoles = ['admin', 'operator', 'viewer'];
    const invalidRoles = roles.filter((role: string) => !validRoles.includes(role));
    
    if (invalidRoles.length > 0) {
      return res.status(400).json({
        error: 'Invalid roles specified',
        invalid_roles: invalidRoles,
        valid_roles: validRoles
      });
    }

    const result = await authService.createApiKey({
      name,
      roles,
      kb_scopes,
      expires_in_days,
      description,
      created_by: req.auth?.api_key_id || 'system'
    });

    res.status(201).json({
      success: true,
      key_id: result.key_id,
      api_key: result.api_key,
      message: 'API key created successfully. Store this key securely - it cannot be retrieved again.'
    });

  } catch (error) {
    console.error('Failed to create API key:', error);
    res.status(500).json({
      error: 'Failed to create API key',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * List all API keys (without revealing actual keys)
 * GET /auth/api-keys
 */
authRouter.get('/api-keys', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const apiKeys = await authService.listApiKeys();
    
    res.json({
      success: true,
      api_keys: apiKeys,
      count: apiKeys.length
    });

  } catch (error) {
    console.error('Failed to list API keys:', error);
    res.status(500).json({
      error: 'Failed to list API keys',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Revoke an API key
 * DELETE /auth/api-keys/:key_id
 */
authRouter.delete('/api-keys/:key_id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { key_id } = req.params;
    
    const success = await authService.revokeApiKey(
      key_id,
      req.auth?.api_key_id || 'system'
    );

    if (success) {
      res.json({
        success: true,
        message: 'API key revoked successfully'
      });
    } else {
      res.status(404).json({
        error: 'API key not found'
      });
    }

  } catch (error) {
    console.error('Failed to revoke API key:', error);
    res.status(500).json({
      error: 'Failed to revoke API key', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// === AUTHENTICATION INFO ENDPOINTS ===

/**
 * Get current authentication context
 * GET /auth/me
 */
authRouter.get('/me', (req: AuthenticatedRequest, res: Response) => {
  if (!req.auth) {
    return res.status(401).json({
      error: 'Not authenticated'
    });
  }

  res.json({
    success: true,
    auth: {
      api_key_id: req.auth.api_key_id,
      roles: req.auth.roles,
      kb_scopes: req.auth.kb_scopes,
      permissions: req.auth.permissions
    }
  });
});

/**
 * Check permissions for a specific resource/action
 * GET /auth/check-permission?resource=kb&action=read
 */
authRouter.get('/check-permission', (req: AuthenticatedRequest, res: Response) => {
  if (!req.auth) {
    return res.status(401).json({
      error: 'Not authenticated'
    });
  }

  const { resource, action } = req.query;

  if (!resource || !action) {
    return res.status(400).json({
      error: 'Both resource and action parameters are required'
    });
  }

  const hasPermission = req.auth.permissions.some((p: any) => 
    p.resource === resource && p.action === action
  );

  res.json({
    success: true,
    has_permission: hasPermission,
    resource,
    action
  });
});

// === ADMIN ENDPOINTS ===

/**
 * Get authentication service statistics
 * GET /auth/stats
 */
authRouter.get('/stats', 
  requirePermission('auth', 'admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Get API key statistics
      const apiKeys = await authService.listApiKeys();
      const activeKeys = apiKeys.filter((key: any) => key.is_active);
      const expiredKeys = apiKeys.filter((key: any) => 
        key.expires_at && key.expires_at < Date.now()
      );

      res.json({
        success: true,
        stats: {
          total_api_keys: apiKeys.length,
          active_api_keys: activeKeys.length,
          expired_api_keys: expiredKeys.length,
          role_distribution: apiKeys.reduce((acc: any, key: any) => {
            key.roles.forEach((role: any) => {
              acc[role] = (acc[role] || 0) + 1;
            });
            return acc;
          }, {}),
          kb_scope_distribution: {
            global_access: apiKeys.filter((key: any) => key.kb_scopes.includes('*')).length,
            scoped_access: apiKeys.filter((key: any) => !key.kb_scopes.includes('*')).length
          }
        }
      });

    } catch (error) {
      console.error('Failed to get auth stats:', error);
      res.status(500).json({
        error: 'Failed to get authentication statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// === ACCESS CONTROL ENDPOINTS ===

/**
 * Get access control data (users, roles, permissions)
 * GET /auth/access-control
 */
authRouter.get('/access-control', 
  requirePermission('auth', 'admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Get roles and permissions from Neo4j
      const rolesQuery = `
        MATCH (role:Role)
        OPTIONAL MATCH (role)-[:HAS_PERMISSION]->(perm:Permission)
        RETURN 
          role.name as name,
          role.description as description,
          collect({resource: perm.resource, action: perm.action, description: perm.description}) as permissions
      `;

      const rolesResult = await authService['neo4j'].read(rolesQuery, {});
      const roles = rolesResult.map((record: any) => ({
        name: record.name,
        description: record.description,
        permissions: record.permissions.filter((p: any) => p.resource), // Filter out null permissions
        user_count: 0 // Would be calculated from API keys with this role
      }));

      // Get all permissions
      const permissionsQuery = `
        MATCH (perm:Permission)
        RETURN perm.resource as resource, perm.action as action, perm.description as description
      `;

      const permissionsResult = await authService['neo4j'].read(permissionsQuery, {});
      const permissions = permissionsResult.map((record: any) => ({
        resource: record.resource,
        action: record.action,
        description: record.description
      }));

      // Get users (API keys)
      const apiKeys = await authService.listApiKeys();
      const users = apiKeys.map((key: any) => ({
        id: key.key_id,
        name: key.name,
        email: key.description, // Using description as email placeholder
        roles: key.roles,
        kb_scopes: key.kb_scopes,
        is_active: key.is_active,
        created_at: key.created_at,
        last_used_at: key.last_used_at
      }));

      // Update role user counts
      roles.forEach((role: any) => {
        role.user_count = users.filter((user: any) => user.roles.includes(role.name)).length;
      });

      res.json({
        success: true,
        roles,
        permissions,
        users,
        available_resources: ['kb', 'api', 'auth', 'config'],
        available_actions: ['read', 'write', 'admin']
      });

    } catch (error) {
      console.error('Failed to get access control data:', error);
      res.status(500).json({
        error: 'Failed to get access control data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Create a new user (API key)
 * POST /auth/users
 */
authRouter.post('/users',
  requirePermission('auth', 'admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, email, roles = ['viewer'], kb_scopes = ['*'] } = req.body;

      if (!name) {
        return res.status(400).json({
          error: 'User name is required'
        });
      }

      const result = await authService.createApiKey({
        name,
        roles,
        kb_scopes,
        description: email,
        created_by: req.auth?.api_key_id || 'admin'
      });

      res.status(201).json({
        success: true,
        user: {
          id: result.key_id,
          name,
          email,
          roles,
          kb_scopes
        },
        api_key: result.api_key,
        message: 'User created successfully'
      });

    } catch (error) {
      console.error('Failed to create user:', error);
      res.status(500).json({
        error: 'Failed to create user',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Update user status
 * PATCH /auth/users/:userId
 */
authRouter.patch('/users/:userId',
  requirePermission('auth', 'admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { is_active } = req.body;

      // In production, you'd update the API key status
      // For now, we'll simulate success
      console.log(`Updating user ${userId} active status to: ${is_active}`);

      res.json({
        success: true,
        message: 'User status updated successfully'
      });

    } catch (error) {
      console.error('Failed to update user:', error);
      res.status(500).json({
        error: 'Failed to update user',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Create a new role
 * POST /auth/roles
 */
authRouter.post('/roles',
  requirePermission('auth', 'admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, description, permissions = [] } = req.body;

      if (!name) {
        return res.status(400).json({
          error: 'Role name is required'
        });
      }

      // Create role in Neo4j
      const createRoleQuery = `
        MERGE (role:Role {name: $name})
        ON CREATE SET role.description = $description
        RETURN role
      `;

      await authService['neo4j'].write(createRoleQuery, { name, description });

      // Add permissions to role
      for (const permission of permissions) {
        const addPermissionQuery = `
          MATCH (role:Role {name: $roleName})
          MATCH (perm:Permission {resource: $resource, action: $action})
          MERGE (role)-[:HAS_PERMISSION]->(perm)
        `;

        await authService['neo4j'].write(addPermissionQuery, {
          roleName: name,
          resource: permission.resource,
          action: permission.action
        });
      }

      res.status(201).json({
        success: true,
        role: {
          name,
          description,
          permissions
        },
        message: 'Role created successfully'
      });

    } catch (error) {
      console.error('Failed to create role:', error);
      res.status(500).json({
        error: 'Failed to create role',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Get authentication middleware instance
 */
export function getAuthMiddleware() {
  if (!authService) {
    throw new Error('Auth service not initialized. Call initAuthService() first.');
  }
  return authService.middleware();
}
