import { NextRequest, NextResponse } from 'next/server';
import { createFeedback } from '@/lib/actions/general.action';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { interviewId, userId, transcript } = body as {
      interviewId?: string;
      userId?: string;
      transcript?: { role: string; content: string }[];
    };

    if (!interviewId || !userId || !transcript) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const result = await createFeedback({ interviewId, userId, transcript });

    return NextResponse.json(result);
  } catch (error) {
    console.error('API /feedback error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
