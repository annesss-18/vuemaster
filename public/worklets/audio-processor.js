class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 4096;
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
