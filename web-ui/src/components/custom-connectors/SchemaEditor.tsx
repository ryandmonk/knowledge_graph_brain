import { useState, useEffect } from 'react';
import { Edit3, Save, RefreshCw, AlertTriangle, CheckCircle, Eye, EyeOff, Code } from 'lucide-react';

interface SchemaEditorProps {
  schema: any;
  onSchemaChange: (schema: any) => void;
  onValidate?: (isValid: boolean, errors?: string[]) => void;
  readOnly?: boolean;
}

interface ValidationError {
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

export default function SchemaEditor({ 
  schema, 
  onSchemaChange, 
  onValidate,
  readOnly = false 
}: SchemaEditorProps) {
  const [schemaText, setSchemaText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showPreview, setShowPreview] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize schema text from prop
  useEffect(() => {
    if (schema) {
      setSchemaText(JSON.stringify(schema, null, 2));
    }
  }, [schema]);

  const validateSchema = (text: string): { isValid: boolean; errors: ValidationError[] } => {
    const errors: ValidationError[] = [];
    
    try {
      const parsed = JSON.parse(text);
      
      // Basic schema validation
      if (!parsed.kb_id) {
        errors.push({
          line: 1,
          message: 'Missing required field: kb_id',
          severity: 'error'
        });
      }
      
      if (!parsed.name) {
        errors.push({
          line: 1,
          message: 'Missing required field: name',
          severity: 'error'
        });
      }

      if (!parsed.schema || !parsed.schema.nodes) {
        errors.push({
          line: 1,
          message: 'Missing required schema.nodes definition',
          severity: 'error'
        });
      }

      if (!parsed.mappings || !parsed.mappings.sources) {
        errors.push({
          line: 1,
          message: 'Missing required mappings.sources definition',
          severity: 'error'
        });
      }

      // Node validation
      if (parsed.schema?.nodes) {
        Object.entries(parsed.schema.nodes).forEach(([nodeKey, nodeValue]: [string, any]) => {
          if (!nodeValue.properties) {
            errors.push({
              line: 1,
              message: `Node '${nodeKey}' missing properties definition`,
              severity: 'warning'
            });
          }
        });
      }

      // Mapping validation
      if (parsed.mappings?.sources) {
        parsed.mappings.sources.forEach((source: any, index: number) => {
          if (!source.connector_type) {
            errors.push({
              line: 1,
              message: `Source ${index + 1} missing connector_type`,
              severity: 'error'
            });
          }
          
          if (!source.endpoint_mappings || !Array.isArray(source.endpoint_mappings)) {
            errors.push({
              line: 1,
              message: `Source ${index + 1} missing endpoint_mappings array`,
              severity: 'error'
            });
          }
        });
      }

      return { isValid: errors.filter(e => e.severity === 'error').length === 0, errors };
      
    } catch (parseError) {
      return {
        isValid: false,
        errors: [{
          line: 1,
          message: `JSON Parse Error: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`,
          severity: 'error'
        }]
      };
    }
  };

  const handleTextChange = (text: string) => {
    setSchemaText(text);
    setHasUnsavedChanges(true);

    const validation = validateSchema(text);
    setIsValid(validation.isValid);
    setValidationErrors(validation.errors);
    
    onValidate?.(validation.isValid, validation.errors.map(e => e.message));
  };

  const handleSave = () => {
    if (isValid) {
      try {
        const parsed = JSON.parse(schemaText);
        onSchemaChange(parsed);
        setHasUnsavedChanges(false);
        setIsEditing(false);
      } catch (error) {
        console.error('Failed to save schema:', error);
      }
    }
  };

  const handleReset = () => {
    setSchemaText(JSON.stringify(schema, null, 2));
    setHasUnsavedChanges(false);
    setIsEditing(false);
    setValidationErrors([]);
    setIsValid(true);
  };

  const formatSchema = () => {
    try {
      const parsed = JSON.parse(schemaText);
      const formatted = JSON.stringify(parsed, null, 2);
      setSchemaText(formatted);
    } catch (error) {
      // If JSON is invalid, don't format
    }
  };

  const renderSchemaPreview = (obj: any, level = 0): JSX.Element => {
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
      return (
        <span className={`${
          typeof obj === 'string' ? 'text-green-600' :
          typeof obj === 'number' ? 'text-blue-600' :
          'text-purple-600'
        }`}>
          {typeof obj === 'string' ? `"${obj}"` : String(obj)}
        </span>
      );
    }

    if (Array.isArray(obj)) {
      return (
        <div>
          <span className="text-gray-600">[</span>
          <div className="ml-4">
            {obj.map((item, index) => (
              <div key={index}>
                {renderSchemaPreview(item, level + 1)}
                {index < obj.length - 1 && <span className="text-gray-600">,</span>}
              </div>
            ))}
          </div>
          <span className="text-gray-600">]</span>
        </div>
      );
    }

    if (typeof obj === 'object' && obj !== null) {
      const keys = Object.keys(obj);
      return (
        <div>
          <span className="text-gray-600">{'{'}</span>
          <div className="ml-4">
            {keys.map((key, index) => (
              <div key={key} className="flex">
                <span className="text-red-600">"{key}"</span>
                <span className="text-gray-600 mx-1">:</span>
                <div className="flex-1">
                  {renderSchemaPreview(obj[key], level + 1)}
                </div>
                {index < keys.length - 1 && <span className="text-gray-600">,</span>}
              </div>
            ))}
          </div>
          <span className="text-gray-600">{'}'}</span>
        </div>
      );
    }

    return <span className="text-gray-400">null</span>;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Schema Editor</h3>
            <p className="text-sm text-gray-600">
              Edit and validate your Knowledge Graph schema
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Validation Status */}
            <div className="flex items-center space-x-2">
              {isValid ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Valid</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{validationErrors.filter(e => e.severity === 'error').length} error(s)</span>
                </div>
              )}
            </div>

            {/* View Toggle */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`p-2 rounded-lg ${showPreview ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
              title={showPreview ? 'Hide Preview' : 'Show Preview'}
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            {/* Format Button */}
            <button
              onClick={formatSchema}
              className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
              title="Format JSON"
            >
              <Code className="w-4 h-4" />
            </button>

            {/* Edit/Save Button */}
            {!readOnly && (
              <>
                {isEditing ? (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleReset}
                      className="px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!isValid || !hasUnsavedChanges}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mt-3 space-y-1">
            {validationErrors.map((error, index) => (
              <div
                key={index}
                className={`text-sm p-2 rounded ${
                  error.severity === 'error' 
                    ? 'bg-red-50 text-red-700 border border-red-200' 
                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}
              >
                <span className="font-medium">{error.severity === 'error' ? 'Error' : 'Warning'}:</span> {error.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 flex overflow-hidden ${showPreview ? '' : ''}`}>
        {/* Editor */}
        <div className={`${showPreview ? 'w-1/2' : 'w-full'} flex flex-col border-r border-gray-200`}>
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h4 className="font-medium text-gray-900">JSON Editor</h4>
          </div>
          <div className="flex-1 overflow-hidden">
            <textarea
              value={schemaText}
              onChange={(e) => handleTextChange(e.target.value)}
              readOnly={readOnly || !isEditing}
              className={`w-full h-full p-4 font-mono text-sm border-none resize-none focus:outline-none ${
                readOnly || !isEditing ? 'bg-gray-50' : 'bg-white'
              }`}
              placeholder="Enter your schema JSON here..."
              spellCheck={false}
            />
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="w-1/2 flex flex-col">
            <div className="bg-blue-50 px-4 py-2 border-b border-gray-200">
              <h4 className="font-medium text-gray-900">Schema Preview</h4>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {isValid ? (
                <div className="font-mono text-sm">
                  {(() => {
                    try {
                      const parsed = JSON.parse(schemaText);
                      return renderSchemaPreview(parsed);
                    } catch {
                      return <span className="text-gray-400">Invalid JSON</span>;
                    }
                  })()}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Fix validation errors to see preview</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {hasUnsavedChanges && (
        <div className="border-t border-gray-200 p-3 bg-yellow-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-yellow-700">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">You have unsaved changes</span>
            </div>
            {!readOnly && (
              <div className="flex space-x-2">
                <button
                  onClick={handleReset}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isValid}
                  className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
