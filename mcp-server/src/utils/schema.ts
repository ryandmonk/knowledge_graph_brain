import { z } from 'zod';

/**
 * Tool definition interface that works with MCP SDK
 */
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, z.ZodType>; // MCP SDK expected format
  handler: (args: any, sessionId: string) => Promise<any>;
}

/**
 * Convert a Zod object schema to MCP SDK format (property-based schema)
 */
export function convertZodObjectToMCPSchema(zodObjectSchema: z.ZodObject<any>): Record<string, z.ZodType> {
  const shape = zodObjectSchema.shape;
  return shape;
}

/**
 * Convert a tool definition with Zod object schema to MCP-compatible format
 */
export function convertToolForMCP(toolDef: {
  name: string;
  description: string;
  inputSchema: z.ZodObject<any>;
  handler: (args: any, sessionId: string) => Promise<any>;
}): MCPToolDefinition {
  return {
    name: toolDef.name,
    description: toolDef.description,
    inputSchema: convertZodObjectToMCPSchema(toolDef.inputSchema),
    handler: toolDef.handler
  };
}
