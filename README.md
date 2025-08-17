# MCP Proxy

A Model Context Protocol (MCP) server that acts as a transparent proxy, forwarding JSON RPC communication between MCP clients and target MCP servers.

## Features

- **Transparent Proxying**: Forwards all MCP protocol messages between clients and target servers
- **Command Line Interface**: Start any MCP server through command arguments
- **Graceful Shutdown**: Handles SIGINT/SIGTERM signals to clean up processes
- **TypeScript**: Full type safety with modern ES modules

## Installation

```bash
bun install
bun run build
```

## Usage

```bash
# Proxy to a local MCP server
./mcp-proxy bun run my-server.ts

# Proxy to a Python MCP server
./mcp-proxy python -m my_mcp_server

# Proxy to any executable MCP server
./mcp-proxy node server.js --port 3000
```

## How it Works

1. The proxy accepts command arguments specifying the target MCP server
2. When a client connects, the proxy spawns the target server process
3. All JSON RPC messages are forwarded bidirectionally between client and target server
4. The proxy handles process lifecycle and cleanup

## Architecture

```
MCP Client ↔ MCP Proxy Server ↔ Target MCP Server
```

The proxy implements the MCP server interface and forwards all requests to the target server, returning responses transparently.

## Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev <target-command>

# Run tests
bun test

# Lint and format
bun run lint
bun run format

# Type check
bun run typecheck
```