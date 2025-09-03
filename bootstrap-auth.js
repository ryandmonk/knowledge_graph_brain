// Bootstrap authentication system with admin API key
const { AuthenticationService } = require('../shared/dist/auth');
const { createNeo4jService } = require('../shared/dist/neo4j');

async function bootstrapAuth() {
  console.log('🔐 Bootstrapping Authentication System...');
  
  try {
    // Initialize services
    const neo4jService = createNeo4jService();
    const authService = new AuthenticationService(neo4jService);
    
    console.log('✅ Auth service initialized');
    
    // Test database connection
    const isHealthy = await neo4jService.healthCheck();
    if (!isHealthy) {
      throw new Error('Neo4j database is not available');
    }
    console.log('✅ Database connection verified');
    
    // Create admin API key
    const adminKey = await authService.createApiKey({
      name: 'Bootstrap Admin Key',
      roles: ['admin'],
      kb_scopes: ['*'], // Access to all knowledge bases
      description: 'Initial admin API key for system setup',
      created_by: 'bootstrap-script'
    });
    
    console.log('🎯 Admin API Key Created!');
    console.log('📋 Key Details:');
    console.log(`   Key ID: ${adminKey.key_id}`);
    console.log(`   API Key: ${adminKey.api_key}`);
    console.log('');
    console.log('🚨 IMPORTANT: Store this API key securely!');
    console.log('   This key grants full system access and cannot be retrieved again.');
    console.log('');
    console.log('💡 Usage Instructions:');
    console.log('   Include this key in request headers:');
    console.log(`   X-API-Key: ${adminKey.api_key}`);
    console.log('   OR');
    console.log(`   Authorization: Bearer ${adminKey.api_key}`);
    console.log('');
    console.log('🔗 Test the authentication:');
    console.log(`   curl -H "X-API-Key: ${adminKey.api_key}" http://localhost:3000/api/auth/me`);
    console.log('');
    
    // List all API keys to verify
    const allKeys = await authService.listApiKeys();
    console.log(`✅ Total API keys in system: ${allKeys.length}`);
    
    await neo4jService.close();
    console.log('✅ Bootstrap complete!');
    
  } catch (error) {
    console.error('❌ Bootstrap failed:', error);
    process.exit(1);
  }
}

// Run bootstrap if called directly
if (require.main === module) {
  bootstrapAuth();
}

module.exports = { bootstrapAuth };
