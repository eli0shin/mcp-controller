import type { JsonRpcMessage } from './test-utils.js';

// Common JSON-RPC message templates used across tests

// Initialize request with configurable ID and protocol version
export const createInitializeRequest = (id = 1, protocolVersion = '2025-06-18'): JsonRpcMessage => ({
  jsonrpc: '2.0',
  id,
  method: 'initialize',
  params: {
    protocolVersion,
    capabilities: {
      tools: {},
      resources: {},
    },
    clientInfo: {
      name: 'test-client',
      version: '1.0.0',
    },
  },
});

// Initialized notification (no ID needed)
export const createInitializedNotification = (): JsonRpcMessage => ({
  jsonrpc: '2.0',
  method: 'initialized',
});

// Tools list request with configurable ID
export const createToolsListRequest = (id = 2): JsonRpcMessage => ({
  jsonrpc: '2.0',
  id,
  method: 'tools/list',
});

// Tool call request with configurable parameters
export const createToolCallRequest = (id: number, toolName: string, args: Record<string, unknown> = {}): JsonRpcMessage => ({
  jsonrpc: '2.0',
  id,
  method: 'tools/call',
  params: {
    name: toolName,
    arguments: args,
  },
});

// Resources list request
export const createResourcesListRequest = (id = 4): JsonRpcMessage => ({
  jsonrpc: '2.0',
  id,
  method: 'resources/list',
});

// Resource read request
export const createResourceReadRequest = (id: number, uri: string): JsonRpcMessage => ({
  jsonrpc: '2.0',
  id,
  method: 'resources/read',
  params: {
    uri,
  },
});

// Resource templates list request
export const createResourceTemplatesListRequest = (id = 10): JsonRpcMessage => ({
  jsonrpc: '2.0',
  id,
  method: 'resources/templates/list',
});

// Ping request
export const createPingRequest = (id = 11): JsonRpcMessage => ({
  jsonrpc: '2.0',
  id,
  method: 'ping',
});

// Prompts list request
export const createPromptsListRequest = (id = 14): JsonRpcMessage => ({
  jsonrpc: '2.0',
  id,
  method: 'prompts/list',
});

// Prompt get request
export const createPromptGetRequest = (id: number, name: string, args: Record<string, unknown> = {}): JsonRpcMessage => ({
  jsonrpc: '2.0',
  id,
  method: 'prompts/get',
  params: {
    name,
    arguments: args,
  },
});

// Invalid method request for error testing
export const createInvalidMethodRequest = (id = 7): JsonRpcMessage => ({
  jsonrpc: '2.0',
  id,
  method: 'invalid/method',
  params: {},
});

// Common message sequences for initialization
export const initializeSequence = {
  request: createInitializeRequest(),
  notification: createInitializedNotification(),
};