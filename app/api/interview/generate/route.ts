import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/admin'; // Ensure this points to your Admin SDK
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { extractTextFromFile, extractTextFromUrl } from '@/lib/server-utils';

// Ensure we use Node runtime for pdf-parse support
export const runtime = 'nodejs'; 

// Define the schema for Gemini's output
const analysisSchema = z.object({
  jobTitle: z.string().describe("The specific job role title found in the JD"),
  jobLevel: z.string().describe("Seniority level (Junior, Mid, Senior, Lead, etc)"),
  techStack: z.array(z.string()).describe("List of key technologies mentioned"),
  questions: z.array(z.string()).describe("5-7 strategic interview questions based on the job description"),
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const userId = formData.get('userId') as string;
    
    // Inputs
    const jdType = formData.get('jdType') as string; // 'text' | 'url' | 'file'
    const jdInput = formData.get('jdInput'); // string (text/url) or File/Blob

    if (!userId || !jdInput) {
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

    // 2. AI Analysis
    const prompt = `
      Analyze the following Job Description (JD).
      
      [JOB DESCRIPTION START]
      ${jdText.substring(0, 20000)} 
      [JOB DESCRIPTION END]

      Task:
      1. Identify the Job Role and Level.
      2. Extract the Tech Stack.
      3. Generate interview questions strictly based on JD requirements.
    `;

    const { object } = await generateObject({
      model: google('gemini-2.0-flash-exp'), // Or your preferred model
      schema: analysisSchema,
      prompt: prompt,
    });

    // 3. Save to Database
    const docRef = await db.collection('interviews').add({
      userId,
      // Store ISO string for createdAt for consistency across reads and sorting
      createdAt: new Date().toISOString(),
      status: 'pending',
      // Saved Context for the Agent
      jobDescription: jdText,
      resumeText: null,
      // Extracted Metadata
      role: object.jobTitle,
      level: object.jobLevel,
      techstack: object.techStack,
      questions: object.questions,
      type: 'interview',
      finalized: false,
    });

    return NextResponse.json({ success: true, interviewId: docRef.id });

  } catch (error) {
    console.error("Generate Interview Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}