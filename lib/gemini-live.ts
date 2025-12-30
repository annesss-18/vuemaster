// lib/gemini-live.ts - Enhanced WebSocket Implementation with Reconnection
import { logger } from '@/lib/logger';

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

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed';

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private connectionState: ConnectionState = 'disconnected';

  // Reconnection logic
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private lastConfig: GeminiLiveConfig | null = null;
  private shouldReconnect = false;
  private manualDisconnect = false;

  // Keep track of messages during reconnection
  private pendingMessages: string[] = [];

  private callbacks: {
    onTranscript?: (message: GeminiMessage) => void;
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
    onCallStart?: () => void;
    onCallEnd?: () => void;
    onError?: (error: Error) => void;
    onToolCall?: (toolCall: unknown) => void;
    onConnectionStateChange?: (state: ConnectionState) => void;
    onReconnecting?: (attempt: number, maxAttempts: number) => void;
  } = {};

  constructor(private apiKey: string) { }

  on<K extends keyof GeminiLiveClient['callbacks']>(
    event: K,
    callback: NonNullable<GeminiLiveClient['callbacks'][K]>
  ) {
    (this.callbacks as Record<string, unknown>)[String(event)] = callback as unknown;
  }

  off<K extends keyof GeminiLiveClient['callbacks']>(event: K) {
    delete this.callbacks[event];
  }

  private setConnectionState(state: ConnectionState) {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.callbacks.onConnectionStateChange?.(state);
      logger.info(`🔌 Connection state: ${state}`);
    }
  }

  async start(config: GeminiLiveConfig) {
    try {
      // Store config for reconnection
      this.lastConfig = config;
      this.shouldReconnect = true;
      this.manualDisconnect = false;
      this.reconnectAttempts = 0;

      await this.connect(config);
    } catch (error) {
      logger.error('Failed to start:', error);
      this.callbacks.onError?.(error as Error);
      this.setConnectionState('failed');
    }
  }

  private async connect(config: GeminiLiveConfig) {
    this.setConnectionState('connecting');

    try {
      // Initialize audio context
      if (!this.audioContext) {
        this.audioContext = new AudioContext({ sampleRate: 24000 });
      }

      // Connect to Gemini WebSocket
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = 'blob';

      // Setup WebSocket event handlers
      this.setupWebSocketHandlers();

    } catch (error) {
      logger.error('Connection failed:', error);
      throw error;
    }
  }

  private setupWebSocketHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      logger.info('✅ WebSocket connected');
      this.setConnectionState('connected');
      this.reconnectAttempts = 0; // Reset on successful connection

      // Send setup message
      if (this.lastConfig) {
        this.sendSetup(this.lastConfig);
      }

      // Start audio capture after setup
      setTimeout(() => {
        this.startAudioCapture();
      }, 500);

      // Resend any pending messages
      if (this.pendingMessages.length > 0) {
        logger.info(`📤 Resending ${this.pendingMessages.length} pending messages`);
        this.pendingMessages.forEach(msg => this.ws?.send(msg));
        this.pendingMessages = [];
      }

      this.callbacks.onCallStart?.();
    };

    this.ws.onmessage = async (event) => {
      try {
        // Handle binary data (audio)
        if (event.data instanceof Blob) {
          await this.handleBinaryMessage(event.data);
          return;
        }

        // Handle ArrayBuffer
        if (event.data instanceof ArrayBuffer) {
          const blob = new Blob([event.data]);
          await this.handleBinaryMessage(blob);
          return;
        }

        // Handle text data (JSON)
        if (typeof event.data === 'string') {
          const response = JSON.parse(event.data);
          this.handleServerMessage(response);
          return;
        }

        logger.warn('⚠️ Unknown message type:', typeof event.data);
      } catch (error) {
        logger.error('❌ Error handling message:', error);
      }
    };

    this.ws.onerror = (error) => {
      logger.error('❌ WebSocket error:', error);
      this.callbacks.onError?.(new Error('WebSocket connection failed'));
    };

    this.ws.onclose = (event) => {
      logger.info('🔌 WebSocket closed:', event.code, event.reason);

      // Clean up audio
      this.stopAudioCapture();

      // Attempt reconnection if not manually disconnected
      if (this.shouldReconnect && !this.manualDisconnect) {
        this.attemptReconnect();
      } else {
        this.setConnectionState('disconnected');
        this.callbacks.onCallEnd?.();
      }
    };
  }

  private async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('❌ Max reconnection attempts reached');
      this.setConnectionState('failed');
      this.callbacks.onError?.(
        new Error(`Failed to reconnect after ${this.maxReconnectAttempts} attempts`)
      );
      this.callbacks.onCallEnd?.();
      return;
    }

    this.reconnectAttempts++;
    this.setConnectionState('reconnecting');

    // Notify UI of reconnection attempt
    this.callbacks.onReconnecting?.(this.reconnectAttempts, this.maxReconnectAttempts);

    // Calculate exponential backoff delay
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);

    logger.info(
      `🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.reconnectTimeoutId = setTimeout(async () => {
      if (this.lastConfig && this.shouldReconnect) {
        try {
          await this.connect(this.lastConfig);
        } catch (error) {
          logger.error('Reconnection failed:', error);
          this.attemptReconnect(); // Try again
        }
      }
    }, delay);
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
        },
        tools: [
          {
            function_declarations: [
              {
                name: "create_interview",
                description: "Creates a new interview when all information is gathered.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    role: { type: "STRING" },
                    level: { type: "STRING" },
                    techstack: { type: "STRING" },
                    amount: { type: "NUMBER" }
                  },
                  required: ["role", "level"]
                }
              }
            ]
          }
        ]
      }
    };

    // Add system instruction
    if (config.systemInstruction) {
      const setupRecord = setupMessage.setup as Record<string, unknown>;
      setupRecord['system_instruction'] = {
        parts: [{ text: config.systemInstruction }]
      };
    }

    logger.info('📤 Sending setup');
    this.ws.send(JSON.stringify(setupMessage));
  }

  private async startAudioCapture() {
    // Don't start if already recording or if reconnecting
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      logger.info('🎙️ Audio capture already active');
      return;
    }

    try {
      logger.info('🎤 Requesting microphone access...');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'Your browser does not support microphone access. Please use Chrome, Firefox, or Edge.'
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      logger.info('✅ Microphone access granted');

      if (stream.getAudioTracks().length === 0) {
        throw new Error('No microphone input detected.');
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      this.mediaRecorder = new MediaRecorder(stream, { mimeType });

      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && this.connectionState === 'connected') {
          await this.sendAudioChunk(event.data);
        } else if (event.data.size > 0 && this.connectionState === 'reconnecting') {
          // Queue audio during reconnection (optional)
          logger.info('📦 Queuing audio chunk during reconnection');
        }
      };

      this.mediaRecorder.onerror = (event) => {
        logger.error('❌ MediaRecorder error:', event);
        this.callbacks.onError?.(new Error('Microphone recording failed.'));
      };

      this.mediaRecorder.start(250); // 250ms chunks
      logger.info('🎙️ Recording started');

    } catch (error) {
      logger.error('❌ Microphone access failed:', error);

      let errorMessage = 'Microphone access failed.';

      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
          case 'PermissionDeniedError':
            errorMessage = 'Microphone access denied. Please enable permissions in browser settings.';
            break;
          case 'NotFoundError':
          case 'DevicesNotFoundError':
            errorMessage = 'No microphone found. Please connect a microphone.';
            break;
          case 'NotReadableError':
          case 'TrackStartError':
            errorMessage = 'Microphone already in use. Close other applications using it.';
            break;
          case 'OverconstrainedError':
            errorMessage = 'Microphone does not meet requirements.';
            break;
          case 'SecurityError':
            errorMessage = 'Microphone blocked due to security restrictions. Use HTTPS.';
            break;
          default:
            errorMessage = `Microphone error: ${error.message}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      this.callbacks.onError?.(new Error(errorMessage));
    }
  }

  private stopAudioCapture() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      logger.info('🛑 Audio capture stopped');
    }
  }

  private async sendAudioChunk(blob: Blob) {
    try {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        logger.warn('⚠️ WebSocket not ready, skipping audio chunk');
        return;
      }

      const base64Audio = await this.blobToBase64(blob);

      if (!base64Audio || typeof base64Audio !== 'string') {
        logger.error('❌ Invalid base64 audio data');
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

    } catch (error) {
      logger.error('❌ Error sending audio:', error);
    }
  }

  private async handleBinaryMessage(blob: Blob) {
    try {
      logger.info('🔊 Binary audio data received, size:', blob.size);

      const arrayBuffer = await blob.arrayBuffer();

      if (this.audioContext) {
        try {
          const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
          this.audioQueue.push(audioBuffer);

          if (!this.isPlaying) {
            this.playNextInQueue();
          }
        } catch (decodeError) {
          logger.warn('⚠️ Could not decode binary audio:', decodeError);
        }
      }
    } catch (error) {
      logger.error('❌ Error handling binary message:', error);
    }
  }

  private handleServerMessage(response: {
    setupComplete?: boolean;
    serverContent?: {
      modelTurn?: { parts?: Array<{ text?: string; inlineData?: { data?: string; mimeType?: string } }> };
      turnComplete?: boolean;
    };
    toolCall?: unknown;
    error?: { message?: string } | string;
    [key: string]: unknown;
  }) {
    // Handle setup complete
    if (response.setupComplete) {
      logger.info('✅ Setup complete');
      return;
    }

    // Handle server content
    if (response.serverContent) {
      const modelTurn = response.serverContent.modelTurn;

      if (modelTurn?.parts) {
        for (const part of modelTurn.parts) {
          // Handle text transcript
          if (part.text) {
            logger.info('💬 AI said:', part.text);
            this.callbacks.onTranscript?.({
              role: 'assistant',
              content: part.text,
              timestamp: Date.now()
            });
          }

          // Handle audio response
          if (part.inlineData?.data && part.inlineData?.mimeType) {
            this.playAudio(part.inlineData.data, part.inlineData.mimeType);
          }
        }
      }

      if (response.serverContent.turnComplete) {
        logger.info('✅ Turn complete');
      }
    }

    // Handle tool calls
    if (response.toolCall) {
      this.callbacks.onToolCall?.(response.toolCall);
    }

    // Handle errors
    if (response.error) {
      logger.error('❌ Server error:', response.error);
      const errMsg = typeof response.error === 'string'
        ? response.error
        : response.error.message ?? 'Server error';
      this.callbacks.onError?.(new Error(errMsg));
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

      let audioBuffer: ArrayBuffer = bytes.buffer;

      // Convert PCM to WAV if needed
      if (mimeType?.includes('pcm')) {
        const format = this.parsePCMFormat(mimeType);
        audioBuffer = this.convertPCMToWav(bytes.buffer, format);
      }

      // Decode and queue
      const decodedAudio = await this.audioContext.decodeAudioData(audioBuffer);
      this.audioQueue.push(decodedAudio);

      if (!this.isPlaying) {
        this.playNextInQueue();
      }

    } catch (error) {
      logger.error('❌ Error playing audio:', error);
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
  }

  private parsePCMFormat(mimeType: string) {
    const params = mimeType.split(';');
    let sampleRate = 24000;
    const bitsPerSample = 16;

    for (const param of params) {
      if (param.includes('rate=')) {
        const rateValue = param.split('=')[1];
        if (rateValue) {
          sampleRate = parseInt(rateValue, 10);
        }
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
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        if (!base64) {
          reject(new Error('Failed to convert blob to base64'));
          return;
        }
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  stop() {
    logger.info('🛑 Stopping session...');

    // Mark as manual disconnect to prevent reconnection
    this.manualDisconnect = true;
    this.shouldReconnect = false;

    // Clear reconnection timeout
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    // Stop recording
    this.stopAudioCapture();

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

    this.setConnectionState('disconnected');
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

  // Expose connection state for UI
  getConnectionState(): ConnectionState {
    return this.connectionState;
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