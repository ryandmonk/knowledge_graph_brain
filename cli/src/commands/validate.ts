import { readFileSync } from 'fs';
import { resolve } from 'path';
import chalk from 'chalk';
import YAML from 'yaml';
import { SchemaValidator, ValidationError, ValidationWarning } from '../utils/validator.js';

export interface ValidateOptions {
  verbose?: boolean;
  format?: 'text' | 'json';
}

export async function validateCommand(schemaFile: string, options: ValidateOptions = {}) {
  try {
    // Read the schema file
    const filePath = resolve(schemaFile);
    const yamlContent = readFileSync(filePath, 'utf8');
    
    if (options.verbose) {
      console.log(chalk.blue(`Reading schema from: ${filePath}`));
    }
    
    // Parse YAML
    let parsedSchema;
    try {
      parsedSchema = YAML.parse(yamlContent);
    } catch (parseError) {
      const error = parseError as Error;
      console.error(chalk.red('YAML Parse Error:'), error.message);
      if (options.format === 'json') {
        console.log(JSON.stringify({ 
          valid: false, 
          errors: [{ type: 'yaml_parse_error', message: error.message }] 
        }, null, 2));
      }
      process.exit(1);
    }
    
    if (options.verbose) {
      console.log(chalk.blue('YAML parsed successfully'));
    }
    
    // Create validator and validate schema
    const validator = new SchemaValidator();
    const validation = await validator.validate(parsedSchema);
    
    if (options.format === 'json') {
      // JSON output format
      console.log(JSON.stringify({
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
        kb_id: parsedSchema?.kb_id || null,
        file: filePath
      }, null, 2));
    } else {
      // Text output format
      console.log(chalk.bold(`\n📄 Validating schema: ${chalk.cyan(schemaFile)}`));
      
      if (validation.valid) {
        console.log(chalk.green('✅ Schema is valid!'));
        
        if (parsedSchema.kb_id) {
          console.log(chalk.blue(`📊 Knowledge Base ID: ${parsedSchema.kb_id}`));
        }
        
        // Show schema summary
        if (parsedSchema.schema?.nodes) {
          console.log(chalk.blue(`📦 Node types: ${parsedSchema.schema.nodes.length}`));
          if (options.verbose) {
            parsedSchema.schema.nodes.forEach((node: any) => {
              console.log(chalk.gray(`   • ${node.label} (key: ${node.key})`));
            });
          }
        }
        
        if (parsedSchema.schema?.relationships) {
          console.log(chalk.blue(`🔗 Relationship types: ${parsedSchema.schema.relationships.length}`));
          if (options.verbose) {
            parsedSchema.schema.relationships.forEach((rel: any) => {
              console.log(chalk.gray(`   • ${rel.type} (${rel.from} → ${rel.to})`));
            });
          }
        }
        
        if (parsedSchema.mappings?.sources) {
          console.log(chalk.blue(`🔌 Source mappings: ${parsedSchema.mappings.sources.length}`));
          if (options.verbose) {
            parsedSchema.mappings.sources.forEach((source: any) => {
              console.log(chalk.gray(`   • ${source.source_id} (${source.document_type})`));
            });
          }
        }
        
        // Show warnings if any
        if (validation.warnings.length > 0) {
          console.log(chalk.yellow(`\n⚠️  Warnings (${validation.warnings.length}):`));
          validation.warnings.forEach((warning: ValidationWarning) => {
            console.log(chalk.yellow(`   • ${warning.message}`));
            if (warning.path && options.verbose) {
              console.log(chalk.gray(`     Path: ${warning.path}`));
            }
          });
        }
        
      } else {
        console.log(chalk.red(`❌ Schema validation failed (${validation.errors.length} errors)`));
        
        validation.errors.forEach((error: ValidationError) => {
          console.log(chalk.red(`   • ${error.message}`));
          if (error.path && options.verbose) {
            console.log(chalk.gray(`     Path: ${error.path}`));
          }
          if (error.suggestion) {
            console.log(chalk.cyan(`     Suggestion: ${error.suggestion}`));
          }
        });
        
        if (validation.warnings.length > 0) {
          console.log(chalk.yellow(`\n⚠️  Warnings (${validation.warnings.length}):`));
          validation.warnings.forEach((warning: ValidationWarning) => {
            console.log(chalk.yellow(`   • ${warning.message}`));
          });
        }
      }
    }
    
    // Exit with proper code
    process.exit(validation.valid ? 0 : 1);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (options.format === 'json') {
      console.log(JSON.stringify({
        valid: false,
        errors: [{ type: 'system_error', message: errorMessage }]
      }, null, 2));
    } else {
      console.error(chalk.red('Validation failed:'), errorMessage);
      if (options.verbose && error instanceof Error && error.stack) {
        console.error(chalk.gray(error.stack));
      }
    }
    
    process.exit(1);
  }
}
