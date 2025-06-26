import 'dotenv/config';
import * as ynab from 'ynab';
import OpenAI from 'openai';
import { createYnabService } from './ynab.service';
import { createOpenAIService } from './openai.service';
import { createVoiceService } from './voice.service';
import { env } from "bun";

const YNAB_API_KEY = env.YNAB_PERSONAL_ACCESS_TOKEN;
const BUDGET_ID = env.YNAB_BUDGET_ID;

if (!YNAB_API_KEY || !BUDGET_ID) {
  console.error('Missing required environment variables: YNAB_PERSONAL_ACCESS_TOKEN and YNAB_BUDGET_ID');
  process.exit(1);
}

async function setupKeyboardListener(voiceService: ReturnType<typeof createVoiceService>, ynabService: ReturnType<typeof createYnabService>) {
  console.log('🎤 Voice Transaction Recorder Ready!');
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
    
    // Space key (32) or Enter (13)
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
            console.log('💰 Processing transaction...');
            
            const transactionResult = await ynabService.addTransaction(transcriptionResult.text);
            
            if (transactionResult.success) {
              console.log('✅ Transaction added successfully!');
              if (transactionResult.processedCount && transactionResult.totalCount) {
                console.log(`📊 Processed ${transactionResult.processedCount}/${transactionResult.totalCount} transactions`);
              }
              if (transactionResult.transactionIds) {
                console.log('🆔 Transaction IDs:', transactionResult.transactionIds.join(', '));
              }
            } else {
              console.error('❌ Failed to add transaction:', transactionResult.error);
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
    // Initialize services
    const ynabClient = new ynab.API(YNAB_API_KEY!);
    const openaiClient = new OpenAI();
    const openaiService = createOpenAIService(openaiClient);
    const ynabService = createYnabService(ynabClient, BUDGET_ID!, openaiService);
    const voiceService = createVoiceService(openaiClient);

    // Setup keyboard listener for voice recording
    await setupKeyboardListener(voiceService, ynabService);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch(console.error);
