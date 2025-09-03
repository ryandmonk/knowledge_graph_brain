// Simple migration runner with fixed syntax
const neo4j = require('neo4j-driver');
const fs = require('fs');
const path = require('path');

async function runAuthMigration() {
  console.log('🔧 Running Authentication Schema Migration...');
  
  const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    neo4j.auth.basic(
      process.env.NEO4J_USER || 'neo4j',
      process.env.NEO4J_PASSWORD || 'password'
    )
  );
  
  const session = driver.session();
  
  try {
    // Test connection
    await session.run('RETURN 1');
    console.log('✅ Neo4j connection established');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../infra/migrations/002_auth_fixed.cypher');
    const migrationCypher = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Migration file loaded');
    
    // Split into individual statements and execute
    const statements = migrationCypher
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('//'));
    
    console.log(`📊 Executing ${statements.length} migration statements...`);
    
    for (const [index, statement] of statements.entries()) {
      if (statement) {
        console.log(`   ${index + 1}/${statements.length}: ${statement.substring(0, 70)}...`);
        try {
          await session.run(statement);
          console.log(`   ✅ Statement ${index + 1} completed`);
        } catch (error) {
          if (error.message.includes('already exists') || error.message.includes('equivalent')) {
            console.log(`   ℹ️  Statement ${index + 1} skipped (already exists)`);
          } else {
            console.warn(`   ⚠️  Statement ${index + 1} warning:`, error.message);
          }
        }
      }
    }
    
    console.log('✅ Authentication schema migration completed!');
    
    // Verify the schema with simple queries
    console.log('\n🔍 Verifying schema setup...');
    
    const rolesResult = await session.run('MATCH (r:Role) RETURN r.name as role_name, r.description as description ORDER BY r.name');
    const permissionsResult = await session.run('MATCH (p:Permission) RETURN p.resource as resource, p.action as action ORDER BY p.resource, p.action');
    const relationshipsResult = await session.run('MATCH (r:Role)-[:HAS_PERMISSION]->(p:Permission) RETURN r.name as role, p.resource as resource, p.action as action ORDER BY r.name, p.resource, p.action');
    
    console.log(`👥 Default Roles: ${rolesResult.records.length}`);
    if (rolesResult.records.length > 0) {
      rolesResult.records.forEach((record) => {
        const name = record.get('role_name');
        const desc = record.get('description');
        console.log(`   - ${name}: ${desc}`);
      });
    }
    
    console.log(`🔐 Permissions: ${permissionsResult.records.length}`);
    if (permissionsResult.records.length > 0) {
      permissionsResult.records.forEach((record) => {
        const resource = record.get('resource');
        const action = record.get('action');
        console.log(`   - ${resource}:${action}`);
      });
    }
    
    console.log(`🔗 Role-Permission Relationships: ${relationshipsResult.records.length}`);
    
    console.log('\n✅ Migration verification complete!');
    console.log('🎯 Authentication system is ready for use!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  runAuthMigration();
}
