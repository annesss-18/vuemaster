'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { vapi } from '@/lib/vapi.sdk';// ✅ FIXED: Added missing import
import { interviewer } from '@/constants';
import { createFeedback } from '@/lib/actions/general.action';
import { logger } from '@/lib/logger';

enum CallStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  CONNECTING = 'CONNECTING',
  FINISHED = 'FINISHED'
}

interface SavedMessage {
  role: 'user' | 'system' | 'assistant';
  content: string;
}

// ✅ FIXED: Added 'questions' to destructuring so it can be used below
const Agent = ({ userName, userId, type, interviewId, questions }: AgentProps) => {
  const router = useRouter();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const triedFallbackRef = useRef(false);

  // NEW: State for feedback generation
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const hasProcessedCallEnd = useRef(false); // Prevent double execution

  useEffect(() => {
    const onCallStart = () => {
      setCallStatus(CallStatus.ACTIVE);
    };

    const onCallEnd = () => {
      setCallStatus(CallStatus.FINISHED);
    };

    const onMessage = (message: Message) => {
      if (message.type === 'transcript' && message.transcriptType === 'final') {
        const newMessage = {
          role: message.role,
          content: message.transcript,
        };
        setMessages((prev) => [...prev, newMessage]);
      }
    };

    const onSpeechStart = () => {
      setIsSpeaking(true);
    };

    const onSpeechEnd = () => {
      setIsSpeaking(false);
    };

    const formatError = (err: any) => {
      if (!err && err !== 0) return String(err);
      if (typeof err === 'string') return err;
      if (err instanceof Error) return err.stack || err.message;
      try {
        return JSON.stringify(err);
      } catch (e) {
        return String(err);
      }
    };

    const onError = (error: any) => {
      const message = formatError(error);
      logger.error(`Error in call: ${message}`);

      try {
        const isStartMethodError = error?.type === 'start-method-error';
        const messages = (error?.error?.error?.message) || (error?.error?.message) || '';
        const indicatesWorkflow = typeof messages === 'string' &&
          (messages.includes('workflowId') || messages.includes('variableValues'));

        if (isStartMethodError && indicatesWorkflow && !triedFallbackRef.current) {
          triedFallbackRef.current = true;
          if (callStatus === CallStatus.CONNECTING) {
            logger.info('Vapi start failed for workflow payload — attempting fallback');
            vapi.start(process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID!)
              .catch((e: any) => logger.error('Fallback start error:', formatError(e)));
          }
        }
      } catch (e) {
        // Defensive error handling
      }
    };

    vapi.on('call-start', onCallStart);
    vapi.on('call-end', onCallEnd);
    vapi.on('message', onMessage);
    vapi.on('speech-start', onSpeechStart);
    vapi.on('speech-end', onSpeechEnd);
    vapi.on('error', onError);

    return () => {
      vapi.off('call-start', onCallStart);
      vapi.off('call-end', onCallEnd);
      vapi.off('message', onMessage);
      vapi.off('speech-start', onSpeechStart);
      vapi.off('speech-end', onSpeechEnd);
      vapi.off('error', onError);
    };
  }, []); // Empty dependency array - only run once

  const handleGenerateFeedback = async (transcript: SavedMessage[]) => {
    // Validation
    if (!interviewId || !userId) {
      setFeedbackError('Missing interview or user information. Please try again.');
      return;
    }

    if (transcript.length === 0) {
      setFeedbackError('No conversation recorded. Please try the interview again.');
      return;
    }

    setIsGeneratingFeedback(true);
    setFeedbackError(null);

    try {
      const { success, feedbackId } = await createFeedback({
        interviewId,
        userId,
        transcript,
      });

      if (success && feedbackId) {
        // Navigate to feedback page
        router.push(`/interview/${interviewId}/feedback`);
      } else {
        setFeedbackError('Failed to generate feedback. Please try again.');
        setIsGeneratingFeedback(false);
      }
    } catch (error) {
      console.error('Feedback generation error:', error);
      setFeedbackError('An unexpected error occurred. Please try again.');
      setIsGeneratingFeedback(false);
    }
  };

  // FIXED: Prevent race condition and handle both paths properly
  useEffect(() => {
    // Only process once when call finishes
    if (callStatus === CallStatus.FINISHED && !hasProcessedCallEnd.current) {
      hasProcessedCallEnd.current = true;

      if (type === "generate") {
        // Generation complete, go home
        router.push('/');
      } else if (type === "interview") {
        // Interview complete, generate feedback
        handleGenerateFeedback(messages);
      }
    }
  }, [callStatus]); // ONLY depend on callStatus, not messages

  const handleCall = () => {
    setCallStatus(CallStatus.CONNECTING);
    setFeedbackError(null); // Clear any previous errors
    hasProcessedCallEnd.current = false; // Reset for new call

    (async () => {
      try {
        if (type === "generate") {
          await vapi.start(process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID!, {
            variableValues: {
              username: userName,
              userid: userId,
            },
          });
        } else {
          let formattedQuestions = "";
          if (questions && questions.length > 0) {
            formattedQuestions = questions
              .map((question) => `- ${question}`)
              .join("\n");
          }

          await vapi.start(interviewer, {
            variableValues: {
              questions: formattedQuestions,
            },
          });
        }
      } catch (error) {
        console.error('Failed to start call:', error);
        setCallStatus(CallStatus.INACTIVE);
        setFeedbackError('Failed to start call. Please check your connection and try again.');
      }
    })();
  };

  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    vapi.stop();
  };

  const LatestMessage = messages[messages.length - 1]?.content || '';
  const isCallInactiveorFinished = callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED;

  return (
    <>
      <div className="call-view">
        <div className="card-interviewer">
          <div className="avatar">
            <Image src="/ai-avatar.png" alt="AI Interviewer Avatar" width={65} height={65} className="object-cover" />
            {isSpeaking && <span className="animate-speak"></span>}
          </div>
          <h3>AI Interviewer</h3>
        </div>
        <div className="card-border">
          <div className="card-content">
            <Image src="/user-avatar.png" alt={`${userName}'s Avatar`} width={540} height={540} className="rounded-full object-cover size-[120px]" />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              key={messages.length} // Use message count as key to trigger re-animation
              className="animate-fadeIn" // Use the keyframe animation from globals.css
            >
              {LatestMessage}
            </p>
          </div>
        </div>
      )}

      {/* NEW: Loading state for feedback generation */}
      {isGeneratingFeedback && (
        <div className="text-center mt-6 p-6 bg-dark-200 rounded-lg">
          <div className="animate-spin text-4xl mb-4">⟳</div>
          <p className="text-primary-100 text-lg font-semibold">
            Analyzing your interview performance...
          </p>
          <p className="text-light-100 mt-2">
            This may take a few moments
          </p>
        </div>
      )}

      {/* NEW: Error handling with retry */}
      {feedbackError && (
        <div className="text-center mt-6 p-6 bg-destructive-100/10 border border-destructive-100 rounded-lg">
          <p className="text-destructive-100 font-semibold mb-4">
            {feedbackError}
          </p>
          {callStatus === CallStatus.FINISHED && messages.length > 0 && (
            <button
              onClick={() => handleGenerateFeedback(messages)}
              className="btn-primary"
            >
              Retry Feedback Generation
            </button>
          )}
        </div>
      )}

      <div className="w-full flex justify-center">
        {callStatus !== CallStatus.ACTIVE && !isGeneratingFeedback ? (
          <button className="relative btn-call" onClick={handleCall} disabled={isGeneratingFeedback}>
            <span className={cn(
              "absolute rounded-full opacity-75 animate-ping",
              callStatus !== CallStatus.CONNECTING && 'hidden'
            )} />
            <span>
              {isCallInactiveorFinished ? 'Start Call' : 'Connecting...'}
            </span>
          </button>
        ) : callStatus === CallStatus.ACTIVE ? (
          <button className="btn-disconnect" onClick={handleDisconnect}>
            End Interview
          </button>
        ) : null}
      </div>
    </>
  );
};

export default Agent;