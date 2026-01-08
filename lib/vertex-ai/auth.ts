// lib/vertex-ai/auth.ts
import { GoogleAuth } from 'google-auth-library';
import { logger } from '@/lib/logger';

/**
 * Get OAuth2 access token for Vertex AI API
 * This token is used to authenticate WebSocket connections
 */
export async function getVertexAIAccessToken(): Promise<string> {
  try {
    // Initialize Google Auth with service account credentials
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/generative-language',
      ],
    });

    // Get authenticated client
    const client = await auth.getClient();

    // Request access token
    const accessTokenResponse = await client.getAccessToken();

    if (!accessTokenResponse.token) {
      throw new Error('Failed to obtain access token from Google Auth');
    }

    logger.info('✅ Vertex AI access token obtained successfully');
    return accessTokenResponse.token;

  } catch (error) {
    logger.error('❌ Failed to get Vertex AI access token:', error);

    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('private_key')) {
        throw new Error(
          'Invalid private key format. Ensure GOOGLE_CLOUD_PRIVATE_KEY is properly formatted with \\n characters.'
        );
      }
      if (error.message.includes('client_email')) {
        throw new Error(
          'Invalid client email. Check GOOGLE_CLOUD_CLIENT_EMAIL in your environment variables.'
        );
      }
    }

    throw new Error('Failed to authenticate with Vertex AI. Check your service account credentials.');
  }
}

/**
 * Get Vertex AI WebSocket URL with authentication
 * @returns Authenticated WebSocket URL for Live API
 */
export async function getVertexAIWebSocketURL(): Promise<string> {
  const accessToken = await getVertexAIAccessToken();

  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

  if (!projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT_ID not set in environment variables');
  }

  // Construct Vertex AI Live API WebSocket URL
  // Format: wss://{location}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.PredictionService.BidiPredict
  const host = `${location}-aiplatform.googleapis.com`;
  const wsUrl = `wss://${host}/ws/google.cloud.aiplatform.v1beta1.PredictionService.BidiPredict`;

  // Append access token as query parameter
  const authenticatedUrl = `${wsUrl}?access_token=${accessToken}`;

  logger.info(`🔗 Vertex AI WebSocket URL prepared for location: ${location}`);

  return authenticatedUrl;
}

/**
 * Validate that all required environment variables are present
 * Call this at application startup
 */
export function validateVertexAIConfig(): void {
  const requiredVars = [
    'GOOGLE_CLOUD_PROJECT_ID',
    'GOOGLE_CLOUD_LOCATION',
    'GOOGLE_CLOUD_CLIENT_EMAIL',
    'GOOGLE_CLOUD_PRIVATE_KEY',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables for Vertex AI: ${missingVars.join(', ')}`
    );
  }

  logger.info('✅ Vertex AI configuration validated');
}