import type { Document } from './types';
import type { createOpenAIService } from './openai.service';
import {randomUUID} from "crypto";

export const createTextService = (openaiService: ReturnType<typeof createOpenAIService>) => {
    
    const split = async (document: Document): Promise<Document[]> => {
        const maxChunkSize = 1000;
        const text = document.text;
        
        if (text.length <= maxChunkSize) {
            // Generate description for single chunk
            const description = await generateDescription(document.text);
            return [{
                ...document,
                metadata: {
                    ...document.metadata,
                    description
                }
            }];
        }
        
        const chunks: Document[] = [];
        let currentPosition = 0;
        let chunkIndex = 0;
        
        while (currentPosition < text.length) {
            const endPosition = Math.min(currentPosition + maxChunkSize, text.length);
            let actualEndPosition = endPosition;
            
            // Try to break at sentence boundaries
            if (endPosition < text.length) {
                const lastSentenceEnd = text.lastIndexOf('.', endPosition);
                const lastNewline = text.lastIndexOf('\n', endPosition);
                const lastSpace = text.lastIndexOf(' ', endPosition);
                
                const breakPoint = Math.max(lastSentenceEnd, lastNewline, lastSpace);
                if (breakPoint > currentPosition) {
                    actualEndPosition = breakPoint + 1;
                }
            }
            
            const chunkText = text.slice(currentPosition, actualEndPosition);
            
            chunks.push({
                text: chunkText,
                metadata: {
                    ...document.metadata,
                    uuid: randomUUID(),
                    chunk: chunkIndex,
                    total_chunks: 0
                }
            });
            
            currentPosition = actualEndPosition;
            chunkIndex++;
        }
        
        // Update total_chunks for all chunks
        chunks.forEach(chunk => {
            chunk.metadata.total_chunks = chunks.length;
        });
        
        // Generate descriptions for all chunks
        const chunksWithDescriptions = await Promise.all(
            chunks.map(async (chunk) => ({
                ...chunk,
                metadata: {
                    ...chunk.metadata,
                    description: await generateDescription(chunk.text)
                }
            }))
        );
        
        return chunksWithDescriptions;
    };

    const generateDescription = async (text: string): Promise<string> => {
        try {
            const response = await openaiService.chatCompletion([
                {
                    role: 'system',
                    content: 'You are a helpful assistant that creates concise, informative descriptions. Generate exactly 2 sentences that describe the main content and key points of the given text.'
                },
                {
                    role: 'user',
                    content: `Please provide a 2-sentence description of this text:\n\n${text}`
                }
            ], { temperature: 0.3 });
            
            if ('choices' in response) {
                return response.choices[0]?.message?.content || 'No description available.';
            }
            
            return 'No description available.';
        } catch (error) {
            console.error('Error generating description:', error);
            return 'Description generation failed.';
        }
    };

    const extractImagesAndUrls = (doc: Document): Document => {
        const text = doc.text;
        
        const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
        const urlPattern = /(?<!!)(?:\[([^\]]*)\]\(([^)]+)\)|(?:https?:\/\/[^\s]+))/g;
        
        const extractedImages: string[] = [];
        const extractedUrls: string[] = [];
        let processedText = text;
        
        let match;
        while ((match = imagePattern.exec(text)) !== null) {
            const [fullMatch] = match;
            const placeholder = `[IMAGE_${extractedImages.length}]`;
            extractedImages.push(fullMatch);
            processedText = processedText.replace(fullMatch, placeholder);
        }
        
        urlPattern.lastIndex = 0;
        
        while ((match = urlPattern.exec(processedText)) !== null) {
            const [fullMatch] = match;
            if (!fullMatch.includes('[IMAGE_')) {
                const placeholder = `[URL_${extractedUrls.length}]`;
                extractedUrls.push(fullMatch);
                processedText = processedText.replace(fullMatch, placeholder);
            }
        }
        
        return {
            text: processedText,
            metadata: {
                ...doc.metadata,
                images: extractedImages,
                urls: extractedUrls
            }
        };
    };

    const restoreImagesAndUrls = (doc: Document): Document => {
        let restoredText = doc.text;
        const images = doc.metadata.images || [];
        const urls = doc.metadata.urls || [];
        
        images.forEach((image, index) => {
            restoredText = restoredText.replace(`[IMAGE_${index}]`, image);
        });
        
        urls.forEach((url, index) => {
            restoredText = restoredText.replace(`[URL_${index}]`, url);
        });
        
        const cleanedMetadata = { ...doc.metadata };
        delete cleanedMetadata.images;
        delete cleanedMetadata.urls;
        
        return {
            text: restoredText,
            metadata: cleanedMetadata
        };
    };

    return {
        split,
        extractImagesAndUrls,
        restoreImagesAndUrls
    };
};