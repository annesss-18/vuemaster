// components/InterviewAgent/index.tsx
'use client';

import { useInterviewLiveAPI } from '@/lib/hooks/useInterviewLiveAPI';
import InterviewHeader from './InterviewHeader';
import InterviewStatus from './InterviewStatus';
import ConversationView from './ConversationView';
import CallControls from './CallControls';
import FeedbackLoading from './FeedbackLoading';

interface InterviewAgentProps {
    userName: string;
    userId?: string;
    interviewId: string;
    jobTitle: string;
    jobLevel: string;
    jobDescription: string;
    questions: string[];
    resumeText?: string;
}

export default function InterviewAgent({
    userName,
    userId,
    interviewId,
    jobTitle,
    jobLevel,
    jobDescription,
    questions,
    resumeText,
}: InterviewAgentProps) {
    const {
        connectionState,
        isConnected,
        isConnecting,
        isReconnecting,
        isSpeaking,
        messages,
        error,
        reconnectAttempt,
        connect,
        disconnect,
        isGeneratingFeedback,
    } = useInterviewLiveAPI({
        interviewId,
        jobTitle,
        jobLevel,
        jobDescription,
        questions,
        resumeText,
        userName,
        userId,
    });

    // Show feedback loading state
    if (isGeneratingFeedback) {
        return <FeedbackLoading />;
    }

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Interview Header with Avatar */}
            <InterviewHeader
                isSpeaking={isSpeaking}
                isConnected={isConnected}
                connectionState={connectionState}
                userName={userName}
            />

            {/* Current Message Display */}
            {messages.length > 0 && (
                <div className="transcript-border animate-fadeIn">
                    <div className="transcript">
                        <p className="line-clamp-3">
                            {messages[messages.length - 1]?.content || ''}
                        </p>
                    </div>
                </div>
            )}

            {/* Status Banner (errors, reconnecting, etc.) */}
            <InterviewStatus
                isConnecting={isConnecting}
                isReconnecting={isReconnecting}
                reconnectAttempt={reconnectAttempt}
                error={error}
            />

            {/* Conversation History */}
            <ConversationView
                messages={messages}
                userName={userName}
                isConnected={isConnected}
            />

            {/* Call Controls */}
            <CallControls
                isConnected={isConnected}
                isConnecting={isConnecting}
                isReconnecting={isReconnecting}
                hasError={!!error}
                onStart={connect}
                onEnd={disconnect}
            />
        </div>
    );
}