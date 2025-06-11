import {ElevenLabsClient, play} from '@elevenlabs/elevenlabs-js';
import { config } from 'dotenv';
import path from 'path';

// Load .env file from the root directory (parent of elevenlabs)
config({ path: path.join(__dirname, '..', '.env') });

// Debug: Check if API key is loaded
console.log('ELEVENLABS_API_KEY loaded:', process.env.ELEVENLABS_API_KEY ? 'Yes' : 'No');

if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY environment variable is not set. Please add it to your .env file.');
}

const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
});
const audio = await elevenlabs.textToSpeech.convert('JBFqnCBsd6RMkjVDRZzb', {
    text: 'The first move is what sets everything in motion.',
    modelId: 'eleven_multilingual_v2',
    outputFormat: 'mp3_44100_128',
});

await play(audio);

