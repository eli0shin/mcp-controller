# MCP Controller Testing Standards

This document outlines the testing standards and patterns established for the MCP Controller project. All new tests must follow these conventions to maintain consistency and reliability.

## Core Testing Principles

### 1. Complete Object Assertions
- **NEVER use partial assertions** - Always validate the entire response structure
- **NEVER use `expect.any()`, `expect.anything()`, or similar matchers**
- **NEVER use conditional assertions (`if/else` logic in tests)**
- Every test must assert on the complete expected object structure

```typescript
// ❌ BAD - Partial assertion
expect(response.result.tools).toBeDefined();
expect(response.result.tools[0].name).toBe('add');

// ✅ GOOD - Complete object assertion
expect(validatedResponse).toEqual({
  jsonrpc: '2.0',
  id: 2,
  result: {
    tools: [
      {
        name: 'add',
        description: 'Add two numbers',
        inputSchema: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          additionalProperties: false,
          properties: {
            a: { type: 'number' },
            b: { type: 'number' },
          },
          required: ['a', 'b'],
          type: 'object',
        },
      },
    ],
  },
});
```

### 2. Zod Schema Validation
- Use Zod schemas to validate response structure before assertions
- Define complete response schemas, not just result schemas
- Always parse the entire response with Zod before making expectations

```typescript
const ToolCallResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.number(),
  result: z.object({
    content: z.array(z.object({
      type: z.string(),
      text: z.string(),
    })),
  }),
});

// Validate and assert
const validatedResponse = ToolCallResponseSchema.parse(response);
expect(validatedResponse).toEqual({ /* complete expected structure */ });
```

### 3. Integration Test Architecture
- Use real MCP servers, not mocks
- Test full end-to-end scenarios through the controller
- Include command line argument passing tests
- Test both success and error scenarios with complete response validation

## Test File Structure

### Required Imports and Setup
```typescript
import { test, expect, describe, beforeAll, afterAll } from 'bun:test';
import path from 'path';
import { z } from 'zod';
```

### Schema Definitions
Define complete response schemas for each test scenario:

```typescript
const InitializeResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.number(),
  result: z.object({
    protocolVersion: z.string(),
    serverInfo: z.object({
      name: z.string(),
      version: z.string(),
    }),
    capabilities: z.record(z.unknown()),
  }),
});

const ErrorResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.number(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.unknown().optional(),
  }),
});
```

### Test Structure Pattern
```typescript
describe('Feature Tests', () => {
  let process: Bun.Subprocess;
  
  beforeAll(async () => {
    // Setup with real processes, including arguments
    process = Bun.spawn([
      'command', 'args', 
      'positional-arg-1', 'positional-arg-2',
      '--named-arg-1', 'value1',
      '--named-arg-2', 'value2'
    ], {
      stdin: 'pipe',
      stdout: 'pipe', 
      stderr: 'pipe',
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  });
  
  afterAll(async () => {
    if (process) {
      process.kill();
      await process.exited;
    }
  });

  test('should validate complete behavior', async () => {
    const request = { /* complete request object */ };
    const response = await sendMessage(request);
    
    const validatedResponse = ResponseSchema.parse(response);
    expect(validatedResponse).toEqual({
      // Complete expected structure - every field specified
    });
  });
});
```

## Error Handling Tests

Error tests must validate the complete error response structure:

```typescript
test('should handle specific error scenario', async () => {
  const invalidRequest = {
    jsonrpc: '2.0',
    id: 6,
    method: 'invalid/method',
    params: {},
  };

  const response = await sendJsonRpcMessage(invalidRequest);
  
  const validatedResponse = ErrorResponseSchema.parse(response);
  expect(validatedResponse).toEqual({
    jsonrpc: '2.0',
    id: 6,
    error: {
      code: -32601,
      message: 'Method not found',
    },
  });
});
```

## Argument Passing Tests

When testing command line argument passing:

1. **Pass real arguments to processes**
2. **Test both positional and named arguments**
3. **Verify complete argument structures**

```typescript
// In beforeAll
process = Bun.spawn([
  'controller-command',
  'target-command', 'target-args',
  'pos-arg-1', 'pos-arg-2',
  '--named-1', 'named-value-1',
  '--named-2', 'named-value-2'
], { /* options */ });

// In test
expect(validatedResponse).toEqual({
  jsonrpc: '2.0',
  id: 13,
  result: {
    content: [{
      type: 'text',
      text: '{"arg1":"pos-arg-1","arg2":"pos-arg-2","namedArg1":"named-value-1","namedArg2":"named-value-2"}'
    }]
  }
});
```

## Test Naming Conventions

- Use descriptive test names that explain the complete behavior
- Follow pattern: `should [action] [expected outcome] [context]`
- Examples:
  - `should initialize MCP connection through controller`
  - `should pass command line arguments through controller to target server`
  - `should handle invalid tool calls with complete error response`

## Required Test Coverage

Every integration test suite must include:

1. **Connection Lifecycle** - Initialization, capabilities exchange
2. **Tool Operations** - List tools, call tools with various arguments
3. **Resource Operations** - List resources, read resources, templates
4. **Error Scenarios** - Invalid methods, bad arguments, missing resources
5. **Argument Passing** - Verify command line arguments reach target server
6. **Protocol Compliance** - JSON-RPC 2.0 structure validation

## Anti-Patterns to Avoid

### ❌ Never Do This
```typescript
// Partial assertions
expect(response.result).toBeDefined();
expect(response.jsonrpc).toBe('2.0');

// Conditional testing
if (response.error) {
  expect(response.error.code).toBeDefined();
} else {
  expect(response.result).toBeDefined();
}

// Using matchers for exact values
expect(response).toMatchObject({
  id: expect.any(Number),
  result: expect.anything()
});

// Mocking real system components
const mockServer = jest.fn();
```

### ✅ Always Do This
```typescript
// Complete validation with Zod + exact assertion
const validatedResponse = ResponseSchema.parse(response);
expect(validatedResponse).toEqual({
  jsonrpc: '2.0',
  id: 2,
  result: {
    // Every expected field explicitly specified
  }
});

// Deterministic, non-conditional testing
test('should handle specific scenario with exact response', async () => {
  const response = await callSpecificScenario();
  expect(response).toEqual(exactExpectedResponse);
});
```

## Type Safety Requirements

- All response schemas must use Zod with strict typing
- No `any` types in test code
- All test data must be fully typed
- Use proper TypeScript with strict mode enabled

Following these standards ensures tests are:
- **Reliable** - Complete assertions catch regressions
- **Maintainable** - Clear expectations and no hidden assumptions  
- **Comprehensive** - Full system integration testing
- **Deterministic** - No conditional logic or randomness