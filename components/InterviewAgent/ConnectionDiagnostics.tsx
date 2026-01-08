// components/InterviewAgent/ConnectionDiagnostics.tsx
'use client';

import { AlertCircle, CheckCircle2, Wifi, WifiOff, Loader2 } from 'lucide-react';
import type { LiveAPIConnectionState } from '@/lib/vertex-ai/types';

interface ConnectionDiagnosticsProps {
    connectionState: LiveAPIConnectionState;
    error: string | null;
    reconnectAttempt: { current: number; max: number } | null;
}

export default function ConnectionDiagnostics({
    connectionState,
    error,
    reconnectAttempt,
}: ConnectionDiagnosticsProps) {
    // Only show diagnostics when there's an issue
    if (connectionState === 'connected') {
        return null;
    }

    const getStatusIcon = () => {
        switch (connectionState) {
            case 'connecting':
                return <Loader2 className="size-5 text-warning-200 animate-spin" />;
            case 'reconnecting':
                return <Wifi className="size-5 text-info-100 animate-pulse" />;
            case 'failed':
                return <WifiOff className="size-5 text-destructive-100" />;
            default:
                return <AlertCircle className="size-5 text-light-400" />;
        }
    };

    const getStatusMessage = () => {
        switch (connectionState) {
            case 'connecting':
                return 'Establishing connection to Vertex AI...';
            case 'reconnecting':
                return `Reconnecting (Attempt ${reconnectAttempt?.current}/${reconnectAttempt?.max})...`;
            case 'failed':
                return 'Connection failed. Please check the troubleshooting steps below.';
            case 'disconnected':
                return 'Not connected. Click "Start Interview" to begin.';
            default:
                return 'Unknown connection state';
        }
    };

    const getTroubleshootingSteps = () => {
        if (!error) return null;

        const steps: string[] = [];

        if (error.includes('timeout')) {
            steps.push('Check your internet connection');
            steps.push('Try disabling VPN');
            steps.push('Refresh the page and try again');
        } else if (error.includes('authentication') || error.includes('token')) {
            steps.push('Verify .env.local has correct Google Cloud credentials');
            steps.push('Restart the dev server (npm run dev)');
            steps.push('Run: npx tsx scripts/test-vertex-auth.ts');
        } else if (error.includes('microphone')) {
            steps.push('Allow microphone access in browser settings');
            steps.push('Check if another app is using the microphone');
            steps.push('Try using a different browser');
        } else {
            steps.push('Refresh the page');
            steps.push('Check browser console for detailed errors');
            steps.push('See docs/WEBSOCKET_TROUBLESHOOTING.md');
        }

        return steps;
    };

    const troubleshootingSteps = getTroubleshootingSteps();

    return (
        <div className="card-border animate-fadeIn">
            <div className={`card !p-6 ${connectionState === 'failed' ? '!bg-destructive-100/5' : '!bg-warning-200/5'}`}>
                <div className="flex items-start gap-4">
                    <div className="shrink-0 mt-1">
                        {getStatusIcon()}
                    </div>

                    <div className="flex-1 space-y-3">
                        <div>
                            <h3 className={`font-semibold ${connectionState === 'failed' ? 'text-destructive-100' : 'text-warning-200'
                                }`}>
                                {getStatusMessage()}
                            </h3>

                            {error && (
                                <p className="text-sm text-light-300 mt-1">
                                    {error}
                                </p>
                            )}
                        </div>

                        {/* Troubleshooting Steps */}
                        {troubleshootingSteps && troubleshootingSteps.length > 0 && (
                            <div className="p-3 rounded-lg bg-dark-200/50 border border-light-400/10">
                                <p className="text-xs font-semibold text-light-200 mb-2">
                                    💡 Troubleshooting Steps:
                                </p>
                                <ul className="space-y-1">
                                    {troubleshootingSteps.map((step, index) => (
                                        <li key={index} className="text-xs text-light-400 flex items-start gap-2">
                                            <span className="text-primary-300 shrink-0">•</span>
                                            <span>{step}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Connection Progress for Reconnecting */}
                        {connectionState === 'reconnecting' && reconnectAttempt && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-light-400">
                                    <span>Reconnection Progress</span>
                                    <span>{reconnectAttempt.current}/{reconnectAttempt.max}</span>
                                </div>
                                <div className="h-2 bg-dark-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-info-100 to-primary-300 transition-all duration-300"
                                        style={{
                                            width: `${(reconnectAttempt.current / reconnectAttempt.max) * 100}%`
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
