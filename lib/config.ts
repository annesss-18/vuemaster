/**
 * Configuration constants
 */

// API Configuration
export const API_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
} as const;

// File Upload Configuration
export const FILE_CONFIG = {
  MAX_FILE_SIZE_MB: 10,
  MAX_RESUME_SIZE_MB: 5,
  ALLOWED_JD_TYPES: ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ALLOWED_RESUME_TYPES: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const;

// Interview Configuration
export const INTERVIEW_CONFIG = {
  DEFAULT_VOICE: 'Charon' as const,
  DEFAULT_MODEL: 'gemini-2.0-flash-exp',
  SESSION_TIMEOUT_MS: 1800000, // 30 minutes
  MIN_QUESTIONS: 3,
  MAX_QUESTIONS: 10,
  DEFAULT_QUESTIONS_COUNT: 5,
} as const;

// Feedback Configuration
export const FEEDBACK_CONFIG = {
  MIN_SCORE: 0,
  MAX_SCORE: 100,
  SCORING_MODEL: 'gemini-2.0-flash-001',
  CATEGORY_COUNT: 5,
} as const;

// Audio Configuration
export const AUDIO_CONFIG = {
  SAMPLE_RATE: 16000,
  CHUNK_DURATION_MS: 250,
  MIME_TYPE: 'audio/webm;codecs=opus',
  ECHO_CANCELLATION: true,
  NOISE_SUPPRESSION: true,
  AUTO_GAIN_CONTROL: true,
} as const;

// Feature Flags (can be changed via environment)
export const FEATURE_FLAGS = {
  ENABLE_RESUME_UPLOAD: true,
  ENABLE_URL_JD_INPUT: true,
  ENABLE_FILE_JD_INPUT: true,
  REQUIRE_RESUME: false,
  ENABLE_FEEDBACK_CACHING: true,
} as const;

// Text Length Limits
export const TEXT_LIMITS = {
  MIN_JD_LENGTH: 50,
  MAX_JD_LENGTH: 20000,
  MIN_PASSWORD_LENGTH: 8,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MIN_QUESTION_LENGTH: 10,
  MAX_QUESTION_LENGTH: 500,
} as const;

// Validation Patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/i,
  ALPHANUMERIC: /^[a-zA-Z0-9_-]+$/,
  SAFE_TEXT: /^[\w\s\-.,!?'"""()]+$/,
} as const;

// Feedback Categories
export const FEEDBACK_CATEGORIES = [
  'Communication Skills',
  'Technical Knowledge',
  'Problem Solving',
  'Cultural Fit',
  'Confidence and Clarity'
] as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  INVALID_INPUT: 'Invalid input. Please check your data and try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  SIGN_UP_SUCCESS: 'Account created successfully!',
  SIGN_IN_SUCCESS: 'Signed in successfully!',
  INTERVIEW_CREATED: 'Interview generated successfully!',
  FEEDBACK_GENERATED: 'Feedback generated successfully!',
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  SIGN_IN: '/sign-in',
  SIGN_UP: '/sign-up',
  INTERVIEW: '/interview',
  INTERVIEW_CREATE: '/interview',
  INTERVIEW_DETAIL: (id: string) => `/interview/${id}`,
  INTERVIEW_FEEDBACK: (id: string) => `/interview/${id}/feedback`,
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  TECH_LOGOS: 60 * 60 * 1000, // 1 hour
  USER_DATA: 30 * 60 * 1000, // 30 minutes
  INTERVIEWS: 5 * 60 * 1000, // 5 minutes
  FEEDBACK: 10 * 60 * 1000, // 10 minutes
} as const;

export type InterviewType = 'behavioral' | 'technical' | 'mixed';
export type InterviewLevel = 'junior' | 'mid' | 'senior' | 'lead';
