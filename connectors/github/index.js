const express = require('express');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { Octokit } = require('@octokit/rest');
const cors = require('cors');
require('dotenv').config();

// Initialize the MCP server for the connector
const server = new McpServer({
  name: 'GitHub Connector',
  version: '1.0.0'
});

// Initialize GitHub client
const getOctokit = (auth) => {
  return new Octokit({
    auth: auth || process.env.GITHUB_TOKEN
  });
};

// GitHub API helper functions
class GitHubAPI {
  constructor(auth) {
    this.octokit = getOctokit(auth);
    this.rateLimitRemaining = 5000;
    this.rateLimitReset = new Date();
  }

  async checkRateLimit() {
    try {
      const { data } = await this.octokit.rateLimit.get();
      this.rateLimitRemaining = data.core.remaining;
      this.rateLimitReset = new Date(data.core.reset * 1000);
    } catch (error) {
      console.warn('Could not check rate limit:', error.message);
    }
  }

  async getRepositories(owner, since) {
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
  }

  async getRepository(owner, repo) {
    const { data } = await this.octokit.repos.get({ owner, repo });
    return data;
  }

  async getIssues(owner, repo, since, state = 'all') {
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
  }

  async getPullRequests(owner, repo, since, state = 'all') {
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
  }

  async getCommits(owner, repo, since) {
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
  }

  async getReleases(owner, repo) {
    const { data } = await this.octokit.repos.listReleases({
      owner,
      repo,
      per_page: 100
    });
    return data;
  }

  async getReadme(owner, repo) {
    try {
      const { data } = await this.octokit.repos.getReadme({ owner, repo });
      return {
        content: Buffer.from(data.content, 'base64').toString('utf-8'),
        path: data.path,
        sha: data.sha
      };
    } catch (error) {
      return null;
    }
  }
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
const port = process.env.PORT || 3002;

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
    const { since, owner, repo, data_types } = req.query;
    
    if (!owner) {
      return res.status(400).json({
        error: 'Missing required parameter: owner',
        usage: '/pull?owner=username[&repo=reponame][&since=ISO_DATE][&data_types=repos,issues,prs,commits,releases]'
      });
    }

    const api = new GitHubAPI();
    await api.checkRateLimit();
    
    const documents = [];
    const types = data_types ? data_types.split(',') : ['repos'];

    if (types.includes('repos')) {
      if (repo) {
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
          default_branch: repoData.default_branch
        });
      } else {
        const repos = await api.getRepositories(owner, since);
        for (const repoData of repos.slice(0, 20)) { // Limit for demo
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
            license: repoData.license?.name
          });
        }
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

// Start the server
app.listen(port, () => {
  console.log(`🐙 GitHub Connector running on port ${port}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET  http://localhost:${port}/health`);
  console.log(`   GET  http://localhost:${port}/sources`);
  console.log(`   GET  http://localhost:${port}/pull?owner=username[&repo=reponame]`);
  console.log(`   POST http://localhost:${port}/mcp`);
  console.log('');
  console.log('🔑 Environment variables:');
  console.log(`   GITHUB_TOKEN: ${process.env.GITHUB_TOKEN ? '✅ Set' : '❌ Not set'}`);
});
