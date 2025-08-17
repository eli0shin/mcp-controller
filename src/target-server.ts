import type { ProxyConfig, TargetServerProcess } from './types.js';

export class TargetServerManager {
  private targetServer: TargetServerProcess | null = null;

  async startTargetServer(config: ProxyConfig): Promise<TargetServerProcess> {
    if (this.targetServer) {
      throw new Error('Target server is already running');
    }

    const [command, ...args] = config.targetCommand;
    
    const process = Bun.spawn([command, ...args], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'inherit',
    });

    const stdin = process.stdin;
    const stdout = process.stdout;

    this.targetServer = {
      process,
      stdin,
      stdout,
    };

    return this.targetServer;
  }

  async stopTargetServer(): Promise<void> {
    if (!this.targetServer) {
      return;
    }

    try {
      this.targetServer.stdin.end();
      this.targetServer.process.kill();
      await this.targetServer.process.exited;
    } catch {
      // Ignore errors during cleanup
    } finally {
      this.targetServer = null;
    }
  }

  getTargetServer(): TargetServerProcess | null {
    return this.targetServer;
  }

  isRunning(): boolean {
    return this.targetServer !== null;
  }
}