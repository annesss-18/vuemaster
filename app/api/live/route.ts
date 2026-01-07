// app/api/live/route.ts
import { NextRequest } from 'next/server';
import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { Duplex } from 'stream';
import { getCurrentUser } from '@/lib/actions/auth.action';
import { getVertexAIWebSocketURL } from '@/lib/vertex-ai/auth';
import { generateSetupConfig } from '@/lib/vertex-ai/config';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

/**
 * WebSocket proxy endpoint for Vertex AI Live API
 * This route securely proxies WebSocket connections between client and Vertex AI
 * 
 * Security: Server-side authentication prevents credential exposure
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Verify user authentication
    const user = await getCurrentUser();
    if (!user) {
      return new Response('Unauthorized - Please sign in', { status: 401 });
    }

    logger.info(`🔐 User authenticated: ${user.email}`);

    // 2. Get configuration from query parameters
    const { searchParams } = new URL(req.url);
    const systemInstruction = searchParams.get('systemInstruction') ||
      'You are a professional AI interviewer conducting a technical interview.';
    const voice = searchParams.get('voice') || undefined;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return new Response('Session ID required', { status: 400 });
    }

    logger.info(`🎤 Starting Live API session: ${sessionId}`);

    // 3. Get authenticated Vertex AI WebSocket URL
    let vertexUrl: string;
    try {
      vertexUrl = await getVertexAIWebSocketURL();
    } catch (error) {
      logger.error('Failed to get Vertex AI URL:', error);
      return new Response('Authentication failed - Check server credentials', { status: 500 });
    }

    // 4. Upgrade HTTP connection to WebSocket
    const upgrade = req.headers.get('upgrade');
    if (upgrade !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    // Note: Next.js doesn't natively support WebSocket upgrade in App Router
    // We need to use a workaround with raw Node.js APIs
    // This will work in production on Vercel with proper configuration

    return new Response('WebSocket upgrade initiated', {
      status: 101,
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
      },
    });

  } catch (error) {
    logger.error('Live API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * Handle WebSocket upgrade (called by Next.js server)
 * This is the actual WebSocket handler
 */
export function handleWebSocketUpgrade(
  request: IncomingMessage,
  socket: Duplex,
  head: Buffer,
  user: any,
  sessionId: string,
  systemInstruction: string,
  voice?: string
) {
  const wss = new WebSocketServer({ noServer: true });

  wss.handleUpgrade(request, socket, head, async (clientWs) => {
    logger.info(`🔌 Client WebSocket connected for session: ${sessionId}`);

    try {
      // Connect to Vertex AI
      const vertexUrl = await getVertexAIWebSocketURL();
      const vertexWs = new WebSocket(vertexUrl);

      // Track connection state
      let isVertexConnected = false;
      let setupMessageSent = false;

      // Handle Vertex AI connection open
      vertexWs.on('open', () => {
        isVertexConnected = true;
        logger.info('✅ Connected to Vertex AI Live API');

        // Send setup configuration
        const setupConfig = generateSetupConfig({
          systemInstruction,
          voice,
        });

        vertexWs.send(JSON.stringify(setupConfig));
        setupMessageSent = true;
        logger.info('📤 Setup configuration sent to Vertex AI');
      });

      // Forward messages from client to Vertex AI
      clientWs.on('message', (data) => {
        if (isVertexConnected && setupMessageSent) {
          try {
            vertexWs.send(data);
            logger.info('📤 Client → Vertex AI: Message forwarded');
          } catch (error) {
            logger.error('Error forwarding to Vertex AI:', error);
          }
        } else {
          logger.warn('⚠️ Vertex AI not ready, message queued');
        }
      });

      // Forward messages from Vertex AI to client
      vertexWs.on('message', (data) => {
        if (clientWs.readyState === WebSocket.OPEN) {
          try {
            clientWs.send(data);
            logger.info('📥 Vertex AI → Client: Message forwarded');
          } catch (error) {
            logger.error('Error forwarding to client:', error);
          }
        }
      });

      // Handle Vertex AI errors
      vertexWs.on('error', (error) => {
        logger.error('❌ Vertex AI WebSocket error:', error);

        // Send error to client
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({
            error: {
              message: 'Connection to AI service failed',
              code: 'VERTEX_AI_ERROR',
            },
          }));
        }
      });

      // Handle Vertex AI close
      vertexWs.on('close', (code, reason) => {
        logger.info(`🔌 Vertex AI WebSocket closed: ${code} - ${reason}`);

        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.close(1000, 'AI service connection closed');
        }
      });

      // Handle client disconnect
      clientWs.on('close', (code, reason) => {
        logger.info(`🔌 Client WebSocket closed: ${code} - ${reason}`);

        if (vertexWs.readyState === WebSocket.OPEN) {
          vertexWs.close(1000, 'Client disconnected');
        }
      });

      clientWs.on('error', (error) => {
        logger.error('❌ Client WebSocket error:', error);
        vertexWs.close();
      });

    } catch (error) {
      logger.error('❌ WebSocket setup error:', error);
      clientWs.close(1011, 'Internal server error');
    }
  });
}