# Knowledge Graph Brain - Data Connectors

Professional data connectors for integrating diverse data sources into knowledge graphs with **dynamic schema management** and standardized MCP interfaces.

## Overview

Knowledge Graph Brain connectors provide standardized interfaces for extracting data from various sources and transforming it into knowledge graph structures. **As of v1.2.0, all connectors support dynamic URL resolution** - enabling unlimited data source integration without code changes.

### Dynamic Connector Architecture ⭐ **New in v1.2.0**

The system now uses **completely dynamic connector resolution** based on schema mappings:

```yaml
# Schema defines connector URL - no hardcoded logic
mappings:
  sources:
    - source_id: "my-source"  
      connector_url: "http://localhost:8080/api"  # Resolved dynamically
      document_type: "document"
```

**Benefits**:
- ✅ **Zero Code Changes**: Add unlimited data sources without touching orchestrator  
- ✅ **Environment Flexibility**: Different URLs for dev/staging/production
- ✅ **Runtime Resolution**: Connector URLs determined from registered schemas
- ✅ **Infinite Scalability**: No hardcoded connector limitations

## Connector Architecture

### MCP Standard Implementation

All connectors implement a consistent MCP interface:

```typescript
interface MCPConnector {
  // Metadata and capabilities
  getInfo(): ConnectorInfo;
  listCapabilities(): string[];
  
  // Data access
  listSources(): DataSource[];
  getSchema(sourceId: string): SourceSchema;
  fetchData(sourceId: string, options: FetchOptions): DataStream;
  
  // Real-time updates (optional)
  watchChanges?(sourceId: string): EventEmitter;
}
```

### Data Flow Pattern

1. **Discovery**: Connector lists available data sources
2. **Schema Mapping**: Each source provides its data structure
3. **Extraction**: Data is fetched with optional filtering/pagination
4. **Transformation**: Data is transformed according to knowledge base schema
5. **Ingestion**: Transformed data flows into Neo4j knowledge graph

## Available Connectors

**Current connector ecosystem with production status and capabilities:**

| Connector | Status | Port | Auth Method | Primary Objects | Incremental Sync |
|-----------|--------|------|------------|----------------|------------------|
| **Confluence** | 🟢 GA | 3001 | API Token | Pages, Spaces, Comments | ✅ `since` parameter |
| **GitHub** | � GA | 3002 | PAT/OAuth | Repos, Issues, PRs, Commits | ✅ `since` parameter |
| **Slack** | 🟡 Beta | 3003 | Bot Token | Messages, Channels, Users | ✅ `oldest` timestamp |
| **Retail-Mock** | 🔵 Demo | 8081 | None | Products, Orders, Customers | ❌ Static data |

**🚀 New in v0.15.1**: GitHub connector includes [streamlined integration workflow](../docs/workflows/github-integration-guide.md) with automatic embedding generation and simplified schema registration.

### Confluence Connector

**Purpose**: Extract pages, spaces, and user content from Atlassian Confluence

**Location**: `/connectors/confluence/`

**Configuration**:
```yaml
# In knowledge base schema
mappings:
  sources:
    - source_id: confluence-pages
      connector_url: "http://localhost:8080"
      document_type: confluence_page
      extract:
        node: Page
        assign:
          id: "$.id"
          title: "$.title"
          content: "$.body.storage.value"
          space_key: "$.space.key"
          created_at: "$.version.when"
```

**Features**:
- ✅ Page content extraction with full HTML/text conversion
- ✅ Space hierarchy mapping
- ✅ User and author relationship extraction
- ✅ Incremental updates with `--since` filtering
- ✅ Attachment metadata (links to files)
- ✅ Comment extraction and threading
- ✅ Label/tag extraction

**Data Sources**:
- `pages` - All pages across spaces
- `spaces` - Space metadata and hierarchy
- `users` - User profiles and permissions
- `comments` - Page comments and discussions

### GitHub Connector

**Purpose**: Extract repositories, issues, pull requests, and development workflow data from GitHub

**Location**: `/connectors/github/`

**Configuration**:
```yaml
# In knowledge base schema
mappings:
  sources:
    - source_id: github-repo
      connector_url: "http://localhost:3002/pull?owner=user&repo=project"
      document_type: repository
      extract:
        node: Repository
        assign:
          id: "$.id"
          name: "$.name"
          description: "$.description"
          language: "$.language"
          stars: "$.stargazers_count"
          forks: "$.forks_count"
          url: "$.html_url"
```

**Features**:
- 🏗️ Repository metadata with README content and statistics
- 🐛 Issues with labels, assignees, and comments
- 🔀 Pull requests with diff statistics and reviews
- 📝 Commit history with messages and change statistics
- 🚀 Release notes and version information
- ⚡ Built-in rate limiting and GitHub API compliance
- 🔄 Incremental sync using timestamps

**Data Sources**:
- `repositories` - Repository metadata and content
- `issues` - Issue tracking and discussions
- `pull_requests` - Code review and merge data
- `commits` - Development history and changes
- `releases` - Version releases and documentation

**Authentication**:
```bash
# Required environment variables
GITHUB_TOKEN=your_personal_access_token
# Token needs: repo, read:org, read:user scopes
```

### Slack Connector

**Purpose**: Extract messages, channels, and team communication data from Slack workspaces

**Location**: `/connectors/slack/`

**Configuration**:
```yaml
# In knowledge base schema
mappings:
  sources:
    - source_id: slack-messages
      connector_url: "http://localhost:3003"
      document_type: message
      extract:
        node: Message
        assign:
          id: "$.ts"
          text: "$.text"
          channel: "$.channel"
          user: "$.user"
          timestamp: "$.ts"
```

**Features**:
- 💬 Channel messages with threading support
- 👥 User profiles and workspace membership
- 📁 Channel metadata and organization structure
- 🔗 Message threading and conversation context
- 📎 File attachments and media references
- ⚡ Real-time updates via Slack Events API
- 🔄 Incremental sync with timestamp filtering

**Data Sources**:
- `messages` - Channel messages and threads
- `channels` - Channel metadata and structure
- `users` - User profiles and activity
- `files` - Shared files and attachments

**Authentication**:
```bash
# Required environment variables
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
# Requires: channels:read, users:read, files:read scopes
```

**MCP Endpoints**:
```bash
# List available sources
curl http://localhost:8080/sources

# Get page data with pagination
curl "http://localhost:8080/data/pages?limit=100&cursor=next_token"

# Incremental updates
curl "http://localhost:8080/data/pages?since=2024-01-01T00:00:00Z"
```

**Example Schema Mapping**:
```yaml
schema:
  nodes:
    - label: Page
      key: id
      props: ["title", "content", "space_key", "created_at"]
    - label: Space
      key: key
      props: ["name", "key", "description"]
    - label: User
      key: account_id
      props: ["display_name", "email", "account_id"]

  relationships:
    - type: BELONGS_TO
      from: Page
      to: Space
    - type: AUTHORED_BY
      from: Page
      to: User
    - type: COMMENTED_ON
      from: User
      to: Page

mappings:
  sources:
    - source_id: confluence-pages
      connector_url: "http://localhost:8080"
      document_type: confluence_page
      extract:
        node: Page
        assign:
          id: "$.id"
          title: "$.title"
          content: "$.body.storage.value"
          space_key: "$.space.key"
          created_at: "$.version.when"
      edges:
        - type: BELONGS_TO
          from:
            node: Page
            key: "$.id"
          to:
            node: Space
            key: "$.space.key"
        - type: AUTHORED_BY
          from:
            node: Page
            key: "$.id"
          to:
            node: User
            key: "$.version.by.accountId"
```

### Retail Mock Connector

**Purpose**: Generate realistic e-commerce/retail data for testing and development

**Location**: `/connectors/retail-mock/`

**Configuration**:
```yaml
mappings:
  sources:
    - source_id: products
      connector_url: "http://localhost:8081"
      document_type: product
      extract:
        node: Product
        assign:
          id: "$.id"
          name: "$.name"
          price: "$.price"
          category: "$.category"
          description: "$.description"
```

**Features**:
- 🛍️ Realistic product catalog generation
- 👥 Customer profiles with purchase history
- 🛒 Order and transaction data
- 📊 Category hierarchies and product relationships
- 💳 Payment and shipping information
- ⭐ Reviews and ratings
- 📈 Configurable data volume and complexity

**Data Sources**:
- `products` - Product catalog with categories
- `customers` - Customer profiles and preferences
- `orders` - Purchase transactions and line items
- `reviews` - Product reviews and ratings

**Configuration Options**:
```javascript
// connector configuration
{
  "data_volume": "large",    // small, medium, large
  "categories": 50,          // Number of product categories
  "products_per_category": 100,
  "customers": 1000,
  "orders_per_customer": 5,
  "seasonal_patterns": true,  // Generate seasonal sales patterns
  "realistic_pricing": true   // Use market-based pricing
}
```

## Connector Development

### Creating a New Connector

**1. Initialize Connector Package**

```bash
mkdir connectors/my-connector
cd connectors/my-connector
npm init -y
npm install express cors dotenv
```

**2. Implement MCP Interface**

```javascript
// index.js
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// MCP Standard Endpoints
app.get('/info', (req, res) => {
  res.json({
    name: 'My Connector',
    version: '1.0.0',
    description: 'Custom data connector',
    capabilities: ['list_sources', 'fetch_data', 'incremental_sync']
  });
});

app.get('/sources', (req, res) => {
  res.json([
    {
      id: 'my-data',
      name: 'My Data Source',
      schema: {
        fields: ['id', 'title', 'content', 'timestamp'],
        types: {
          id: 'string',
          title: 'string', 
          content: 'text',
          timestamp: 'datetime'
        }
      }
    }
  ]);
});

app.get('/data/:sourceId', async (req, res) => {
  const { sourceId } = req.params;
  const { limit = 100, cursor, since } = req.query;
  
  try {
    const data = await fetchMyData(sourceId, { limit, cursor, since });
    res.json({
      data,
      next_cursor: data.length === limit ? generateNextCursor() : null,
      has_more: data.length === limit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8082;
app.listen(PORT, () => {
  console.log(`My Connector running on port ${PORT}`);
});
```

**3. Implement Data Fetching Logic**

```javascript
async function fetchMyData(sourceId, options) {
  const { limit, cursor, since } = options;
  
  // Connect to your data source
  const connection = await connectToMyDataSource();
  
  // Build query with filtering
  let query = buildQuery(sourceId);
  if (since) {
    query = query.where('updated_at', '>', since);
  }
  if (cursor) {
    query = query.where('id', '>', cursor);
  }
  query = query.limit(limit);
  
  // Execute and transform data
  const rows = await query.execute();
  return rows.map(transformRow);
}

function transformRow(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    timestamp: row.updated_at.toISOString(),
    // Add any custom fields
    metadata: {
      source: 'my-connector',
      version: row.version
    }
  };
}
```

### Testing Your Connector

**1. Unit Tests**

```javascript
// test/connector.test.js
const request = require('supertest');
const app = require('../index');

describe('My Connector', () => {
  test('GET /info returns connector metadata', async () => {
    const response = await request(app).get('/info');
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('My Connector');
  });

  test('GET /sources returns available data sources', async () => {
    const response = await request(app).get('/sources');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('GET /data/my-data returns paginated data', async () => {
    const response = await request(app).get('/data/my-data?limit=10');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('next_cursor');
  });
});
```

**2. Integration Testing**

```bash
# Start your connector
npm start

# Test with Knowledge Graph Brain
cd ../../cli/
kgb validate test-schema-with-my-connector.yaml

# Test ingestion (requires orchestrator running)
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "kb_id": "test-kb",
    "source_id": "my-data",
    "connector_url": "http://localhost:8082"
  }'
```

## Advanced Features

### Incremental Synchronization

Connectors can support incremental updates using timestamps or change tokens:

```javascript
app.get('/data/:sourceId', async (req, res) => {
  const { since } = req.query;
  
  if (since) {
    // Only return records modified after 'since' timestamp
    const updates = await getIncrementalUpdates(sourceId, since);
    res.json({
      data: updates,
      sync_token: new Date().toISOString(),
      is_incremental: true
    });
  } else {
    // Full dataset
    const data = await getFullDataset(sourceId);
    res.json({ data, is_incremental: false });
  }
});
```

### Schema Discovery

Automatically discover and expose data schemas:

```javascript
app.get('/sources/:sourceId/schema', async (req, res) => {
  const { sourceId } = req.params;
  const schema = await discoverSchema(sourceId);
  
  res.json({
    source_id: sourceId,
    schema: {
      fields: schema.columns,
      types: schema.data_types,
      relationships: schema.foreign_keys,
      sample_data: schema.sample_rows.slice(0, 5)
    },
    discovered_at: new Date().toISOString()
  });
});
```

### Real-time Change Streams

For databases that support change streams:

```javascript
const { EventEmitter } = require('events');

app.get('/changes/:sourceId/stream', (req, res) => {
  const { sourceId } = req.params;
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const changeStream = watchChanges(sourceId);
  
  changeStream.on('change', (change) => {
    res.write(`data: ${JSON.stringify(change)}\n\n`);
  });

  req.on('close', () => {
    changeStream.destroy();
  });
});
```

### Error Handling & Monitoring

Implement robust error handling and monitoring:

```javascript
app.use((error, req, res, next) => {
  console.error('Connector error:', error);
  
  res.status(500).json({
    error: {
      message: error.message,
      code: error.code || 'INTERNAL_ERROR',
      source: 'my-connector',
      timestamp: new Date().toISOString()
    }
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = await checkConnectorHealth();
    res.json({
      status: 'healthy',
      ...health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

## Deployment & Operations

### Docker Deployment

```dockerfile
# Dockerfile for custom connector
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 8082

CMD ["npm", "start"]
```

### Kubernetes Deployment

```yaml
# k8s/my-connector.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-connector
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-connector
  template:
    metadata:
      labels:
        app: my-connector
    spec:
      containers:
      - name: my-connector
        image: my-connector:latest
        ports:
        - containerPort: 8082
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: my-connector-secrets
              key: database-url
---
apiVersion: v1
kind: Service
metadata:
  name: my-connector
spec:
  selector:
    app: my-connector
  ports:
  - port: 8082
    targetPort: 8082
```

### Monitoring & Logging

```javascript
// Add structured logging
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'my-connector' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console()
  ]
});

// Metrics collection
app.get('/metrics', (req, res) => {
  res.json({
    requests_total: requestCounter,
    active_connections: activeConnections,
    data_sources: dataSourceCount,
    last_sync: lastSyncTimestamp,
    errors_24h: errorCount24h
  });
});
```

## Security Considerations

### Authentication & Authorization

```javascript
// API key authentication
app.use('/data', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!validateApiKey(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
});

// Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);
```

### Data Privacy

```javascript
// PII detection and masking
function sanitizeData(data) {
  return data.map(item => {
    // Mask email addresses
    if (item.email) {
      item.email = maskEmail(item.email);
    }
    
    // Remove sensitive fields
    delete item.ssn;
    delete item.credit_card;
    
    return item;
  });
}
```

## Related Documentation

- **[GitHub Integration Workflow](./workflows/github-integration-guide.md)** - Step-by-step guide for streamlined GitHub integration ⭐ **New**
- **[Workflow Analysis & Improvements](./workflows/LEARNINGS.md)** - Technical analysis of workflow optimizations and success metrics
- **[DSL Reference](./dsl.md)** - YAML schema language for connector configuration
- **[API Documentation](./API.md)** - MCP and REST API specifications
- **[Architecture Overview](./ARCHITECTURE.md)** - System integration patterns
- **[CLI Tools](./cli.md)** - Tools for connector testing and management