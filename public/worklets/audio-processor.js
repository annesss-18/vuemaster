class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        // Use 256 samples to minimize latency while keeping overhead manageable
        // Web Audio API processes 128 samples at a time, so this is 2 chunks
        this.bufferSize = 256;
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || !input.length) return true;

        const inputChannel = input[0];
        // If no input data, keep processor alive
        if (!inputChannel) return true;

        // Fill buffer
        for (let i = 0; i < inputChannel.length; i++) {
            this.buffer[this.bufferIndex++] = inputChannel[i];

            if (this.bufferIndex >= this.bufferSize) {
                // Buffer full, send to main thread
                // We send a copy of the buffer to avoid race conditions/neutering issues with transferables if we reused the same buffer immediately
                this.port.postMessage(this.buffer.slice());
                this.bufferIndex = 0;
            }
        }

        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);
