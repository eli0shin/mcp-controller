import { beforeAll } from 'bun:test';

beforeAll(async () => {
  process.stderr.write('Building mcp-controller test binary...\n');

  const buildProcess = Bun.spawn(
    [
      'bun',
      'build',
      'src/cli.ts',
      '--compile',
      '--outfile',
      './bin/mcp-controller-downloaded',
    ],
    {
      stdout: 'inherit',
      stderr: 'inherit',
    }
  );

  const exitCode = await buildProcess.exited;
  if (exitCode !== 0) {
    throw new Error(`Build failed with exit code ${exitCode}`);
  }

  await Bun.spawn(['chmod', '+x', './bin/mcp-controller'], {
    stdout: 'inherit',
    stderr: 'inherit',
  }).exited;

  await Bun.spawn(['chmod', '+x', './bin/mcp-controller-downloaded'], {
    stdout: 'inherit',
    stderr: 'inherit',
  }).exited;

  process.stderr.write('Build complete. Running tests...\n');
});
