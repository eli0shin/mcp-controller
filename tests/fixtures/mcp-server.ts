import {
  McpServer,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Parse command line arguments (both positional and named)
const args = process.argv.slice(2);

// Parse positional arguments
const serverArg1 = args[0] || 'default-arg1';
const serverArg2 = args[1] || 'default-arg2';

// Parse named arguments
let namedArg1 = 'default-named-1';
let namedArg2 = 'default-named-2';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--named-1' && i + 1 < args.length) {
    namedArg1 = args[i + 1];
  }
  if (args[i] === '--named-2' && i + 1 < args.length) {
    namedArg2 = args[i + 1];
  }
}

// Create an MCP server
const server = new McpServer({
  name: 'demo-server',
  version: '1.0.0',
});

// Add an addition tool
server.registerTool(
  'add',
  {
    title: 'Addition Tool',
    description: 'Add two numbers',
    inputSchema: { a: z.number(), b: z.number() },
  },
  async ({ a, b }) => ({
    content: [{ type: 'text', text: String(a + b) }],
  })
);

// Add a tool that returns the initialization arguments
server.registerTool(
  'get-args',
  {
    title: 'Get Arguments Tool',
    description: 'Returns the command line arguments passed to the server',
    inputSchema: {},
  },
  async () => ({
    content: [{ 
      type: 'text', 
      text: JSON.stringify({ 
        arg1: serverArg1, 
        arg2: serverArg2,
        namedArg1: namedArg1,
        namedArg2: namedArg2
      }) 
    }],
  })
);

// Add a static resource that will show up in lists
server.registerResource(
  'static-greeting',
  'greeting://static',
  {
    title: 'Static Greeting',
    description: 'A static greeting message',
  },
  async () => ({
    contents: [
      {
        uri: 'greeting://static',
        text: 'Hello, World!',
      },
    ],
  })
);

// Add a dynamic greeting resource template
server.registerResource(
  'greeting',
  new ResourceTemplate('greeting://{name}', { list: undefined }),
  {
    title: 'Greeting Resource', // Display name for UI
    description: 'Dynamic greeting generator',
  },
  async (uri, { name }) => ({
    contents: [
      {
        uri: uri.href,
        text: `Hello, ${name}!`,
      },
    ],
  })
);

// Add a prompt for generating greetings
server.registerPrompt(
  'generate-greeting',
  {
    title: 'Greeting Generator',
    description: 'Generate a personalized greeting message',
    argsSchema: { name: z.string() },
  },
  async ({ name }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Generate a friendly greeting message for someone named ${name}.`,
        },
      },
    ],
  })
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
