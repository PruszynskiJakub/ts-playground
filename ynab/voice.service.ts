import OpenAI from 'openai';
import { createReadStream, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

export interface VoiceRecordingOptions {
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
}

export interface RecordingResult {
  success: boolean;
  filePath?: string;
  duration?: number;
  error?: string;
}

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  error?: string;
}

export const createVoiceService = (openaiClient: OpenAI) => {
  let isRecording = false;
  let recordingProcess: any = null;
  let currentRecordingPath: string | null = null;

  const startRecording = async (options: VoiceRecordingOptions = {}): Promise<RecordingResult> => {
    if (isRecording) {
      return {
        success: false,
        error: 'Recording is already in progress'
      };
    }

    try {
      const { spawn } = await import('child_process');
      const timestamp = Date.now();
      const recordingPath = join(process.cwd(), `recording_${timestamp}.wav`);
      
      // Use sox for cross-platform audio recording
      // Alternative: use ffmpeg if sox is not available
      const sampleRate = options.sampleRate || 16000;
      const channels = options.channels || 1;
      const bitDepth = options.bitDepth || 16;

      // Try sox first, fallback to ffmpeg
      let command: string;
      let args: string[];

      // Check if we're on macOS and can use built-in recording
      if (process.platform === 'darwin') {
        // Use ffmpeg with avfoundation (built into macOS)
        command = 'ffmpeg';
        args = [
          '-f', 'avfoundation',
          '-i', ':0', // Default microphone
          '-ar', sampleRate.toString(),
          '-ac', channels.toString(),
          '-sample_fmt', 's16',
          '-y', // Overwrite output file
          recordingPath
        ];
      } else {
        // Use sox for other platforms
        command = 'sox';
        args = [
          '-d', // Default input device
          '-r', sampleRate.toString(),
          '-c', channels.toString(),
          '-b', bitDepth.toString(),
          recordingPath
        ];
      }

      recordingProcess = spawn(command, args);
      currentRecordingPath = recordingPath;
      isRecording = true;

      recordingProcess.on('error', (error: Error) => {
        console.error('Recording process error:', error);
        isRecording = false;
        recordingProcess = null;
        currentRecordingPath = null;
      });

      console.log('🎤 Recording started...');
      return {
        success: true,
        filePath: recordingPath
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start recording'
      };
    }
  };

  const stopRecording = async (): Promise<RecordingResult> => {
    if (!isRecording || !recordingProcess || !currentRecordingPath) {
      return {
        success: false,
        error: 'No recording in progress'
      };
    }

    try {
      // Send SIGINT to gracefully stop recording
      recordingProcess.kill('SIGINT');
      
      // Wait a moment for the process to finish
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const filePath = currentRecordingPath;
      isRecording = false;
      recordingProcess = null;
      currentRecordingPath = null;

      console.log('🛑 Recording stopped');
      return {
        success: true,
        filePath
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop recording'
      };
    }
  };

  const transcribeAudio = async (audioFilePath: string): Promise<TranscriptionResult> => {
    try {
      console.log('🔄 Transcribing audio...');
      
      const audioFile = createReadStream(audioFilePath);
      const transcription = await openaiClient.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en', // You can change this or make it configurable
      });

      // Clean up the audio file after transcription
      try {
        unlinkSync(audioFilePath);
      } catch (cleanupError) {
        console.warn('Failed to clean up audio file:', cleanupError);
      }

      return {
        success: true,
        text: transcription.text
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to transcribe audio'
      };
    }
  };

  const getRecordingStatus = () => ({
    isRecording,
    currentRecordingPath
  });

  return {
    startRecording,
    stopRecording,
    transcribeAudio,
    getRecordingStatus
  };
};
