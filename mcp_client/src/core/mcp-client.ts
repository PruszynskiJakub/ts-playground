import { Anthropic } from "@anthropic-ai/sdk";
import type {
  MessageParam,
  Tool,
} from "@anthropic-ai/sdk/resources/messages/messages.mjs";

import { ConfigLoader } from '../config/loader.js';
import { ServerRegistry } from './server-registry.js';
import { MCPServersConfig, QueryResult } from '../config/types.js';

export class MCPClient {
  private anthropic: Anthropic;
  private serverRegistry: ServerRegistry;
  private configLoader: ConfigLoader;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey,
    });
    this.serverRegistry = new ServerRegistry();
    this.configLoader = ConfigLoader.getInstance();
  }

  public async initializeFromConfig(configPath: string = 'config.json'): Promise<void> {
    try {
      const config = this.configLoader.loadConfig(configPath);
      await this.connectToServers(config);
    } catch (error) {
      console.error('Failed to initialize from config:', error);
      throw error;
    }
  }

  private async connectToServers(config: MCPServersConfig): Promise<void> {
    const serverNames = Object.keys(config.mcpServers);
    const connectionPromises = serverNames.map(async (name) => {
      try {
        await this.serverRegistry.connectServer(name, config.mcpServers[name]);
      } catch (error) {
        console.warn(`Failed to connect to server '${name}', continuing with others...`);
      }
    });

    await Promise.allSettled(connectionPromises);

    const healthStatus = this.serverRegistry.getHealthStatus();
    console.log(`Connected to ${healthStatus.connected}/${healthStatus.total} servers`);

    if (healthStatus.connected === 0) {
      throw new Error('No servers connected successfully');
    }
  }

  public async processQuery(query: string): Promise<QueryResult> {
    if (!this.serverRegistry.isHealthy()) {
      return {
        success: false,
        error: 'No servers are currently connected',
      };
    }

    try {
      const messages: MessageParam[] = [
        {
          role: "user",
          content: query,
        },
      ];

      const tools = this.serverRegistry.getAllTools();
      
      // Initial Claude API call
      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        messages,
        tools,
      });

      // Process response and handle tool calls
      const finalText = [];
      const toolsUsed: string[] = [];

      for (const content of response.content) {
        if (content.type === "text") {
          finalText.push(content.text);
        } else if (content.type === "tool_use") {
          // Execute tool call
          const toolName = content.name;
          const toolArgs = content.input as { [x: string]: unknown } | undefined;

          try {
            const result = await this.serverRegistry.callTool(toolName, toolArgs);
            toolsUsed.push(toolName);
            
            finalText.push(
              `[Called tool ${toolName} with args ${JSON.stringify(toolArgs)}]`
            );

            // Continue conversation with tool results
            messages.push({
              role: "assistant",
              content: [content], // Include the tool use
            });
            
            messages.push({
              role: "user",
              content: [
                {
                  type: "tool_result",
                  tool_use_id: content.id,
                  content: result.content || JSON.stringify(result),
                },
              ],
            });

            // Get next response from Claude
            const followupResponse = await this.anthropic.messages.create({
              model: "claude-3-5-sonnet-20241022",
              max_tokens: 1000,
              messages,
              tools,
            });

            // Add followup response text
            for (const followupContent of followupResponse.content) {
              if (followupContent.type === "text") {
                finalText.push(followupContent.text);
              }
            }

          } catch (toolError) {
            const errorMessage = toolError instanceof Error ? toolError.message : 'Unknown tool error';
            finalText.push(`[Tool error: ${errorMessage}]`);
            console.error(`Tool execution failed for ${toolName}:`, errorMessage);
          }
        }
      }

      return {
        success: true,
        response: finalText.join("\n"),
        toolsUsed,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  public getConnectedServers(): string[] {
    return this.serverRegistry.getConnectedServers().map(conn => conn.name);
  }

  public getAvailableTools(): Tool[] {
    return this.serverRegistry.getAllTools();
  }

  public getServerHealth(): { total: number; connected: number; failed: number } {
    return this.serverRegistry.getHealthStatus();
  }

  public async cleanup(): Promise<void> {
    await this.serverRegistry.disconnectAll();
  }
}