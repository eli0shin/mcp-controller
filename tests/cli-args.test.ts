import { test, expect, describe } from 'bun:test';
import path from 'path';

describe('CLI Argument Validation Tests', () => {
  const controllerExecutable = path.resolve('./mcp-controller');
  const fixtureServerPath = path.resolve('./tests/fixtures/mcp-server.ts');

  test('should reject when both --enabled-tools and --disabled-tools are provided', async () => {
    const process = Bun.spawn([
      controllerExecutable,
      '--enabled-tools', 'add',
      '--disabled-tools', 'get-args',
      'bun', 'run', fixtureServerPath
    ], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    await process.exited;
    
    // Process should exit with non-zero code
    expect(process.exitCode).not.toBe(0);
    
    // Should output error message about mutual exclusivity
    const stderr = await new Response(process.stderr).text();
    expect(stderr).toContain('mutually exclusive');
  });

  test('should reject when --enabled-tools is provided without value', async () => {
    const process = Bun.spawn([
      controllerExecutable,
      '--enabled-tools'
    ], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    await process.exited;
    
    // Process should exit with non-zero code
    expect(process.exitCode).not.toBe(0);
    
    // Should output error message about missing value
    const stderr = await new Response(process.stderr).text();
    expect(stderr).toContain('--enabled-tools requires a value');
  });

  test('should reject when --disabled-tools is provided without value', async () => {
    const process = Bun.spawn([
      controllerExecutable,
      '--disabled-tools'
    ], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    await process.exited;
    
    // Process should exit with non-zero code
    expect(process.exitCode).not.toBe(0);
    
    // Should output error message about missing value
    const stderr = await new Response(process.stderr).text();
    expect(stderr).toContain('--disabled-tools requires a value');
  });

  test('should reject when no target command is provided', async () => {
    const process = Bun.spawn([
      controllerExecutable,
      '--enabled-tools', 'add'
    ], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    await process.exited;
    
    // Process should exit with non-zero code
    expect(process.exitCode).not.toBe(0);
    
    // Should output error message about missing command
    const stderr = await new Response(process.stderr).text();
    expect(stderr).toContain('No target command specified');
  });

  test('should accept valid --enabled-tools argument', async () => {
    const process = Bun.spawn([
      controllerExecutable,
      '--enabled-tools', 'add,get-args',
      'echo', 'test'
    ], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // Give it a moment to start before killing
    await new Promise(resolve => setTimeout(resolve, 500));
    process.kill();
    await process.exited;

    // Should not immediately fail with argument parsing error
    // (it will fail later when trying to connect to 'echo test' as an MCP server, but that's expected)
    const stderr = await new Response(process.stderr).text();
    expect(stderr).not.toContain('mutually exclusive');
    expect(stderr).not.toContain('requires a value');
    expect(stderr).not.toContain('No target command specified');
  });

  test('should accept valid --disabled-tools argument', async () => {
    const process = Bun.spawn([
      controllerExecutable,
      '--disabled-tools', 'dangerous-tool',
      'echo', 'test'
    ], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // Give it a moment to start before killing
    await new Promise(resolve => setTimeout(resolve, 500));
    process.kill();
    await process.exited;

    // Should not immediately fail with argument parsing error
    const stderr = await new Response(process.stderr).text();
    expect(stderr).not.toContain('mutually exclusive');
    expect(stderr).not.toContain('requires a value');
    expect(stderr).not.toContain('No target command specified');
  });
});