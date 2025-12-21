import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/admin';
import { extractTextFromFile } from '@/lib/server-utils';
import { withAuth } from '@/lib/api-middleware';

export const runtime = 'nodejs';

export const POST = withAuth(async (req: NextRequest, user: User) => {
  try {
    const formData = await req.formData();
    const interviewId = formData.get('interviewId') as string;
    const resumeFile = formData.get('resume') as File;

    if (!interviewId || !resumeFile) {
      return NextResponse.json({ error: 'Missing interviewId or resume file' }, { status: 400 });
    }

    // Verify ownership: User must own the interview they're uploading to
    const interviewDoc = await db.collection('interviews').doc(interviewId).get();

    if (!interviewDoc.exists) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    const interviewData = interviewDoc.data();
    if (interviewData?.userId !== user.id) {
      return NextResponse.json({
        error: 'Forbidden. You can only upload resumes to your own interviews.'
      }, { status: 403 });
    }

    const resumeText = await extractTextFromFile(resumeFile);

    await db.collection('interviews').doc(interviewId).update({
      resumeText,
    });

    return NextResponse.json({ success: true, resumeText });
  } catch (error) {
    console.error('Resume Upload Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
