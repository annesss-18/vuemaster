// components/InterviewAgent/CallControls.tsx
'use client';

import { PhoneCall, PhoneOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CallControlsProps {
    isConnected: boolean;
    isConnecting: boolean;
    isReconnecting: boolean;
    hasError: boolean;
    onStart: () => void;
    onEnd: () => void;
}

export default function CallControls({
    isConnected,
    isConnecting,
    isReconnecting,
    hasError,
    onStart,
    onEnd,
}: CallControlsProps) {
    // Show end button when connected
    if (isConnected) {
        return (
            <div className="w-full flex justify-center animate-fadeIn">
                <button
                    className="btn-disconnect group relative overflow-hidden"
                    onClick={onEnd}
                >
                    {/* Animated background */}
                    <span className="absolute inset-0 bg-gradient-to-r from-destructive-500/20 to-destructive-600/20 animate-pulse" />

                    <PhoneOff className="size-6 relative z-10" />
                    <span className="font-bold relative z-10">End Interview</span>
                </button>
            </div>
        );
    }

    // Hide controls during connection states
    if (isConnecting || isReconnecting) {
        return null;
    }

    // Show start button
    return (
        <div className="w-full flex justify-center animate-fadeIn">
            <button
                className={cn(
                    "btn-call group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                    hasError && "opacity-50 cursor-not-allowed"
                )}
                onClick={onStart}
                disabled={hasError || isConnecting}
                title={hasError ? 'Fix errors before starting' : 'Start Interview'}
            >
                {/* Animated background glow */}
                {!hasError && (
                    <span className="absolute inset-0 bg-gradient-to-r from-success-400/20 to-success-500/20 animate-pulse" />
                )}

                {isConnecting ? (
                    <>
                        <Loader2 className="size-6 animate-spin relative z-10" />
                        <span className="font-bold relative z-10">Connecting...</span>
                    </>
                ) : (
                    <>
                        <PhoneCall className="size-6 relative z-10" />
                        <span className="font-bold relative z-10">Start Interview</span>
                    </>
                )}
            </button>
        </div>
    );
}