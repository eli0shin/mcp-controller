import type { ProxyConfig, TargetServerProcess, ToolsListResult } from './types.js';
import { TargetServerManager } from './target-server.js';
import { matchesToolPattern } from './utils.js';
import { JSONRPCMessageSchema, ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';

export class McpProxyServer {
  private readonly targetManager: TargetServerManager;
  private readonly config: ProxyConfig;
  private targetServer: TargetServerProcess | null = null;

  constructor(config: ProxyConfig) {
    this.config = config;
    this.targetManager = new TargetServerManager();
  }

  async start(): Promise<void> {
    // Start the target server
    this.targetServer = await this.targetManager.startTargetServer(this.config);
    
    // Set up stdin/stdout proxying
    this.setupStdioProxy();
    
    process.stderr.write('MCP Controller started\n');
  }

  private setupStdioProxy(): void {
    if (!this.targetServer) {
      throw new Error('Target server not started');
    }

    // Forward stdin to target server (no modification needed for client->server messages)
    process.stdin.on('data', (data) => {
      if (this.targetServer) {
        this.targetServer.stdin.write(data);
      }
    });

    // Process and forward target server output to stdout with message filtering
    const reader = this.targetServer.stdout.getReader();
    let buffer = '';
    
    const readLoop = async (): Promise<void> => {
      try {
        while (this.targetServer) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += new TextDecoder().decode(value);

          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.trim()) {
              const processedLine = this.processMessage(line.trim());
              process.stdout.write(processedLine + '\n');
            } else {
              process.stdout.write('\n');
            }
          }
        }
      } catch (error) {
        process.stderr.write(`Proxy error: ${error}\n`);
      }
    };

    void readLoop();

    // Handle process termination
    process.stdin.on('end', () => {
      void this.stop();
    });
  }

  private processMessage(line: string): string {
    try {
      const parsed = JSONRPCMessageSchema.safeParse(JSON.parse(line));
      if (!parsed.success) {
        return line;
      }
      const message = parsed.data;

      // Only filter tools/list responses
      if ('result' in message && !('method' in message) && !('error' in message)) {
        // This is a response message - check if it's a tools/list response
        const toolsResult = ListToolsResultSchema.safeParse(message.result);
        if (toolsResult.success) {
          const filteredResult = this.filterToolsListResponse(toolsResult.data);
          return JSON.stringify({
            ...message,
            result: filteredResult
          });
        }
      }

      return line;
    } catch {
      // If JSON parsing fails, return the line unchanged
      return line;
    }
  }

  private filterToolsListResponse(result: ToolsListResult): ToolsListResult {
    const { enabledTools, disabledTools } = this.config;
    
    if (!enabledTools && !disabledTools) {
      return result;
    }
    
    let filteredTools = result.tools;
    
    if (enabledTools) {
      filteredTools = filteredTools.filter(tool => enabledTools.some(pattern => matchesToolPattern(tool.name, pattern)));
    } else if (disabledTools) {
      filteredTools = filteredTools.filter(tool => !disabledTools.some(pattern => matchesToolPattern(tool.name, pattern)));
    }
    
    return {
      ...result,
      tools: filteredTools
    };
  }

  async stop(): Promise<void> {
    await this.targetManager.stopTargetServer();
    this.targetServer = null;
  }
}