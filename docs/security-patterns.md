# Security & Credential Management Patterns

This document outlines security patterns and credential management best practices for the Knowledge Graph Brain, ensuring enterprise-grade security for production deployments.

## 🔒 Security Architecture

### Core Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Minimal access rights for components
3. **Zero Trust**: Never trust, always verify
4. **Secrets Isolation**: Credentials separated from code
5. **Audit Trail**: Complete logging of security events

## 🔑 Credential Management Framework

### Current Architecture

```typescript
// Current: Direct environment variable access
const config = {
  NEO4J_URI: process.env.NEO4J_URI || 'bolt://localhost:7687',
  NEO4J_USERNAME: process.env.NEO4J_USERNAME || 'neo4j',
  NEO4J_PASSWORD: process.env.NEO4J_PASSWORD || 'password',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
  CONFLUENCE_API_TOKEN: process.env.CONFLUENCE_API_TOKEN
};
```

### Enhanced Security Architecture

```typescript
// Enhanced: Secret management with rotation and validation
interface SecretManager {
  getSecret(key: string): Promise<string>;
  rotateSecret(key: string): Promise<void>;
  validateSecret(key: string): Promise<boolean>;
  auditAccess(key: string, component: string): Promise<void>;
}

class EnterpriseSecretManager implements SecretManager {
  private providers: SecretProvider[] = [];
  
  constructor() {
    // Initialize providers in order of preference
    if (process.env.AWS_REGION) {
      this.providers.push(new AWSSecretsManagerProvider());
    }
    if (process.env.VAULT_ADDR) {
      this.providers.push(new HashiCorpVaultProvider());
    }
    if (process.env.AZURE_KEY_VAULT_URL) {
      this.providers.push(new AzureKeyVaultProvider());
    }
    
    // Fallback to environment variables with warnings
    this.providers.push(new EnvironmentVariableProvider());
  }
  
  async getSecret(key: string): Promise<string> {
    for (const provider of this.providers) {
      try {
        const secret = await provider.getSecret(key);
        if (secret) {
          await this.auditAccess(key, 'knowledge-graph-orchestrator');
          return secret;
        }
      } catch (error) {
        console.warn(`Secret provider ${provider.name} failed for key ${key}:`, error);
      }
    }
    
    throw new Error(`Failed to retrieve secret: ${key}`);
  }
}
```

## 🏗️ Security Provider Implementations

### 1. AWS Secrets Manager Integration

```typescript
class AWSSecretsManagerProvider implements SecretProvider {
  name = 'AWS Secrets Manager';
  private client: SecretsManagerClient;
  
  constructor() {
    this.client = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }
  
  async getSecret(key: string): Promise<string | null> {
    try {
      const command = new GetSecretValueCommand({
        SecretId: `knowledge-graph/${key}`,
        VersionStage: 'AWSCURRENT'
      });
      
      const response = await this.client.send(command);
      
      if (response.SecretString) {
        const secretData = JSON.parse(response.SecretString);
        return secretData[key] || secretData.value;
      }
      
      return null;
    } catch (error) {
      if (error.name === 'ResourceNotFoundException') {
        return null; // Secret doesn't exist, try next provider
      }
      throw error;
    }
  }
  
  async rotateSecret(key: string): Promise<void> {
    const command = new RotateSecretCommand({
      SecretId: `knowledge-graph/${key}`,
      ForceRotateSecrets: true
    });
    
    await this.client.send(command);
  }
}
```

### 2. HashiCorp Vault Integration

```typescript
class HashiCorpVaultProvider implements SecretProvider {
  name = 'HashiCorp Vault';
  private vaultClient: any; // node-vault client
  
  constructor() {
    this.vaultClient = require('node-vault')({
      apiVersion: 'v1',
      endpoint: process.env.VAULT_ADDR,
      token: process.env.VAULT_TOKEN
    });
  }
  
  async getSecret(key: string): Promise<string | null> {
    try {
      const response = await this.vaultClient.read(`secret/data/knowledge-graph/${key}`);
      return response.data?.data?.[key] || response.data?.data?.value;
    } catch (error) {
      if (error.response?.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }
  
  async rotateSecret(key: string): Promise<void> {
    // Implement rotation logic based on secret type
    const metadata = await this.getSecretMetadata(key);
    
    if (metadata.type === 'api_token') {
      await this.rotateApiToken(key, metadata);
    } else if (metadata.type === 'database_password') {
      await this.rotateDatabasePassword(key, metadata);
    }
  }
}
```

### 3. Environment Variable Provider (Fallback)

```typescript
class EnvironmentVariableProvider implements SecretProvider {
  name = 'Environment Variables';
  
  async getSecret(key: string): Promise<string | null> {
    const value = process.env[key];
    
    if (value && !this.isSecureEnvironment()) {
      console.warn(`⚠️ Using environment variable for ${key} - not recommended for production`);
    }
    
    return value || null;
  }
  
  private isSecureEnvironment(): boolean {
    return process.env.NODE_ENV === 'development' || 
           process.env.NODE_ENV === 'test';
  }
  
  async validateSecret(key: string): Promise<boolean> {
    const value = await this.getSecret(key);
    
    // Basic validation patterns
    const validationRules = {
      'GITHUB_TOKEN': /^gh[ps]_[A-Za-z0-9_]{36,}$/,
      'SLACK_BOT_TOKEN': /^xoxb-[0-9]+-[0-9]+-[A-Za-z0-9]+$/,
      'NEO4J_PASSWORD': /.{8,}/, // Minimum 8 characters
      'OPENAI_API_KEY': /^sk-[A-Za-z0-9]{48}$/
    };
    
    const pattern = validationRules[key];
    return pattern ? pattern.test(value || '') : true;
  }
}
```

## 🛡️ Security Configuration

### Secure Configuration Management

```typescript
interface SecureConfig {
  // Database credentials
  neo4j: {
    uri: string;
    username: string;
    password: Promise<string>; // Async secret resolution
    database: string;
    tlsLevel: 'REQUIRED' | 'OPTIONAL' | 'DISABLED';
  };
  
  // API credentials
  connectors: {
    github: {
      token: Promise<string>;
      webhookSecret: Promise<string>;
    };
    slack: {
      botToken: Promise<string>;
      signingSecret: Promise<string>;
    };
    confluence: {
      apiToken: Promise<string>;
      userEmail: string; // Not secret, can be plain
    };
  };
  
  // Encryption settings
  encryption: {
    keyRotationDays: number;
    algorithm: 'AES-256-GCM';
    keyDerivation: 'PBKDF2';
  };
}

class SecureConfigManager {
  private secretManager: SecretManager;
  private configCache: Map<string, { value: any; expires: number }> = new Map();
  
  constructor(secretManager: SecretManager) {
    this.secretManager = secretManager;
  }
  
  async getConfig(): Promise<SecureConfig> {
    return {
      neo4j: {
        uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
        username: process.env.NEO4J_USERNAME || 'neo4j',
        password: this.getCachedSecret('NEO4J_PASSWORD'),
        database: process.env.NEO4J_DATABASE || 'neo4j',
        tlsLevel: (process.env.NEO4J_TLS_LEVEL as any) || 'OPTIONAL'
      },
      connectors: {
        github: {
          token: this.getCachedSecret('GITHUB_TOKEN'),
          webhookSecret: this.getCachedSecret('GITHUB_WEBHOOK_SECRET')
        },
        slack: {
          botToken: this.getCachedSecret('SLACK_BOT_TOKEN'),
          signingSecret: this.getCachedSecret('SLACK_SIGNING_SECRET')
        },
        confluence: {
          apiToken: this.getCachedSecret('CONFLUENCE_API_TOKEN'),
          userEmail: process.env.CONFLUENCE_USER_EMAIL || ''
        }
      },
      encryption: {
        keyRotationDays: parseInt(process.env.KEY_ROTATION_DAYS || '90'),
        algorithm: 'AES-256-GCM',
        keyDerivation: 'PBKDF2'
      }
    };
  }
  
  private async getCachedSecret(key: string): Promise<string> {
    const cached = this.configCache.get(key);
    
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }
    
    const value = await this.secretManager.getSecret(key);
    const expires = Date.now() + (5 * 60 * 1000); // 5 minute cache
    
    this.configCache.set(key, { value, expires });
    return value;
  }
}
```

## 🔐 Authentication & Authorization

### API Authentication

```typescript
class AuthenticationMiddleware {
  private secretManager: SecretManager;
  
  constructor(secretManager: SecretManager) {
    this.secretManager = secretManager;
  }
  
  async validateApiKey(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }
    
    try {
      const validKeys = await this.getValidApiKeys();
      const keyInfo = validKeys.find(k => k.key === apiKey);
      
      if (!keyInfo) {
        await this.auditFailedAuth(req, 'invalid_api_key');
        return res.status(401).json({ error: 'Invalid API key' });
      }
      
      if (keyInfo.expires && keyInfo.expires < Date.now()) {
        await this.auditFailedAuth(req, 'expired_api_key');
        return res.status(401).json({ error: 'Expired API key' });
      }
      
      // Add key info to request for authorization
      req.auth = keyInfo;
      next();
      
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).json({ error: 'Authentication service unavailable' });
    }
  }
  
  private async getValidApiKeys(): Promise<Array<{key: string; scope: string[]; expires?: number}>> {
    const keysJson = await this.secretManager.getSecret('API_KEYS');
    return JSON.parse(keysJson);
  }
  
  private async auditFailedAuth(req: Request, reason: string) {
    console.warn(`🚨 Failed authentication: ${reason}`, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path,
      timestamp: new Date().toISOString()
    });
  }
}
```

### Role-Based Access Control

```typescript
interface Permission {
  resource: string; // 'kb:*' | 'kb:confluence-demo' | 'api:status'
  action: string;   // 'read' | 'write' | 'admin'
}

interface Role {
  name: string;
  permissions: Permission[];
}

class AuthorizationService {
  private roles: Map<string, Role> = new Map();
  
  constructor() {
    this.initializeRoles();
  }
  
  private initializeRoles() {
    this.roles.set('reader', {
      name: 'reader',
      permissions: [
        { resource: 'api:status', action: 'read' },
        { resource: 'kb:*', action: 'read' },
        { resource: 'api:search', action: 'read' }
      ]
    });
    
    this.roles.set('writer', {
      name: 'writer', 
      permissions: [
        { resource: 'api:status', action: 'read' },
        { resource: 'kb:*', action: 'read' },
        { resource: 'kb:*', action: 'write' },
        { resource: 'api:search', action: 'read' },
        { resource: 'api:ingest', action: 'write' }
      ]
    });
    
    this.roles.set('admin', {
      name: 'admin',
      permissions: [
        { resource: '*', action: '*' }
      ]
    });
  }
  
  hasPermission(userRoles: string[], resource: string, action: string): boolean {
    for (const roleName of userRoles) {
      const role = this.roles.get(roleName);
      if (!role) continue;
      
      for (const permission of role.permissions) {
        if (this.matchesPermission(permission, resource, action)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  private matchesPermission(permission: Permission, resource: string, action: string): boolean {
    const resourceMatch = permission.resource === '*' || 
                         permission.resource === resource ||
                         (permission.resource.endsWith(':*') && 
                          resource.startsWith(permission.resource.slice(0, -1)));
    
    const actionMatch = permission.action === '*' || permission.action === action;
    
    return resourceMatch && actionMatch;
  }
}
```

## 📊 Security Monitoring

### Audit Logging

```typescript
interface AuditEvent {
  timestamp: number;
  event_type: string;
  component: string;
  user_id?: string;
  resource: string;
  action: string;
  success: boolean;
  details?: any;
  ip_address?: string;
  user_agent?: string;
}

class SecurityAuditLogger {
  private events: AuditEvent[] = [];
  
  async logSecurityEvent(event: Omit<AuditEvent, 'timestamp'>) {
    const auditEvent: AuditEvent = {
      timestamp: Date.now(),
      ...event
    };
    
    this.events.push(auditEvent);
    
    // Write to persistent storage
    await this.writeToAuditLog(auditEvent);
    
    // Alert on suspicious activity
    if (!auditEvent.success) {
      await this.checkForSecurityThreats(auditEvent);
    }
  }
  
  private async checkForSecurityThreats(event: AuditEvent) {
    // Rate limiting: Too many failed attempts
    const recentFailures = this.events.filter(e => 
      e.ip_address === event.ip_address && 
      !e.success && 
      Date.now() - e.timestamp < 300000 // 5 minutes
    );
    
    if (recentFailures.length > 5) {
      await this.triggerSecurityAlert('RATE_LIMIT_EXCEEDED', {
        ip_address: event.ip_address,
        failure_count: recentFailures.length
      });
    }
  }
  
  private async triggerSecurityAlert(type: string, details: any) {
    console.error(`🚨 SECURITY ALERT: ${type}`, details);
    
    // In production, send to security team
    // await this.notifySecurityTeam(type, details);
  }
}
```

### Security Metrics Dashboard

```typescript
// Security metrics endpoint
app.get('/api/security/metrics', requireAuth(['admin']), async (req, res) => {
  const metrics = await securityAuditor.getMetrics();
  
  res.json({
    authentication: {
      successful_logins: metrics.successful_logins,
      failed_logins: metrics.failed_logins,
      active_sessions: metrics.active_sessions,
      suspicious_ips: metrics.suspicious_ips
    },
    authorization: {
      permission_denials: metrics.permission_denials,
      privilege_escalation_attempts: metrics.privilege_escalation_attempts
    },
    secrets: {
      secret_access_count: metrics.secret_access_count,
      failed_secret_retrievals: metrics.failed_secret_retrievals,
      secrets_nearing_expiry: metrics.secrets_nearing_expiry
    },
    data_access: {
      kb_access_count: metrics.kb_access_count,
      unauthorized_access_attempts: metrics.unauthorized_access_attempts,
      data_export_requests: metrics.data_export_requests
    }
  });
});
```

## 🚀 Implementation Roadmap

### Phase 1: Basic Security (Completed)
- ✅ Environment variable configuration
- ✅ Basic input validation
- ✅ HTTPS/TLS support
- ✅ Error message sanitization

### Phase 2: Enhanced Authentication (Next)
- [ ] API key authentication
- [ ] JWT token support
- [ ] OAuth 2.0 integration
- [ ] Multi-factor authentication

### Phase 3: Enterprise Security (Future)
- [ ] Secret management provider integration
- [ ] Role-based access control
- [ ] Comprehensive audit logging
- [ ] Security monitoring dashboard
- [ ] Automated threat detection

### Phase 4: Compliance & Governance (Advanced)
- [ ] GDPR compliance features
- [ ] Data retention policies
- [ ] Privacy impact assessments
- [ ] Compliance reporting
- [ ] Data classification and labeling

## 🔧 Quick Start Guide

### 1. Enable Basic Security

```bash
# Set environment variables
export API_KEY="your-secure-api-key-here"
export NEO4J_PASSWORD="secure-neo4j-password"

# Enable authentication
export ENABLE_AUTH=true
export REQUIRE_API_KEY=true
```

### 2. Configure Secret Management

```typescript
// Initialize secret manager
const secretManager = new SecureConfigManager(
  new EnterpriseSecretManager()
);

// Use in orchestrator
const config = await secretManager.getConfig();
```

### 3. Add Authentication Middleware

```typescript
app.use('/api', new AuthenticationMiddleware(secretManager).validateApiKey);
app.use('/api', new AuthorizationMiddleware().checkPermissions);
```

This security framework provides enterprise-grade protection while maintaining ease of development and deployment flexibility. The modular design allows organizations to adopt security enhancements incrementally based on their specific requirements and compliance needs.
