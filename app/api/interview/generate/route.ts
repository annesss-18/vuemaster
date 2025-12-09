import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { getRandomInterviewCover } from '@/lib/utils';
import { db } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { type, role, level, techstack = '', amount, userid } = await request.json();

    // Validate inputs
    if (!role || !level || !amount || !userid) {
      return Response.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    logger.info('Generating interview questions:', { role, level, amount });

    const { text: questions } = await generateText({
      model: google('gemini-2.0-flash-exp'),
      prompt: `Prepare ${amount} questions for a job interview.
              
Job Details:
- Role: ${role}
- Experience Level: ${level}
- Tech Stack: ${techstack || 'Not specified'}
- Focus: ${type} (balance between behavioral and technical)

Requirements:
1. Return ONLY a JSON array of questions
2. No additional text, no markdown formatting
3. Questions should be clear and professional
4. Avoid special characters that might break voice synthesis (/, *, etc.)
5. Mix question types appropriately for the role
6. For technical roles, include coding/system design questions
7. For all roles, include behavioral questions

Example format:
["Question 1 here", "Question 2 here", "Question 3 here"]`,
    });

    // Parse and validate questions
    let parsedQuestions: string[];
    try {
      parsedQuestions = JSON.parse(questions);
      if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
        throw new Error('Invalid questions format');
      }
    } catch (parseError) {
      logger.error('Failed to parse questions:', parseError);
      return Response.json(
        { success: false, error: 'Failed to generate valid questions' },
        { status: 500 }
      );
    }

    // Create interview document
    const interview = {
      role,
      level,
      techstack: techstack ? techstack.split(',').map((t: string) => t.trim()) : [],
      type,
      questions: parsedQuestions,
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('interviews').add(interview);

    logger.info('Interview created successfully:', docRef.id);

    return Response.json({ 
      success: true, 
      interviewId: docRef.id 
    }, { status: 200 });

  } catch (error) {
    logger.error('Error in POST /api/interview/generate:', error);
    return Response.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}