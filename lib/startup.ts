// lib/startup.ts
/**
 * Application startup validation and initialization
 * Import this in your root layout or middleware
 */

import { validateEnvironment } from './env-validation';
import { validateVertexAIConfig } from './vertex-ai/auth';
import { logger } from './logger';

let hasInitialized = false;

/**
 * Run all startup validations
 * Call this once at application startup
 */
export async function initializeApplication(): Promise<void> {
    if (hasInitialized) {
        return;
    }

    logger.info('🚀 Initializing VueMaster application...');

    try {
        // 1. Validate environment variables
        logger.info('📋 Step 1/3: Validating environment variables...');
        validateEnvironment(false); // Warn but don't throw

        // 2. Validate Vertex AI configuration
        logger.info('🤖 Step 2/3: Validating Vertex AI configuration...');
        try {
            validateVertexAIConfig();
        } catch (error) {
            logger.error('Vertex AI configuration validation failed:', error);
            logger.warn('⚠️  Vertex AI features will not be available');
        }

        // 3. Check Firestore indexes (informational)
        logger.info('🗄️  Step 3/3: Checking Firestore...');
        logger.info('💡 Remember to deploy firestore.indexes.json for optimal performance');
        logger.info('   Run: firebase deploy --only firestore:indexes');

        hasInitialized = true;
        logger.info('✅ Application initialization complete!');

    } catch (error) {
        logger.error('❌ Application initialization failed:', error);
        throw error;
    }
}

/**
 * Check if application is properly initialized
 */
export function isInitialized(): boolean {
    return hasInitialized;
}

/**
 * Reset initialization state (for testing)
 */
export function resetInitialization(): void {
    hasInitialized = false;
}