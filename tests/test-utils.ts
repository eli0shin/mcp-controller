import path from 'path';

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

function isJsonRpcResponse(value: unknown): value is JsonRpcResponse {
  if (typeof value !== 'object' || value === null) return false;
  return 'jsonrpc' in value && typeof value.jsonrpc === 'string' &&
         'id' in value && typeof value.id === 'number';
}

const fixtureServerPath = path.resolve('./tests/fixtures/mcp-server.ts');
const controllerExecutable = path.resolve('./mcp-controller');

// Helper function to manage MCP Commander process lifecycle
export async function withMcpCommander<T>(
  args: string[],
  callback: (sendJsonRpcMessage: (message: JsonRpcMessage) => Promise<JsonRpcResponse>, sendNotification: (message: JsonRpcMessage) => Promise<void>) => Promise<T>
): Promise<T> {
  const proxyProcess = Bun.spawn([
    controllerExecutable,
    ...args,
    'bun', 'run', fixtureServerPath
  ], {
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  });
  
  try {
    // Give the proxy time to start
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Helper function to send JSON-RPC message and get response
    async function sendJsonRpcMessage(message: JsonRpcMessage): Promise<JsonRpcResponse> {
      const messageStr = JSON.stringify(message) + '\n';

      // Write to stdin (FileSink in Bun)
      proxyProcess.stdin.write(messageStr);

      // Read response from stdout
      const reader = proxyProcess.stdout.getReader();
      const { value } = await reader.read();
      reader.releaseLock();

      const responseStr = new TextDecoder().decode(value);
      const lines = responseStr.trim().split('\n');
      // Return the last JSON line (ignore any debug output)
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const parsed: unknown = JSON.parse(lines[i]);
          if (isJsonRpcResponse(parsed)) {
            return parsed;
          }
        } catch {
          continue;
        }
      }

      throw new Error('No valid JSON response received');
    }

    // Helper function to send notification (no response expected)
    async function sendNotification(message: JsonRpcMessage): Promise<void> {
      const messageStr = JSON.stringify(message) + '\n';
      proxyProcess.stdin.write(messageStr);
    }

    return await callback(sendJsonRpcMessage, sendNotification);
  } finally {
    // Clean up - kill the proxy process
    proxyProcess.kill();
    await proxyProcess.exited;
  }
}

export type { JsonRpcMessage, JsonRpcResponse };