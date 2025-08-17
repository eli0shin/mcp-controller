#!/usr/bin/env bun

import { McpProxyServer } from './proxy-server.js';
import type { ProxyConfig } from './types.js';

function parseArguments(): ProxyConfig {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    process.stderr.write('Usage: mcp-proxy <command> [args...]\n');
    process.stderr.write('Example: mcp-proxy bun run server.ts\n');
    process.exit(1);
  }

  return {
    targetCommand: args,
    serverName: 'mcp-proxy',
    serverVersion: '0.1.0',
  };
}

async function main(): Promise<void> {
  try {
    const config = parseArguments();
    
    const proxyServer = new McpProxyServer(config);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      process.stderr.write('\nShutting down proxy server...\n');
      await proxyServer.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      process.stderr.write('\nShutting down proxy server...\n');
      await proxyServer.stop();
      process.exit(0);
    });

    await proxyServer.start();
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

// Only run if this is the main module
if (import.meta.main) {
  void main();
}