import { SchemaDSLValidator } from '../src/dsl/validator';
import { parse } from 'yaml';

describe('SchemaDSLValidator', () => {
  
  // Valid schema for testing
  const validSchemaYaml = `
kb_id: test-kb
embedding:
  provider: "ollama:mxbai-embed-large"
  chunking:
    strategy: "by_headings"
    max_tokens: 1200
    overlap: 50
schema:
  nodes:
    - label: Document
      key: id
      props: [id, title, content]
    - label: Person
      key: email
      props: [name, email]
  relationships:
    - type: AUTHORED_BY
      from: Document
      to: Person
mappings:
  sources:
    - source_id: "test-source"
      document_type: "page"
      extract:
        node: Document
        assign:
          id: "$.id"
          title: "$.title"
          content: "$.content"
      edges:
        - type: AUTHORED_BY
          from:
            node: Document
            key: "$.id"
          to:
            node: Person
            key: "$.author.email"
            props:
              name: "$.author.name"
              email: "$.author.email"
`;

  test('should validate a correct schema without errors', () => {
    const schema = parse(validSchemaYaml);
    const result = SchemaDSLValidator.validate(schema);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should reject missing kb_id', () => {
    const schema = parse(validSchemaYaml);
    delete schema.kb_id;
    
    const result = SchemaDSLValidator.validate(schema);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'kb_id' || e.message.includes('kb_id'))).toBe(true);
  });

  test('should reject invalid kb_id format', () => {
    const schema = parse(validSchemaYaml);
    schema.kb_id = 'invalid kb id with spaces!';
    
    const result = SchemaDSLValidator.validate(schema);
    
    expect(result.valid).toBe(false);
    const kbError = result.errors.find(e => e.field.includes('kb_id'));
    expect(kbError).toBeDefined();
    expect(kbError?.suggestion).toContain('letters');
  });

  test('should reject invalid embedding provider format', () => {
    const schema = parse(validSchemaYaml);
    schema.embedding.provider = 'invalid-provider-format';
    
    const result = SchemaDSLValidator.validate(schema);
    
    expect(result.valid).toBe(false);
    const providerError = result.errors.find(e => e.field.includes('provider'));
    expect(providerError).toBeDefined();
    expect(providerError?.suggestion).toContain('provider:model');
  });

  test('should reject invalid node label format', () => {
    const schema = parse(validSchemaYaml);
    schema.schema.nodes[0].label = 'invalidLabel';
    
    const result = SchemaDSLValidator.validate(schema);
    
    expect(result.valid).toBe(false);
    const labelError = result.errors.find(e => e.field.includes('label'));
    expect(labelError).toBeDefined();
    expect(labelError?.suggestion).toContain('uppercase');
  });

  test('should reject invalid relationship type format', () => {
    const schema = parse(validSchemaYaml);
    schema.schema.relationships[0].type = 'authored_by';
    
    const result = SchemaDSLValidator.validate(schema);
    
    expect(result.valid).toBe(false);
    const typeError = result.errors.find(e => e.field.includes('type'));
    expect(typeError).toBeDefined();
    expect(typeError?.suggestion).toContain('UPPER_CASE');
  });

  test('should reject invalid JSONPath expressions', () => {
    const schema = parse(validSchemaYaml);
    schema.mappings.sources[0].extract.assign.title = 'invalid.path'; // Missing $. prefix
    
    const result = SchemaDSLValidator.validate(schema);
    
    expect(result.valid).toBe(false);
    const pathError = result.errors.find(e => e.field.includes('assign') && e.message.includes('pattern'));
    expect(pathError).toBeDefined();
  });

  test('should detect cross-reference errors - undefined node in relationship', () => {
    const schema = parse(validSchemaYaml);
    schema.schema.relationships[0].from = 'UndefinedNode';
    
    const result = SchemaDSLValidator.validate(schema);
    
    expect(result.valid).toBe(false);
    const crossRefError = result.errors.find(e => 
      e.message.includes('not defined in schema.nodes')
    );
    expect(crossRefError).toBeDefined();
    expect(crossRefError?.suggestion).toContain('Add a node');
  });

  test('should detect cross-reference errors - undefined node in mapping', () => {
    const schema = parse(validSchemaYaml);
    schema.mappings.sources[0].extract.node = 'UndefinedNode';
    
    const result = SchemaDSLValidator.validate(schema);
    
    expect(result.valid).toBe(false);
    const mappingError = result.errors.find(e => 
      e.message.includes('not defined in schema.nodes')
    );
    expect(mappingError).toBeDefined();
  });

  test('should warn about potential PII fields', () => {
    const schema = parse(validSchemaYaml);
    schema.schema.nodes[0].props.push('password');
    schema.schema.nodes[0].props.push('ssn');
    
    const result = SchemaDSLValidator.validate(schema);
    
    expect(result.warnings.length).toBeGreaterThan(0);
    const piiWarning = result.warnings.find(w => 
      w.message.includes('sensitive data')
    );
    expect(piiWarning).toBeDefined();
  });

  test('should suggest using email as key for identity resolution', () => {
    const schema = parse(validSchemaYaml);
    // Add email prop but don't use it as key
    schema.schema.nodes.push({
      label: 'User',
      key: 'id',
      props: ['id', 'name', 'email_address']
    });
    
    const result = SchemaDSLValidator.validate(schema);
    
    const emailWarning = result.warnings.find(w => 
      w.message.includes('Email property') && w.message.includes('not used as key')
    );
    expect(emailWarning).toBeDefined();
    expect(emailWarning?.suggestion).toContain('identity resolution');
  });

  test('should validate chunking strategy enum values', () => {
    const schema = parse(validSchemaYaml);
    schema.embedding.chunking.strategy = 'invalid_strategy';
    
    const result = SchemaDSLValidator.validate(schema);
    
    expect(result.valid).toBe(false);
    const strategyError = result.errors.find(e => e.field.includes('strategy'));
    expect(strategyError).toBeDefined();
    expect(strategyError?.suggestion).toContain('Valid values:');
  });

  test('should validate max_tokens range', () => {
    const schema = parse(validSchemaYaml);
    schema.embedding.chunking.max_tokens = 50; // Below minimum
    
    const result = SchemaDSLValidator.validate(schema);
    
    expect(result.valid).toBe(false);
    const tokenError = result.errors.find(e => e.field.includes('max_tokens'));
    expect(tokenError).toBeDefined();
  });

  test('should format validation results nicely', () => {
    const schema = parse(validSchemaYaml);
    schema.kb_id = 'invalid kb!';
    
    const result = SchemaDSLValidator.validate(schema);
    const formatted = SchemaDSLValidator.formatValidationResults(result);
    
    expect(formatted).toContain('❌ Schema validation failed');
    expect(formatted).toContain('ERRORS:');
    expect(formatted).toContain('💡'); // Should contain suggestions
  });

  test('should format successful validation results', () => {
    const schema = parse(validSchemaYaml);
    const result = SchemaDSLValidator.validate(schema);
    const formatted = SchemaDSLValidator.formatValidationResults(result);
    
    expect(formatted).toContain('✅ Schema validation passed!');
  });

  test('should validate complex JSONPath expressions', () => {
    const schema = parse(validSchemaYaml);
    // Test array access JSONPath
    schema.mappings.sources[0].extract.assign.tags = '$.labels[*].name';
    
    const result = SchemaDSLValidator.validate(schema);
    
    expect(result.valid).toBe(true);
  });

  test('should reject malformed JSONPath expressions', () => {
    const schema = parse(validSchemaYaml);
    // This should trigger the JSONPath validation error during schema validation
    schema.mappings.sources[0].extract.assign.invalid = '$.invalid]][[[';
    
    const result = SchemaDSLValidator.validate(schema);
    
    // If JSONPath validation doesn't catch it, at least pattern validation should
    expect(result.valid).toBe(false);
    const hasError = result.errors.some(e => 
      e.message.includes('Invalid JSONPath') || 
      e.message.includes('pattern') ||
      e.field.includes('assign')
    );
    expect(hasError).toBe(true);
  });

  test('should handle empty schema gracefully', () => {
    const result = SchemaDSLValidator.validate({});
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should handle null/undefined input', () => {
    const result1 = SchemaDSLValidator.validate(null);
    const result2 = SchemaDSLValidator.validate(undefined);
    
    expect(result1.valid).toBe(false);
    expect(result2.valid).toBe(false);
  });
});
