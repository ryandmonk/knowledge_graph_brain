# Deployment Guide

This guide covers deployment scenarios for Knowledge Graph Brain in different environments.

## Quick Start (Development)

### Prerequisites

- **Node.js** 18+ with npm
- **Docker** and Docker Compose
- **Git** for cloning the repository

### Development Setup

```bash
# Clone the repository
git clone https://github.com/ryandmonk/knowledge_graph_brain.git
cd knowledge_graph_brain

# Start infrastructure services
docker-compose up -d

# Wait for Neo4j to be ready (about 30-60 seconds)
docker-compose logs neo4j

# Install orchestrator dependencies
cd orchestrator
npm install
npm run build

# Start the orchestrator
npm run dev
```

**Verify Setup:**
```bash
# Health check
curl http://localhost:3000/health

# System status
curl http://localhost:3000/api/status
```

---

## Production Deployment

### Option 1: Docker Compose (Recommended)

**1. Environment Configuration**

Create `.env` file:
```bash
# Neo4j Configuration
NEO4J_AUTH=neo4j/your-secure-password
NEO4J_PLUGINS=["apoc"]

# Orchestrator Configuration  
NODE_ENV=production
PORT=3000
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-secure-password

# Ollama Configuration (if using local AI)
OLLAMA_HOST=http://ollama:11434

# OpenAI Configuration (if using OpenAI)
OPENAI_API_KEY=your-openai-key
```

**2. Production Docker Compose**

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  neo4j:
    image: neo4j:5.15-community
    environment:
      - NEO4J_AUTH=${NEO4J_AUTH}
      - NEO4J_PLUGINS=["apoc"]
      - NEO4J_dbms_security_procedures_unrestricted=apoc.*
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
    ports:
      - "7474:7474"
      - "7687:7687"
    restart: unless-stopped

  orchestrator:
    build: ./orchestrator
    environment:
      - NODE_ENV=production
      - NEO4J_URI=bolt://neo4j:7687
      - NEO4J_USER=${NEO4J_USER}
      - NEO4J_PASSWORD=${NEO4J_PASSWORD}
    ports:
      - "3000:3000"
    depends_on:
      - neo4j
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "11434:11434"
    restart: unless-stopped

  # Optional: Nginx reverse proxy
  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - orchestrator
    restart: unless-stopped

volumes:
  neo4j_data:
  neo4j_logs:
  ollama_data:
```

**3. Deploy**

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# Initialize Ollama models
docker exec -it knowledge_graph_brain_ollama_1 ollama pull mxbai-embed-large
docker exec -it knowledge_graph_brain_ollama_1 ollama pull qwen3:8b

# Verify deployment
curl http://localhost:3000/api/status
```

### Option 2: Kubernetes

**1. Namespace and ConfigMap**

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: knowledge-graph

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kg-config
  namespace: knowledge-graph
data:
  NODE_ENV: "production"
  NEO4J_URI: "bolt://neo4j-service:7687"
  OLLAMA_HOST: "http://ollama-service:11434"
```

**2. Neo4j Deployment**

```yaml
# k8s/neo4j.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: neo4j
  namespace: knowledge-graph
spec:
  serviceName: neo4j-service
  replicas: 1
  selector:
    matchLabels:
      app: neo4j
  template:
    metadata:
      labels:
        app: neo4j
    spec:
      containers:
      - name: neo4j
        image: neo4j:5.15-community
        ports:
        - containerPort: 7474
        - containerPort: 7687
        env:
        - name: NEO4J_AUTH
          valueFrom:
            secretKeyRef:
              name: neo4j-secret
              key: auth
        - name: NEO4J_PLUGINS
          value: '["apoc"]'
        volumeMounts:
        - name: neo4j-data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: neo4j-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 20Gi

---
apiVersion: v1
kind: Service
metadata:
  name: neo4j-service
  namespace: knowledge-graph
spec:
  selector:
    app: neo4j
  ports:
  - name: http
    port: 7474
  - name: bolt
    port: 7687
```

**3. Orchestrator Deployment**

```yaml
# k8s/orchestrator.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orchestrator
  namespace: knowledge-graph
spec:
  replicas: 2
  selector:
    matchLabels:
      app: orchestrator
  template:
    metadata:
      labels:
        app: orchestrator
    spec:
      containers:
      - name: orchestrator
        image: knowledge-graph-orchestrator:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: kg-config
        env:
        - name: NEO4J_PASSWORD
          valueFrom:
            secretKeyRef:
              name: neo4j-secret
              key: password
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10

---
apiVersion: v1
kind: Service
metadata:
  name: orchestrator-service
  namespace: knowledge-graph
spec:
  selector:
    app: orchestrator
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

**4. Deploy to Kubernetes**

```bash
# Create secrets
kubectl create secret generic neo4j-secret \
  --from-literal=auth=neo4j/your-secure-password \
  --from-literal=password=your-secure-password \
  -n knowledge-graph

# Deploy components
kubectl apply -f k8s/
```

---

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Node.js environment | `development` | No |
| `PORT` | Orchestrator port | `3000` | No |
| `NEO4J_URI` | Neo4j connection string | `bolt://localhost:7687` | No |
| `NEO4J_USER` | Neo4j username | `neo4j` | No |
| `NEO4J_PASSWORD` | Neo4j password | `neo4j` | **Yes** |
| `OLLAMA_HOST` | Ollama server URL | `http://localhost:11434` | No |
| `OPENAI_API_KEY` | OpenAI API key | - | No |

### Neo4j Configuration

**Memory Settings** (for production):
```bash
# In neo4j.conf or environment variables
NEO4J_dbms_memory_heap_initial__size=1G
NEO4J_dbms_memory_heap_max__size=2G
NEO4J_dbms_memory_pagecache_size=1G
```

**Vector Index Configuration:**
```cypher
// Configure vector index settings
CALL db.index.vector.configureIndex('embedding_index', {
  'vector.dimensions': 1024,
  'vector.similarity_function': 'cosine'
})
```

---

## Scaling Considerations

### Horizontal Scaling

**Orchestrator Scaling:**
- Run multiple orchestrator instances behind a load balancer
- Use stateless design - all state in Neo4j
- Consider Redis for session storage if needed

**Neo4j Scaling:**
- Start with single instance for most use cases
- Consider Neo4j Enterprise for clustering (3-5 nodes)
- Use read replicas for query-heavy workloads

### Vertical Scaling

**Neo4j Resource Requirements:**

| Dataset Size | RAM | CPU | Storage |
|--------------|-----|-----|---------|
| Small (< 1M nodes) | 4GB | 2 cores | 20GB SSD |
| Medium (1-10M nodes) | 8GB | 4 cores | 100GB SSD |
| Large (10-100M nodes) | 16GB | 8 cores | 500GB SSD |
| Enterprise (100M+ nodes) | 32GB+ | 16+ cores | 1TB+ NVMe |

**Orchestrator Resource Requirements:**

| Load Level | RAM | CPU |
|------------|-----|-----|
| Development | 512MB | 1 core |
| Production (light) | 1GB | 2 cores |
| Production (heavy) | 2GB | 4 cores |

---

## Monitoring & Observability

### Health Checks

```bash
# Basic health check
curl -f http://localhost:3000/health || exit 1

# Deep health check (includes Neo4j)
curl -f http://localhost:3000/health/deep || exit 1
```

### Logging

**Production Logging Configuration:**

```json
// orchestrator/config/logger.js
{
  "level": "info",
  "format": "json",
  "transports": [
    {
      "type": "file",
      "filename": "/var/log/knowledge-graph/app.log",
      "maxsize": "10m",
      "maxFiles": "10"
    },
    {
      "type": "console",
      "level": "error"
    }
  ]
}
```

### Metrics Collection

**Prometheus Integration:**

```javascript
// Add to orchestrator/src/index.ts
import client from 'prom-client';

// Create metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

const neo4jQueryDuration = new client.Histogram({
  name: 'neo4j_query_duration_seconds', 
  help: 'Duration of Neo4j queries in seconds',
  labelNames: ['query_type']
});

// Expose metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(client.register.metrics());
});
```

---

## Security

### Network Security

**Firewall Rules:**
```bash
# Allow only necessary ports
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw deny 7474   # Neo4j Browser (internal only)
ufw deny 7687   # Neo4j Bolt (internal only)
```

**TLS/SSL Configuration:**

```nginx
# nginx.conf
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;
    
    location / {
        proxy_pass http://orchestrator:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Authentication & Authorization

**JWT Token Validation:**
```javascript
// Add JWT middleware
const jwt = require('jsonwebtoken');

function validateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = decoded;
    next();
  });
}
```

### Data Security

**Neo4j Security:**
```cypher
// Create restricted user for application
CREATE USER app_user SET PASSWORD 'secure-password';
GRANT ROLE reader TO app_user;
GRANT ROLE writer TO app_user;
DENY WRITE ON GRAPH * TO app_user;
```

**Environment Secrets:**
```bash
# Use Docker secrets or Kubernetes secrets for sensitive data
echo "your-neo4j-password" | docker secret create neo4j-password -
```

---

## Backup & Recovery

### Neo4j Backup

**Automated Backup Script:**
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/neo4j"
CONTAINER_NAME="neo4j"

# Create backup using neo4j-admin
docker exec $CONTAINER_NAME neo4j-admin database dump neo4j \
  --to-path=/backups/neo4j_backup_$DATE.dump

# Copy from container
docker cp $CONTAINER_NAME:/backups/neo4j_backup_$DATE.dump $BACKUP_DIR/

# Cleanup old backups (keep 7 days)
find $BACKUP_DIR -name "neo4j_backup_*.dump" -mtime +7 -delete
```

**Restore Process:**
```bash
# Stop services
docker-compose down

# Restore from backup
docker run --rm -v neo4j_data:/data -v $BACKUP_DIR:/backups \
  neo4j:5.15 neo4j-admin database load neo4j \
  --from-path=/backups/neo4j_backup_20250824_120000.dump

# Restart services
docker-compose up -d
```

### Application Backup

**Configuration Backup:**
```bash
# Backup schemas and configuration
tar -czf config_backup_$(date +%Y%m%d).tar.gz \
  examples/ \
  infra/ \
  .env \
  docker-compose.yml
```

---

## Troubleshooting

### Common Issues

**Neo4j Connection Failed:**
```bash
# Check Neo4j status
docker-compose logs neo4j

# Test connection
docker exec -it neo4j cypher-shell -u neo4j -p your-password
```

**Orchestrator Start Issues:**
```bash
# Check logs
docker-compose logs orchestrator

# Debug mode
NODE_ENV=development npm run dev
```

**Ollama Model Issues:**
```bash
# Check available models
docker exec ollama ollama list

# Pull missing models
docker exec ollama ollama pull mxbai-embed-large
docker exec ollama ollama pull qwen3:8b
```

### Performance Tuning

**Neo4j Query Optimization:**
```cypher
// Analyze slow queries
CALL db.queryJournal() YIELD query, elapsedTime
WHERE elapsedTime > 1000
RETURN query, elapsedTime
ORDER BY elapsedTime DESC;

// Create helpful indexes
CREATE INDEX node_kb_index FOR (n:Node) ON (n.kb_id);
CREATE INDEX relationship_kb_index FOR ()-[r:RELATIONSHIP]-() ON (r.kb_id);
```

**Memory Tuning:**
```bash
# Monitor memory usage
docker stats

# Adjust Neo4j memory settings
NEO4J_dbms_memory_heap_max__size=4G
NEO4J_dbms_memory_pagecache_size=2G
```

---

## Maintenance

### Regular Tasks

**Weekly:**
- Review application logs for errors
- Check disk space usage
- Verify backup integrity
- Update security patches

**Monthly:**
- Review and optimize Neo4j indexes
- Analyze query performance
- Update dependencies
- Review access logs

**Quarterly:**
- Performance testing with realistic data volumes
- Disaster recovery testing
- Security audit
- Capacity planning review

### Updates

**Application Updates:**
```bash
# Pull latest code
git pull origin main

# Rebuild services
docker-compose build --no-cache

# Rolling update
docker-compose up -d --no-deps orchestrator
```

**Database Migrations:**
```bash
# Run new migrations
npm run migrate:up

# Rollback if needed
npm run migrate:down
```
