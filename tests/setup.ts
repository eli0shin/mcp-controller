import { beforeAll } from 'bun:test';

beforeAll(async () => {
  // Build the executable before running tests
  process.stderr.write('Building mcp-controller executable...\n');

  const buildProcess = Bun.spawn(['bun', 'run', 'build'], {
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const exitCode = await buildProcess.exited;
  if (exitCode !== 0) {
    throw new Error(`Build failed with exit code ${exitCode}`);
  }

  process.stderr.write('Build complete. Running tests...\n');
});