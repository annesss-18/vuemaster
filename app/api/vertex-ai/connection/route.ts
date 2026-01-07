// app/api/vertex-ai/connection/route.ts (UPDATED WITH RATE LIMITING)
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/actions/auth.action';
import { getVertexAIAccessToken } from '@/lib/vertex-ai/auth';
import { withRateLimit } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const runtime = 'nodejs';

const connectionRequestSchema = z.object({
    sessionId: z.string().min(1, 'Session ID required'),
    systemInstruction: z.string().min(10, 'System instruction too short'),
    voice: z.enum(['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede']).optional(),
});

export const POST = withRateLimit(async (req: NextRequest) => {
    try {
        // 1. Verify authentication
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            );
        }

        logger.info(`🔐 User authenticated: ${user.email}`);

        // 2. Validate request body
        const body = await req.json();
        const validation = connectionRequestSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({
                error: 'Invalid request',
                details: validation.error.issues,
            }, { status: 400 });
        }

        const { sessionId, systemInstruction, voice } = validation.data;

        logger.info(`🎤 Creating connection for session: ${sessionId}`);

        // 3. Get authenticated access token
        let accessToken: string;
        try {
            accessToken = await getVertexAIAccessToken();
        } catch (error) {
            logger.error('Failed to get Vertex AI access token:', error);
            return NextResponse.json(
                { error: 'Authentication failed - Check server credentials' },
                { status: 500 }
            );
        }

        // 4. Construct Vertex AI WebSocket URL
        const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

        if (!projectId) {
            return NextResponse.json(
                { error: 'Server configuration error - Project ID not set' },
                { status: 500 }
            );
        }

        const wsUrl = `wss://${location}-aiplatform.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;

        // 5. Return connection info
        return NextResponse.json({
            url: wsUrl,
            accessToken,
            config: {
                sessionId,
                systemInstruction,
                voice: voice || 'Charon',
            },
        });

    } catch (error) {
        logger.error('Connection endpoint error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}, {
    maxRequests: 20,
    windowMs: 60 * 1000,
});