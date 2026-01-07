// lib/vertex-ai/audio-utils.ts (FIXED VERSION)

/**
 * Convert Blob to base64 string
 * @throws Error if blob is empty or conversion fails
 */
export async function blobToBase64(blob: Blob): Promise<string> {
    if (!blob || blob.size === 0) {
        throw new Error('Cannot convert empty blob to base64');
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onloadend = () => {
            try {
                const result = reader.result as string;
                if (!result) {
                    reject(new Error('FileReader returned empty result'));
                    return;
                }

                const base64 = result.split(',')[1];
                if (!base64) {
                    reject(new Error('Failed to extract base64 data from blob'));
                    return;
                }

                resolve(base64);
            } catch (error) {
                reject(new Error(`Blob to base64 conversion failed: ${error}`));
            }
        };

        reader.onerror = () => {
            reject(new Error('FileReader error during blob to base64 conversion'));
        };

        reader.readAsDataURL(blob);
    });
}

/**
 * Convert PCM audio to WAV format
 * @throws Error if input is invalid
 */
export function convertPCMToWav(
    pcmData: ArrayBuffer,
    sampleRate: number,
    numChannels: number = 1,
    bitsPerSample: number = 16
): ArrayBuffer {
    // Validate inputs
    if (!pcmData || pcmData.byteLength === 0) {
        throw new Error('Cannot convert empty PCM data to WAV');
    }

    if (sampleRate <= 0 || sampleRate > 192000) {
        throw new Error(`Invalid sample rate: ${sampleRate}. Must be between 1 and 192000`);
    }

    if (numChannels < 1 || numChannels > 2) {
        throw new Error(`Invalid number of channels: ${numChannels}. Must be 1 or 2`);
    }

    if (bitsPerSample !== 8 && bitsPerSample !== 16 && bitsPerSample !== 24 && bitsPerSample !== 32) {
        throw new Error(`Invalid bits per sample: ${bitsPerSample}. Must be 8, 16, 24, or 32`);
    }

    const dataLength = pcmData.byteLength;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;

    // Create WAV header (44 bytes)
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // RIFF chunk descriptor
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + dataLength, true); // File size - 8
    view.setUint32(8, 0x57415645, false); // "WAVE"

    // fmt sub-chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, byteRate, true); // ByteRate
    view.setUint16(32, blockAlign, true); // BlockAlign
    view.setUint16(34, bitsPerSample, true); // BitsPerSample

    // data sub-chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, dataLength, true); // Subchunk2Size

    // Combine header and PCM data
    const wavData = new Uint8Array(44 + dataLength);
    wavData.set(new Uint8Array(header), 0);
    wavData.set(new Uint8Array(pcmData), 44);

    return wavData.buffer;
}

/**
 * Decode base64 audio data to ArrayBuffer
 * @throws Error if base64 is invalid
 */
export function decodeBase64Audio(base64Audio: string): ArrayBuffer {
    if (!base64Audio || base64Audio.length === 0) {
        throw new Error('Cannot decode empty base64 audio data');
    }

    try {
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);

        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        if (bytes.length === 0) {
            throw new Error('Decoded audio data is empty');
        }

        return bytes.buffer;
    } catch (error) {
        if (error instanceof Error && error.message.includes('Invalid character')) {
            throw new Error('Invalid base64 audio data format');
        }
        throw new Error(`Failed to decode base64 audio: ${error}`);
    }
}

/**
 * Request microphone access with proper error handling
 * @throws Error with user-friendly message
 */
export async function requestMicrophoneAccess(): Promise<MediaStream> {
    // Check if mediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
            'Your browser does not support microphone access. Please use a modern browser like Chrome, Firefox, or Safari.'
        );
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                sampleRate: 16000,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
        });

        // Verify we got an audio track
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
            throw new Error('No audio track available from microphone');
        }

        return stream;
    } catch (error) {
        if (error instanceof DOMException) {
            switch (error.name) {
                case 'NotAllowedError':
                case 'PermissionDeniedError':
                    throw new Error(
                        'Microphone access denied. Please enable microphone permissions in your browser settings and refresh the page.'
                    );
                case 'NotFoundError':
                case 'DevicesNotFoundError':
                    throw new Error(
                        'No microphone found. Please connect a microphone and try again.'
                    );
                case 'NotReadableError':
                case 'TrackStartError':
                    throw new Error(
                        'Microphone is already in use by another application. Please close other apps using the microphone.'
                    );
                case 'OverconstrainedError':
                    throw new Error(
                        'Your microphone does not meet the required specifications. Try using a different microphone.'
                    );
                case 'SecurityError':
                    throw new Error(
                        'Microphone access blocked due to security restrictions. Please ensure you are using HTTPS.'
                    );
                case 'AbortError':
                    throw new Error(
                        'Microphone access was aborted. Please try again.'
                    );
                default:
                    throw new Error(`Microphone error: ${error.message}`);
            }
        }

        if (error instanceof Error) {
            throw error;
        }

        throw new Error('Failed to access microphone. Please check your browser permissions.');
    }
}

/**
 * Create audio context with proper sample rate
 * @throws Error if AudioContext is not supported
 */
export function createAudioContext(sampleRate: number = 24000): AudioContext {
    if (!window.AudioContext && !(window as any).webkitAudioContext) {
        throw new Error(
            'Your browser does not support Web Audio API. Please use a modern browser.'
        );
    }

    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        return new AudioContextClass({ sampleRate });
    } catch (error) {
        throw new Error(`Failed to create audio context: ${error}`);
    }
}

/**
 * Play audio buffer through AudioContext
 * @returns AudioBufferSourceNode for control (stop, etc.)
 */
// lib/vertex-ai/audio-utils.ts (FIXED - Remove onerror, use onended)
// Only showing the playAudioBuffer function - keep the rest of your file as is

/**
 * Play audio buffer through AudioContext
 * @returns AudioBufferSourceNode for control (stop, etc.)
 */
export function playAudioBuffer(
    audioContext: AudioContext,
    audioBuffer: AudioBuffer,
    onEnded?: () => void
): AudioBufferSourceNode {
    if (!audioContext) {
        throw new Error('Audio context is required to play audio');
    }

    if (!audioBuffer) {
        throw new Error('Audio buffer is required to play audio');
    }

    if (audioContext.state === 'closed') {
        throw new Error('Audio context is closed');
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    // Use onended for completion handling
    if (onEnded) {
        source.onended = () => {
            try {
                onEnded();
            } catch (error) {
                console.error('Error in onended callback:', error);
            }
        };
    }

    try {
        source.start();
    } catch (error) {
        console.error('Failed to start audio playback:', error);
        // Call onEnded if start fails
        if (onEnded) {
            setTimeout(onEnded, 0);
        }
        throw error;
    }

    return source;
}

/**
 * Validate audio buffer
 */
export function validateAudioBuffer(buffer: AudioBuffer): boolean {
    if (!buffer) return false;
    if (buffer.length === 0) return false;
    if (buffer.numberOfChannels === 0) return false;
    if (buffer.sampleRate <= 0) return false;
    return true;
}

/**
 * Get supported audio MIME types for MediaRecorder
 */
export function getSupportedAudioMimeTypes(): string[] {
    const types = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
    ];

    return types.filter(type => MediaRecorder.isTypeSupported(type));
}