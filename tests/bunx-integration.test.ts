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
      proxyProcess.stdin.write(messageStr);

      // Read response
      const reader = proxyProcess.stdout.getReader();
      const { value } = await reader.read();
      reader.releaseLock();

      const responseStr = new TextDecoder().decode(value);
      const lines = responseStr.trim().split('\n');

      // Find valid JSON response
      let response: unknown;
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          response = JSON.parse(lines[i]);
          break;
        } catch {
          continue;
        }
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
      proxyProcess.kill();
      await proxyProcess.exited;
    }
  }, 15000);
});
