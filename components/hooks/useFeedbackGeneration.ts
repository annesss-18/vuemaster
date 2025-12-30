'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { GeminiMessage } from '@/lib/gemini-live';
import { logger } from '@/lib/logger';

export interface UseFeedbackGenerationProps {
    interviewId?: string;
    userId?: string;
}

export function useFeedbackGeneration({ interviewId, userId }: UseFeedbackGenerationProps) {
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateFeedback = useCallback(async (transcript: GeminiMessage[]) => {
        if (!interviewId || !userId) {
            setError('Missing interview or user information.');
            return false;
        }

        if (transcript.length === 0) {
            setError('No conversation recorded.');
            return false;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const formattedTranscript = transcript.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    interviewId,
                    transcript: formattedTranscript
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to generate feedback');
            }

            if (data.success && data.feedbackId) {
                // Navigate to feedback page
                router.push(`/interview/session/${interviewId}/feedback`);
                return true;
            } else {
                throw new Error('Feedback generation returned failure');
            }

        } catch (err) {
            logger.error('Feedback generationerror:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate feedback');
            setIsGenerating(false);
            return false;
        }
    }, [interviewId, userId, router]);
    return {
        isGenerating,
        error,
        generateFeedback
    };
}