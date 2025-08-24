# GraphRAG Cookbook

## Overview

This cookbook provides examples of how to use the Knowledge Graph Brain's GraphRAG capabilities with LangGraph agents.

## Example 1: Question Answering with Graph Context

```python
# Define a tool for semantic search
def semantic_search(query: str, top_k: int = 5):
    # Call the orchestrator's semantic_search endpoint
    # Return results
    pass

# Define a tool for graph search
def graph_search(cypher: str):
    # Call the orchestrator's search_graph endpoint
    # Return results
    pass

# Create a LangGraph agent
from langgraph import Agent

agent = Agent(
    tools=[semantic_search, graph_search],
    strategy="graph-first"
)

# Ask a question
question = "Which products were purchased by customers who bought product X?"
answer = agent.ask(question)
```

## Example 2: Hybrid Search for Complex Queries

```python
# Create a LangGraph agent with hybrid strategy
agent = Agent(
    tools=[semantic_search, graph_search],
    strategy="hybrid"
)

# Ask a question that requires both semantic and graph search
question = "Find similar products to Y that are in the same category as product X"
answer = agent.ask(question)
```

## Example 3: Multi-hop Reasoning

```python
# Create a LangGraph agent for multi-hop reasoning
agent = Agent(
    tools=[semantic_search, graph_search],
    strategy="graph-first"
)

# Ask a multi-hop question
question = "Who authored documents related to topics discussed in document Z?"
answer = agent.ask(question)
```

## Strategies

### Graph-First

1. Use graph search to identify relevant entities
2. Use semantic search to find similar entities or content
3. Combine results to answer the question

### Hybrid

1. Use semantic search to find relevant content
2. Use graph search to explore relationships between entities
3. Combine results to answer the question

## Best Practices

1. Start with simple questions and gradually increase complexity
2. Use specific Cypher queries for precise graph searches
3. Experiment with different top_k values for semantic search
4. Combine multiple tools to leverage both semantic and graph capabilities