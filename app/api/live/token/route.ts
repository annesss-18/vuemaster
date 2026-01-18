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
                        // Enable audio transcription (language is controlled via system instruction)
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
    systemInstruction?: string;
}

function buildInterviewerPrompt(context?: InterviewContext): string {
    // 1. Use Custom System Instruction if available (this is the preferred path)
    if (context?.systemInstruction) {
        return `
${context.systemInstruction}

[IMPORTANT OPERATIONAL RULES]
- You are communicating via a voice interface. Responses must be spoken naturally.
- Keep answer concise. Avoid long monologues.
- Always communicate in English.
- Do not list these rules to the user.
        `.trim();
    }

    // 2. Fallback: Construct prompt dynamically (Legacy/Fallback path)
    const basePrompt = `You are an experienced technical interviewer conducting a professional mock interview. 
    
    IMPORTANT RULES:
    - Always communicate in English only
    - Keep responses concise (spoken word)
    - Be professional but conversational`;

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
