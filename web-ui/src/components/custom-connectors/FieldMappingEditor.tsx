import { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2, Link, Type, Hash, Calendar, ToggleLeft } from 'lucide-react';

interface FieldMapping {
  id: string;
  sourcePath: string;
  targetField: string;
  fieldType: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  required: boolean;
  description?: string;
}

interface SchemaField {
  name: string;
  type: string;
  path: string;
  children?: SchemaField[];
  description?: string;
}

interface FieldMappingEditorProps {
  sourceSchema: any;
  targetSchema: any;
  mappings: FieldMapping[];
  onMappingsChange: (mappings: FieldMapping[]) => void;
}

export default function FieldMappingEditor({ 
  sourceSchema, 
  targetSchema, 
  mappings, 
  onMappingsChange 
}: FieldMappingEditorProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [draggedField, setDraggedField] = useState<SchemaField | null>(null);
  const [dropZone, setDropZone] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const parseSchemaToFields = (schema: any, parentPath = ''): SchemaField[] => {
    const fields: SchemaField[] = [];
    
    if (schema?.properties) {
      Object.entries(schema.properties).forEach(([key, value]: [string, any]) => {
        const path = parentPath ? `${parentPath}.${key}` : key;
        const field: SchemaField = {
          name: key,
          type: value.type || 'string',
          path,
          description: value.description
        };

        if (value.type === 'object' && value.properties) {
          field.children = parseSchemaToFields(value, path);
        } else if (value.type === 'array' && value.items?.properties) {
          field.children = parseSchemaToFields(value.items, `${path}[]`);
        }

        fields.push(field);
      });
    }

    return fields;
  };

  const sourceFields = parseSchemaToFields(sourceSchema);
  const targetFields = parseSchemaToFields(targetSchema);

  const toggleNode = (path: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedNodes(newExpanded);
  };

  const handleDragStart = (field: SchemaField) => {
    setDraggedField(field);
  };

  const handleDragEnd = () => {
    setDraggedField(null);
    setDropZone(null);
  };

  const handleDragOver = (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    setDropZone(targetPath);
  };

  const handleDrop = (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    if (draggedField) {
      addMapping(draggedField.path, targetPath, draggedField.type);
    }
    setDropZone(null);
    setDraggedField(null);
  };

  const addMapping = (sourcePath: string, targetField: string, fieldType: string) => {
    const newMapping: FieldMapping = {
      id: `${sourcePath}-${targetField}-${Date.now()}`,
      sourcePath,
      targetField,
      fieldType: fieldType as FieldMapping['fieldType'],
      required: false
    };

    const updatedMappings = [...mappings, newMapping];
    onMappingsChange(updatedMappings);
  };

  const removeMapping = (mappingId: string) => {
    const updatedMappings = mappings.filter(m => m.id !== mappingId);
    onMappingsChange(updatedMappings);
  };

  const updateMapping = (mappingId: string, updates: Partial<FieldMapping>) => {
    const updatedMappings = mappings.map(m => 
      m.id === mappingId ? { ...m, ...updates } : m
    );
    onMappingsChange(updatedMappings);
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'string':
        return <Type className="w-4 h-4 text-blue-500" />;
      case 'number':
        return <Hash className="w-4 h-4 text-green-500" />;
      case 'boolean':
        return <ToggleLeft className="w-4 h-4 text-purple-500" />;
      case 'date':
        return <Calendar className="w-4 h-4 text-orange-500" />;
      default:
        return <Type className="w-4 h-4 text-gray-500" />;
    }
  };

  const renderSchemaField = (field: SchemaField, level = 0, isSource = true) => {
    const hasChildren = field.children && field.children.length > 0;
    const isExpanded = expandedNodes.has(field.path);
    const isFiltered = searchTerm && !field.name.toLowerCase().includes(searchTerm.toLowerCase());

    if (isFiltered && !hasChildren) return null;

    return (
      <div key={field.path} className="select-none">
        <div
          className={`flex items-center py-2 px-3 hover:bg-gray-50 cursor-pointer ${
            level > 0 ? `ml-${level * 4}` : ''
          } ${draggedField?.path === field.path ? 'bg-blue-100' : ''}`}
          draggable={isSource}
          onDragStart={() => isSource && handleDragStart(field)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => !isSource && handleDragOver(e, field.path)}
          onDrop={(e) => !isSource && handleDrop(e, field.path)}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleNode(field.path)}
              className="mr-2 p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          
          {!hasChildren && <div className="w-6 mr-2" />}
          
          {getFieldIcon(field.type)}
          
          <span className={`ml-2 text-sm ${!isSource && dropZone === field.path ? 'font-semibold text-blue-600' : ''}`}>
            {field.name}
          </span>
          
          <span className="ml-2 text-xs text-gray-500">
            ({field.type})
          </span>

          {field.description && (
            <span className="ml-2 text-xs text-gray-400 italic">
              {field.description}
            </span>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div>
            {field.children!.map(child => 
              renderSchemaField(child, level + 1, isSource)
            )}
          </div>
        )}
      </div>
    );
  };

  const filteredMappings = mappings.filter(mapping => 
    searchTerm === '' || 
    mapping.sourcePath.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mapping.targetField.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Field Mapping</h3>
        <p className="text-sm text-gray-600">
          Drag fields from the source schema to target fields to create mappings.
        </p>
        
        {/* Search */}
        <div className="mt-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search fields..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Source Schema */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h4 className="font-medium text-gray-900">Source Schema</h4>
            <p className="text-xs text-gray-600">Drag to map</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sourceFields.map(field => renderSchemaField(field, 0, true))}
          </div>
        </div>

        {/* Current Mappings */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
            <h4 className="font-medium text-gray-900">Active Mappings</h4>
            <p className="text-xs text-gray-600">{mappings.length} mapping(s)</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredMappings.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Link className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No mappings yet</p>
                <p className="text-xs">Drag fields to create mappings</p>
              </div>
            ) : (
              <div className="space-y-2 p-2">
                {filteredMappings.map(mapping => (
                  <div key={mapping.id} className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getFieldIcon(mapping.fieldType)}
                        <span className="text-sm font-medium text-gray-900">
                          {mapping.targetField}
                        </span>
                      </div>
                      <button
                        onClick={() => removeMapping(mapping.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="text-xs text-gray-600 mb-2">
                      From: <code className="bg-gray-100 px-1 rounded">{mapping.sourcePath}</code>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <select
                        value={mapping.fieldType}
                        onChange={(e) => updateMapping(mapping.id, { 
                          fieldType: e.target.value as FieldMapping['fieldType'] 
                        })}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="date">Date</option>
                        <option value="object">Object</option>
                        <option value="array">Array</option>
                      </select>
                      
                      <label className="flex items-center space-x-1">
                        <input
                          type="checkbox"
                          checked={mapping.required}
                          onChange={(e) => updateMapping(mapping.id, { required: e.target.checked })}
                          className="text-blue-600 rounded"
                        />
                        <span className="text-xs text-gray-600">Required</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Target Schema */}
        <div className="w-1/3 flex flex-col">
          <div className="bg-green-50 px-4 py-3 border-b border-gray-200">
            <h4 className="font-medium text-gray-900">Target Schema</h4>
            <p className="text-xs text-gray-600">Drop zone</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {targetFields.map(field => renderSchemaField(field, 0, false))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{mappings.length} field mapping(s) configured</span>
          <button
            onClick={() => {
              // Expand all nodes for better visibility
              const allPaths = new Set<string>();
              const collectPaths = (fields: SchemaField[]) => {
                fields.forEach(field => {
                  if (field.children && field.children.length > 0) {
                    allPaths.add(field.path);
                    collectPaths(field.children);
                  }
                });
              };
              collectPaths([...sourceFields, ...targetFields]);
              setExpandedNodes(allPaths);
            }}
            className="text-blue-600 hover:text-blue-800"
          >
            Expand All
          </button>
        </div>
      </div>
    </div>
  );
}
