/**
 * Analytics Panel Component
 * 
 * Provides UI controls and displays for graph analytics:
 * - Community detection controls and visualization
 * - Shortest path finding interface
 * - Centrality metrics display
 * - Graph statistics and insights
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  GraphAnalyticsEngine, 
  ShortestPathResult, 
  GraphAnalytics,
  generateCommunityColors
} from '../utils/graphAnalytics';
import { LayoutNode, LayoutEdge } from '../utils/graphLayout';

interface AnalyticsPanelProps {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  onAnalyticsUpdate: (analytics: GraphAnalytics) => void;
  onCommunityVisualizationToggle: (enabled: boolean) => void;
  onShortestPathVisualization: (path: ShortestPathResult | null) => void;
  selectedNodes: Set<string>;
  className?: string;
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({
  nodes,
  edges,
  onAnalyticsUpdate,
  onCommunityVisualizationToggle,
  onShortestPathVisualization,
  selectedNodes,
  className = ''
}) => {
  const [analytics, setAnalytics] = useState<GraphAnalytics | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [communityVisualizationEnabled, setCommunityVisualizationEnabled] = useState(false);
  const [shortestPath, setShortestPath] = useState<ShortestPathResult | null>(null);
  const [pathFindingNodes, setPathFindingNodes] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedMetric, setSelectedMetric] = useState<'betweenness' | 'closeness' | 'pagerank' | 'degree'>('pagerank');

  // Initialize analytics engine
  const analyticsEngine = useMemo(() => {
    return new GraphAnalyticsEngine(nodes, edges);
  }, [nodes, edges]);

  // Community colors for visualization
  const communityColors = useMemo(() => {
    if (analytics?.communities) {
      return generateCommunityColors(analytics.communities);
    }
    return new Map<number, string>();
  }, [analytics?.communities]);

  // Run full graph analysis
  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      // Run analysis in a timeout to prevent UI blocking
      const result = await new Promise<GraphAnalytics>((resolve) => {
        setTimeout(() => {
          const analysis = analyticsEngine.performFullAnalysis();
          resolve(analysis);
        }, 10);
      });
      
      setAnalytics(result);
      onAnalyticsUpdate(result);
    } catch (error) {
      console.error('Analytics analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [analyticsEngine, onAnalyticsUpdate]);

  // Toggle community visualization
  const toggleCommunityVisualization = useCallback(() => {
    const newState = !communityVisualizationEnabled;
    setCommunityVisualizationEnabled(newState);
    onCommunityVisualizationToggle(newState);
  }, [communityVisualizationEnabled, onCommunityVisualizationToggle]);

  // Find shortest path between selected nodes
  const findShortestPath = useCallback(() => {
    if (pathFindingNodes.start && pathFindingNodes.end) {
      // Use the PathFinding class directly for immediate results
      const pathFinding = new (require('../utils/graphAnalytics').PathFinding)(nodes, edges);
      const path = pathFinding.findShortestPath(pathFindingNodes.start, pathFindingNodes.end);
      
      setShortestPath(path);
      onShortestPathVisualization(path);
    }
  }, [pathFindingNodes, nodes, edges, onShortestPathVisualization]);

  // Clear shortest path visualization
  const clearShortestPath = useCallback(() => {
    setShortestPath(null);
    onShortestPathVisualization(null);
  }, [onShortestPathVisualization]);

  // Get top nodes by centrality metric
  const getTopNodes = useCallback((metric: 'betweenness' | 'closeness' | 'pagerank' | 'degree', count: number = 5) => {
    if (!analytics?.centralityMetrics) return [];
    
    return [...analytics.centralityMetrics]
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, count);
  }, [analytics?.centralityMetrics]);

  // Auto-fill path finding with selected nodes
  React.useEffect(() => {
    const selectedArray = Array.from(selectedNodes);
    if (selectedArray.length >= 2) {
      setPathFindingNodes({
        start: selectedArray[0],
        end: selectedArray[1]
      });
    }
  }, [selectedNodes]);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Graph Analytics
          </h3>
          <button
            onClick={runAnalysis}
            disabled={isAnalyzing || nodes.length === 0}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isAnalyzing || nodes.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>

        {/* Graph Statistics */}
        {analytics && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Nodes</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">{nodes.length}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Edges</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">{edges.length}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Density</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {(analytics.density * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Communities</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {new Set(analytics.communities.map(c => c.communityId)).size}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Clustering</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {analytics.clusteringCoefficient.toFixed(3)}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Avg Path</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {analytics.averagePathLength.toFixed(1)}
              </div>
            </div>
          </div>
        )}

        {/* Community Detection */}
        <div className="space-y-3">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">Community Detection</h4>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleCommunityVisualization}
              disabled={!analytics}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                communityVisualizationEnabled
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              } ${!analytics ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {communityVisualizationEnabled ? 'Hide Communities' : 'Show Communities'}
            </button>
            
            {analytics && (
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {new Set(analytics.communities.map(c => c.communityId)).size} communities found
              </span>
            )}
          </div>

          {/* Community Color Legend */}
          {communityVisualizationEnabled && analytics && (
            <div className="grid grid-cols-4 gap-2">
              {Array.from(communityColors.entries()).map(([communityId, color]) => (
                <div key={communityId} className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    Group {communityId}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Shortest Path Finding */}
        <div className="space-y-3">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">Shortest Path</h4>
          
          <div className="grid grid-cols-2 gap-2">
            <select
              value={pathFindingNodes.start}
              onChange={(e) => setPathFindingNodes(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">Select start node</option>
              {nodes.map(node => (
                <option key={node.id} value={node.id}>
                  {node.label || node.id}
                </option>
              ))}
            </select>
            
            <select
              value={pathFindingNodes.end}
              onChange={(e) => setPathFindingNodes(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">Select end node</option>
              {nodes.map(node => (
                <option key={node.id} value={node.id}>
                  {node.label || node.id}
                </option>
              ))}
            </select>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={findShortestPath}
              disabled={!pathFindingNodes.start || !pathFindingNodes.end}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                !pathFindingNodes.start || !pathFindingNodes.end
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              Find Path
            </button>
            
            {shortestPath && (
              <button
                onClick={clearShortestPath}
                className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Clear Path
              </button>
            )}
          </div>

          {shortestPath && (
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
              <div className="text-sm font-medium text-purple-900 dark:text-purple-200">
                Path found: {shortestPath.path.length} nodes, distance: {shortestPath.distance.toFixed(2)}
              </div>
              <div className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                {shortestPath.path.map(nodeId => {
                  const node = nodes.find(n => n.id === nodeId);
                  return node?.label || nodeId;
                }).join(' → ')}
              </div>
            </div>
          )}
        </div>

        {/* Centrality Metrics */}
        <div className="space-y-3">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">Centrality Metrics</h4>
          
          <div className="flex space-x-2">
            {(['pagerank', 'betweenness', 'closeness', 'degree'] as const).map((metric) => (
              <button
                key={metric}
                onClick={() => setSelectedMetric(metric)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedMetric === metric
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
              >
                {metric.charAt(0).toUpperCase() + metric.slice(1)}
              </button>
            ))}
          </div>

          {analytics && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Top nodes by {selectedMetric}:
              </div>
              {getTopNodes(selectedMetric).map((node, index) => (
                <div 
                  key={node.nodeId} 
                  className="flex justify-between items-center py-1 px-2 bg-gray-50 dark:bg-gray-700 rounded"
                >
                  <span className="text-sm text-gray-900 dark:text-white">
                    {index + 1}. {nodes.find(n => n.id === node.nodeId)?.label || node.nodeId}
                  </span>
                  <span className="text-sm font-mono text-gray-600 dark:text-gray-300">
                    {node[selectedMetric].toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Nodes Info */}
        {selectedNodes.size > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <div className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Selected Nodes ({selectedNodes.size})
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              {selectedNodes.size >= 2 ? 'Click "Find Path" to see shortest path between first two selected nodes' : 'Select 2+ nodes to find paths between them'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
