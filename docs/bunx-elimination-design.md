# Eliminating Redundant bunx Usage with BUN_BE_BUN

## Problem

Currently, using this MCP controller with MCP servers requires redundant `bunx` calls:

```bash
bunx mcp-controller bunx @some/mcp-server  # Redundant bunx
```

This is clunky and unnecessary since many MCP servers are npm packages that work with `bunx`.

## Solution

Use Bun's `BUN_BE_BUN=1` environment variable to make our compiled executable behave like `bun x` (bunx).

## How It Works

When `BUN_BE_BUN=1` is set, a compiled Bun executable ignores its bundled code and acts like the `bun` CLI. Combined with the `x` command, this gives us `bunx` functionality.

**User runs:**
```bash
bunx mcp-controller some-mcp-server
```

**We internally execute:**
```bash
BUN_BE_BUN=1 ./mcp-controller x some-mcp-server
```

**Which behaves like:**
```bash
bunx some-mcp-server
```

## Implementation

Change `src/target-server.ts` line 11-17 from:

```typescript
const [command, ...args] = config.targetCommand;
const process = Bun.spawn([command, ...args], {
  stdin: 'pipe',
  stdout: 'pipe',
  stderr: 'inherit',
});
```

To:

```typescript
const process = Bun.spawn([process.execPath, "x", ...config.targetCommand], {
  stdin: 'pipe',
  stdout: 'pipe',
  stderr: 'inherit',
  env: {
    ...process.env,
    BUN_BE_BUN: "1"
  }
});
```

## Benefits

1. **Clean UX**: `bunx mcp-controller server-name` instead of `bunx mcp-controller bunx server-name`
2. **Universal**: Works for npm packages, Docker commands, local scripts - anything `bunx` supports
3. **Fast**: Leverages Bun's global caching and 100x speed improvement over npx
4. **Simple**: Single line change, leverages existing Bun functionality

## Usage Examples

```bash
# npm packages
bunx mcp-controller @some/mcp-server

# Docker
bunx mcp-controller docker run --rm some-image

# Local scripts  
bunx mcp-controller ./local-server.ts

# Any CLI tool
bunx mcp-controller python server.py
```

All work exactly like `bunx` would, but proxied through our controller.