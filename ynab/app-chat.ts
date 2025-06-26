import 'dotenv/config';
import OpenAI from 'openai';
import { createVoiceService } from './voice.service';
import { env } from "bun";

const CHAT_ENDPOINT = 'http://localhost:3000/chat';
const AUTH_TOKEN = env.AUTH_TOKEN;

if (!AUTH_TOKEN) {
  console.error('Missing required environment variable: AUTH_TOKEN');
  process.exit(1);
}

async function callChatEndpoint(message: string): Promise<any> {
  try {
    const response = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authentication': AUTH_TOKEN as string,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            message: message
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to call chat endpoint:', error);
    throw error;
  }
}

async function setupKeyboardListener(voiceService: ReturnType<typeof createVoiceService>) {
  console.log('🎤 Voice Chat Client Ready!');
  console.log('📝 Press SPACE to start/stop recording');
  console.log('📝 Press Q to quit');
  console.log('═'.repeat(50));

  // Enable raw mode to capture individual keystrokes
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', async (key: string) => {
    const keyCode = key.charCodeAt(0);
    
    // Space key (32)
    if (keyCode === 32) {
      const status = voiceService.getRecordingStatus();
      
      if (!status.isRecording) {
        // Start recording
        console.log('\n🎤 Starting recording... (Press SPACE again to stop)');
        const result = await voiceService.startRecording();
        if (!result.success) {
          console.error('❌ Failed to start recording:', result.error);
        }
      } else {
        // Stop recording and process
        console.log('\n🛑 Stopping recording...');
        const stopResult = await voiceService.stopRecording();
        
        if (stopResult.success && stopResult.filePath) {
          console.log('🔄 Transcribing audio...');
          const transcriptionResult = await voiceService.transcribeAudio(stopResult.filePath);
          
          if (transcriptionResult.success && transcriptionResult.text) {
            console.log('📝 Transcription:', transcriptionResult.text);
            console.log('💬 Sending to chat endpoint...');
            
            try {
              const chatResponse = await callChatEndpoint(transcriptionResult.text);
              console.log('✅ Chat Response:', JSON.stringify(chatResponse, null, 2));
            } catch (error) {
              console.error('❌ Failed to get chat response:', error);
            }
          } else {
            console.error('❌ Failed to transcribe audio:', transcriptionResult.error);
          }
        } else {
          console.error('❌ Failed to stop recording:', stopResult.error);
        }
        
        console.log('\n🎤 Ready for next recording... (Press SPACE to start)');
      }
    }
    // Q key (113) or Ctrl+C (3)
    else if (keyCode === 113 || keyCode === 3) {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    }
  });
}

async function main() {
  try {
    // Initialize OpenAI client and voice service
    const openaiClient = new OpenAI();
    const voiceService = createVoiceService(openaiClient);

    // Setup keyboard listener for voice recording
    await setupKeyboardListener(voiceService);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch(console.error);