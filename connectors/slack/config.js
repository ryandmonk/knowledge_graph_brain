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
    PORT: parseInt(process.env.SLACK_CONNECTOR_PORT || '3003'),
    
    // Slack-specific auth
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
    SLACK_APP_TOKEN: process.env.SLACK_APP_TOKEN,
    
    // Advanced
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    NODE_ENV: process.env.NODE_ENV || 'development'
  };
  
  // Log demo mode status prominently
  if (config.DEMO_MODE) {
    console.log('🎭 Slack Connector: DEMO_MODE is ACTIVE - using mock workspace data');
    console.log('   To disable: Set DEMO_MODE=false in .env file');
  } else if (!config.SLACK_BOT_TOKEN) {
    console.log('⚠️  Slack Connector: No SLACK_BOT_TOKEN provided - will use demo data');
    console.log('   To use real Slack API: Set SLACK_BOT_TOKEN in .env file');
  } else {
    console.log('🔐 Slack Connector: PRODUCTION_MODE - using Slack API with provided token');
  }
  
  return config;
}

module.exports = { config: getConfig() };
