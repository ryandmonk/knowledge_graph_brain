const express = require('express');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { Octokit } = require('@octokit/rest');
const cors = require('cors');
const { config } = require('./config');

// Initialize the MCP server for the connector
const server = new McpServer({
  name: 'GitHub Connector',
  version: '1.0.0'
});

// Initialize GitHub client
const getOctokit = (auth) => {
  return new Octokit({
    auth: auth || config.GITHUB_TOKEN
  });
};

// GitHub API helper functions
class GitHubAPI {
  constructor(auth) {
    this.octokit = getOctokit(auth);
    this.rateLimitRemaining = 5000;
    this.rateLimitReset = new Date();
    this.maxRetries = 3;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async waitForRateLimit() {
    if (this.rateLimitRemaining < 10) {
      const waitTime = Math.max(0, this.rateLimitReset.getTime() - Date.now());
      if (waitTime > 0) {
        console.log(`⏳ Waiting ${Math.round(waitTime / 1000)}s for GitHub rate limit reset...`);
        await this.sleep(waitTime);
      }
    }
  }

  async retryWithBackoff(operation, context = '') {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this.waitForRateLimit();
        const result = await operation();
        
        if (attempt > 1) {
          console.log(`✅ GitHub API call succeeded on attempt ${attempt} - ${context}`);
        }
        return result;
        
      } catch (error) {
        const isRateLimited = error.status === 403 && error.message && error.message.includes('rate limit');
        const isServerError = error.status >= 500;
        const isNetworkError = error.code === 'ENOTFOUND' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT';
        
        if (attempt === this.maxRetries) {
          console.error(`❌ GitHub API call failed after ${this.maxRetries} attempts - ${context}:`, {
            status: error.status,
            message: error.message,
            code: error.code
          });
          throw new Error(`GitHub API error after ${this.maxRetries} attempts: ${error.message}`);
        }
        
        if (isRateLimited) {
          console.warn(`🚨 Rate limited, attempt ${attempt}/${this.maxRetries} - ${context}`);
          await this.sleep(60000); // Wait 1 minute for rate limit
        } else if (isServerError || isNetworkError) {
          const backoffTime = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Exponential backoff, max 30s
          console.warn(`🔄 Retrying GitHub API call in ${backoffTime}ms, attempt ${attempt}/${this.maxRetries} - ${context}:`, error.message);
          await this.sleep(backoffTime);
        } else {
          console.error(`💥 Non-retryable GitHub API error - ${context}:`, {
            status: error.status,
            message: error.message
          });
          throw error;
        }
      }
    }
  }

  async checkRateLimit() {
    try {
      const { data } = await this.octokit.rateLimit.get();
      this.rateLimitRemaining = data.core.remaining;
      this.rateLimitReset = new Date(data.core.reset * 1000);
      
      // Log rate limit status for monitoring
      if (this.rateLimitRemaining < 100) {
        console.warn(`🚨 GitHub rate limit low: ${this.rateLimitRemaining} remaining until ${this.rateLimitReset.toISOString()}`);
      }
      
      return {
        remaining: this.rateLimitRemaining,
        reset: this.rateLimitReset,
        limit: data.core.limit
      };
    } catch (error) {
      console.warn('Could not check rate limit:', error.message);
      return null;
    }
  }

  async getRepositories(owner, since) {
    const operation = async () => {
      const options = {
        username: owner,
        type: 'all',
        sort: 'updated',
        per_page: 100
      };

      if (since) {
        options.since = since;
      }

      const { data } = await this.octokit.repos.listForUser(options);
      return data;
    };

    return await this.retryWithBackoff(operation, `getRepositories(${owner}, ${since || 'no-since'})`);
  }

  async getRepository(owner, repo) {
    const operation = async () => {
      const { data } = await this.octokit.repos.get({ owner, repo });
      return data;
    };

    return await this.retryWithBackoff(operation, `getRepository(${owner}/${repo})`);
  }

  async getIssues(owner, repo, since, state = 'all') {
    const operation = async () => {
      const options = {
        owner,
        repo,
        state,
        sort: 'updated',
        per_page: 100
      };

      if (since) {
        options.since = since;
      }

      const { data } = await this.octokit.issues.listForRepo(options);
      return data;
    };

    return await this.retryWithBackoff(operation, `getIssues(${owner}/${repo}, ${since || 'no-since'})`);
  }

  async getPullRequests(owner, repo, since, state = 'all') {
    const operation = async () => {
      const options = {
        owner,
        repo,
        state,
        sort: 'updated',
        per_page: 100
      };

      if (since) {
        // GitHub API doesn't support since for PRs directly, we'll filter after
      }

      const { data } = await this.octokit.pulls.list(options);
      
      if (since) {
        const sinceDate = new Date(since);
        return data.filter(pr => new Date(pr.updated_at) > sinceDate);
      }
      
      return data;
    };

    return await this.retryWithBackoff(operation, `getPullRequests(${owner}/${repo}, ${since || 'no-since'})`);
  }

  async getCommits(owner, repo, since) {
    const operation = async () => {
      const options = {
        owner,
        repo,
        per_page: 100
      };

      if (since) {
        options.since = since;
      }

      const { data } = await this.octokit.repos.listCommits(options);
      return data;
    };

    return await this.retryWithBackoff(operation, `getCommits(${owner}/${repo}, ${since || 'no-since'})`);
  }

  async getReleases(owner, repo) {
    const operation = async () => {
      const { data } = await this.octokit.repos.listReleases({
        owner,
        repo,
        per_page: 100
      });
      return data;
    };

    return await this.retryWithBackoff(operation, `getReleases(${owner}/${repo})`);
  }

  async getReadme(owner, repo) {
    const operation = async () => {
      try {
        const { data } = await this.octokit.repos.getReadme({ owner, repo });
        return {
          content: Buffer.from(data.content, 'base64').toString('utf-8'),
          path: data.path,
          sha: data.sha
        };
      } catch (error) {
        if (error.status === 404) {
          return null; // No README found
        }
        throw error; // Re-throw other errors for retry logic
      }
    };

    return await this.retryWithBackoff(operation, `getReadme(${owner}/${repo})`);
  }
}

// Demo data for when DEMO_MODE is true or no GITHUB_TOKEN is provided
function getDemoRepositories() {
  return [
    {
      id: 'repo-demo-1',
      type: 'repository',
      title: 'knowledge-graph-demo',
      description: 'Demo repository showcasing knowledge graph concepts and implementations',
      content: '# Knowledge Graph Demo\n\nThis is a demonstration repository showing how to build knowledge graphs.\n\n## Features\n- Neo4j integration\n- Graph data modeling\n- Semantic search capabilities\n- Real-time data ingestion\n\n## Getting Started\n\n```bash\nnpm install\nnpm start\n```\n\nSee the documentation for more details.',
      url: 'https://github.com/demo-org/knowledge-graph-demo',
      language: 'TypeScript',
      stars: 1542,
      forks: 287,
      created_at: '2023-08-15T10:30:00Z',
      updated_at: '2025-08-24T15:45:00Z',
      owner: {
        login: 'demo-org',
        type: 'Organization',
        url: 'https://github.com/demo-org'
      },
      topics: ['knowledge-graph', 'neo4j', 'typescript', 'semantic-search'],
      license: 'MIT',
      default_branch: 'main',
      is_private: false,
      is_fork: false
    },
    {
      id: 'repo-demo-2',
      type: 'repository',
      title: 'ai-agent-toolkit',
      description: 'A comprehensive toolkit for building AI agents with LangChain and knowledge graphs',
      content: '# AI Agent Toolkit\n\nBuild intelligent agents that can reason over knowledge graphs.\n\n## Components\n- LangChain integration\n- Custom tool development\n- Graph-based reasoning\n- Multi-modal capabilities\n\n## Installation\n\n```python\npip install ai-agent-toolkit\n```\n\n## Quick Example\n\n```python\nfrom ai_toolkit import GraphAgent\n\nagent = GraphAgent(graph_uri="bolt://localhost:7687")\nresponse = agent.query("What are the connections between AI and knowledge graphs?")\nprint(response)\n```',
      url: 'https://github.com/demo-user/ai-agent-toolkit',
      language: 'Python',
      stars: 892,
      forks: 156,
      created_at: '2024-01-20T14:20:00Z',
      updated_at: '2025-08-23T09:15:00Z',
      owner: {
        login: 'demo-user',
        type: 'User',
        url: 'https://github.com/demo-user'
      },
      topics: ['ai', 'langchain', 'agents', 'python', 'knowledge-graphs'],
      license: 'Apache-2.0',
      default_branch: 'main',
      is_private: false,
      is_fork: false
    },
    {
      id: 'repo-demo-3',
      type: 'repository',
      title: 'graph-rag-examples',
      description: 'Real-world examples of Graph RAG (Retrieval-Augmented Generation) implementations',
      content: '# Graph RAG Examples\n\nExplore various implementations of Graph RAG across different domains.\n\n## Examples Included\n- Healthcare knowledge graphs\n- Financial data analysis\n- Research paper networks\n- E-commerce recommendations\n\n## Technologies\n- Neo4j\n- OpenAI GPT\n- LangChain\n- Vector embeddings\n\n## Usage\n\nEach example is in its own directory with setup instructions:\n\n```bash\ncd healthcare-example\npython setup.py\npython run_demo.py\n```',
      url: 'https://github.com/graph-rag-community/examples',
      language: 'Jupyter Notebook',
      stars: 2341,
      forks: 423,
      created_at: '2023-11-08T16:45:00Z',
      updated_at: '2025-08-25T11:30:00Z',
      owner: {
        login: 'graph-rag-community',
        type: 'Organization',
        url: 'https://github.com/graph-rag-community'
      },
      topics: ['graph-rag', 'examples', 'jupyter', 'ai', 'tutorials'],
      license: 'MIT',
      default_branch: 'main',
      is_private: false,
      is_fork: false
    }
  ];
}

// Implement the pull capability as a tool
server.registerTool('pull', 'Pull data from GitHub repositories', {
  since: 'string',  // Optional parameter for incremental sync
  owner: 'string',  // GitHub username/org
  repo: 'string',   // Optional specific repo
  data_types: 'array' // Optional: ['repos', 'issues', 'prs', 'commits', 'releases']
}, async ({ since, owner, repo, data_types }) => {
  try {
    const api = new GitHubAPI();
    await api.checkRateLimit();
    
    if (api.rateLimitRemaining < 100) {
      throw new Error(`GitHub rate limit too low: ${api.rateLimitRemaining} remaining`);
    }

    const documents = [];
    const types = data_types || ['repos', 'issues', 'prs', 'commits'];

    if (types.includes('repos')) {
      if (repo) {
        // Get specific repository
        const repoData = await api.getRepository(owner, repo);
        const readme = await api.getReadme(owner, repo);
        
        documents.push({
          id: `repo-${repoData.id}`,
          type: 'repository',
          title: repoData.name,
          description: repoData.description || '',
          content: readme ? readme.content : '',
          url: repoData.html_url,
          language: repoData.language,
          stars: repoData.stargazers_count,
          forks: repoData.forks_count,
          created_at: repoData.created_at,
          updated_at: repoData.updated_at,
          owner: {
            login: repoData.owner.login,
            type: repoData.owner.type,
            url: repoData.owner.html_url
          },
          topics: repoData.topics || [],
          license: repoData.license?.name,
          default_branch: repoData.default_branch,
          is_private: repoData.private,
          is_fork: repoData.fork
        });
      } else {
        // Get all repositories for owner
        const repos = await api.getRepositories(owner, since);
        for (const repoData of repos) {
          const readme = await api.getReadme(owner, repoData.name);
          
          documents.push({
            id: `repo-${repoData.id}`,
            type: 'repository',
            title: repoData.name,
            description: repoData.description || '',
            content: readme ? readme.content : '',
            url: repoData.html_url,
            language: repoData.language,
            stars: repoData.stargazers_count,
            forks: repoData.forks_count,
            created_at: repoData.created_at,
            updated_at: repoData.updated_at,
            owner: {
              login: repoData.owner.login,
              type: repoData.owner.type,
              url: repoData.owner.html_url
            },
            topics: repoData.topics || [],
            license: repoData.license?.name,
            default_branch: repoData.default_branch,
            is_private: repoData.private,
            is_fork: repoData.fork
          });
        }
      }
    }

    if (repo && types.includes('issues')) {
      const issues = await api.getIssues(owner, repo, since);
      for (const issue of issues) {
        if (!issue.pull_request) { // Issues API includes PRs, filter them out
          documents.push({
            id: `issue-${issue.id}`,
            type: 'issue',
            title: issue.title,
            description: issue.body || '',
            content: issue.body || '',
            url: issue.html_url,
            number: issue.number,
            state: issue.state,
            created_at: issue.created_at,
            updated_at: issue.updated_at,
            closed_at: issue.closed_at,
            author: {
              login: issue.user.login,
              type: issue.user.type,
              url: issue.user.html_url
            },
            assignees: issue.assignees.map(a => ({
              login: a.login,
              url: a.html_url
            })),
            labels: issue.labels.map(l => l.name),
            repository: `${owner}/${repo}`,
            comments_count: issue.comments
          });
        }
      }
    }

    if (repo && types.includes('prs')) {
      const prs = await api.getPullRequests(owner, repo, since);
      for (const pr of prs) {
        documents.push({
          id: `pr-${pr.id}`,
          type: 'pull_request',
          title: pr.title,
          description: pr.body || '',
          content: pr.body || '',
          url: pr.html_url,
          number: pr.number,
          state: pr.state,
          draft: pr.draft,
          created_at: pr.created_at,
          updated_at: pr.updated_at,
          closed_at: pr.closed_at,
          merged_at: pr.merged_at,
          author: {
            login: pr.user.login,
            type: pr.user.type,
            url: pr.user.html_url
          },
          assignees: pr.assignees.map(a => ({
            login: a.login,
            url: a.html_url
          })),
          reviewers: pr.requested_reviewers.map(r => ({
            login: r.login,
            url: r.html_url
          })),
          labels: pr.labels.map(l => l.name),
          repository: `${owner}/${repo}`,
          head_branch: pr.head.ref,
          base_branch: pr.base.ref,
          additions: pr.additions,
          deletions: pr.deletions,
          changed_files: pr.changed_files,
          comments_count: pr.comments,
          review_comments_count: pr.review_comments,
          commits_count: pr.commits
        });
      }
    }

    if (repo && types.includes('commits')) {
      const commits = await api.getCommits(owner, repo, since);
      for (const commit of commits.slice(0, 50)) { // Limit commits to avoid overwhelming
        documents.push({
          id: `commit-${commit.sha}`,
          type: 'commit',
          title: commit.commit.message.split('\n')[0],
          description: commit.commit.message,
          content: commit.commit.message,
          url: commit.html_url,
          sha: commit.sha,
          created_at: commit.commit.author.date,
          author: {
            name: commit.commit.author.name,
            email: commit.commit.author.email,
            login: commit.author?.login,
            url: commit.author?.html_url
          },
          committer: {
            name: commit.commit.committer.name,
            email: commit.commit.committer.email,
            login: commit.committer?.login,
            url: commit.committer?.html_url
          },
          repository: `${owner}/${repo}`,
          stats: commit.stats ? {
            additions: commit.stats.additions,
            deletions: commit.stats.deletions,
            total: commit.stats.total
          } : undefined
        });
      }
    }

    if (repo && types.includes('releases')) {
      const releases = await api.getReleases(owner, repo);
      for (const release of releases) {
        documents.push({
          id: `release-${release.id}`,
          type: 'release',
          title: release.name || release.tag_name,
          description: release.body || '',
          content: release.body || '',
          url: release.html_url,
          tag_name: release.tag_name,
          target_commitish: release.target_commitish,
          draft: release.draft,
          prerelease: release.prerelease,
          created_at: release.created_at,
          published_at: release.published_at,
          author: {
            login: release.author.login,
            type: release.author.type,
            url: release.author.html_url
          },
          repository: `${owner}/${repo}`,
          assets: release.assets.map(a => ({
            name: a.name,
            download_count: a.download_count,
            size: a.size,
            url: a.browser_download_url
          }))
        });
      }
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          documents,
          next_since: new Date().toISOString(),
          rate_limit_remaining: api.rateLimitRemaining
        })
      }]
    };
  } catch (error) {
    console.error('Error pulling from GitHub:', error);
    throw new Error(`GitHub API error: ${error.message}`);
  }
});

// Create an Express app to serve the MCP server
const app = express();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const api = new GitHubAPI();
    await api.checkRateLimit();
    
    res.json({ 
      status: 'healthy',
      service: 'github-connector',
      timestamp: new Date().toISOString(),
      rate_limit: {
        remaining: api.rateLimitRemaining,
        reset: api.rateLimitReset
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'github-connector',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// List available data sources
app.get('/sources', (req, res) => {
  res.json([
    {
      id: 'repositories',
      name: 'GitHub Repositories',
      description: 'Repository metadata, README content, and basic info',
      schema: {
        id: 'string',
        title: 'string',
        description: 'string',
        content: 'string',
        url: 'string',
        language: 'string',
        stars: 'number',
        forks: 'number',
        created_at: 'datetime',
        updated_at: 'datetime',
        owner: 'object',
        topics: 'array',
        license: 'string'
      }
    },
    {
      id: 'issues',
      name: 'GitHub Issues',
      description: 'Repository issues with full content',
      schema: {
        id: 'string',
        title: 'string',
        description: 'string',
        content: 'string',
        url: 'string',
        number: 'number',
        state: 'string',
        created_at: 'datetime',
        updated_at: 'datetime',
        author: 'object',
        labels: 'array'
      }
    },
    {
      id: 'pull_requests',
      name: 'GitHub Pull Requests',
      description: 'Pull requests with diffs and review information',
      schema: {
        id: 'string',
        title: 'string',
        description: 'string',
        content: 'string',
        url: 'string',
        number: 'number',
        state: 'string',
        created_at: 'datetime',
        updated_at: 'datetime',
        author: 'object',
        head_branch: 'string',
        base_branch: 'string'
      }
    },
    {
      id: 'commits',
      name: 'GitHub Commits',
      description: 'Git commit history with messages and statistics',
      schema: {
        id: 'string',
        title: 'string',
        description: 'string',
        content: 'string',
        url: 'string',
        sha: 'string',
        created_at: 'datetime',
        author: 'object',
        stats: 'object'
      }
    },
    {
      id: 'releases',
      name: 'GitHub Releases',
      description: 'Release notes and version information',
      schema: {
        id: 'string',
        title: 'string',
        description: 'string',
        content: 'string',
        url: 'string',
        tag_name: 'string',
        created_at: 'datetime',
        published_at: 'datetime',
        author: 'object'
      }
    }
  ]);
});

// Simple pull endpoint for testing
app.get('/pull', async (req, res) => {
  try {
    console.log('📥 GitHub connector: Pull request received');
    
    // Check if we should use demo mode
    if (config.DEMO_MODE || !config.GITHUB_TOKEN) {
      console.log('🎭 GitHub: Using DEMO MODE - returning mock repository data');
      const demoData = getDemoRepositories();
      res.json(demoData);
      return;
    }

    console.log('🔐 GitHub: Using PRODUCTION MODE - fetching real data from GitHub API');
    
    const { since, owner, repo, data_types } = req.query;
    
    // Determine which repositories to process
    let repositoriesToProcess = [];
    
    if (owner && repo) {
      // Specific repository requested via query params (legacy support)
      repositoriesToProcess.push({ owner, repo });
    } else if (owner) {
      // All repos for specific owner requested via query params (legacy support)
      repositoriesToProcess.push({ owner, repo: null });
    } else {
      // Use configured repositories from environment
      repositoriesToProcess = config.repositories || [];
      
      if (repositoriesToProcess.length === 0) {
        return res.status(400).json({
          error: 'No repositories configured. Set GITHUB_REPOSITORIES or GITHUB_OWNER in .env, or use query parameters.',
          usage: '/pull?owner=username[&repo=reponame][&since=ISO_DATE][&data_types=repos,issues,prs,commits,releases]',
          examples: [
            'GITHUB_REPOSITORIES=owner1/repo1,owner2/repo2',
            'GITHUB_OWNER=username (for all repos)',
            'Query: /pull?owner=username&repo=reponame'
          ]
        });
      }
    }

    const api = new GitHubAPI();
    await api.checkRateLimit();
    
    const documents = [];
    const types = data_types ? data_types.split(',') : ['repos'];

    console.log(`📦 Processing ${repositoriesToProcess.length} repository configurations...`);

    // Process each repository configuration
    for (const repoConfig of repositoriesToProcess) {
      const { owner: repoOwner, repo: repoName } = repoConfig;
      
      if (types.includes('repos')) {
        if (repoName) {
          // Specific repository
          console.log(`📁 Fetching specific repository: ${repoOwner}/${repoName}`);
          const repoData = await api.getRepository(repoOwner, repoName);
          const readme = await api.getReadme(repoOwner, repoName);
          
          documents.push({
            id: `repo-${repoData.id}`,
            type: 'repository',
            title: repoData.name,
            description: repoData.description || '',
            content: readme ? readme.content : '',
            url: repoData.html_url,
            language: repoData.language,
            stars: repoData.stargazers_count,
            forks: repoData.forks_count,
            created_at: repoData.created_at,
            updated_at: repoData.updated_at,
            owner: {
              login: repoData.owner.login,
              type: repoData.owner.type,
              url: repoData.owner.html_url
            },
            topics: repoData.topics || [],
            license: repoData.license?.name,
            default_branch: repoData.default_branch
          });
        } else {
          // All repositories for owner
          console.log(`📂 Fetching all repositories for owner: ${repoOwner}`);
          const repos = await api.getRepositories(repoOwner, since);
          for (const repoData of repos.slice(0, 20)) { // Limit for demo
            const readme = await api.getReadme(repoOwner, repoData.name);
            
            documents.push({
              id: `repo-${repoData.id}`,
              type: 'repository',
              title: repoData.name,
              description: repoData.description || '',
              content: readme ? readme.content : '',
              url: repoData.html_url,
              language: repoData.language,
              stars: repoData.stargazers_count,
              forks: repoData.forks_count,
              created_at: repoData.created_at,
              updated_at: repoData.updated_at,
              owner: {
                login: repoData.owner.login,
                type: repoData.owner.type,
                url: repoData.owner.html_url
              },
              topics: repoData.topics || [],
              license: repoData.license?.name
            });
          }
        }
      }

      // Handle other data types (issues, PRs, etc.) for each repository
      if (repoName && (types.includes('issues') || types.includes('prs') || types.includes('commits') || types.includes('releases'))) {
        if (types.includes('issues')) {
          const issues = await api.getIssues(repoOwner, repoName, since);
          // ... existing issue processing logic would go here
        }
        
        if (types.includes('prs')) {
          const prs = await api.getPullRequests(repoOwner, repoName, since);
          // ... existing PR processing logic would go here
        }
        
        // Similar for commits and releases...
      }
    }

    console.log(`📄 Serving ${documents.length} GitHub documents via /pull endpoint`);
    res.json(documents);
  } catch (error) {
    console.error('GitHub pull error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Set up the MCP endpoint
app.post('/mcp', async (req, res) => {
  try {
    const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
    const { randomUUID } = require('crypto');
    
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });
    
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// Start the server only if not in test environment
if (require.main === module) {
  // Start the server
  app.listen(config.PORT, () => {
    console.log(`🐙 GitHub Connector running on http://localhost:${config.PORT}`);
    console.log(`📊 Available endpoints:`);
    console.log(`   GET  http://localhost:${config.PORT}/health`);
    console.log(`   GET  http://localhost:${config.PORT}/sources`);
    console.log(`   GET  http://localhost:${config.PORT}/pull?owner=username[&repo=reponame]`);
    console.log(`   POST http://localhost:${config.PORT}/mcp`);
    console.log('');
    console.log('🔑 Configuration:');
    console.log(`   DEMO_MODE: ${config.DEMO_MODE ? '🎭 ACTIVE' : '🔐 DISABLED'}`);
    console.log(`   GITHUB_TOKEN: ${config.GITHUB_TOKEN ? '✅ Set' : '❌ Not set'}`);
    if (config.DEMO_MODE) {
      console.log('   Using mock repository data for demonstration purposes');
    }
  });
}

// Export classes for testing
module.exports = {
  GitHubAPI,
  getDemoRepositories,
  app
};