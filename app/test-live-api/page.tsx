// app/test-live-api/page.tsx
'use client';

import { useState } from 'react';
import { useVertexLiveAPI } from '@/lib/hooks/useVertexLiveAPI';
import { PhoneCall, PhoneOff, Loader2, AlertCircle, Mic, Sparkles } from 'lucide-react';

export default function TestLiveAPIPage() {
    const [sessionId] = useState(`test-${Date.now()}`);

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
    } = useVertexLiveAPI({
        sessionId,
        systemInstruction: 'You are a friendly AI assistant. Keep your responses brief and conversational.',
        voice: 'Charon',
        enableTranscription: true,
    });

    return (
        <div className="min-h-screen bg-dark-100 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-white">
                        Vertex AI Live API Test
                    </h1>
                    <p className="text-light-300">
                        Test the WebSocket connection and audio streaming
                    </p>
                </div>

                {/* Status Card */}
                <div className="card-border">
                    <div className="card !p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white">Connection Status</h2>
                            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${isConnected ? 'bg-success-100/20 text-success-100' :
                                isConnecting || isReconnecting ? 'bg-warning-200/20 text-warning-200' :
                                    error ? 'bg-destructive-100/20 text-destructive-100' :
                                        'bg-light-400/20 text-light-400'
                                }`}>
                                {connectionState}
                            </div>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-light-300">Session ID:</span>
                                <span className="text-light-100 font-mono">{sessionId}</span>
                            </div>

                            {isConnected && (
                                <div className="flex justify-between">
                                    <span className="text-light-300">Status:</span>
                                    <div className="flex items-center gap-2">
                                        {isSpeaking ? (
                                            <>
                                                <Sparkles className="size-4 text-primary-300 animate-pulse" />
                                                <span className="text-primary-300">AI Speaking</span>
                                            </>
                                        ) : (
                                            <>
                                                <Mic className="size-4 text-success-100" />
                                                <span className="text-success-100">Listening</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {reconnectAttempt && (
                                <div className="flex justify-between">
                                    <span className="text-light-300">Reconnecting:</span>
                                    <span className="text-warning-200">
                                        Attempt {reconnectAttempt.current}/{reconnectAttempt.max}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="card-border">
                        <div className="card !p-6 !bg-destructive-100/10">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="size-5 text-destructive-100 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-destructive-100 mb-1">Error</h3>
                                    <p className="text-sm text-light-200">{error}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Controls */}
                <div className="flex justify-center gap-4">
                    {!isConnected ? (
                        <button
                            onClick={connect}
                            disabled={isConnecting}
                            className="btn-primary disabled:opacity-50"
                        >
                            {isConnecting ? (
                                <>
                                    <Loader2 className="size-5 animate-spin" />
                                    <span>Connecting...</span>
                                </>
                            ) : (
                                <>
                                    <PhoneCall className="size-5" />
                                    <span>Start Test</span>
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={disconnect}
                            className="btn-disconnect"
                        >
                            <PhoneOff className="size-5" />
                            <span>Stop Test</span>
                        </button>
                    )}
                </div>

                {/* Transcript */}
                <div className="card-border">
                    <div className="card !p-6">
                        <h2 className="text-xl font-bold text-white mb-4">
                            Conversation ({messages.length} messages)
                        </h2>

                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {messages.length === 0 ? (
                                <p className="text-center text-light-400 py-8">
                                    {isConnected ? 'Start speaking to see the conversation...' : 'Connect to start'}
                                </p>
                            ) : (
                                messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-4 rounded-lg ${msg.role === 'assistant'
                                            ? 'bg-primary-500/10 border border-primary-400/20'
                                            : 'bg-dark-200/60 border border-light-400/10'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${msg.role === 'assistant'
                                                ? 'bg-primary-500/20 text-primary-300'
                                                : 'bg-dark-300 text-light-300'
                                                }`}>
                                                {msg.role === 'assistant' ? 'AI' : 'You'}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm text-light-200">{msg.content}</p>
                                                <p className="text-xs text-light-400 mt-1">
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

                {/* Instructions */}
                <div className="card-border">
                    <div className="card !p-6 !bg-info-100/5">
                        <h3 className="font-semibold text-info-100 mb-3">Test Instructions</h3>
                        <ul className="space-y-2 text-sm text-light-300">
                            <li>1. Click "Start Test" to begin the connection</li>
                            <li>2. Allow microphone access when prompted</li>
                            <li>3. Speak naturally - the AI will respond in real-time</li>
                            <li>4. Watch the conversation transcript appear below</li>
                            <li>5. Click "Stop Test" when finished</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}