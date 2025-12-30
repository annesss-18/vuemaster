import type { GeminiMessage } from '@/lib/gemini-live';
import { PhoneCall, Sparkles } from 'lucide-react';

interface ConversationViewProps {
    messages: GeminiMessage[];
    userName: string;
}

export default function ConversationView({ messages, userName }: ConversationViewProps) {
    return (
        <div className="card-border flex-1 sm:basis-1/2 w-full max-md:hidden">
            <div className="card-content h-[420px]">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-light-100">Conversation</h3>
                    <span className="text-sm text-light-400">{messages.length} messages</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[320px] scrollbar-thin scrollbar-thumb-primary-400/30 scrollbar-track-dark-200/30">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                            <div className="size-16 rounded-2xl bg-primary-500/10 border border-primary-400/30 flex items-center justify-center">
                                <PhoneCall className="size-8 text-primary-300" />
                            </div>
                            <p className="text-light-400 text-sm">Start the interview to see the conversation</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex gap-3 animate-fadeIn p-3 rounded-xl transition-all duration-300 ${msg.role === 'assistant'
                                        ? 'bg-primary-500/10 border border-primary-400/20'
                                        : 'bg-dark-200/60 border border-light-400/20'
                                    }`}
                            >
                                <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'assistant'
                                        ? 'bg-primary-500/20 border border-primary-400/30'
                                        : 'bg-dark-300 border border-light-400/30'
                                    }`}>
                                    {msg.role === 'assistant' ? (
                                        <Sparkles className="size-4 text-primary-300" />
                                    ) : (
                                        <span className="text-xs font-bold text-light-300">{userName[0]}</span>
                                    )}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-xs font-semibold text-light-400">
                                        {msg.role === 'assistant' ? 'AI Interviewer' : userName}
                                    </p>
                                    <p className="text-sm text-light-200 leading-relaxed">{msg.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}