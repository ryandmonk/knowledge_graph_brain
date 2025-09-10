import { useState, useEffect } from 'react';
import { Eye, Edit, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface SchemaPreviewStepProps {
  data: any;
  onComplete: (stepData: any) => void;
  onPrevious: () => void;
}

export default function SchemaPreviewStep({ 
  data, 
  onComplete, 
  onPrevious 
}: SchemaPreviewStepProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedSchema, setProcessedSchema] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [editableSchema, setEditableSchema] = useState<string>('');

  useEffect(() => {
    if (data.openApiSpec) {
      processSchema();
    }
  }, [data.openApiSpec]);

  const processSchema = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Simulate schema processing with the LLM analyzer
      const response = await fetch('/api/custom-connectors/analyze-schema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          openApiSpec: data.openApiSpec,
          llmEnhanced: data.configuration?.llmEnhanced || true,
          confidenceThreshold: data.configuration?.confidenceThreshold || 0.8
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to process schema: ${response.statusText}`);
      }

      const result = await response.json();
      setProcessedSchema(result);
      setEditableSchema(JSON.stringify(result.schema, null, 2));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process schema');
      // Fallback to basic schema generation
      const basicSchema = generateBasicSchema(data.openApiSpec);
      setProcessedSchema(basicSchema);
      setEditableSchema(JSON.stringify(basicSchema.schema, null, 2));
    } finally {
      setIsProcessing(false);
    }
  };

  const generateBasicSchema = (openApiSpec: any) => {
    return {
      schema: {
        entities: [],
        relationships: [],
        endpoints: Object.keys(openApiSpec.paths || {}).slice(0, 5) // Show first 5 endpoints
      },
      confidence: 0.5,
      llmAnalysis: {
        summary: 'Basic schema generated without LLM analysis',
        recommendations: []
      }
    };
  };

  const handleSchemaEdit = (newSchema: string) => {
    setEditableSchema(newSchema);
    try {
      const parsed = JSON.parse(newSchema);
      setProcessedSchema((prev: any) => ({ ...prev, schema: parsed }));
    } catch {
      // Invalid JSON, don't update processedSchema
    }
  };

  const handleContinue = () => {
    try {
      const finalSchema = JSON.parse(editableSchema);
      onComplete({
        schema: finalSchema,
        processedSchema,
        schemaAnalysis: processedSchema?.llmAnalysis
      });
    } catch (err) {
      setError('Invalid JSON in schema editor. Please fix the syntax.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Preview & Edit Schema
        </h3>
        <p className="text-sm text-gray-600">
          Review the generated schema and make any necessary adjustments
        </p>
      </div>

      {isProcessing ? (
        <div className="text-center py-12">
          <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600">Processing schema with LLM analyzer...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Schema Analysis Summary */}
          {processedSchema?.llmAnalysis && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="flex items-center text-sm font-medium text-blue-900 mb-2">
                <CheckCircle className="w-4 h-4 mr-2" />
                LLM Analysis Summary
              </h4>
              <p className="text-sm text-blue-800 mb-3">
                {processedSchema.llmAnalysis.summary}
              </p>
              {processedSchema.llmAnalysis.recommendations?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-blue-900 mb-1">Recommendations:</p>
                  <ul className="text-xs text-blue-800 list-disc list-inside space-y-1">
                    {processedSchema.llmAnalysis.recommendations.map((rec: string, index: number) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Schema Statistics */}
          {processedSchema && (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {processedSchema.schema?.entities?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Entities</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {processedSchema.schema?.relationships?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Relationships</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {processedSchema.schema?.endpoints?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Endpoints</div>
              </div>
            </div>
          )}

          {/* Schema Editor */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="flex items-center text-sm font-medium text-gray-900">
                <Edit className="w-4 h-4 mr-2" />
                Schema Definition
              </h4>
              <button
                onClick={processSchema}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                Regenerate
              </button>
            </div>
            
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <textarea
                value={editableSchema}
                onChange={(e) => handleSchemaEdit(e.target.value)}
                className="w-full h-64 p-4 font-mono text-sm border-none resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Schema will appear here..."
              />
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              Edit the JSON schema directly. Changes will be validated before proceeding.
            </p>
          </div>

          {/* Preview Tabs */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h4 className="flex items-center text-sm font-medium text-gray-900">
                <Eye className="w-4 h-4 mr-2" />
                Schema Preview
              </h4>
            </div>
            
            <div className="p-4 max-h-48 overflow-y-auto">
              {processedSchema?.schema ? (
                <div className="space-y-3">
                  {processedSchema.schema.entities?.length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium text-gray-700 mb-1">Entities:</h5>
                      <div className="flex flex-wrap gap-1">
                        {processedSchema.schema.entities.map((entity: any, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                          >
                            {entity.name || entity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {processedSchema.schema.relationships?.length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium text-gray-700 mb-1">Relationships:</h5>
                      <div className="flex flex-wrap gap-1">
                        {processedSchema.schema.relationships.map((rel: any, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
                          >
                            {rel.type || rel}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {processedSchema.schema.endpoints?.length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium text-gray-700 mb-1">
                        Endpoints ({processedSchema.schema.endpoints.length}):
                      </h5>
                      <div className="text-xs text-gray-600 space-y-1">
                        {processedSchema.schema.endpoints.slice(0, 3).map((endpoint: string, index: number) => (
                          <div key={index} className="font-mono">{endpoint}</div>
                        ))}
                        {processedSchema.schema.endpoints.length > 3 && (
                          <div className="text-gray-500">
                            +{processedSchema.schema.endpoints.length - 3} more...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No schema data available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button
          onClick={onPrevious}
          disabled={isProcessing}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={handleContinue}
          disabled={isProcessing || !processedSchema}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
