import { test, describe, expect, beforeEach, afterEach, mock } from 'bun:test';
import { join } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { runUpdaterWorker } from '../src/updater-worker.js';
import { replaceBinary } from '../src/update.js';
import { writeUpdateState } from '../src/update-state.js';
import type { WorkerDeps } from '../src/updater-worker.js';

const FIXED_TIMESTAMP = 1_700_000_000_000;

let tempDir: string;
let originalArgv: string[];
let originalDateNow: typeof Date.now;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'updater-worker-test-'));
  originalArgv = process.argv;
  originalDateNow = Date.now;
  Date.now = () => FIXED_TIMESTAMP;
});

afterEach(async () => {
  process.argv = originalArgv;
  Date.now = originalDateNow;
  await rm(tempDir, { recursive: true, force: true });
});

function createWorkerDeps(overrides: Partial<WorkerDeps> = {}): WorkerDeps {
  const statePath = join(tempDir, 'update-state.json');

  return {
    fetchLatestVersion: mock(async () => ({
      success: true as const,
      data: { version: '2.0.0', downloadUrl: 'https://example.com/binary' },
    })),
    downloadBinary: mock(async () => {
      const tempBinaryPath = join(tempDir, 'downloaded-binary');
      await Bun.write(tempBinaryPath, 'new-content');
      return {
        success: true as const,
        data: tempBinaryPath,
      };
    }),
    replaceBinary,
    writeUpdateState,
    getUpdateStatePath: () => statePath,
    ...overrides,
  };
}

async function readStateFile(statePath: string): Promise<unknown> {
  const stateText = await Bun.file(statePath).text();
  return JSON.parse(stateText);
}

describe('runUpdaterWorker', () => {
  test('returns early without writing state when args are missing', async () => {
    process.argv = ['bun', 'script', '--update-worker'];
    const deps = createWorkerDeps();

    await runUpdaterWorker(deps);

    const stateExists = await Bun.file(deps.getUpdateStatePath()).exists();
    expect(stateExists).toBe(false);
  });

  test('replaces the binary and writes update state when a newer version exists', async () => {
    const binaryPath = join(tempDir, 'mcp-controller');
    await Bun.write(binaryPath, 'old-content');

    process.argv = [
      'bun',
      'script',
      '--update-worker',
      '1.0.0',
      binaryPath,
      'auto',
    ];

    await runUpdaterWorker(createWorkerDeps());

    const binaryContent = await Bun.file(binaryPath).text();
    const stateContent = await readStateFile(
      join(tempDir, 'update-state.json')
    );

    expect(binaryContent).toBe('new-content');
    expect(stateContent).toEqual({
      lastCheckedAt: FIXED_TIMESTAMP,
    });
  });

  test('keeps the current binary and still writes state when already up to date', async () => {
    const binaryPath = join(tempDir, 'mcp-controller');
    await Bun.write(binaryPath, 'current-content');

    process.argv = [
      'bun',
      'script',
      '--update-worker',
      '3.0.0',
      binaryPath,
      'auto',
    ];

    await runUpdaterWorker(createWorkerDeps());

    const binaryContent = await Bun.file(binaryPath).text();
    const stateContent = await readStateFile(
      join(tempDir, 'update-state.json')
    );

    expect(binaryContent).toBe('current-content');
    expect(stateContent).toEqual({
      lastCheckedAt: FIXED_TIMESTAMP,
    });
  });

  test('skips prerelease updates and writes state without replacing the binary', async () => {
    const binaryPath = join(tempDir, 'mcp-controller');
    await Bun.write(binaryPath, 'stable-content');

    process.argv = [
      'bun',
      'script',
      '--update-worker',
      '1.0.0',
      binaryPath,
      'auto',
    ];

    await runUpdaterWorker(
      createWorkerDeps({
        fetchLatestVersion: mock(async () => ({
          success: true as const,
          data: {
            version: '2.0.0-beta.1',
            downloadUrl: 'https://example.com/binary',
          },
        })),
      })
    );

    const binaryContent = await Bun.file(binaryPath).text();
    const stateContent = await readStateFile(
      join(tempDir, 'update-state.json')
    );

    expect(binaryContent).toBe('stable-content');
    expect(stateContent).toEqual({
      lastCheckedAt: FIXED_TIMESTAMP,
    });
  });
});
