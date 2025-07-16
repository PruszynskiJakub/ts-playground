import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Tool } from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import type {MCPServerConfig, ServerConnection} from '../config/types.js';

export class ServerRegistry {
  private connections: Map<string, ServerConnection> = new Map();
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, StdioClientTransport> = new Map();

  public async connectServer(name: string, config: MCPServerConfig): Promise<void> {
    try {
      // Create MCP client
      const client = new Client({ 
        name: `mcp-client-${name}`, 
        version: "1.0.0" 
      });

      // Create transport
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
      });

      // Connect to server
      await client.connect(transport);

      // Get available tools
      const toolsResult = await client.listTools();
      const tools = toolsResult.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      }));

      // Store connection info
      const connection: ServerConnection = {
        name,
        config,
        connected: true,
        tools,
      };

      this.connections.set(name, connection);
      this.clients.set(name, client);
      this.transports.set(name, transport);

      console.log(`Connected to server '${name}' with ${tools.length} tools:`, 
        tools.map(t => t.name).join(', '));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to connect to server '${name}':`, errorMessage);
      
      // Store failed connection
      const connection: ServerConnection = {
        name,
        config,
        connected: false,
        tools: [],
        lastError: errorMessage,
      };
      
      this.connections.set(name, connection);
      throw error;
    }
  }

  public async disconnectServer(name: string): Promise<void> {
    const client = this.clients.get(name);
    if (client) {
      await client.close();
      this.clients.delete(name);
    }

    const transport = this.transports.get(name);
    if (transport) {
      this.transports.delete(name);
    }

    const connection = this.connections.get(name);
    if (connection) {
      connection.connected = false;
      this.connections.set(name, connection);
    }
  }

  public async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.keys()).map(name => 
      this.disconnectServer(name)
    );
    await Promise.all(disconnectPromises);
  }

  public getConnection(name: string): ServerConnection | undefined {
    return this.connections.get(name);
  }

  public getConnectedServers(): ServerConnection[] {
    return Array.from(this.connections.values()).filter(conn => conn.connected);
  }

  public getAllConnections(): ServerConnection[] {
    return Array.from(this.connections.values());
  }

  public getClient(name: string): Client | undefined {
    return this.clients.get(name);
  }

  public getAllTools(): Tool[] {
    const allTools: Tool[] = [];
    
    for (const connection of this.getConnectedServers()) {
      for (const tool of connection.tools) {
        // Sanitize server name for tool naming (replace spaces and special chars with underscores)
        const sanitizedServerName = connection.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        allTools.push({
          name: `${sanitizedServerName}_${tool.name}`,
          description: `[${connection.name}] ${tool.description}`,
          input_schema: tool.input_schema,
        });
      }
    }
    
    return allTools;
  }

  public getToolsByServer(serverName: string): Tool[] {
    const connection = this.getConnection(serverName);
    if (!connection || !connection.connected) {
      return [];
    }
    
    const sanitizedServerName = serverName.replace(/[^a-zA-Z0-9_-]/g, '_');
    return connection.tools.map(tool => ({
      name: `${sanitizedServerName}_${tool.name}`,
      description: `[${serverName}] ${tool.description}`,
      input_schema: tool.input_schema,
    }));
  }

  public findServerForTool(toolName: string): string | undefined {
    // Handle prefixed tool names (sanitizedServerName_toolName)
    if (toolName.includes('_')) {
      const parts = toolName.split('_');
      if (parts.length >= 2) {
        const possibleServerName = parts[0];
        // Find the actual server name by matching the sanitized name
        for (const connection of this.getConnectedServers()) {
          const sanitizedServerName = connection.name.replace(/[^a-zA-Z0-9_-]/g, '_');
          if (sanitizedServerName === possibleServerName) {
            return connection.name;
          }
        }
      }
    }

    // Search for tool across all servers by original tool name
    const actualToolName = toolName.includes('_') ? toolName.split('_').slice(1).join('_') : toolName;
    for (const connection of this.getConnectedServers()) {
      if (connection.tools.some(tool => tool.name === actualToolName)) {
        return connection.name;
      }
    }

    return undefined;
  }

  public findBestServerForQuery(query: string): string | undefined {
    const queryLower = query.toLowerCase();
    const connectedServers = this.getConnectedServers();
    
    // Score servers based on relevance to the query
    const serverScores = connectedServers.map(server => {
      let score = 0;
      
      // Score based on server name relevance
      if (queryLower.includes(server.name.toLowerCase())) {
        score += 10;
      }
      
      // Score based on available tools
      for (const tool of server.tools) {
        if (queryLower.includes(tool.name.toLowerCase())) {
          score += 5;
        }
        
        // Score based on tool description keywords
        const toolDesc = tool.description?.toLowerCase() || '';
        if (toolDesc.includes('calculate') && queryLower.includes('calculate')) score += 3;
        if (toolDesc.includes('video') && queryLower.includes('video')) score += 3;
        if (toolDesc.includes('transcript') && queryLower.includes('transcript')) score += 3;
        if (toolDesc.includes('youtube') && queryLower.includes('youtube')) score += 3;
        if (toolDesc.includes('ollama') && queryLower.includes('ollama')) score += 3;
      }
      
      return { server: server.name, score };
    });
    
    // Sort by score and return the best match
    serverScores.sort((a, b) => b.score - a.score);
    
    return serverScores.length > 0 && serverScores[0].score > 0 
      ? serverScores[0].server 
      : undefined;
  }

  public suggestServersForQuery(query: string): string[] {
    const queryLower = query.toLowerCase();
    const connectedServers = this.getConnectedServers();
    
    const suggestions: string[] = [];
    
    // Basic keyword matching
    if (queryLower.includes('youtube') || queryLower.includes('transcript') || queryLower.includes('video')) {
      const ytServer = connectedServers.find(s => s.name.toLowerCase().includes('youtube'));
      if (ytServer) suggestions.push(ytServer.name);
    }
    
    if (queryLower.includes('calculate') || queryLower.includes('math') || queryLower.includes('compute')) {
      const calcServer = connectedServers.find(s => s.name.toLowerCase().includes('calculator'));
      if (calcServer) suggestions.push(calcServer.name);
    }
    
    if (queryLower.includes('ollama') || queryLower.includes('local') || queryLower.includes('llm')) {
      const ollamaServer = connectedServers.find(s => s.name.toLowerCase().includes('ollama'));
      if (ollamaServer) suggestions.push(ollamaServer.name);
    }
    
    // If no specific suggestions, return all connected servers
    if (suggestions.length === 0) {
      return connectedServers.map(s => s.name);
    }
    
    return suggestions;
  }

  public async callTool(toolName: string, args: any): Promise<any> {
    let serverName: string;
    let actualToolName: string;

    if (toolName.includes('_')) {
      const parts = toolName.split('_');
      if (parts.length >= 2) {
        const possibleServerName = parts[0];
        // Find the actual server name by matching the sanitized name
        let foundServer: string | undefined;
        for (const connection of this.getConnectedServers()) {
          const sanitizedServerName = connection.name.replace(/[^a-zA-Z0-9_-]/g, '_');
          if (sanitizedServerName === possibleServerName) {
            foundServer = connection.name;
            break;
          }
        }
        
        if (foundServer) {
          serverName = foundServer;
          actualToolName = parts.slice(1).join('_');
        } else {
          throw new Error(`Server with sanitized name '${possibleServerName}' not found`);
        }
      } else {
        throw new Error(`Invalid tool name format: ${toolName}`);
      }
    } else {
      const foundServer = this.findServerForTool(toolName);
      if (!foundServer) {
        throw new Error(`Tool '${toolName}' not found in any connected server`);
      }
      serverName = foundServer;
      actualToolName = toolName;
    }

    const client = this.getClient(serverName);
    if (!client) {
      throw new Error(`Server '${serverName}' not connected`);
    }

    return await client.callTool({
      name: actualToolName,
      arguments: args,
    });
  }

  public isHealthy(): boolean {
    const connectedServers = this.getConnectedServers();
    return connectedServers.length > 0;
  }

  public getHealthStatus(): { total: number; connected: number; failed: number } {
    const allConnections = this.getAllConnections();
    const connected = allConnections.filter(c => c.connected).length;
    const failed = allConnections.length - connected;
    
    return {
      total: allConnections.length,
      connected,
      failed,
    };
  }
}