'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { getGeminiLiveClient, type GeminiMessage } from '@/lib/gemini-live';
import { createFeedback } from '@/lib/actions/general.action';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { FileUp, Loader2, Mic, MicOff, PhoneCall, PhoneOff, Upload, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload PDF, DOCX, or TXT.');
      e.target.value = ''; // Reset input
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 5MB.');
      e.target.value = '';
      return;
    }

    setResumeFile(file);
    toast.success(`${file.name} selected - ready to upload`);
  };

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
    // Validate required interview properties
    const missingFields = [];

    if (!jobTitle) missingFields.push('Job Title');
    if (!jobDescription || jobDescription.trim().length === 0) missingFields.push('Job Description');
    if (!questions || questions.length === 0) missingFields.push('Interview Questions');
    if (!jobLevel) missingFields.push('Job Level');

    if (missingFields.length > 0) {
      const errorMsg = `Missing required interview context: ${missingFields.join(', ')}. The interview cannot be started without this information. Please try generating the interview again or contact support if the issue persists.`;
      setFeedbackError(errorMsg);
      logger.error('Interview validation failed:', {
        jobTitle,
        jobDescription: jobDescription?.substring(0, 100),
        questionsCount: questions?.length,
        jobLevel,
        missingFields
      });
    } else {
      // Clear any previous validation errors if all fields are now present
      setFeedbackError(null);
    }
  }, [jobTitle, jobDescription, questions, jobLevel]);

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
    // Validate required properties before starting
    if (!jobTitle || !jobDescription || !questions || questions.length === 0) {
      const missing = [];
      if (!jobTitle) missing.push('job title');
      if (!jobDescription) missing.push('job description');
      if (!questions || questions.length === 0) missing.push('interview questions');

      const errorMsg = `Cannot start interview - missing ${missing.join(', ')}. Please try generating the interview again.`;
      setFeedbackError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setCallStatus(CallStatus.CONNECTING);
    setFeedbackError(null);
    hasProcessedCallEnd.current = false;

    try {
      const client = geminiClient.current;

      const systemInstruction = `
      You are an expert technical interviewer conducting a ${jobLevel || ''} ${jobTitle} interview.
      
      INTERVIEW CONTEXT:
      - Candidate Name: ${userName}
      - Target Role: ${jobTitle} ${jobLevel ? `(${jobLevel} level)` : ''}
      - Interview Type: Professional assessment
      
      JOB DESCRIPTION:
      ${jobDescription.substring(0, 3000)}
      
      PREPARED QUESTIONS (use these as guidance, but feel free to ask follow-ups):
      ${questions.slice(0, 7).map((q, i) => `${i + 1}. ${q}`).join('\n')}
      
      CANDIDATE RESUME (Reference Only - Do not read aloud):
      ${resumeText || "No resume provided."}
      
      INSTRUCTIONS:
      1. Start with a warm greeting and brief introduction
      2. Ask the prepared questions naturally, one at a time
      3. Listen carefully to responses and ask relevant follow-up questions
      4. Keep questions conversational and professional
      5. Take note of technical details, problem-solving approaches, and communication skills
      6. Guide the candidate if they seem stuck, but don't give away answers
      7. Conclude professionally when all key areas are covered
      
      Remember: You're evaluating both technical competency and communication skills.
      `;

      await client.start({ systemInstruction, voice: 'Charon' });

    } catch (error) {
      logger.error('Failed to start call:', error);
      setCallStatus(CallStatus.INACTIVE);
      const errorMsg = error instanceof Error ? error.message : 'Failed to start interview';
      setFeedbackError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    geminiClient.current.stop();
  };

  const latestMessage = messages[messages.length - 1]?.content || '';
  const isCallInactiveOrFinished = callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED;

  return (
    <div className="space-y-8">
      {/* Interview Call Interface */}
      <div className="call-view">
        {/* AI Interviewer Card */}
        <div className="card-interviewer group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="relative z-10 space-y-6 flex flex-col items-center">
            <div className="avatar group-hover:scale-105 transition-transform duration-500">
              {isSpeaking && (
                <>
                  <span className="animate-speak" />
                  <span className="animate-speak" style={{ animationDelay: '0.5s' }} />
                </>
              )}
              <Image
                src="/profile.svg"
                alt="AI Interviewer"
                width={100}
                height={100}
                className="size-24 relative z-20"
              />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-primary-100">AI Interviewer</h3>
              <div className="flex items-center justify-center gap-2">
                <div className={cn(
                  "size-2 rounded-full transition-all duration-300",
                  callStatus === CallStatus.ACTIVE ? "bg-success-100 animate-pulse" :
                    callStatus === CallStatus.CONNECTING ? "bg-warning-200 animate-pulse" :
                      "bg-light-400"
                )} />
                <span className="text-sm font-medium text-light-300 capitalize">
                  {callStatus === CallStatus.ACTIVE ? 'Live Interview' :
                    callStatus === CallStatus.CONNECTING ? 'Connecting...' :
                      callStatus === CallStatus.FINISHED ? 'Interview Ended' :
                        'Ready to Start'}
                </span>
              </div>
            </div>

            {/* Status Messages */}
            {callStatus === CallStatus.CONNECTING && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-warning-200/20 border border-warning-200/30 backdrop-blur-sm animate-fadeIn">
                <Loader2 className="size-4 text-warning-200 animate-spin" />
                <span className="text-sm text-warning-200 font-medium">Initializing AI & Microphone...</span>
              </div>
            )}

            {callStatus === CallStatus.ACTIVE && (
              <div className="flex flex-col items-center gap-3">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-success-100/20 border border-success-100/30 backdrop-blur-sm animate-fadeIn">
                    <Mic className="size-4 text-success-100" />
                    <span className="text-sm text-success-100 font-medium">Microphone Active</span>
                  </div>
                  {isSpeaking && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/20 border border-primary-400/30 backdrop-blur-sm animate-fadeIn">
                      <Sparkles className="size-4 text-primary-300 animate-pulse" />
                      <span className="text-sm text-primary-200 font-medium">AI is speaking</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-light-400 text-center max-w-xs">
                  Speak clearly and naturally. The AI is listening and will respond.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Conversation Card */}
        <div className="card-border flex-1 sm:basis-1/2 w-full max-md:hidden">
          <div className="card-content h-[420px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-light-100">Conversation</h3>
              <span className="text-sm text-light-400">{messages.length} messages</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[320px] scrollbar-thin scrollbar-thumb-primary-400/30 scrollbar-track-dark-200/30">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <div className="size-16 rounded-2xl bg-primary-500/10 border border-primary-400/30 flex items-center justify-center">
                    <PhoneCall className="size-8 text-primary-300" />
                  </div>
                  <p className="text-light-400 text-sm">Start the interview to see the conversation</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-3 animate-fadeIn p-3 rounded-xl transition-all duration-300",
                      msg.role === 'assistant'
                        ? "bg-primary-500/10 border border-primary-400/20"
                        : "bg-dark-200/60 border border-light-400/20"
                    )}
                  >
                    <div className={cn(
                      "size-8 rounded-full flex items-center justify-center shrink-0",
                      msg.role === 'assistant'
                        ? "bg-primary-500/20 border border-primary-400/30"
                        : "bg-dark-300 border border-light-400/30"
                    )}>
                      {msg.role === 'assistant' ? (
                        <Sparkles className="size-4 text-primary-300" />
                      ) : (
                        <span className="text-xs font-bold text-light-300">{userName[0]}</span>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-semibold text-light-400">
                        {msg.role === 'assistant' ? 'AI Interviewer' : userName}
                      </p>
                      <p className="text-sm text-light-200 leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Current Message Display */}
      {messages.length > 0 && (
        <div className="transcript-border animate-fadeIn">
          <div className="transcript">
            <p className="line-clamp-3">{latestMessage}</p>
          </div>
        </div>
      )}

      {/* Resume Upload Section */}
      {!resumeText && isCallInactiveOrFinished && (
        <div className="card-border animate-fadeIn">
          <div className="card !p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <FileUp className="size-5 text-primary-300" />
                  <h4 className="font-semibold text-light-100">Optional: Upload Your Resume</h4>
                </div>
                <p className="text-sm text-light-400">
                  Enhance your interview experience by uploading your resume. The AI will tailor questions based on your background.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                <label className="btn-upload bg-dark-200/60 min-h-12 cursor-pointer transition-all duration-300 hover:border-primary-400/50">
                  <input
                    type="file"
                    id="resume-upload"
                    className="hidden"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileSelect}
                  />
                  <FileUp className="size-5 text-primary-300 group-hover:scale-110 transition-transform duration-300" />
                  <span className="text-sm font-medium text-light-200 truncate max-w-[200px]">
                    {resumeFile ? resumeFile.name : 'Choose File'}
                  </span>
                </label>

                <button
                  onClick={handleResumeUpload}
                  className="btn-secondary !px-6 !py-3 !min-h-12"
                  disabled={!resumeFile || isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="size-4" />
                      <span>Upload</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Generation Status */}
      {isGeneratingFeedback && (
        <div className="card-border animate-fadeIn">
          <div className="card !p-8">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/30 to-accent-300/30 rounded-full blur-2xl animate-pulse" />
                <div className="relative size-24 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center">
                  <Loader2 className="size-12 text-white animate-spin" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-light-100">Analyzing Your Performance</h3>
                <p className="text-light-300 max-w-md">
                  Our AI is evaluating your responses and generating detailed feedback. This will only take a moment...
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/20 border border-primary-400/30 backdrop-blur-sm">
                  <CheckCircle2 className="size-4 text-primary-300" />
                  <span className="text-sm text-primary-200 font-medium">Analyzing responses</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-dark-200/60 border border-light-400/20">
                  <Loader2 className="size-4 text-light-400 animate-spin" />
                  <span className="text-sm text-light-400 font-medium">Generating scores</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {feedbackError && (
        <div className="card-border animate-fadeIn">
          <div className="card !p-6 !bg-destructive-100/10 border-destructive-100/30">
            <div className="flex flex-col md:flex-row items-start gap-4">
              <div className="size-12 rounded-xl bg-destructive-100/20 border border-destructive-100/30 flex items-center justify-center shrink-0">
                <AlertCircle className="size-6 text-destructive-100" />
              </div>
              <div className="flex-1 space-y-3">
                <h3 className="text-lg font-semibold text-destructive-100">Error Occurred</h3>
                <p className="text-sm text-light-200 leading-relaxed">{feedbackError}</p>

                {feedbackError.includes('microphone') && (
                  <div className="p-3 rounded-lg bg-dark-200/50 border border-primary-400/20">
                    <p className="text-xs text-light-300 font-semibold mb-2">💡 Troubleshooting Tips:</p>
                    <ul className="text-xs text-light-400 space-y-1 list-disc list-inside">
                      <li>Check if your microphone is properly connected</li>
                      <li>Ensure browser has permission to access microphone (check browser settings)</li>
                      <li>Close other applications that might be using the microphone</li>
                      <li>Try refreshing the page and starting again</li>
                    </ul>
                  </div>
                )}

                {feedbackError.includes('Missing required') && (
                  <div className="p-3 rounded-lg bg-dark-200/50 border border-primary-400/20">
                    <p className="text-xs text-light-300 font-semibold mb-2">💡 What to do:</p>
                    <p className="text-xs text-light-400">
                      This interview has incomplete data. Please go back and generate a new interview with a proper job description.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Call Controls */}
      <div className="w-full flex justify-center">
        {callStatus !== CallStatus.ACTIVE && !isGeneratingFeedback ? (
          <button
            className="relative btn-call group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            onClick={handleCall}
            disabled={isGeneratingFeedback || !!feedbackError}
            title={feedbackError ? 'Cannot start - interview has errors' : 'Start Interview'}
          >
            <span className={cn(
              "absolute rounded-full opacity-75 animate-ping",
              callStatus !== CallStatus.CONNECTING && 'hidden'
            )} />
            <PhoneCall className="size-6" />
            <span className="font-bold">
              {isCallInactiveOrFinished ? 'Start Interview' : 'Connecting...'}
            </span>
          </button>
        ) : callStatus === CallStatus.ACTIVE ? (
          <button
            className="btn-disconnect group"
            onClick={handleDisconnect}
          >
            <PhoneOff className="size-6" />
            <span className="font-bold">End Interview</span>
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default Agent;