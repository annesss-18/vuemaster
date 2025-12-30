// app/api/interview/draft/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { withAuth } from '@/lib/api-middleware';
import { extractTextFromUrl, extractTextFromFile } from '@/lib/server-utils';

export const runtime = 'nodejs';

const draftSchema = z.object({
    role: z.string(),
    companyName: z.string().optional(),
    techStack: z.array(z.string()),
    questions: z.array(z.string()).min(5),
    jobDescription: z.string(),
    level: z.enum(['Junior', 'Mid', 'Senior', 'Staff', 'Executive']),
    type: z.enum(['Screening', 'Technical', 'System Design', 'Behavioral', 'Case Study', 'HR', 'Mixed']),
    focusArea: z.array(z.string()).optional(),
    systemInstruction: z.string().describe("The prompt to feed the AI Agent later")
});

export const POST = withAuth(async (req: NextRequest, user: any) => {
    try {
        const formData = await req.formData();
        const jdType = formData.get('jdType') as string;
        const jdInput = formData.get('jdInput');
        const roleInput = formData.get('role') as string;
        const levelInput = formData.get('level') as string || 'Mid';
        const typeInput = formData.get('type') as string || 'Technical';
        const techStackInput = formData.get('techStack') as string;

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
        }

        if (!jdText && !roleInput) {
            return NextResponse.json({ error: 'Job Description or Role is required' }, { status: 400 });
        }

        // Parse tech stack if provided
        const techStackArray = techStackInput 
            ? techStackInput.split(',').map(t => t.trim()).filter(Boolean)
            : [];

        const constructedPrompt = `
Analyze the following Job Description (JD) and/or Role context.

ROLE: ${roleInput || 'Infer from JD'}
LEVEL: ${levelInput}
TYPE: ${typeInput}
${techStackArray.length > 0 ? `TECH STACK: ${techStackArray.join(', ')}` : 'TECH STACK: Infer from JD'}

[JOB DESCRIPTION START]
${jdText ? jdText.substring(0, 15000) : 'No specific JD provided, rely on role.'} 
[JOB DESCRIPTION END]

Task:
1. Extract/Refine the Role, Company Name, and key Tech Stack (as an array of strings)
2. Generate 5-10 high-quality interview questions for a ${typeInput} interview
3. Identify 2-4 focus areas (e.g., "React Hooks", "Database Design")
4. Create a "System Instruction" for an AI interviewer agent

Ensure techStack is returned as an array of technology names.
    `.trim();

        const result = await generateObject({
            model: google('gemini-2.0-flash-exp'),
            schema: draftSchema,
            prompt: constructedPrompt,
        });

        const responseData = {
            ...result.object,
            jobDescription: jdText || `Interview for ${result.object.role}`,
            // Rename questions to baseQuestions for template compatibility
            baseQuestions: result.object.questions,
        };

        // Remove the old questions field to avoid confusion
        delete (responseData as any).questions;

        return NextResponse.json(responseData);

    } catch (error) {
        console.error("Draft Generation Error:", error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Internal Server Error'
        }, { status: 500 });
    }
});