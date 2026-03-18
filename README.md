# MCP Controller

A Model Context Protocol (MCP) server that acts as a proxy between MCP clients and target MCP servers, with **tool filtering** capabilities to control which tools are exposed to clients.

## Key Features

- **🔧 Tool Filtering**: Selectively enable or disable specific tools from target MCP servers
- **🔍 Transparent Proxying**: Forwards all other MCP protocol messages without modification
- **⚡ Zero Configuration**: Works with any existing MCP server without changes
- **🛡️ Access Control**: Control which tools clients can access for security and usability
- **📦 Command Line Interface**: Start any MCP server through command arguments
- **🔄 Graceful Shutdown**: Handles SIGINT/SIGTERM signals to clean up processes
- **📝 TypeScript**: Full type safety with modern ES modules

## Installation

```bash
curl -fsSL https://raw.githubusercontent.com/eli0shin/mcp-controller/main/install.sh | bash
```

Or install via npm:

```bash
npm install -g mcp-controller
```

## Usage

### Basic Proxying (No Filtering)

```bash
# Proxy to a local MCP server
mcp-controller bun run my-server.ts

# Proxy to an npm-distributed MCP server
mcp-controller @modelcontextprotocol/server-sequential-thinking

# Proxy to a Python MCP server
mcp-controller python -m my_mcp_server

# Proxy to any executable MCP server
mcp-controller node server.js --port 3000
```

### Tool Filtering

Control which tools from the target server are exposed to clients:

```bash
# Only allow specific tools (whitelist mode)
mcp-controller --enabled-tools file-read,file-write,search bun run my-server.ts

# Block specific tools (blacklist mode)
mcp-controller --disabled-tools dangerous-tool,admin-commands python -m my_server

# Multiple tools (comma-separated, no spaces around commas)
mcp-controller --enabled-tools tool1,tool2,tool3 node server.js
```

### Filtering Rules

- **`--enabled-tools`**: Only the specified tools will be available to clients (whitelist)
- **`--disabled-tools`**: All tools except the specified ones will be available (blacklist)
- **Mutually Exclusive**: You can use either `--enabled-tools` OR `--disabled-tools`, but not both
- **Case Sensitive**: Tool names must match exactly as defined in the target server
- **No Spaces**: Use comma-separated values without spaces: `tool1,tool2,tool3`

## Use Cases

### Security & Access Control

```bash
# Production environment - only allow safe read-only tools
mcp-controller --enabled-tools read-file,search,list-files my-server

# Development environment - block dangerous operations
mcp-controller --disabled-tools delete-file,format-disk,restart-system my-server
```

### Client-Specific Customization

```bash
# For a documentation client - only text processing tools
mcp-controller --enabled-tools text-search,summarize,translate content-server

# For an admin interface - block user-facing tools
mcp-controller --disabled-tools user-chat,send-email,post-social admin-server
```

### Testing & Development

```bash
# Test specific functionality by isolating tools
mcp-controller --enabled-tools database-query,cache-get test-server

# Debug by excluding problematic tools
mcp-controller --disabled-tools flaky-api,slow-process debug-server
```

## How it Works

1. **Process Management**: The proxy accepts command arguments and spawns the target MCP server process
2. **Message Interception**: All JSON-RPC messages flow through the proxy bidirectionally
3. **Tool Filtering**: When clients request `tools/list`, the proxy filters the response based on your configuration
4. **Transparent Forwarding**: All other messages (resources, prompts, tool calls, etc.) pass through unchanged
5. **Lifecycle Management**: The proxy handles process cleanup and graceful shutdown

## Architecture

```
MCP Client ↔ MCP Controller ↔ Target MCP Server
             (Tool Filtering)
```

### Message Flow

1. **Client → Controller → Target**: All requests forwarded transparently
2. **Target → Controller → Client**:
   - `tools/list` responses are filtered based on configuration
   - All other responses pass through unchanged

### What Gets Filtered

- ✅ **`tools/list` responses** - Tool arrays are filtered according to your settings
- ❌ **Tool calls** - Individual tool invocations pass through (filtered tools simply won't be available)
- ❌ **Resources** - Resource lists and access remain unchanged
- ❌ **Prompts** - Prompt functionality unaffected
- ❌ **Other messages** - Initialization, capabilities, etc. pass through

## CLI Reference

```bash
Usage: mcp-controller [--enabled-tools <tool1,tool2,...>] [--disabled-tools <tool1,tool2,...>] <command> [args...]

       mcp-controller update

Options:
  --enabled-tools <tools>    Comma-separated list of tools to allow (whitelist mode)
  --disabled-tools <tools>   Comma-separated list of tools to block (blacklist mode)

Examples:
  mcp-controller bun run server.ts                              # No filtering
  mcp-controller --enabled-tools read,write bun run server.ts   # Only allow read,write
  mcp-controller --disabled-tools delete python -m server       # Block delete tool
```

## Error Handling

The controller validates arguments at startup and will exit with helpful error messages:

```bash
# Missing command
$ mcp-controller --enabled-tools read
Error: No target command specified

# Both filtering modes
$ mcp-controller --enabled-tools read --disabled-tools write bun server.ts
Error: --enabled-tools and --disabled-tools are mutually exclusive

# Missing tool list
$ mcp-controller --enabled-tools bun server.ts
Error: --enabled-tools requires a value
```

## Development

```bash
# Install dependencies
bun install

# Build release binaries
bun run build

# Run via wrapper against the local release build
./bin/mcp-controller bun run tests/fixtures/mcp-server.ts

# Run in development mode
bun run dev <target-command>

# Run tests (includes tool filtering tests)
bun test

# Update installed binary from GitHub Releases
mcp-controller update

# Lint and format
bun run lint
bun run format

# Type check
bun run typecheck
```

## License

MIT
