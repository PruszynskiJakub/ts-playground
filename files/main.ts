import { Hono } from 'hono';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import type { Document } from './types';
import { createTextService } from './text.service';
import { createOpenAIService } from './openai.service';
import { createFileService } from './file.service';
import { createWebService } from './web.service';

const app = new Hono();
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const openaiService = createOpenAIService(openaiClient);
const textService = createTextService(openaiService);
const webService = createWebService({ SERPER_API_KEY: process.env.SERPER_API_KEY || '' });
const fileService = createFileService(textService, webService);

// In-memory storage for processed documents
const documentStore = new Map<string, Document[]>();

// Logging utility
function log(level: 'INFO' | 'ERROR' | 'WARN', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...(data && { data })
  };
  console.log(`[${timestamp}] ${level}: ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

// Helper function for Step 1: Select relevant chunks based on descriptions
async function selectRelevantChunks(userQuestion: string, allChunks: Document[]): Promise<Document[]> {
  try {
    // Create a summary of all chunks with their descriptions
    const chunkSummaries = allChunks.map(chunk => ({
      uuid: chunk.metadata.uuid,
      name: chunk.metadata.name,
      chunk: chunk.metadata.chunk,
      description: chunk.metadata.description || 'No description available',
      source: chunk.metadata.source
    }));

    const prompt = `Given the user's question: "${userQuestion}"

Here are the available document chunks with their descriptions:

${chunkSummaries.map(chunk => 
  `- UUID: ${chunk.uuid} | File: ${chunk.name} | Chunk: ${chunk.chunk} | Description: ${chunk.description}`
).join('\n')}

Please select the UUIDs of the most relevant chunks that would help answer the user's question. Return only a JSON array of UUIDs, like: ["uuid1", "uuid2", "uuid3"]`;

    const response = await openaiService.chatCompletion([
      {
        role: 'system',
        content: 'You are a helpful assistant that selects the most relevant document chunks to answer user questions. Return only a JSON array of UUIDs.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], { temperature: 0.2, jsonMode: true });

    if ('choices' in response) {
      const content = response.choices[0]?.message?.content;
      if (content) {
        const selectedUUIDs = JSON.parse(content);
        return allChunks.filter(chunk => selectedUUIDs.includes(chunk.metadata.uuid));
      }
    }

    return [];
  } catch (error) {
    console.error('Error selecting relevant chunks:', error);
    // Fallback: return first few chunks
    return allChunks.slice(0, 3);
  }
}

// Helper function for Step 2: Generate answer with full chunk context
async function generateAnswerWithContext(userQuestion: string, relevantChunks: Document[]): Promise<string> {
  try {
    const contextXml = relevantChunks.map(chunk => 
      `<chunk uuid="${chunk.metadata.uuid}" source="${chunk.metadata.source}">${chunk.text}</chunk>`
    ).join('\n');

    const prompt = `<context>
${contextXml}
</context>

User Question: ${userQuestion}

Please provide a comprehensive answer based on the context provided above. Use the information from the chunks to give a detailed and accurate response.`;

    const response = await openaiService.chatCompletion([
      {
        role: 'system',
        content: 'You are a helpful assistant that answers questions based on provided document context. Use the information from the chunks to provide accurate and detailed responses.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], { temperature: 0.3 });

    if ('choices' in response) {
      return response.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a proper response.';
    }

    return 'I apologize, but I couldn\'t generate a proper response.';
  } catch (error) {
    console.error('Error generating answer:', error);
    return 'I apologize, but I encountered an error while generating the response.';
  }
}

// Helper function to create sources footer
function createSourcesFooter(chunks: Document[]): string {
  const sources = new Set<string>();
  const chunkInfo: string[] = [];

  chunks.forEach(chunk => {
    if (chunk.metadata.source) {
      sources.add(chunk.metadata.source);
    }
    chunkInfo.push(`${chunk.metadata.uuid} (${chunk.metadata.name}, chunk ${chunk.metadata.chunk})`);
  });

  const sourcesText = Array.from(sources).map(source => `- ${source}`).join('\n');
  const chunksText = chunkInfo.map(info => `- ${info}`).join('\n');

  return `---

**Sources:**
${sourcesText}

**Chunks Used:**
${chunksText}`;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
}

app.post('/chat', async (c) => {
  const startTime = Date.now();
  const requestId = `chat-${Date.now()}`;
  
  try {
    log('INFO', 'Chat request received', { requestId });
    
    const body = await c.req.json() as ChatRequest;
    
    if (!body.messages || !Array.isArray(body.messages)) {
      log('WARN', 'Invalid chat request: missing messages array', { requestId });
      return c.json({ error: 'Invalid request: messages array is required' }, 400);
    }

    // Validate message structure
    for (const message of body.messages) {
      if (!message.role || !message.content) {
        log('WARN', 'Invalid message format', { requestId, message });
        return c.json({ error: 'Invalid message format: role and content are required' }, 400);
      }
      if (!['user', 'assistant', 'system'].includes(message.role)) {
        log('WARN', 'Invalid message role', { requestId, role: message.role });
        return c.json({ error: 'Invalid role: must be user, assistant, or system' }, 400);
      }
    }

    // Get the latest user message
    const userMessage = body.messages[body.messages.length - 1];
    if (userMessage.role !== 'user') {
      log('WARN', 'Last message not from user', { requestId, role: userMessage.role });
      return c.json({ error: 'Last message must be from user' }, 400);
    }

    log('INFO', 'Processing user question', { requestId, question: userMessage.content });

    // Get all document chunks
    const allChunks: Document[] = [];
    documentStore.forEach((chunks) => {
      allChunks.push(...chunks);
    });

    log('INFO', 'Retrieved document chunks', { requestId, totalChunks: allChunks.length });

    if (allChunks.length === 0) {
      log('INFO', 'No documents available for chat', { requestId });
      return c.json({ 
        message: {
          role: 'assistant',
          content: 'No documents have been uploaded yet. Please upload some markdown files first.'
        }
      });
    }

    // Step 1: Select relevant chunks based on descriptions
    log('INFO', 'Starting chunk selection process', { requestId });
    const relevantChunks = await selectRelevantChunks(userMessage.content, allChunks);
    log('INFO', 'Chunk selection completed', { 
      requestId, 
      selectedChunks: relevantChunks.length,
      chunkIds: relevantChunks.map(c => c.metadata.uuid)
    });

    if (relevantChunks.length === 0) {
      log('INFO', 'No relevant chunks found', { requestId });
      return c.json({ 
        message: {
          role: 'assistant',
          content: 'I couldn\'t find any relevant information in the uploaded documents to answer your question.'
        }
      });
    }

    // Step 2: Generate answer using full chunk context
    log('INFO', 'Starting answer generation', { requestId });
    const answer = await generateAnswerWithContext(userMessage.content, relevantChunks);
    log('INFO', 'Answer generation completed', { requestId, answerLength: answer.length });

    // Create footer with sources
    const footer = createSourcesFooter(relevantChunks);

    const response: ChatMessage = {
      role: 'assistant',
      content: `${answer}\n\n${footer}`
    };

    const processingTime = Date.now() - startTime;
    log('INFO', 'Chat request completed successfully', { 
      requestId, 
      processingTime: `${processingTime}ms`,
      responseLength: response.content.length
    });

    return c.json({ message: response });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    log('ERROR', 'Chat request failed', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`
    });
    return c.json({ error: 'Failed to process chat request' }, 500);
  }
});

app.post('/upload', async (c) => {
  const startTime = Date.now();
  const requestId = `upload-${Date.now()}`;
  
  try {
    log('INFO', 'Upload request received', { requestId });
    
    const body = await c.req.parseBody();
    const file = body.file as File;

    if (!file) {
      log('WARN', 'Upload request missing file', { requestId });
      return c.json({ error: 'No file provided' }, 400);
    }

    const fileName = file.name;
    const fileSize = file.size;
    log('INFO', 'Processing file upload', { requestId, fileName, fileSize });

    // Ensure public directory exists
    const publicDir = join(process.cwd(), 'files', 'public');
    if (!existsSync(publicDir)) {
      await mkdir(publicDir, { recursive: true });
      log('INFO', 'Created public directory', { requestId, publicDir });
    }

    // Save file using file service
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const fileUUID = uuidv4();
    const savedFile = await fileService.save(buffer, fileName, fileUUID, 'text', publicDir);
    log('INFO', 'File saved via file service', { requestId, fileName, savedFile });

    // Process file using file service
    log('INFO', 'Processing file with file service', { requestId, fileName });
    const processResult = await fileService.process(savedFile.path);
    const processedDocuments = processResult.docs;
    
    if (processedDocuments.length > 0) {
      log('INFO', 'File processed successfully', { 
        requestId, 
        chunksCreated: processedDocuments.length,
        chunkIds: processedDocuments.map(c => c.metadata.uuid)
      });
      
      // Store in memory (use file UUID as key)
      documentStore.set(fileUUID, processedDocuments);
      log('INFO', 'Document chunks stored in memory', { requestId });
    } else {
      log('INFO', 'File uploaded but not processed (unsupported type)', { requestId, fileName });
    }

    const processingTime = Date.now() - startTime;
    log('INFO', 'Upload request completed successfully', { 
      requestId, 
      fileName,
      processed: processedDocuments.length > 0,
      chunksCreated: processedDocuments.length,
      processingTime: `${processingTime}ms`
    });

    return c.json({ 
      message: 'File uploaded successfully',
      fileName: fileName,
      filePath: `/files/public/${fileName}`,
      ...(processedDocuments.length > 0 && {
        processed: true,
        documentsCreated: processedDocuments.length,
        documentId: processedDocuments[0].metadata.uuid
      })
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    log('ERROR', 'Upload request failed', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`
    });
    return c.json({ error: 'Failed to upload file' }, 500);
  }
});

app.get('/', (c) => {
  return c.json({ 
    message: 'Files server is running',
    endpoints: {
      '/chat': 'POST - Chat about files',
      '/upload': 'POST - Upload files'
    }
  });
});

console.log('Starting files server on port 3000...');

export default {
  port: 3000,
  fetch: app.fetch,
};

console.log('Files server is running on http://localhost:3000');