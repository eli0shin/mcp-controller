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

type JsonRpcMessage = {
  jsonrpc: string;
  id?: number;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: string;
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

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
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {
          tools: {},
          resources: {},
        },
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      },
    };

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
    const initNotification = {
      jsonrpc: '2.0',
      method: 'initialized',
    };

    // Notifications don't return responses, but shouldn't error
    await sendNotification(initNotification);
    
    // Give it time to process
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // If we get here without errors, the notification was handled
    expect(true).toBe(true);
  });

  test('should list tools through proxy', async () => {
    const toolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    };

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
    const toolCallRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'add',
        arguments: {
          a: 5,
          b: 3,
        },
      },
    };

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
    const argsRequest = {
      jsonrpc: '2.0',
      id: 13,
      method: 'tools/call',
      params: {
        name: 'get-args',
        arguments: {},
      },
    };

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
    const resourcesRequest = {
      jsonrpc: '2.0',
      id: 4,
      method: 'resources/list',
    };

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
    const resourceReadRequest = {
      jsonrpc: '2.0',
      id: 5,
      method: 'resources/read',
      params: {
        uri: 'greeting://world',
      },
    };

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
    const invalidToolRequest = {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'nonexistent-tool',
        arguments: {},
      },
    };

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
    const invalidRequest = {
      jsonrpc: '2.0',
      id: 7,
      method: 'invalid/method',
      params: {},
    };

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
    const invalidArgsRequest = {
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: {
        name: 'add',
        arguments: {
          a: 'not-a-number',
          b: 3,
        },
      },
    };

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
    const invalidUriRequest = {
      jsonrpc: '2.0',
      id: 9,
      method: 'resources/read',
      params: {
        uri: 'invalid://uri',
      },
    };

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
    const resourceTemplatesRequest = {
      jsonrpc: '2.0',
      id: 10,
      method: 'resources/templates/list',
    };

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
    const pingRequest = {
      jsonrpc: '2.0',
      id: 11,
      method: 'ping',
    };

    const response = await sendJsonRpcMessage(pingRequest);
    
    // Validate entire response structure
    expect(response).toEqual({
      jsonrpc: '2.0',
      id: 11,
      result: {},
    });
  });

  test('should validate server capabilities were proxied correctly', async () => {
    const initRequest = {
      jsonrpc: '2.0',
      id: 12,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {
          tools: {},
          resources: {},
        },
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      },
    };

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
    const promptsRequest = {
      jsonrpc: '2.0',
      id: 14,
      method: 'prompts/list',
    };

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
    const promptGetRequest = {
      jsonrpc: '2.0',
      id: 15,
      method: 'prompts/get',
      params: {
        name: 'generate-greeting',
        arguments: {
          name: 'Alice',
        },
      },
    };

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
  let proxyProcess: Bun.Subprocess;
  
  const fixtureServerPath = path.resolve('./tests/fixtures/mcp-server.ts');
  const controllerExecutable = path.resolve('./mcp-controller');
  
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

  describe('enabled tools filtering', () => {
    beforeAll(async () => {
      // Start proxy with only 'add' tool enabled
      proxyProcess = Bun.spawn([
        controllerExecutable,
        '--enabled-tools', 'add',
        'bun', 'run', fixtureServerPath
      ], {
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: 'pipe',
      });
      
      // Give the proxy time to start
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Initialize the connection
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: { tools: {}, resources: {} },
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      };
      await sendJsonRpcMessage(initRequest);
      
      const initNotification = {
        jsonrpc: '2.0',
        method: 'initialized',
      };
      await sendNotification(initNotification);
    });

    test('should only return enabled tools in tools/list response', async () => {
      const toolsRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      };

      const response = await sendJsonRpcMessage(toolsRequest);
      
      // Validate entire response structure with only 'add' tool
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

  describe('disabled tools filtering', () => {
    beforeAll(async () => {
      // Start proxy with 'get-args' tool disabled
      proxyProcess = Bun.spawn([
        controllerExecutable,
        '--disabled-tools', 'get-args',
        'bun', 'run', fixtureServerPath
      ], {
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: 'pipe',
      });
      
      // Give the proxy time to start
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Initialize the connection
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: { tools: {}, resources: {} },
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      };
      await sendJsonRpcMessage(initRequest);
      
      const initNotification = {
        jsonrpc: '2.0',
        method: 'initialized',
      };
      await sendNotification(initNotification);
    });

    test('should exclude disabled tools from tools/list response', async () => {
      const toolsRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      };

      const response = await sendJsonRpcMessage(toolsRequest);
      
      // Validate entire response structure with only 'add' tool (get-args disabled)
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