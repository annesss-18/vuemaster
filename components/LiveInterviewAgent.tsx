'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useLiveInterview, TranscriptEntry } from '@/lib/hooks/useLiveInterview';
import { useAudioCapture } from '@/lib/hooks/useAudioCapture';
import { useAudioPlayback } from '@/lib/hooks/useAudioPlayback';
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

    // Interview context for the AI
    const interviewContext = {
        role: interview.role,
        companyName: interview.companyName,
        level: interview.level,
        type: interview.type,
        techStack: interview.techstack,
        questions: interview.questions,
        resumeText: interview.resumeText,
    };

    // Initialize hooks
    const {
        status: connectionStatus,
        error: connectionError,
        transcript,
        isAIResponding,
        elapsedTime,
        connect,
        disconnect,
        sendAudio,
        onAudioReceived,
    } = useLiveInterview({
        sessionId,
        interviewContext,
        onInterruption: () => {
            // Clear audio queue when user interrupts
            clearAudioQueue();
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
        onAudioReceived((base64Data) => {
            queueAudio(base64Data);
        });
    }, [onAudioReceived, queueAudio]);

    // Handle audio capture -> send to API
    const handleAudioChunk = useCallback((chunk: string) => {
        if (!isMuted) {
            sendAudio(chunk);
        }
    }, [sendAudio, isMuted]);

    // Start interview
    const handleStartInterview = async () => {
        try {
            setPhase('active');
            await connect();

            // Start capturing after connection
            await startCapture(handleAudioChunk);

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

    // Setup phase - Start button
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
                                Click the button below to begin your live interview. Make sure your microphone is enabled and you're in a quiet environment.
                            </p>
                        </div>

                        <div className="flex flex-col items-center gap-4">
                            <button
                                onClick={handleStartInterview}
                                className="btn-primary text-lg px-8 py-4 group"
                            >
                                <Phone className="size-5" />
                                <span className="font-semibold">Start Live Interview</span>
                            </button>
                            <p className="text-xs text-light-400">
                                Session duration: up to 15 minutes
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Active interview phase
    return (
        <div className="space-y-6 animate-slideInLeft" style={{ animationDelay: '0.2s' }}>
            {/* Connection Status Bar */}
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

            {/* Transcript Panel */}
            <div className="card-border">
                <div className="card !p-0 overflow-hidden">
                    <div className="p-4 border-b border-primary-400/20 bg-dark-200/40">
                        <h3 className="text-lg font-semibold text-light-100 flex items-center gap-2">
                            <Sparkles className="size-5 text-primary-300" />
                            Live Transcript
                        </h3>
                    </div>

                    <div className="h-80 overflow-y-auto p-4 space-y-4">
                        {transcript.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                {connectionStatus === 'connecting' ? (
                                    <>
                                        <Loader2 className="size-8 text-primary-300 animate-spin mb-4" />
                                        <p className="text-light-300">Connecting to AI interviewer...</p>
                                    </>
                                ) : (
                                    <>
                                        <Mic className="size-8 text-light-400 mb-4" />
                                        <p className="text-light-300">Start speaking to begin the interview</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            transcript.map((entry, index) => (
                                <TranscriptEntryComponent key={index} entry={entry} />
                            ))
                        )}

                        {/* AI responding indicator */}
                        {isAIResponding && (
                            <div className="flex items-start gap-3">
                                <div className="size-8 rounded-full bg-primary-500/20 border border-primary-400/40 flex items-center justify-center shrink-0">
                                    <Bot className="size-4 text-primary-300" />
                                </div>
                                <div className="flex items-center gap-2 py-2">
                                    <div className="flex gap-1">
                                        <span className="size-2 rounded-full bg-primary-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="size-2 rounded-full bg-primary-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="size-2 rounded-full bg-primary-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Audio status bar */}
                    <div className="p-3 border-t border-primary-400/20 bg-dark-200/40">
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                {isCapturing && !isMuted && (
                                    <>
                                        <div className="size-2 rounded-full bg-success-100 animate-pulse" />
                                        <span className="text-light-300">Listening...</span>
                                    </>
                                )}
                                {isMuted && (
                                    <>
                                        <MicOff className="size-3 text-warning-200" />
                                        <span className="text-warning-200">Muted</span>
                                    </>
                                )}
                            </div>
                            {isPlaying && (
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-0.5">
                                        {[...Array(4)].map((_, i) => (
                                            <div
                                                key={i}
                                                className="w-1 bg-primary-300 rounded-full animate-pulse"
                                                style={{
                                                    height: `${Math.random() * 12 + 4}px`,
                                                    animationDelay: `${i * 100}ms`,
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-light-300">AI speaking...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Session time warning */}
            {sessionTimeWarning && (
                <div className="card-border">
                    <div className="card !p-4 bg-warning-200/10 border-warning-200/30">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="size-5 text-warning-200" />
                            <p className="text-sm text-warning-200">
                                Session nearing 15-minute limit. Consider wrapping up the interview.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Transcript entry component
function TranscriptEntryComponent({ entry }: { entry: TranscriptEntry }) {
    const isUser = entry.role === 'user';

    return (
        <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
            <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${isUser
                    ? 'bg-accent-300/20 border border-accent-300/40'
                    : 'bg-primary-500/20 border border-primary-400/40'
                }`}>
                {isUser ? (
                    <User className="size-4 text-accent-300" />
                ) : (
                    <Bot className="size-4 text-primary-300" />
                )}
            </div>
            <div className={`flex-1 ${isUser ? 'text-right' : ''}`}>
                <p className={`text-xs font-medium mb-1 ${isUser ? 'text-accent-300' : 'text-primary-300'}`}>
                    {isUser ? 'You' : 'AI Interviewer'}
                </p>
                <div className={`inline-block rounded-2xl px-4 py-2 max-w-[85%] ${isUser
                        ? 'bg-accent-300/10 border border-accent-300/20 text-light-200'
                        : 'bg-dark-200/60 border border-primary-400/20 text-light-100'
                    }`}>
                    <p className="text-sm">{entry.content}</p>
                </div>
            </div>
        </div>
    );
}

export default LiveInterviewAgent;
