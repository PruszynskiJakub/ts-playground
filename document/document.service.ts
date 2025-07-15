import type {Document} from './types.js';
import { randomUUID } from 'crypto';

// Factory function that returns pure functions for document operations
export const createDocumentService = () => {

  // Function to create a document with UUID and metadata
  const document = async (
    text: string, 
    additionalMetadata?: Record<string, any>
  ): Promise<Document> => {
    const baseMetadata = {
      tokens: estimateTokenCount(text),
      ...additionalMetadata
    };

    return {
      uuid: randomUUID(),
      content: text,
      metadata: baseMetadata
    };
  };

  // Function to restore placeholders in document content
  const restorePlaceholders = (doc: Document): Document => {
    // Restore any placeholders in the document content
    return {
      ...doc,
      content: doc.content // Add placeholder restoration logic here
    };
  };

  // Function to split text into document chunks with size limits
  const split = async (
    text: string, 
    limit: number, 
    metadata?: Partial<Document['metadata']>
  ): Promise<Document[]> => {
    const chunks: string[] = [];
    let currentChunk = '';
    const words = text.split(' ');

    for (const word of words) {
      if ((currentChunk + ' ' + word).length > limit && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = word;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + word;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return Promise.all(
      chunks.map((chunk, index) => document(chunk, {
        ...metadata,
        chunkIndex: index,
        totalChunks: chunks.length
      }))
    );
  };

  return {
    document,
    restorePlaceholders,
    split,
  };
};

function estimateTokenCount(text: string): number {
  // Simple token estimation (roughly 4 characters per token)
  return Math.ceil(text.length / 4);
}