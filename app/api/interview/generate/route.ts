// app/api/interview/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { db } from '@/firebase/admin';
import { withAuth } from '@/lib/api-middleware';
import { InterviewTemplate } from '@/types';

export const runtime = 'nodejs';

// Input validation schema
const requestSchema = z.object({
    role: z.string().min(3, 'Role must be at least 3 characters').max(100, 'Role too long'),
    companyName: z.string().max(100, 'Company name too long').optional(),
    companyLogoUrl: z.string().url('Invalid logo URL').optional().or(z.literal('')),
    level: z.enum(['Junior', 'Mid', 'Senior', 'Staff', 'Executive']),
    type: z.enum(['Technical', 'Behavioral', 'System Design', 'HR', 'Mixed']),
    jdInput: z.string().min(50, 'Job description too short').max(50000, 'Job description too long'),
    techStack: z.string().refine(
        (val) => {
            try {
                const parsed = JSON.parse(val);
                return Array.isArray(parsed) && parsed.length <= 20;
            } catch {
                return false;
            }
        },
        { message: 'Invalid tech stack format or too many items' }
    ),
    isPublic: z.enum(['true', 'false']),
});

// Schema for AI output
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
        // 1. Parse and validate form data
        const formData = await req.formData();

        const rawData = {
            role: formData.get('role') as string,
            companyName: formData.get('companyName') as string,
            companyLogoUrl: formData.get('companyLogoUrl') as string,
            level: formData.get('level') as string,
            type: formData.get('type') as string,
            jdInput: formData.get('jdInput') as string,
            techStack: formData.get('techStack') as string,
            isPublic: formData.get('isPublic') as string,
        };

        // Validate input
        const validation = requestSchema.safeParse(rawData);
        
        if (!validation.success) {
            return NextResponse.json({
                error: 'Invalid input',
                details: validation.error.issues.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                })),
            }, { status: 400 });
        }

        const validatedData = validation.data;
        const userTechStack = JSON.parse(validatedData.techStack);

        // 2. Generate template with AI
        const constructedPrompt = `
You are an Expert Technical Recruiter. Create a rigorous interview template.

CONTEXT:
Role: ${validatedData.role}
Company: ${validatedData.companyName || 'Not specified'}
Level: ${validatedData.level}
Type: ${validatedData.type}
Confirmed Tech Stack: ${userTechStack.join(', ')}

[JD CONTEXT START]
${validatedData.jdInput.substring(0, 20000)}
[JD CONTEXT END]

INSTRUCTIONS:
1. Use the "Confirmed Tech Stack" as the primary list of skills to test.
2. Identify 3-5 Focus Areas based on the Role and Stack.
3. Generate 5-10 challenging, role-specific questions.
4. Create a system instruction for the AI Agent.

Output JSON matching the schema.
        `.trim();

        const result = await generateObject({
            model: google('gemini-3-pro-preview'),
            schema: templateSchema,
            prompt: constructedPrompt,
        });

        const generatedData = result.object;

        // 3. Save to Firestore
        const templateData: Omit<InterviewTemplate, 'id'> = {
            ...generatedData,
            role: validatedData.role,
            companyName: validatedData.companyName || 'Unknown Company',
            companyLogoUrl: validatedData.companyLogoUrl || undefined,
            level: validatedData.level as InterviewTemplate['level'],
            type: validatedData.type as InterviewTemplate['type'],
            techStack: [...new Set([...userTechStack, ...generatedData.techStack])],
            jobDescription: validatedData.jdInput,
            creatorId: user.id,
            isPublic: validatedData.isPublic === 'true',
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
}, {
    maxRequests: 5,
    windowMs: 60 * 1000,
});