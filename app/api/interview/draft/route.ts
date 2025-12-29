import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { withAuth } from '@/lib/api-middleware';
import { extractTextFromUrl, extractTextFromFile } from '@/lib/server-utils';

// Ensure we use Node runtime for pdf-parse support if needed (though extracting text suggests we might need it)
export const runtime = 'nodejs';

const draftSchema = z.object({
    role: z.string(),
    companyName: z.string().optional(),
    techStack: z.array(z.string()),
    questions: z.array(z.string()).min(5),
    jobDescription: z.string(), // We want to pass this back or ensure it's part of the object
    level: z.enum(['Junior', 'Mid', 'Senior', 'Staff', 'Executive']),
    type: z.enum(['Screening', 'Technical', 'System Design', 'Behavioral', 'Case Study', 'HR', 'Mixed']),
    focusArea: z.array(z.string()).optional(),
    systemInstruction: z.string().describe("The prompt to feed the AI Agent later")
});

export const POST = withAuth(async (req: NextRequest, user: any) => {
    try {
        const formData = await req.formData();
        // Inputs (similar to generate route but now we just draft)
        const jdType = formData.get('jdType') as string;
        const jdInput = formData.get('jdInput');
        const roleInput = formData.get('role') as string;
        const levelInput = formData.get('level') as string || 'Mid';
        const typeInput = formData.get('type') as string || 'Technical';
        const techStackInput = formData.get('techStack') as string; // Optional manual override

        let jdText = "";
        try {
            if (jdType === 'url' && typeof jdInput === 'string') {
                jdText = await extractTextFromUrl(jdInput);
            } else if (jdType === 'file' && jdInput && typeof (jdInput as unknown as { arrayBuffer?: unknown }).arrayBuffer === 'function') {
                jdText = await extractTextFromFile(jdInput as unknown as File);
            } else if (typeof jdInput === 'string') {
                jdText = jdInput;
            }
        } catch (err) {
            console.error('JD processing error', err);
            // fallback if JD fails? or just error out.
        }

        // If no JD text, ensure we have at least a role
        if (!jdText && !roleInput) {
            return NextResponse.json({ error: 'Job Description or Role is required' }, { status: 400 });
        }

        const constructedPrompt = `
      Analyze the following Job Description (JD) and/or Role context.
      
      ROLE: ${roleInput || 'Infer from JD'}
      LEVEL: ${levelInput}
      TYPE: ${typeInput}
      TECH STACK: ${techStackInput || 'Infer from JD'}
      
      [JOB DESCRIPTION START]
      ${jdText ? jdText.substring(0, 15000) : 'No specific JD provided, rely on role.'} 
      [JOB DESCRIPTION END]

      Task:
      1. Extract/Refine the Role, Company Name, and key Tech Stack.
      2. Generate 5-10 high-quality interview questions for a ${typeInput} interview.
      3. Create a "System Instruction" for an AI interviewer agent.
    `;

        const result = await generateObject({
            model: google('gemini-2.0-flash-exp'),
            schema: draftSchema,
            prompt: constructedPrompt,
        });

        // Inject the raw JD back into the result so we don't lose it
        const responseData = {
            ...result.object,
            jobDescription: jdText || `Interview for ${result.object.role}`
        };

        // Return raw JSON to frontend for editing
        return NextResponse.json(responseData);

    } catch (error) {
        console.error("Draft Generation Error:", error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Internal Server Error'
        }, { status: 500 });
    }
});
