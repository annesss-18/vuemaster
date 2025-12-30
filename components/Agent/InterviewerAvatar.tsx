import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Sparkles, Mic } from 'lucide-react';

interface InterviewerAvatarProps {
    isSpeaking: boolean;
    isConnected: boolean;
    connectionStateLabel: string;
}

export default function InterviewerAvatar({
    isSpeaking,
    isConnected,
    connectionStateLabel
}: InterviewerAvatarProps) {
    return (
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
                            isConnected ? "bg-success-100 animate-pulse" : "bg-light-400"
                        )} />
                        <span className="text-sm font-medium text-light-300 capitalize">
                            {connectionStateLabel}
                        </span>
                    </div>
                </div>

                {isConnected && isSpeaking && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/20 border border-primary-400/30 backdrop-blur-sm animate-fadeIn">
                        <Sparkles className="size-4 text-primary-300 animate-pulse" />
                        <span className="text-sm text-primary-200 font-medium">AI is speaking</span>
                    </div>
                )}

                {isConnected && !isSpeaking && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-success-100/20 border border-success-100/30 backdrop-blur-sm animate-fadeIn">
                        <Mic className="size-4 text-success-100" />
                        <span className="text-sm text-success-100 font-medium">Listening...</span>
                    </div>
                )}
            </div>
        </div>
    );
}