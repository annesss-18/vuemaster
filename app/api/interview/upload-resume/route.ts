import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/admin';
import { extractTextFromFile } from '@/lib/server-utils';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const interviewId = formData.get('interviewId') as string;
    const resumeFile = formData.get('resume') as File;

    if (!interviewId || !resumeFile) {
      return NextResponse.json({ error: 'Missing interviewId or resume file' }, { status: 400 });
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
}
