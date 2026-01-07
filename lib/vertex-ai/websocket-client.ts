// lib/vertex-ai/websocket-client.ts
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
     * Connect to WebSocket proxy
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

            // Get WebSocket URL from our API
            const params = new URLSearchParams({
                sessionId: this.sessionConfig.sessionId,
                systemInstruction: this.sessionConfig.systemInstruction,
                ...(this.sessionConfig.voice && { voice: this.sessionConfig.voice }),
            });

            const response = await fetch(`/api/live?${params.toString()}`);

            if (!response.ok) {
                let errorMessage = 'Failed to get connection info';
                try {
                    const error = await response.json();
                    errorMessage = error.error || errorMessage;
                } catch {
                    // Response is not JSON, try to get text
                    const text = await response.text();
                    errorMessage = text.substring(0, 200);
                }
                throw new Error(errorMessage);
            }

            let connectionInfo;
            try {
                connectionInfo = await response.json();
            } catch (parseError) {
                const text = await response.text();
                logger.error('Failed to parse JSON response:', text.substring(0, 200));
                throw new Error('Server returned invalid response. Check server logs.');
            }

            const vertexUrl = connectionInfo.url;

            if (!vertexUrl) {
                throw new Error('No WebSocket URL returned from server');
            }

            logger.info('🔌 Connecting directly to Vertex AI:', vertexUrl.substring(0, 50) + '...');

            this.ws = new WebSocket(vertexUrl);
            this.setupWebSocketHandlers();

        } catch (error) {
            logger.error('Connection failed:', error);
            this.callbacks.onError?.(error as Error);
            this.setConnectionState('failed');
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

            // Start audio capture after setup sent
            setTimeout(() => {
                this.startAudioCapture();
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
                this.audioQueue = [];
                this.isPlaying = false;
                this.callbacks.onSpeechEnd?.();
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
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            logger.info('🛑 Audio capture stopped');
        }
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

            // Start playing if not already playing
            if (!this.isPlaying) {
                this.playNextInQueue();
            }
        } catch (error) {
            logger.error('Error playing audio:', error);
            this.callbacks.onSpeechEnd?.();
        }
    }

    /**
     * Play next audio buffer in queue
     */
    private playNextInQueue(): void {
        if (this.audioQueue.length === 0) {
            this.isPlaying = false;
            this.callbacks.onSpeechEnd?.();
            return;
        }

        this.isPlaying = true;
        const audioBuffer = this.audioQueue.shift()!;

        if (!this.audioContext) return;

        playAudioBuffer(this.audioContext, audioBuffer, () => {
            this.playNextInQueue();
        });
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

        this.stopAudioCapture();

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close();
            this.ws = null;
        }

        this.audioQueue = [];
        this.isPlaying = false;

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

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