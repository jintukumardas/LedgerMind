import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema 
} from '@modelcontextprotocol/sdk/types.js';
import { tools, toolHandlers, ToolName } from './tools/index.js';
import { config } from './config.js';

class MCPServer {
  private server: Server;

  constructor() {
    this.server = new Server({
      name: 'ledgermind-payments',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: tools,
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      if (!(name in toolHandlers)) {
        throw new Error(`Unknown tool: ${name}`);
      }

      try {
        const handler = toolHandlers[name as ToolName];
        const result = await handler(args || {});
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error(`Error handling tool ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start(): Promise<void> {
    // Connect stdio transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('LedgerMind MCP Server started');
    console.error(`Chain ID: ${config.chainId}`);
    console.error(`Factory Address: ${config.factoryAddress}`);
    console.error(`USDC Address: ${config.usdcAddress}`);
    console.error(`Available tools: ${tools.map(t => t.name).join(', ')}`);
  }
}

// Start the server
const server = new MCPServer();
server.start().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});