'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { getGeminiLiveClient, type GeminiMessage } from '@/lib/gemini-live';
import { createFeedback } from '@/lib/actions/general.action';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { FileUp, Loader2 } from 'lucide-react';

enum CallStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  CONNECTING = 'CONNECTING',
  FINISHED = 'FINISHED'
}

interface AgentProps {
  userName: string;
  userId?: string;
  interviewId?: string;
  questions?: string[];
  jobTitle?: string;
  jobLevel?: string;
  jobDescription?: string;
  resumeText?: string;
  type?: "generate" | "interview";
}

const Agent = ({ 
  userName, 
  userId, 
  interviewId, 
  questions, 
  jobTitle, 
  jobLevel, 
  jobDescription, 
  resumeText: initialResumeText 
}: AgentProps) => {
  const router = useRouter();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<GeminiMessage[]>([]);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const hasProcessedCallEnd = useRef(false);
  const geminiClient = useRef(getGeminiLiveClient());

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [resumeText, setResumeText] = useState(initialResumeText);

  useEffect(() => {
    const client = geminiClient.current;

    client.on('onCallStart', () => setCallStatus(CallStatus.ACTIVE));
    client.on('onCallEnd', () => setCallStatus(CallStatus.FINISHED));
    client.on('onTranscript', (message: GeminiMessage) => setMessages((prev) => [...prev, message]));
    client.on('onSpeechStart', () => setIsSpeaking(true));
    client.on('onSpeechEnd', () => setIsSpeaking(false));
    client.on('onError', (error: Error) => {
      logger.error('Gemini Live error:', error);
      setFeedbackError(error.message);
    });

    return () => {
      client.off('onCallStart');
      client.off('onCallEnd');
      client.off('onTranscript');
      client.off('onSpeechStart');
      client.off('onSpeechEnd');
      client.off('onError');
    };
  }, []);

  useEffect(() => {
    const missingFields = [];
    if (!jobTitle) missingFields.push('Job Title');
    if (!jobDescription) missingFields.push('Job Description');
    if (!questions || questions.length === 0) missingFields.push('Interview Questions');
    
    if (missingFields.length > 0) {
      setFeedbackError(`Missing required interview context: ${missingFields.join(', ')}`);
      logger.warn('Interview data validation failed:', { jobTitle, jobDescription, questions });
    }
  }, [jobTitle, jobDescription, questions]);

  const handleResumeUpload = async () => {
    if (!resumeFile || !interviewId) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('interviewId', interviewId);
      formData.append('resume', resumeFile);

      const res = await fetch('/api/interview/upload-resume', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload resume');

      setResumeText(data.resumeText);
      toast.success('Resume uploaded successfully!');
    } catch (error) {
      logger.error('Resume upload error:', error);
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateFeedback = useCallback(async (transcript: GeminiMessage[]) => {
    if (!interviewId || !userId) {
      setFeedbackError('Missing interview or user information.');
      return;
    }
    if (transcript.length === 0) {
      setFeedbackError('No conversation recorded.');
      return;
    }

    setIsGeneratingFeedback(true);
    setFeedbackError(null);

    try {
      const formattedTranscript = transcript.map(msg => ({ role: msg.role, content: msg.content }));
      const { success, feedbackId } = await createFeedback({ interviewId, userId, transcript: formattedTranscript });

      if (success && feedbackId) {
        router.push(`/interview/${interviewId}/feedback`);
      } else {
        throw new Error('createFeedback returned failure');
      }
    } catch (error) {
      logger.error('Feedback generation error:', error);
      setFeedbackError('An unexpected error occurred during feedback generation.');
      setIsGeneratingFeedback(false);
    }
  }, [interviewId, userId, router]);

  useEffect(() => {
    if (callStatus === CallStatus.FINISHED && !hasProcessedCallEnd.current) {
      hasProcessedCallEnd.current = true;
      handleGenerateFeedback(messages);
    }
  }, [callStatus, messages, handleGenerateFeedback]);

  const handleCall = async () => {
    setCallStatus(CallStatus.CONNECTING);
    setFeedbackError(null);
    hasProcessedCallEnd.current = false;

    try {
      const client = geminiClient.current;
      if (!jobTitle || !jobDescription || !questions || questions.length === 0) {
        throw new Error('Missing required interview context. Cannot start session.');
      }

      const systemInstruction = `
      You are an expert technical interviewer...
      - Candidate Name: ${userName}
      - Target Role: ${jobTitle} ${jobLevel ? `(${jobLevel})` : ''}
      ...
      CANDIDATE RESUME (Reference Only - Do not read aloud):
      ${resumeText || "No resume provided."}
      ...
      `;

      await client.start({ systemInstruction, voice: 'Charon' });

    } catch (error) {
      logger.error('Failed to start call:', error);
      setCallStatus(CallStatus.INACTIVE);
      setFeedbackError('Failed to start call. Please check your microphone and try again.');
    }
  };

  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    geminiClient.current.stop();
  };

  const latestMessage = messages[messages.length - 1]?.content || '';
  const isCallInactiveOrFinished = callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED;

  return (
    <>
      <div className="call-view">
        <div className="card-interviewer">...</div>
        <div className="card-border">...</div>
      </div>

      {messages.length > 0 && <div className="transcript-border">...</div>}

      {/* Resume Upload Section */}
      {!resumeText && isCallInactiveOrFinished && (
        <div className="text-center my-4 p-4 border rounded-lg">
          <h4 className="font-semibold mb-2">Upload Your Resume</h4>
          <p className="text-sm text-muted-foreground mb-4">
            For a more personalized interview, you can upload your resume.
          </p>
          <div className="flex justify-center items-center gap-2">
            <input 
              type="file" 
              id="resume-upload" 
              className="hidden"
              accept=".pdf,.docx,.txt"
              onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
            />
            <label htmlFor="resume-upload" className="btn-secondary cursor-pointer">
              <FileUp className="w-4 h-4 mr-2" />
              {resumeFile ? resumeFile.name : 'Choose File'}
            </label>
            <button onClick={handleResumeUpload} className="btn-primary" disabled={!resumeFile || isUploading}>
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload'}
            </button>
          </div>
        </div>
      )}

      {isGeneratingFeedback && <div className="text-center mt-6 p-6">...</div>}
      {feedbackError && <div className="text-center mt-6 p-6">...</div>}

      <div className="w-full flex justify-center">
        {callStatus !== CallStatus.ACTIVE && !isGeneratingFeedback ? (
          <button className="relative btn-call" onClick={handleCall} disabled={isGeneratingFeedback}>
            <span className={cn("absolute rounded-full opacity-75 animate-ping", callStatus !== CallStatus.CONNECTING && 'hidden')} />
            <span>{isCallInactiveOrFinished ? 'Start Call' : 'Connecting...'}</span>
          </button>
        ) : callStatus === CallStatus.ACTIVE ? (
          <button className="btn-disconnect" onClick={handleDisconnect}>End Interview</button>
        ) : null}
      </div>
    </>
  );
};

export default Agent;