import type {Document} from './types.js';
import {randomUUID} from 'crypto';

// Factory function that returns pure functions for document operations
export const createDocumentService = () => {

    // Function to create a document with UUID and metadata
    const document = async (
        text: string,
        additionalMetadata?: Record<string, any>
    ): Promise<Document> => {
        const baseMetadata = {
            tokens: estimateTokenCount(text),
            uuid: randomUUID(),
            ...additionalMetadata
        };

        return {
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

    const extractUrlsAndImages = (text: string): { content: string; urls: string[]; images: string[] } => {
        const urls: string[] = [];
        const images: string[] = [];
        let urlIndex = 0;
        let imageIndex = 0;

        const content = text
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, altText, url) => {
                images.push(url);
                return `![${altText}]({{$img${imageIndex++}}})`;
            })
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, linkText, url) => {
                if (!url.startsWith('{{$img')) {
                    urls.push(url);
                    return `[${linkText}]({{$url${urlIndex++}}})`;
                }
                return _match; // Keep image placeholders unchanged
            });

        return {content, urls, images};
    }

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