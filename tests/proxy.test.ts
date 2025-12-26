import { test, expect, describe } from 'bun:test';
import { TargetServerManager } from '../src/target-server.js';
import type { ProxyConfig } from '../src/types.js';

describe('TargetServerManager', () => {
  test('should create manager instance', () => {
    const manager = new TargetServerManager();
    expect(manager.isRunning()).toBe(false);
    expect(manager.getTargetServer()).toBe(null);
  });

  test('should handle invalid command gracefully', async () => {
    const manager = new TargetServerManager();
    const config = {
      targetCommand: ['/nonexistent-path/nonexistent-command'],
      serverName: 'test',
      serverVersion: '1.0.0',
    } satisfies ProxyConfig;

    // startTargetServer spawns the process asynchronously; it doesn't throw on invalid commands
    // The process will fail later when communication is attempted
    const server = await manager.startTargetServer(config);
    expect(server).toBeDefined();
    expect(manager.isRunning()).toBe(true);

    // Clean up
    await manager.stopTargetServer();
  });
});