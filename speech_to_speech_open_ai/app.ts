import {OpenAI, toFile} from "openai";
import {env, serve} from "bun";
import {type Context, Hono, type MiddlewareHandler} from 'hono'
import type {ResponseStreamEvent} from "openai/resources/responses/responses";
import {streamSSE} from 'hono/streaming'
import {sleep} from "openai/core";
import fs from "fs";
import path from "path";

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

app.post('/transcribe', async (c: Context) => {
    try {
        const contentType = c.req.header('content-type');

        const arrayBuffer = await c.req.arrayBuffer();

        // Convert File to format expected by OpenAI
        const audioFile = await toFile(arrayBuffer, "audio.m4a");
        const transcription = await client.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
        });

        // Generate speech from transcription
        const mp3 = await client.audio.speech.create({
            model: "gpt-4o-mini-tts",
            voice: "coral",
            input: transcription.text,
            instructions: "Speak in a cheerful and positive tone.",
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());

        // Return the audio file directly
        c.header('Content-Type', 'audio/mpeg');
        c.header('Content-Disposition', 'attachment; filename="speech.mp3"');
        return c.body(buffer);
    } catch (error) {
        console.error('Transcription error:', error);
        return c.json({ 
            error: 'Failed to transcribe audio' 
        }, 500);
    }
});


serve({
    fetch: app.fetch,
    port: Number(3000),
});
