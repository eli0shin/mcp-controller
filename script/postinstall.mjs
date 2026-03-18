#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const REPO = 'eli0shin/mcp-controller';

function shouldSkipPostinstall() {
  const packageRoot = path.join(__dirname, '..');
  const srcDir = path.join(packageRoot, 'src');
  if (fs.existsSync(srcDir)) {
    console.log('Skipping postinstall (running from source)');
    return true;
  }
  return false;
}

function detectPlatformAndArch() {
  let platform;
  switch (os.platform()) {
    case 'darwin':
      platform = 'darwin';
      break;
    case 'linux':
      platform = 'linux';
      break;
    case 'win32':
      platform = 'windows';
      break;
    default:
      platform = os.platform();
  }

  let arch;
  switch (os.arch()) {
    case 'x64':
      arch = 'x64';
      break;
    case 'arm64':
      arch = 'arm64';
      break;
    default:
      arch = os.arch();
  }

  return { platform, arch };
}

function getDownloadedBinaryPath() {
  const { platform } = detectPlatformAndArch();
  const binary =
    platform === 'windows'
      ? 'mcp-controller-downloaded.exe'
      : 'mcp-controller-downloaded';
  return path.join(__dirname, '..', 'bin', binary);
}

async function downloadLatestBinary() {
  const { platform, arch } = detectPlatformAndArch();
  const asset =
    platform === 'windows'
      ? `mcp-controller-${platform}-${arch}.exe`
      : `mcp-controller-${platform}-${arch}`;
  const url = `https://github.com/${REPO}/releases/latest/download/${asset}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'mcp-controller',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }

  const targetPath = getDownloadedBinaryPath();
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));

  if (platform !== 'windows') {
    fs.chmodSync(targetPath, 0o755);
  }

  console.log(`Downloaded binary: ${targetPath}`);
}

async function regenerateWindowsCmdWrappers() {
  console.log('Windows + npm: Rebuilding bin links');

  try {
    const { execSync } = require('child_process');
    const pkgPath = path.join(__dirname, '..');

    const isGlobal =
      process.env.npm_config_global === 'true' ||
      pkgPath.includes(path.join('npm', 'node_modules'));

    const cmd = `npm rebuild mcp-controller --ignore-scripts${isGlobal ? ' -g' : ''}`;
    const opts = {
      stdio: 'inherit',
      shell: true,
      ...(isGlobal ? {} : { cwd: path.join(pkgPath, '..', '..') }),
    };

    execSync(cmd, opts);
    console.log('Successfully rebuilt npm bin links');
  } catch (error) {
    console.error('Error rebuilding npm links:', error.message);
  }
}

async function main() {
  if (shouldSkipPostinstall()) {
    return;
  }

  try {
    await downloadLatestBinary();

    if (
      os.platform() === 'win32' &&
      process.env.npm_config_user_agent?.startsWith('npm')
    ) {
      await regenerateWindowsCmdWrappers();
    }
  } catch (error) {
    console.error('Failed to install release binary:', error.message);
    process.exit(1);
  }
}

try {
  await main();
} catch (error) {
  console.error('Postinstall error:', error.message);
  process.exit(0);
}
