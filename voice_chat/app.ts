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


serve({
    fetch: app.fetch,
    port: Number(3000),
});