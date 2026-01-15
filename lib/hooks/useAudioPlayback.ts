'use client';

import { useCallback, useRef, useState } from 'react';

interface UseAudioPlaybackReturn {
    isPlaying: boolean;
    queueAudio: (base64Data: string) => void;
    clearQueue: () => void;
    stop: () => void;
}

/**
 * Hook for playing audio received from Gemini Live API.
 * Handles 24kHz 16-bit PCM audio in base64 format with seamless playback.
 */
export function useAudioPlayback(): UseAudioPlaybackReturn {
    const [isPlaying, setIsPlaying] = useState(false);

    const audioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const isActiveRef = useRef(false);

    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            // Do not force sample rate - let browser/OS decide (usually 44.1 or 48kHz)
            // The buffer itself will specify 24kHz, and Web Audio API handles resampling
            audioContextRef.current = new AudioContext();
        }
        // Resume if suspended (browser autoplay policy)
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    }, []);

    const queueAudio = useCallback((base64Data: string) => {
        try {
            const ctx = getAudioContext();
            isActiveRef.current = true;

            // Decode base64 to bytes
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Interpret as 16-bit signed integers (little-endian)
            const dataView = new DataView(bytes.buffer);
            const numSamples = bytes.length / 2;
            const float32Array = new Float32Array(numSamples);

            for (let i = 0; i < numSamples; i++) {
                // Read as little-endian 16-bit signed integer
                const int16 = dataView.getInt16(i * 2, true);
                // Convert to float [-1, 1]
                float32Array[i] = int16 / 32768.0;
            }

            // Create AudioBuffer at 24kHz
            const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
            audioBuffer.getChannelData(0).set(float32Array);

            // Create source and connect to output
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);

            // Schedule playback for seamless audio
            const currentTime = ctx.currentTime;
            const startTime = Math.max(currentTime, nextStartTimeRef.current);
            source.start(startTime);
            nextStartTimeRef.current = startTime + audioBuffer.duration;

            setIsPlaying(true);

            // Track when audio ends
            source.onended = () => {
                // Check if this was the last scheduled audio
                if (ctx.currentTime >= nextStartTimeRef.current - 0.1) {
                    setIsPlaying(false);
                }
            };

        } catch (error) {
            console.error('Error playing audio:', error);
        }
    }, [getAudioContext]);

    const clearQueue = useCallback(() => {
        isActiveRef.current = false;
        nextStartTimeRef.current = 0;
        setIsPlaying(false);

        // Close and recreate context to stop all scheduled audio
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
    }, []);

    const stop = useCallback(() => {
        clearQueue();
    }, [clearQueue]);

    return {
        isPlaying,
        queueAudio,
        clearQueue,
        stop,
    };
}
