import axios from 'axios';

// Define the connector interface
export interface Connector {
  pull(since?: string): Promise<{ documents: any[]; next_since?: string }>;
}

// Connector client implementation
export class ConnectorClient implements Connector {
  private baseUrl: string;
  private authRef: string;
  
  constructor(baseUrl: string, authRef: string) {
    this.baseUrl = baseUrl;
    this.authRef = authRef;
  }
  
  async pull(since?: string): Promise<{ documents: any[]; next_since?: string }> {
    try {
      // In a real implementation, you would use the authRef to authenticate
      // For now, we're just making a GET request to the pull endpoint
      
      const params: any = {};
      if (since) {
        params.since = since;
      }
      
      const response = await axios.get(`${this.baseUrl}/pull`, { params });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to pull from connector: ${(error as Error).message}`);
    }
  }
}