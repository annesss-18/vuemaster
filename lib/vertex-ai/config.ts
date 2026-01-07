// lib/vertex-ai/config.ts

/**
 * Vertex AI Live API Configuration
 */

export const VERTEX_AI_CONFIG = {
  // Model configuration
  model: process.env.VERTEX_AI_MODEL || 'gemini-live-2.5-flash-native-audio',

  // Location/Region
  location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',

  // Audio configuration
  audio: {
    inputSampleRate: 16000,    // 16kHz for input
    outputSampleRate: 24000,   // 24kHz for output
    inputChannels: 1,          // Mono
    outputChannels: 1,         // Mono
    inputEncoding: 'pcm',      // PCM format
    outputEncoding: 'pcm',     // PCM format
  },

  // Voice configuration
  voices: {
    default: process.env.VERTEX_AI_DEFAULT_VOICE || 'Charon',
    available: ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'],
  },

  // Session configuration
  session: {
    timeout: parseInt(process.env.VERTEX_AI_WS_TIMEOUT || '300000'), // 5 minutes
    maxReconnectAttempts: 3,
    reconnectDelay: 2000, // 2 seconds
  },

  // Feature flags
  features: {
    enableTranscription: process.env.VERTEX_AI_ENABLE_TRANSCRIPTION === 'true',
    enableVoiceActivityDetection: true,
    enableAffectiveDialog: true,
    enableProactiveAudio: false, // Preview feature
  },

  // Response modalities
  responseModalities: ['AUDIO'] as const,
} as const;

/**
 * Generate setup configuration for Vertex AI session
 */
export function generateSetupConfig(options: {
  systemInstruction: string;
  voice?: string;
  tools?: any[];
}) {
  const { systemInstruction, voice, tools } = options;

  return {
    setup: {
      model: `models/${VERTEX_AI_CONFIG.model}`,
      generation_config: {
        response_modalities: VERTEX_AI_CONFIG.responseModalities,
        speech_config: {
          voice_config: {
            prebuilt_voice_config: {
              voice_name: voice || VERTEX_AI_CONFIG.voices.default,
            },
          },
        },
      },
      system_instruction: {
        parts: [
          {
            text: systemInstruction,
          },
        ],
      },
      // Add tools if provided (function calling, search, etc.)
      ...(tools && tools.length > 0 ? { tools } : {}),
    },
  };
}

/**
 * Audio format configuration for client
 */
export function getAudioFormat() {
  return {
    input: {
      encoding: VERTEX_AI_CONFIG.audio.inputEncoding,
      sampleRate: VERTEX_AI_CONFIG.audio.inputSampleRate,
      channels: VERTEX_AI_CONFIG.audio.inputChannels,
      mimeType: `audio/${VERTEX_AI_CONFIG.audio.inputEncoding};rate=${VERTEX_AI_CONFIG.audio.inputSampleRate}`,
    },
    output: {
      encoding: VERTEX_AI_CONFIG.audio.outputEncoding,
      sampleRate: VERTEX_AI_CONFIG.audio.outputSampleRate,
      channels: VERTEX_AI_CONFIG.audio.outputChannels,
      mimeType: `audio/${VERTEX_AI_CONFIG.audio.outputEncoding};rate=${VERTEX_AI_CONFIG.audio.outputSampleRate}`,
    },
  };
}