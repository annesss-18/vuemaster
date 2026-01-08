// lib/vertex-ai/types.ts

/**
 * Connection states for Live API WebSocket
 */
export type LiveAPIConnectionState =
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'reconnecting'
    | 'failed';

/**
 * Message from user or assistant
 */
export interface LiveAPIMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

/**
 * Audio configuration
 */
export interface AudioConfig {
    sampleRate: number;
    channels: number;
    encoding: 'pcm' | 'opus';
}

/**
 * Session configuration
 */
export interface LiveAPISessionConfig {
    sessionId: string;
    systemInstruction: string;
    voice?: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede';
    enableTranscription?: boolean;
    model?: string;
}

/**
 * Server message types from Vertex AI
 */
export interface ServerContentMessage {
    setupComplete?: boolean;
    serverContent?: {
        modelTurn?: {
            parts?: Array<{
                text?: string;
                inlineData?: {
                    mimeType: string;
                    data: string;
                };
            }>;
        };
        turnComplete?: boolean;
        interrupted?: boolean;
    };
    toolCall?: unknown;
    error?: {
        message?: string;
        code?: string;
    };
}

/**
 * Client message types to Vertex AI
 */
export interface RealtimeInputMessage {
    realtime_input: {
        media_chunks: Array<{
            mime_type: string;
            data: string;
        }>;
    };
}

/**
 * Setup configuration message
 */
export interface SetupMessage {
    setup: {
        model: string;
        generation_config: {
            response_modalities: string[];
            speech_config: {
                voice_config: {
                    prebuilt_voice_config: {
                        voice_name: string;
                    };
                };
            };
        };
        system_instruction?: {
            parts: Array<{
                text: string;
            }>;
        };
    };
}

/**
 * Reconnection attempt info
 */
export interface ReconnectionAttempt {
    current: number;
    max: number;
}

/**
 * Event callbacks for Live API
 */
export interface LiveAPICallbacks {
    onConnectionStateChange?: (state: LiveAPIConnectionState) => void;
    onTranscript?: (message: LiveAPIMessage) => void;
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
    onError?: (error: Error) => void;
    onReconnecting?: (attempt: ReconnectionAttempt) => void;
}