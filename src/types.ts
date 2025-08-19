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