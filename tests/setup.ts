import { beforeAll } from 'bun:test';

beforeAll(async () => {
  // Build the executable before running tests
  console.log('Building mcp-proxy executable...');
  
  const buildProcess = Bun.spawn(['bun', 'run', 'build'], {
    stdout: 'inherit',
    stderr: 'inherit',
  });
  
  const exitCode = await buildProcess.exited;
  if (exitCode !== 0) {
    throw new Error(`Build failed with exit code ${exitCode}`);
  }
  
  console.log('Build complete. Running tests...');
});