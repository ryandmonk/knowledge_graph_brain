import { forceSimulation, forceLink, forceManyBody, forceCenter, forceX, forceY, forceZ } from 'd3-force-3d';
import { GraphNode3D, GraphEdge3D } from '../../../utils/api';

export interface LayoutNode extends GraphNode3D {
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
}

export interface LayoutEdge {
  id: string;
  source: LayoutNode | string;
  target: LayoutNode | string;
  relationship: string;
  properties: Record<string, any>;
  weight?: number;
  color?: string;
  metadata?: {
    created_at?: string;
    strength?: number;
    confidence?: number;
  };
}

export interface ForceParameters {
  linkDistance: number;
  linkStrength: number;
  chargeStrength: number;
  centerStrength: number;
  alphaDecay: number;
  velocityDecay: number;
  bounds?: {
    x: [number, number];
    y: [number, number];
    z: [number, number];
  };
}

export const DEFAULT_FORCE_PARAMETERS: ForceParameters = {
  linkDistance: 50,
  linkStrength: 0.5,
  chargeStrength: -300,
  centerStrength: 0.1,
  alphaDecay: 0.02,
  velocityDecay: 0.4,
  bounds: {
    x: [-200, 200],
    y: [-200, 200],
    z: [-200, 200]
  }
};

export class GraphLayout {
  private simulation: any;
  private nodes: LayoutNode[] = [];
  private edges: LayoutEdge[] = [];
  private parameters: ForceParameters;
  private onUpdate?: (nodes: LayoutNode[], edges: LayoutEdge[]) => void;

  constructor(parameters: Partial<ForceParameters> = {}) {
    this.parameters = { ...DEFAULT_FORCE_PARAMETERS, ...parameters };
    this.initializeSimulation();
  }

  private initializeSimulation() {
    this.simulation = forceSimulation()
      .alphaDecay(this.parameters.alphaDecay)
      .velocityDecay(this.parameters.velocityDecay);

    this.setupForces();
  }

  private setupForces() {
    const { linkDistance, linkStrength, chargeStrength, centerStrength, bounds } = this.parameters;

    // Link force for edges
    this.simulation.force('link', forceLink()
      .distance(linkDistance)
      .strength(linkStrength)
      .id((d: any) => d.id)
    );

    // Charge force for node repulsion
    this.simulation.force('charge', forceManyBody()
      .strength(chargeStrength)
    );

    // Center force to keep graph centered
    this.simulation.force('center', forceCenter(0, 0, 0)
      .strength(centerStrength)
    );

    // Boundary forces if bounds are specified
    if (bounds) {
      this.simulation.force('x', forceX(0).strength(0.1));
      this.simulation.force('y', forceY(0).strength(0.1));
      this.simulation.force('z', forceZ(0).strength(0.1));
    }

    // Update callback
    this.simulation.on('tick', () => {
      if (this.onUpdate) {
        this.onUpdate(this.nodes, this.edges);
      }
    });
  }

  setData(nodes: GraphNode3D[], edges: GraphEdge3D[]) {
    // Convert to layout nodes with initial positions - create proper mutable copies
    this.nodes = nodes.map(node => {
      const layoutNode: LayoutNode = {
        id: node.id,
        label: node.label,
        type: node.type,
        properties: { ...node.properties },
        size: node.size,
        color: node.color,
        position: node.position ? { ...node.position } : undefined,
        metadata: node.metadata ? { ...node.metadata } : undefined,
        x: node.position?.x ?? (Math.random() - 0.5) * 100,
        y: node.position?.y ?? (Math.random() - 0.5) * 100,
        z: node.position?.z ?? (Math.random() - 0.5) * 100
      };
      return layoutNode;
    });

    // Convert to layout edges - create proper mutable copies
    this.edges = edges.map(edge => {
      const layoutEdge: LayoutEdge = {
        id: edge.id,
        source: this.nodes.find(n => n.id === edge.source) || edge.source,
        target: this.nodes.find(n => n.id === edge.target) || edge.target,
        relationship: edge.relationship,
        properties: { ...edge.properties },
        weight: edge.weight,
        color: edge.color,
        metadata: edge.metadata ? { ...edge.metadata } : undefined
      };
      return layoutEdge;
    });

    // Update simulation
    this.simulation.nodes(this.nodes);
    this.simulation.force('link').links(this.edges);
    this.simulation.alpha(1).restart();
  }

  setUpdateCallback(callback: (nodes: LayoutNode[], edges: LayoutEdge[]) => void) {
    this.onUpdate = callback;
  }

  updateParameters(newParameters: Partial<ForceParameters>) {
    this.parameters = { ...this.parameters, ...newParameters };
    this.setupForces();
    this.simulation.alpha(0.3).restart();
  }

  pinNode(nodeId: string, position: { x: number; y: number; z: number }) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.fx = position.x;
      node.fy = position.y;
      node.fz = position.z;
      this.simulation.alpha(0.3).restart();
    }
  }

  unpinNode(nodeId: string) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.fx = null;
      node.fy = null;
      node.fz = null;
      this.simulation.alpha(0.3).restart();
    }
  }

  stop() {
    this.simulation.stop();
  }

  restart() {
    this.simulation.alpha(1).restart();
  }

  getNodes(): LayoutNode[] {
    return this.nodes;
  }

  getEdges(): LayoutEdge[] {
    return this.edges;
  }

  // Performance optimization: cluster nodes for large graphs
  createClusters(maxClusterSize: number = 50): { clusters: LayoutNode[][], clusterCenters: LayoutNode[] } {
    if (this.nodes.length <= maxClusterSize) {
      return { clusters: [this.nodes], clusterCenters: [] };
    }

    // Simple spatial clustering based on node positions
    const clusters: LayoutNode[][] = [];
    const clusterCenters: LayoutNode[] = [];
    const remaining = [...this.nodes];

    while (remaining.length > 0) {
      const seed = remaining.shift()!;
      const cluster = [seed];
      
      // Find nearby nodes
      for (let i = remaining.length - 1; i >= 0; i--) {
        const node = remaining[i];
        const distance = Math.sqrt(
          Math.pow((seed.x || 0) - (node.x || 0), 2) +
          Math.pow((seed.y || 0) - (node.y || 0), 2) +
          Math.pow((seed.z || 0) - (node.z || 0), 2)
        );
        
        if (distance < 100 && cluster.length < maxClusterSize) {
          cluster.push(node);
          remaining.splice(i, 1);
        }
      }
      
      clusters.push(cluster);
      
      // Create cluster center
      const centerX = cluster.reduce((sum, n) => sum + (n.x || 0), 0) / cluster.length;
      const centerY = cluster.reduce((sum, n) => sum + (n.y || 0), 0) / cluster.length;
      const centerZ = cluster.reduce((sum, n) => sum + (n.z || 0), 0) / cluster.length;
      
      clusterCenters.push({
        id: `cluster_${clusters.length - 1}`,
        label: `Cluster (${cluster.length} nodes)`,
        type: 'Cluster',
        properties: { nodeCount: cluster.length },
        x: centerX,
        y: centerY,
        z: centerZ,
        size: Math.log(cluster.length) * 2
      });
    }

    return { clusters, clusterCenters };
  }
}

// Utility function to create optimized layout for large graphs
export function createOptimizedLayout(
  nodes: GraphNode3D[], 
  edges: GraphEdge3D[], 
  maxNodes: number = 1000
): { layout: GraphLayout; usesClustering: boolean } {
  const layout = new GraphLayout();
  
  if (nodes.length > maxNodes) {
    // Use clustering for performance
    layout.setData(nodes.slice(0, maxNodes), edges.filter(e => 
      nodes.slice(0, maxNodes).some(n => n.id === e.source) &&
      nodes.slice(0, maxNodes).some(n => n.id === e.target)
    ));
    return { layout, usesClustering: true };
  } else {
    layout.setData(nodes, edges);
    return { layout, usesClustering: false };
  }
}
