import readline from "readline/promises";
import type {QueryProcessor} from './query-processor.js';
import type {QueryResult} from '../config/types.js';

export class ChatInterface {
  private processor: QueryProcessor;
  private rl: readline.Interface | null = null;

  constructor(processor: QueryProcessor) {
    this.processor = processor;
  }

  public async start(): Promise<void> {
    if (!this.processor.isReady()) {
      console.error('Query processor is not ready:', this.processor.getStatus());
      return;
    }

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      console.log('\n🤖 MCP Multi-Server Client Started!');
      console.log('💡 Type your queries or commands:');
      console.log('   - "quit" or "exit" to exit');
      console.log('   - "status" to check server health');
      console.log('   - "tools" to list available tools');
      console.log('   - "servers" to list connected servers');
      console.log('');

      await this.chatLoop();
    } finally {
      this.cleanup();
    }
  }

  private async chatLoop(): Promise<void> {
    while (true) {
      try {
        const message = await this.rl!.question('💬 You: ');
        
        if (this.isExitCommand(message)) {
          console.log('👋 Goodbye!');
          break;
        }

        if (await this.handleSpecialCommands(message)) {
          continue;
        }

        const result = await this.processor.processQuery(message);
        this.displayResult(result);

      } catch (error) {
        console.error('❌ Error:', error);
      }
    }
  }

  private isExitCommand(message: string): boolean {
    const normalizedMessage = message.toLowerCase().trim();
    return normalizedMessage === 'quit' || normalizedMessage === 'exit';
  }

  private async handleSpecialCommands(message: string): Promise<boolean> {
    const normalizedMessage = message.toLowerCase().trim();

    switch (normalizedMessage) {
      case 'status':
        console.log('📊 Status:', this.processor.getStatus());
        return true;

      case 'tools':
        // This would need to be implemented in the processor interface
        console.log('🔧 Available tools: (Feature not implemented yet)');
        return true;

      case 'servers':
        // This would need to be implemented in the processor interface
        console.log('🖥️  Connected servers: (Feature not implemented yet)');
        return true;

      default:
        return false;
    }
  }

  private displayResult(result: QueryResult): void {
    if (result.success) {
      console.log('🤖 Assistant:', result.response);
      
      if (result.toolsUsed && result.toolsUsed.length > 0) {
        console.log('🔧 Tools used:', result.toolsUsed.join(', '));
      }
      
      if (result.serverName) {
        console.log('🖥️  Server:', result.serverName);
      }
    } else {
      console.error('❌ Error:', result.error);
    }
  }

  private cleanup(): void {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }

  public stop(): void {
    this.cleanup();
  }
}

export interface ChatInterfaceOptions {
  showWelcome?: boolean;
  showCommands?: boolean;
  customPrompt?: string;
}