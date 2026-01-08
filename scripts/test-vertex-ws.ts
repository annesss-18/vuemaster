
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { loadEnvConfig } from '@next/env';
import WebSocket from 'ws';

loadEnvConfig(process.cwd());

async function testWebSocket() {
    console.log('Starting Vertex AI (Google Cloud) WebSocket Test');

    try {
        const { getVertexAIAccessToken } = await import('@/lib/vertex-ai/auth');

        console.log('Getting access token...');
        const accessToken = await getVertexAIAccessToken();
        console.log('Access token obtained. Length: ' + accessToken.length);

        const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

        // Correct Vertex AI Endpoint
        const host = `${location}-aiplatform.googleapis.com`;
        const wsUrl = `wss://${host}/ws/google.cloud.aiplatform.v1beta1.PredictionService.BidiPredict`;

        const authenticatedUrl = `${wsUrl}?access_token=${accessToken}`; // Don't encode if not needed, but usually safe. The auth lib returns raw.
        // NOTE: Vertex AI might require access_token in the bearer header if using HTTP, but for WS it's query param.
        // Actually, let's try encoding it as before.
        const finalUrl = `${wsUrl}?access_token=${encodeURIComponent(accessToken)}`;

        console.log(`Connecting to: ${wsUrl}`);

        return new Promise<void>((resolve, reject) => {
            const ws = new WebSocket(finalUrl);

            ws.on('open', () => {
                console.log('WebSocket Connected Successfully!');

                // Correct Model Name for Vertex AI
                // Format: projects/{project}/locations/{location}/publishers/google/models/{model}
                const modelName = `projects/${projectId}/locations/${location}/publishers/google/models/gemini-2.0-flash-exp`;

                const setupConfig = {
                    setup: {
                        model: modelName,
                        generation_config: {
                            response_modalities: ['AUDIO'],
                        }
                    }
                };

                console.log('Sending setup config for model:', modelName);
                ws.send(JSON.stringify(setupConfig));

                setTimeout(() => {
                    console.log('Closing connection normally');
                    ws.close();
                    resolve();
                }, 2000);
            });

            ws.on('error', (err) => {
                console.log('WebSocket Error Event: ' + err.message);
                reject(err);
            });

            ws.on('close', (code, reason) => {
                console.log(`WebSocket closed. Code: ${code}, Reason: ${reason}`);
                if (code === 1008) {
                    console.log('Policy Violation Detected!');
                }
                if (code !== 1000 && code !== 1005) {
                    reject(new Error(`Closed with code ${code}`));
                } else {
                    resolve();
                }
            });

            ws.on('message', (data) => {
                console.log('Received message:', data.toString());
            });
        });

    } catch (error: any) {
        console.log('Test Failed Exception: ' + error.message);
        process.exit(1);
    }
}

testWebSocket();
