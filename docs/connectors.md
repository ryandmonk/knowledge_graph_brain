# Connector Authoring Guide

## Overview

Connectors are mini MCP servers that adapt external APIs to the Knowledge Graph Brain's ingestion pipeline. They implement a simple interface to pull normalized JSON documents from a source.

## Connector Interface

A connector must implement the `pull` capability:

```typescript
pull(since?: string) -> { documents: any[], next_since?: string }
```

### Parameters

- `since` (optional) - A timestamp or cursor to retrieve only documents created or modified since that time

### Response

- `documents` - An array of normalized JSON documents
- `next_since` (optional) - A timestamp or cursor to use for the next pull

## Creating a Connector

1. Create a new Node.js project:
   ```bash
   mkdir my-connector
   cd my-connector
   npm init -y
   npm install @modelcontextprotocol/sdk express
   ```

2. Implement the MCP server:
   ```javascript
   const express = require('express');
   const { Server } = require('@modelcontextprotocol/sdk');

   const server = new Server({
     name: 'My Connector',
     version: '1.0.0'
   });

   server.setRequestHandler('pull', async (request) => {
     const { since } = request.params || {};
     
     // Fetch data from the external API
     const documents = await fetchDataFromAPI(since);
     
     return {
       documents,
       next_since: getNextSinceValue()
     };
   });

   const app = express();
   app.use(server.router);
   app.listen(8080);
   ```

3. Normalize the data to match the expected schema in your mappings.

## Authentication

Connectors handle authentication internally. The orchestrator passes an `auth_ref` parameter when registering a source, which the connector can use to retrieve authentication credentials from a secure store.

## Best Practices

1. Normalize data consistently - Documents from the same source should have a consistent structure
2. Handle errors gracefully - Return meaningful error messages when data can't be fetched
3. Implement rate limiting - Respect the limits of the external APIs you're calling
4. Support incremental pulls - Use the `since` parameter to enable efficient incremental ingestion