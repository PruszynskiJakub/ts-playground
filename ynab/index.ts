import { Hono } from 'hono';
import { env } from 'bun';
import OpenAI from 'openai';
import * as ynab from 'ynab';
import { createOpenAIService } from './openai.service';
import { createYnabService } from './ynab.service';
import { classifyMessagePrompt } from './prompts';

const app = new Hono();

// Get auth token from environment
const AUTH_TOKEN = env.AUTH_TOKEN;
const YNAB_API_KEY = env.YNAB_PERSONAL_ACCESS_TOKEN;
const BUDGET_ID = env.YNAB_BUDGET_ID;

if (!AUTH_TOKEN) {
  console.error('Missing required environment variable: AUTH_TOKEN');
  process.exit(1);
}

if (!YNAB_API_KEY || !BUDGET_ID) {
  console.error('Missing required environment variables: YNAB_PERSONAL_ACCESS_TOKEN and YNAB_BUDGET_ID');
  process.exit(1);
}

// Initialize services
const openaiClient = new OpenAI();
const openaiService = createOpenAIService(openaiClient);
const ynabClient = new ynab.API(YNAB_API_KEY);
const ynabService = createYnabService(ynabClient, BUDGET_ID, openaiService);

// Authentication middleware
app.use('*', async (c, next) => {
  const authHeader = c.req.header('X-Authentication');
  
  if (authHeader !== AUTH_TOKEN) {
    return c.json({ error: 'Invalid authentication token' }, 401);
  }
  
  await next();
});

// Helper function to check if message is a transaction
async function isTransactionMessage(message: string): Promise<boolean> {
  try {
    const response = await openaiService.chatCompletion([
      {
        role: 'system',
        content: classifyMessagePrompt()
      },
      {
        role: 'user',
        content: message
      }
    ], { temperature: 0, model: 'gpt-3.5-turbo' });

    if ('choices' in response) {
      const content = response.choices[0].message.content?.toLowerCase().trim() || 'no';
      return content === 'yes';
    }
    return false;
  } catch (error) {
    console.error('Error checking if transaction:', error);
    return false;
  }
}

// Chat endpoint
app.post('/chat', async (c) => {
  try {
    const body = await c.req.json();
    
    // Validate body structure
    if (!body.messages || !Array.isArray(body.messages)) {
      return c.json({
        success: false,
        error: 'Invalid request body. Expected { messages: [{ role, message }] }'
      }, 400);
    }

    // Get the last user message
    const lastUserMessage = body.messages
      .filter((m: any) => m.role === 'user')
      .pop();

    if (!lastUserMessage || !lastUserMessage.message) {
      return c.json({
        success: false,
        error: 'No user message found'
      }, 400);
    }

    const userMessage = lastUserMessage.message;

    // Check if this is a transaction
    const isTransaction = await isTransactionMessage(userMessage);

    if (isTransaction) {
      // Process as a transaction
      console.log('💰 Processing as transaction:', userMessage);
      const transactionResult = await ynabService.addTransaction(userMessage);
      
      if (transactionResult.success) {
        return c.json({
          success: true,
          type: 'transaction',
          message: 'Transaction recorded successfully!',
          transactionIds: transactionResult.transactionIds,
          processedCount: transactionResult.processedCount,
          totalCount: transactionResult.totalCount
        });
      } else {
        return c.json({
          success: false,
          type: 'transaction',
          error: transactionResult.error
        }, 400);
      }
    } else {
      // Process as a general chat
      console.log('💬 Processing as chat:', userMessage);
      
      // Convert messages to OpenAI format
      const openaiMessages = body.messages.map((m: any) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.message
      }));

      const response = await openaiService.chatCompletion(openaiMessages, {
        temperature: 0.7,
        model: 'gpt-4'
      });

      if ('choices' in response) {
        return c.json({
          success: true,
          type: 'chat',
          message: response.choices[0].message.content
        });
      } else {
        throw new Error('Invalid response from OpenAI');
      }
    }
  } catch (error) {
    console.error('Chat endpoint error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Health check endpoint (also requires auth)
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

const port = 3000;

console.log(`🚀 Server starting on port ${port}`);
console.log(`🔐 Authentication required via X-Authentication header`);

export default {
  port,
  fetch: app.fetch,
};