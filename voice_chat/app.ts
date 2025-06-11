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

app.post('/transcribe', async (c: Context) => {
    try {
        const contentType = c.req.header('content-type');
        let audioFile: File;

        if (contentType?.startsWith('audio/') || contentType?.startsWith('video/')) {
            // Handle raw audio/video data
            const arrayBuffer = await c.req.arrayBuffer();
            const extension = contentType.includes('mp4') ? 'mp4' : 
                             contentType.includes('wav') ? 'wav' :
                             contentType.includes('mp3') ? 'mp3' :
                             contentType.includes('m4a') ? 'm4a' : 'audio';
            
            audioFile = new File([arrayBuffer], `audio.${extension}`, { type: contentType });
        } else {
            // Handle multipart form data
            const body = await c.req.parseBody();
            audioFile = body['audio'] as File || body['file'] as File;
        }

        if (!audioFile) {
            return c.json({ error: 'No audio file provided' }, 400);
        }

        console.log('Processing audio file:', audioFile.name, audioFile.type, audioFile.size);

        // Convert File to format expected by OpenAI
        const transcription = await client.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
        });

        return c.json({ 
            transcription: transcription.text 
        });
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
