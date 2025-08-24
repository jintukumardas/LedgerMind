import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
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
        resources: {},
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

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'ledgermind://contracts/factory',
            name: 'Payment Intent Factory Contract',
            description: 'Factory contract for creating payment intents on Sei',
            mimeType: 'application/json',
          },
          {
            uri: 'ledgermind://network/status',
            name: 'Sei Network Status',
            description: 'Current status of Sei network and LedgerMind deployment',
            mimeType: 'application/json',
          },
          {
            uri: 'ledgermind://docs/api',
            name: 'API Documentation',
            description: 'Complete API documentation for LedgerMind MCP tools',
            mimeType: 'text/markdown',
          },
        ],
      };
    });

    // Handle resource reads
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      switch (uri) {
        case 'ledgermind://contracts/factory':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  factory_address: config.factoryAddress,
                  usdc_address: config.usdcAddress,
                  network: 'sei-testnet',
                  chain_id: config.chainId,
                  block_time: '400ms',
                  finality: 'instant',
                }, null, 2),
              },
            ],
          };
          
        case 'ledgermind://network/status':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  network: 'Sei EVM Testnet',
                  status: 'operational',
                  chain_id: config.chainId,
                  rpc_url: 'https://evm-rpc-testnet.sei-apis.com',
                  explorer: 'https://seitrace.com',
                  native_token: 'SEI',
                  supported_tokens: ['USDC', 'SEI'],
                  average_gas_price: '0.02 usei',
                  block_time: '400ms',
                }, null, 2),
              },
            ],
          };
          
        case 'ledgermind://docs/api':
          return {
            contents: [
              {
                uri,
                mimeType: 'text/markdown',
                text: `# LedgerMind MCP API Documentation

## Available Tools

### create_intent
Create a new payment intent with spending limits and time bounds.

**Parameters:**
- \`token\`: Token contract address (USDC: ${config.usdcAddress})
- \`agent\`: Agent wallet address
- \`total_cap\`: Maximum total spending amount (in wei)
- \`per_tx_cap\`: Maximum per-transaction amount (in wei)
- \`start\`: Start timestamp (unix)
- \`end\`: End timestamp (unix)
- \`merchants\`: Array of allowed merchant addresses (optional)
- \`metadata_uri\`: Metadata URI (optional)
- \`salt\`: Random salt for deterministic address
- \`deposit_amount\`: Initial deposit amount (in wei, defaults to 1 USDC if not provided)

### execute_payment
Execute a payment through an existing intent.

**Parameters:**
- \`intent_address\`: Payment intent contract address
- \`merchant\`: Recipient address
- \`amount\`: Payment amount (in wei)
- \`receipt_uri\`: Receipt description

### list_intents
List all payment intents for an agent.

**Parameters:**
- \`agent\`: Agent wallet address

### revoke_intent
Revoke an active payment intent.

**Parameters:**
- \`intent_address\`: Payment intent contract address

### top_up_intent
Add funds to an existing payment intent.

**Parameters:**
- \`intent_address\`: Payment intent contract address
- \`amount\`: Amount to add (in wei)

## Network Information
- **Chain**: Sei EVM Testnet
- **Chain ID**: ${config.chainId}
- **Factory**: ${config.factoryAddress}
- **USDC**: ${config.usdcAddress}
- **Explorer**: https://seitrace.com
`,
              },
            ],
          };
          
        default:
          throw new Error(`Resource not found: ${uri}`);
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