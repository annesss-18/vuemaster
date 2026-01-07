// components/InterviewAgent/InterviewHeader.tsx
'use client';

import Image from 'next/image';
import { Sparkles, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LiveAPIConnectionState } from '@/lib/vertex-ai/types';

interface InterviewHeaderProps {
    isSpeaking: boolean;
    isConnected: boolean;
    connectionState: LiveAPIConnectionState;
    userName: string;
}

export default function InterviewHeader({
    isSpeaking,
    isConnected,
    connectionState,
    userName,
}: InterviewHeaderProps) {
    const getConnectionLabel = () => {
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

    return (
        <div className="card-border animate-slideInLeft">
            <div className="card !p-8">
                <div className="flex flex-col lg:flex-row gap-8 items-center">
                    {/* AI Interviewer Avatar */}
                    <div className="relative group">
                        {/* Glow effect when speaking */}
                        <div className={cn(
                            "absolute inset-0 bg-gradient-to-r from-primary-500/30 to-accent-300/30 rounded-full blur-2xl transition-opacity duration-500",
                            isSpeaking ? "opacity-100" : "opacity-0"
                        )} />

                        {/* Speaking animation rings */}
                        {isSpeaking && (
                            <>
                                <span className="absolute inset-0 rounded-full bg-primary-500/20 animate-ping" />
                                <span
                                    className="absolute inset-0 rounded-full bg-primary-500/20 animate-ping"
                                    style={{ animationDelay: '0.5s' }}
                                />
                            </>
                        )}

                        {/* Avatar */}
                        <div className="relative size-24 rounded-full bg-gradient-to-br from-dark-200 to-dark-300 flex items-center justify-center border-4 border-primary-400/30 shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:border-primary-400/50">
                            <Image
                                src="/profile.svg"
                                alt="AI Interviewer"
                                width={80}
                                height={80}
                                className="size-20"
                            />
                        </div>
                    </div>

                    {/* Status Info */}
                    <div className="flex-1 text-center lg:text-left space-y-4">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/20 border border-primary-400/30 backdrop-blur-md">
                                <Sparkles className={cn(
                                    "size-3 text-primary-300",
                                    isConnected && "animate-pulse"
                                )} />
                                <span className="text-xs font-semibold text-primary-200">
                                    {getConnectionLabel()}
                                </span>
                            </div>

                            <h2 className="text-2xl font-bold text-primary-100">
                                AI Interviewer
                            </h2>
                        </div>

                        {/* Connection Status */}
                        <div className="flex items-center justify-center lg:justify-start gap-2">
                            <div className={cn(
                                "size-2 rounded-full transition-all duration-300",
                                isConnected ? "bg-success-100 animate-pulse" : "bg-light-400"
                            )} />
                            <span className="text-sm font-medium text-light-300 capitalize">
                                {getConnectionLabel()}
                            </span>
                        </div>

                        {/* Speaking/Listening Indicator */}
                        {isConnected && (
                            <div className="flex items-center justify-center lg:justify-start gap-2 px-4 py-2 rounded-full bg-dark-200/60 border border-primary-400/20 backdrop-blur-sm w-fit">
                                {isSpeaking ? (
                                    <>
                                        <Sparkles className="size-4 text-primary-300 animate-pulse" />
                                        <span className="text-sm text-primary-200 font-medium">
                                            AI is speaking
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Mic className="size-4 text-success-100" />
                                        <span className="text-sm text-success-100 font-medium">
                                            Listening to {userName}...
                                        </span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}