const neo4j = require('neo4j-driver');

async function completeAuth() {
  const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'password'));
  const session = driver.session();
  
  try {
    console.log('🔧 Completing authentication schema...');
    
    // Create admin role
    await session.run(`
      MERGE (admin:Role {name: 'admin'})
      ON CREATE SET admin.description = 'Full system administration access'
    `);
    
    // Create kb:read permission 
    await session.run(`MERGE (p1:Permission {resource: 'kb', action: 'read'})`);
    
    // Admin gets all permissions
    await session.run(`
      MATCH (admin:Role {name: 'admin'})
      MATCH (p:Permission)
      MERGE (admin)-[:HAS_PERMISSION]->(p)
    `);
    
    // Operator gets kb read/write
    await session.run(`
      MATCH (operator:Role {name: 'operator'})
      MATCH (p:Permission) WHERE p.resource = 'kb' AND p.action IN ['read', 'write']
      MERGE (operator)-[:HAS_PERMISSION]->(p)
    `);
    
    // Viewer gets kb read only
    await session.run(`
      MATCH (viewer:Role {name: 'viewer'})
      MATCH (p:Permission) WHERE p.resource = 'kb' AND p.action = 'read'
      MERGE (viewer)-[:HAS_PERMISSION]->(p)
    `);
    
    // Verify assignments
    const result = await session.run(`
      MATCH (r:Role)-[:HAS_PERMISSION]->(p:Permission) 
      RETURN r.name as role, COUNT(p) as permissions 
      ORDER BY r.name
    `);
    
    console.log('✅ Role-permission assignments:');
    result.records.forEach(record => {
      console.log(`   ${record.get('role')}: ${record.get('permissions')} permissions`);
    });
    
    console.log('🎯 Authentication schema complete!');
    
  } finally {
    await session.close();
    await driver.close();
  }
}

completeAuth();
