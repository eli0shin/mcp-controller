#!/usr/bin/env bun

import { McpProxyServer } from './proxy-server.js';
import type { ProxyConfig, Tool } from './types.js';
import { TargetServerManager } from './target-server.js';

function parseListToolsArguments(args: string[]): ProxyConfig {
  if (args.length === 0) {
    process.stderr.write('Error: No target command specified for list-tools\n');
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
    process.stderr.write('Error: No target command specified for list-tools\n');
    process.exit(1);
  }

  return {
    targetCommand,
    enabledTools,
    disabledTools,
    serverName: 'mcp-controller',
    serverVersion: '0.1.0',
    mode: 'list-tools',
  };
}

function parseArguments(): ProxyConfig {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    process.stderr.write('Usage: mcp-controller [--enabled-tools <tool1,tool2,...>] [--disabled-tools <tool1,tool2,...>] <command> [args...]\n');
    process.stderr.write('       mcp-controller list-tools [--enabled-tools <tool1,tool2,...>] [--disabled-tools <tool1,tool2,...>] <command> [args...]\n');
    process.stderr.write('Example: mcp-controller --enabled-tools add,subtract bun run server.ts\n');
    process.stderr.write('Example: mcp-controller list-tools bun run server.ts\n');
    process.stderr.write('Example: mcp-controller --disabled-tools dangerous-tool bun run server.ts\n');
    process.exit(1);
  }

  // Check if first argument is list-tools
  if (args[0] === 'list-tools') {
    return parseListToolsArguments(args.slice(1));
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
    serverName: 'mcp-controller',
    serverVersion: '0.1.0',
    mode: 'proxy',
  };
}

async function listTools(config: ProxyConfig): Promise<void> {
  const targetManager = new TargetServerManager();
  let targetServer;

  try {
    // Start the target server
    targetServer = await targetManager.startTargetServer(config);
    
    // Send initialize request
    const initializeRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '0.1.0',
        capabilities: {},
        clientInfo: {
          name: config.serverName,
          version: config.serverVersion,
        },
      },
    };

    targetServer.stdin.write(JSON.stringify(initializeRequest) + '\n');

    // Wait for initialize response
    const reader = targetServer.stdout.getReader();
    let buffer = '';
    
    // Read initialize response
    const { value: initValue } = await reader.read();
    if (!initValue) throw new Error('No response from server');
    
    buffer += new TextDecoder().decode(initValue);
    const initLines = buffer.split('\n');
    const initResponse = initLines.find(line => line.trim());
    if (!initResponse) throw new Error('No valid response received');
    
    const parsedInitResponse = JSON.parse(initResponse);
    if (parsedInitResponse.error) {
      throw new Error(`Initialize failed: ${parsedInitResponse.error.message}`);
    }

    // Send tools/list request
    const toolsListRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    };

    targetServer.stdin.write(JSON.stringify(toolsListRequest) + '\n');

    // Read tools/list response
    let toolsBuffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      if (value) {
        toolsBuffer += new TextDecoder().decode(value);
        const lines = toolsBuffer.split('\n');
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line.trim());
              if (response.id === 2) {
                if (response.error) {
                  throw new Error(`Tools list failed: ${response.error.message}`);
                }
                
                // Apply filtering and display tools
                let tools = response.result.tools || [];
                
                if (config.enabledTools) {
                  tools = tools.filter((tool: Tool) => config.enabledTools!.includes(tool.name));
                } else if (config.disabledTools) {
                  tools = tools.filter((tool: Tool) => !config.disabledTools!.includes(tool.name));
                }
                
                // Print tools in the requested format
                for (const tool of tools) {
                  process.stdout.write(`${tool.name}: ${tool.description || 'No description available'}\n`);
                }
                
                return; // Exit successfully
              }
            } catch {
              // Continue reading if this line wasn't valid JSON
              continue;
            }
          }
        }
      }
    }
    
    throw new Error('No tools/list response received');
    
  } catch (error) {
    process.stderr.write(`Error listing tools: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  } finally {
    if (targetManager) {
      await targetManager.stopTargetServer();
    }
  }
}

async function main(): Promise<void> {
  try {
    const config = parseArguments();
    
    if (config.mode === 'list-tools') {
      await listTools(config);
      return;
    }
    
    const proxyServer = new McpProxyServer(config);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      process.stderr.write('\nShutting down controller...\n');
      await proxyServer.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      process.stderr.write('\nShutting down controller...\n');
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