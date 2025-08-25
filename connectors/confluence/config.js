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
    PORT: parseInt(process.env.CONFLUENCE_CONNECTOR_PORT || '3004'),
    
    // Confluence-specific auth
    CONFLUENCE_BASE_URL: process.env.CONFLUENCE_BASE_URL,
    CONFLUENCE_EMAIL: process.env.CONFLUENCE_EMAIL,
    CONFLUENCE_API_TOKEN: process.env.CONFLUENCE_API_TOKEN,
    
    // Advanced
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    NODE_ENV: process.env.NODE_ENV || 'development'
  };
  
  // Log demo mode status prominently
  if (config.DEMO_MODE) {
    console.log('🎭 Confluence Connector: DEMO_MODE is ACTIVE - using mock pages data');
    console.log('   To disable: Set DEMO_MODE=false in .env file');
  } else if (!config.CONFLUENCE_BASE_URL || !config.CONFLUENCE_API_TOKEN) {
    console.log('⚠️  Confluence Connector: Missing credentials - will use demo data');
    console.log('   To use real Confluence API: Set CONFLUENCE_BASE_URL and CONFLUENCE_API_TOKEN in .env file');
  } else {
    console.log('🔐 Confluence Connector: PRODUCTION_MODE - using Confluence API with provided credentials');
  }
  
  return config;
}

module.exports = { config: getConfig() };
