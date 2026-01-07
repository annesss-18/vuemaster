// lib/hooks/useInterviewLiveAPI.ts
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useVertexLiveAPI } from './useVertexLiveAPI';
import type { LiveAPIMessage } from '@/lib/vertex-ai/types';

export interface UseInterviewLiveAPIProps {
    interviewId: string;
    jobTitle: string;
    jobLevel: string;
    jobDescription: string;
    questions: string[];
    resumeText?: string;
    userName: string;
    userId?: string;
}

/**
 * Interview-specific hook that wraps Live API with interview logic
 */
export function useInterviewLiveAPI({
    interviewId,
    jobTitle,
    jobLevel,
    jobDescription,
    questions,
    resumeText,
    userName,
    userId,
}: UseInterviewLiveAPIProps) {
    const router = useRouter();
    const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
    const hasGeneratedFeedback = useRef(false);

    // Build comprehensive system instruction for interview
    const systemInstruction = `
You are an expert technical interviewer conducting a ${jobLevel} ${jobTitle} interview.

INTERVIEW CONTEXT:
- Candidate Name: ${userName}
- Target Role: ${jobTitle} (${jobLevel} level)
- Interview Type: Professional technical assessment

JOB DESCRIPTION:
${jobDescription.substring(0, 3000)}

INTERVIEW QUESTIONS (use these as guidance, ask naturally):
${questions.slice(0, 10).map((q, i) => `${i + 1}. ${q}`).join('\n')}

${resumeText ? `
CANDIDATE BACKGROUND (For context - DO NOT read verbatim):
${resumeText.substring(0, 2000)}
` : ''}

INSTRUCTIONS:
1. Start with a warm, professional greeting introducing yourself
2. Ask the prepared questions one at a time, naturally and conversationally
3. Listen carefully to answers and ask thoughtful follow-up questions
4. Keep responses concise and professional (2-3 sentences max per turn)
5. Evaluate technical depth, problem-solving approach, and communication clarity
6. If the candidate seems stuck, provide gentle hints without giving away answers
7. After covering 5-7 key questions thoroughly (approximately 20-25 minutes), conclude professionally
8. Thank them for their time and inform them they'll receive detailed feedback

IMPORTANT REMINDERS:
- Be encouraging but maintain professional standards
- Focus on understanding their thought process, not just correct answers
- Natural conversation flow is more important than rigid question ordering
- Keep your responses brief to allow candidate to elaborate
`.trim();

    // Use the base Live API hook
    const liveAPI = useVertexLiveAPI({
        sessionId: interviewId,
        systemInstruction,
        voice: 'Charon',
        enableTranscription: true,
    });

    // Auto-generate feedback when interview ends
    useEffect(() => {
        const shouldGenerateFeedback =
            liveAPI.connectionState === 'disconnected' &&
            liveAPI.messages.length > 0 &&
            !hasGeneratedFeedback.current &&
            !isGeneratingFeedback;

        if (shouldGenerateFeedback) {
            generateFeedback();
        }
    }, [liveAPI.connectionState, liveAPI.messages.length]);

    /**
     * Generate feedback after interview completes
     */
    const generateFeedback = useCallback(async () => {
        if (!userId || hasGeneratedFeedback.current) return;

        hasGeneratedFeedback.current = true;
        setIsGeneratingFeedback(true);

        try {
            // Format transcript for feedback generation
            const transcript = liveAPI.messages.map(msg => ({
                role: msg.role,
                content: msg.content,
            }));

            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    interviewId,
                    transcript,
                }),
            });

            const data = await response.json();

            if (data.success && data.feedbackId) {
                // Navigate to feedback page
                router.push(`/interview/session/${interviewId}/feedback`);
            } else {
                throw new Error(data.message || 'Feedback generation failed');
            }
        } catch (error) {
            console.error('Feedback generation error:', error);
            setIsGeneratingFeedback(false);
            // Allow user to manually retry or navigate away
        }
    }, [interviewId, userId, liveAPI.messages, router]);

    return {
        ...liveAPI,
        isGeneratingFeedback,
        generateFeedback,
    };
}