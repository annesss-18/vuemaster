interface Feedback {
  id: string;
  interviewId: string;
  totalScore: number;
  // Stored as an object with named categories (easy lookup) when created,
  // e.g. { communicationSkills: { score, comment }, technicalKnowledge: { ... } }
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
  // Also persisted as an ordered array for UI display
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

interface Interview {
  // Mapped View Model: Compatible with both legacy 'interviews' collection and new 'interview_sessions'
  id: string;
  role: string;
  level: string;
  questions: string[];
  techstack: string[];
  createdAt: string;
  userId: string;
  type: 'technical' | 'behavioral' | 'system-design' | 'hr-cultural' | 'mixed'; // Interview type
  finalized: boolean;
  jobDescription?: string; // The full text extracted from the JD input
  resumeText?: string;     // The full text extracted from the uploaded resume
  sourceType?: 'text' | 'link' | 'file'; // Metadata about how the JD was added
  // Optional metadata
  companyName?: string;
  location?: string;
  experienceYears?: string;
  status?: string;
}

interface CreateFeedbackParams {
  interviewId: string;
  userId: string;
  transcript: { role: string; content: string }[];
  feedbackId?: string;
}

interface User {
  name: string;
  email: string;
  id: string;
}

interface InterviewCardProps {
  id?: string;
  userId?: string;
  role: string;
  type: string;
  techstack: string[];
  createdAt?: string;
}

interface AgentProps {
  userName: string;
  userId?: string;
  interviewId?: string;
  feedbackId?: string;
  type: "generate" | "interview";
  questions?: string[];
}

interface RouteParams {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string>>;
}

interface GetFeedbackByInterviewIdParams {
  interviewId: string;
  userId: string;
}

interface GetLatestInterviewsParams {
  userId: string;
  limit?: number;
}

interface SignInParams {
  email: string;
  idToken: string;
}

interface SignUpParams {
  uid: string;
  name: string;
  email: string;
}

type FormType = "sign-in" | "sign-up";

interface InterviewFormProps {
  interviewId: string;
  role: string;
  level: string;
  type: string;
  techstack: string[];
  amount: number;
}

interface TechIconProps {
  techStack: string[];
}

interface InterviewTemplate {
  id: string;
  creatorId: string;        // ID of the user who generated this
  isPublic: boolean;        // If true, appears in "Explore" section

  // Metadata (Searchable)
  role: string;
  companyName?: string;     // Extracted from JD
  level: 'Junior' | 'Mid' | 'Senior' | 'Staff' | 'Executive';
  type: 'Screening' | 'Technical' | 'System Design' | 'Behavioral' | 'Case Study' | 'HR' | 'Mixed';
  techStack: string[];
  focusArea?: string[];     // e.g. ["Database Design", "React Hooks"]

  // Content
  jobDescription: string;
  baseQuestions: string[];  // The "Gold Standard" questions for this role

  // Metrics
  usageCount: number;       // Incremented when a session is created
  avgScore: number;         // Rolling average of feedback scores
  createdAt: string;
}

interface InterviewSession {
  id: string;
  templateId: string;       // Reference to the parent template
  userId: string;           // The candidate

  // Personalization
  resumeText?: string;      // Extracted text from uploaded resume

  // State
  status: 'setup' | 'active' | 'completed';
  startedAt: string;
  completedAt?: string;

  // Result
  feedbackId?: string;
}
