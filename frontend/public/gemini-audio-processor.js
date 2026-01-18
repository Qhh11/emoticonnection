/**
 * AudioWorklet Processor for Gemini Live API
 * Converts Float32 audio to Int16 PCM format for Gemini
 */

class GeminiAudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.sampleRate = 16000; // Gemini expects 16kHz
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];

        if (input && input.length > 0) {
            const channelData = input[0]; // Mono channel

            if (channelData && channelData.length > 0) {
                // Convert Float32 (-1.0 to 1.0) to Int16 PCM (-32768 to 32767)
                const pcmData = new Int16Array(channelData.length);

                for (let i = 0; i < channelData.length; i++) {
                    // Clamp to [-1, 1] range
                    const sample = Math.max(-1, Math.min(1, channelData[i]));
                    // Convert to Int16
                    pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                }

                // Send PCM data to main thread
                this.port.postMessage(pcmData.buffer, [pcmData.buffer]);
            }
        }

        // Return true to keep processor alive
        return true;
    }
}

registerProcessor('gemini-audio-processor', GeminiAudioProcessor);
