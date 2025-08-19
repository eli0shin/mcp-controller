import { test, expect, describe, beforeAll, afterAll } from 'bun:test';
import path from 'path';
import { z } from 'zod';

const ToolsListResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.number(),
  result: z.object({
    tools: z.array(z.object({
      name: z.string(),
      description: z.string(),
      inputSchema: z.record(z.unknown()),
    })),
  }),
});


type JsonRpcMessage = {
  jsonrpc: '2.0';
  id: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

// Utility function to send JSON-RPC message and get response
async function sendJsonRpcMessage(
  process: Bun.Subprocess,
  message: JsonRpcMessage
): Promise<JsonRpcMessage> {
  (process.stdin as Bun.FileSink).write(JSON.stringify(message) + '\n');
  
  const reader = (process.stdout as ReadableStream<Uint8Array>).getReader();
  let buffer = '';
  
  while (true) {
    const { value, done } = await reader.read();
    if (done) throw new Error('Stream ended without response');
    
    if (value) {
      buffer += new TextDecoder().decode(value);
      const lines = buffer.split('\n');
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line.trim()) as JsonRpcMessage;
            if (response.id === message.id) {
              reader.releaseLock();
              return response;
            }
          } catch {
            // Continue if line isn't valid JSON
            continue;
          }
        }
      }
    }
  }
}

describe('Wildcard Tool Filtering Tests', () => {
  let controllerProcess: Bun.Subprocess;
  const fixtureServerPath = path.resolve(import.meta.dirname, 'fixtures', 'mcp-server.ts');
  
  beforeAll(async () => {
    // Start controller with wildcard patterns in proxy mode
    controllerProcess = Bun.spawn([
      'bun', 'run', 'src/cli.ts',
      '--enabled-tools', 'get-*,add',
      'bun', 'run', fixtureServerPath
    ], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  });
  
  afterAll(async () => {
    if (controllerProcess) {
      controllerProcess.kill();
      await controllerProcess.exited;
    }
  });

  test('should filter tools using wildcard patterns in proxy mode', async () => {
    // Initialize the connection
    const initializeRequest = {
      jsonrpc: '2.0' as const,
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '0.1.0',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      },
    };

    const initResponse = await sendJsonRpcMessage(controllerProcess, initializeRequest);
    expect(initResponse.error).toBeUndefined();

    // Request tools list
    const toolsRequest = {
      jsonrpc: '2.0' as const,
      id: 2,
      method: 'tools/list',
      params: {},
    };

    const response = await sendJsonRpcMessage(controllerProcess, toolsRequest);
    const validatedResponse = ToolsListResponseSchema.parse(response);
    
    // Should only include tools matching get-* pattern and exact match 'add'
    const toolNames = validatedResponse.result.tools.map(tool => tool.name);
    
    // Verify wildcard matching: should include get-args (matches get-*)
    expect(toolNames).toContain('get-args');
    expect(toolNames).toContain('add');
    
    // Should NOT include tools that don't match pattern
    expect(toolNames).not.toContain('subtract');
  });
});

describe('List-Tools Mode Wildcard Tests', () => {
  test('should support wildcard patterns in list-tools mode', async () => {
    const fixtureServerPath = path.resolve(import.meta.dirname, 'fixtures', 'mcp-server.ts');
    
    const listToolsProcess = Bun.spawn([
      'bun', 'run', 'src/cli.ts',
      'list-tools',
      '--enabled-tools', 'get-*',
      'bun', 'run', fixtureServerPath
    ], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get the output
    const stdout = await new Response(listToolsProcess.stdout as ReadableStream).text();
    
    listToolsProcess.kill();
    await listToolsProcess.exited;
    
    // Should include tools matching get-* pattern
    expect(stdout).toContain('get-args');
    
    // Should NOT include tools that don't match
    expect(stdout).not.toContain('add:');
    expect(stdout).not.toContain('subtract:');
  });

  test('should support disabled tools with wildcards', async () => {
    const fixtureServerPath = path.resolve(import.meta.dirname, 'fixtures', 'mcp-server.ts');
    
    const listToolsProcess = Bun.spawn([
      'bun', 'run', 'src/cli.ts',
      'list-tools',
      '--disabled-tools', 'get-*',
      'bun', 'run', fixtureServerPath
    ], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const stdout = await new Response(listToolsProcess.stdout as ReadableStream).text();
    
    listToolsProcess.kill();
    await listToolsProcess.exited;
    
    // Should NOT include tools matching get-* pattern
    expect(stdout).not.toContain('get-args');
    
    // Should include tools that don't match the disabled pattern
    expect(stdout).toContain('add:');
    expect(stdout).toContain('subtract:');
  });

  test('should handle exact matches without wildcards (backward compatibility)', async () => {
    const fixtureServerPath = path.resolve(import.meta.dirname, 'fixtures', 'mcp-server.ts');
    
    const listToolsProcess = Bun.spawn([
      'bun', 'run', 'src/cli.ts',
      'list-tools',
      '--enabled-tools', 'add',
      'bun', 'run', fixtureServerPath
    ], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const stdout = await new Response(listToolsProcess.stdout as ReadableStream).text();
    
    listToolsProcess.kill();
    await listToolsProcess.exited;
    
    // Should include exact match
    expect(stdout).toContain('add:');
    
    // Should NOT include other tools
    expect(stdout).not.toContain('subtract:');
    expect(stdout).not.toContain('get-args:');
  });

  test('should handle mixed exact and wildcard patterns', async () => {
    const fixtureServerPath = path.resolve(import.meta.dirname, 'fixtures', 'mcp-server.ts');
    
    const listToolsProcess = Bun.spawn([
      'bun', 'run', 'src/cli.ts',
      'list-tools',
      '--enabled-tools', 'add,get-*',
      'bun', 'run', fixtureServerPath
    ], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const stdout = await new Response(listToolsProcess.stdout as ReadableStream).text();
    
    listToolsProcess.kill();
    await listToolsProcess.exited;
    
    // Should include exact match 'add'
    expect(stdout).toContain('add:');
    
    // Should include wildcard matches for get-*
    expect(stdout).toContain('get-args:');
    
    // Should NOT include tools that match neither pattern
    expect(stdout).not.toContain('subtract:');
  });

  test('should handle match-all wildcard pattern', async () => {
    const fixtureServerPath = path.resolve(import.meta.dirname, 'fixtures', 'mcp-server.ts');
    
    const listToolsProcess = Bun.spawn([
      'bun', 'run', 'src/cli.ts',
      'list-tools',
      '--enabled-tools', '*',
      'bun', 'run', fixtureServerPath
    ], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const stdout = await new Response(listToolsProcess.stdout as ReadableStream).text();
    
    listToolsProcess.kill();
    await listToolsProcess.exited;
    
    // Should include all tools when using * pattern
    expect(stdout).toContain('add:');
    expect(stdout).toContain('subtract:');
    expect(stdout).toContain('get-args:');
  });

  test('should handle complex wildcard patterns', async () => {
    const fixtureServerPath = path.resolve(import.meta.dirname, 'fixtures', 'mcp-server.ts');
    
    const listToolsProcess = Bun.spawn([
      'bun', 'run', 'src/cli.ts',
      'list-tools',
      '--enabled-tools', '*-args',
      'bun', 'run', fixtureServerPath
    ], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const stdout = await new Response(listToolsProcess.stdout as ReadableStream).text();
    
    listToolsProcess.kill();
    await listToolsProcess.exited;
    
    // Should include tools ending with '-args'
    expect(stdout).toContain('get-args:');
    
    // Should NOT include tools that don't end with '-args'
    expect(stdout).not.toContain('add:');
    expect(stdout).not.toContain('subtract:');
  });
});