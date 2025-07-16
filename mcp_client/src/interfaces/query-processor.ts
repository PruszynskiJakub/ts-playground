import { QueryResult } from '../config/types.js';

export interface QueryProcessor {
  processQuery(query: string): Promise<QueryResult>;
  isReady(): boolean;
  getStatus(): string;
}