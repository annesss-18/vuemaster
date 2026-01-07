// components/InterviewAgent/FeedbackLoading.tsx
'use client';

import { Loader2, CheckCircle2, Sparkles } from 'lucide-react';

export default function FeedbackLoading() {
    return (
        <div className="card-border animate-fadeIn">
            <div className="card !p-8">
                <div className="flex flex-col items-center gap-6 text-center">
                    {/* Animated Logo */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/30 to-accent-300/30 rounded-full blur-2xl animate-pulse" />
                        <div className="relative size-24 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center shadow-2xl">
                            <Loader2 className="size-12 text-white animate-spin" />
                        </div>
                    </div>

                    {/* Title and Description */}
                    <div className="space-y-2 max-w-md">
                        <h3 className="text-2xl font-bold text-light-100">
                            Analyzing Your Performance
                        </h3>
                        <p className="text-light-300">
                            Our AI is evaluating your responses and generating detailed feedback.
                            This will only take a moment...
                        </p>
                    </div>

                    {/* Status Indicators */}
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/20 border border-primary-400/30 backdrop-blur-sm">
                            <CheckCircle2 className="size-4 text-primary-300" />
                            <span className="text-sm text-primary-200 font-medium">
                                Analyzing responses
                            </span>
                        </div>

                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent-300/20 border border-accent-300/30 backdrop-blur-sm">
                            <Loader2 className="size-4 text-accent-300 animate-spin" />
                            <span className="text-sm text-accent-300 font-medium">
                                Generating scores
                            </span>
                        </div>

                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-dark-200/60 border border-light-400/20">
                            <Sparkles className="size-4 text-light-400" />
                            <span className="text-sm text-light-400 font-medium">
                                Preparing insights
                            </span>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full max-w-md">
                        <div className="h-2 bg-dark-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary-500 to-accent-300 animate-pulse"
                                style={{ width: '75%' }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}