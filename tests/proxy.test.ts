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
    const config: ProxyConfig = {
      targetCommand: ['nonexistent-command'],
      serverName: 'test',
      serverVersion: '1.0.0',
    };

    try {
      await manager.startTargetServer(config);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});