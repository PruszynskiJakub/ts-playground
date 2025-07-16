import { readFileSync } from 'fs';
import { resolve } from 'path';
import { MCPServersConfig, MCPServerConfig } from './types.js';

export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: MCPServersConfig | null = null;

  private constructor() {}

  public static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  public loadConfig(configPath: string = 'config.json'): MCPServersConfig {
    try {
      const fullPath = resolve(configPath);
      const configData = readFileSync(fullPath, 'utf8');
      const parsed = JSON.parse(configData) as MCPServersConfig;
      
      this.validateConfig(parsed);
      this.config = parsed;
      
      return parsed;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load config from ${configPath}: ${error.message}`);
      }
      throw new Error(`Failed to load config from ${configPath}: Unknown error`);
    }
  }

  public getConfig(): MCPServersConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  public getServerNames(): string[] {
    const config = this.getConfig();
    return Object.keys(config.mcpServers);
  }

  public getServerConfig(name: string): MCPServerConfig {
    const config = this.getConfig();
    const serverConfig = config.mcpServers[name];
    
    if (!serverConfig) {
      throw new Error(`Server '${name}' not found in configuration`);
    }
    
    return serverConfig;
  }

  private validateConfig(config: any): void {
    if (!config) {
      throw new Error('Configuration is empty');
    }

    if (!config.mcpServers || typeof config.mcpServers !== 'object') {
      throw new Error('Configuration must contain mcpServers object');
    }

    const serverNames = Object.keys(config.mcpServers);
    if (serverNames.length === 0) {
      throw new Error('At least one MCP server must be configured');
    }

    for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
      this.validateServerConfig(name, serverConfig as any);
    }
  }

  private validateServerConfig(name: string, config: any): void {
    if (!config.command || typeof config.command !== 'string') {
      throw new Error(`Server '${name}' must have a valid command string`);
    }

    if (!config.args || !Array.isArray(config.args)) {
      throw new Error(`Server '${name}' must have args array`);
    }

    if (config.args.some((arg: any) => typeof arg !== 'string')) {
      throw new Error(`Server '${name}' args must be an array of strings`);
    }
  }
}