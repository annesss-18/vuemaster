'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Session } from '@google/genai';

export interface TranscriptEntry {
    role: 'user' | 'model';
    content: string;
    timestamp: number;
}

interface InterviewContext {
    role: string;
    companyName?: string;
    level?: string;
    type?: string;
    techStack?: string[];
    questions?: string[];
    resumeText?: string;
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseLiveInterviewReturn {
    status: ConnectionStatus;
    error: string | null;
    transcript: TranscriptEntry[];
    isAIResponding: boolean;
    elapsedTime: number;
    connect: () => Promise<void>;
    disconnect: () => void;
    sendAudio: (base64Data: string) => void;
    onAudioReceived: (callback: (base64Data: string) => void) => void;
}

interface UseLiveInterviewOptions {
    sessionId: string;
    interviewContext: InterviewContext;
    onInterruption?: () => void;
}

/**
 * Hook for managing Gemini Live API WebSocket connection for live interviews.
 */
export function useLiveInterview(options: UseLiveInterviewOptions): UseLiveInterviewReturn {
    const { sessionId, interviewContext, onInterruption } = options;

    const [status, setStatus] = useState<ConnectionStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [isAIResponding, setIsAIResponding] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);

    const sessionRef = useRef<Session | null>(null);
    const audioCallbackRef = useRef<((base64Data: string) => void) | null>(null);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const currentTranscriptRef = useRef<string>('');
    const reconnectionAttemptsRef = useRef(0);
    const isIntentionalDisconnectRef = useRef(false);

    // Timer effect
    useEffect(() => {
        if (status === 'connected') {
            timerIntervalRef.current = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        } else {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        }

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, [status]);

    const handleMessage = useCallback((message: LiveServerMessage) => {
        // Handle interruption
        if (message.serverContent?.interrupted) {
            setIsAIResponding(false);
            currentTranscriptRef.current = '';
            onInterruption?.();
            return;
        }

        // Handle model turn (audio response)
        if (message.serverContent?.modelTurn?.parts) {
            setIsAIResponding(true);

            for (const part of message.serverContent.modelTurn.parts) {
                // Audio data
                if (part.inlineData?.data) {
                    audioCallbackRef.current?.(part.inlineData.data);
                }

                // Text transcript of model output
                if (part.text) {
                    currentTranscriptRef.current += part.text;
                }
            }
        }

        // Handle turn complete
        if (message.serverContent?.turnComplete) {
            setIsAIResponding(false);

            if (currentTranscriptRef.current) {
                setTranscript(prev => [...prev, {
                    role: 'model',
                    content: currentTranscriptRef.current,
                    timestamp: Date.now(),
                }]);
                currentTranscriptRef.current = '';
            }
        }

        // Handle input transcription
        if (message.serverContent?.inputTranscription) {
            const userText = message.serverContent.inputTranscription.text;
            if (userText) {
                setTranscript(prev => [...prev, {
                    role: 'user',
                    content: userText,
                    timestamp: Date.now(),
                }]);
            }
        }

        // Handle output transcription (alternative way to get model text)
        if (message.serverContent?.outputTranscription) {
            const modelText = message.serverContent.outputTranscription.text;
            if (modelText && !currentTranscriptRef.current) {
                setTranscript(prev => {
                    // Update last model entry if exists
                    const lastEntry = prev[prev.length - 1];
                    if (lastEntry?.role === 'model') {
                        return [
                            ...prev.slice(0, -1),
                            { ...lastEntry, content: lastEntry.content + modelText },
                        ];
                    }
                    return [...prev, {
                        role: 'model',
                        content: modelText,
                        timestamp: Date.now(),
                    }];
                });
            }
        }
    }, [onInterruption]);

    const connect = useCallback(async () => {
        try {
            setStatus('connecting');
            setError(null);
            isIntentionalDisconnectRef.current = false;

            // 1. Get ephemeral token from our API
            const tokenResponse = await fetch('/api/live/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    interviewContext,
                }),
            });

            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.json();
                throw new Error(errorData.error || 'Failed to get authentication token');
            }

            const { token, model } = await tokenResponse.json();

            // 2. Create GenAI client with ephemeral token
            // Ephemeral tokens require v1alpha API version
            const ai = new GoogleGenAI({
                apiKey: token,
                httpOptions: { apiVersion: 'v1alpha' }
            });

            // 3. Connect to Live API
            const session = await ai.live.connect({
                model: model,
                config: {
                    responseModalities: [Modality.AUDIO],
                },
                callbacks: {
                    onopen: () => {
                        console.log('Live API connection established');
                        setStatus('connected');
                        reconnectionAttemptsRef.current = 0; // Reset on success
                    },
                    onmessage: (message: LiveServerMessage) => {
                        handleMessage(message);
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live API error:', e);
                        setError(e.message || 'Unknown WebSocket error');
                        setStatus('error');
                    },
                    onclose: (e: CloseEvent) => {
                        console.log('Live API connection closed:', e.reason);
                        if (!isIntentionalDisconnectRef.current) {
                            setStatus('disconnected');
                            reconnect(); // Attempt to reconnect
                        } else {
                            setStatus('disconnected');
                        }
                    },
                },
            });

            sessionRef.current = session;

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Connection failed';
            setError(errorMessage);
            setStatus('error');
            throw err;
        }
    }, [sessionId, interviewContext, handleMessage]); // Added handleMessage dependency

    const reconnect = useCallback(async () => {
        const maxReconnectionAttempts = 5;
        const baseDelay = 1000;

        if (reconnectionAttemptsRef.current >= maxReconnectionAttempts) {
            setError('Failed to reconnect after multiple attempts');
            setStatus('error');
            return;
        }

        const delay = baseDelay * Math.pow(2, reconnectionAttemptsRef.current);
        reconnectionAttemptsRef.current += 1;

        console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectionAttemptsRef.current}/${maxReconnectionAttempts})`);

        await new Promise(resolve => setTimeout(resolve, delay));

        try {
            await connect();
        } catch (error) {
            console.error('Reconnection failed:', error);
            // Recursive call is safe here because of the async delay
            await reconnect();
        }
    }, [connect]);


    const disconnect = useCallback(() => {
        isIntentionalDisconnectRef.current = true;
        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
        setStatus('disconnected');
    }, []);

    const sendAudio = useCallback((base64Data: string) => {
        if (!sessionRef.current) {
            // console.warn('Session not available, audio not sent');
            return;
        }

        if (status !== 'connected') {
            // console.warn('Not connected, audio not sent. Status:', status);
            return;
        }

        try {
            sessionRef.current.sendRealtimeInput({
                audio: {
                    data: base64Data,
                    mimeType: 'audio/pcm;rate=16000',
                },
            });
        } catch (error) {
            console.error('Failed to send audio chunk:', error);
            // Consider reconnecting checks here if consistently failing
        }
    }, [status]);

    const onAudioReceived = useCallback((callback: (base64Data: string) => void) => {
        audioCallbackRef.current = callback;
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        status,
        error,
        transcript,
        isAIResponding,
        elapsedTime,
        connect,
        disconnect,
        sendAudio,
        onAudioReceived,
    };
}
