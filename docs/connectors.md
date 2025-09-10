# Knowledge Graph Brain - Data Connectors

Professional data connectors for integrating diverse data sources into knowledge graphs with **dynamic schema management**, **LLM-enhanced custom connector generation**, and standardized MCP interfaces.

## Overview

Knowledge Graph Brain connectors provide standardized interfaces for extracting data from various sources and transforming it into knowledge graph structures. **As of v0.17.0, the system includes a complete LLM-Enhanced Custom Connector Framework** with automatic OpenAPI specification processing and intelligent schema generation.

### LLM-Enhanced Custom Connector Framework ⭐ **New in v0.17.0**

The system now features **complete AI-powered custom connector generation** with advanced OpenAPI processing:

```yaml
# Generated automatically from OpenAPI specs via LLM analysis
kb_id: "custom-api"
embedding:
  provider: "ollama:mxbai-embed-large"
  chunking:
    strategy: "paragraph"
    max_tokens: 1000
schema:
  nodes:
    - label: "APIEntity"
      key: "id"
      props: ["name", "description", "created_at"]
  relationships:
    - type: "BELONGS_TO"
      from: "APIEntity"
      to: "Category"
mappings:
  sources:
    - source_id: "api-data"
      connector_url: "https://api.example.com"
      document_type: "entity"
      extract:
        node: "APIEntity"
        assign:
          id: "$.id"
          name: "$.name"
          description: "$.description"
```

**AI-Powered Features**:
- 🤖 **Ollama Integration**: Local LLM processing with qwen3:8b model for privacy-first analysis
- 🎯 **Intelligent Field Mapping**: Automatic detection and mapping of API fields to Neo4j properties
- 📊 **Confidence Scoring**: AI-generated confidence metrics (0.75+ typical) for schema quality
- 🔍 **Relationship Inference**: Smart detection of entity relationships from OpenAPI schemas
- ⚡ **Large-Scale Processing**: Successfully handles complex APIs up to 5MB (validated with Jira REST API)
- 🛡️ **Validation & Cleanup**: Advanced relationship validation preventing invalid node references

### Dynamic Connector Architecture ⭐ **Enhanced in v0.17.0**

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

## LLM-Enhanced Custom Connector Framework

### Overview ⭐ **Production Ready in v0.17.0**

The LLM-Enhanced Custom Connector Framework enables automatic generation of production-ready connectors from OpenAPI specifications using local AI intelligence. This system transforms any REST API into a fully functional Knowledge Graph connector without manual schema creation.

### Core Capabilities

- **🤖 AI-Powered Schema Analysis**: Ollama qwen3:8b integration for intelligent OpenAPI parsing
- **📋 Automatic Connector Generation**: Complete end-to-end pipeline from spec upload to functional connector
- **🎯 Intelligent Field Mapping**: LLM-powered automatic field extraction and relationship inference
- **📊 Confidence Scoring**: AI-generated quality metrics for schema analysis validation
- **⚡ Large-Scale API Support**: Successfully processes complex specifications up to 5MB
- **🛡️ Advanced Validation**: Relationship validation with automatic cleanup and error prevention
- **🔒 Privacy-First Processing**: Local LLM processing with no external API calls

### Access Points ⭐ **New in v0.17.1**

#### **Setup Wizard Integration (Primary)**
Access the Visual Connector Builder through the Knowledge Graph Brain setup workflow:

- **Location**: Setup Wizard → Data Connectors → Custom Connectors section
- **Entry Point**: "Build Custom Connector" button (replaces previous dual-button approach)
- **Experience**: Fully integrated 4-step guided workflow within setup process
- **Audience**: New users setting up their Knowledge Graph Brain system

#### **Dashboard Quick Actions (Secondary)** 
Access from the main dashboard for ongoing connector management:

- **Location**: Main Dashboard → Quick Actions section
- **Entry Point**: "Build Custom Connector" action button
- **Experience**: Same 4-step Visual Connector Builder workflow  
- **Audience**: Existing users adding additional custom connectors

### API Endpoints

#### Parse OpenAPI Specification (Enhanced)
```http
POST /api/custom-connectors/parse-openapi-enhanced
Content-Type: application/json

{
  "spec_content": "openapi: 3.0.0...",
  "kb_id": "my-knowledge-base",
  "connector_url": "https://api.example.com",
  "context": {
    "domain": "E-commerce API",
    "businessGoals": ["Customer Analytics", "Product Catalog"]
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "OpenAPI specification parsed successfully with LLM intelligence",
  "generated_schema": { ... },
  "validation_warnings": [],
  "api_info": {
    "title": "E-commerce API",
    "version": "1.0.0",
    "endpoints_found": 25,
    "schemas_found": 12
  },
  "llm_insights": {
    "confidence": 0.87,
    "discovered_entities": 8,
    "inferred_relationships": 15,
    "field_mappings": 42
  }
}
```

#### Analyze Live REST API
```http
POST /api/custom-connectors/analyze-rest-api
Content-Type: application/json

{
  "api_url": "https://api.example.com",
  "kb_id": "live-api-analysis",
  "auth_config": {
    "type": "bearer",
    "token": "your-api-token"
  },
  "sample_endpoints": ["/users", "/products", "/orders"],
  "context": {
    "domain": "Live API Discovery"
  }
}
```

### Usage Examples

#### Example 1: Small API (< 1MB)
```bash
# Upload OpenAPI spec via Web UI
# Processing time: ~10-15 seconds
# Automatic timeout: 3 minutes
curl -X POST http://localhost:8080/api/custom-connectors/parse-openapi-enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "spec_content": "...",
    "kb_id": "small-api",
    "context": {"domain": "Simple REST API"}
  }'
```

#### Example 2: Large API (2MB+, like Jira)
```bash
# Large spec processing
# Processing time: ~30-45 seconds
# Automatic timeout: 10 minutes
curl -X POST http://localhost:8080/api/custom-connectors/parse-openapi-enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "spec_content": "...",
    "kb_id": "enterprise-api",
    "context": {
      "domain": "Enterprise Software",
      "businessGoals": ["Issue Tracking", "Project Management"]
    }
  }'
```

### Generated Schema Structure

The LLM generates comprehensive connector configurations with intelligent defaults:

```yaml
kb_id: "generated-connector"
name: "AI-Generated Custom Connector"
version: "1.0.0"
embedding:
  provider: "ollama"
  model: "mxbai-embed-large"
  chunking:
    strategy: "sentence"
    chunk_size: 512
    overlap: 50
schema:
  nodes:
    - label: "User"
      key: "id"
      props: ["username", "email", "created_at", "status"]
    - label: "Project"
      key: "id" 
      props: ["name", "description", "created_date", "status"]
  relationships:
    - type: "OWNS"
      from: "User"
      to: "Project"
    - type: "COLLABORATES_ON"
      from: "User"
      to: "Project"
mappings:
  sources:
    - source_id: "api-users"
      connector_url: "https://api.example.com/users"
      document_type: "user"
      extract:
        node: "User"
        assign:
          id: "$.id"
          username: "$.username"
          email: "$.email"
          created_at: "$.created_date"
          status: "$.status"
      edges:
        - type: "OWNS"
          from: { node: "User", key: "$.id" }
          to: { node: "Project", key: "$.owner_id" }
```

### Performance & Scalability

| API Size | Processing Time | Timeout | Confidence Score |
|----------|----------------|---------|------------------|
| < 100KB  | 5-10 seconds   | 3 min   | 0.85-0.95       |
| 100KB-1MB| 10-25 seconds  | 5 min   | 0.80-0.90       |
| 1MB-5MB  | 25-60 seconds  | 10 min  | 0.75-0.85       |

**Real-World Validation**: Successfully processed 2.3MB Jira REST API specification in 34.6 seconds with 0.87 confidence score.

### Error Handling & Recovery

The system includes comprehensive error handling:

- **Malformed JSON**: Multiple extraction patterns for LLM response parsing
- **Invalid Relationships**: Automatic filtering of references to non-existent nodes
- **Timeout Management**: Intelligent timeout scaling based on specification size
- **Memory Protection**: Resource limits preventing memory overflow
- **Detailed Logging**: Comprehensive diagnostics without exposing sensitive data

### Web UI Integration ⭐ **Enhanced in v0.17.1**

The system now features a **comprehensive Visual Connector Builder** with professional 4-step wizard:

#### **Visual Connector Builder (New Unified Interface)**
- **🎯 4-Step Guided Workflow**: Upload → Configure → Preview → Deploy
- **📁 Drag & Drop Upload**: Professional file upload for OpenAPI specifications
- **⚙️ Configuration Management**: Authentication, API settings, and LLM enhancement options  
- **👁️ Schema Preview**: Interactive preview of AI-generated connector schema with confidence scoring
- **🚀 One-Click Deployment**: Automatic connector registration and immediate data access

#### **Integrated Setup Wizard Experience**
- **🔧 Setup Wizard Integration**: Access via "Build Custom Connector" button in setup wizard
- **📋 Dashboard Quick Actions**: Also available from main dashboard for ongoing connector management
- **🔄 Unified Workflow**: Replaces previous dual-button approach (OpenAPI/Live API) with single professional interface
- **✅ Built-in Validation**: Real-time error checking and schema validation throughout the process

#### **Enhanced User Experience Features**
- **📊 Live Progress Indicators**: Real-time feedback during LLM processing with timeout management
- **🛡️ Error Diagnostics**: User-friendly error messages with actionable troubleshooting information
- **📈 Confidence Scoring**: AI-generated quality metrics displayed during schema preview
- **🔍 Validation Results**: Clear display of validation warnings and optimization recommendations

## Available Connectors

**Current connector ecosystem with production status and capabilities:**

| Connector | Status | Port | Auth Method | Primary Objects | Incremental Sync |
|-----------|--------|------|------------|----------------|------------------|
| **Custom (LLM)** | 🟢 GA | 8080 | Configurable | Any OpenAPI-defined | ✅ Configurable |
| **Confluence** | 🟢 GA | 3001 | API Token | Pages, Spaces, Comments | ✅ `since` parameter |
| **GitHub** | 🟢 GA | 3002 | PAT/OAuth | Repos, Issues, PRs, Commits | ✅ `since` parameter |
| **Slack** | 🟡 Beta | 3003 | Bot Token | Messages, Channels, Users | ✅ `oldest` timestamp |
| **Retail-Mock** | 🔵 Demo | 8081 | None | Products, Orders, Customers | ❌ Static data |

**🚀 New in v0.17.0**: Complete LLM-Enhanced Custom Connector Framework with automatic OpenAPI processing and intelligent schema generation.

**🚀 Enhanced in v0.15.1**: GitHub connector includes [streamlined integration workflow](../docs/workflows/github-integration-guide.md) with automatic embedding generation and simplified schema registration.

### Custom Connector (LLM-Enhanced) ⭐ **Production Ready**

**Purpose**: Automatically generate connectors from any OpenAPI specification using AI intelligence

**Location**: Built into orchestrator at `/api/custom-connectors/`

**Key Features**:
- 🤖 **Automatic Generation**: Upload OpenAPI spec → Get functional connector
- 🧠 **AI Intelligence**: Ollama qwen3:8b for smart field mapping and relationships
- 📊 **Confidence Scoring**: Quality metrics for generated schemas (0.75+ typical)
- ⚡ **Large-Scale Support**: Handles APIs up to 5MB (validated with Jira API)
- 🛡️ **Advanced Validation**: Prevents invalid relationships and ensures schema integrity
- 🔒 **Privacy-First**: Local LLM processing with no external API calls

**Configuration**:
```yaml
# Generated automatically from OpenAPI spec
kb_id: "custom-api"
name: "AI-Generated Connector"
embedding:
  provider: "ollama:mxbai-embed-large"
  chunking:
    strategy: "paragraph"
    max_tokens: 1000
schema:
  nodes:
    - label: "APIEntity"
      key: "id"
      props: ["name", "description", "created_at"]
mappings:
  sources:
    - source_id: "generated-source"
      connector_url: "https://api.example.com"
      document_type: "entity"
      extract:
        node: "APIEntity"
        assign:
          id: "$.id"
          name: "$.name"
```

**Usage** ⭐ **Simplified in v0.17.1**:

#### **Via Setup Wizard (Recommended)**
1. **Access Setup Wizard**: Navigate to setup from main dashboard
2. **Custom Connectors Section**: Click "Build Custom Connector" button  
3. **Visual Connector Builder**: Complete 4-step guided workflow:
   - **Upload**: Drag & drop OpenAPI specification file
   - **Configure**: Set API base URL, authentication, and connector details
   - **Preview**: Review AI-generated schema with confidence scoring
   - **Deploy**: One-click deployment and automatic registration
4. **Start Data Ingestion**: Connector immediately available for data ingestion

#### **Via Dashboard Quick Actions (Advanced)**
1. **Main Dashboard**: Click "Build Custom Connector" in Quick Actions section
2. **Follow Visual Workflow**: Same 4-step process as setup wizard
3. **Manage Existing**: Edit or deploy additional custom connectors

#### **Integration Benefits**
- **🎯 Single Interface**: Unified experience replacing previous dual-button approach
- **🚀 Professional UX**: Guided workflow with validation and real-time feedback  
- **⚡ Immediate Results**: From upload to functional connector in minutes
- **🔄 Setup Integration**: Seamlessly integrated into Knowledge Graph Brain setup flow

**Performance**: 
- Small APIs (< 1MB): 10-15 seconds
- Large APIs (> 2MB): 30-60 seconds
- Timeout management: 3-10 minutes based on size

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

## LLM-Enhanced Custom Connector Troubleshooting

### Common Issues & Solutions

#### 1. OpenAPI Spec Processing Failures
```bash
# Symptom: 400 errors during spec upload
# Cause: Malformed OpenAPI specification or validation failures

# Solution: Validate your OpenAPI spec first
curl -X POST http://localhost:8080/api/custom-connectors/parse-openapi \
  -H "Content-Type: application/json" \
  -d '{"spec_content": "....", "kb_id": "test"}'

# Check response for validation_errors
```

#### 2. LLM Analysis Timeouts
```bash
# Symptom: Request timeouts for large APIs
# Cause: API specification too large (>5MB) or complex

# Solution: Use enhanced endpoint with context
curl -X POST http://localhost:8080/api/custom-connectors/parse-openapi-enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "spec_content": "...",
    "kb_id": "large-api",
    "context": {
      "domain": "Your Domain",
      "businessGoals": ["Specific", "Goals"]
    }
  }'
```

#### 3. Low Confidence Scores
```bash
# Symptom: LLM confidence < 0.75
# Cause: Unclear API structure or insufficient context

# Solution: Provide better context
{
  "context": {
    "domain": "E-commerce Platform",
    "businessGoals": ["Customer Analytics", "Product Catalog", "Order Tracking"],
    "entityTypes": ["User", "Product", "Order", "Category"],
    "relationships": ["User PURCHASES Product", "Product BELONGS_TO Category"]
  }
}
```

#### 4. Relationship Validation Errors
```bash
# Symptom: Generated schema fails validation
# Cause: LLM created relationships between non-existent nodes

# This is automatically fixed in v0.17.0, but check logs:
# "Filtering invalid relationship: RELATES_TO from NonExistentNode to AnotherNode"
```

### Performance Optimization

#### 1. Large API Processing
- **Recommended**: Use `parse-openapi-enhanced` for specs > 1MB
- **Context Helps**: Provide domain and business goals for better LLM analysis
- **Timeouts**: System automatically scales timeouts (3min → 10min for large specs)

#### 2. Ollama Model Optimization
```bash
# Ensure Ollama is running with adequate resources
ollama list  # Check if qwen3:8b is available
ollama pull qwen3:8b  # Pull if needed

# Monitor performance
docker stats  # Check container resource usage
```

#### 3. Memory Management
```bash
# For very large APIs (>3MB), monitor system resources
top -p $(pgrep -f orchestrator)
```

### Best Practices

#### 1. OpenAPI Specification Preparation
- **Validate First**: Use OpenAPI validators before upload
- **Clean Schemas**: Remove unused components and schemas
- **Clear Descriptions**: Better descriptions = better LLM analysis
- **Reasonable Size**: Keep specs under 5MB for optimal performance

#### 2. Context Optimization
```json
{
  "context": {
    "domain": "Specific domain name (e.g., 'CRM System')",
    "businessGoals": ["Concrete goals", "Not generic ones"],
    "entityTypes": ["Expected", "Entity", "Names"],
    "relationships": ["Expected relationship patterns"]
  }
}
```

#### 3. Monitoring & Validation
- **Check Confidence**: Aim for scores > 0.75
- **Validate Relationships**: Review generated relationships for accuracy
- **Test Small First**: Start with subset of API before full processing
- **Monitor Logs**: Check orchestrator logs for detailed processing information

## Security Considerations

### LLM-Enhanced Processing Security ⭐ **v0.17.0**

The LLM-Enhanced Custom Connector Framework includes comprehensive security measures:

#### Privacy-First Architecture
- **Local Processing**: All LLM analysis happens locally via Ollama (no external API calls)
- **No Data Transmission**: OpenAPI specifications never leave your infrastructure
- **Memory Protection**: Automatic cleanup of processed specifications from memory
- **Secure Logging**: Detailed logs without exposing sensitive specification content

#### Input Validation & Sanitization
```javascript
// OpenAPI specification validation
function validateOpenAPISpec(spec) {
  // Size limits (max 5MB)
  if (spec.length > 5 * 1024 * 1024) {
    throw new Error('Specification too large');
  }
  
  // JSON validation
  let parsed;
  try {
    parsed = JSON.parse(spec);
  } catch (e) {
    throw new Error('Invalid JSON format');
  }
  
  // OpenAPI format validation
  if (!parsed.openapi || !parsed.info) {
    throw new Error('Invalid OpenAPI format');
  }
  
  return parsed;
}
```

#### Resource Protection
- **Memory Limits**: Automatic memory management for large specifications
- **Timeout Protection**: Intelligent timeout scaling prevents resource exhaustion
- **Concurrent Processing Limits**: Prevents DoS via multiple simultaneous uploads
- **Rate Limiting**: Built-in protection against abuse

#### Error Handling Security
```javascript
// Secure error responses (no sensitive data exposure)
try {
  const result = await processOpenAPISpec(spec);
  res.json(result);
} catch (error) {
  console.error('Processing error:', error); // Detailed server logs
  res.status(500).json({
    error: 'Processing failed',
    message: 'Specification could not be processed' // Generic user message
  });
}
```

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

- **[OpenAPI Integration Guide](./openapi-integration.md)** - Complete guide for Universal OpenAPI/REST API integration ⭐ **Enhanced**
- **[GitHub Integration Workflow](./workflows/github-integration-guide.md)** - Step-by-step guide for streamlined GitHub integration ⭐ **New**
- **[Workflow Analysis & Improvements](./workflows/LEARNINGS.md)** - Technical analysis of workflow optimizations and success metrics
- **[DSL Reference](./dsl.md)** - YAML schema language for connector configuration
- **[API Documentation](./API.md)** - MCP and REST API specifications
- **[Architecture Overview](./ARCHITECTURE.md)** - System integration patterns
- **[CLI Tools](./cli.md)** - Tools for connector testing and management

## Version History

- **v0.17.1** - Visual Connector Builder with integrated setup wizard and unified UX ⭐ **New**
- **v0.17.0** - LLM-Enhanced Custom Connector Framework with complete OpenAPI processing
- **v0.16.0** - Enhanced UX/UI & Multi-Connector Improvements  
- **v0.15.1** - Streamlined GitHub integration workflow
- **v0.13.0** - Universal OpenAPI Integration with mcpo proxy
- **v0.12.0** - Dynamic connector URL resolution and schema-based routing