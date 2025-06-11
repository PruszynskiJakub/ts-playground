import {ElevenLabsClient, play} from '@elevenlabs/elevenlabs-js';
import {env} from "bun";

const elevenlabs = new ElevenLabsClient({
    apiKey: env.ELEVENLABS_API_KEY,
});
const audio = await elevenlabs.textToSpeech.convert('JBFqnCBsd6RMkjVDRZzb', {
    text: 'The first move is what sets everything in motion.',
    modelId: 'eleven_multilingual_v2',
    outputFormat: 'mp3_44100_128',
});

await play(audio);

