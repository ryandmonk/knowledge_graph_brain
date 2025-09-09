const dotenv = require('dotenv');
const path = require('path');

function getConfig() {
  // Load central configuration first
  const rootDir = path.resolve(__dirname, '../..');
  dotenv.config({ path: path.join(rootDir, '.env') });
  
  // Load service-specific overrides
  dotenv.config({ path: path.join(__dirname, '../.env.local') });
  
  const config = {
    // Demo Mode Control
    DEMO_MODE: process.env.DEMO_MODE?.toLowerCase() === 'true',
    
    // Service Configuration
    PORT: parseInt(process.env.GITHUB_CONNECTOR_PORT || '3001'),
    
    // GitHub-specific auth
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_OWNER: process.env.GITHUB_OWNER, // Legacy single owner support
    GITHUB_REPOSITORIES: process.env.GITHUB_REPOSITORIES, // New multi-repo support
    
    // Advanced
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    NODE_ENV: process.env.NODE_ENV || 'development'
  };
  
  // Parse repository configuration
  config.repositories = parseRepositoryConfig(config);
  
  // Log demo mode status prominently
  if (config.DEMO_MODE) {
    console.log('🎭 GitHub Connector: DEMO_MODE is ACTIVE - using mock repository data');
    console.log('   To disable: Set DEMO_MODE=false in .env file');
  } else if (!config.GITHUB_TOKEN) {
    console.log('⚠️  GitHub Connector: No GITHUB_TOKEN provided - will use demo data');
    console.log('   To use real GitHub API: Set GITHUB_TOKEN in .env file');
  } else {
    console.log('🔐 GitHub Connector: PRODUCTION_MODE - using GitHub API with provided token');
  }
  
  if (config.repositories.length > 0) {
    console.log(`📦 Configured repositories: ${config.repositories.map(r => r.repo === '*' ? `${r.owner}/*` : `${r.owner}/${r.repo}`).join(', ')}`);
  } else {
    console.log('📦 No specific repositories configured - will use query parameters or default to GITHUB_OWNER');
  }
  
  return config;
}

/**
 * Parse repository configuration from environment variables
 * Supports both legacy GITHUB_OWNER and new GITHUB_REPOSITORIES formats
 */
function parseRepositoryConfig(config) {
  const repositories = [];
  
  // New format: GITHUB_REPOSITORIES="owner1/repo1,owner2/repo2,owner3/repo3"
  if (config.GITHUB_REPOSITORIES) {
    const repoList = config.GITHUB_REPOSITORIES.split(',')
      .map(repo => repo.trim())
      .filter(repo => repo.length > 0);
    
    for (const repoString of repoList) {
      const parts = repoString.split('/');
      if (parts.length === 2 && parts[0] && parts[1]) {
        repositories.push({
          owner: parts[0],
          repo: parts[1]
        });
      } else {
        console.warn(`⚠️  Invalid repository format: "${repoString}". Expected format: "owner/repo"`);
      }
    }
  }
  
  // Legacy format: GITHUB_OWNER (fetch all repos for this owner)
  else if (config.GITHUB_OWNER) {
    repositories.push({
      owner: config.GITHUB_OWNER,
      repo: null // null means fetch all repos for this owner
    });
  }
  
  return repositories;
}

module.exports = { config: getConfig() };

module.exports = { config: getConfig() };
