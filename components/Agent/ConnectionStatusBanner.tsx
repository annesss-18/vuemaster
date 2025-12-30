import { Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatusBannerProps {
  isConnecting: boolean;
  isReconnecting: boolean;
  reconnectAttempt: { current: number; max: number } | null;
  error: string | null;
}

export default function ConnectionStatusBanner({
  isConnecting,
  isReconnecting,
  reconnectAttempt,
  error
}: ConnectionStatusBannerProps) {
  if (isConnecting) {
    return (
      <div className="card-border animate-fadeIn">
        <div className="card !p-6 !bg-warning-200/10 border-warning-200/30">
          <div className="flex items-center gap-4">
            <Loader2 className="size-6 text-warning-200 animate-spin shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-warning-200 mb-1">
                Connecting to AI Interviewer...
              </h3>
              <p className="text-sm text-light-300">
                Initializing AI and microphone. This may take a few seconds.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isReconnecting && reconnectAttempt) {
    return (
      <div className="card-border animate-fadeIn">
        <div className="card !p-6 !bg-info-100/10 border-info-100/30">
          <div className="flex items-center gap-4">
            <WifiOff className="size-6 text-info-100 shrink-0 animate-pulse" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-info-100 mb-1">
                Reconnecting... (Attempt {reconnectAttempt.current}/{reconnectAttempt.max})
              </h3>
              <p className="text-sm text-light-300">
                Connection lost. Attempting to reconnect automatically. Please wait.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && error.includes('microphone')) {
    return (
      <div className="card-border animate-fadeIn">
        <div className="card !p-6 !bg-destructive-100/10 border-destructive-100/30">
          <div className="flex flex-col md:flex-row items-start gap-4">
            <div className="size-12 rounded-xl bg-destructive-100/20 border border-destructive-100/30 flex items-center justify-center shrink-0">
              <AlertCircle className="size-6 text-destructive-100" />
            </div>
            <div className="flex-1 space-y-3">
              <h3 className="text-lg font-semibold text-destructive-100">Microphone Error</h3>
              <p className="text-sm text-light-200 leading-relaxed">{error}</p>

              <div className="p-3 rounded-lg bg-dark-200/50 border border-primary-400/20">
                <p className="text-xs text-light-300 font-semibold mb-2">💡 Troubleshooting Tips:</p>
                <ul className="text-xs text-light-400 space-y-1 list-disc list-inside">
                  <li>Check if your microphone is properly connected</li>
                  <li>Ensure browser has permission to access microphone</li>
                  <li>Close other applications using the microphone</li>
                  <li>Try refreshing the page</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-border animate-fadeIn">
        <div className="card !p-6 !bg-destructive-100/10 border-destructive-100/30">
          <div className="flex items-start gap-4">
            <AlertCircle className="size-6 text-destructive-100 shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-destructive-100 mb-1">Error Occurred</h3>
              <p className="text-sm text-light-200">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}