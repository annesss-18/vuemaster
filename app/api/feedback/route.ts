import { NextRequest, NextResponse } from 'next/server';
import { createFeedback } from '@/lib/actions/general.action';
import { withAuth } from '@/lib/api-middleware';

export const POST = withAuth(async (req: NextRequest, user: User) => {
  try {
    const body = await req.json();
    const { interviewId, transcript } = body as {
      interviewId?: string;
      transcript?: { role: string; content: string }[];
    };

    if (!interviewId || !transcript) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const result = await createFeedback({ interviewId, userId: user.id, transcript });

    return NextResponse.json(result);
  } catch (error) {
    console.error('API /feedback error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
});
