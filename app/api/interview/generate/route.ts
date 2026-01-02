import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { db } from '@/firebase/admin';
import { withAuth } from '@/lib/api-middleware';

export const runtime = 'nodejs';

// Schema for the AI output
const templateSchema = z.object({
    role: z.string(),
    companyName: z.string().optional(),
    techStack: z.array(z.string()),
    baseQuestions: z.array(z.string()).min(3),
    focusArea: z.array(z.string()).describe("3-5 key competencies to evaluate"),
    systemInstruction: z.string().describe("Detailed instructions for the AI agent"),
});

export const POST = withAuth(async (req: NextRequest, user: any) => {
    try {
        const formData = await req.formData();

        // 1. Get User Inputs
        const role = formData.get('role') as string;
        const companyName = formData.get('companyName') as string; // CAPTURE COMPANY NAME
        const level = formData.get('level') as string;
        const type = formData.get('type') as string;
        const jdInput = formData.get('jdInput') as string;
        const techStackJson = formData.get('techStack') as string;
        const userTechStack = techStackJson ? JSON.parse(techStackJson) : [];
        const isPublic = formData.get('isPublic') === 'true';

        // 2. AI Prompt
        const constructedPrompt = `
        You are an Expert Technical Recruiter. Create a rigorous interview template.

        CONTEXT:
        Role: ${role}
        Company: ${companyName}
        Level: ${level}
        Type: ${type}
        Confirmed Tech Stack: ${userTechStack.join(', ')}

        [JD CONTEXT START]
        ${jdInput.substring(0, 20000)}
        [JD CONTEXT END]

        INSTRUCTIONS:
        1. Use the "Confirmed Tech Stack" as the primary list of skills to test.
        2. Identify 3-5 Focus Areas based on the Role and Stack.
        3. Generate 5-10 challenging, role-specific questions.
        4. Create a system instruction for the AI Agent.
        
        Output JSON matching the schema.
        `.trim();

        // 3. Generate Content
        const result = await generateObject({
            model: google('gemini-2.0-flash-exp'),
            schema: templateSchema,
            prompt: constructedPrompt,
        });

        const generatedData = result.object;

        // 4. Save Directly to Firestore
        const templateData: any = {
            ...generatedData,
            role: role,
            companyName: companyName || generatedData.companyName || '', // Prioritize Form Input
            level: level,
            type: type,
            techStack: [...new Set([...userTechStack, ...generatedData.techStack])],
            jobDescription: jdInput,
            creatorId: user.id,
            isPublic: isPublic,
            usageCount: 0,
            avgScore: 0,
            createdAt: new Date().toISOString(),
        };

        const docRef = await db.collection('interview_templates').add(templateData);

        return NextResponse.json({ success: true, templateId: docRef.id });

    } catch (error) {
        console.error("Generation Error:", error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : "Failed to generate template"
        }, { status: 500 });
    }
});