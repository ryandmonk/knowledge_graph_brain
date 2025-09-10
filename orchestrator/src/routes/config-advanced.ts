import express, { Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { getConfig } from '../config';

const router = express.Router();

// Configuration templates data structure
interface ConfigurationTemplate {
  id: string;
  name: string;
  description: string;
  environment: 'development' | 'staging' | 'production';
  config: Record<string, any>;
  created_at: string;
  metadata: {
    version: string;
    tags: string[];
    recommended_for: string[];
  };
}

interface ConfigurationBackup {
  id: string;
  name: string;
  created_at: string;
  config: Record<string, any>;
  environment: string;
  metadata: {
    created_by: string;
    description?: string;
    config_hash: string;
  };
}

interface ValidationResult {
  field: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string;
  recommendation?: string;
}

// In-memory storage for demo purposes (in production, use database)
let configurationTemplates: ConfigurationTemplate[] = [];
let configurationBackups: ConfigurationBackup[] = [];

/**
 * Initialize default templates
 */
function initializeDefaultTemplates() {
  if (configurationTemplates.length === 0) {
    configurationTemplates = [
      {
        id: 'dev-local',
        name: 'Local Development',
        description: 'Standard local development configuration with default security settings',
        environment: 'development',
        config: {
          DEMO_MODE: true,
          NEO4J_URI: 'bolt://localhost:7687',
          NEO4J_USER: 'neo4j',
          NEO4J_PASSWORD: 'password',
          NEO4J_DATABASE: 'neo4j',
          EMBEDDING_PROVIDER: 'ollama',
          OLLAMA_BASE_URL: 'http://localhost:11434',
          LLM_MODEL: 'qwen3:8b',
          EMBEDDING_MODEL: 'mxbai-embed-large'
        },
        created_at: new Date().toISOString(),
        metadata: {
          version: '1.0.0',
          tags: ['development', 'local', 'default'],
          recommended_for: ['new-developers', 'quick-setup', 'testing']
        }
      },
      {
        id: 'staging-secure',
        name: 'Staging Environment',
        description: 'Staging configuration with enhanced security and monitoring',
        environment: 'staging',
        config: {
          DEMO_MODE: false,
          NEO4J_URI: 'bolt://staging-neo4j:7687',
          NEO4J_USER: 'app_user',
          NEO4J_DATABASE: 'staging_kb',
          EMBEDDING_PROVIDER: 'openai',
          LLM_MODEL: 'gpt-4',
          EMBEDDING_MODEL: 'text-embedding-3-small'
        },
        created_at: new Date().toISOString(),
        metadata: {
          version: '1.0.0',
          tags: ['staging', 'secure', 'pre-production'],
          recommended_for: ['testing', 'qa-validation', 'performance-testing']
        }
      },
      {
        id: 'prod-enterprise',
        name: 'Production Enterprise',
        description: 'Production-ready configuration with maximum security and performance',
        environment: 'production',
        config: {
          DEMO_MODE: false,
          NEO4J_URI: 'bolt://prod-neo4j-cluster:7687',
          NEO4J_USER: 'kb_app_user',
          NEO4J_DATABASE: 'production_kb',
          EMBEDDING_PROVIDER: 'openai',
          LLM_MODEL: 'gpt-4-turbo',
          EMBEDDING_MODEL: 'text-embedding-3-large'
        },
        created_at: new Date().toISOString(),
        metadata: {
          version: '1.0.0',
          tags: ['production', 'enterprise', 'high-security'],
          recommended_for: ['production-deployment', 'enterprise-clients', 'high-scale']
        }
      }
    ];
  }
}

/**
 * Comprehensive configuration validation
 * GET /api/config/validation
 */
router.get('/validation', async (req: Request, res: Response) => {
  try {
    const currentConfig = getConfig();
    const results: ValidationResult[] = [];

    // Neo4j Configuration Validation
    if (!currentConfig.NEO4J_URI || !currentConfig.NEO4J_URI.match(/^(bolt|neo4j):\/\/.+/)) {
      results.push({
        field: 'NEO4J_URI',
        status: 'error',
        message: 'Invalid Neo4j URI format',
        details: 'URI must start with bolt:// or neo4j://',
        recommendation: 'Use format: bolt://hostname:7687 or neo4j://hostname:7687'
      });
    } else {
      results.push({
        field: 'NEO4J_URI',
        status: 'success',
        message: 'Neo4j URI format is valid'
      });
    }

    // Security Validation
    if (currentConfig.NEO4J_PASSWORD === 'password') {
      results.push({
        field: 'NEO4J_PASSWORD',
        status: 'warning',
        message: 'Using default Neo4j password',
        details: 'Default passwords are a security risk in production',
        recommendation: 'Change to a strong, unique password for production use'
      });
    } else if (currentConfig.NEO4J_PASSWORD && currentConfig.NEO4J_PASSWORD.length < 8) {
      results.push({
        field: 'NEO4J_PASSWORD',
        status: 'warning',
        message: 'Neo4j password is too short',
        details: 'Password should be at least 8 characters long',
        recommendation: 'Use a strong password with at least 8 characters'
      });
    } else if (currentConfig.NEO4J_PASSWORD) {
      results.push({
        field: 'NEO4J_PASSWORD',
        status: 'success',
        message: 'Neo4j password meets basic requirements'
      });
    }

    // AI Provider Validation
    if (currentConfig.EMBEDDING_PROVIDER === 'openai') {
      if (!currentConfig.OPENAI_API_KEY) {
        results.push({
          field: 'OPENAI_API_KEY',
          status: 'error',
          message: 'OpenAI API key required',
          details: 'OpenAI provider selected but no API key configured',
          recommendation: 'Add your OpenAI API key or switch to Ollama provider'
        });
      } else if (!currentConfig.OPENAI_API_KEY.startsWith('sk-')) {
        results.push({
          field: 'OPENAI_API_KEY',
          status: 'warning',
          message: 'OpenAI API key format may be invalid',
          details: 'OpenAI API keys typically start with "sk-"',
          recommendation: 'Verify your API key is correct'
        });
      } else {
        results.push({
          field: 'OPENAI_API_KEY',
          status: 'success',
          message: 'OpenAI API key format appears valid'
        });
      }
    }

    // Performance and Network Validation
    if (currentConfig.OLLAMA_BASE_URL && !currentConfig.OLLAMA_BASE_URL.includes('localhost')) {
      results.push({
        field: 'OLLAMA_BASE_URL',
        status: 'warning',
        message: 'Using remote Ollama instance',
        details: 'Remote instances may have higher latency and network dependencies',
        recommendation: 'Consider local Ollama instance for better performance'
      });
    }

    // Environment Configuration Validation
    if (!currentConfig.DEMO_MODE && currentConfig.NEO4J_PASSWORD === 'password') {
      results.push({
        field: 'DEMO_MODE',
        status: 'warning',
        message: 'Production mode with default credentials',
        details: 'Demo mode is disabled but using default Neo4j password',
        recommendation: 'Enable demo mode for testing or change default credentials'
      });
    }

    // Model Configuration Validation
    if (!currentConfig.LLM_MODEL) {
      results.push({
        field: 'LLM_MODEL',
        status: 'error',
        message: 'No LLM model specified',
        details: 'LLM model is required for text processing',
        recommendation: 'Set LLM_MODEL to qwen3:8b (Ollama) or gpt-3.5-turbo (OpenAI)'
      });
    }

    if (!currentConfig.EMBEDDING_MODEL) {
      results.push({
        field: 'EMBEDDING_MODEL',
        status: 'error',
        message: 'No embedding model specified',
        details: 'Embedding model is required for vector operations',
        recommendation: 'Set EMBEDDING_MODEL to mxbai-embed-large (Ollama) or text-embedding-3-small (OpenAI)'
      });
    }

    res.json({
      success: true,
      validation_results: results,
      summary: {
        total_checks: results.length,
        errors: results.filter(r => r.status === 'error').length,
        warnings: results.filter(r => r.status === 'warning').length,
        successes: results.filter(r => r.status === 'success').length,
        overall_status: results.some(r => r.status === 'error') ? 'error' : 
                      results.some(r => r.status === 'warning') ? 'warning' : 'success'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Configuration validation error:', error);
    res.status(500).json({
      error: 'Failed to validate configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get configuration templates
 * GET /api/config/templates
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    initializeDefaultTemplates();

    const { environment, tags } = req.query;

    let filteredTemplates = [...configurationTemplates];

    // Filter by environment if specified
    if (environment) {
      filteredTemplates = filteredTemplates.filter(t => t.environment === environment);
    }

    // Filter by tags if specified
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      filteredTemplates = filteredTemplates.filter(t => 
        tagArray.some(tag => t.metadata.tags.includes(tag as string))
      );
    }

    res.json({
      success: true,
      templates: filteredTemplates,
      total_count: filteredTemplates.length,
      available_environments: ['development', 'staging', 'production'],
      available_tags: [...new Set(configurationTemplates.flatMap(t => t.metadata.tags))]
    });

  } catch (error) {
    console.error('Failed to get configuration templates:', error);
    res.status(500).json({
      error: 'Failed to get configuration templates',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create configuration template
 * POST /api/config/templates
 */
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const { name, description, environment, config, tags = [], recommended_for = [] } = req.body;

    if (!name || !description || !environment || !config) {
      return res.status(400).json({
        error: 'Missing required fields: name, description, environment, and config are required'
      });
    }

    const template: ConfigurationTemplate = {
      id: `custom-${Date.now()}`,
      name,
      description,
      environment,
      config,
      created_at: new Date().toISOString(),
      metadata: {
        version: '1.0.0',
        tags: [...tags, 'custom'],
        recommended_for
      }
    };

    configurationTemplates.push(template);

    res.status(201).json({
      success: true,
      message: 'Configuration template created successfully',
      template
    });

  } catch (error) {
    console.error('Failed to create configuration template:', error);
    res.status(500).json({
      error: 'Failed to create configuration template',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get configuration backups
 * GET /api/config/backups
 */
router.get('/backups', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      backups: configurationBackups.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
      total_count: configurationBackups.length
    });

  } catch (error) {
    console.error('Failed to get configuration backups:', error);
    res.status(500).json({
      error: 'Failed to get configuration backups',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create configuration backup
 * POST /api/config/backups
 */
router.post('/backups', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Backup name is required'
      });
    }

    const currentConfig = getConfig();
    const configHash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify(currentConfig))
      .digest('hex');

    const backup: ConfigurationBackup = {
      id: `backup-${Date.now()}`,
      name,
      created_at: new Date().toISOString(),
      config: currentConfig,
      environment: currentConfig.DEMO_MODE ? 'development' : 'production',
      metadata: {
        created_by: 'system', // In real implementation, get from auth context
        description,
        config_hash: configHash
      }
    };

    configurationBackups.push(backup);

    res.status(201).json({
      success: true,
      message: 'Configuration backup created successfully',
      backup: {
        ...backup,
        config: undefined // Don't return config in list response for security
      }
    });

  } catch (error) {
    console.error('Failed to create configuration backup:', error);
    res.status(500).json({
      error: 'Failed to create configuration backup',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get specific configuration backup
 * GET /api/config/backups/:id
 */
router.get('/backups/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const backup = configurationBackups.find(b => b.id === id);

    if (!backup) {
      return res.status(404).json({
        error: 'Configuration backup not found'
      });
    }

    res.json({
      success: true,
      backup
    });

  } catch (error) {
    console.error('Failed to get configuration backup:', error);
    res.status(500).json({
      error: 'Failed to get configuration backup',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Delete configuration backup
 * DELETE /api/config/backups/:id
 */
router.delete('/backups/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const index = configurationBackups.findIndex(b => b.id === id);

    if (index === -1) {
      return res.status(404).json({
        error: 'Configuration backup not found'
      });
    }

    configurationBackups.splice(index, 1);

    res.json({
      success: true,
      message: 'Configuration backup deleted successfully'
    });

  } catch (error) {
    console.error('Failed to delete configuration backup:', error);
    res.status(500).json({
      error: 'Failed to delete configuration backup',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Security validation for configuration
 * GET /api/config/security
 */
router.get('/security', async (req: Request, res: Response) => {
  try {
    const currentConfig = getConfig();
    const securityChecks = [];

    // Password security checks
    if (currentConfig.NEO4J_PASSWORD === 'password') {
      securityChecks.push({
        check: 'default_password',
        status: 'critical',
        message: 'Using default Neo4j password',
        risk_level: 'high',
        recommendation: 'Change to a strong, unique password immediately',
        cve_references: []
      });
    }

    // API key exposure checks
    if (currentConfig.OPENAI_API_KEY && currentConfig.OPENAI_API_KEY.length < 20) {
      securityChecks.push({
        check: 'api_key_format',
        status: 'warning',
        message: 'OpenAI API key appears too short',
        risk_level: 'medium',
        recommendation: 'Verify API key is valid and not truncated'
      });
    }

    // Network security checks
    if (currentConfig.NEO4J_URI && !currentConfig.NEO4J_URI.includes('localhost')) {
      securityChecks.push({
        check: 'network_exposure',
        status: 'info',
        message: 'Neo4j configured for remote access',
        risk_level: 'low',
        recommendation: 'Ensure network security measures are in place'
      });
    }

    // Demo mode security check
    if (!currentConfig.DEMO_MODE) {
      securityChecks.push({
        check: 'production_mode',
        status: 'info',
        message: 'System configured for production mode',
        risk_level: 'low',
        recommendation: 'Ensure all security best practices are followed'
      });
    }

    res.json({
      success: true,
      security_status: securityChecks.some(c => c.status === 'critical') ? 'critical' :
                     securityChecks.some(c => c.status === 'warning') ? 'warning' : 'good',
      security_checks: securityChecks,
      summary: {
        total_checks: securityChecks.length,
        critical_issues: securityChecks.filter(c => c.status === 'critical').length,
        warnings: securityChecks.filter(c => c.status === 'warning').length,
        recommendations: securityChecks.length
      },
      last_check: new Date().toISOString()
    });

  } catch (error) {
    console.error('Security validation error:', error);
    res.status(500).json({
      error: 'Failed to perform security validation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
