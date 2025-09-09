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
    
    // Space filtering configuration
    CONFLUENCE_SPACE_KEYS: process.env.CONFLUENCE_SPACE_KEYS,
    
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

/**
 * Parse space keys from configuration
 * Supports both CONFLUENCE_SPACE_KEYS (comma-separated) and backward compatibility
 */
function parseSpaceKeys() {
  const config = getConfig();
  
  // If CONFLUENCE_SPACE_KEYS is configured, use it
  if (config.CONFLUENCE_SPACE_KEYS) {
    return config.CONFLUENCE_SPACE_KEYS
      .split(',')
      .map(key => key.trim())
      .filter(key => key.length > 0);
  }
  
  // If no space keys configured, return empty array (pull from all spaces)
  return [];
}

module.exports = { config: getConfig(), parseSpaceKeys };
