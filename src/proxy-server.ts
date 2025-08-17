import type { ProxyConfig, TargetServerProcess } from './types.js';
import { TargetServerManager } from './target-server.js';

export class McpProxyServer {
  private targetManager: TargetServerManager;
  private config: ProxyConfig;
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
    
    process.stderr.write('MCP Proxy Server started\n');
  }

  private setupStdioProxy(): void {
    if (!this.targetServer) {
      throw new Error('Target server not started');
    }

    // Forward stdin to target server
    process.stdin.on('data', (data) => {
      if (this.targetServer) {
        this.targetServer.stdin.write(data);
      }
    });

    // Forward target server output to stdout
    const reader = this.targetServer.stdout.getReader();
    
    const readLoop = async (): Promise<void> => {
      try {
        while (this.targetServer) {
          const { value, done } = await reader.read();
          if (done) break;
          
          if (value) {
            process.stdout.write(value);
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

  async stop(): Promise<void> {
    await this.targetManager.stopTargetServer();
    this.targetServer = null;
  }
}