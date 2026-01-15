// app/api/live/token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';
import type { User } from '@/types';
import { GoogleGenAI, Modality } from '@google/genai';

const client = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const POST = withAuth(async (req: NextRequest, user: User) => {
    try {
        const body = await req.json();
        const { sessionId, interviewContext } = body;

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Session ID is required' },
                { status: 400 }
            );
        }

        logger.info(`Generating ephemeral token for user ${user.id}, session ${sessionId}`);

        // Token expires in 30 minutes
        const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

        // Build system instruction for the AI interviewer
        const systemInstruction = buildInterviewerPrompt(interviewContext);

        // Create ephemeral token with Live API constraints
        const token = await client.authTokens.create({
            config: {
                uses: 1,
                expireTime: expireTime,
                liveConnectConstraints: {
                    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                    config: {
                        systemInstruction: systemInstruction,
                        temperature: 0.7,
                        responseModalities: [Modality.AUDIO],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: 'Kore',
                                },
                            },
                        },
                        inputAudioTranscription: {},
                        outputAudioTranscription: {},
                    },
                },
                httpOptions: {
                    apiVersion: 'v1alpha',
                },
            },
        });

        logger.info(`Ephemeral token created for session ${sessionId}`);

        return NextResponse.json({
            success: true,
            token: token.name,
            expiresAt: expireTime,
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        });

    } catch (error) {
        logger.error('Error generating ephemeral token:', error);

        if (error instanceof Error) {
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to generate authentication token' },
            { status: 500 }
        );
    }
}, {
    maxRequests: 10,
    windowMs: 60 * 1000,
});

interface InterviewContext {
    role: string;
    companyName?: string;
    level?: string;
    type?: string;
    techStack?: string[];
    questions?: string[];
    resumeText?: string;
}

function buildInterviewerPrompt(context?: InterviewContext): string {
    const basePrompt = `You are an experienced technical interviewer conducting a professional mock interview. Your role is to:

1. Ask thoughtful, probing questions based on the candidate's responses
2. Maintain a professional but friendly tone
3. Give the candidate time to think and respond
4. Ask follow-up questions to dig deeper into their answers
5. Evaluate their communication, technical knowledge, and problem-solving skills

Interview Guidelines:
- Start with a brief introduction and set expectations
- Ask one question at a time and wait for the response
- Use follow-up questions to explore answers in more depth
- Be encouraging but also challenging when appropriate
- Conclude by asking if the candidate has any questions`;

    if (!context) {
        return basePrompt;
    }

    let specificPrompt = basePrompt + '\n\nInterview Context:\n';

    if (context.role) {
        specificPrompt += `- Position: ${context.role}\n`;
    }
    if (context.companyName) {
        specificPrompt += `- Company: ${context.companyName}\n`;
    }
    if (context.level) {
        specificPrompt += `- Experience Level: ${context.level}\n`;
    }
    if (context.type) {
        specificPrompt += `- Interview Type: ${context.type}\n`;
    }
    if (context.techStack && context.techStack.length > 0) {
        specificPrompt += `- Tech Stack to Cover: ${context.techStack.join(', ')}\n`;
    }
    if (context.questions && context.questions.length > 0) {
        specificPrompt += `\nSuggested Questions to Cover:\n`;
        context.questions.forEach((q, i) => {
            specificPrompt += `${i + 1}. ${q}\n`;
        });
    }
    if (context.resumeText) {
        specificPrompt += `\nCandidate's Resume Summary:\n${context.resumeText.slice(0, 2000)}\n`;
    }

    return specificPrompt;
}
