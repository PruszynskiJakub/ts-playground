import {OpenAI} from "openai";
import {env, serve} from "bun";
import {type Context, Hono, type MiddlewareHandler} from 'hono'
import type {ResponseStreamEvent} from "openai/resources/responses/responses";
import {streamSSE} from 'hono/streaming'
import {sleep} from "openai/core";

const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
});

const logger: MiddlewareHandler = async (c, next) => {
    const start = Date.now();
    await next();
    const end = Date.now();
    const time = end - start;

    console.log(`${c.req.method} ${c.req.url} - ${c.res.status} - ${time}ms`);
};

const app = new Hono()

app.use(logger)
app.use('/sse/*', async (c, next) => {
    c.header('Content-Type', 'text/event-stream')
    c.header('Cache-Control', 'no-cache')
    c.header('Connection', 'keep-alive')
    await next()
})

// SSE endpoint
app.get('/sse', (context: Context) => {
    return streamSSE(context, async (stream: {
        writeSSE: (arg0: { data: string; event: string; id: string; }) => any;
        sleep: (arg0: number) => any;
    }) => {
        const s: AsyncIterable<ResponseStreamEvent> = await client.responses.create({
            model: "gpt-4.1",
            input: [
                {
                    role: "user",
                    content: "Say 'double bubble bath' ten times fast.",
                },
            ],
            stream: true,
        });

        for await (const event of s) {
            stream.writeSSE({
                data: JSON.stringify(event),
                id: event.item_id,
                event: event.type
            })
        }
    })
})

serve({
    fetch: app.fetch,
    port: Number(3000),
});