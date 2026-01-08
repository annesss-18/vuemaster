// app/api/vertex-ai/connection/route.ts (UPDATED WITH RATE LIMITING)
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/actions/auth.action';
import { getVertexAIAccessToken, getVertexAIWebSocketURL } from '@/lib/vertex-ai/auth';
import { getVertexAIModelPath, VERTEX_AI_CONFIG } from '@/lib/vertex-ai/config';
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
            logger.info('✅ Access token obtained successfully');
        } catch (error) {
            logger.error('❌ Failed to get Vertex AI access token:', error);

            let errorMessage = 'Authentication failed';

            if (error instanceof Error) {
                if (error.message.includes('private_key')) {
                    errorMessage = 'Invalid private key format. Check GOOGLE_CLOUD_PRIVATE_KEY environment variable.';
                } else if (error.message.includes('client_email')) {
                    errorMessage = 'Invalid client email. Check GOOGLE_CLOUD_CLIENT_EMAIL environment variable.';
                } else {
                    errorMessage = `Authentication error: ${error.message}`;
                }
            }

            return NextResponse.json(
                { error: errorMessage },
                { status: 500 }
            );
        }

        // 4. Construct Vertex AI WebSocket URL
        const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

        if (!projectId) {
            logger.error('❌ GOOGLE_CLOUD_PROJECT_ID not set');
            return NextResponse.json(
                { error: 'Server configuration error - GOOGLE_CLOUD_PROJECT_ID not set in environment variables' },
                { status: 500 }
            );
        }

        // Use Vertex AI endpoint format
        const host = `${location}-aiplatform.googleapis.com`;
        const wsUrl = `wss://${host}/ws/google.cloud.aiplatform.v1beta1.PredictionService.BidiPredict`;

        logger.info(`🔗 WebSocket URL constructed: ${wsUrl.substring(0, 50)}...`);

        // 5. Validate token before returning
        if (!accessToken || accessToken.length < 50) {
            logger.error('❌ Invalid access token format');
            return NextResponse.json(
                { error: 'Invalid access token generated. Check service account credentials.' },
                { status: 500 }
            );
        }

        logger.info('✅ Connection info prepared successfully');

        // 6. Return connection info
        return NextResponse.json({
            url: wsUrl,
            accessToken,
            config: {
                sessionId,
                systemInstruction,
                voice: voice || 'Charon',
                // Pass full model path for client to use
                model: getVertexAIModelPath(projectId, location),
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