import { PhoneCall, PhoneOff } from 'lucide-react';
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
    onEnd
}: CallControlsProps) {
    if (isConnected) {
        return (
            <div className="w-full flex justify-center">
                <button
                    className="btn-disconnect group"
                    onClick={onEnd}
                >
                    <PhoneOff className="size-6" />
                    <span className="font-bold">End Interview</span>
                </button>
            </div>
        );
    }

    if (isConnecting || isReconnecting) {
        return null; // Show nothing during connection states
    }

    return (
        <div className="w-full flex justify-center">
            <button
                className="relative btn-call group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                onClick={onStart}
                disabled={hasError}
                title={hasError ? 'Cannot start - interview has errors' : 'Start Interview'}
            >
                <span className={cn(
                    "absolute rounded-full opacity-75 animate-ping",
                    !hasError && 'hidden'
                )} />
                <PhoneCall className="size-6" />
                <span className="font-bold">Start Interview</span>
            </button>
        </div>
    );
}