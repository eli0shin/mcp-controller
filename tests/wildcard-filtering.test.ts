import { test, expect, describe } from 'bun:test';
import path from 'path';
import { z } from 'zod';
import { withMcpCommander } from './test-utils.js';
import { createInitializeRequest, createToolsListRequest } from './test-messages.js';

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



describe('Wildcard Tool Filtering Tests', () => {
  test('should filter tools using wildcard patterns in proxy mode', async () => {
    await withMcpCommander(['--enabled-tools', 'get-*,add'], async (sendJsonRpcMessage) => {
      // Initialize the connection
      const initializeRequest = createInitializeRequest(1, '0.1.0');

      const initResponse = await sendJsonRpcMessage(initializeRequest);
      expect(initResponse.error).toBeUndefined();

      // Request tools list
      const toolsRequest = createToolsListRequest();

      const response = await sendJsonRpcMessage(toolsRequest);
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