import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

interface SchemaUploadStepProps {
  onComplete: (stepData: any) => void;
}

export default function SchemaUploadStep({ onComplete }: SchemaUploadStepProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setIsUploading(true);

    try {
      // Validate file type
      const validTypes = [
        'application/json',
        'text/plain',
        'application/x-yaml',
        'text/yaml',
        'application/yaml'
      ];

      if (!validTypes.includes(selectedFile.type) && 
          !selectedFile.name.match(/\.(json|yaml|yml)$/i)) {
        throw new Error('Please upload a JSON or YAML file');
      }

      // Read file content
      const content = await selectedFile.text();
      let parsedContent;

      try {
        // Try to parse as JSON first
        parsedContent = JSON.parse(content);
      } catch {
        // If JSON parsing fails, assume it's YAML
        // For now, we'll store raw content and let the backend handle YAML parsing
        parsedContent = { raw: content, type: 'yaml' };
      }

      setUploadSuccess(true);
      
      // Pass the parsed content to parent
      setTimeout(() => {
        onComplete({
          openApiSpec: parsedContent,
          fileName: selectedFile.name,
          fileSize: selectedFile.size
        });
      }, 500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Upload OpenAPI Specification
        </h3>
        <p className="text-sm text-gray-600">
          Upload your OpenAPI/Swagger specification file (JSON or YAML format)
        </p>
      </div>

      {/* File Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
          ${dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : uploadSuccess
              ? 'border-green-400 bg-green-50'
              : error
                ? 'border-red-400 bg-red-50'
                : 'border-gray-300 hover:border-gray-400'
          }
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".json,.yaml,.yml"
          onChange={handleFileSelect}
        />

        {isUploading ? (
          <div className="space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-600">Processing file...</p>
          </div>
        ) : uploadSuccess ? (
          <div className="space-y-3">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <div>
              <p className="text-sm font-medium text-green-800">
                File uploaded successfully!
              </p>
              <p className="text-xs text-green-600 mt-1">
                {file?.name} ({(file?.size || 0 / 1024).toFixed(1)} KB)
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="space-y-3">
            <AlertTriangle className="h-12 w-12 text-red-600 mx-auto" />
            <div>
              <p className="text-sm font-medium text-red-800">Upload failed</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setError(null);
                setFile(null);
              }}
              className="text-xs text-red-600 underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="h-12 w-12 text-gray-400 mx-auto" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                Drop your OpenAPI file here, or click to browse
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supports JSON and YAML formats (max 10MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* File Info */}
      {file && !error && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <FileText className="h-5 w-5 text-gray-600" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {file.name}
              </p>
              <p className="text-xs text-gray-500">
                {(file.size / 1024).toFixed(1)} KB • {file.type || 'Unknown type'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          onClick={() => {
            if (uploadSuccess && file) {
              // This will trigger the next step
              onComplete({
                openApiSpec: file, // Will be processed by the component
                fileName: file.name,
                fileSize: file.size
              });
            }
          }}
          disabled={!uploadSuccess}
          className={`
            px-4 py-2 rounded-lg font-medium transition-colors
            ${uploadSuccess
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
