# 🔌 Knowledge Graph Brain - Data Connectors Matrix

**Professional connector ecosystem for unified knowledge graph ingestion with dynamic schema management.**

---

## 📊 Connector Comparison Matrix

| Connector | Auth Method | Objects Supported | Pagination | Rate Limits | Incremental Sync | Status | 
|-----------|------------|-------------------|------------|-------------|------------------|--------|
| **Confluence** | API Token (Basic) | Pages, Blog Posts, Spaces, Comments, Tasks, Attachments | ✅ Cursor-based | ✅ Atlassian limits | ✅ `since` parameter | 🟢 **GA** |
| **GitHub** | Personal Access Token / OAuth | Repositories, Issues, PRs, Commits, Releases | ✅ Per-page (100) | ✅ 5000/hour core | ✅ `since` parameter | 🟡 **Beta** |
| **Slack** | Bot Token | Messages, Channels, Threads, Users | ✅ Limit-based (1000) | ✅ Tier-based limits | ✅ `oldest` timestamp | 🟡 **Beta** |
| **Retail-Mock** | None | Products, Orders, Customers | ❌ Fixed dataset | ❌ No limits | ❌ Static data | 🔵 **Demo** |

---

## 🔗 Quick Integration

```yaml
# Example: Confluence Production Integration
sources:
  - source_id: "confluence-prod"
    connector_url: "http://localhost:3004"
    document_type: "confluence_page"
    auth_ref: "confluence-api-token"
```

```bash
# Environment Variables
export CONFLUENCE_BASE_URL="https://yourcompany.atlassian.net"
export CONFLUENCE_EMAIL="your-email@company.com"
export CONFLUENCE_API_TOKEN="your-api-token"
```

---

## 📋 Detailed Connector Specifications

### 🌐 **Confluence Connector** - Production Ready

**🔒 Authentication**
- **Method**: HTTP Basic Auth (Email + API Token)
- **Setup**: Create API token in Atlassian Account Settings
- **Scopes**: `read:confluence-content.all`, `read:confluence-space.summary`

**📦 Objects & Capabilities**
- **Pages**: Full content, metadata, relationships
- **Blog Posts**: Articles with rich content and attachments
- **Spaces**: Organizational hierarchy and permissions
- **Comments**: User discussions and annotations  
- **Tasks**: Action items and assignments
- **Attachments**: Files and media linked to content

**⚡ Performance & Limits**
- **Pagination**: Cursor-based with `limit` parameter (default: 25, max: 250)
- **Rate Limits**: Atlassian standard (1000 requests/hour per app)
- **Incremental Sync**: ✅ `since` parameter for modified dates
- **Bulk Operations**: ✅ Multi-space queries supported

**🔧 Configuration**
```javascript
{
  CONFLUENCE_BASE_URL: "https://company.atlassian.net",
  CONFLUENCE_EMAIL: "user@company.com", 
  CONFLUENCE_API_TOKEN: "ATATT...",
  DEMO_MODE: false
}
```

---

### 🐙 **GitHub Connector** - Beta Status

**🔒 Authentication** 
- **Method**: Personal Access Token or OAuth App
- **Setup**: Generate token with `repo`, `read:org`, `read:user` scopes
- **OAuth**: Supports GitHub Apps for organization-wide access

**📦 Objects & Capabilities**
- **Repositories**: Metadata, topics, languages, statistics
- **Issues**: Title, body, labels, assignees, comments
- **Pull Requests**: Code changes, reviews, merge status
- **Commits**: SHA, message, author, changed files
- **Releases**: Tags, notes, assets, publication dates

**⚡ Performance & Limits**
- **Pagination**: Page-based with `per_page` (max: 100)
- **Rate Limits**: 5000 requests/hour (authenticated), 60/hour (unauthenticated)
- **Incremental Sync**: ✅ `since` parameter for most endpoints
- **GraphQL Support**: ❌ (REST API only currently)

**🔧 Configuration**
```javascript
{
  GITHUB_TOKEN: "ghp_...",
  GITHUB_OWNER: "organization-name", // Optional: specific owner
  DEMO_MODE: false
}
```

**🚨 Beta Limitations**
- [ ] Limited error handling for network failures
- [ ] No automatic retry with exponential backoff  
- [ ] Rate limit monitoring needs enhancement
- [ ] Test coverage incomplete (estimated 60%)

---

### 💬 **Slack Connector** - Beta Status

**🔒 Authentication**
- **Method**: Bot Token (OAuth 2.0)
- **Setup**: Create Slack app with bot user and required scopes
- **Scopes**: `channels:read`, `channels:history`, `groups:read`, `groups:history`, `users:read`

**📦 Objects & Capabilities**  
- **Messages**: Text, attachments, reactions, threads
- **Channels**: Public/private channels with metadata
- **Threads**: Conversation replies and context
- **Users**: Profile information and presence
- **Files**: Shared documents and media (metadata only)

**⚡ Performance & Limits**
- **Pagination**: Limit-based with `cursor` for next page
- **Rate Limits**: Tier-based (Tier 1: 1/second, Tier 2: 20/minute)
- **Incremental Sync**: ✅ `oldest` timestamp parameter
- **Real-time**: ❌ (Polling-based only)

**🔧 Configuration**
```javascript
{
  SLACK_BOT_TOKEN: "xoxb-...",
  SLACK_WORKSPACE_ID: "T1234567", // Optional: specific workspace
  DEMO_MODE: false
}
```

**🚨 Beta Limitations**
- [ ] Thread conversation context needs improvement
- [ ] User presence and status not fully integrated
- [ ] Message formatting (markdown/blocks) needs enhancement
- [ ] Test coverage incomplete (estimated 55%)

---

### 🛍️ **Retail-Mock Connector** - Demo Purpose

**🔒 Authentication**
- **Method**: None (open endpoints)
- **Security**: Localhost only, demo data

**📦 Objects & Capabilities**
- **Products**: Catalog items with pricing and inventory
- **Orders**: Purchase transactions with line items  
- **Customers**: User profiles and purchase history

**⚡ Performance & Limits**
- **Pagination**: Fixed dataset (no pagination)
- **Rate Limits**: No limits (local mock data)
- **Incremental Sync**: ❌ Static demonstration data
- **Scalability**: Not designed for production use

**🎯 Use Cases**
- ✅ System demonstration and testing
- ✅ Schema development and validation
- ✅ Training and documentation
- ❌ Production workloads

---

## 🏗️ Dynamic Connector Architecture

### **Schema-Driven URLs** ⭐ New in v1.2.0
```yaml
# No hardcoded connector logic - completely dynamic
mappings:
  sources:
    - source_id: "custom-api"
      connector_url: "http://internal-system:8080/api"
      document_type: "internal_doc"
      auth_ref: "internal-system-token"
```

### **Environment Flexibility** 
```yaml
# Development
connector_url: "http://localhost:3004"

# Staging  
connector_url: "http://staging-confluence:3004"

# Production
connector_url: "http://confluence-connector.prod.svc.cluster.local:3004"
```

### **Infinite Scalability**
- ✅ Add unlimited data sources without code changes
- ✅ Runtime connector URL resolution from schemas
- ✅ Zero orchestrator modifications required
- ✅ Independent connector deployments and scaling

---

## 🚀 Production Readiness Roadmap

### **Immediate Priority: GitHub & Slack GA**

**GitHub Connector → GA Status**
- [ ] Enhanced error handling with retry logic
- [ ] Rate limit monitoring and backoff
- [ ] Comprehensive test suite (target: 90%+)
- [ ] Production logging and metrics
- [ ] Documentation and integration guides

**Slack Connector → GA Status**  
- [ ] Message formatting improvements (blocks → markdown)
- [ ] Thread context resolution 
- [ ] Comprehensive test suite (target: 90%+)
- [ ] Production logging and metrics
- [ ] Workspace-wide permission handling

### **Future Enhancements**
- **Microsoft Teams Connector** (planned Q4 2025)
- **Notion Connector** (planned Q1 2026)  
- **Jira Connector** (planned Q1 2026)
- **Google Workspace Connector** (planned Q2 2026)

---

## 🔧 Development & Integration

### **Local Development Setup**
```bash
# 1. Start all connectors
npm run start:connectors

# 2. Configure environment variables
cp .env.example .env
# Edit .env with your API credentials

# 3. Test connector health
curl http://localhost:3004/health  # Confluence
curl http://localhost:3005/health  # GitHub  
curl http://localhost:3006/health  # Slack
curl http://localhost:8081/health  # Retail-Mock
```

### **Schema Registration**
```bash
# Register connector schema
node cli/src/index.js register-schema examples/confluence.yaml

# Validate schema
node cli/src/index.js validate-schema examples/confluence.yaml

# Test ingestion
node cli/src/index.js ingest confluence-demo
```

### **Health Monitoring**
```bash
# Check all connector status
curl http://localhost:3000/api/connectors/status

# Individual connector health
curl http://localhost:3000/api/connectors/confluence/health
```

---

## 📚 Additional Resources

- **[Main Documentation](../README.md)** - System overview and quick start
- **[API Reference](../docs/API.md)** - Complete API documentation
- **[Schema Guide](../docs/dsl.md)** - YAML schema specification
- **[Security Patterns](../docs/security-patterns.md)** - Enterprise security guide
- **[Deployment Guide](../docs/DEPLOYMENT.md)** - Production deployment

---

**🎯 Status Summary**: 1 GA connector (Confluence), 2 Beta connectors (GitHub, Slack) approaching GA, 1 Demo connector (Retail-Mock). Production-ready architecture with unlimited connector scalability.
