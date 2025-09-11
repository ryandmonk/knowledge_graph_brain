import { useState } from 'react';
import { 
  queryTemplates, 
  searchTemplates,
  templateCategories,
  type QueryTemplate 
} from '../utils/queryTemplates';

interface QueryTemplateSelectorProps {
  onSelectTemplate: (template: QueryTemplate) => void;
  onClose: () => void;
}

export function QueryTemplateSelector({ onSelectTemplate, onClose }: QueryTemplateSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedComplexity, setSelectedComplexity] = useState<string>('all');

  const filteredTemplates = (() => {
    let templates = queryTemplates;

    // Apply search filter
    if (searchTerm.trim()) {
      templates = searchTemplates(searchTerm);
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      templates = templates.filter(t => t.category === selectedCategory);
    }

    // Apply complexity filter
    if (selectedComplexity !== 'all') {
      templates = templates.filter(t => t.complexity === selectedComplexity);
    }

    return templates;
  })();

  const handleTemplateSelect = (template: QueryTemplate) => {
    onSelectTemplate(template);
    onClose();
  };

  const complexityColors = {
    beginner: 'bg-green-100 text-green-800',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-red-100 text-red-800'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Query Templates</h2>
            <p className="text-sm text-gray-600 mt-1">Choose from pre-built queries to get started</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <div className="space-y-4">
            {/* Search */}
            <div>
              <label htmlFor="template-search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Templates
              </label>
              <input
                type="text"
                id="template-search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, description, or tags..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category Filter */}
              <div>
                <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  id="category-filter"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  {Object.entries(templateCategories).map(([key, cat]) => (
                    <option key={key} value={key}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Complexity Filter */}
              <div>
                <label htmlFor="complexity-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Complexity
                </label>
                <select
                  id="complexity-filter"
                  value={selectedComplexity}
                  onChange={(e) => setSelectedComplexity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Templates List */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-500">No templates match your current filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">
                        {templateCategories[template.category].icon}
                      </span>
                      <h3 className="font-semibold text-gray-900">
                        {template.name}
                      </h3>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${complexityColors[template.complexity]}`}>
                      {template.complexity}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">
                    {template.description}
                  </p>
                  
                  <div className="bg-gray-50 p-3 rounded border mb-3">
                    <p className="text-sm text-gray-700 italic">
                      "{template.query}"
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {template.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
