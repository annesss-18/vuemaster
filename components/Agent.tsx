'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { vapi } from '@/lib/vapi.sdk';// ✅ FIXED: Added missing import

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
const Agent = ({ userName, userId, type, questions }: AgentProps) => {
  const router = useRouter();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const triedFallbackRef = useRef(false);

  if (!process.env.NEXT_PUBLIC_VAPI_API_TOKEN) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Configuration Error</strong>
          <span className="block sm:inline"> The Vapi API token is missing. Please set the `NEXT_PUBLIC_VAPI_API_TOKEN` environment variable in a `.env.local` file and restart the server.</span>
        </div>
      </div>
    );
  }

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
      console.error(`Error in call: ${message}`);

      try {
        const isStartMethodError = error?.type === 'start-method-error';
        const messages = (error?.error?.error?.message) || (error?.error?.message) || '';
        const indicatesWorkflow = typeof messages === 'string' && (messages.includes('workflowId') || messages.includes('variableValues'));

        if (isStartMethodError && indicatesWorkflow && !triedFallbackRef.current) {
          triedFallbackRef.current = true;
          if (callStatus === CallStatus.CONNECTING) {
            console.info('Vapi start failed for workflow payload — attempting fallback start() without payload');
            vapi.start(process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID!).catch((e: any) => console.error('Fallback start error:', formatError(e)));
          }
        }
      } catch (e) {
        // swallow defensive errors
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
  }, [callStatus]);

  useEffect(() => {
    if (callStatus === CallStatus.FINISHED) router.push('/');
  }, [messages, callStatus, type, userId, router]);

  const handleCall = async () => {
    setCallStatus(CallStatus.CONNECTING);

    if (type === "generate") {
      // ✅ FIXED: Pass the Assistant ID (from env) as a string.
      // The variableValues are passed in the options object.
      await vapi.start(process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID!, {
        variableValues: {
          username: userName,
          userid: userId,
        },
      });
    } else {
      let formattedQuestions = "";
      // ✅ FIXED: 'questions' is now defined via props destructuring above
      if (questions) {
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
  };

  const handleDisconnect = async () => {
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
            <Image src="/ai-avatar.png" alt="vapi" width={65} height={65} className="object-cover" />
            {isSpeaking && <span className="animate-speak"></span>}
          </div>
          <h3>AI Interviewer</h3>
        </div>
        <div className="card-border">
          <div className="card-content">
            <Image src="/user-avatar.png" alt="user" width={540} height={540} className="rounded-full object-cover size-[120px]" />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="transcript-border">
          <p key={LatestMessage} className={cn('transition-opacity duration-500 opacity-0', 'animate-fade-in opacity-100')}>
            {LatestMessage}
          </p>
        </div>
      )}
      <div className="w-full flex justify-center">
        {callStatus !== 'ACTIVE' ? (
          <button className="relative btn-call" onClick={handleCall}>
            <span className={cn("absolute rounded-full opacity-75 animate-ping", callStatus !== 'CONNECTING' && 'hidden')} />
            <span>
              {isCallInactiveorFinished ? 'Start Call' : '...'}
            </span>
          </button>
        ) : (
          // ✅ FIXED: Typo in className (btn-disconnet -> btn-disconnect) to match globals.css
          <button className="btn-disconnect" onClick={handleDisconnect}>
            End
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;