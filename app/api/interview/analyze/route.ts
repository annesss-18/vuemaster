import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { withAuth } from '@/lib/api-middleware';
import { extractTextFromUrl, extractTextFromFile } from '@/lib/server-utils';

export const runtime = 'nodejs';

// Schema: Explicitly asks for companyName and cleanedJd
const analysisSchema = z.object({
    role: z.string().describe("The exact job title extracted from the JD"),
    companyName: z.string().describe("The name of the company hiring. Look for 'About [Company]' or the company listed at the top."),
    techStack: z.array(z.string()).describe("List of programming languages, frameworks, and tools mentioned"),
    level: z.enum(['Junior', 'Mid', 'Senior', 'Staff', 'Executive']).describe("Inferred experience level"),
    suggestedType: z.enum(['Technical', 'Behavioral', 'System Design', 'HR', 'Mixed']).describe("The most likely interview type"),
    cleanedJd: z.string().describe("The pure job description text. REMOVE all navigation, sidebars, login prompts, and legal footers. Keep only the role, responsibilities, and requirements."),
});

export const POST = withAuth(async (req: NextRequest, user: any) => {
    try {
        const formData = await req.formData();
        const jdType = formData.get('jdType') as string;
        const jdInput = formData.get('jdInput');

        // 1. Extract Raw Text
        let jdText = "";
        if (jdType === 'url' && typeof jdInput === 'string') {
            jdText = await extractTextFromUrl(jdInput);
        } else if (jdType === 'file' && jdInput) {
            jdText = await extractTextFromFile(jdInput as unknown as File);
        } else if (typeof jdInput === 'string') {
            jdText = jdInput;
        }

        if (!jdText || jdText.length < 50) {
            return NextResponse.json({ error: "Job description is too short" }, { status: 400 });
        }

        // 2. AI Extraction & Cleaning
        const result = await generateObject({
            model: google('gemini-2.0-flash-exp'),
            schema: analysisSchema,
            prompt: `
            Analyze this raw text scraped from a job posting.
            
            [RAW TEXT START]
            ${jdText.substring(0, 25000)}
            [RAW TEXT END]
            
            TASKS:
            1. **EXTRACT COMPANY NAME:** Look for lines like "About [Company Name]", "Join [Company Name]", or the company listed near the location. (e.g., "Qatar Airways", "Google").
            2. Extract the **Job Title** and **Tech Stack**.
            3. Infer the **Seniority Level**.
            4. **CLEAN THE TEXT:** Remove "Skip to main content", "Sign In", "Apply", "Cookies", "Similar Jobs", and sidebars. Return ONLY the clean Job Description in 'cleanedJd'.
            `,
        });

        // Return structured data (including companyName and cleanedJd)
        return NextResponse.json(result.object);

    } catch (error) {
        console.error("Analysis Error:", error);
        return NextResponse.json({ error: "Failed to analyze job description" }, { status: 500 });
    }
});