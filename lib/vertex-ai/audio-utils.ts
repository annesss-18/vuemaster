// lib/vertex-ai/audio-utils.ts

/**
 * Convert Blob to base64 string
 */
export async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            if (!base64) {
                reject(new Error('Failed to convert blob to base64'));
                return;
            }
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Convert PCM audio to WAV format
 */
export function convertPCMToWav(
    pcmData: ArrayBuffer,
    sampleRate: number,
    numChannels: number = 1,
    bitsPerSample: number = 16
): ArrayBuffer {
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
 */
export function decodeBase64Audio(base64Audio: string): ArrayBuffer {
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes.buffer;
}

/**
 * Request microphone access with proper error handling
 */
export async function requestMicrophoneAccess(): Promise<MediaStream> {
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

        return stream;
    } catch (error) {
        if (error instanceof DOMException) {
            switch (error.name) {
                case 'NotAllowedError':
                case 'PermissionDeniedError':
                    throw new Error(
                        'Microphone access denied. Please enable microphone permissions in your browser settings.'
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
                        'Your microphone does not meet the required specifications.'
                    );
                case 'SecurityError':
                    throw new Error(
                        'Microphone access blocked due to security restrictions. Please use HTTPS.'
                    );
                default:
                    throw new Error(`Microphone error: ${error.message}`);
            }
        }

        throw new Error('Failed to access microphone. Please check your browser permissions.');
    }
}

/**
 * Create audio context with proper sample rate
 */
export function createAudioContext(sampleRate: number = 24000): AudioContext {
    return new AudioContext({ sampleRate });
}

/**
 * Play audio buffer through AudioContext
 */
export function playAudioBuffer(
    audioContext: AudioContext,
    audioBuffer: AudioBuffer,
    onEnded?: () => void
): AudioBufferSourceNode {
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    if (onEnded) {
        source.onended = onEnded;
    }

    source.start();
    return source;
}