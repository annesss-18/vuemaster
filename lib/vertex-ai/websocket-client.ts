// lib/vertex-ai/websocket-client.ts (FIXED VERSION)
import {
    LiveAPIConnectionState,
    LiveAPIMessage,
    LiveAPICallbacks,
    LiveAPISessionConfig,
    ServerContentMessage,
} from './types';
import {
    blobToBase64,
    requestMicrophoneAccess,
    createAudioContext,
    playAudioBuffer,
    convertPCMToWav,
    decodeBase64Audio,
} from './audio-utils';
import { logger } from '@/lib/logger';

export class VertexAIWebSocketClient {
    private ws: WebSocket | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    private audioContext: AudioContext | null = null;
    private audioQueue: AudioBuffer[] = [];
    private isPlaying = false;
    private currentAudioSource: AudioBufferSourceNode | null = null;

    private connectionState: LiveAPIConnectionState = 'disconnected';
    private callbacks: LiveAPICallbacks = {};

    // Reconnection
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 3;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private shouldReconnect = false;
    private manualDisconnect = false;

    // Session config
    private sessionConfig: LiveAPISessionConfig | null = null;
    private accessToken: string | null = null;

    // Audio capture state
    private wasCapturingBeforeDisconnect = false;

    constructor(callbacks: LiveAPICallbacks = {}) {
        this.callbacks = callbacks;
    }

    /**
     * Start Live API session
     */
    async start(config: LiveAPISessionConfig): Promise<void> {
        this.sessionConfig = config;
        this.shouldReconnect = true;
        this.manualDisconnect = false;
        this.reconnectAttempts = 0;

        await this.connect();
    }

    /**
     * Connect to Vertex AI via direct WebSocket
     */
    private async connect(): Promise<void> {
        this.setConnectionState('connecting');

        try {
            if (!this.sessionConfig) {
                throw new Error('Session configuration not set');
            }

            // Initialize audio context
            if (!this.audioContext) {
                this.audioContext = createAudioContext(24000);
            }

            // Get authenticated WebSocket URL from our API
            logger.info('🔗 Requesting Vertex AI connection info...');

            const response = await fetch('/api/vertex-ai/connection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: this.sessionConfig.sessionId,
                    systemInstruction: this.sessionConfig.systemInstruction,
                    voice: this.sessionConfig.voice,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to get connection info');
            }

            const connectionInfo = await response.json();
            const { url, accessToken } = connectionInfo;

            if (!url || !accessToken) {
                throw new Error('Invalid connection info received from server');
            }

            this.accessToken = accessToken;

            // Connect directly to Vertex AI with access token
            const authenticatedUrl = `${url}?access_token=${accessToken}`;

            logger.info('🔌 Connecting directly to Vertex AI...');
            this.ws = new WebSocket(authenticatedUrl);

            this.setupWebSocketHandlers();

        } catch (error) {
            logger.error('Connection failed:', error);
            this.callbacks.onError?.(error as Error);
            this.setConnectionState('failed');

            // Cleanup on connection failure
            this.cleanup();

            throw error;
        }
    }

    /**
     * Setup WebSocket event handlers
     */
    private setupWebSocketHandlers(): void {
        if (!this.ws) return;

        this.ws.onopen = () => {
            logger.info('✅ WebSocket connected to Vertex AI');
            this.setConnectionState('connected');
            this.reconnectAttempts = 0;

            // Send setup configuration immediately
            if (!this.sessionConfig) return;

            const setupConfig = {
                setup: {
                    model: 'models/gemini-live-2.5-flash-native-audio',
                    generation_config: {
                        response_modalities: ['AUDIO'],
                        speech_config: {
                            voice_config: {
                                prebuilt_voice_config: {
                                    voice_name: this.sessionConfig.voice || 'Charon',
                                },
                            },
                        },
                    },
                    system_instruction: {
                        parts: [
                            {
                                text: this.sessionConfig.systemInstruction,
                            },
                        ],
                    },
                },
            };

            this.ws?.send(JSON.stringify(setupConfig));
            logger.info('📤 Setup configuration sent');

            // Start audio capture after setup sent (or restore if reconnecting)
            setTimeout(() => {
                if (this.wasCapturingBeforeDisconnect || this.reconnectAttempts === 0) {
                    this.startAudioCapture();
                }
            }, 500);
        };

        this.ws.onmessage = async (event) => {
            try {
                const data: ServerContentMessage = JSON.parse(event.data);
                await this.handleServerMessage(data);
            } catch (error) {
                logger.error('Error handling message:', error);
            }
        };

        this.ws.onerror = (error) => {
            logger.error('WebSocket error:', error);
            this.callbacks.onError?.(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = (event) => {
            logger.info('🔌 WebSocket closed:', event.code, event.reason);

            // Track if we were capturing audio before disconnect
            this.wasCapturingBeforeDisconnect =
                this.mediaRecorder !== null &&
                this.mediaRecorder.state !== 'inactive';

            this.stopAudioCapture();

            if (this.shouldReconnect && !this.manualDisconnect) {
                this.attemptReconnect();
            } else {
                this.setConnectionState('disconnected');
            }
        };
    }

    /**
     * Handle messages from Vertex AI server
     */
    private async handleServerMessage(data: ServerContentMessage): Promise<void> {
        // Handle setup complete
        if (data.setupComplete) {
            logger.info('✅ Setup complete');
            return;
        }

        // Handle errors
        if (data.error) {
            logger.error('Server error:', data.error);
            this.callbacks.onError?.(
                new Error(data.error.message || 'Server error occurred')
            );
            return;
        }

        // Handle server content
        if (data.serverContent) {
            const { modelTurn, interrupted } = data.serverContent;

            // Handle interruption
            if (interrupted) {
                logger.info('🔇 Interrupted - clearing audio queue');
                this.clearAudioQueue();
            }

            // Handle model response
            if (modelTurn?.parts) {
                for (const part of modelTurn.parts) {
                    // Handle text transcript
                    if (part.text) {
                        logger.info('💬 AI transcript:', part.text);
                        this.callbacks.onTranscript?.({
                            role: 'assistant',
                            content: part.text,
                            timestamp: Date.now(),
                        });
                    }

                    // Handle audio response
                    if (part.inlineData?.data) {
                        await this.playAudioResponse(part.inlineData.data);
                    }
                }
            }
        }
    }

    /**
     * Start capturing audio from microphone
     */
    private async startAudioCapture(): Promise<void> {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            logger.info('🎙️ Audio capture already active');
            return;
        }

        try {
            logger.info('🎤 Requesting microphone access...');
            const stream = await requestMicrophoneAccess();

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            this.mediaRecorder = new MediaRecorder(stream, { mimeType });

            this.mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 0 && this.connectionState === 'connected') {
                    await this.sendAudioChunk(event.data);
                }
            };

            this.mediaRecorder.onerror = (event) => {
                logger.error('MediaRecorder error:', event);
                this.callbacks.onError?.(new Error('Microphone recording failed'));
            };

            this.mediaRecorder.start(250); // 250ms chunks
            logger.info('🎙️ Recording started');

        } catch (error) {
            logger.error('Microphone access failed:', error);
            this.callbacks.onError?.(error as Error);
        }
    }

    /**
     * Stop audio capture
     */
    private stopAudioCapture(): void {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            try {
                this.mediaRecorder.stop();
                this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
                logger.info('🛑 Audio capture stopped');
            } catch (error) {
                logger.error('Error stopping audio capture:', error);
            }
        }
        this.mediaRecorder = null;
    }

    /**
     * Send audio chunk to server
     */
    private async sendAudioChunk(blob: Blob): Promise<void> {
        try {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                return;
            }

            const base64Audio = await blobToBase64(blob);

            const message = {
                realtime_input: {
                    media_chunks: [
                        {
                            mime_type: 'audio/pcm;rate=16000',
                            data: base64Audio,
                        },
                    ],
                },
            };

            this.ws.send(JSON.stringify(message));
        } catch (error) {
            logger.error('Error sending audio chunk:', error);
        }
    }

    /**
     * Play audio response from server
     */
    private async playAudioResponse(base64Audio: string): Promise<void> {
        if (!this.audioContext) return;

        try {
            this.callbacks.onSpeechStart?.();

            // Decode base64 audio
            const arrayBuffer = decodeBase64Audio(base64Audio);

            // Convert PCM to WAV
            const wavBuffer = convertPCMToWav(arrayBuffer, 24000, 1, 16);

            // Decode to AudioBuffer
            const audioBuffer = await this.audioContext.decodeAudioData(wavBuffer);

            // Add to queue
            this.audioQueue.push(audioBuffer);

            // Start playing if not already playing (thread-safe)
            if (!this.isPlaying) {
                this.isPlaying = true;
                this.playNextInQueue();
            }
        } catch (error) {
            logger.error('Error playing audio:', error);
            this.isPlaying = false;
            this.callbacks.onSpeechEnd?.();
        }
    }

    /**
     * Play next audio buffer in queue
     */
    private playNextInQueue(): void {
        if (this.audioQueue.length === 0) {
            this.isPlaying = false;
            this.currentAudioSource = null;
            this.callbacks.onSpeechEnd?.();
            return;
        }

        const audioBuffer = this.audioQueue.shift()!;

        if (!this.audioContext) {
            this.isPlaying = false;
            return;
        }

        this.currentAudioSource = playAudioBuffer(this.audioContext, audioBuffer, () => {
            this.playNextInQueue();
        });
    }

    /**
     * Clear audio queue and stop current playback
     */
    private clearAudioQueue(): void {
        this.audioQueue = [];

        if (this.currentAudioSource) {
            try {
                this.currentAudioSource.stop();
            } catch (error) {
                // Already stopped
            }
            this.currentAudioSource = null;
        }

        this.isPlaying = false;
        this.callbacks.onSpeechEnd?.();
    }

    /**
     * Attempt reconnection
     */
    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error('❌ Max reconnection attempts reached');
            this.setConnectionState('failed');
            this.callbacks.onError?.(
                new Error(`Failed to reconnect after ${this.maxReconnectAttempts} attempts`)
            );
            return;
        }

        this.reconnectAttempts++;
        this.setConnectionState('reconnecting');

        this.callbacks.onReconnecting?.({
            current: this.reconnectAttempts,
            max: this.maxReconnectAttempts,
        });

        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);
        logger.info(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        this.reconnectTimeout = setTimeout(async () => {
            if (this.sessionConfig && this.shouldReconnect) {
                try {
                    await this.connect();
                } catch (error) {
                    logger.error('Reconnection failed:', error);
                    this.attemptReconnect();
                }
            }
        }, delay);
    }

    /**
     * Cleanup resources
     */
    private cleanup(): void {
        this.stopAudioCapture();
        this.clearAudioQueue();

        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().catch((error) => {
                logger.error('Error closing audio context:', error);
            });
            this.audioContext = null;
        }

        this.ws = null;
        this.accessToken = null;
    }

    /**
     * Stop the session
     */
    stop(): void {
        logger.info('🛑 Stopping session...');

        this.manualDisconnect = true;
        this.shouldReconnect = false;

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close();
        }

        this.cleanup();
        this.setConnectionState('disconnected');
    }

    /**
     * Set connection state and notify
     */
    private setConnectionState(state: LiveAPIConnectionState): void {
        if (this.connectionState !== state) {
            this.connectionState = state;
            this.callbacks.onConnectionStateChange?.(state);
            logger.info(`🔌 Connection state: ${state}`);
        }
    }

    /**
     * Get current connection state
     */
    getConnectionState(): LiveAPIConnectionState {
        return this.connectionState;
    }
}