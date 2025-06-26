import { Hono } from 'hono';
import { env } from 'bun';

const app = new Hono();

// Get auth token from environment
const AUTH_TOKEN = env.AUTH_TOKEN;

if (!AUTH_TOKEN) {
  console.error('Missing required environment variable: AUTH_TOKEN');
  process.exit(1);
}

// Authentication middleware
app.use('*', async (c, next) => {
  const authHeader = c.req.header('X-Authentication');
  
  if (authHeader !== AUTH_TOKEN) {
    return c.json({ error: 'Invalid authentication token' }, 401);
  }
  
  await next();
});

// Chat endpoint
app.post('/chat', async (c) => {
  try {
    const body = await c.req.json();
    
    // TODO: Implement chat logic here
    // For now, just echo back the request
    return c.json({
      success: true,
      message: 'Chat endpoint reached',
      received: body
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 400);
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