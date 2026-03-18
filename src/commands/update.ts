import { dirname } from 'node:path';
import packageJson from '../../package.json' with { type: 'json' };
import {
  fetchLatestVersion,
  isNewerVersion,
  downloadBinary,
  replaceBinary,
} from '../update.js';

export async function runUpdateCommand(): Promise<void> {
  process.stdout.write(`Current version: ${packageJson.version}\n`);
  process.stdout.write('Checking for updates...\n');

  const releaseResult = await fetchLatestVersion();
  if (!releaseResult.success) {
    process.stderr.write(
      `Error checking for updates: ${releaseResult.error}\n`
    );
    process.exit(1);
  }

  const { version: latestVersion, downloadUrl } = releaseResult.data;

  if (!isNewerVersion(packageJson.version, latestVersion)) {
    process.stdout.write(
      `Already on latest version (v${packageJson.version})\n`
    );
    return;
  }

  process.stdout.write(`Updating to v${latestVersion}...\n`);

  const binaryPath = process.execPath;
  const binaryDir = dirname(binaryPath);

  const downloadResult = await downloadBinary(downloadUrl, binaryDir);
  if (!downloadResult.success) {
    process.stderr.write(`Error downloading update: ${downloadResult.error}\n`);
    process.exit(1);
  }

  const replaceResult = await replaceBinary(downloadResult.data, binaryPath);
  if (!replaceResult.success) {
    process.stderr.write(`Error installing update: ${replaceResult.error}\n`);
    process.exit(1);
  }

  process.stdout.write(`Updated to v${latestVersion}\n`);
}
