'use client';

import { useEffect, useCallback, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useLiveInterview } from '@/lib/hooks/useLiveInterview';
import { useAudioCapture } from '@/lib/hooks/useAudioCapture';
import { useAudioPlayback } from '@/lib/hooks/useAudioPlayback';
import { ResumeUploader } from '@/components/ResumeUploader';
import { logger } from '@/lib/logger';
import { Mic, MicOff, Phone, PhoneOff, Loader2, AlertCircle, Sparkles, Clock, User, Bot } from 'lucide-react';
import type { Interview } from '@/types';

interface LiveInterviewAgentProps {
    interview: Interview;
    sessionId: string;
    userId: string;
}

type InterviewPhase = 'setup' | 'active' | 'ending' | 'completed';

export function LiveInterviewAgent({ interview, sessionId, userId }: LiveInterviewAgentProps) {
    const router = useRouter();

    const [phase, setPhase] = useState<InterviewPhase>('setup');
    const [isMuted, setIsMuted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [resumeText, setResumeText] = useState<string | undefined>(interview.resumeText);
    const [isUpdatingSession, setIsUpdatingSession] = useState(false);

    // Interview context for the AI - includes uploaded resume
    const interviewContext = useMemo(() => ({
        role: interview.role,
        companyName: interview.companyName,
        level: interview.level,
        type: interview.type,
        techStack: interview.techstack,
        questions: interview.questions,
        resumeText: resumeText,
        systemInstruction: interview.systemInstruction,
    }), [interview, resumeText]);

    // Initialize hooks
    const {
        status: connectionStatus,
        error: connectionError,
        transcript,
        isAIResponding,
        isUserSpeaking,
        currentCaption,
        currentSpeaker,
        elapsedTime,
        connect,
        disconnect,
        sendAudio,
        sendInitialPrompt,
        onAudioReceived,
    } = useLiveInterview({
        sessionId,
        interviewContext,
        onInterruption: () => {
            // Clear audio queue when user interrupts
            clearAudioQueue();
        },
        onInterviewComplete: () => {
            // AI has naturally concluded the interview - auto-end it
            logger.info('Interview naturally completed, triggering auto-end');
            toast.info('Interview completed! Generating your feedback...');
            handleEndInterview();
        },
    });

    const {
        isCapturing,
        error: captureError,
        startCapture,
        stopCapture,
    } = useAudioCapture();

    const {
        isPlaying,
        queueAudio,
        clearQueue: clearAudioQueue,
        stop: stopPlayback,
    } = useAudioPlayback();

    // Set up audio playback callback
    useEffect(() => {
        logger.debug('🎧 Registering audio playback callback');
        onAudioReceived((base64Data) => {
            logger.debug('🎵 Audio callback triggered, forwarding to playback');
            queueAudio(base64Data);
        });
    }, [onAudioReceived, queueAudio]);

    // Handle audio capture -> send to API
    const handleAudioChunk = useCallback((chunk: string) => {
        if (!isMuted) {
            sendAudio(chunk);
        }
    }, [sendAudio, isMuted]);

    // Handle resume upload
    const handleResumeUploaded = useCallback(async (text: string) => {
        setResumeText(text);
        setIsUpdatingSession(true);

        try {
            // Update session with resume text
            const response = await fetch(`/api/interview/session/${sessionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resumeText: text }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to save resume');
            }
        } catch (error) {
            console.error('Failed to update session with resume:', error);
            // Don't show error toast - resume is still usable locally
        } finally {
            setIsUpdatingSession(false);
        }
    }, [sessionId]);

    // Handle resume clear
    const handleResumeClear = useCallback(async () => {
        setResumeText(undefined);

        try {
            await fetch(`/api/interview/session/${sessionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resumeText: '' }),
            });
        } catch (error) {
            console.error('Failed to clear resume from session:', error);
        }
    }, [sessionId]);

    // Start interview
    const handleStartInterview = async () => {
        try {
            setPhase('active');

            // Register callback
            logger.debug('🎧 Registering audio callback in handleStartInterview');
            onAudioReceived((base64Data) => {
                logger.debug('🎵 Audio received, length:', base64Data.length);
                queueAudio(base64Data);
            });

            // Start capturing FIRST to ensure we have mic access and user gesture is preserved
            await startCapture(handleAudioChunk);

            // Connect to Live API
            // Note: Initial prompt is sent automatically in the onopen callback
            await connect();

        } catch (error) {
            setPhase('setup');
            toast.error(error instanceof Error ? error.message : 'Failed to start interview');
        }
    };

    // End interview
    const handleEndInterview = async () => {
        setPhase('ending');

        // Stop capture and disconnect
        stopCapture();
        stopPlayback();
        disconnect();

        if (transcript.length === 0) {
            toast.error('No conversation recorded. Please try again.');
            setPhase('setup');
            return;
        }

        // Submit transcript for feedback
        setIsSubmitting(true);

        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    interviewId: sessionId,
                    transcript: transcript.map(t => ({
                        role: t.role === 'user' ? 'Candidate' : 'Interviewer',
                        content: t.content,
                    })),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate feedback');
            }

            const result = await response.json();

            if (result.success) {
                toast.success('Interview completed! Generating feedback...');
                setPhase('completed');
                router.push(`/interview/session/${sessionId}/feedback`);
            } else {
                throw new Error(result.message || 'Failed to generate feedback');
            }

        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to submit interview');
            setPhase('active');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Toggle mute
    const handleToggleMute = () => {
        setIsMuted(!isMuted);
        if (!isMuted) {
            toast.info('Microphone muted');
        } else {
            toast.info('Microphone unmuted');
        }
    };

    // Format elapsed time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Session time warning (15 min limit)
    const sessionTimeWarning = elapsedTime >= 840; // 14 minutes

    // Error state
    if (connectionError || captureError) {
        return (
            <div className="card-border animate-slideInLeft" style={{ animationDelay: '0.2s' }}>
                <div className="card !p-8">
                    <div className="flex flex-col items-center gap-6 text-center">
                        <div className="size-16 rounded-full bg-destructive-100/20 border-2 border-destructive-100/30 flex items-center justify-center">
                            <AlertCircle className="size-8 text-destructive-100" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold text-light-100">Connection Error</h3>
                            <p className="text-light-300">{connectionError || captureError}</p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="btn-primary"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Setup phase - Start button with resume upload
    if (phase === 'setup') {
        return (
            <div className="card-border animate-slideInLeft" style={{ animationDelay: '0.2s' }}>
                <div className="card !p-8">
                    <div className="flex flex-col items-center gap-8 text-center">
                        <div className="relative">
                            <div className="size-24 rounded-full bg-primary-500/20 border-2 border-primary-500/40 flex items-center justify-center">
                                <Mic className="size-12 text-primary-300" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 size-8 rounded-full bg-success-100 border-2 border-dark-100 flex items-center justify-center">
                                <Sparkles className="size-4 text-dark-100" />
                            </div>
                        </div>

                        <div className="space-y-3 max-w-md">
                            <h3 className="text-2xl font-bold text-light-100">Ready to Start</h3>
                            <p className="text-light-300">
                                Upload your resume for a personalized interview, then click start when ready. Make sure your microphone is enabled.
                            </p>
                        </div>

                        {/* Resume Upload Section */}
                        <ResumeUploader
                            onResumeUploaded={handleResumeUploaded}
                            onResumeClear={handleResumeClear}
                            initialResumeText={interview.resumeText}
                        />

                        <div className="flex flex-col items-center gap-4">
                            <button
                                onClick={handleStartInterview}
                                disabled={isUpdatingSession}
                                className="btn-primary text-lg px-8 py-4 group disabled:opacity-50"
                            >
                                {isUpdatingSession ? (
                                    <Loader2 className="size-5 animate-spin" />
                                ) : (
                                    <Phone className="size-5" />
                                )}
                                <span className="font-semibold">
                                    {resumeText ? 'Start Personalized Interview' : 'Start Live Interview'}
                                </span>
                            </button>
                            <p className="text-xs text-light-400">
                                Session duration: up to 15 minutes
                                {resumeText && ' • Resume attached'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Active interview phase
    return (
        <div className="animate-slideInLeft flex flex-col gap-4" style={{ animationDelay: '0.2s' }}>
            {/* Top Bar with Status and Controls */}
            <div className="card-border">
                <div className="card !p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {/* Status indicator */}
                            <div className="flex items-center gap-2">
                                <div className={`size-3 rounded-full ${connectionStatus === 'connected'
                                    ? 'bg-success-100 animate-pulse'
                                    : connectionStatus === 'connecting'
                                        ? 'bg-warning-200 animate-pulse'
                                        : 'bg-light-400'
                                    }`} />
                                <span className="text-sm font-medium text-light-200 capitalize">
                                    {connectionStatus}
                                </span>
                            </div>

                            {/* Timer */}
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${sessionTimeWarning
                                ? 'bg-warning-200/20 border border-warning-200/30'
                                : 'bg-dark-200/60 border border-primary-400/20'
                                }`}>
                                <Clock className={`size-4 ${sessionTimeWarning ? 'text-warning-200' : 'text-light-300'}`} />
                                <span className={`text-sm font-mono ${sessionTimeWarning ? 'text-warning-200' : 'text-light-200'}`}>
                                    {formatTime(elapsedTime)}
                                </span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-3">
                            {/* Mute button */}
                            <button
                                onClick={handleToggleMute}
                                disabled={connectionStatus !== 'connected'}
                                className={`p-3 rounded-full transition-all ${isMuted
                                    ? 'bg-destructive-100/20 border border-destructive-100/40 text-destructive-100'
                                    : 'bg-primary-500/20 border border-primary-400/40 text-primary-300 hover:bg-primary-500/30'
                                    }`}
                            >
                                {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
                            </button>

                            {/* End call button */}
                            <button
                                onClick={handleEndInterview}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-destructive-100 hover:bg-destructive-100/80 text-white font-medium transition-all"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="size-5 animate-spin" />
                                ) : (
                                    <PhoneOff className="size-5" />
                                )}
                                <span>End Interview</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Interview View - Immersive Speaker Indicator */}
            <div className="card-border flex-1">
                <div className="card !p-0 h-[60vh] flex flex-col items-center justify-center relative overflow-hidden">

                    {/* Central Speaker Indicator */}
                    <div className="flex flex-col items-center gap-6">
                        {/* Connecting State */}
                        {connectionStatus === 'connecting' && (
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative">
                                    <div className="size-32 rounded-full bg-primary-500/20 border-2 border-primary-400/40 flex items-center justify-center">
                                        <Loader2 className="size-16 text-primary-300 animate-spin" />
                                    </div>
                                </div>
                                <p className="text-light-300 text-lg">Connecting to AI interviewer...</p>
                            </div>
                        )}

                        {/* AI Speaking State */}
                        {connectionStatus === 'connected' && isAIResponding && (
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative">
                                    {/* Pulsing rings */}
                                    <div className="absolute inset-0 rounded-full bg-primary-400/20 animate-ping" style={{ animationDuration: '1.5s' }} />
                                    <div className="absolute -inset-4 rounded-full bg-primary-400/10 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />

                                    <div className="relative size-32 rounded-full bg-gradient-to-br from-primary-500/30 to-primary-600/30 border-2 border-primary-400/60 flex items-center justify-center shadow-glow">
                                        <Bot className="size-16 text-primary-300" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <span className="size-2 rounded-full bg-primary-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="size-2 rounded-full bg-primary-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="size-2 rounded-full bg-primary-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                    <span className="text-primary-300 font-medium">AI Interviewer Speaking</span>
                                </div>
                            </div>
                        )}

                        {/* User Speaking State */}
                        {connectionStatus === 'connected' && isUserSpeaking && !isAIResponding && (
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative">
                                    {/* Pulsing rings */}
                                    <div className="absolute inset-0 rounded-full bg-accent-400/20 animate-ping" style={{ animationDuration: '1.5s' }} />
                                    <div className="absolute -inset-4 rounded-full bg-accent-400/10 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />

                                    <div className="relative size-32 rounded-full bg-gradient-to-br from-accent-400/30 to-accent-500/30 border-2 border-accent-300/60 flex items-center justify-center shadow-glow-accent">
                                        <User className="size-16 text-accent-300" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="size-2 rounded-full bg-accent-300 animate-pulse" />
                                    <span className="text-accent-300 font-medium">You are speaking</span>
                                </div>
                            </div>
                        )}

                        {/* Idle/Listening State */}
                        {connectionStatus === 'connected' && !isAIResponding && !isUserSpeaking && (
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative">
                                    <div className="size-32 rounded-full bg-dark-300/60 border-2 border-primary-400/30 flex items-center justify-center">
                                        {isMuted ? (
                                            <MicOff className="size-16 text-warning-200" />
                                        ) : (
                                            <Mic className="size-16 text-light-400" />
                                        )}
                                    </div>
                                </div>
                                <p className="text-light-400">
                                    {isMuted ? 'Microphone muted' : 'Listening...'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Subtitle Caption Overlay - Fixed at Bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                        <div className="max-w-3xl mx-auto">
                            {currentCaption && (
                                <div className={`subtitle-container animate-fadeIn ${currentSpeaker === 'model'
                                    ? 'bg-primary-900/80 border-primary-400/30'
                                    : 'bg-accent-900/80 border-accent-300/30'
                                    }`}>
                                    <div className="flex items-start gap-3">
                                        <div className={`shrink-0 size-6 rounded-full flex items-center justify-center ${currentSpeaker === 'model'
                                            ? 'bg-primary-500/30'
                                            : 'bg-accent-400/30'
                                            }`}>
                                            {currentSpeaker === 'model' ? (
                                                <Bot className="size-3.5 text-primary-300" />
                                            ) : (
                                                <User className="size-3.5 text-accent-300" />
                                            )}
                                        </div>
                                        <p className="text-lg text-light-100 leading-relaxed">
                                            {currentCaption}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Muted status in subtitle area */}
                            {isMuted && !currentCaption && (
                                <div className="subtitle-container bg-warning-200/20 border-warning-200/30">
                                    <div className="flex items-center gap-2 justify-center">
                                        <MicOff className="size-4 text-warning-200" />
                                        <span className="text-warning-200 text-sm">Your microphone is muted</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Session time warning - Floating */}
                    {sessionTimeWarning && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-warning-200/20 border border-warning-200/30">
                                <AlertCircle className="size-4 text-warning-200" />
                                <span className="text-sm text-warning-200">Session nearing 15-minute limit</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default LiveInterviewAgent;
