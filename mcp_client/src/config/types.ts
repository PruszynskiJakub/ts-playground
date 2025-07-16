export interface MCPServerConfig {
  command: string;
  args: string[];
  description?: string;
}

export interface MCPServersConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

export interface ServerConnection {
  name: string;
  config: MCPServerConfig;
  connected: boolean;
  tools: any[];
  lastError?: string;
}

export interface QueryResult {
  success: boolean;
  response?: string;
  error?: string;
  serverName?: string;
  toolsUsed?: string[];
}