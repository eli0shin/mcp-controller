#!/usr/bin/env bun

import { McpProxyServer } from './proxy-server.js';
import type { ProxyConfig } from './types.js';

function parseArguments(): ProxyConfig {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    process.stderr.write('Usage: mcp-proxy [--enabled-tools <tool1,tool2,...>] [--disabled-tools <tool1,tool2,...>] <command> [args...]\n');
    process.stderr.write('Example: mcp-proxy --enabled-tools add,subtract bun run server.ts\n');
    process.stderr.write('Example: mcp-proxy --disabled-tools dangerous-tool bun run server.ts\n');
    process.exit(1);
  }

  let enabledTools: string[] | undefined;
  let disabledTools: string[] | undefined;
  const targetCommand: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--enabled-tools') {
      if (i + 1 >= args.length) {
        process.stderr.write('Error: --enabled-tools requires a value\n');
        process.exit(1);
      }
      if (disabledTools !== undefined) {
        process.stderr.write('Error: --enabled-tools and --disabled-tools are mutually exclusive\n');
        process.exit(1);
      }
      enabledTools = args[i + 1].split(',').map(tool => tool.trim()).filter(tool => tool.length > 0);
      i++; // Skip the value argument
    } else if (arg === '--disabled-tools') {
      if (i + 1 >= args.length) {
        process.stderr.write('Error: --disabled-tools requires a value\n');
        process.exit(1);
      }
      if (enabledTools !== undefined) {
        process.stderr.write('Error: --enabled-tools and --disabled-tools are mutually exclusive\n');
        process.exit(1);
      }
      disabledTools = args[i + 1].split(',').map(tool => tool.trim()).filter(tool => tool.length > 0);
      i++; // Skip the value argument
    } else {
      targetCommand.push(arg);
    }
  }

  if (targetCommand.length === 0) {
    process.stderr.write('Error: No target command specified\n');
    process.exit(1);
  }

  return {
    targetCommand,
    enabledTools,
    disabledTools,
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