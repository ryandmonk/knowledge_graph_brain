# Knowledge Graph Brain - Domain Specific Language (DSL)

Comprehensive YAML-based schema language for defining knowledge graph structures, data mappings, and ingestion pipelines with professional validation and type safety.

## Overview

The Knowledge Graph Brain DSL is a declarative YAML language that enables you to define:
- **Knowledge Graph Schema** - Node types, relationships, and properties
- **Data Source Mappings** - How external data maps to your graph structure  
- **Embedding Configuration** - Vector embeddings for semantic search
- **Validation Rules** - Schema validation with comprehensive error reporting
- **Operational Settings** - Performance tuning and operational parameters

## Schema Structure

### Complete Schema Template

```yaml
# Unique identifier for this knowledge base
kb_id: "my-knowledge-base"

# Embedding configuration for semantic search
embedding:
  provider: "ollama:mxbai-embed-large"  # Provider and model
  chunking:
    strategy: "by_fields"               # Chunking strategy
    fields: ["title", "content"]       # Fields to chunk
    max_tokens: 512                     # Maximum tokens per chunk
    overlap: 50                         # Overlap between chunks

# Knowledge graph schema definition
schema:
  nodes:
    - label: Document                   # Neo4j node label
      key: id                          # Unique identifier property
      props:                           # Node properties
        - "title"
        - "content"
        - "created_at"
        - "updated_at"
    
    - label: Author
      key: email
      props:
        - "name"
        - "email"
        - "department"
  
  relationships:
    - type: AUTHORED_BY                 # Neo4j relationship type
      from: Document                    # Source node label
      to: Author                       # Target node label
      props:                           # Relationship properties (optional)
        - "created_at"
        - "role"

# Data source mappings
mappings:
  sources:
    - source_id: confluence-pages      # Unique source identifier
      connector_url: "http://localhost:8080"  # Connector endpoint
      document_type: confluence_page    # Document classification
      
      # Node extraction and mapping
      extract:
        node: Document                  # Target node type
        assign:                        # Property mappings using JSONPath
          id: "$.id"
          title: "$.title"
          content: "$.body.storage.value"
          created_at: "$.version.when"
      
      # Relationship extraction
      edges:
        - type: AUTHORED_BY
          from:
            node: Document
            key: "$.id"                # Source node key
          to:
            node: Author
            key: "$.version.by.accountId"  # Target node key
            # Create target node if missing
            create_if_missing: true
            assign:                    # Target node properties
              name: "$.version.by.displayName"
              email: "$.version.by.email"
```

## Schema Components

### Knowledge Base Configuration

```yaml
# Required: Unique identifier for this knowledge base
kb_id: "retail-analytics"

# Optional: Human-readable metadata
metadata:
  name: "Retail Analytics Knowledge Base"
  description: "Customer behavior and product analytics"
```

### Dynamic Connector Configuration ⭐ **New in v1.2.0**

Each data source mapping **must include** a `connector_url` for dynamic connector resolution:

```yaml
mappings:
  sources:
    - source_id: "my-data-source"
      connector_url: "http://localhost:8080/api/data"  # ⚠️ REQUIRED
      document_type: "document"
      # ... rest of mapping
```

**Benefits**:
- ✅ **No Code Changes**: Add unlimited data sources without touching orchestrator code
- ✅ **Environment Flexibility**: Different URLs for dev/staging/production
- ✅ **Dynamic Resolution**: Connector URLs resolved at runtime from schema
- ✅ **Zero Hardcoding**: Complete elimination of hardcoded connector logic

**Migration from v1.1.x**: Add `connector_url` to existing schema mappings.
  version: "1.2.0"
  owner: "data-team@company.com"
  tags: ["retail", "analytics", "customer-data"]
```

### Embedding Configuration

```yaml
embedding:
  # Embedding provider and model
  provider: "ollama:mxbai-embed-large"
  
  # Alternative providers
  # provider: "openai:text-embedding-3-large"
  # provider: "azure:text-embedding-ada-002"
  
  # Chunking strategy for large documents
  chunking:
    strategy: "by_fields"              # Options: by_fields, by_tokens, by_sentences
    fields: ["title", "content"]      # Fields to include in chunks
    max_tokens: 512                    # Maximum tokens per chunk
    overlap: 50                        # Token overlap between chunks
    
  # Embedding dimensions (auto-detected if not specified)
  dimensions: 1024
  
  # Batch processing settings
  batch_size: 100                      # Documents per embedding batch
  retry_attempts: 3                    # Retry failed embeddings
```

### Node Schema Definition

```yaml
schema:
  nodes:
    # Simple node with basic properties
    - label: Product
      key: sku                         # Unique identifier property
      props:                           # List of allowed properties
        - "name"
        - "price"
        - "category"
        - "description"
    
    # Node with validation constraints
    - label: Customer
      key: customer_id
      props:
        - "name"
        - "email"
        - "age"
        - "segment"
      validation:                      # Optional validation rules
        required: ["name", "email"]    # Required properties
        email_format: ["email"]        # Email format validation
        numeric: ["age"]               # Numeric properties
        enum:
          segment: ["premium", "standard", "basic"]
    
    # Node with embedded objects
    - label: Order
      key: order_id
      props:
        - "total"
        - "status"
        - "shipping_address"           # Can contain nested objects
        - "line_items"                 # Can contain arrays
```

### Relationship Schema Definition

```yaml
schema:
  relationships:
    # Simple relationship
    - type: PURCHASED
      from: Customer
      to: Product
    
    # Relationship with properties
    - type: CONTAINS
      from: Order
      to: Product
      props:
        - "quantity"
        - "unit_price"
        - "discount"
    
    # Relationship with validation
    - type: RATED
      from: Customer
      to: Product
      props:
        - "rating"
        - "review_text"
        - "created_at"
      validation:
        required: ["rating"]
        numeric: ["rating"]
        range:
          rating: [1, 5]               # Rating must be 1-5
```

### Advanced Mapping Patterns

#### Nested Object Extraction

```yaml
mappings:
  sources:
    - source_id: ecommerce-orders
      connector_url: "http://localhost:8081"
      document_type: order
      
      extract:
        node: Order
        assign:
          order_id: "$.id"
          total: "$.total.amount"              # Nested object access
          currency: "$.total.currency"
          status: "$.status"
          # Extract nested address object
          shipping_address: "$.shipping.address"
          # Extract customer info from nested object
          customer_name: "$.customer.profile.name"
      
      edges:
        # Create relationship to customer
        - type: PLACED_BY
          from:
            node: Order
            key: "$.id"
          to:
            node: Customer
            key: "$.customer.id"
            create_if_missing: true
            assign:
              name: "$.customer.profile.name"
              email: "$.customer.profile.email"
```

#### Array Processing

```yaml
mappings:
  sources:
    - source_id: product-reviews
      connector_url: "http://localhost:8082"
      document_type: review
      
      # Process array of reviews
      extract_array:
        path: "$.reviews[*]"                   # JSONPath to array
        node: Review
        assign:
          review_id: "$.id"
          rating: "$.rating"
          text: "$.comment"
          created_at: "$.timestamp"
      
      edges:
        # Create relationships for each array item
        - type: REVIEWED
          from:
            node: Review
            key: "$.id"
          to:
            node: Product
            key: "$.product_id"               # From parent context
```

#### Conditional Mapping

```yaml
mappings:
  sources:
    - source_id: user-activity
      connector_url: "http://localhost:8083"
      document_type: activity
      
      # Different mappings based on activity type
      conditional_extract:
        - condition: "$.type == 'purchase'"
          extract:
            node: Purchase
            assign:
              purchase_id: "$.id"
              amount: "$.data.amount"
              timestamp: "$.timestamp"
        
        - condition: "$.type == 'page_view'"
          extract:
            node: PageView
            assign:
              view_id: "$.id"
              page_url: "$.data.url"
              duration: "$.data.duration"
              timestamp: "$.timestamp"
```

## JSONPath Reference

### Basic Syntax

```yaml
# Root object access
"$"                    # Root of document
"$.field"              # Top-level field
"$.nested.field"       # Nested field access

# Array access
"$.array[0]"           # First array element
"$.array[-1]"          # Last array element  
"$.array[*]"           # All array elements
"$.array[0,1]"         # Multiple specific elements

# Filtering
"$.users[?(@.active)]" # Filter by boolean field
"$.products[?(@.price > 100)]"  # Numeric comparison
"$.items[?(@.category == 'electronics')]"  # String comparison

# Advanced patterns
"$.orders[*].line_items[*].product_id"  # Nested array extraction
"$.data..price"        # Recursive descent (all price fields)
"$.users[?(@.age > 18 && @.verified)]"  # Complex conditions
```

### Common JSONPath Patterns

```yaml
# Extract user information
user_id: "$.user.id"
user_name: "$.user.profile.displayName"
user_email: "$.user.profile.email"

# Handle missing fields with defaults
status: "$.status || 'unknown'"
priority: "$.priority || 'normal'"

# Extract from arrays
first_tag: "$.tags[0]"
all_categories: "$.categories[*].name"
primary_author: "$.authors[?(@.primary == true)].name"

# Date/time extraction
created_timestamp: "$.metadata.createdAt"
last_modified: "$.audit.lastModified"
formatted_date: "$.createdDate"  # Assumes ISO format

# Nested relationship extraction
department_id: "$.employee.department.id"
manager_email: "$.employee.reportsTo.email"
project_names: "$.employee.projects[*].name"
```

## Validation and Error Handling

### Schema Validation

The DSL includes comprehensive validation:

```yaml
# JSON Schema validation
- ✅ Required field validation
- ✅ Data type checking (string, number, boolean, array, object)
- ✅ Format validation (email, date, URL)
- ✅ Enum/choice validation
- ✅ Range validation for numbers

# Cross-reference validation  
- ✅ Node type references in relationships
- ✅ Property references in mappings
- ✅ Source ID uniqueness

# JSONPath validation
- ✅ Syntax validation for all JSONPath expressions
- ✅ Security checks for potentially unsafe patterns

# Business logic validation
- ✅ Circular relationship detection
- ✅ Orphaned node detection
- ✅ Missing required mappings
```

### Example Validation Errors

**Invalid JSONPath Expression:**
```yaml
❌ Schema validation failed (1 errors)
   • Invalid JSONPath expression '$.invalid..path'
     Path: mappings.sources[source_id=test].extract.assign.title
     Suggestion: Check JSONPath syntax (should start with $ and use valid expressions)
```

**Missing Node Type:**
```yaml
❌ Schema validation failed (1 errors)
   • Source mapping references undefined node type 'UnknownNode'  
     Path: mappings.sources[source_id=test].extract.node
     Suggestion: Available node types: Document, Author, Product
```

**Cross-Reference Error:**
```yaml
❌ Schema validation failed (1 errors)
   • Relationship references undefined node type 'MissingNode'
     Path: schema.relationships[type=CONNECTS_TO].to
     Suggestion: Define node type 'MissingNode' or use existing types: Document, User
```

## Advanced Features

### Schema Inheritance

```yaml
# Base schema definition
base_schema: &base_document
  props:
    - "id"
    - "created_at" 
    - "updated_at"
    - "created_by"

schema:
  nodes:
    # Inherit base properties
    - label: Article
      key: id
      <<: *base_document
      props:
        - "title"
        - "content"
        - "category"
    
    - label: Comment
      key: id  
      <<: *base_document
      props:
        - "text"
        - "parent_id"
```

### Environment-Specific Configuration

```yaml
# Development environment
kb_id: "dev-knowledge-base"
embedding:
  provider: "ollama:mxbai-embed-large"

# Production environment
kb_id: "prod-knowledge-base"  
embedding:
  provider: "openai:text-embedding-3-large"
  api_key_ref: "production-openai-key"

# Schema remains consistent across environments
schema:
  nodes:
    - label: Document
      # ... same schema definition
```

### Performance Tuning

```yaml
# Ingestion performance settings
performance:
  batch_size: 1000              # Documents per ingestion batch
  parallel_workers: 4           # Concurrent ingestion threads
  embedding_batch_size: 100     # Embeddings per API call
  neo4j_batch_size: 500        # Neo4j write batch size
  
  # Memory management
  max_memory_mb: 2048          # Maximum memory usage
  gc_threshold: 0.8            # Garbage collection threshold
  
  # Retry and timeout settings
  retry_attempts: 3            # Failed operation retries
  timeout_seconds: 300         # Operation timeout
  backoff_multiplier: 2.0      # Exponential backoff
```

### Security and Privacy

```yaml
# Data privacy settings
privacy:
  # PII detection and handling
  pii_detection: true
  pii_fields: ["email", "phone", "ssn", "address"]
  pii_action: "mask"           # Options: mask, exclude, encrypt
  
  # Field-level security
  sensitive_fields:
    - field: "salary"
      access_level: "admin"
    - field: "performance_rating"  
      access_level: "manager"
  
  # Data retention
  retention_days: 365
  archive_after_days: 90
```

## Command Line Validation

Use the CLI to validate schemas:

```bash
# Basic validation
kgb validate schema.yaml

# Detailed validation with schema summary  
kgb validate schema.yaml --verbose

# JSON output for automation
kgb validate schema.yaml --format json

# Validate multiple schemas
kgb validate examples/*.yaml
```

## Best Practices

### Schema Design

1. **Use Descriptive Labels**: Choose clear, consistent node and relationship labels
   ```yaml
   # Good
   - label: Customer
   - type: PURCHASED
   
   # Avoid
   - label: C
   - type: REL1
   ```

2. **Design for Queries**: Consider how you'll query the graph
   ```yaml
   # Index frequently queried properties
   - label: Product
     key: sku
     props: ["name", "category", "price"]  # All commonly queried
   ```

3. **Normalize Relationships**: Avoid storing relationship data as node properties
   ```yaml
   # Good - relationship with properties
   - type: PURCHASED
     from: Customer
     to: Product  
     props: ["quantity", "purchase_date", "price"]
   
   # Avoid - relationship data as node property
   - label: Customer
     props: ["purchases"]  # Array of purchase data
   ```

### Mapping Best Practices

1. **Handle Missing Data**: Use fallbacks for optional fields
   ```yaml
   assign:
     title: "$.title || $.name || 'Untitled'"
     status: "$.status || 'draft'"
   ```

2. **Validate Data Types**: Ensure data types match schema expectations
   ```yaml
   assign:
     price: "$.price | tonumber"      # Convert to number
     active: "$.active | toboolean"   # Convert to boolean
     tags: "$.tags | toarray"         # Ensure array format
   ```

3. **Use Specific JSONPath**: Be as specific as possible to avoid ambiguity
   ```yaml
   # Good - specific path
   content: "$.body.storage.value"
   
   # Avoid - too generic
   content: "$..value"
   ```

### Performance Optimization

1. **Batch Processing**: Use appropriate batch sizes
   ```yaml
   embedding:
     batch_size: 100        # Balance API limits and memory
   
   performance:
     batch_size: 1000       # Larger batches for bulk ingestion
   ```

2. **Index Strategy**: Choose key fields carefully for performance
   ```yaml
   # Good - unique, frequently queried
   - label: Document
     key: id              # Unique identifier
   
   # Avoid - non-unique or rarely used
   - label: Document  
     key: title           # May not be unique
   ```

## Related Documentation

- **[CLI Tools](./cli.md)** - Command-line schema validation and testing
- **[Connectors](./connectors.md)** - Data source integration patterns
- **[API Reference](./API.md)** - MCP and REST API specifications  
- **[Architecture](./ARCHITECTURE.md)** - System design and data flow