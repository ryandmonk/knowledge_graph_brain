import neo4j, { Driver, Session } from 'neo4j-driver';
import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

export interface Migration {
  version: string;
  name: string;
  applied_at?: number;
  description?: string;
}

export class MigrationRunner {
  private driver: Driver;
  private migrationsPath: string;

  constructor(driver: Driver, migrationsPath?: string) {
    this.driver = driver;
    // Default to project root's infra/migrations, not relative to current working directory
    this.migrationsPath = migrationsPath || resolve(__dirname, '../../../infra/migrations');
  }

  /**
   * Get list of applied migrations from the database
   */
  async getAppliedMigrations(): Promise<Migration[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        'MATCH (m:Migration) RETURN m ORDER BY m.version'
      );
      
      return result.records.map(record => {
        const migration = record.get('m').properties;
        return {
          version: migration.version,
          name: migration.name,
          applied_at: migration.applied_at?.toNumber(),
          description: migration.description
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Get list of available migration files
   */
  getAvailableMigrations(): Migration[] {
    try {
      const files = readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.cypher'))
        .sort();

      return files.map(file => {
        const version = file.split('_')[0];
        const name = file.replace(/^\d+_/, '').replace('.cypher', '').replace(/_/g, ' ');
        
        return {
          version,
          name
        };
      });
    } catch (error) {
      console.warn(`⚠️  Could not read migrations from ${this.migrationsPath}:`, error);
      return [];
    }
  }

  /**
   * Check which migrations need to be applied
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const applied = await this.getAppliedMigrations();
    const available = this.getAvailableMigrations();
    const appliedVersions = new Set(applied.map(m => m.version));

    return available.filter(migration => !appliedVersions.has(migration.version));
  }

  /**
   * Apply a single migration file
   */
  async applyMigration(migration: Migration): Promise<void> {
    const filename = `${migration.version}_${migration.name.replace(/ /g, '_')}.cypher`;
    const filepath = join(this.migrationsPath, filename);
    
    console.log(`📦 Applying migration ${migration.version}: ${migration.name}`);
    
    try {
      const migrationSql = readFileSync(filepath, 'utf-8');
      
      // Split on semicolons and execute each statement
      const statements = migrationSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('//') && !s.startsWith('--'));

      const session = this.driver.session();
      
      try {
        // Execute in a transaction for atomicity
        await session.executeWrite(async tx => {
          for (const statement of statements) {
            if (statement.trim()) {
              await tx.run(statement);
            }
          }
        });
        
        console.log(`✅ Migration ${migration.version} applied successfully`);
        
      } finally {
        await session.close();
      }
      
    } catch (error) {
      console.error(`❌ Failed to apply migration ${migration.version}:`, error);
      throw error;
    }
  }

  /**
   * Apply all pending migrations
   */
  async applyPendingMigrations(): Promise<void> {
    const pending = await this.getPendingMigrations();
    
    if (pending.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    console.log(`📦 Applying ${pending.length} pending migrations...`);
    
    for (const migration of pending) {
      await this.applyMigration(migration);
    }
    
    console.log('🎉 All migrations applied successfully!');
  }

  /**
   * Initialize database with constraints and indexes
   * This is called during system startup
   */
  async initializeDatabase(): Promise<void> {
    console.log('🏗️  Initializing Knowledge Graph Brain database...');
    
    try {
      // Check if we can connect
      const session = this.driver.session();
      await session.run('RETURN 1');
      await session.close();
      
      console.log('✅ Neo4j connection verified');
      
      // Apply any pending migrations
      await this.applyPendingMigrations();
      
      // Verify core constraints exist
      await this.verifyDatabaseSetup();
      
      console.log('🎉 Database initialization complete!');
      
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Verify that core database setup is correct
   */
  async verifyDatabaseSetup(): Promise<void> {
    const session = this.driver.session();
    
    try {
      // Check for core constraints
      const constraintsResult = await session.run('SHOW CONSTRAINTS');
      const constraints = constraintsResult.records.map(r => r.get('name'));
      
      console.log(`📋 Found ${constraints.length} constraints`);
      
      // Check for vector indexes
      const indexesResult = await session.run('SHOW INDEXES YIELD name, type WHERE type = "VECTOR"');
      const vectorIndexes = indexesResult.records.map(r => r.get('name'));
      
      console.log(`🔍 Found ${vectorIndexes.length} vector indexes`);
      
      // Check for Migration nodes
      const migrationsResult = await session.run('MATCH (m:Migration) RETURN count(m) as count');
      const migrationCount = migrationsResult.records[0]?.get('count')?.toNumber() || 0;
      
      console.log(`📝 Applied migrations: ${migrationCount}`);
      
      if (constraints.length === 0) {
        console.warn('⚠️  No constraints found - database may not be properly initialized');
      }
      
    } finally {
      await session.close();
    }
  }

  /**
   * Create constraints for a new KB dynamically
   */
  async createKBConstraints(kb_id: string, schema: any): Promise<void> {
    if (!schema?.schema?.nodes) {
      return;
    }

    console.log(`🔧 Creating constraints for KB: ${kb_id}`);
    
    const session = this.driver.session();
    
    try {
      // Sanitize kb_id for use in constraint names (replace hyphens with underscores)
      const sanitizedKbId = kb_id.replace(/-/g, '_');
      
      for (const node of schema.schema.nodes) {
        const constraintName = `${sanitizedKbId}_${node.label.toLowerCase()}_${node.key}`;
        
        // Create unique constraint for this node type in this KB
        const constraintCypher = `
          CREATE CONSTRAINT ${constraintName} IF NOT EXISTS 
          FOR (n:\`${node.label}\`) REQUIRE (n.kb_id, n.${node.key}) IS UNIQUE
        `;
        
        await session.run(constraintCypher);
        console.log(`✅ Created constraint: ${constraintName}`);

        // Create provenance constraints for this node type
        const provenanceConstraints = [
          { field: 'kb_id', name: `${sanitizedKbId}_${node.label.toLowerCase()}_provenance_kb` },
          { field: 'source_id', name: `${sanitizedKbId}_${node.label.toLowerCase()}_provenance_source` },
          { field: 'run_id', name: `${sanitizedKbId}_${node.label.toLowerCase()}_provenance_run` },
          { field: 'updated_at', name: `${sanitizedKbId}_${node.label.toLowerCase()}_provenance_updated` }
        ];

        for (const prov of provenanceConstraints) {
          try {
            const provCypher = `
              CREATE CONSTRAINT ${prov.name} IF NOT EXISTS 
              FOR (n:\`${node.label}\`) REQUIRE n.${prov.field} IS NOT NULL
            `;
            
            await session.run(provCypher);
            console.log(`✅ Created provenance constraint: ${prov.name}`);
          } catch (error) {
            console.warn(`⚠️  Could not create provenance constraint ${prov.name}:`, error);
          }
        }
      }

      // Create performance indexes for this KB
      await this.createKBPerformanceIndexes(kb_id, schema);

    } catch (error) {
      console.error(`❌ Failed to create constraints for KB ${kb_id}:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Create vector indexes for a KB's embedding strategy
   */
  async createKBVectorIndexes(kb_id: string, schema: any): Promise<void> {
    if (!schema?.embedding?.provider || !schema?.schema?.nodes) {
      return;
    }

    console.log(`🔍 Creating vector indexes for KB: ${kb_id}`);
    
    // Determine embedding dimensions from provider
    let dimensions = 1024; // Default for mxbai-embed-large
    if (schema.embedding.provider.includes('openai')) {
      dimensions = 1536; // text-embedding-ada-002
    } else if (schema.embedding.provider.includes('nomic')) {
      dimensions = 768; // nomic-embed-text
    }

    const session = this.driver.session();
    
    try {
      // Sanitize kb_id for use in index names (replace hyphens with underscores)
      const sanitizedKbId = kb_id.replace(/-/g, '_');
      
      for (const node of schema.schema.nodes) {
        const indexName = `${sanitizedKbId}_${node.label.toLowerCase()}_embeddings`;
        
        // Create vector index for this node type
        const indexCypher = `
          CREATE VECTOR INDEX ${indexName} IF NOT EXISTS
          FOR (n:\`${node.label}\`) ON (n.embedding) 
          OPTIONS {indexConfig: {
            \`vector.dimensions\`: ${dimensions},
            \`vector.similarity_function\`: 'cosine'
          }}
        `;
        
        await session.run(indexCypher);
        console.log(`✅ Created vector index: ${indexName} (${dimensions}D)`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to create vector indexes for KB ${kb_id}:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Create performance indexes for a KB's node types
   */
  async createKBPerformanceIndexes(kb_id: string, schema: any): Promise<void> {
    if (!schema?.schema?.nodes) {
      return;
    }

    console.log(`⚡ Creating performance indexes for KB: ${kb_id}`);
    
    const session = this.driver.session();
    
    try {
      // Sanitize kb_id for use in index names (replace hyphens with underscores)
      const sanitizedKbId = kb_id.replace(/-/g, '_');
      
      for (const node of schema.schema.nodes) {
        const indexPrefix = `${sanitizedKbId}_${node.label.toLowerCase()}`;
        
        // Create common performance indexes
        const indexes = [
          { name: `${indexPrefix}_kb_id`, property: 'kb_id' },
          { name: `${indexPrefix}_source_id`, property: 'source_id' },
          { name: `${indexPrefix}_updated_at`, property: 'updated_at' },
          { name: `${indexPrefix}_created_at`, property: 'created_at' }
        ];

        for (const idx of indexes) {
          try {
            const indexCypher = `
              CREATE INDEX ${idx.name} IF NOT EXISTS 
              FOR (n:\`${node.label}\`) ON (n.${idx.property})
            `;
            
            await session.run(indexCypher);
            console.log(`⚡ Created performance index: ${idx.name}`);
          } catch (error) {
            console.warn(`⚠️  Could not create index ${idx.name}:`, error);
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Failed to create performance indexes for KB ${kb_id}:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }
}
