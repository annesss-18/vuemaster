// app/api/interview/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { withAuth } from '@/lib/api-middleware';
import { extractTextFromUrl, extractTextFromFile } from '@/lib/server-utils';
import { getCompanyLogoUrl } from '@/lib/company-utils'; // ✅ NEW UTILITY

export const runtime = 'nodejs';

// Enhanced schema with company extraction
const analysisSchema = z.object({
    role: z.string().describe("The exact job title (e.g. 'Senior Backend Engineer')"),
    companyName: z.string().describe("The hiring company name. Look for 'About [Company]', company header, or metadata. If not found, return 'Unknown Company'"),
    techStack: z.array(z.string()).describe("List of technologies, languages, frameworks (e.g. ['React', 'Node.js', 'PostgreSQL'])"),
    level: z.enum(['Junior', 'Mid', 'Senior', 'Staff', 'Executive']),
    suggestedType: z.enum(['Technical', 'Behavioral', 'System Design', 'HR', 'Mixed']),
    cleanedJd: z.string().describe("Pure job description without navigation/footer/ads"),
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

        // 2. AI Extraction
        const result = await generateObject({
            model: google('gemini-3-pro-preview'),
            schema: analysisSchema,
            prompt: `
            Analyze this job posting and extract structured information.
            
            [RAW TEXT START]
            ${jdText.substring(0, 25000)}
            [RAW TEXT END]
            
            CRITICAL TASKS:
            1. **COMPANY NAME**: Look for:
               - "About [Company]" sections
               - Company name in header/title (e.g. "Google - Software Engineer")
               - Metadata like "Posted by [Company]"
               - Domain name hints (e.g. stripe.com → Stripe)
               If truly not found, return "Unknown Company"
            
            2. **ROLE**: Extract exact title (e.g. "Senior DevOps Engineer")
            
            3. **TECH STACK**: Extract ALL mentioned technologies:
               - Programming languages (Python, JavaScript, etc.)
               - Frameworks (React, Django, Spring Boot, etc.)
               - Databases (PostgreSQL, MongoDB, Redis, etc.)
               - Tools (Docker, Kubernetes, Jenkins, etc.)
               - Cloud platforms (AWS, GCP, Azure)
            
            4. **CLEAN JD**: Remove all navigation, "Sign In", "Apply Now" buttons, 
               cookie notices, "Similar Jobs", footers. Keep ONLY the actual job description.
            `,
        });

        const extractedData = result.object;

        // 3. Generate Company Logo URL
        const companyLogoUrl = getCompanyLogoUrl(extractedData.companyName);

        // 4. Return enriched data
        return NextResponse.json({
            ...extractedData,
            companyLogoUrl, // ✅ NEW: Logo URL based on company
        });

    } catch (error) {
        console.error("Analysis Error:", error);
        return NextResponse.json({
            error: "Failed to analyze job description"
        }, { status: 500 });
    }
});