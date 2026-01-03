import { NextRequest, NextResponse } from 'next/server';
import { createFeedback } from '@/lib/actions/general.action';
import { withAuth } from '@/lib/api-middleware';
import { db } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { User } from '@/types';

export const POST = withAuth(async (req: NextRequest, user: User) => {
  try {
    const body = await req.json();
    const { interviewId, transcript } = body;

    if (!interviewId || !transcript) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields'
      }, { status: 400 });
    }

    // Create feedback
    const result = await createFeedback({
      interviewId,
      userId: user.id,
      transcript
    });

    if (result.success) {
      // Mark session as completed
      try {
        await db.collection('interview_sessions').doc(interviewId).update({
          status: 'completed',
          completedAt: new Date().toISOString(),
          feedbackId: result.feedbackId
        });
      } catch (updateError) {
        logger.warn('Failed to update session status:', updateError);
        // Don't fail the whole request if status update fails
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('API /feedback error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal Server Error'
    }, { status: 500 });
  }
});