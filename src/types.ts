export type ProxyConfig = {
  targetCommand: string[];
  enabledTools?: string[];
  disabledTools?: string[];
  serverName: string;
  serverVersion: string;
  mode?: 'proxy' | 'list-tools';
};

export type TargetServerProcess = {
  process: Bun.Subprocess;
  stdin: Bun.FileSink;
  stdout: ReadableStream<Uint8Array>;
};

// Re-export MCP SDK types instead of custom definitions
export type {
  JSONRPCMessage as JsonRpcMessage,
  Tool,
  ListToolsResult as ToolsListResult
} from '@modelcontextprotocol/sdk/types.js';

// Type for JSON-RPC response with error
type JsonRpcError = {
  code: number;
  message: string;
  data?: unknown;
};

// Type for JSON-RPC response used in CLI
type JsonRpcResponse = {
  jsonrpc: string;
  id: number;
  result?: {
    tools?: Array<{ name: string; description?: string }>;
    [key: string]: unknown;
  };
  error?: JsonRpcError;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseJsonRpcResponse(value: unknown): JsonRpcResponse | null {
  if (!isObject(value)) return null;
  if (typeof value.jsonrpc !== 'string') return null;
  if (typeof value.id !== 'number') return null;

  let error: JsonRpcError | undefined;
  if (isObject(value.error)) {
    const err = value.error;
    if (typeof err.code === 'number' && typeof err.message === 'string') {
      error = { code: err.code, message: err.message, data: err.data };
    }
  }

  let result: JsonRpcResponse['result'];
  if (isObject(value.result)) {
    result = value.result;
  }

  return {
    jsonrpc: value.jsonrpc,
    id: value.id,
    error,
    result,
  };
}

export function parseToolsArray(value: unknown): Array<{ name: string; description?: string }> {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is { name: string; description?: string } =>
      isObject(item) && typeof item.name === 'string'
  );
}