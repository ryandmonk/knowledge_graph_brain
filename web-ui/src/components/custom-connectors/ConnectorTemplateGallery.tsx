import { useState } from 'react';
import { Search, Star, ExternalLink, Filter, Grid, List } from 'lucide-react';

interface ConnectorTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  popularity: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  author: string;
  version: string;
  apiType: 'REST' | 'GraphQL' | 'WebSocket' | 'Database';
  schema: any;
  exampleConfig: any;
  documentation?: string;
  icon?: string;
}

interface ConnectorTemplateGalleryProps {
  onSelectTemplate: (template: ConnectorTemplate) => void;
  onClose: () => void;
}

const TEMPLATE_CATEGORIES = [
  'All Templates',
  'CRM',
  'Collaboration', 
  'Development',
  'Analytics',
  'E-commerce',
  'Social Media',
  'Marketing',
  'Finance',
  'Database'
];

const SAMPLE_TEMPLATES: ConnectorTemplate[] = [
  {
    id: 'salesforce-crm',
    name: 'Salesforce CRM',
    description: 'Connect to Salesforce CRM to sync contacts, accounts, and opportunities.',
    category: 'CRM',
    popularity: 95,
    difficulty: 'intermediate',
    tags: ['CRM', 'Sales', 'REST API', 'OAuth'],
    author: 'Knowledge Graph Brain',
    version: '1.2.0',
    apiType: 'REST',
    schema: {}, // Would contain actual schema
    exampleConfig: {},
    documentation: 'https://example.com/docs/salesforce',
    icon: '🏢'
  },
  {
    id: 'notion-workspace',
    name: 'Notion Workspace',
    description: 'Import pages, databases, and content from your Notion workspace.',
    category: 'Collaboration',
    popularity: 88,
    difficulty: 'beginner',
    tags: ['Collaboration', 'Documentation', 'REST API'],
    author: 'Knowledge Graph Brain',
    version: '0.19.0',
    apiType: 'REST',
    schema: {},
    exampleConfig: {},
    documentation: 'https://example.com/docs/notion',
    icon: '📝'
  },
  {
    id: 'airtable-base',
    name: 'Airtable Base',
    description: 'Sync data from Airtable bases with automatic schema detection.',
    category: 'Collaboration',
    popularity: 82,
    difficulty: 'beginner',
    tags: ['Database', 'Collaboration', 'REST API'],
    author: 'Knowledge Graph Brain',
    version: '1.1.0',
    apiType: 'REST',
    schema: {},
    exampleConfig: {},
    documentation: 'https://example.com/docs/airtable',
    icon: '📊'
  },
  {
    id: 'stripe-payments',
    name: 'Stripe Payments',
    description: 'Connect to Stripe to analyze payments, customers, and subscription data.',
    category: 'E-commerce',
    popularity: 91,
    difficulty: 'intermediate',
    tags: ['Payments', 'E-commerce', 'REST API', 'Webhooks'],
    author: 'Knowledge Graph Brain',
    version: '1.3.0',
    apiType: 'REST',
    schema: {},
    exampleConfig: {},
    documentation: 'https://example.com/docs/stripe',
    icon: '💳'
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    description: 'Import website analytics data including sessions, users, and events.',
    category: 'Analytics',
    popularity: 87,
    difficulty: 'advanced',
    tags: ['Analytics', 'Web', 'OAuth', 'Reporting'],
    author: 'Knowledge Graph Brain',
    version: '2.0.0',
    apiType: 'REST',
    schema: {},
    exampleConfig: {},
    documentation: 'https://example.com/docs/google-analytics',
    icon: '📈'
  },
  {
    id: 'postgresql-db',
    name: 'PostgreSQL Database',
    description: 'Connect directly to PostgreSQL databases with automatic table discovery.',
    category: 'Database',
    popularity: 79,
    difficulty: 'intermediate',
    tags: ['Database', 'SQL', 'PostgreSQL'],
    author: 'Knowledge Graph Brain',
    version: '0.19.0',
    apiType: 'Database',
    schema: {},
    exampleConfig: {},
    documentation: 'https://example.com/docs/postgresql',
    icon: '🐘'
  }
];

export default function ConnectorTemplateGallery({ 
  onSelectTemplate, 
  onClose 
}: ConnectorTemplateGalleryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Templates');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'popularity' | 'name' | 'category'>('popularity');

  const filteredTemplates = SAMPLE_TEMPLATES
    .filter(template => {
      // Category filter
      if (selectedCategory !== 'All Templates' && template.category !== selectedCategory) {
        return false;
      }
      
      // Difficulty filter
      if (selectedDifficulty !== 'all' && template.difficulty !== selectedDifficulty) {
        return false;
      }
      
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          template.name.toLowerCase().includes(search) ||
          template.description.toLowerCase().includes(search) ||
          template.tags.some(tag => tag.toLowerCase().includes(search))
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'popularity':
        default:
          return b.popularity - a.popularity;
      }
    });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getApiTypeColor = (apiType: string) => {
    switch (apiType) {
      case 'REST':
        return 'bg-blue-100 text-blue-800';
      case 'GraphQL':
        return 'bg-purple-100 text-purple-800';
      case 'WebSocket':
        return 'bg-orange-100 text-orange-800';
      case 'Database':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderTemplateCard = (template: ConnectorTemplate) => (
    <div
      key={template.id}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onSelectTemplate(template)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">{template.icon}</div>
          <div>
            <h3 className="font-semibold text-gray-900">{template.name}</h3>
            <p className="text-sm text-gray-600">{template.category}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1 text-yellow-500">
          <Star className="w-4 h-4 fill-current" />
          <span className="text-sm font-medium">{template.popularity}</span>
        </div>
      </div>

      <p className="text-sm text-gray-700 mb-3 line-clamp-2">
        {template.description}
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(template.difficulty)}`}>
          {template.difficulty}
        </span>
        <span className={`px-2 py-1 text-xs rounded-full ${getApiTypeColor(template.apiType)}`}>
          {template.apiType}
        </span>
        {template.tags.slice(0, 2).map(tag => (
          <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
            {tag}
          </span>
        ))}
        {template.tags.length > 2 && (
          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-full">
            +{template.tags.length - 2}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>v{template.version}</span>
        <span>by {template.author}</span>
      </div>
    </div>
  );

  const renderTemplateList = (template: ConnectorTemplate) => (
    <div
      key={template.id}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onSelectTemplate(template)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-2xl">{template.icon}</div>
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-1">
              <h3 className="font-semibold text-gray-900">{template.name}</h3>
              <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(template.difficulty)}`}>
                {template.difficulty}
              </span>
              <span className={`px-2 py-1 text-xs rounded-full ${getApiTypeColor(template.apiType)}`}>
                {template.apiType}
              </span>
            </div>
            <p className="text-sm text-gray-700 mb-2">{template.description}</p>
            <div className="flex flex-wrap gap-1">
              {template.tags.map(tag => (
                <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1 text-yellow-500">
            <Star className="w-4 h-4 fill-current" />
            <span>{template.popularity}</span>
          </div>
          <span>v{template.version}</span>
          {template.documentation && (
            <ExternalLink className="w-4 h-4" />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Connector Templates</h2>
              <p className="text-gray-600">Choose a template to quickly set up your custom connector</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {TEMPLATE_CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            {/* Difficulty Filter */}
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'popularity' | 'name' | 'category')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="popularity">Sort by Popularity</option>
              <option value="name">Sort by Name</option>
              <option value="category">Sort by Category</option>
            </select>

            {/* View Mode */}
            <div className="flex border border-gray-300 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Results Count */}
          <div className="mb-4 text-sm text-gray-600">
            {filteredTemplates.length} template(s) found
          </div>

          {/* Templates */}
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className={
              viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-4'
            }>
              {filteredTemplates.map(template => 
                viewMode === 'grid' 
                  ? renderTemplateCard(template)
                  : renderTemplateList(template)
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Can't find what you need? <button className="text-blue-600 hover:text-blue-800">Request a template</button>
            </div>
            <div>
              <button 
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
