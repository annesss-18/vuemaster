// lib/gemini-live.ts - Native WebSocket Implementation for Browser
export type GeminiLiveConfig = {
  systemInstruction: string;
  voice?: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede';
  model?: string;
};

export type GeminiMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
};

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private isConnected = false;
  
  private callbacks: {
    onTranscript?: (message: GeminiMessage) => void;
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
    onCallStart?: () => void;
    onCallEnd?: () => void;
    onError?: (error: Error) => void;
  } = {};

  constructor(private apiKey: string) {}

  on(event: string, callback: Function) {
    this.callbacks[event as keyof typeof this.callbacks] = callback as any;
  }

  off(event: string) {
    delete this.callbacks[event as keyof typeof this.callbacks];
  }

  async start(config: GeminiLiveConfig) {
    try {
      // Initialize audio context
      this.audioContext = new AudioContext({ sampleRate: 24000 });

      // Connect to Gemini WebSocket - v1beta is the correct version
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;
      
      this.ws = new WebSocket(wsUrl);
      
      // Set binary type to handle audio data properly
      this.ws.binaryType = 'blob'; // Can also be 'arraybuffer'

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.isConnected = true;
        
        // Send setup message
        this.sendSetup(config);
        
        // Start audio capture after setup
        setTimeout(() => {
          this.startAudioCapture();
        }, 500);
        
        this.callbacks.onCallStart?.();
      };

      this.ws.onmessage = async (event) => {
        try {
          console.log('📨 Raw message type:', typeof event.data);
          console.log('📨 Is Blob?', event.data instanceof Blob);
          console.log('📨 Is ArrayBuffer?', event.data instanceof ArrayBuffer);
          
          // Handle binary data (audio)
          if (event.data instanceof Blob) {
            console.log('📦 Received binary data (Blob):', event.data.size, 'bytes');
            await this.handleBinaryMessage(event.data);
            return;
          }

          // Handle ArrayBuffer
          if (event.data instanceof ArrayBuffer) {
            console.log('📦 Received ArrayBuffer:', event.data.byteLength, 'bytes');
            const blob = new Blob([event.data]);
            await this.handleBinaryMessage(blob);
            return;
          }

          // Handle text data (JSON)
          if (typeof event.data === 'string') {
            console.log('📝 Received text message, length:', event.data.length);
            console.log('📝 First 100 chars:', event.data.substring(0, 100));
            const response = JSON.parse(event.data);
            this.handleServerMessage(response);
            return;
          }

          console.warn('⚠️ Unknown message type:', typeof event.data, event.data);
        } catch (error) {
          console.error('❌ Error handling message:', error);
          console.error('❌ Message data:', event.data);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.callbacks.onError?.(new Error('WebSocket connection failed'));
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        this.isConnected = false;
        this.callbacks.onCallEnd?.();
      };

    } catch (error) {
      console.error('Failed to start:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  private sendSetup(config: GeminiLiveConfig) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const model = config.model || 'gemini-2.0-flash-exp';
    
    const setupMessage = {
      setup: {
        model: `models/${model}`,
        generation_config: {
          response_modalities: ['AUDIO'],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: config.voice || 'Puck'
              }
            }
          }
        }
      }
    };

    // Add system instruction if provided
    if (config.systemInstruction) {
      (setupMessage.setup as any).system_instruction = {
        parts: [{ text: config.systemInstruction }]
      };
    }

    console.log('📤 Sending setup:', JSON.stringify(setupMessage, null, 2));
    this.ws.send(JSON.stringify(setupMessage));
  }

  private async startAudioCapture() {
    try {
      console.log('🎤 Requesting microphone access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      console.log('✅ Microphone access granted');

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      this.mediaRecorder = new MediaRecorder(stream, { mimeType });

      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && this.isConnected) {
          await this.sendAudioChunk(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
      };

      // Start recording in 250ms chunks
      this.mediaRecorder.start(250);
      console.log('🎙️ Recording started');

    } catch (error) {
      console.error('❌ Microphone access failed:', error);
      this.callbacks.onError?.(new Error('Microphone access denied'));
    }
  }

  private async sendAudioChunk(blob: Blob) {
    try {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        console.warn('⚠️ WebSocket not ready, skipping audio chunk');
        return;
      }

      // Convert blob to base64
      const base64Audio = await this.blobToBase64(blob);
      
      if (!base64Audio || typeof base64Audio !== 'string') {
        console.error('❌ Invalid base64 audio data');
        return;
      }

      const message = {
        realtime_input: {
          media_chunks: [{
            mime_type: blob.type,
            data: base64Audio
          }]
        }
      };

      const messageStr = JSON.stringify(message);
      this.ws.send(messageStr);
      console.log('📤 Sent audio chunk:', blob.size, 'bytes, base64 length:', base64Audio.length);

    } catch (error) {
      console.error('❌ Error sending audio:', error);
    }
  }

  private async handleBinaryMessage(blob: Blob) {
    try {
      // Binary messages might be audio data
      // For now, log and skip (audio should come in JSON inlineData)
      console.log('🔊 Binary audio data received, size:', blob.size);
      
      // If you want to handle raw binary audio:
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Try to decode as audio
      if (this.audioContext) {
        try {
          const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
          this.audioQueue.push(audioBuffer);
          
          if (!this.isPlaying) {
            this.playNextInQueue();
          }
        } catch (decodeError) {
          console.warn('⚠️ Could not decode binary audio:', decodeError);
        }
      }
    } catch (error) {
      console.error('❌ Error handling binary message:', error);
    }
  }

  private handleServerMessage(response: any) {
    console.log('📥 Received:', JSON.stringify(response, null, 2));

    // Handle setup complete
    if (response.setupComplete) {
      console.log('✅ Setup complete');
      return;
    }

    // Handle server content (model's response)
    if (response.serverContent) {
      const modelTurn = response.serverContent.modelTurn;
      
      if (modelTurn?.parts) {
        for (const part of modelTurn.parts) {
          // Handle text transcript
          if (part.text) {
            console.log('💬 AI said:', part.text);
            this.callbacks.onTranscript?.({
              role: 'assistant',
              content: part.text,
              timestamp: Date.now()
            });
          }

          // Handle audio response
          if (part.inlineData?.data) {
            console.log('🔊 Received audio data');
            this.playAudio(part.inlineData.data, part.inlineData.mimeType);
          }
        }
      }

      // Check if turn is complete
      if (response.serverContent.turnComplete) {
        console.log('✅ Turn complete');
      }
    }

    // Handle tool calls (future use)
    if (response.toolCall) {
      console.log('🔧 Tool call:', response.toolCall);
    }

    // Handle errors
    if (response.error) {
      console.error('❌ Server error:', response.error);
      this.callbacks.onError?.(new Error(response.error.message));
    }
  }

  private async playAudio(base64Audio: string, mimeType: string) {
    if (!this.audioContext) return;

    try {
      this.callbacks.onSpeechStart?.();

      // Decode base64
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Parse mime type to determine format
      let audioBuffer: ArrayBuffer = bytes.buffer;
      
      // If it's PCM, convert to WAV
      if (mimeType && mimeType.includes('pcm')) {
        const format = this.parsePCMFormat(mimeType);
        audioBuffer = this.convertPCMToWav(bytes.buffer, format);
      }

      // Decode and queue
      const decodedAudio = await this.audioContext.decodeAudioData(audioBuffer);
      this.audioQueue.push(decodedAudio);

      // Start playback if not already playing
      if (!this.isPlaying) {
        this.playNextInQueue();
      }

    } catch (error) {
      console.error('❌ Error playing audio:', error);
      this.callbacks.onSpeechEnd?.();
    }
  }

  private async playNextInQueue() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      this.callbacks.onSpeechEnd?.();
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;

    if (!this.audioContext) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    source.onended = () => {
      this.playNextInQueue();
    };

    source.start();
    console.log('▶️ Playing audio chunk');
  }

  private parsePCMFormat(mimeType: string) {
    // Example: "audio/pcm;rate=24000"
    const params = mimeType.split(';');
    let sampleRate = 24000;
    let bitsPerSample = 16;

    for (const param of params) {
      if (param.includes('rate=')) {
        sampleRate = parseInt(param.split('=')[1]);
      }
    }

    return { sampleRate, numChannels: 1, bitsPerSample };
  }

  private convertPCMToWav(
    pcmData: ArrayBuffer,
    format: { sampleRate: number; numChannels: number; bitsPerSample: number }
  ): ArrayBuffer {
    const { sampleRate, numChannels, bitsPerSample } = format;
    const dataLength = pcmData.byteLength;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;

    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // RIFF chunk
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + dataLength, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"

    // fmt chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, dataLength, true);

    // Combine
    const wavData = new Uint8Array(44 + dataLength);
    wavData.set(new Uint8Array(header), 0);
    wavData.set(new Uint8Array(pcmData), 44);

    return wavData.buffer;
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  stop() {
    console.log('🛑 Stopping session...');

    // Stop recording
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      this.mediaRecorder = null;
    }

    // Close WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
      this.ws = null;
    }

    // Stop audio
    this.audioQueue = [];
    this.isPlaying = false;

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isConnected = false;
    this.callbacks.onCallEnd?.();
  }

  sendText(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const message = {
      client_content: {
        turns: [{
          role: 'user',
          parts: [{ text }]
        }],
        turn_complete: true
      }
    };

    this.ws.send(JSON.stringify(message));
  }
}

// Singleton
let geminiLiveClient: GeminiLiveClient | null = null;

export const getGeminiLiveClient = () => {
  if (!geminiLiveClient) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_GOOGLE_API_KEY not found');
    }
    geminiLiveClient = new GeminiLiveClient(apiKey);
  }
  return geminiLiveClient;
};