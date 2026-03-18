import { dirname } from 'node:path';
import {
  fetchLatestVersion,
  isNewerVersion,
  isPrerelease,
  downloadBinary,
  replaceBinary,
} from './update.js';
import { getUpdateStatePath, writeUpdateState } from './update-state.js';
import type { UpdateState } from './update-types.js';

export type WorkerDeps = {
  fetchLatestVersion: typeof fetchLatestVersion;
  downloadBinary: typeof downloadBinary;
  replaceBinary: typeof replaceBinary;
  writeUpdateState: typeof writeUpdateState;
  getUpdateStatePath: typeof getUpdateStatePath;
};

const defaultDeps = {
  fetchLatestVersion,
  downloadBinary,
  replaceBinary,
  writeUpdateState,
  getUpdateStatePath,
} satisfies WorkerDeps;

export async function runUpdaterWorker(
  deps: WorkerDeps = defaultDeps
): Promise<void> {
  const [currentVersion, binaryPath] = process.argv.slice(3);

  if (!currentVersion || !binaryPath) {
    return;
  }

  const statePath = deps.getUpdateStatePath();

  try {
    const releaseResult = await deps.fetchLatestVersion();
    if (!releaseResult.success) {
      return;
    }

    const { version: latestVersion, downloadUrl } = releaseResult.data;

    if (isPrerelease(latestVersion)) {
      await updateTimestamp(statePath, deps);
      return;
    }

    if (!isNewerVersion(currentVersion, latestVersion)) {
      await updateTimestamp(statePath, deps);
      return;
    }

    const binaryDir = dirname(binaryPath);
    const downloadResult = await deps.downloadBinary(downloadUrl, binaryDir);
    if (!downloadResult.success) {
      await updateTimestamp(statePath, deps);
      return;
    }

    const replaceResult = await deps.replaceBinary(
      downloadResult.data,
      binaryPath
    );
    if (!replaceResult.success) {
      await updateTimestamp(statePath, deps);
      return;
    }

    await updateTimestamp(statePath, deps);
  } catch {}
}

async function updateTimestamp(
  statePath: string,
  deps: WorkerDeps
): Promise<void> {
  const state = {
    lastCheckedAt: Date.now(),
  } satisfies UpdateState;
  await deps.writeUpdateState(statePath, state);
}
