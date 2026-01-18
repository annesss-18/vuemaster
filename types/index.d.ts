// types/index.ts (rename from index.d.ts)
export interface Feedback {
  id: string;
  interviewId: string;
  totalScore: number;
  categoryScores: {
    [key: string]: {
      score: number;
      comment: string;
    };
  } | Array<{
    name: string;
    score: number;
    comment: string;
  }>;
  categoryScoresArray?: Array<{
    name: string;
    score: number;
    comment: string;
  }>;
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
  createdAt: string;
}

export interface InterviewTemplate {
  id: string;
  creatorId: string;
  isPublic: boolean;

  // Core Fields
  role: string;
  companyName: string;
  companyLogoUrl?: string;
  level: 'Junior' | 'Mid' | 'Senior' | 'Staff' | 'Executive';
  type: 'Technical' | 'System Design' | 'Behavioral' | 'HR' | 'Mixed';

  // Technical Details
  techStack: string[];
  focusArea: string[];

  // Content
  jobDescription: string;
  baseQuestions: string[];
  systemInstruction?: string;

  // Metadata
  usageCount: number;
  avgScore: number;
  createdAt: string;
  updatedAt?: string;
}

export interface InterviewSession {
  id: string;
  templateId: string;
  userId: string;

  // Personalization
  resumeText?: string;

  // State
  status: 'setup' | 'active' | 'completed';
  startedAt: string;
  completedAt?: string;

  // Result
  feedbackId?: string;
  finalScore?: number;
}

// View Models for UI Components
export interface TemplateCardData {
  id: string;
  role: string;
  companyName: string;
  companyLogoUrl?: string;
  level: string;
  type: string;
  techStack: string[];
  usageCount: number;
  avgScore: number;
  createdAt: string;
  isOwnedByUser: boolean;
}

export interface SessionCardData {
  id: string;
  // From Template
  role: string;
  companyName: string;
  companyLogoUrl?: string;
  level: string;
  type: string;
  techStack: string[];
  // From Session
  status: 'setup' | 'active' | 'completed';
  startedAt: string;
  completedAt?: string;
  // From Feedback
  finalScore?: number;
  hasResume: boolean;
}

// Legacy type - Keep for backward compatibility
export interface Interview {
  id: string;
  role: string;
  level: string;
  companyName?: string;
  companyLogoUrl?: string;
  questions: string[];
  techstack: string[];
  createdAt: string;
  userId: string;
  type: string;
  finalized: boolean;
  jobDescription?: string;
  resumeText?: string;
  status?: string;
  focusArea?: string[];
  systemInstruction?: string;
}

// API Types
export interface CreateFeedbackParams {
  interviewId: string;
  userId: string;
  transcript: { role: string; content: string }[];
  feedbackId?: string;
}

export interface GetFeedbackByInterviewIdParams {
  interviewId: string;
  userId: string;
}

export interface GetLatestInterviewsParams {
  userId: string;
  limit?: number;
}

export interface User {
  name: string;
  email: string;
  id: string;
}

export interface SignInParams {
  email: string;
  idToken: string;
}

export interface SignUpParams {
  uid: string;
  name: string;
  email: string;
}

export type FormType = "sign-in" | "sign-up";

export interface RouteParams {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string>>;
}

export interface TechIconProps {
  techStack: string[];
}