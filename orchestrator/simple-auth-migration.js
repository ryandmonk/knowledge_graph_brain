// Simple migration runner using direct Neo4j connection
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
    const migrationPath = path.join(__dirname, '../infra/migrations/002_auth.cypher');
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
        console.log(`   ${index + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
        try {
          await session.run(statement);
        } catch (error) {
          console.warn(`   ⚠️  Statement ${index + 1} warning:`, error.message);
        }
      }
    }
    
    console.log('✅ Authentication schema migration completed!');
    
    // Verify the schema
    console.log('\n🔍 Verifying schema setup...');
    
    const constraintsResult = await session.run('CALL db.constraints() YIELD description RETURN description');
    const indexesResult = await session.run('CALL db.indexes() YIELD description RETURN description'); 
    const rolesResult = await session.run('MATCH (r:Role) RETURN r.name as role_name, r.description as description');
    
    console.log(`📋 Constraints: ${constraintsResult.records.length}`);
    console.log(`🗂️  Indexes: ${indexesResult.records.length}`);
    console.log(`👥 Default Roles: ${rolesResult.records.length}`);
    
    if (rolesResult.records.length > 0) {
      console.log('   Roles created:');
      rolesResult.records.forEach((record) => {
        const name = record.get('role_name');
        const desc = record.get('description');
        console.log(`   - ${name}: ${desc}`);
      });
    }
    
    console.log('\n✅ Migration verification complete!');
    
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
