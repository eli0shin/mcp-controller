#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function main() {
  if (os.platform() !== 'win32') {
    console.log('Non-Windows platform, skipping preinstall');
    return;
  }

  console.log('Windows: Modifying package.json bin entry');

  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  packageJson.bin = {
    'mcp-controller': './bin/mcp-controller.cmd',
  };

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('Updated package.json bin to use mcp-controller.cmd');

  const unixScript = path.join(__dirname, '..', 'bin', 'mcp-controller');
  if (fs.existsSync(unixScript)) {
    fs.unlinkSync(unixScript);
  }
}

try {
  main();
} catch (error) {
  console.error('Preinstall error:', error.message);
  process.exit(0);
}
