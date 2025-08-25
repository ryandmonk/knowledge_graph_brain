# GitHub Connector

A comprehensive connector for ingesting GitHub data into Knowledge Graph Brain, including repositories, issues, pull requests, commits, and releases.

## Features

- **Repository Data**: Repository metadata, README content, topics, languages, and statistics
- **Issues**: Full issue content with labels, assignees, and comments count
- **Pull Requests**: PR data with diff statistics, reviews, and merge information
- **Commits**: Commit history with messages and change statistics
- **Releases**: Release notes, assets, and version information
- **Rate Limiting**: Built-in GitHub API rate limit monitoring
- **Incremental Sync**: Support for incremental updates using timestamps

## Setup

### 1. Install Dependencies
```bash
cd connectors/github
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your GitHub token
```

Required environment variables:
- `GITHUB_TOKEN`: GitHub personal access token with repo access
- `PORT`: Port to run the connector (default: 3002)

### 3. GitHub Token Setup

1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate a new token with these scopes:
   - `repo` (for private repositories)
   - `public_repo` (for public repositories)
   - `read:org` (for organization data)
   - `read:user` (for user information)

### 4. Start the Connector
```bash
npm start
```

## API Endpoints

### Health Check
```
GET /health
```
Returns connector status and GitHub API rate limit information.

### Data Sources
```
GET /sources
```
Lists available data source types (repositories, issues, pull requests, commits, releases).

### Pull Data
```
GET /pull?owner=username[&repo=reponame][&since=ISO_DATE][&data_types=repos,issues,prs,commits,releases]
```

Parameters:
- `owner` (required): GitHub username or organization
- `repo` (optional): Specific repository name
- `since` (optional): ISO 8601 timestamp for incremental sync
- `data_types` (optional): Comma-separated list of data types to fetch

### MCP Endpoint
```
POST /mcp
```
Model Context Protocol endpoint for AI agent integration.

## Usage Examples

### Basic Repository Data
```bash
# Get all repositories for a user
curl "http://localhost:3002/pull?owner=torvalds"

# Get specific repository with all data types
curl "http://localhost:3002/pull?owner=torvalds&repo=linux&data_types=repos,issues,prs,commits,releases"
```

### Incremental Sync
```bash
# Get updates since specific date
curl "http://localhost:3002/pull?owner=facebook&since=2024-01-01T00:00:00Z"
```

### Integration with Knowledge Graph Brain

1. **Register Schema**:
```yaml
# Use examples/github.yaml
kb_id: github-kb
name: GitHub Knowledge Base
# ... (see full schema file)
```

2. **Add Data Sources**:
```bash
# Register the schema
curl -X POST http://localhost:3000/api/register-schema \
  -H "Content-Type: application/json" \
  -d @examples/github.yaml

# Ingest repository data
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"kb_id": "github-kb", "source_id": "github-repos"}'
```

## Data Schema

### Repository Node
- Basic metadata (name, description, language)
- Statistics (stars, forks, size)
- README content for semantic search
- Topics and license information
- Ownership and creation timestamps

### Issue Node
- Full issue content and metadata
- State tracking (open/closed)
- Labels and assignee information
- Comment counts and activity metrics

### Pull Request Node
- PR description and review status
- Branch information (head/base)
- Diff statistics (additions/deletions)
- Merge status and timestamps

### Commit Node
- Commit messages for code change context
- Author and committer information
- File change statistics
- SHA hashes for exact references

### Release Node
- Release notes and changelog content
- Version tags and target branches
- Asset information and download counts
- Draft and prerelease flags

## Relationships

- `OWNS`: Person → Repository
- `AUTHORED_BY`: Content → Person
- `ASSIGNED_TO`: Issue/PR → Person
- `BELONGS_TO`: Content → Repository
- `REVIEWS`: Person → PullRequest
- `COMMITS_TO`: Person → Repository

## Rate Limits

GitHub API has rate limits:
- **Authenticated requests**: 5,000 requests per hour
- **Unauthenticated requests**: 60 requests per hour

The connector automatically monitors rate limits and provides warnings when approaching limits.

## Error Handling

- **Authentication errors**: Invalid or expired GitHub token
- **Rate limit errors**: When API quota is exhausted  
- **Repository access errors**: Private repos or insufficient permissions
- **Network errors**: Connection issues with GitHub API

## Best Practices

1. **Use Personal Access Tokens**: More reliable than OAuth for batch operations
2. **Implement Incremental Sync**: Use `since` parameter to avoid re-processing unchanged data
3. **Monitor Rate Limits**: Check `/health` endpoint before large ingestion operations
4. **Batch Operations**: Process multiple repositories in single ingestion run
5. **Filter Data Types**: Only ingest needed data types to conserve API quota
