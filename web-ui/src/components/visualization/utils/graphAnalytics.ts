/**
 * Advanced Graph Analytics Algorithms
 * 
 * This module provides graph analysis algorithms for the 3D knowledge graph visualization:
 * - Community Detection (Louvain algorithm)
 * - Shortest Path Finding (Dijkstra's algorithm)
 * - Centrality Metrics (Betweenness, Closeness, PageRank)
 * - Graph Clustering and Analysis
 */

import { LayoutNode, LayoutEdge } from './graphLayout';

// Analytics Results Interfaces
export interface CommunityDetectionResult {
  nodeId: string;
  communityId: number;
  modularity: number;
}

export interface ShortestPathResult {
  path: string[];
  distance: number;
  edges: string[];
}

export interface NodeCentralityMetrics {
  nodeId: string;
  betweenness: number;
  closeness: number;
  pagerank: number;
  degree: number;
}

export interface GraphAnalytics {
  communities: CommunityDetectionResult[];
  centralityMetrics: NodeCentralityMetrics[];
  clusteringCoefficient: number;
  averagePathLength: number;
  density: number;
  connectedComponents: string[][];
}

// Community Detection using Louvain Algorithm
export class CommunityDetection {
  private nodes: LayoutNode[];
  private edges: LayoutEdge[];
  private adjacencyList: Map<string, Set<string>>;
  private edgeWeights: Map<string, number>;

  constructor(nodes: LayoutNode[], edges: LayoutEdge[]) {
    this.nodes = nodes;
    this.edges = edges;
    this.adjacencyList = new Map();
    this.edgeWeights = new Map();
    this.buildAdjacencyList();
  }

  private buildAdjacencyList(): void {
    // Initialize adjacency list
    this.nodes.forEach(node => {
      this.adjacencyList.set(node.id, new Set());
    });

    // Build adjacency list and edge weights
    this.edges.forEach(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      const weight = edge.weight || 1;

      this.adjacencyList.get(sourceId)?.add(targetId);
      this.adjacencyList.get(targetId)?.add(sourceId);
      
      const edgeKey = `${sourceId}-${targetId}`;
      this.edgeWeights.set(edgeKey, weight);
      this.edgeWeights.set(`${targetId}-${sourceId}`, weight);
    });
  }

  public detectCommunities(): CommunityDetectionResult[] {
    // Initialize each node in its own community
    const communities = new Map<string, number>();
    this.nodes.forEach((node, index) => {
      communities.set(node.id, index);
    });

    let improved = true;
    let iteration = 0;
    const maxIterations = 100;

    while (improved && iteration < maxIterations) {
      improved = false;
      iteration++;

      for (const node of this.nodes) {
        const currentCommunity = communities.get(node.id)!;
        const neighborCommunities = this.getNeighborCommunities(node.id, communities);
        
        let bestCommunity = currentCommunity;
        let bestModularityGain = 0;

        for (const [community, gain] of neighborCommunities) {
          if (gain > bestModularityGain) {
            bestModularityGain = gain;
            bestCommunity = community;
          }
        }

        if (bestCommunity !== currentCommunity && bestModularityGain > 0) {
          communities.set(node.id, bestCommunity);
          improved = true;
        }
      }
    }

    // Calculate final modularity
    const modularity = this.calculateModularity(communities);

    // Convert to result format
    return this.nodes.map(node => ({
      nodeId: node.id,
      communityId: communities.get(node.id)!,
      modularity
    }));
  }

  private getNeighborCommunities(nodeId: string, communities: Map<string, number>): Map<number, number> {
    const neighborCommunities = new Map<number, number>();
    const neighbors = this.adjacencyList.get(nodeId) || new Set();

    for (const neighborId of neighbors) {
      const neighborCommunity = communities.get(neighborId)!;
      const weight = this.edgeWeights.get(`${nodeId}-${neighborId}`) || 1;
      
      neighborCommunities.set(
        neighborCommunity,
        (neighborCommunities.get(neighborCommunity) || 0) + weight
      );
    }

    return neighborCommunities;
  }

  private calculateModularity(communities: Map<string, number>): number {
    const totalEdgeWeight = this.edges.reduce((sum, edge) => sum + (edge.weight || 1), 0) * 2;
    let modularity = 0;

    const communityGroups = new Map<number, string[]>();
    communities.forEach((community, nodeId) => {
      if (!communityGroups.has(community)) {
        communityGroups.set(community, []);
      }
      communityGroups.get(community)!.push(nodeId);
    });

    for (const [, communityNodes] of communityGroups) {
      let internalEdges = 0;
      let totalDegree = 0;

      for (const nodeId of communityNodes) {
        const neighbors = this.adjacencyList.get(nodeId) || new Set();
        totalDegree += neighbors.size;

        for (const neighborId of neighbors) {
          if (communityNodes.includes(neighborId)) {
            internalEdges += this.edgeWeights.get(`${nodeId}-${neighborId}`) || 1;
          }
        }
      }

      internalEdges /= 2; // Each edge counted twice
      const expectedEdges = (totalDegree * totalDegree) / (2 * totalEdgeWeight);
      modularity += (internalEdges / totalEdgeWeight) - (expectedEdges / totalEdgeWeight);
    }

    return modularity;
  }
}

// Shortest Path Finding using Dijkstra's Algorithm
export class PathFinding {
  private nodes: LayoutNode[];
  private edges: LayoutEdge[];
  private adjacencyList: Map<string, Map<string, number>>;

  constructor(nodes: LayoutNode[], edges: LayoutEdge[]) {
    this.nodes = nodes;
    this.edges = edges;
    this.adjacencyList = new Map();
    this.buildWeightedAdjacencyList();
  }

  private buildWeightedAdjacencyList(): void {
    this.nodes.forEach(node => {
      this.adjacencyList.set(node.id, new Map());
    });

    this.edges.forEach(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      const weight = edge.weight || 1;

      this.adjacencyList.get(sourceId)?.set(targetId, weight);
      this.adjacencyList.get(targetId)?.set(sourceId, weight);
    });
  }

  public findShortestPath(startId: string, endId: string): ShortestPathResult | null {
    if (!this.adjacencyList.has(startId) || !this.adjacencyList.has(endId)) {
      return null;
    }

    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();

    // Initialize distances
    this.nodes.forEach(node => {
      distances.set(node.id, node.id === startId ? 0 : Infinity);
      previous.set(node.id, null);
      unvisited.add(node.id);
    });

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let currentNode: string | null = null;
      let minDistance = Infinity;

      for (const nodeId of unvisited) {
        const distance = distances.get(nodeId)!;
        if (distance < minDistance) {
          minDistance = distance;
          currentNode = nodeId;
        }
      }

      if (!currentNode || minDistance === Infinity) {
        break; // No path exists
      }

      unvisited.delete(currentNode);

      if (currentNode === endId) {
        break; // Found shortest path to target
      }

      // Update distances to neighbors
      const neighbors = this.adjacencyList.get(currentNode) || new Map();
      for (const [neighborId, weight] of neighbors) {
        if (unvisited.has(neighborId)) {
          const newDistance = distances.get(currentNode)! + weight;
          if (newDistance < distances.get(neighborId)!) {
            distances.set(neighborId, newDistance);
            previous.set(neighborId, currentNode);
          }
        }
      }
    }

    // Reconstruct path
    const path: string[] = [];
    let current: string | null = endId;

    while (current !== null) {
      path.unshift(current);
      current = previous.get(current) || null;
    }

    if (path[0] !== startId) {
      return null; // No path found
    }

    // Find edges in path
    const pathEdges: string[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const edge = this.edges.find(e => {
        const sourceId = typeof e.source === 'string' ? e.source : e.source.id;
        const targetId = typeof e.target === 'string' ? e.target : e.target.id;
        return (sourceId === path[i] && targetId === path[i + 1]) ||
               (sourceId === path[i + 1] && targetId === path[i]);
      });
      if (edge) {
        pathEdges.push(edge.id);
      }
    }

    return {
      path,
      distance: distances.get(endId)!,
      edges: pathEdges
    };
  }
}

// Centrality Metrics Calculator
export class CentralityCalculator {
  private nodes: LayoutNode[];
  private edges: LayoutEdge[];
  private adjacencyList: Map<string, Set<string>>;

  constructor(nodes: LayoutNode[], edges: LayoutEdge[]) {
    this.nodes = nodes;
    this.edges = edges;
    this.adjacencyList = new Map();
    this.buildAdjacencyList();
  }

  private buildAdjacencyList(): void {
    this.nodes.forEach(node => {
      this.adjacencyList.set(node.id, new Set());
    });

    this.edges.forEach(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;

      this.adjacencyList.get(sourceId)?.add(targetId);
      this.adjacencyList.get(targetId)?.add(sourceId);
    });
  }

  public calculateAllMetrics(): NodeCentralityMetrics[] {
    const betweenness = this.calculateBetweennessCentrality();
    const closeness = this.calculateClosenessCentrality();
    const pagerank = this.calculatePageRank();
    const degree = this.calculateDegreeCentrality();

    return this.nodes.map(node => ({
      nodeId: node.id,
      betweenness: betweenness.get(node.id) || 0,
      closeness: closeness.get(node.id) || 0,
      pagerank: pagerank.get(node.id) || 0,
      degree: degree.get(node.id) || 0
    }));
  }

  private calculateDegreeCentrality(): Map<string, number> {
    const degree = new Map<string, number>();
    
    this.nodes.forEach(node => {
      const neighbors = this.adjacencyList.get(node.id) || new Set();
      degree.set(node.id, neighbors.size);
    });

    return degree;
  }

  private calculateBetweennessCentrality(): Map<string, number> {
    const betweenness = new Map<string, number>();
    
    // Initialize all values to 0
    this.nodes.forEach(node => {
      betweenness.set(node.id, 0);
    });

    // For each node as source
    this.nodes.forEach(source => {
      const stack: string[] = [];
      const paths = new Map<string, string[]>();
      const sigma = new Map<string, number>();
      const distances = new Map<string, number>();
      const delta = new Map<string, number>();

      // Initialize
      this.nodes.forEach(node => {
        paths.set(node.id, []);
        sigma.set(node.id, 0);
        distances.set(node.id, -1);
        delta.set(node.id, 0);
      });

      sigma.set(source.id, 1);
      distances.set(source.id, 0);

      const queue: string[] = [source.id];

      // BFS
      while (queue.length > 0) {
        const current = queue.shift()!;
        stack.push(current);

        const neighbors = this.adjacencyList.get(current) || new Set();
        for (const neighbor of neighbors) {
          // First time we reach this neighbor?
          if (distances.get(neighbor)! < 0) {
            queue.push(neighbor);
            distances.set(neighbor, distances.get(current)! + 1);
          }

          // Shortest path to neighbor via current?
          if (distances.get(neighbor)! === distances.get(current)! + 1) {
            sigma.set(neighbor, sigma.get(neighbor)! + sigma.get(current)!);
            paths.get(neighbor)!.push(current);
          }
        }
      }

      // Accumulation
      while (stack.length > 0) {
        const current = stack.pop()!;
        const predecessors = paths.get(current) || [];
        
        for (const predecessor of predecessors) {
          const contribution = (sigma.get(predecessor)! / sigma.get(current)!) * (1 + delta.get(current)!);
          delta.set(predecessor, delta.get(predecessor)! + contribution);
        }

        if (current !== source.id) {
          betweenness.set(current, betweenness.get(current)! + delta.get(current)!);
        }
      }
    });

    // Normalize by dividing by 2 (since each path is counted twice)
    betweenness.forEach((value, nodeId) => {
      betweenness.set(nodeId, value / 2);
    });

    return betweenness;
  }

  private calculateClosenessCentrality(): Map<string, number> {
    const closeness = new Map<string, number>();

    this.nodes.forEach(source => {
      const distances = this.bfsDistances(source.id);
      let totalDistance = 0;
      let reachableNodes = 0;

      distances.forEach(distance => {
        if (distance > 0 && distance < Infinity) {
          totalDistance += distance;
          reachableNodes++;
        }
      });

      if (reachableNodes > 0) {
        closeness.set(source.id, reachableNodes / totalDistance);
      } else {
        closeness.set(source.id, 0);
      }
    });

    return closeness;
  }

  private bfsDistances(sourceId: string): Map<string, number> {
    const distances = new Map<string, number>();
    const queue: string[] = [sourceId];

    this.nodes.forEach(node => {
      distances.set(node.id, node.id === sourceId ? 0 : Infinity);
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDistance = distances.get(current)!;

      const neighbors = this.adjacencyList.get(current) || new Set();
      for (const neighbor of neighbors) {
        if (distances.get(neighbor)! === Infinity) {
          distances.set(neighbor, currentDistance + 1);
          queue.push(neighbor);
        }
      }
    }

    return distances;
  }

  private calculatePageRank(dampingFactor: number = 0.85, maxIterations: number = 100, tolerance: number = 1e-6): Map<string, number> {
    const pagerank = new Map<string, number>();
    const newPagerank = new Map<string, number>();
    const nodeCount = this.nodes.length;

    // Initialize PageRank values
    this.nodes.forEach(node => {
      pagerank.set(node.id, 1 / nodeCount);
      newPagerank.set(node.id, 0);
    });

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Reset new values
      this.nodes.forEach(node => {
        newPagerank.set(node.id, (1 - dampingFactor) / nodeCount);
      });

      // Calculate new PageRank values
      this.nodes.forEach(node => {
        const neighbors = this.adjacencyList.get(node.id) || new Set();
        const contribution = pagerank.get(node.id)! / neighbors.size;

        for (const neighbor of neighbors) {
          newPagerank.set(neighbor, newPagerank.get(neighbor)! + dampingFactor * contribution);
        }
      });

      // Check for convergence
      let maxDiff = 0;
      this.nodes.forEach(node => {
        const diff = Math.abs(newPagerank.get(node.id)! - pagerank.get(node.id)!);
        maxDiff = Math.max(maxDiff, diff);
        pagerank.set(node.id, newPagerank.get(node.id)!);
      });

      if (maxDiff < tolerance) {
        break;
      }
    }

    return pagerank;
  }
}

// Main Graph Analytics Class
export class GraphAnalyticsEngine {
  private nodes: LayoutNode[];
  private edges: LayoutEdge[];

  constructor(nodes: LayoutNode[], edges: LayoutEdge[]) {
    this.nodes = nodes;
    this.edges = edges;
  }

  public performFullAnalysis(): GraphAnalytics {
    const communityDetection = new CommunityDetection(this.nodes, this.edges);
    const centralityCalculator = new CentralityCalculator(this.nodes, this.edges);

    const communities = communityDetection.detectCommunities();
    const centralityMetrics = centralityCalculator.calculateAllMetrics();

    return {
      communities,
      centralityMetrics,
      clusteringCoefficient: this.calculateClusteringCoefficient(),
      averagePathLength: this.calculateAveragePathLength(),
      density: this.calculateGraphDensity(),
      connectedComponents: this.findConnectedComponents()
    };
  }

  private calculateClusteringCoefficient(): number {
    let totalCoefficient = 0;
    let validNodes = 0;

    const adjacencyList = new Map<string, Set<string>>();
    this.nodes.forEach(node => {
      adjacencyList.set(node.id, new Set());
    });

    this.edges.forEach(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      adjacencyList.get(sourceId)?.add(targetId);
      adjacencyList.get(targetId)?.add(sourceId);
    });

    this.nodes.forEach(node => {
      const neighbors = adjacencyList.get(node.id) || new Set();
      const degree = neighbors.size;

      if (degree < 2) return;

      let triangles = 0;
      const neighborArray = Array.from(neighbors);

      for (let i = 0; i < neighborArray.length; i++) {
        for (let j = i + 1; j < neighborArray.length; j++) {
          if (adjacencyList.get(neighborArray[i])?.has(neighborArray[j])) {
            triangles++;
          }
        }
      }

      const possibleTriangles = (degree * (degree - 1)) / 2;
      totalCoefficient += triangles / possibleTriangles;
      validNodes++;
    });

    return validNodes > 0 ? totalCoefficient / validNodes : 0;
  }

  private calculateAveragePathLength(): number {
    // Implementation would use Floyd-Warshall or BFS from each node
    // Simplified version for now
    const pathFinding = new PathFinding(this.nodes, this.edges);
    let totalDistance = 0;
    let pathCount = 0;

    // Sample a subset of node pairs for performance
    const sampleSize = Math.min(100, this.nodes.length);
    const sampledNodes = this.nodes.slice(0, sampleSize);

    for (let i = 0; i < sampledNodes.length; i++) {
      for (let j = i + 1; j < sampledNodes.length; j++) {
        const path = pathFinding.findShortestPath(sampledNodes[i].id, sampledNodes[j].id);
        if (path) {
          totalDistance += path.distance;
          pathCount++;
        }
      }
    }

    return pathCount > 0 ? totalDistance / pathCount : 0;
  }

  private calculateGraphDensity(): number {
    const nodeCount = this.nodes.length;
    const edgeCount = this.edges.length;
    const maxPossibleEdges = (nodeCount * (nodeCount - 1)) / 2;

    return maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;
  }

  private findConnectedComponents(): string[][] {
    const visited = new Set<string>();
    const components: string[][] = [];

    const adjacencyList = new Map<string, Set<string>>();
    this.nodes.forEach(node => {
      adjacencyList.set(node.id, new Set());
    });

    this.edges.forEach(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      adjacencyList.get(sourceId)?.add(targetId);
      adjacencyList.get(targetId)?.add(sourceId);
    });

    const dfs = (nodeId: string, component: string[]) => {
      visited.add(nodeId);
      component.push(nodeId);

      const neighbors = adjacencyList.get(nodeId) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, component);
        }
      }
    };

    this.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const component: string[] = [];
        dfs(node.id, component);
        components.push(component);
      }
    });

    return components;
  }
}

// Utility functions for visualization integration
export const generateCommunityColors = (communities: CommunityDetectionResult[]): Map<number, string> => {
  const uniqueCommunities = [...new Set(communities.map(c => c.communityId))];
  const colors = new Map<number, string>();

  const colorPalette = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA726',
    '#AB47BC', '#66BB6A', '#EF5350', '#26C6DA',
    '#FFCA28', '#7E57C2', '#29B6F6', '#FF7043',
    '#EC407A', '#9CCC65', '#FFA726', '#5C6BC0'
  ];

  uniqueCommunities.forEach((communityId, index) => {
    colors.set(communityId, colorPalette[index % colorPalette.length]);
  });

  return colors;
};

export const getNodeCommunityColor = (
  nodeId: string, 
  communities: CommunityDetectionResult[], 
  communityColors: Map<number, string>
): string => {
  const community = communities.find(c => c.nodeId === nodeId);
  if (community) {
    return communityColors.get(community.communityId) || '#888888';
  }
  return '#888888';
};

export const isNodeInShortestPath = (nodeId: string, path: ShortestPathResult | null): boolean => {
  return path ? path.path.includes(nodeId) : false;
};

export const isEdgeInShortestPath = (edgeId: string, path: ShortestPathResult | null): boolean => {
  return path ? path.edges.includes(edgeId) : false;
};
