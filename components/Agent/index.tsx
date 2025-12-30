'use client';

import { useEffect, useRef } from 'react';
import { useInterviewCall } from '@/components/hooks/useInterviewCall';
import { useFeedbackGeneration } from '@/components/hooks/useFeedbackGeneration';
import InterviewerAvatar from './InterviewerAvatar';
import ConversationView from './ConversationView';
import ResumeUploadCard from './ResumeUploadCard';
import ConnectionStatusBanner from './ConnectionStatusBanner';
import CallControls from './CallControls';
import FeedbackLoadingState from './FeedbackLoadingState';

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

export default function Agent({
    userName,
    userId,
    interviewId,
    questions,
    jobTitle,
    jobLevel,
    jobDescription,
    resumeText: initialResumeText
}: AgentProps) {
    const hasProcessedCallEnd = useRef(false);

    // Interview call management
    const {
        connectionState,
        isSpeaking,
        messages,
        error: callError,
        reconnectAttempt,
        startCall,
        endCall,
        isConnected,
        isConnecting,
        isReconnecting
    } = useInterviewCall({
        userName,
        jobTitle,
        jobLevel,
        jobDescription,
        questions,
        resumeText: initialResumeText
    });

    // Feedback generation
    const {
        isGenerating: isGeneratingFeedback,
        error: feedbackError,
        generateFeedback
    } = useFeedbackGeneration({ interviewId, userId });

    // Auto-generate feedback when call ends
    useEffect(() => {
        if (connectionState === 'disconnected' && messages.length > 0 && !hasProcessedCallEnd.current) {
            hasProcessedCallEnd.current = true;
            generateFeedback(messages);
        }
    }, [connectionState, messages, generateFeedback]);

    // Connection state label
    const getConnectionStateLabel = () => {
        switch (connectionState) {
            case 'connected':
                return 'Live Interview';
            case 'connecting':
                return 'Connecting...';
            case 'reconnecting':
                return 'Reconnecting...';
            case 'failed':
                return 'Connection Failed';
            default:
                return 'Ready to Start';
        }
    };

    const latestMessage = messages[messages.length - 1]?.content || '';
    const hasError = !!(callError || feedbackError);
    const showResumeUpload = !initialResumeText && (connectionState === 'disconnected' || connectionState === 'failed');

    return (
        <div className="space-y-8">
            {/* Interview Call Interface */}
            <div className="call-view">
                {/* AI Interviewer Avatar */}
                <InterviewerAvatar
                    isSpeaking={isSpeaking}
                    isConnected={isConnected}
                    connectionStateLabel={getConnectionStateLabel()}
                />

                {/* Conversation View */}
                <ConversationView messages={messages} userName={userName} />
            </div>

            {/* Current Message Display */}
            {messages.length > 0 && (
                <div className="transcript-border animate-fadeIn">
                    <div className="transcript">
                        <p className="line-clamp-3">{latestMessage}</p>
                    </div>
                </div>
            )}

            {/* Connection Status Banner */}
            <ConnectionStatusBanner
                isConnecting={isConnecting}
                isReconnecting={isReconnecting}
                reconnectAttempt={reconnectAttempt}
                error={callError || feedbackError}
            />

            {/* Resume Upload */}
            {showResumeUpload && (
                <ResumeUploadCard interviewId={interviewId} />
            )}

            {/* Feedback Generation Loading */}
            {isGeneratingFeedback && <FeedbackLoadingState />}

            {/* Call Controls */}
            {!isGeneratingFeedback && (
                <CallControls
                    isConnected={isConnected}
                    isConnecting={isConnecting}
                    isReconnecting={isReconnecting}
                    hasError={hasError}
                    onStart={startCall}
                    onEnd={endCall}
                />
            )}
        </div>
    );
}