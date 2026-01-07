// lib/hooks/useVertexLiveAPI.ts
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { VertexAIWebSocketClient } from '@/lib/vertex-ai/websocket-client';
import {
    LiveAPIConnectionState,
    LiveAPIMessage,
    ReconnectionAttempt,
} from '@/lib/vertex-ai/types';
import { logger } from '@/lib/logger';

export interface UseVertexLiveAPIProps {
    sessionId: string;
    systemInstruction: string;
    voice?: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede';
    enableTranscription?: boolean;
}

export interface UseVertexLiveAPIReturn {
    // Connection state
    connectionState: LiveAPIConnectionState;
    isConnected: boolean;
    isConnecting: boolean;
    isReconnecting: boolean;
    isSpeaking: boolean;

    // Messages
    messages: LiveAPIMessage[];

    // Error state
    error: string | null;
    reconnectAttempt: ReconnectionAttempt | null;

    // Control functions
    connect: () => Promise<void>;
    disconnect: () => void;
}

/**
 * React hook for Vertex AI Live API
 * Manages WebSocket connection, audio streaming, and state
 */
export function useVertexLiveAPI({
    sessionId,
    systemInstruction,
    voice = 'Charon',
    enableTranscription = true,
}: UseVertexLiveAPIProps): UseVertexLiveAPIReturn {
    // State
    const [connectionState, setConnectionState] = useState<LiveAPIConnectionState>('disconnected');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [messages, setMessages] = useState<LiveAPIMessage[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [reconnectAttempt, setReconnectAttempt] = useState<ReconnectionAttempt | null>(null);

    // Refs
    const clientRef = useRef<VertexAIWebSocketClient | null>(null);
    const hasInitialized = useRef(false);

    // Initialize WebSocket client
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        logger.info('🎬 Initializing Vertex AI Live API client');

        clientRef.current = new VertexAIWebSocketClient({
            onConnectionStateChange: (state) => {
                setConnectionState(state);

                if (state === 'connected') {
                    setError(null);
                    setReconnectAttempt(null);
                }
            },

            onTranscript: (message) => {
                setMessages((prev) => [...prev, message]);
            },

            onSpeechStart: () => {
                setIsSpeaking(true);
            },

            onSpeechEnd: () => {
                setIsSpeaking(false);
            },

            onError: (err) => {
                logger.error('Live API error:', err);
                setError(err.message);
            },

            onReconnecting: (attempt) => {
                setReconnectAttempt(attempt);
            },
        });

        // Cleanup on unmount
        return () => {
            if (clientRef.current) {
                clientRef.current.stop();
                clientRef.current = null;
            }
        };
    }, []);

    // Connect function
    const connect = useCallback(async () => {
        if (!clientRef.current) {
            setError('WebSocket client not initialized');
            return;
        }

        if (connectionState === 'connected' || connectionState === 'connecting') {
            logger.warn('Already connected or connecting');
            return;
        }

        setError(null);
        setMessages([]);

        try {
            await clientRef.current.start({
                sessionId,
                systemInstruction,
                voice,
                enableTranscription,
            });
        } catch (err) {
            logger.error('Failed to connect:', err);
            setError(err instanceof Error ? err.message : 'Failed to connect');
        }
    }, [sessionId, systemInstruction, voice, enableTranscription, connectionState]);

    // Disconnect function
    const disconnect = useCallback(() => {
        if (!clientRef.current) return;

        logger.info('🛑 Disconnecting from Live API');
        clientRef.current.stop();
        setConnectionState('disconnected');
        setIsSpeaking(false);
        setReconnectAttempt(null);
    }, []);

    // Derived state
    const isConnected = connectionState === 'connected';
    const isConnecting = connectionState === 'connecting';
    const isReconnecting = connectionState === 'reconnecting';

    return {
        connectionState,
        isConnected,
        isConnecting,
        isReconnecting,
        isSpeaking,
        messages,
        error,
        reconnectAttempt,
        connect,
        disconnect,
    };
}