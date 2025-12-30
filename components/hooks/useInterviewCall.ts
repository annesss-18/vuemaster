'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getGeminiLiveClient, type GeminiMessage, type ConnectionState } from '@/lib/gemini-live';
import { logger } from '@/lib/logger';

export interface UseInterviewCallProps {
    userName: string;
    jobTitle?: string;
    jobLevel?: string;
    jobDescription?: string;
    questions?: string[];
    resumeText?: string;
}

export function useInterviewCall({
    userName,
    jobTitle,
    jobLevel,
    jobDescription,
    questions,
    resumeText
}: UseInterviewCallProps) {
    const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [messages, setMessages] = useState<GeminiMessage[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [reconnectAttempt, setReconnectAttempt] = useState<{ current: number; max: number } | null>(null);

    const geminiClient = useRef(getGeminiLiveClient());
    const hasSetupListeners = useRef(false);

    // Setup event listeners once
    useEffect(() => {
        if (hasSetupListeners.current) return;
        hasSetupListeners.current = true;

        const client = geminiClient.current;

        client.on('onConnectionStateChange', (state) => {
            setConnectionState(state);
            if (state === 'connected') {
                setError(null);
                setReconnectAttempt(null);
            }
        });

        client.on('onTranscript', (message: GeminiMessage) => {
            setMessages((prev) => [...prev, message]);
        });

        client.on('onSpeechStart', () => setIsSpeaking(true));
        client.on('onSpeechEnd', () => setIsSpeaking(false));

        client.on('onError', (err: Error) => {
            logger.error('Interview call error:', err);
            setError(err.message);
        });

        client.on('onReconnecting', (attempt, max) => {
            setReconnectAttempt({ current: attempt, max });
        });

        return () => {
            client.off('onConnectionStateChange');
            client.off('onTranscript');
            client.off('onSpeechStart');
            client.off('onSpeechEnd');
            client.off('onError');
            client.off('onReconnecting');
        };
    }, []);

    const startCall = useCallback(async () => {
        // Validation
        if (!jobTitle || !jobDescription || !questions || questions.length === 0) {
            const missing = [];
            if (!jobTitle) missing.push('job title');
            if (!jobDescription) missing.push('job description');
            if (!questions || questions.length === 0) missing.push('interview questions');

            const errorMsg = `Cannot start interview - missing ${missing.join(', ')}.`;
            setError(errorMsg);
            return;
        }

        setError(null);
        setMessages([]);

        try {
            const systemInstruction = `
You are an expert technical interviewer conducting a ${jobLevel || ''} ${jobTitle} interview.

INTERVIEW CONTEXT:
- Candidate Name: ${userName}
- Target Role: ${jobTitle} ${jobLevel ? `(${jobLevel} level)` : ''}
- Interview Type: Professional technical assessment

JOB DESCRIPTION:
${jobDescription.substring(0, 3000)}

PREPARED QUESTIONS (use these as guidance, ask follow-ups naturally):
${questions.slice(0, 10).map((q, i) => `${i + 1}. ${q}`).join('\n')}

${resumeText ? `
CANDIDATE RESUME (For reference - DO NOT read aloud):
${resumeText.substring(0, 2000)}
` : ''}

INSTRUCTIONS:
1. Start with a warm, professional greeting
2. Ask prepared questions one at a time, naturally
3. Listen carefully and ask relevant follow-up questions
4. Keep the conversation professional yet friendly
5. Note technical details, problem-solving approach, and communication
6. If candidate seems stuck, provide gentle guidance without giving answers
7. Conclude professionally when key areas are covered (around 20-30 minutes)

Remember: You're evaluating technical competency AND communication skills.
      `.trim();

            await geminiClient.current.start({
                systemInstruction,
                voice: 'Charon',
                model: 'gemini-2.0-flash-exp'
            });

        } catch (err) {
            logger.error('Failed to start call:', err);
            const errorMsg = err instanceof Error ? err.message : 'Failed to start interview';
            setError(errorMsg);
        }
    }, [userName, jobTitle, jobLevel, jobDescription, questions, resumeText]);

    const endCall = useCallback(() => {
        geminiClient.current.stop();
    }, []);

    const sendMessage = useCallback((text: string) => {
        try {
            geminiClient.current.sendText(text);
        } catch (err) {
            logger.error('Failed to send message:', err);
            setError('Failed to send message');
        }
    }, []);

    return {
        connectionState,
        isSpeaking,
        messages,
        error,
        reconnectAttempt,
        startCall,
        endCall,
        sendMessage,
        isConnected: connectionState === 'connected',
        isConnecting: connectionState === 'connecting',
        isReconnecting: connectionState === 'reconnecting',
    };
}