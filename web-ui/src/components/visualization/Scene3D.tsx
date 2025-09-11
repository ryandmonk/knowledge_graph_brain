import React, { Suspense, useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, extend } from '@react-three/fiber';
import { OrbitControls, Stats, Grid, Environment } from '@react-three/drei';
import { AlertCircle } from 'lucide-react';
import { GraphVisualizationData, GraphNode3D, GraphEdge3D } from '../../utils/api';
import GraphNode from './nodes/GraphNode';
import GraphEdge from './edges/GraphEdge';
import { GraphLayout, LayoutNode, LayoutEdge, createOptimizedLayout } from './utils/graphLayout';
import Navigation3D from './controls/Navigation3D';
import SelectionManager, { SelectionState } from './selection/SelectionManager';
import ContextMenu from './selection/ContextMenu';
import FilterSystem, { FilterState } from './filtering/FilterSystem';
import { AnalyticsPanel } from './analytics/AnalyticsPanel';
import { GraphAnalytics, ShortestPathResult, generateCommunityColors, getNodeCommunityColor, isNodeInShortestPath, isEdgeInShortestPath } from './utils/graphAnalytics';
import { LightingSystem } from './effects/LightingSystem';

// Extend Three.js objects for React Three Fiber
extend({ OrbitControls });

interface Scene3DProps {
  data: GraphVisualizationData;
  onNodeClick?: (node: GraphNode3D) => void;
  onEdgeClick?: (edge: GraphEdge3D) => void;
  showStats?: boolean;
  showGrid?: boolean;
  showFilters?: boolean;
  showAnalytics?: boolean;
  cameraPosition?: [number, number, number];
  backgroundColor?: string;
}

const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-full bg-gray-900 text-white">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
      <p>Loading 3D Scene...</p>
    </div>
  </div>
);

const Scene3D: React.FC<Scene3DProps> = ({
  data,
  onNodeClick,
  onEdgeClick,
  showStats = false,
  showGrid = true,
  showFilters = true,
  showAnalytics = true,
  cameraPosition = [50, 50, 50],
  backgroundColor = '#0f0f0f'
}) => {
  // Guard against invalid data
  if (!data || !data.nodes || !data.edges || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <p>No graph data available</p>
        </div>
      </div>
    );
  }

  // Handle empty data
  if (data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-gray-600 mx-auto mb-2"></div>
          <p>No nodes to visualize</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or adding data to this knowledge base</p>
        </div>
      </div>
    );
  }

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>([]);
  const [layoutEdges, setLayoutEdges] = useState<LayoutEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode3D | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge3D | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode3D | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdge3D | null>(null);
  const [selection, setSelection] = useState<SelectionState>({
    selectedNodes: new Set(),
    selectedEdges: new Set(),
    hoveredNode: null,
    hoveredEdge: null,
    contextMenu: {
      visible: false,
      x: 0,
      y: 0,
      type: null,
      targetId: null
    }
  });
  const [filters, setFilters] = useState<FilterState>({
    nodeTypes: new Set(),
    relationshipTypes: new Set(),
    searchQuery: '',
    minConnections: 0,
    maxConnections: 100,
    dateRange: { start: null, end: null },
    customProperties: {}
  });
  const [filteredNodes, setFilteredNodes] = useState<LayoutNode[]>([]);
  const [filteredEdges, setFilteredEdges] = useState<LayoutEdge[]>([]);
  const layoutRef = useRef<GraphLayout | null>(null);

  // Analytics state
  const [analytics, setAnalytics] = useState<GraphAnalytics | null>(null);
  const [communityVisualizationEnabled, setCommunityVisualizationEnabled] = useState(false);
  const [shortestPath, setShortestPath] = useState<ShortestPathResult | null>(null);
  const [communityColors, setCommunityColors] = useState<Map<number, string>>(new Map());

  // Initialize layout system
  useEffect(() => {
    if (data.nodes.length === 0) return;

    const { layout } = createOptimizedLayout(data.nodes, data.edges);
    layoutRef.current = layout;

    // Set up layout update callback
    layout.setUpdateCallback((nodes: LayoutNode[], edges: LayoutEdge[]) => {
      setLayoutNodes([...nodes]);
      setLayoutEdges([...edges]);
    });

    // Initial positions
    setLayoutNodes(layout.getNodes());
    setLayoutEdges(layout.getEdges());
    
    // Simulate loading time for scene setup
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => {
      clearTimeout(timer);
      layout.stop();
    };
  }, [data]);

  // Apply filters to nodes and edges
  useEffect(() => {
    let filtered = layoutNodes;
    
    // Filter by node types
    if (filters.nodeTypes.size > 0) {
      filtered = filtered.filter(node => 
        filters.nodeTypes.has(node.type)
      );
    }
    
    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(node => 
        node.label.toLowerCase().includes(query) ||
        node.id.toLowerCase().includes(query) ||
        Object.values(node.properties || {}).some(prop => 
          String(prop).toLowerCase().includes(query)
        )
      );
    }
    
    // Filter by connections
    const nodeConnections = new Map<string, number>();
    layoutEdges.forEach(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      nodeConnections.set(sourceId, (nodeConnections.get(sourceId) || 0) + 1);
      nodeConnections.set(targetId, (nodeConnections.get(targetId) || 0) + 1);
    });
    
    filtered = filtered.filter(node => {
      const connections = nodeConnections.get(node.id) || 0;
      return connections >= filters.minConnections && connections <= filters.maxConnections;
    });
    
    setFilteredNodes(filtered);
    
    // Filter edges based on filtered nodes
    const filteredNodeIds = new Set(filtered.map(n => n.id));
    const filteredEdgeList = layoutEdges.filter(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
    });
    
    // Filter by relationship types
    if (filters.relationshipTypes.size > 0) {
      setFilteredEdges(filteredEdgeList.filter(edge => 
        filters.relationshipTypes.has(edge.relationship)
      ));
    } else {
      setFilteredEdges(filteredEdgeList);
    }
  }, [layoutNodes, layoutEdges, filters]);

  // Handle context menu actions
  const handleContextAction = useCallback((action: string, targetId: string, targetType: 'node' | 'edge') => {
    console.log(`Context action: ${action} on ${targetType} ${targetId}`);
    
    switch (action) {
      case 'focus':
        if (targetType === 'node') {
          const node = filteredNodes.find(n => n.id === targetId);
          if (node) {
            console.log('Focus on node:', node);
            // Future: animate camera to node position
          }
        }
        break;
      case 'hide':
        // Future: implement hide functionality
        console.log('Hide element:', targetId);
        break;
      case 'properties':
        // Future: show properties panel
        console.log('Show properties for:', targetId);
        break;
      case 'delete':
        // Future: implement delete functionality
        console.log('Delete element:', targetId);
        break;
    }
  }, [filteredNodes]);

  // Close context menu
  const handleCloseContextMenu = useCallback(() => {
    setSelection(prev => ({
      ...prev,
      contextMenu: { ...prev.contextMenu, visible: false }
    }));
  }, []);

  const handleNodeClick = useCallback((node: GraphNode3D) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    onNodeClick?.(node);
  }, [onNodeClick]);

  const handleEdgeClick = useCallback((edge: LayoutEdge) => {
    // Convert LayoutEdge to GraphEdge3D for the callback
    const graphEdge: GraphEdge3D = {
      id: edge.id,
      source: typeof edge.source === 'string' ? edge.source : edge.source.id,
      target: typeof edge.target === 'string' ? edge.target : edge.target.id,
      relationship: edge.relationship,
      properties: edge.properties,
      weight: edge.weight,
      color: edge.color,
      metadata: edge.metadata
    };
    setSelectedEdge(graphEdge);
    setSelectedNode(null);
    onEdgeClick?.(graphEdge);
  }, [onEdgeClick]);

  const handleNodeHover = useCallback((node: GraphNode3D | null) => {
    setHoveredNode(node);
  }, []);

  const handleEdgeHover = useCallback((edge: LayoutEdge | null) => {
    setHoveredEdge(edge as GraphEdge3D | null);
  }, []);

  // Analytics callback functions
  const handleAnalyticsUpdate = useCallback((newAnalytics: GraphAnalytics) => {
    setAnalytics(newAnalytics);
    // Generate community colors when analytics is updated
    if (newAnalytics.communities.length > 0) {
      const colors = generateCommunityColors(newAnalytics.communities);
      setCommunityColors(colors);
    }
  }, []);

  const handleCommunityVisualizationToggle = useCallback((enabled: boolean) => {
    setCommunityVisualizationEnabled(enabled);
  }, []);

  const handleShortestPathVisualization = useCallback((path: ShortestPathResult | null) => {
    setShortestPath(path);
  }, []);

  // Get node color based on visualization mode
  const getNodeColor = useCallback((node: LayoutNode): string => {
    // Priority 1: Shortest path highlighting
    if (shortestPath && isNodeInShortestPath(node.id, shortestPath)) {
      return '#ff6b6b'; // Red for path nodes
    }
    
    // Priority 2: Community visualization
    if (communityVisualizationEnabled && analytics?.communities) {
      return getNodeCommunityColor(node.id, analytics.communities, communityColors);
    }
    
    // Default: Use original node color
    return node.color || '#4A90E2';
  }, [shortestPath, communityVisualizationEnabled, analytics, communityColors]);

  // Get node activity level based on centrality metrics
  const getNodeActivityLevel = useCallback((nodeId: string): number => {
    if (!analytics?.centralityMetrics) return 0;
    
    const metrics = analytics.centralityMetrics.find(m => m.nodeId === nodeId);
    if (!metrics) return 0;
    
    // Combine multiple centrality metrics for activity level
    const normalizedPagerank = Math.min(1, metrics.pagerank * 10); // Scale PageRank
    const normalizedBetweenness = Math.min(1, metrics.betweenness / 100); // Scale betweenness
    const normalizedDegree = Math.min(1, metrics.degree / 20); // Scale degree
    
    return (normalizedPagerank + normalizedBetweenness + normalizedDegree) / 3;
  }, [analytics]);

  // Get edge color based on visualization mode  
  const getEdgeColor = useCallback((edge: LayoutEdge): string => {
    // Priority 1: Shortest path highlighting
    if (shortestPath && isEdgeInShortestPath(edge.id, shortestPath)) {
      return '#ff6b6b'; // Red for path edges
    }
    
    // Default: Use original edge color
    return edge.color || '#888888';
  }, [shortestPath]);

  if (isLoading) {
    return <LoadingFallback />;
  }

  return (
    <div className="w-full h-full relative">
      <Canvas
        ref={canvasRef}
        camera={{
          position: cameraPosition,
          fov: 60,
          near: 0.1,
          far: 2000
        }}
        gl={{ 
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance'
        }}
        style={{ background: backgroundColor }}
      >
        <Suspense fallback={null}>
          {/* Enhanced Lighting System */}
          <LightingSystem
            analytics={analytics}
            communityVisualizationEnabled={communityVisualizationEnabled}
            enableShadows={true}
            lightingIntensity={1.0}
            dynamicLighting={true}
          />

          {/* Environment for better lighting */}
          <Environment preset="night" />

          {/* Enhanced Navigation Controls */}
          <Navigation3D enabled={true} />
          
          {/* Selection Manager */}
          <SelectionManager
            onSelectionChange={setSelection}
            multiSelect={true}
            enabled={true}
          />

          {/* Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            dampingFactor={0.05}
            enableDamping={true}
            maxDistance={500}
            minDistance={10}
            maxPolarAngle={Math.PI}
            minPolarAngle={0}
          />

          {/* Grid for spatial reference */}
          {showGrid && (
            <Grid
              args={[200, 200]}
              position={[0, -50, 0]}
              cellSize={5}
              cellThickness={0.5}
              cellColor="#333333"
              sectionSize={25}
              sectionThickness={1}
              sectionColor="#666666"
              fadeDistance={400}
              fadeStrength={1}
              followCamera={false}
              infiniteGrid={true}
            />
          )}

          {/* Nodes with filtered data, analytics colors, and pulsing effects */}
          {filteredNodes.map((node) => (
            <GraphNode
              key={node.id}
              node={{
                ...node,
                color: getNodeColor(node)
              }}
              position={[node.x || 0, node.y || 0, node.z || 0]}
              isSelected={selectedNode?.id === node.id}
              isHovered={hoveredNode?.id === node.id}
              onClick={handleNodeClick}
              onHover={handleNodeHover}
              showLabel={true}
              activityLevel={getNodeActivityLevel(node.id)}
              enablePulsing={true}
            />
          ))}

          {/* Edges with filtered data, analytics colors, and particle effects */}
          {filteredEdges.map((edge) => {
            const sourceNode = filteredNodes.find(n => n.id === (typeof edge.source === 'string' ? edge.source : edge.source.id));
            const targetNode = filteredNodes.find(n => n.id === (typeof edge.target === 'string' ? edge.target : edge.target.id));
            
            if (!sourceNode || !targetNode) return null;
            
            const isPathEdge = shortestPath?.edges.includes(edge.id) || false;
            
            return (
              <GraphEdge
                key={edge.id}
                edge={{
                  ...edge,
                  color: getEdgeColor(edge)
                }}
                sourceNode={sourceNode}
                targetNode={targetNode}
                isSelected={selectedEdge?.id === edge.id}
                isHovered={hoveredEdge?.id === edge.id}
                onClick={handleEdgeClick}
                onHover={handleEdgeHover}
                animated={isPathEdge}
                showParticles={isPathEdge || (edge.weight || 0) > 2}
                particleCount={Math.min(8, Math.max(3, Math.floor((edge.weight || 1) * 2)))}
              />
            );
          })}

          {/* Performance Stats */}
          {showStats && <Stats />}
        </Suspense>
      </Canvas>

      {/* Filter System */}
      {showFilters && (
        <div className="absolute top-4 right-4 w-80">
          <FilterSystem
            availableNodeTypes={data.stats.nodeTypes}
            availableRelationshipTypes={data.stats.relationshipTypes}
            onFilterChange={setFilters}
          />
        </div>
      )}

      {/* Analytics Panel */}
      {showAnalytics && (
        <div className="absolute top-4 left-4 w-80 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <AnalyticsPanel
            nodes={filteredNodes}
            edges={filteredEdges}
            onAnalyticsUpdate={handleAnalyticsUpdate}
            onCommunityVisualizationToggle={handleCommunityVisualizationToggle}
            onShortestPathVisualization={handleShortestPathVisualization}
            selectedNodes={selection.selectedNodes}
          />
        </div>
      )}

      {/* Context Menu */}
      <ContextMenu
        selection={selection}
        onAction={handleContextAction}
        onClose={handleCloseContextMenu}
      />

      {/* UI Overlay - Graph Statistics */}
      <div className={`absolute ${showAnalytics ? 'bottom-4 left-4' : 'top-4 left-4'} bg-black bg-opacity-60 text-white p-3 rounded-lg text-sm`}>
        <div className="font-semibold mb-1">Graph Statistics</div>
        <div>Nodes: {filteredNodes.length} / {data.stats.nodeCount}</div>
        <div>Edges: {filteredEdges.length} / {data.stats.edgeCount}</div>
        <div>Node Types: {data.stats.nodeTypes.length}</div>
        <div>Relationship Types: {data.stats.relationshipTypes.length}</div>
        {(filters.nodeTypes.size > 0 || 
          filters.relationshipTypes.size > 0 || 
          filters.searchQuery || 
          filters.minConnections > 0) && (
          <div className="mt-2 pt-2 border-t border-gray-500">
            <div className="text-xs text-blue-300">Filters Active</div>
          </div>
        )}
        {/* Analytics status indicators */}
        {communityVisualizationEnabled && (
          <div className="mt-2 pt-2 border-t border-gray-500">
            <div className="text-xs text-green-300">Community Visualization ON</div>
          </div>
        )}
        {shortestPath && (
          <div className="mt-1">
            <div className="text-xs text-red-300">Path Highlighted</div>
          </div>
        )}
      </div>

      {/* Enhanced Controls Help */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white p-3 rounded-lg text-sm max-w-xs">
        <div className="font-semibold mb-1">3D Controls</div>
        <div>• Mouse: Rotate view</div>
        <div>• Scroll: Zoom in/out</div>
        <div>• Right-click + drag: Pan</div>
        <div>• WASD: Move camera</div>
        <div>• Click: Select nodes/edges</div>
        <div>• Ctrl+Click: Multi-select</div>
        <div>• Right-click: Context menu</div>
        <div>• Esc: Clear selection</div>
      </div>
    </div>
  );
};

export default Scene3D;
