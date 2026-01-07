// components/InterviewAgent/ConversationView.tsx
'use client';

import { PhoneCall, Sparkles } from 'lucide-react';
import type { LiveAPIMessage } from '@/lib/vertex-ai/types';

interface ConversationViewProps {
    messages: LiveAPIMessage[];
    userName: string;
    isConnected: boolean;
}

export default function ConversationView({
    messages,
    userName,
    isConnected,
}: ConversationViewProps) {
    return (
        <div className="card-border animate-slideInLeft" style={{ animationDelay: '0.1s' }}>
            <div className="card !p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-light-100">
                        Interview Transcript
                    </h3>
                    <span className="text-sm text-light-400">
                        {messages.length} messages
                    </span>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                            <div className="size-16 rounded-2xl bg-primary-500/10 border border-primary-400/30 flex items-center justify-center">
                                <PhoneCall className="size-8 text-primary-300" />
                            </div>
                            <div>
                                <p className="text-light-400 text-sm font-medium">
                                    {isConnected
                                        ? 'Interview in progress. Speak naturally...'
                                        : 'Start the interview to begin conversation'
                                    }
                                </p>
                            </div>
                        </div>
                    ) : (
                        messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`p-4 rounded-xl transition-all duration-300 animate-fadeIn ${msg.role === 'assistant'
                                        ? 'bg-primary-500/10 border border-primary-400/20'
                                        : 'bg-dark-200/60 border border-light-400/10'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Avatar */}
                                    <div
                                        className={`size-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'assistant'
                                                ? 'bg-primary-500/20 border border-primary-400/30'
                                                : 'bg-dark-300 border border-light-400/30'
                                            }`}
                                    >
                                        {msg.role === 'assistant' ? (
                                            <Sparkles className="size-4 text-primary-300" />
                                        ) : (
                                            <span className="text-xs font-bold text-light-300">
                                                {userName[0]?.toUpperCase()}
                                            </span>
                                        )}
                                    </div>

                                    {/* Message Content */}
                                    <div className="flex-1 space-y-1">
                                        <p className="text-xs font-semibold text-light-400">
                                            {msg.role === 'assistant' ? 'AI Interviewer' : userName}
                                        </p>
                                        <p className="text-sm text-light-200 leading-relaxed">
                                            {msg.content}
                                        </p>
                                        <p className="text-xs text-light-500">
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}