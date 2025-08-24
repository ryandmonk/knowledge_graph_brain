# Sample Questions for Graph RAG Agent

Test these questions with the Graph RAG Agent to validate end-to-end functionality:

## Confluence Knowledge Base Questions

1. **Document Discovery**
   ```bash
   npm run dev "What documents are available in the knowledge base?" confluence-kb
   ```

2. **Author Relationships**
   ```bash
   npm run dev "Who are the authors in the system and what have they written?" confluence-kb
   ```

3. **Content Search**
   ```bash
   npm run dev "Find content related to software development practices" confluence-kb
   ```

## Retail Knowledge Base Questions

1. **Product Catalog**
   ```bash
   npm run dev "What products are available and how are they categorized?" retail-kb
   ```

2. **Customer Behavior**
   ```bash
   npm run dev "Show me customer purchase patterns and relationships" retail-kb
   ```

3. **Order Analysis**
   ```bash
   npm run dev "What can you tell me about recent orders and their contents?" retail-kb
   ```

## Multi-Step Reasoning Questions

1. **Cross-entity Analysis**
   ```bash
   npm run dev "Find the most active authors and their most referenced documents" confluence-kb
   ```

2. **Complex Relationships**
   ```bash
   npm run dev "What are the connection patterns between customers, products, and categories?" retail-kb
   ```

3. **Content Quality**
   ```bash
   npm run dev "Which documents have the most relationships to other entities?" confluence-kb
   ```

## Expected Agent Behavior

For each question, the agent should:

1. ✅ **Use kb_info** to understand the schema
2. ✅ **Use semantic_search** to find relevant content  
3. ✅ **Use search_graph** to explore relationships
4. ✅ **Synthesize** a comprehensive answer with citations
5. ✅ **Provide node IDs** and key properties as evidence
6. ✅ **Assess confidence** level in the response

## Sample Output Format

```
🔍 Processing your question...

📋 Search Steps:

1. Retrieved knowledge base schema and info
   Tool: kb_info
   Result: {"available_kbs": ["confluence-kb"], "schemas": {...}}

2. Performed semantic search for relevant content  
   Tool: semantic_search
   Result: {"found": 3, "results": [{"node_id": "doc-123", "score": 0.95, ...}]}

3. Executed graph query to find relationships
   Tool: search_graph  
   Result: {"found": 5, "rows": [{"from_type": ["Document"], ...}]}

==================================================
📝 Final Answer:
**Answer:** Based on the knowledge graph analysis...

**Evidence:** Node doc-123 (title: "API Guidelines") connects to...

**Confidence:** High - Multiple search methods found consistent evidence
```
