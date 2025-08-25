const express = require('express');
const cors = require('cors');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

const app = express();
const port = 3004;

app.use(cors());
app.use(express.json());

// Confluence API configuration
const CONFLUENCE_BASE_URL = process.env.CONFLUENCE_BASE_URL || 'https://your-domain.atlassian.net';
const CONFLUENCE_API_TOKEN = process.env.CONFLUENCE_API_TOKEN;
const CONFLUENCE_USER_EMAIL = process.env.CONFLUENCE_USER_EMAIL;

class ConfluenceAPI {
  constructor() {
    this.baseURL = CONFLUENCE_BASE_URL;
    this.apiToken = CONFLUENCE_API_TOKEN;
    this.userEmail = CONFLUENCE_USER_EMAIL;
    
    if (!this.apiToken || !this.userEmail) {
      console.warn('⚠️  Confluence API token or user email not configured');
    }
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}/wiki/api/v2${endpoint}`;
    
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add basic auth if credentials are available
    if (this.apiToken && this.userEmail) {
      const auth = Buffer.from(`${this.userEmail}:${this.apiToken}`).toString('base64');
      headers.Authorization = `Basic ${auth}`;
    }

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Confluence API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async getSpaces(options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit);
    if (options.cursor) params.set('cursor', options.cursor);
    if (options.status) params.set('status', options.status);
    if (options.type) params.set('type', options.type);
    
    const endpoint = `/spaces?${params.toString()}`;
    return await this.makeRequest(endpoint);
  }

  async getPages(options = {}) {
    const params = new URLSearchParams();
    if (options.spaceId) {
      if (Array.isArray(options.spaceId)) {
        params.set('space-id', options.spaceId.join(','));
      } else {
        params.set('space-id', options.spaceId);
      }
    }
    if (options.limit) params.set('limit', options.limit);
    if (options.cursor) params.set('cursor', options.cursor);
    if (options.status) params.set('status', options.status);
    if (options.title) params.set('title', options.title);
    if (options.bodyFormat) params.set('body-format', options.bodyFormat);
    
    const endpoint = `/pages?${params.toString()}`;
    return await this.makeRequest(endpoint);
  }

  async getBlogPosts(options = {}) {
    const params = new URLSearchParams();
    if (options.spaceId) {
      if (Array.isArray(options.spaceId)) {
        params.set('space-id', options.spaceId.join(','));
      } else {
        params.set('space-id', options.spaceId);
      }
    }
    if (options.limit) params.set('limit', options.limit);
    if (options.cursor) params.set('cursor', options.cursor);
    if (options.status) params.set('status', options.status);
    if (options.bodyFormat) params.set('body-format', options.bodyFormat);
    
    const endpoint = `/blogposts?${params.toString()}`;
    return await this.makeRequest(endpoint);
  }

  async getAttachments(options = {}) {
    const params = new URLSearchParams();
    if (options.mediaType) params.set('mediaType', options.mediaType);
    if (options.filename) params.set('filename', options.filename);
    if (options.limit) params.set('limit', options.limit);
    if (options.cursor) params.set('cursor', options.cursor);
    
    const endpoint = `/attachments?${params.toString()}`;
    return await this.makeRequest(endpoint);
  }

  async getComments(options = {}) {
    const params = new URLSearchParams();
    if (options.bodyFormat) params.set('body-format', options.bodyFormat);
    if (options.limit) params.set('limit', options.limit);
    if (options.cursor) params.set('cursor', options.cursor);
    
    const endpoint = `/footer-comments?${params.toString()}`;
    return await this.makeRequest(endpoint);
  }

  async getTasks(options = {}) {
    const params = new URLSearchParams();
    if (options.status) params.set('status', options.status);
    if (options.spaceId) {
      if (Array.isArray(options.spaceId)) {
        params.set('space-id', options.spaceId.join(','));
      } else {
        params.set('space-id', options.spaceId);
      }
    }
    if (options.limit) params.set('limit', options.limit);
    if (options.cursor) params.set('cursor', options.cursor);
    
    const endpoint = `/tasks?${params.toString()}`;
    return await this.makeRequest(endpoint);
  }
}

const confluenceAPI = new ConfluenceAPI();

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    if (!CONFLUENCE_API_TOKEN || !CONFLUENCE_USER_EMAIL) {
      return res.json({
        status: 'unhealthy',
        service: 'confluence-connector',
        error: 'Confluence authentication not configured',
        timestamp: new Date().toISOString(),
        message: 'Set CONFLUENCE_BASE_URL, CONFLUENCE_API_TOKEN, and CONFLUENCE_USER_EMAIL environment variables'
      });
    }

    // Test authentication by getting spaces
    await confluenceAPI.getSpaces({ limit: 1 });
    
    res.json({
      status: 'healthy',
      service: 'confluence-connector',
      timestamp: new Date().toISOString(),
      baseUrl: CONFLUENCE_BASE_URL,
    });
  } catch (error) {
    res.json({
      status: 'unhealthy',
      service: 'confluence-connector',
      error: `Confluence authentication failed: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
  }
});

// Available data sources endpoint
app.get('/sources', (req, res) => {
  res.json([
    {
      id: 'spaces',
      name: 'Spaces',
      description: 'Confluence spaces and their metadata',
    },
    {
      id: 'pages',
      name: 'Pages',
      description: 'Confluence pages with content and metadata',
    },
    {
      id: 'blog_posts',
      name: 'Blog Posts',
      description: 'Confluence blog posts with content and metadata',
    },
    {
      id: 'attachments',
      name: 'Attachments',
      description: 'File attachments in Confluence',
    },
    {
      id: 'comments',
      name: 'Comments',
      description: 'Comments on pages and blog posts',
    },
    {
      id: 'tasks',
      name: 'Tasks',
      description: 'Tasks from Confluence content',
    },
  ]);
});

// Main data extraction endpoint
app.get('/pull', async (req, res) => {
  try {
    const { data_types = 'pages', space_id, limit = 50, cursor } = req.query;
    
    const types = data_types.split(',').map(t => t.trim());
    const results = [];

    for (const type of types) {
      try {
        let data;
        const options = { limit: parseInt(limit), cursor };
        if (space_id) options.spaceId = space_id;

        switch (type) {
          case 'spaces':
            data = await confluenceAPI.getSpaces(options);
            if (data.results) {
              results.push(...data.results.map(space => ({
                id: `space-${space.id}`,
                title: space.name,
                content: `${space.name}\n${space.description?.plain || ''}`,
                description: space.description?.plain || '',
                url: `${CONFLUENCE_BASE_URL}/wiki/spaces/${space.key}`,
                type: 'space',
                key: space.key,
                status: space.status,
                homepage_id: space.homepageId,
                created_at: space.createdAt,
                author_id: space.authorId,
              })));
            }
            break;

          case 'pages':
            data = await confluenceAPI.getPages({ ...options, bodyFormat: 'storage' });
            if (data.results) {
              results.push(...data.results.map(page => ({
                id: `page-${page.id}`,
                title: page.title,
                content: page.body?.storage?.value || page.title,
                description: page.body?.storage?.value?.substring(0, 500) + '...' || '',
                url: `${CONFLUENCE_BASE_URL}/wiki/spaces/${page.spaceId}/pages/${page.id}`,
                type: 'page',
                space_id: page.spaceId,
                parent_id: page.parentId,
                parent_type: page.parentType,
                status: page.status,
                position: page.position,
                author_id: page.authorId,
                created_at: page.createdAt,
                version: page.version?.number,
              })));
            }
            break;

          case 'blog_posts':
            data = await confluenceAPI.getBlogPosts({ ...options, bodyFormat: 'storage' });
            if (data.results) {
              results.push(...data.results.map(post => ({
                id: `blogpost-${post.id}`,
                title: post.title,
                content: post.body?.storage?.value || post.title,
                description: post.body?.storage?.value?.substring(0, 500) + '...' || '',
                url: `${CONFLUENCE_BASE_URL}/wiki/spaces/${post.spaceId}/blog/${post.id}`,
                type: 'blog_post',
                space_id: post.spaceId,
                status: post.status,
                author_id: post.authorId,
                created_at: post.createdAt,
                version: post.version?.number,
              })));
            }
            break;

          case 'attachments':
            data = await confluenceAPI.getAttachments(options);
            if (data.results) {
              results.push(...data.results.map(attachment => ({
                id: `attachment-${attachment.id}`,
                title: attachment.title,
                content: `Attachment: ${attachment.title}`,
                description: `File: ${attachment.title} (${attachment.mediaType})`,
                url: attachment.downloadUrl,
                type: 'attachment',
                filename: attachment.title,
                media_type: attachment.mediaType,
                file_size: attachment.fileSize,
                created_at: attachment.createdAt,
                version: attachment.version?.number,
              })));
            }
            break;

          case 'comments':
            data = await confluenceAPI.getComments({ ...options, bodyFormat: 'storage' });
            if (data.results) {
              results.push(...data.results.map(comment => ({
                id: `comment-${comment.id}`,
                title: `Comment by ${comment.authorId}`,
                content: comment.body?.storage?.value || '',
                description: comment.body?.storage?.value?.substring(0, 200) + '...' || '',
                url: `${CONFLUENCE_BASE_URL}/wiki/pages/${comment.pageId}`,
                type: 'comment',
                page_id: comment.pageId,
                parent_comment_id: comment.parentCommentId,
                author_id: comment.authorId,
                created_at: comment.createdAt,
                version: comment.version?.number,
              })));
            }
            break;

          case 'tasks':
            data = await confluenceAPI.getTasks(options);
            if (data.results) {
              results.push(...data.results.map(task => ({
                id: `task-${task.id}`,
                title: task.body?.storage?.value || `Task ${task.id}`,
                content: task.body?.storage?.value || '',
                description: `Task assigned to ${task.assignedTo || 'unassigned'}`,
                url: `${CONFLUENCE_BASE_URL}/wiki/pages/${task.pageId}`,
                type: 'task',
                status: task.status,
                page_id: task.pageId,
                space_id: task.spaceId,
                assigned_to: task.assignedTo,
                created_by: task.createdBy,
                completed_by: task.completedBy,
                created_at: task.createdAt,
                updated_at: task.updatedAt,
                due_at: task.dueAt,
                completed_at: task.completedAt,
              })));
            }
            break;

          default:
            console.warn(`Unknown data type: ${type}`);
        }
      } catch (error) {
        console.error(`Error fetching ${type}:`, error);
        // Continue with other types even if one fails
      }
    }

    // If no results and no authentication configured, provide demo data
    if (results.length === 0 && (!CONFLUENCE_API_TOKEN || !CONFLUENCE_USER_EMAIL)) {
      console.log('📝 No authentication configured, providing demo data');
      
      const demoPages = [
        {
          id: 'demo-page-1',
          title: 'Getting Started with Knowledge Graphs',
          content: '<h1>Getting Started with Knowledge Graphs</h1><p>Knowledge graphs are powerful tools for representing and querying interconnected data. They consist of nodes (entities) and edges (relationships) that form a semantic network.</p><h2>Key Concepts</h2><p>- <strong>Nodes</strong>: Represent entities like people, documents, or concepts</p><p>- <strong>Edges</strong>: Represent relationships between entities</p><p>- <strong>Properties</strong>: Additional attributes of nodes and edges</p>',
          url: 'https://demo.atlassian.net/wiki/spaces/DEMO/pages/123456/Getting+Started',
          space: 'DEMO',
          space_key: 'DEMO',
          space_id: 'space-demo-1',
          space_name: 'Demo Knowledge Base',
          space_description: 'A demonstration space for knowledge graph concepts',
          created_at: '2025-01-01T10:00:00Z',
          updated_at: '2025-01-15T14:30:00Z',
          author: {
            account_id: 'user-demo-1',
            display_name: 'Demo Author',
            email: 'demo.author@example.com'
          }
        },
        {
          id: 'demo-page-2', 
          title: 'Neo4j Best Practices',
          content: '<h1>Neo4j Best Practices</h1><p>This page outlines best practices for working with Neo4j graph databases.</p><h2>Schema Design</h2><p>- Use meaningful node labels</p><p>- Define appropriate indexes</p><p>- Model relationships based on query patterns</p><h2>Query Optimization</h2><p>- Use EXPLAIN and PROFILE for query analysis</p><p>- Leverage indexes for performance</p>',
          url: 'https://demo.atlassian.net/wiki/spaces/DEMO/pages/789012/Neo4j+Best+Practices',
          space: 'DEMO',
          space_key: 'DEMO', 
          space_id: 'space-demo-1',
          space_name: 'Demo Knowledge Base',
          space_description: 'A demonstration space for knowledge graph concepts',
          created_at: '2025-01-10T09:15:00Z',
          updated_at: '2025-01-20T16:45:00Z',
          author: {
            account_id: 'user-demo-2',
            display_name: 'Technical Writer',
            email: 'tech.writer@example.com'
          }
        }
      ];
      
      results.push(...demoPages);
    }

    res.json(results);
  } catch (error) {
    console.error('Error in pull endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start HTTP server
app.listen(port, () => {
  console.log(`🚀 Confluence connector running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`📋 Sources: http://localhost:${port}/sources`);
  console.log(`🔄 Pull data: http://localhost:${port}/pull?data_types=spaces,pages`);
  
  if (!CONFLUENCE_API_TOKEN || !CONFLUENCE_USER_EMAIL) {
    console.log(`⚠️  Configure environment variables:`);
    console.log(`   CONFLUENCE_BASE_URL=https://your-domain.atlassian.net`);
    console.log(`   CONFLUENCE_API_TOKEN=your-api-token`);
    console.log(`   CONFLUENCE_USER_EMAIL=your-email@example.com`);
  }
});