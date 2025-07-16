import { MCPClient } from './src/core/mcp-client.js';
import { ChatInterface } from './src/interfaces/chat-interface.js';
import type {QueryProcessor} from './src/interfaces/query-processor.js';
import type {QueryResult} from './src/config/types.js';
import dotenv from "dotenv";

dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

class MCPQueryProcessor implements QueryProcessor {
  private mcpClient: MCPClient;
  private ready: boolean = false;

  constructor(mcpClient: MCPClient) {
    this.mcpClient = mcpClient;
  }

  public async initialize(configPath?: string): Promise<void> {
    try {
      await this.mcpClient.initializeFromConfig(configPath);
      this.ready = true;
    } catch (error) {
      console.error('Failed to initialize MCP client:', error);
      this.ready = false;
      throw error;
    }
  }

  public async processQuery(query: string): Promise<QueryResult> {
    if (!this.ready) {
      return {
        success: false,
        error: 'MCP client not initialized',
      };
    }

    return await this.mcpClient.processQuery(query);
  }

  public isReady(): boolean {
    return this.ready;
  }

  public getStatus(): string {
    if (!this.ready) {
      return 'Not initialized';
    }

    const health = this.mcpClient.getServerHealth();
    const connectedServers = this.mcpClient.getConnectedServers();
    
    return `Connected to ${health.connected}/${health.total} servers: ${connectedServers.join(', ')}`;
  }

  public async cleanup(): Promise<void> {
    await this.mcpClient.cleanup();
    this.ready = false;
  }
}

async function main() {
  const configPath = process.argv[2] || 'config.json';
  
  console.log(`🚀 Starting MCP Multi-Server Client...`);
  console.log(`📁 Using config: ${configPath}`);

  const mcpClient = new MCPClient(ANTHROPIC_API_KEY as string);
  const processor = new MCPQueryProcessor(mcpClient);
  const chatInterface = new ChatInterface(processor);

  try {
    await processor.initialize(configPath);
    console.log('✅ Initialization complete');
    
    await chatInterface.start();
  } catch (error) {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  } finally {
    await processor.cleanup();
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

main().catch(console.error);