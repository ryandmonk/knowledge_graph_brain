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
    GITHUB_OWNER: process.env.GITHUB_OWNER,
    
    // Advanced
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    NODE_ENV: process.env.NODE_ENV || 'development'
  };
  
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
  
  return config;
}

module.exports = { config: getConfig() };
