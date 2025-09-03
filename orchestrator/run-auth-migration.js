// Manual migration runner to set up authentication schema
import { initDriver, executeCypher, getDriver } from '../src/ingest/index.js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runAuthMigration() {
  console.log('🔧 Running Authentication Schema Migration...');
  
  try {
    // Initialize Neo4j driver
    initDriver();
    console.log('✅ Neo4j driver initialized');
    
    // Read migration file
    const migrationPath = join(__dirname, '../infra/migrations/002_auth.cypher');
    const migrationCypher = readFileSync(migrationPath, 'utf-8');
    
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
        await executeCypher(statement);
      }
    }
    
    console.log('✅ Authentication schema migration completed successfully!');
    
    // Verify the schema
    console.log('\n🔍 Verifying schema setup...');
    
    const constraints = await executeCypher('CALL db.constraints() YIELD description RETURN description');
    const indexes = await executeCypher('CALL db.indexes() YIELD description RETURN description');
    const roles = await executeCypher('MATCH (r:Role) RETURN r.name as role_name, r.description');
    
    console.log(`📋 Constraints: ${constraints.length}`);
    console.log(`🗂️  Indexes: ${indexes.length}`);  
    console.log(`👥 Default Roles: ${roles.length}`);
    
    if (roles.length > 0) {
      console.log('   Roles created:');
      roles.forEach((role) => {
        console.log(`   - ${role.role_name}: ${role.description}`);
      });
    }
    
    await getDriver().close();
    console.log('✅ Migration verification complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  runAuthMigration();
}

export { runAuthMigration };
