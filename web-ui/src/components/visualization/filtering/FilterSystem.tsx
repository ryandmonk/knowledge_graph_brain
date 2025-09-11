import React, { useState, useEffect, useCallback } from 'react';

export interface FilterState {
  nodeTypes: Set<string>;
  relationshipTypes: Set<string>;
  searchQuery: string;
  minConnections: number;
  maxConnections: number;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  customProperties: Record<string, any>;
}

interface FilterSystemProps {
  availableNodeTypes?: string[];
  availableRelationshipTypes?: string[];
  onFilterChange?: (filters: FilterState) => void;
  className?: string;
}

export const FilterSystem: React.FC<FilterSystemProps> = ({
  availableNodeTypes = [],
  availableRelationshipTypes = [],
  onFilterChange,
  className = ''
}) => {
  const [filters, setFilters] = useState<FilterState>({
    nodeTypes: new Set(),
    relationshipTypes: new Set(),
    searchQuery: '',
    minConnections: 0,
    maxConnections: 100,
    dateRange: {
      start: null,
      end: null
    },
    customProperties: {}
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'types' | 'search' | 'connections' | 'advanced'>('search');

  // Notify parent of filter changes
  useEffect(() => {
    onFilterChange?.(filters);
  }, [filters, onFilterChange]);

  // Handle node type filtering
  const toggleNodeType = useCallback((nodeType: string) => {
    setFilters(prev => {
      const newNodeTypes = new Set(prev.nodeTypes);
      if (newNodeTypes.has(nodeType)) {
        newNodeTypes.delete(nodeType);
      } else {
        newNodeTypes.add(nodeType);
      }
      return { ...prev, nodeTypes: newNodeTypes };
    });
  }, []);

  // Handle relationship type filtering
  const toggleRelationshipType = useCallback((relType: string) => {
    setFilters(prev => {
      const newRelTypes = new Set(prev.relationshipTypes);
      if (newRelTypes.has(relType)) {
        newRelTypes.delete(relType);
      } else {
        newRelTypes.add(relType);
      }
      return { ...prev, relationshipTypes: newRelTypes };
    });
  }, []);

  // Handle search query
  const handleSearchChange = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilters({
      nodeTypes: new Set(),
      relationshipTypes: new Set(),
      searchQuery: '',
      minConnections: 0,
      maxConnections: 100,
      dateRange: {
        start: null,
        end: null
      },
      customProperties: {}
    });
  }, []);

  // Quick filter presets
  const applyQuickFilter = useCallback((preset: 'high-activity' | 'recent' | 'clusters') => {
    switch (preset) {
      case 'high-activity':
        setFilters(prev => ({
          ...prev,
          minConnections: 5,
          maxConnections: 100
        }));
        break;
      case 'recent':
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        setFilters(prev => ({
          ...prev,
          dateRange: {
            start: oneWeekAgo,
            end: new Date()
          }
        }));
        break;
      case 'clusters':
        setFilters(prev => ({
          ...prev,
          minConnections: 3,
          maxConnections: 100
        }));
        break;
    }
  }, []);

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg ${className}`}>
      {/* Filter Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔍</span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Filters
          </h3>
          {(filters.nodeTypes.size > 0 || 
            filters.relationshipTypes.size > 0 || 
            filters.searchQuery || 
            filters.minConnections > 0) && (
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearAllFilters}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Clear All
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Quick Search */}
      <div className="p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search nodes and relationships..."
            value={filters.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          {filters.searchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Quick Filter Presets */}
      <div className="px-4 pb-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => applyQuickFilter('high-activity')}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                     rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            📈 High Activity
          </button>
          <button
            onClick={() => applyQuickFilter('recent')}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                     rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            🕒 Recent
          </button>
          <button
            onClick={() => applyQuickFilter('clusters')}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                     rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            🔗 Clusters
          </button>
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-600">
          {/* Filter Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-600">
            {[
              { id: 'types', label: 'Types', icon: '🏷️' },
              { id: 'search', label: 'Search', icon: '🔍' },
              { id: 'connections', label: 'Connections', icon: '🔗' },
              { id: 'advanced', label: 'Advanced', icon: '⚙️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filter Content */}
          <div className="p-4">
            {activeTab === 'types' && (
              <div className="space-y-4">
                {/* Node Types */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Node Types
                  </h4>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {availableNodeTypes.map((nodeType) => (
                      <label key={nodeType} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={filters.nodeTypes.has(nodeType)}
                          onChange={() => toggleNodeType(nodeType)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {nodeType}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Relationship Types */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Relationship Types
                  </h4>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {availableRelationshipTypes.map((relType) => (
                      <label key={relType} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={filters.relationshipTypes.has(relType)}
                          onChange={() => toggleRelationshipType(relType)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {relType}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'search' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Advanced Search
                  </label>
                  <textarea
                    placeholder="Enter search criteria..."
                    value={filters.searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {activeTab === 'connections' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Minimum Connections: {filters.minConnections}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={filters.minConnections}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      minConnections: parseInt(e.target.value) 
                    }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Maximum Connections: {filters.maxConnections}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={filters.maxConnections}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      maxConnections: parseInt(e.target.value) 
                    }))}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="space-y-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Advanced filtering options coming soon...
                </div>
                {/* Date Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Date Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded 
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, start: new Date(e.target.value) }
                      }))}
                    />
                    <input
                      type="date"
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded 
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, end: new Date(e.target.value) }
                      }))}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterSystem;
