import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, Settings, Expand, Download } from 'lucide-react';
import Scene3D from './Scene3D';
import ErrorBoundary from './ErrorBoundary';
import { api, GraphVisualizationData, GraphNode3D, GraphEdge3D, GraphFilters } from '../../utils/api';

interface KnowledgeGraph3DProps {
  kb_id: string;
  className?: string;
  onNodeSelect?: (node: GraphNode3D | null) => void;
  onEdgeSelect?: (edge: GraphEdge3D | null) => void;
}

const KnowledgeGraph3D: React.FC<KnowledgeGraph3DProps> = ({
  kb_id,
  className = '',
  onNodeSelect,
  onEdgeSelect
}) => {
  const [data, setData] = useState<GraphVisualizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<GraphFilters>({});
  const [selectedNode, setSelectedNode] = useState<GraphNode3D | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge3D | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const loadGraphData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const graphData = await api.getGraphVisualizationData(kb_id, filters);
      
      // Validate the data structure
      if (!graphData || !Array.isArray(graphData.nodes) || !Array.isArray(graphData.edges)) {
        throw new Error('Invalid graph data structure received from API');
      }
      
      // Ensure all nodes have required properties
      const validatedNodes = graphData.nodes.map(node => ({
        ...node,
        id: node.id || `node_${Math.random().toString(36).substr(2, 9)}`,
        label: node.label || node.id || 'Unknown',
        type: node.type || 'default',
        properties: node.properties || {},
        position: node.position || undefined
      }));
      
      // Ensure all edges have required properties and valid source/target references
      const nodeIds = new Set(validatedNodes.map(n => n.id));
      const validatedEdges = graphData.edges
        .filter(edge => {
          // Only include edges where both source and target nodes exist
          const sourceExists = nodeIds.has(edge.source);
          const targetExists = nodeIds.has(edge.target);
          if (!sourceExists || !targetExists) {
            console.warn(`Edge ${edge.id} references missing nodes: source=${edge.source} (exists: ${sourceExists}), target=${edge.target} (exists: ${targetExists})`);
          }
          return sourceExists && targetExists;
        })
        .map(edge => ({
          ...edge,
          id: edge.id || `edge_${Math.random().toString(36).substr(2, 9)}`,
          relationship: edge.relationship || 'related',
          properties: edge.properties || {}
        }));
      
      const validatedData = {
        ...graphData,
        nodes: validatedNodes,
        edges: validatedEdges
      };
      
      console.log(`Loaded graph data: ${validatedNodes.length} nodes, ${validatedEdges.length} edges`);
      setData(validatedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph data');
      console.error('Error loading graph data:', err);
    } finally {
      setLoading(false);
    }
  }, [kb_id, filters]);

  useEffect(() => {
    loadGraphData();
  }, [loadGraphData]);

  const handleNodeClick = useCallback((node: GraphNode3D) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    onNodeSelect?.(node);
  }, [onNodeSelect]);

  const handleEdgeClick = useCallback((edge: GraphEdge3D) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    onEdgeSelect?.(edge);
  }, [onEdgeSelect]);

  const handleRefresh = useCallback(() => {
    loadGraphData();
  }, [loadGraphData]);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const handleExport = useCallback(() => {
    // TODO: Implement export functionality
    console.log('Export functionality coming soon');
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 text-white ${className}`}>
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Loading 3D Knowledge Graph</h3>
          <p className="text-gray-300">Fetching graph data for {kb_id}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 text-white ${className}`}>
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-red-400">Failed to Load Graph</h3>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 text-white ${className}`}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Graph Data</h3>
          <p className="text-gray-300">No nodes or relationships found for {kb_id}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-gray-900 ${className}`}>
      {/* 3D Scene with Error Boundary */}
      <ErrorBoundary>
        <Scene3D
          data={data}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          showStats={showSettings}
          showGrid={true}
        />
      </ErrorBoundary>

      {/* Controls Bar */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg transition-colors ${
            showSettings ? 'bg-blue-600 text-white' : 'bg-black bg-opacity-60 text-white hover:bg-opacity-80'
          }`}
          title="Toggle Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
        
        <button
          onClick={toggleFullscreen}
          className="p-2 bg-black bg-opacity-60 text-white rounded-lg hover:bg-opacity-80 transition-colors"
          title="Toggle Fullscreen"
        >
          <Expand className="h-5 w-5" />
        </button>
        
        <button
          onClick={handleExport}
          className="p-2 bg-black bg-opacity-60 text-white rounded-lg hover:bg-opacity-80 transition-colors"
          title="Export Graph"
        >
          <Download className="h-5 w-5" />
        </button>
        
        <button
          onClick={handleRefresh}
          className="p-2 bg-black bg-opacity-60 text-white rounded-lg hover:bg-opacity-80 transition-colors"
          title="Refresh Graph"
        >
          <Loader2 className="h-5 w-5" />
        </button>
      </div>

      {/* Selection Details Panel */}
      {(selectedNode || selectedEdge) && (
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 text-white p-4 rounded-lg max-w-sm">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold">
              {selectedNode ? 'Node Details' : 'Edge Details'}
            </h4>
            <button
              onClick={() => {
                setSelectedNode(null);
                setSelectedEdge(null);
                onNodeSelect?.(null);
                onEdgeSelect?.(null);
              }}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
          
          {selectedNode && (
            <div className="space-y-2 text-sm">
              <div><strong>ID:</strong> {selectedNode.id}</div>
              <div><strong>Label:</strong> {selectedNode.label}</div>
              <div><strong>Type:</strong> {selectedNode.type}</div>
              {selectedNode.metadata?.source && (
                <div><strong>Source:</strong> {selectedNode.metadata.source}</div>
              )}
              {Object.keys(selectedNode.properties).length > 0 && (
                <div>
                  <strong>Properties:</strong>
                  <pre className="text-xs bg-gray-800 p-2 rounded mt-1 overflow-auto max-h-32">
                    {JSON.stringify(selectedNode.properties, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          
          {selectedEdge && (
            <div className="space-y-2 text-sm">
              <div><strong>ID:</strong> {selectedEdge.id}</div>
              <div><strong>Relationship:</strong> {selectedEdge.relationship}</div>
              <div><strong>Source:</strong> {selectedEdge.source}</div>
              <div><strong>Target:</strong> {selectedEdge.target}</div>
              {selectedEdge.weight && (
                <div><strong>Weight:</strong> {selectedEdge.weight}</div>
              )}
              {Object.keys(selectedEdge.properties).length > 0 && (
                <div>
                  <strong>Properties:</strong>
                  <pre className="text-xs bg-gray-800 p-2 rounded mt-1 overflow-auto max-h-32">
                    {JSON.stringify(selectedEdge.properties, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-16 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg w-80">
          <h4 className="font-semibold mb-4">Graph Settings</h4>
          
          {/* Filter Controls */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Node Types</label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {data.stats.nodeTypes.map((type) => (
                  <label key={type} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={!filters.nodeTypes || filters.nodeTypes.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters(prev => ({
                            ...prev,
                            nodeTypes: prev.nodeTypes?.filter(t => t !== type) || data.stats.nodeTypes
                          }));
                        } else {
                          setFilters(prev => ({
                            ...prev,
                            nodeTypes: [...(prev.nodeTypes || []), type]
                          }));
                        }
                      }}
                      className="mr-2"
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Node Limit</label>
              <input
                type="number"
                value={filters.limit || 1000}
                onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
                className="w-full px-2 py-1 bg-gray-800 rounded text-white"
                min="10"
                max="5000"
                step="50"
              />
            </div>
            
            <button
              onClick={loadGraphData}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraph3D;
