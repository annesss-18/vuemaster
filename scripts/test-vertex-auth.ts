// scripts/test-vertex-auth.ts
// Test script to verify Vertex AI authentication works
// Run: npx tsx scripts/test-vertex-auth.ts

import { loadEnvConfig } from '@next/env';

// Load environment variables from .env.local before other imports
loadEnvConfig(process.cwd());

async function testAuthentication() {
  // Dynamic imports to ensure env vars are loaded before these modules read them
  const { getVertexAIAccessToken, validateVertexAIConfig } = await import('@/lib/vertex-ai/auth');
  const { VERTEX_AI_CONFIG } = await import('@/lib/vertex-ai/config');

  console.log('\n=== 🔍 Testing Vertex AI Authentication ===\n');

  try {
    // Step 1: Validate configuration
    console.log('Step 1: Validating environment configuration...');
    validateVertexAIConfig();
    console.log('✅ Environment configuration valid\n');

    // Step 2: Display configuration (without sensitive data)
    console.log('Step 2: Current configuration:');
    console.log(`  - Project ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID}`);
    console.log(`  - Location: ${VERTEX_AI_CONFIG.location}`);
    console.log(`  - Model: ${VERTEX_AI_CONFIG.model}`);
    console.log(`  - Voice: ${VERTEX_AI_CONFIG.voices.default}`);
    console.log(`  - Client Email: ${process.env.GOOGLE_CLOUD_CLIENT_EMAIL}\n`);

    // Step 3: Test authentication
    console.log('Step 3: Requesting access token from Google Auth...');
    const startTime = Date.now();
    const accessToken = await getVertexAIAccessToken();
    const duration = Date.now() - startTime;

    console.log(`✅ Access token obtained in ${duration}ms`);
    console.log(`  - Token length: ${accessToken.length} characters`);
    console.log(`  - Token preview: ${accessToken.substring(0, 20)}...${accessToken.substring(accessToken.length - 10)}\n`);

    // Step 4: Validate token format
    console.log('Step 4: Validating token format...');
    if (accessToken.length < 100) {
      throw new Error('Token seems too short - might be invalid');
    }
    console.log('✅ Token format looks valid\n');

    // Success summary
    console.log('=== ✅ Authentication Test Successful! ===\n');
    console.log('Your Vertex AI credentials are correctly configured.');
    console.log('You can now proceed to Step 4.\n');

  } catch (error) {
    console.error('\n=== ❌ Authentication Test Failed ===\n');

    if (error instanceof Error) {
      console.error('Error:', error.message);

      // Provide specific troubleshooting advice
      if (error.message.includes('private_key')) {
        console.error('\n🔧 Troubleshooting:');
        console.error('  - Check that GOOGLE_CLOUD_PRIVATE_KEY includes \\n characters');
        console.error('  - Ensure the key is wrapped in double quotes');
        console.error('  - Verify the key starts with "-----BEGIN PRIVATE KEY-----\\n"');
      } else if (error.message.includes('client_email')) {
        console.error('\n🔧 Troubleshooting:');
        console.error('  - Verify GOOGLE_CLOUD_CLIENT_EMAIL is correctly set');
        console.error('  - Ensure the email matches your service account');
      } else if (error.message.includes('project')) {
        console.error('\n🔧 Troubleshooting:');
        console.error('  - Verify GOOGLE_CLOUD_PROJECT_ID is set');
        console.error('  - Ensure the project exists in Google Cloud Console');
      }
    }

    console.error('\nPlease fix the issues and run the test again.\n');
    process.exit(1);
  }
}

// Run the test
testAuthentication();