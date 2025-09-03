import neo4j, { Driver, Session } from 'neo4j-driver';

/**
 * Neo4j service wrapper for shared functionality
 */
export class Neo4jService {
  private driver: Driver;
  private database: string;

  constructor(driver: Driver, database: string = 'neo4j') {
    this.driver = driver;
    this.database = database;
  }

  /**
   * Execute a read query (SELECT, MATCH, etc.)
   */
  async read<T = any>(cypher: string, params: Record<string, any> = {}): Promise<T[]> {
    const session = this.driver.session({ 
      database: this.database,
      defaultAccessMode: neo4j.session.READ 
    });
    
    try {
      const result = await session.run(cypher, params);
      return result.records.map((record: any) => record.toObject() as T);
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a write query (CREATE, MERGE, UPDATE, DELETE)
   */
  async write<T = any>(cypher: string, params: Record<string, any> = {}): Promise<T[]> {
    const session = this.driver.session({ 
      database: this.database,
      defaultAccessMode: neo4j.session.WRITE 
    });
    
    try {
      const result = await session.run(cypher, params);
      return result.records.map((record: any) => record.toObject() as T);
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a transaction with multiple queries
   */
  async transaction<T>(
    txFn: (tx: any) => Promise<T>
  ): Promise<T> {
    const session = this.driver.session({ database: this.database });
    
    try {
      return await session.executeWrite(txFn);
    } finally {
      await session.close();
    }
  }

  /**
   * Check if the database connection is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const session = this.driver.session({ database: this.database });
      try {
        await session.run('RETURN 1');
        return true;
      } finally {
        await session.close();
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    nodeCount: number;
    relationshipCount: number;
    labels: string[];
    relationshipTypes: string[];
  }> {
    const session = this.driver.session({ database: this.database });
    
    try {
      // Get node and relationship counts
      const countResult = await session.run(`
        MATCH (n) 
        WITH count(n) as nodeCount
        MATCH ()-[r]->()
        WITH nodeCount, count(r) as relCount
        RETURN nodeCount, relCount
      `);

      const countsRecord = countResult.records[0];
      const nodeCount = countsRecord?.get('nodeCount')?.toNumber() || 0;
      const relCount = countsRecord?.get('relCount')?.toNumber() || 0;

      // Get labels
      const labelsResult = await session.run('CALL db.labels()');
      const labels = labelsResult.records.map((r: any) => r.get('label'));

      // Get relationship types  
      const relsResult = await session.run('CALL db.relationshipTypes()');
      const relationshipTypes = relsResult.records.map((r: any) => r.get('relationshipType'));

      return {
        nodeCount,
        relationshipCount: relCount,
        labels,
        relationshipTypes
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Close the connection
   */
  async close(): Promise<void> {
    await this.driver.close();
  }
}

/**
 * Factory function to create Neo4jService instance
 */
export function createNeo4jService(
  uri: string = process.env.NEO4J_URI || 'bolt://localhost:7687',
  username: string = process.env.NEO4J_USER || 'neo4j',
  password: string = process.env.NEO4J_PASSWORD || 'password',
  database: string = process.env.NEO4J_DATABASE || 'neo4j'
): Neo4jService {
  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  return new Neo4jService(driver, database);
}
