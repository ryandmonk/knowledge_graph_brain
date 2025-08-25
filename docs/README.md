# Knowledge Graph Brain - Documentation

Comprehensive documentation for the Knowledge Graph Brain system - a professional MCP-based knowledge graph orchestrator with enterprise features and production-ready deployment capabilities.

## 📚 Documentation Overview

The Knowledge Graph Brain documentation is organized by use case and user journey to help you find the information you need quickly:

### 🚀 Getting Started
- **[Main README](../README.md)** - Project overview, quick start, and architecture introduction
- **[CLI Tools](./cli.md)** - Command-line tools for schema validation and system monitoring
- **[Examples](../examples/)** - Complete working examples (Confluence, Retail demo)

### 🏗️ System Architecture & Design
- **[Architecture Overview](./ARCHITECTURE.md)** - Complete system design, data flow, and component interactions
- **[API Reference](./API.md)** - Comprehensive MCP and REST API documentation with examples ⭐ **Enhanced v0.10.0**
- **[DSL Reference](./dsl.md)** - YAML schema language specification with validation and best practices

### 🔌 Integration & Development  
- **[Connectors Guide](./connectors.md)** - Data source integration patterns and connector development
- **[GraphRAG Implementation](./graphrag.md)** - Advanced graph-enhanced RAG with LangGraph agents
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment for Docker, Kubernetes, and enterprise environments

### 🏢 Enterprise Features ⭐ **New in v0.10.0**
- **[Identity Resolution Patterns](./identity-resolution.md)** - Enterprise entity deduplication with configurable confidence thresholds
- **[Security Patterns](./security-patterns.md)** - Production credential management with AWS Secrets Manager, HashiCorp Vault, and RBAC

### 📋 Operations & Maintenance
- **[CHANGELOG](../CHANGELOG.md)** - Release history and version information following semantic versioning
- **[CLI Documentation](../cli/README.md)** - Detailed CLI tools documentation with troubleshooting

## 🎯 Quick Navigation by Use Case

### I want to...

**Build a Knowledge Base**
1. Start with [DSL Reference](./dsl.md) to define your schema
2. Use [CLI Tools](./cli.md) to validate your schema
3. Check [Examples](../examples/) for schema templates
4. Deploy using [Deployment Guide](./DEPLOYMENT.md)

**Integrate Data Sources**
1. Review [Connectors Guide](./connectors.md) for available connectors
2. Use [API Reference](./API.md) for orchestrator endpoints
3. Test with [CLI Tools](./cli.md) status monitoring

**Deploy to Production**
1. Follow [Deployment Guide](./DEPLOYMENT.md) for your environment
2. Use [Architecture Overview](./ARCHITECTURE.md) for system design
3. Monitor with [CLI Tools](./cli.md) and [API Reference](./API.md)

**Build AI Applications**
1. Study [GraphRAG Implementation](./graphrag.md) for AI agent patterns
2. Use [API Reference](./API.md) for semantic search and graph queries
3. Reference [Architecture Overview](./ARCHITECTURE.md) for integration patterns

**Extend the System**
1. Read [Connectors Guide](./connectors.md) for custom connector development
2. Use [DSL Reference](./dsl.md) for schema customization
3. Follow [Architecture Overview](./ARCHITECTURE.md) for extension points

## 📖 Documentation Standards

Our documentation follows professional standards for enterprise software:

### ✅ Comprehensive Coverage
- **Complete Examples** - All code samples are tested and complete
- **Production Ready** - Examples and configurations suitable for production use
- **Error Handling** - Comprehensive error scenarios and troubleshooting guides
- **Performance Considerations** - Optimization guidance and best practices

### 🔍 Professional Quality
- **Semantic Versioning** - [CHANGELOG](../CHANGELOG.md) follows Keep a Changelog format
- **API Documentation** - Complete endpoint documentation with request/response examples
- **Schema Validation** - Comprehensive validation with detailed error messages
- **Testing Guidance** - Unit testing, integration testing, and validation examples

### 🚀 Enterprise Features
- **Security Considerations** - Authentication, authorization, and data privacy guidance
- **Scalability Patterns** - Production deployment and scaling strategies
- **Monitoring & Observability** - Health checks, metrics, and operational tools
- **Development Workflow** - Professional development, testing, and deployment patterns

## 🆕 Recent Updates

See [CHANGELOG.md](../CHANGELOG.md) for complete release history including:

### v1.1.0 - Enterprise Readiness (Current)
- ✅ **CLI Tools** - Professional `kgb` command-line interface with validation and monitoring
- ✅ **Schema Validation** - Comprehensive JSON Schema validation with detailed error reporting
- ✅ **System Monitoring** - Health checks, status APIs, and operational dashboards
- ✅ **Production Documentation** - Complete API reference, deployment guides, and architecture docs

### v1.0.0 - Core Platform
- ✅ **MCP Integration** - Model Context Protocol for standardized AI tool integration
- ✅ **Knowledge Graph Engine** - Neo4j-based graph database with semantic search
- ✅ **Data Connectors** - Extensible connector framework with Confluence and mock retail connectors
- ✅ **GraphRAG Capabilities** - LangGraph-based agents for graph-enhanced reasoning

## 💡 Tips for Using This Documentation

### For Developers
- Start with [Architecture Overview](./ARCHITECTURE.md) to understand system design
- Use [API Reference](./API.md) as your primary development resource
- Reference [DSL Guide](./dsl.md) for schema definition patterns
- Test with [CLI Tools](./cli.md) during development

### For DevOps/Operations
- Follow [Deployment Guide](./DEPLOYMENT.md) for production setup
- Use [CLI Tools](./cli.md) for system monitoring and health checks
- Reference [API Reference](./API.md) for operational endpoints
- Monitor [CHANGELOG](../CHANGELOG.md) for upgrade considerations

### For Data Engineers  
- Study [Connectors Guide](./connectors.md) for data integration patterns
- Use [DSL Reference](./dsl.md) for complex data mapping scenarios
- Reference [Architecture Overview](./ARCHITECTURE.md) for data flow understanding
- Test mappings with [CLI Tools](./cli.md) validation

### For AI/ML Engineers
- Focus on [GraphRAG Implementation](./graphrag.md) for advanced AI patterns
- Use [API Reference](./API.md) for semantic search and graph query endpoints  
- Reference [Architecture Overview](./ARCHITECTURE.md) for AI integration points
- Build with professional patterns from [Examples](../examples/)

## 🤝 Contributing to Documentation

We welcome documentation improvements! Please follow these guidelines:

1. **Accuracy** - Test all code examples and configurations
2. **Completeness** - Include error handling and edge cases
3. **Clarity** - Write for both beginners and advanced users  
4. **Consistency** - Follow existing formatting and style patterns
5. **Professional Standards** - Maintain enterprise-grade documentation quality

## 📧 Support & Community

- **Issues** - Report bugs and request features on GitHub
- **Questions** - Use GitHub Discussions for community support
- **Documentation Feedback** - Open issues for documentation improvements
- **Security Issues** - Follow responsible disclosure practices

## 🔗 External Resources

- **Model Context Protocol (MCP)** - [Official MCP Documentation](https://spec.modelcontextprotocol.io/)
- **Neo4j Documentation** - [Neo4j Graph Database](https://neo4j.com/docs/)
- **LangGraph** - [LangChain LangGraph Framework](https://langchain-ai.github.io/langgraph/)
- **Docker** - [Docker Documentation](https://docs.docker.com/)
- **Kubernetes** - [Kubernetes Documentation](https://kubernetes.io/docs/)
