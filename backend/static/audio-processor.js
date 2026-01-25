/**
 * AudioWorklet Processor for streaming microphone audio to WebSocket
 * This replaces the deprecated ScriptProcessorNode
 */
class AudioStreamProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.port.onmessage = (event) => {
            // Handle messages from main thread if needed
        };
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];

        // Check if we have input audio
        if (input.length > 0) {
            const inputChannel = input[0]; // Get first channel (mono)

            // Convert Float32 to Int16 PCM
            const pcmData = new Int16Array(inputChannel.length);
            for (let i = 0; i < inputChannel.length; i++) {
                // Clamp the value between -1 and 1, then scale to 16-bit
                const s = Math.max(-1, Math.min(1, inputChannel[i]));
                pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }

            // Send the PCM data to the main thread
            this.port.postMessage(pcmData.buffer, [pcmData.buffer]);
        }

        // Return true to keep the processor alive
        return true;
    }
}

registerProcessor('audio-stream-processor', AudioStreamProcessor);
