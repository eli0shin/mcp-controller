import { test, expect, describe } from 'bun:test';
import path from 'path';

describe('List Tools Command Tests', () => {
  const fixtureServerPath = path.resolve('./tests/fixtures/mcp-server.ts');
  const controllerExecutable = path.resolve('./mcp-controller');
  
  test('should list all available tools', async () => {
    const process = Bun.spawn([
      controllerExecutable,
      'list-tools',
      'bun', 'run', fixtureServerPath
    ], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const output = await new Response(process.stdout).text();
    const errorOutput = await new Response(process.stderr).text();
    
    await process.exited;
    
    // Should not have errors
    expect(errorOutput.trim()).toBe('');
    
    // Should list both tools in the expected format
    const lines = output.trim().split('\n');
    expect(lines).toEqual([
      'add: Add two numbers',
      'get-args: Returns the command line arguments passed to the server'
    ]);
  });

  test('should list only enabled tools when --enabled-tools is specified', async () => {
    const process = Bun.spawn([
      controllerExecutable,
      'list-tools',
      '--enabled-tools', 'add',
      'bun', 'run', fixtureServerPath
    ], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const output = await new Response(process.stdout).text();
    const errorOutput = await new Response(process.stderr).text();
    
    await process.exited;
    
    // Should not have errors
    expect(errorOutput.trim()).toBe('');
    
    // Should only list the enabled tool
    const lines = output.trim().split('\n');
    expect(lines).toEqual([
      'add: Add two numbers'
    ]);
  });

  test('should exclude disabled tools when --disabled-tools is specified', async () => {
    const process = Bun.spawn([
      controllerExecutable,
      'list-tools',
      '--disabled-tools', 'get-args',
      'bun', 'run', fixtureServerPath
    ], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const output = await new Response(process.stdout).text();
    const errorOutput = await new Response(process.stderr).text();
    
    await process.exited;
    
    // Should not have errors
    expect(errorOutput.trim()).toBe('');
    
    // Should only list the non-disabled tool
    const lines = output.trim().split('\n');
    expect(lines).toEqual([
      'add: Add two numbers'
    ]);
  });

  test('should show error when no target command specified', async () => {
    const process = Bun.spawn([
      controllerExecutable,
      'list-tools'
    ], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const output = await new Response(process.stdout).text();
    const errorOutput = await new Response(process.stderr).text();
    
    const exitCode = await process.exited;
    
    // Should exit with error code
    expect(exitCode).toBe(1);
    
    // Should have error message
    expect(errorOutput.trim()).toBe('Error: No target command specified for list-tools');
    
    // Should have no stdout output
    expect(output.trim()).toBe('');
  });

  test('should handle server initialization errors', async () => {
    const process = Bun.spawn([
      controllerExecutable,
      'list-tools',
      'nonexistent-command'
    ], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const output = await new Response(process.stdout).text();
    const errorOutput = await new Response(process.stderr).text();
    
    const exitCode = await process.exited;
    
    // Should exit with error code
    expect(exitCode).toBe(1);
    
    // Should have error message about listing tools
    expect(errorOutput).toContain('Error listing tools:');
    
    // Should have no stdout output
    expect(output.trim()).toBe('');
  });

  test('should handle mutually exclusive enabled/disabled tools arguments', async () => {
    const process = Bun.spawn([
      controllerExecutable,
      'list-tools',
      '--enabled-tools', 'add',
      '--disabled-tools', 'get-args',
      'bun', 'run', fixtureServerPath
    ], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const output = await new Response(process.stdout).text();
    const errorOutput = await new Response(process.stderr).text();
    
    const exitCode = await process.exited;
    
    // Should exit with error code
    expect(exitCode).toBe(1);
    
    // Should have error message about mutual exclusivity
    expect(errorOutput.trim()).toBe('Error: --enabled-tools and --disabled-tools are mutually exclusive');
    
    // Should have no stdout output
    expect(output.trim()).toBe('');
  });

  test('should pass command line arguments to target server during list-tools', async () => {
    const process = Bun.spawn([
      controllerExecutable,
      'list-tools',
      'bun', 'run', fixtureServerPath,
      'pos-arg-1', 'pos-arg-2',
      '--named-arg', 'named-value'
    ], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const output = await new Response(process.stdout).text();
    const errorOutput = await new Response(process.stderr).text();
    
    await process.exited;
    
    // Should not have errors
    expect(errorOutput.trim()).toBe('');
    
    // Should list tools normally (arguments don't affect tool listing)
    const lines = output.trim().split('\n');
    expect(lines).toEqual([
      'add: Add two numbers',
      'get-args: Returns the command line arguments passed to the server'
    ]);
  });
});