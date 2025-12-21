import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/admin'; // Ensure this points to your Admin SDK
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { extractTextFromFile, extractTextFromUrl } from '@/lib/server-utils';
import { withAuth } from '@/lib/api-middleware';

// Ensure we use Node runtime for pdf-parse support
export const runtime = 'nodejs';

// Define the schema for Gemini's output - comprehensive to cover all interview types
const analysisSchema = z.object({
  jobTitle: z.string().describe("The specific job role title found in the JD"),
  jobLevel: z.string().describe("Seniority level (Junior, Mid, Senior, Lead, Staff, Principal, etc.). Default to 'Mid' if not specified."),
  techStack: z.array(z.string()).describe("List of key technologies mentioned. If none found, return common technologies for the role."),
  questions: z.array(z.string()).min(5).max(10).describe("Generate 5-10 interview questions based on the interview type and job description"),
  companyName: z.string().optional().describe("Company name if mentioned in JD"),
  location: z.string().optional().describe("Job location if mentioned"),
  experienceYears: z.string().optional().describe("Required years of experience if mentioned"),
});

export const POST = withAuth(async (req: NextRequest, user: User) => {
  try {
    const formData = await req.formData();
    const interviewType = (formData.get('interviewType') as string) || 'technical';

    // Inputs
    const jdType = formData.get('jdType') as string; // 'text' | 'url' | 'file'
    const jdInput = formData.get('jdInput'); // string (text/url) or File/Blob

    if (!jdInput) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Process Job Description
    let jdText = "";
    try {
      if (jdType === 'url' && typeof jdInput === 'string') {
        jdText = await extractTextFromUrl(jdInput);
      } else if (jdType === 'file' && jdInput && typeof (jdInput as unknown as { arrayBuffer?: unknown }).arrayBuffer === 'function') {
        // Accept File or Blob-like objects from FormData
        jdText = await extractTextFromFile(jdInput as unknown as File);
      } else if (typeof jdInput === 'string') {
        jdText = jdInput;
      } else {
        throw new Error('Invalid job description input');
      }
    } catch (err) {
      console.error('JD processing error, jdType=', jdType, 'jdInput=', jdInput, 'err=', err);
      throw err;
    }

    // 2. AI Analysis with type-specific prompts
    const interviewTypeInstructions = {
      'technical': 'Focus on technical skills, coding abilities, algorithms, data structures, and problem-solving. Generate questions that test technical knowledge and coding proficiency.',
      'behavioral': 'Focus on past experiences, soft skills, team collaboration, conflict resolution, and leadership. Use STAR method (Situation, Task, Action, Result) questions.',
      'system-design': 'Focus on system architecture, scalability, design patterns, trade-offs, and high-level design decisions. Ask about building large-scale systems.',
      'hr-cultural': 'Focus on company values alignment, team fit, career goals, work-life balance, and cultural aspects. Ask about motivation and long-term goals.',
      'mixed': 'Provide a balanced mix of technical questions (40%), behavioral questions (30%), system design questions (20%), and cultural fit questions (10%).',
    };

    const prompt = `
      Analyze the following Job Description (JD) for a ${interviewType} interview.
      
      [JOB DESCRIPTION START]
      ${jdText.substring(0, 20000)} 
      [JOB DESCRIPTION END]

      Interview Type: ${interviewType}
      
      Task:
      1. Identify the Job Role and Level. If level is not specified, infer from the job description or default to "Mid".
      2. Extract the Tech Stack. If no specific technologies are mentioned, suggest common ones for this role.
      3. Generate interview questions based on the interview type.
         ${interviewTypeInstructions[interviewType as keyof typeof interviewTypeInstructions] || interviewTypeInstructions.technical}
      4. Extract company name, location, and required experience if mentioned.
      
      IMPORTANT: 
      - Generate 5-10 high-quality, specific questions
      - Questions should be directly relevant to the job description
      - Ensure all required fields are populated
    `;

    const { object } = await generateObject({
      model: google('gemini-2.0-flash-exp'),
      schema: analysisSchema,
      prompt: prompt,
    });

    // 3. Validate and apply fallbacks for required properties
    const jobTitle = object.jobTitle || 'Software Engineer';
    const jobLevel = object.jobLevel || 'Mid';
    const techStack = (object.techStack && object.techStack.length > 0)
      ? object.techStack
      : getDefaultTechStack(jobTitle);
    const questions = (object.questions && object.questions.length >= 5)
      ? object.questions
      : generateFallbackQuestions(interviewType, jobTitle);

    // Log if fallbacks were used
    if (!object.jobTitle) console.warn('Using fallback jobTitle');
    if (!object.jobLevel) console.warn('Using fallback jobLevel');
    if (!object.techStack?.length) console.warn('Using fallback techStack');
    if (!object.questions?.length || object.questions.length < 5) console.warn('Using fallback questions');

    // 4. Save to Database with all properties properly filled
    const docRef = await db.collection('interviews').add({
      userId: user.id, // Use authenticated user ID
      createdAt: new Date().toISOString(),
      status: 'pending',
      // User context
      jobDescription: jdText,
      resumeText: null,
      sourceType: jdType as 'text' | 'link' | 'file',
      // AI-extracted metadata
      role: jobTitle,
      level: jobLevel,
      techstack: techStack,
      questions: questions,
      // Interview type
      type: interviewType,
      finalized: false,
      // Optional metadata
      ...(object.companyName && { companyName: object.companyName }),
      ...(object.location && { location: object.location }),
      ...(object.experienceYears && { experienceYears: object.experienceYears }),
    });

    return NextResponse.json({ success: true, interviewId: docRef.id });

  } catch (error) {
    console.error("Generate Interview Error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal Server Error'
    }, { status: 500 });
  }
});

// Helper function to provide default tech stack based on role
function getDefaultTechStack(role: string): string[] {
  const roleLower = role.toLowerCase();
  if (roleLower.includes('frontend') || roleLower.includes('react')) {
    return ['React', 'JavaScript', 'HTML', 'CSS'];
  } else if (roleLower.includes('backend') || roleLower.includes('node')) {
    return ['Node.js', 'JavaScript', 'SQL', 'REST API'];
  } else if (roleLower.includes('fullstack') || roleLower.includes('full stack')) {
    return ['React', 'Node.js', 'JavaScript', 'SQL'];
  } else if (roleLower.includes('devops')) {
    return ['Docker', 'Kubernetes', 'AWS', 'CI/CD'];
  } else if (roleLower.includes('data')) {
    return ['Python', 'SQL', 'Machine Learning', 'Data Analysis'];
  }
  return ['JavaScript', 'Git', 'Problem Solving'];
}

// Helper function to generate fallback questions
function generateFallbackQuestions(interviewType: string, role: string): string[] {
  const baseQuestions = {
    'technical': [
      `Explain your experience with the technologies commonly used in ${role} positions.`,
      'Describe a challenging technical problem you solved and your approach.',
      'How do you ensure code quality and maintainability in your projects?',
      'Explain your understanding of common design patterns and when to use them.',
      'Walk me through your process for debugging a complex issue.',
    ],
    'behavioral': [
      'Tell me about a time when you had to work with a difficult team member.',
      'Describe a situation where you had to meet a tight deadline.',
      'How do you handle constructive criticism?',
      'Tell me about a project you\'re most proud of and why.',
      'Describe a time when you had to learn a new technology quickly.',
    ],
    'system-design': [
      'Design a scalable URL shortening service.',
      'How would you design a real-time chat application?',
      'Explain how you would handle millions of concurrent users.',
      'Design a caching strategy for a high-traffic application.',
      'How would you architect a microservices-based system?',
    ],
    'hr-cultural': [
      'What motivates you in your work?',
      'Where do you see yourself in 5 years?',
      'Why are you interested in this position?',
      'How do you handle work-life balance?',
      'What kind of work environment do you thrive in?',
    ],
    'mixed': [
      `What interests you about ${role} positions?`,
      'Describe a technical challenge you overcame recently.',
      'How do you approach learning new technologies?',
      'Tell me about a time you collaborated with a team on a complex project.',
      'How would you design a system to handle high traffic loads?',
      'What are your career goals?',
    ],
  };

  return baseQuestions[interviewType as keyof typeof baseQuestions] || baseQuestions.technical;
}