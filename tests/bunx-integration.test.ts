import { test, expect, describe } from 'bun:test';
import path from 'path';
import {
  JSONRPCResponseSchema,
  InitializeResultSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createInitializeRequest } from './test-messages.js';

// Complete response schema for initialize using MCP SDK types
const InitializeResponseSchema = JSONRPCResponseSchema.extend({
  result: InitializeResultSchema,
});

const controllerExecutable = path.resolve('./mcp-controller');

describe('Bunx Integration Tests', () => {
  test('should work with npm package @modelcontextprotocol/server-sequential-thinking', async () => {
    // Test that our BUN_BE_BUN implementation works with real npm packages
    const proxyProcess = Bun.spawn(
      [
        controllerExecutable,
        '@modelcontextprotocol/server-sequential-thinking',
      ],
      {
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: 'pipe',
      }
    );

    try {
      // Give the proxy time to start and install the npm package
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const request = createInitializeRequest();
      const messageStr = JSON.stringify(request) + '\n';

      // Send initialize request
      if (!proxyProcess.stdin || typeof proxyProcess.stdin === 'number') {
        throw new Error('Process stdin is not available');
      }
      proxyProcess.stdin.write(messageStr);

      // Read response
      if (!proxyProcess.stdout || typeof proxyProcess.stdout === 'number') {
        throw new Error('Process stdout is not available');
      }

      const reader = proxyProcess.stdout.getReader();
      const { value } = await reader.read();
      reader.releaseLock();

      if (!value) {
        throw new Error('No response received');
      }

      const responseStr = new TextDecoder().decode(value);
      const lines = responseStr.trim().split('\n');

      // Find valid JSON response
      let response;
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          response = JSON.parse(lines[i]);
          break;
        } catch {
          continue;
        }
      }

      if (!response) {
        throw new Error('No valid JSON response received');
      }

      // Validate response structure
      const validatedResponse = InitializeResponseSchema.parse(response);

      expect(validatedResponse).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: {
          protocolVersion: '2025-06-18',
          serverInfo: {
            name: 'sequential-thinking-server',
            version: '0.2.0',
          },
          capabilities: {
            tools: {
              listChanged: true,
            },
          },
        },
      });
    } finally {
      if (proxyProcess) {
        proxyProcess.kill();
        await proxyProcess.exited;
      }
    }
  }, 15000);
});
