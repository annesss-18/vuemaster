import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/admin';
import { withAuth } from '@/lib/api-middleware';


export const POST = withAuth(async (req: NextRequest, user: any) => {
    try {
        const body = await req.json(); // Validated Draft Data

        // Basic validation
        if (!body.role || !body.questions || !Array.isArray(body.questions)) {
            return NextResponse.json({ error: 'Invalid template data' }, { status: 400 });
        }

        const templateData: Omit<InterviewTemplate, 'id'> = {
            ...body,
            creatorId: user.id,
            isPublic: true, // Default to true or ask user
            usageCount: 0,
            avgScore: 0,
            createdAt: new Date().toISOString(),
        };

        const docRef = await db.collection('interview_templates').add(templateData);

        return NextResponse.json({ success: true, templateId: docRef.id });
    } catch (error) {
        console.error("Create Template Error:", error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Internal Server Error'
        }, { status: 500 });
    }
});
