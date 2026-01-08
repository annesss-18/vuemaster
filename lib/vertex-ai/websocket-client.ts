// lib/vertex-ai/websocket-client.ts (FIXED VERSION - Enhanced Error Handling)
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
    private wsUrl: string | null = null;

    // Audio capture state
    private wasCapturingBeforeDisconnect = false;

    // Connection timeout
    private connectionTimeout: NodeJS.Timeout | null = null;
    private readonly CONNECTION_TIMEOUT_MS = 30000; // 30 seconds

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

        // Clear any existing timeout
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
        }

        // Set connection timeout
        this.connectionTimeout = setTimeout(() => {
            logger.error('❌ Connection timeout after 30 seconds');
            if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
                this.ws.close();
            }
            this.callbacks.onError?.(new Error('Connection timeout. Please check your network and try again.'));
            this.setConnectionState('failed');
        }, this.CONNECTION_TIMEOUT_MS);

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
                const errorText = await response.text();
                let errorMessage = 'Failed to get connection info';

                try {
                    const error = JSON.parse(errorText);
                    errorMessage = error.error || errorMessage;
                } catch {
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }

                throw new Error(errorMessage);
            }

            const connectionInfo = await response.json();
            const { url, accessToken } = connectionInfo;

            if (!url || !accessToken) {
                throw new Error('Invalid connection info: Missing URL or access token');
            }

            this.accessToken = accessToken;
            this.wsUrl = url;

            // Construct authenticated WebSocket URL
            const authenticatedUrl = `${url}?access_token=${encodeURIComponent(accessToken)}`;

            logger.info('🔌 Connecting directly to Vertex AI...');
            logger.info(`📍 WebSocket URL: ${url.substring(0, 50)}...`);

            // Create WebSocket connection
            this.ws = new WebSocket(authenticatedUrl);

            // Set binary type for audio data
            this.ws.binaryType = 'arraybuffer';

            this.setupWebSocketHandlers();

        } catch (error) {
            logger.error('❌ Connection failed:', error);

            // Clear timeout
            if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout);
                this.connectionTimeout = null;
            }

            // Provide detailed error information
            let errorMessage = 'Failed to connect to Vertex AI';

            if (error instanceof Error) {
                errorMessage = error.message;

                // Add specific troubleshooting hints
                if (error.message.includes('fetch')) {
                    errorMessage += '\n\nTroubleshooting:\n- Check your internet connection\n- Verify the API endpoint is accessible\n- Check browser console for CORS errors';
                } else if (error.message.includes('token')) {
                    errorMessage += '\n\nTroubleshooting:\n- Service account credentials may be invalid\n- Check environment variables in .env.local\n- Verify Google Cloud project permissions';
                } else if (error.message.includes('timeout')) {
                    errorMessage += '\n\nTroubleshooting:\n- Network connection is slow or unstable\n- Try again in a moment\n- Check if firewall is blocking WebSocket connections';
                }
            }

            this.callbacks.onError?.(new Error(errorMessage));
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

            // Clear connection timeout
            if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout);
                this.connectionTimeout = null;
            }

            this.setConnectionState('connected');
            this.reconnectAttempts = 0;

            // Send setup configuration immediately
            if (!this.sessionConfig) return;

            const setupConfig = {
                setup: {
                    model: this.sessionConfig.model || 'models/gemini-2.0-flash-exp',
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

            try {
                this.ws?.send(JSON.stringify(setupConfig));
                logger.info('📤 Setup configuration sent');
            } catch (error) {
                logger.error('❌ Failed to send setup config:', error);
                this.callbacks.onError?.(new Error('Failed to initialize session'));
                return;
            }

            // Start audio capture after setup sent (or restore if reconnecting)
            setTimeout(() => {
                if (this.wasCapturingBeforeDisconnect || this.reconnectAttempts === 0) {
                    this.startAudioCapture().catch(error => {
                        logger.error('Failed to start audio capture:', error);
                    });
                }
            }, 500);
        };

        this.ws.onmessage = async (event) => {
            try {
                const data: ServerContentMessage = JSON.parse(event.data);
                await this.handleServerMessage(data);
            } catch (error) {
                logger.error('Error handling message:', error);
                // Don't throw - continue processing other messages
            }
        };

        this.ws.onerror = (event) => {
            logger.error('❌ WebSocket error event:', {
                type: event.type,
                target: event.target,
                readyState: this.ws?.readyState,
            });

            // Clear connection timeout
            if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout);
                this.connectionTimeout = null;
            }

            // Provide detailed error message
            let errorMessage = 'WebSocket connection failed';

            if (this.ws) {
                switch (this.ws.readyState) {
                    case WebSocket.CONNECTING:
                        errorMessage = 'Connection failed while connecting. Check your network and credentials.';
                        break;
                    case WebSocket.CLOSING:
                        errorMessage = 'Connection closed unexpectedly.';
                        break;
                    case WebSocket.CLOSED:
                        errorMessage = 'Connection closed. Will attempt to reconnect.';
                        break;
                }
            }

            // Check for common issues
            if (!this.accessToken) {
                errorMessage += '\n\nMissing access token - authentication failed.';
            }

            this.callbacks.onError?.(new Error(errorMessage));
        };

        this.ws.onclose = (event) => {
            logger.info('🔌 WebSocket closed:', {
                code: event.code,
                reason: event.reason || 'No reason provided',
                wasClean: event.wasClean,
            });

            // Clear connection timeout
            if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout);
                this.connectionTimeout = null;
            }

            // Track if we were capturing audio before disconnect
            this.wasCapturingBeforeDisconnect =
                this.mediaRecorder !== null &&
                this.mediaRecorder.state !== 'inactive';

            this.stopAudioCapture();

            // Handle different close codes
            let shouldAttemptReconnect = this.shouldReconnect && !this.manualDisconnect;

            switch (event.code) {
                case 1000: // Normal closure
                    logger.info('✅ Normal connection closure');
                    shouldAttemptReconnect = false;
                    break;
                case 1001: // Going away
                    logger.info('🔄 Server going away - will reconnect');
                    break;
                case 1006: // Abnormal closure
                    logger.warn('⚠️ Abnormal closure - connection lost');
                    break;
                case 1008: // Policy violation
                    logger.error('❌ Policy violation - check credentials');
                    shouldAttemptReconnect = false;
                    this.callbacks.onError?.(new Error('Authentication failed. Please check your credentials.'));
                    break;
                case 1011: // Server error
                    logger.error('❌ Server error occurred');
                    break;
                default:
                    logger.warn(`⚠️ Unexpected close code: ${event.code}`);
            }

            if (shouldAttemptReconnect) {
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
            logger.error('❌ Server error:', data.error);
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
                logger.error('❌ MediaRecorder error:', event);
                this.callbacks.onError?.(new Error('Microphone recording failed'));
            };

            this.mediaRecorder.start(250); // 250ms chunks
            logger.info('✅ Recording started');

        } catch (error) {
            logger.error('❌ Microphone access failed:', error);
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
                logger.warn('⚠️ Cannot send audio - WebSocket not open');
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
                new Error(`Failed to reconnect after ${this.maxReconnectAttempts} attempts. Please refresh the page.`)
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

        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }

        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().catch((error) => {
                logger.error('Error closing audio context:', error);
            });
            this.audioContext = null;
        }

        this.ws = null;
        this.accessToken = null;
        this.wsUrl = null;
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

        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close(1000, 'User disconnected');
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
