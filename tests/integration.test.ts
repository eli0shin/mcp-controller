import { test, expect, describe, beforeAll, afterAll } from 'bun:test';
import path from 'path';
import {
  JSONRPCResponseSchema,
  JSONRPCErrorSchema,
  InitializeResultSchema,
  ListToolsResultSchema,
  CallToolResultSchema,
  ListResourcesResultSchema,
  ReadResourceResultSchema,
  ListPromptsResultSchema,
  GetPromptResultSchema
} from '@modelcontextprotocol/sdk/types.js';
import { withMcpCommander, type JsonRpcMessage, type JsonRpcResponse } from './test-utils.js';
import { 
  createInitializeRequest, 
  createInitializedNotification, 
  createToolsListRequest,
  createToolCallRequest,
  createResourcesListRequest,
  createResourceReadRequest,
  createResourceTemplatesListRequest,
  createPingRequest,
  createPromptsListRequest,
  createPromptGetRequest,
  createInvalidMethodRequest
} from './test-messages.js';

// Complete response schemas using MCP SDK types
const InitializeResponseSchema = JSONRPCResponseSchema.extend({
  result: InitializeResultSchema
});

const ToolsListResponseSchema = JSONRPCResponseSchema.extend({
  result: ListToolsResultSchema
});

const ToolCallResponseSchema = JSONRPCResponseSchema.extend({
  result: CallToolResultSchema
});

const ResourcesListResponseSchema = JSONRPCResponseSchema.extend({
  result: ListResourcesResultSchema
});

const ResourceReadResponseSchema = JSONRPCResponseSchema.extend({
  result: ReadResourceResultSchema
});

const PromptsListResponseSchema = JSONRPCResponseSchema.extend({
  result: ListPromptsResultSchema
});

const PromptGetResponseSchema = JSONRPCResponseSchema.extend({
  result: GetPromptResultSchema
});

const ErrorResponseSchema = JSONRPCErrorSchema;


describe('MCP Proxy Integration Tests', () => {
  let proxyProcess: Bun.Subprocess;
  
  const fixtureServerPath = path.resolve('./tests/fixtures/mcp-server.ts');
  const controllerExecutable = path.resolve('./mcp-controller');
  
  beforeAll(async () => {
    // Start proxy executable as a subprocess so we can communicate with it via stdio
    // Pass test arguments to the fixture server (both positional and named)
    proxyProcess = Bun.spawn([
      controllerExecutable,
      'bun', 'run', fixtureServerPath, 
      'test-arg-1', 'test-arg-2', 
      '--named-1', 'test-named-1-value', 
      '--named-2', 'test-named-2-value'
    ], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });
    
    // Give the proxy time to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  });
  
  afterAll(async () => {
    if (proxyProcess) {
      proxyProcess.kill();
      await proxyProcess.exited;
    }
  });

  // Helper function to send JSON-RPC message and get response
  async function sendJsonRpcMessage(message: JsonRpcMessage): Promise<JsonRpcResponse> {
    const messageStr = JSON.stringify(message) + '\n';
    
    // Type guard to ensure stdin is available
    if (!proxyProcess.stdin || typeof proxyProcess.stdin === 'number') {
      throw new Error('Process stdin is not available');
    }
    
    // Write to stdin (FileSink in Bun)
    proxyProcess.stdin.write(messageStr);
    
    // Type guard to ensure stdout is a ReadableStream
    if (!proxyProcess.stdout || typeof proxyProcess.stdout === 'number') {
      throw new Error('Process stdout is not available');
    }
    
    // Read response from stdout
    const reader = proxyProcess.stdout.getReader();
    const { value } = await reader.read();
    reader.releaseLock();
    
    if (value) {
      const responseStr = new TextDecoder().decode(value);
      const lines = responseStr.trim().split('\n');
      // Return the last JSON line (ignore any debug output)
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          return JSON.parse(lines[i]) as JsonRpcResponse;
        } catch {
          continue;
        }
      }
    }
    
    throw new Error('No valid JSON response received');
  }

  // Helper function to send notification (no response expected)
  async function sendNotification(message: JsonRpcMessage): Promise<void> {
    const messageStr = JSON.stringify(message) + '\n';
    
    if (!proxyProcess.stdin || typeof proxyProcess.stdin === 'number') {
      throw new Error('Process stdin is not available');
    }
    
    proxyProcess.stdin.write(messageStr);
  }

  test('should initialize MCP connection through proxy', async () => {
    const initRequest = createInitializeRequest();

    const response = await sendJsonRpcMessage(initRequest);
    
    // Validate entire response structure
    const validatedResponse = InitializeResponseSchema.parse(response);
    expect(validatedResponse).toEqual({
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: '2025-06-18',
        serverInfo: {
          name: 'demo-server',
          version: '1.0.0',
        },
        capabilities: {
          completions: {},
          prompts: {
            listChanged: true,
          },
          resources: {
            listChanged: true,
          },
          tools: {
            listChanged: true,
          },
        },
      },
    });
  });

  test('should send initialized notification through proxy', async () => {
    const initNotification = createInitializedNotification();

    // Notifications don't return responses, but shouldn't error
    await sendNotification(initNotification);
    
    // Give it time to process
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // If we get here without errors, the notification was handled
    expect(true).toBe(true);
  });

  test('should list tools through proxy', async () => {
    const toolsRequest = createToolsListRequest();

    const response = await sendJsonRpcMessage(toolsRequest);
    
    // Validate entire response structure
    const validatedResponse = ToolsListResponseSchema.parse(response);
    expect(validatedResponse).toEqual({
      jsonrpc: '2.0',
      id: 2,
      result: {
        tools: [
          {
            name: 'add',
            title: 'Addition Tool',
            description: 'Add two numbers',
            inputSchema: {
              $schema: 'http://json-schema.org/draft-07/schema#',
              additionalProperties: false,
              properties: {
                a: {
                  type: 'number',
                },
                b: {
                  type: 'number',
                },
              },
              required: ['a', 'b'],
              type: 'object',
            },
          },
          {
            name: 'subtract',
            title: 'Subtraction Tool',
            description: 'Subtract two numbers',
            inputSchema: {
              $schema: 'http://json-schema.org/draft-07/schema#',
              additionalProperties: false,
              properties: {
                a: {
                  type: 'number',
                },
                b: {
                  type: 'number',
                },
              },
              required: ['a', 'b'],
              type: 'object',
            },
          },
          {
            name: 'get-args',
            title: 'Get Arguments Tool',
            description: 'Returns the command line arguments passed to the server',
            inputSchema: {
              $schema: 'http://json-schema.org/draft-07/schema#',
              additionalProperties: false,
              properties: {},
              type: 'object',
            },
          },
        ],
      },
    });
  });

  test('should call tools through proxy', async () => {
    const toolCallRequest = createToolCallRequest(3, 'add', { a: 5, b: 3 });

    const response = await sendJsonRpcMessage(toolCallRequest);
    
    // Validate entire response structure
    const validatedResponse = ToolCallResponseSchema.parse(response);
    expect(validatedResponse).toEqual({
      jsonrpc: '2.0',
      id: 3,
      result: {
        content: [
          {
            type: 'text',
            text: '8',
          },
        ],
      },
    });
  });

  test('should pass command line arguments through proxy to target server', async () => {
    const argsRequest = createToolCallRequest(13, 'get-args');

    const response = await sendJsonRpcMessage(argsRequest);
    
    // Validate entire response structure including both positional and named arguments
    const validatedResponse = ToolCallResponseSchema.parse(response);
    expect(validatedResponse).toEqual({
      jsonrpc: '2.0',
      id: 13,
      result: {
        content: [
          {
            type: 'text',
            text: '{"arg1":"test-arg-1","arg2":"test-arg-2","namedArg1":"test-named-1-value","namedArg2":"test-named-2-value"}',
          },
        ],
      },
    });
  });

  test('should list resources through proxy', async () => {
    const resourcesRequest = createResourcesListRequest();

    const response = await sendJsonRpcMessage(resourcesRequest);
    
    // Validate entire response structure
    const validatedResponse = ResourcesListResponseSchema.parse(response);
    expect(validatedResponse).toEqual({
      jsonrpc: '2.0',
      id: 4,
      result: {
        resources: [
          {
            name: 'static-greeting',
            title: 'Static Greeting',
            description: 'A static greeting message',
            uri: 'greeting://static',
          },
        ],
      },
    });
  });

  test('should read resources through proxy', async () => {
    const resourceReadRequest = createResourceReadRequest(5, 'greeting://world');

    const response = await sendJsonRpcMessage(resourceReadRequest);
    
    // Validate entire response structure
    const validatedResponse = ResourceReadResponseSchema.parse(response);
    expect(validatedResponse).toEqual({
      jsonrpc: '2.0',
      id: 5,
      result: {
        contents: [
          {
            uri: 'greeting://world',
            text: 'Hello, world!',
          },
        ],
      },
    });
  });

  test('should handle errors through proxy', async () => {
    const invalidToolRequest = createToolCallRequest(6, 'nonexistent-tool');

    const response = await sendJsonRpcMessage(invalidToolRequest);
    
    // Validate entire error response structure
    const validatedResponse = ErrorResponseSchema.parse(response);
    expect(validatedResponse).toEqual({
      jsonrpc: '2.0',
      id: 6,
      error: {
        code: -32602,
        message: 'MCP error -32602: Tool nonexistent-tool not found',
      },
    });
  });

  test('should handle invalid JSON-RPC requests', async () => {
    const invalidRequest = createInvalidMethodRequest(7);

    const response = await sendJsonRpcMessage(invalidRequest);
    
    // Validate entire error response structure
    const validatedResponse = ErrorResponseSchema.parse(response);
    expect(validatedResponse).toEqual({
      jsonrpc: '2.0',
      id: 7,
      error: {
        code: -32601,
        message: 'Method not found',
      },
    });
  });

  test('should handle tool call with invalid arguments', async () => {
    const invalidArgsRequest = createToolCallRequest(8, 'add', { a: 'not-a-number', b: 3 });

    const response = await sendJsonRpcMessage(invalidArgsRequest);
    
    // Validate entire error response structure
    const validatedResponse = ErrorResponseSchema.parse(response);
    expect(validatedResponse).toEqual({
      jsonrpc: '2.0',
      id: 8,
      error: {
        code: -32602,
        message: 'MCP error -32602: Invalid arguments for tool add: [\n  {\n    "code": "invalid_type",\n    "expected": "number",\n    "received": "string",\n    "path": [\n      "a"\n    ],\n    "message": "Expected number, received string"\n  }\n]',
      },
    });
  });

  test('should handle resource read with invalid URI', async () => {
    const invalidUriRequest = createResourceReadRequest(9, 'invalid://uri');

    const response = await sendJsonRpcMessage(invalidUriRequest);
    
    // Validate entire error response structure
    const validatedResponse = ErrorResponseSchema.parse(response);
    expect(validatedResponse).toEqual({
      jsonrpc: '2.0',
      id: 9,
      error: {
        code: -32602,
        message: 'MCP error -32602: Resource invalid://uri not found',
      },
    });
  });

  test('should list resource templates through proxy', async () => {
    const resourceTemplatesRequest = createResourceTemplatesListRequest();

    const response = await sendJsonRpcMessage(resourceTemplatesRequest);
    
    // Validate entire response structure
    expect(response).toEqual({
      jsonrpc: '2.0',
      id: 10,
      result: {
        resourceTemplates: [
          {
            name: 'greeting',
            uriTemplate: 'greeting://{name}',
            title: 'Greeting Resource',
            description: 'Dynamic greeting generator',
          },
        ],
      },
    });
  });

  test('should handle ping through proxy', async () => {
    const pingRequest = createPingRequest();

    const response = await sendJsonRpcMessage(pingRequest);
    
    // Validate entire response structure
    expect(response).toEqual({
      jsonrpc: '2.0',
      id: 11,
      result: {},
    });
  });

  test('should validate server capabilities were proxied correctly', async () => {
    const initRequest = createInitializeRequest(12);

    const response = await sendJsonRpcMessage(initRequest);
    
    // Validate entire response structure
    const validatedResponse = InitializeResponseSchema.parse(response);
    expect(validatedResponse).toEqual({
      jsonrpc: '2.0',
      id: 12,
      result: {
        protocolVersion: '2025-06-18',
        serverInfo: {
          name: 'demo-server',
          version: '1.0.0',
        },
        capabilities: {
          completions: {},
          prompts: {
            listChanged: true,
          },
          resources: {
            listChanged: true,
          },
          tools: {
            listChanged: true,
          },
        },
      },
    });
  });

  test('should list prompts through proxy', async () => {
    const promptsRequest = createPromptsListRequest();

    const response = await sendJsonRpcMessage(promptsRequest);
    
    // Validate entire response structure
    const validatedResponse = PromptsListResponseSchema.parse(response);
    expect(validatedResponse).toEqual({
      jsonrpc: '2.0',
      id: 14,
      result: {
        prompts: [
          {
            name: 'generate-greeting',
            title: 'Greeting Generator',
            description: 'Generate a personalized greeting message',
            arguments: [
              {
                name: 'name',
                required: true,
              },
            ],
          },
        ],
      },
    });
  });

  test('should get prompt with arguments through proxy', async () => {
    const promptGetRequest = createPromptGetRequest(15, 'generate-greeting', { name: 'Alice' });

    const response = await sendJsonRpcMessage(promptGetRequest);
    
    // Validate entire response structure
    const validatedResponse = PromptGetResponseSchema.parse(response);
    expect(validatedResponse).toEqual({
      jsonrpc: '2.0',
      id: 15,
      result: {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Generate a friendly greeting message for someone named Alice.',
            },
          },
        ],
      },
    });
  });
});

describe('MCP Proxy Tool Filtering Tests', () => {

  describe('enabled tools filtering', () => {
    test('should only return enabled tools in tools/list response', async () => {
      await withMcpCommander(['--enabled-tools', 'add'], async (sendJsonRpcMessage, sendNotification) => {
        // Initialize the connection
        const initRequest = createInitializeRequest();
        await sendJsonRpcMessage(initRequest);
        
        const initNotification = createInitializedNotification();
        await sendNotification(initNotification);

        const toolsRequest = createToolsListRequest();

        const response = await sendJsonRpcMessage(toolsRequest);
        
        // Validate entire response structure with only 'add' tool (filtering working correctly)
        const validatedResponse = ToolsListResponseSchema.parse(response);
        expect(validatedResponse).toEqual({
          jsonrpc: '2.0',
          id: 2,
          result: {
            tools: [
              {
                name: 'add',
                title: 'Addition Tool', 
                description: 'Add two numbers',
                inputSchema: {
                  $schema: 'http://json-schema.org/draft-07/schema#',
                  additionalProperties: false,
                  properties: {
                    a: { type: 'number' },
                    b: { type: 'number' },
                  },
                  required: ['a', 'b'],
                  type: 'object',
                },
              },
            ],
          },
        });
      });
    });
  });

  describe('disabled tools filtering', () => {
    test('should exclude disabled tools from tools/list response', async () => {
      await withMcpCommander(['--disabled-tools', 'get-args'], async (sendJsonRpcMessage, sendNotification) => {
        // Initialize the connection
        const initRequest = createInitializeRequest();
        await sendJsonRpcMessage(initRequest);
        
        const initNotification = createInitializedNotification();
        await sendNotification(initNotification);

        const toolsRequest = createToolsListRequest();

        const response = await sendJsonRpcMessage(toolsRequest);
        
        // Validate entire response structure excluding 'get-args' tool (filtering working correctly)
        const validatedResponse = ToolsListResponseSchema.parse(response);
        expect(validatedResponse).toEqual({
          jsonrpc: '2.0',
          id: 2,
          result: {
            tools: [
              {
                name: 'add',
                title: 'Addition Tool',
                description: 'Add two numbers',
                inputSchema: {
                  $schema: 'http://json-schema.org/draft-07/schema#',
                  additionalProperties: false,
                  properties: {
                    a: { type: 'number' },
                    b: { type: 'number' },
                  },
                  required: ['a', 'b'],
                  type: 'object',
                },
              },
              {
                name: 'subtract',
                title: 'Subtraction Tool',
                description: 'Subtract two numbers',
                inputSchema: {
                  $schema: 'http://json-schema.org/draft-07/schema#',
                  additionalProperties: false,
                  properties: {
                    a: { type: 'number' },
                    b: { type: 'number' },
                  },
                  required: ['a', 'b'],
                  type: 'object',
                },
              },
            ],
          },
        });
      });
    });
  });
});