import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

interface GeminiLiveConfig {
    onTranscript?: (text: string) => void;
    onError?: (error: string) => void;
    onTurnComplete?: () => void;
}

export const useGeminiLive = ({ onTranscript, onError, onTurnComplete }: GeminiLiveConfig) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error' | 'disconnected'>('idle');

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const playbackQueueRef = useRef<Int16Array[]>([]);
    const isPlayingRef = useRef(false);

    // For continuous streaming - keep track of media stream and audio context
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const recordingContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<AudioWorkletNode | null>(null);

    // Helpers
    const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    };

    // Connect to Gemini Live API
    const connect = useCallback(async () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        setStatus('connecting');

        try {
            // 1. Fetch API Key from backend
            const keyResponse = await fetch('/api/auth/gemini-key');
            if (!keyResponse.ok) throw new Error('Failed to fetch API key');
            const { api_key } = await keyResponse.json();

            // 2. Connect directly to Google
            const googleUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${api_key}`;

            console.log('[GeminiLive] Connecting to:', googleUrl.split('?')[0]);

            return new Promise<void>((resolve, reject) => {
                const ws = new WebSocket(googleUrl);
                wsRef.current = ws;

                // Connection timeout
                const timeout = setTimeout(() => {
                    if (ws.readyState !== WebSocket.OPEN) {
                        ws.close();
                        reject(new Error('Connection timeout - Google Gemini Live API unreachable'));
                    }
                }, 10000);

                ws.onopen = () => {
                    clearTimeout(timeout);
                    console.log('[GeminiLive] Connected directly to Google');
                    setIsConnected(true);
                    setStatus('connected');

                    // 3. Send setup message
                    const setupMessage = {
                        setup: {
                            model: "models/gemini-2.5-flash-native-audio-preview-12-2025",
                            generation_config: {
                                response_modalities: ["AUDIO"]
                            }
                        }
                    };
                    ws.send(JSON.stringify(setupMessage));
                    resolve();
                };

                ws.onmessage = async (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        if (message.serverContent) {
                            const { modelTurn, turnComplete, interupt } = message.serverContent;

                            if (modelTurn?.parts) {
                                for (const part of modelTurn.parts) {
                                    if (part.inlineData?.mimeType?.startsWith('audio/')) {
                                        const binaryData = atob(part.inlineData.data);
                                        const chunk = new Int16Array(binaryData.length / 2);
                                        const view = new DataView(new Uint8Array(Array.from(binaryData, c => c.charCodeAt(0))).buffer);

                                        for (let i = 0; i < chunk.length; i++) {
                                            chunk[i] = view.getInt16(i * 2, true); // Little-endian
                                        }

                                        playbackQueueRef.current.push(chunk);
                                        if (!isPlayingRef.current) playAudioQueue();
                                    }
                                    if (part.text) {
                                        console.log('[GeminiLive] AI Text:', part.text);
                                        onTranscript?.(part.text);
                                    }
                                }
                            }

                            if (turnComplete) {
                                onTurnComplete?.();
                            }

                            if (interupt) {
                                playbackQueueRef.current = [];
                            }
                        }
                    } catch (e) {
                        console.error('[GeminiLive] Failed to parse message:', e);
                    }
                };

                ws.onerror = (error) => {
                    clearTimeout(timeout);
                    console.error('[GeminiLive] WebSocket error:', error);
                    setStatus('error');
                    setIsConnected(false);
                    reject(new Error('WebSocket connection failed'));
                    onError?.('WebSocket connection failed');
                };

                ws.onclose = (event) => {
                    console.log('[GeminiLive] Disconnected from Google', event.code, event.reason);
                    setIsConnected(false);
                    setStatus('disconnected');
                };
            });

        } catch (error) {
            console.error('[GeminiLive] Connection error:', error);
            setStatus('error');
            const msg = error instanceof Error ? error.message : 'Connection failed';
            onError?.(msg);
            throw error;
        }
    }, [onTranscript, onError, onTurnComplete]);

    // Disconnect
    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    // Audio Playback
    const playAudioQueue = useCallback(async () => {
        if (playbackQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            setIsSpeaking(false);
            return;
        }

        isPlayingRef.current = true;
        setIsSpeaking(true);

        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }

        const ctx = audioContextRef.current;
        const chunk = playbackQueueRef.current.shift()!;

        const audioBuffer = ctx.createBuffer(1, chunk.length, 24000);
        const channelData = audioBuffer.getChannelData(0);

        for (let i = 0; i < chunk.length; i++) {
            channelData[i] = chunk[i] / 32768;
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);

        source.onended = () => {
            playAudioQueue();
        };

        source.start();
    }, []);

    // Start live conversation - connect + start continuous microphone streaming
    const startLiveConversation = useCallback(async () => {
        try {
            // 1. Connect if not already connected
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                await connect();
            }

            // 2. Start microphone streaming
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const audioContext = new AudioContext({ sampleRate: 16000 });
            recordingContextRef.current = audioContext;

            const source = audioContext.createMediaStreamSource(stream);

            await audioContext.audioWorklet.addModule('/gemini-audio-processor.js');
            const processor = new AudioWorkletNode(audioContext, 'gemini-audio-processor');
            processorRef.current = processor;

            processor.port.onmessage = (event) => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    const base64Data = arrayBufferToBase64(event.data);
                    const realtimeInput = {
                        realtime_input: {
                            media_chunks: [{
                                mime_type: "audio/pcm;rate=16000",
                                data: base64Data
                            }]
                        }
                    };
                    wsRef.current.send(JSON.stringify(realtimeInput));
                }
            };

            source.connect(processor);
            setIsRecording(true);
            console.log('[GeminiLive] Live conversation started - continuous streaming active');
        } catch (error) {
            console.error('[GeminiLive] Failed to start live conversation:', error);
            onError?.(error instanceof Error ? error.message : 'Failed to start live conversation');
            throw error;
        }
    }, [connect, onError]);

    // Stop live conversation - stop microphone + disconnect WebSocket
    const stopLiveConversation = useCallback(() => {
        // Stop microphone stream
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }

        // Close recording audio context
        if (recordingContextRef.current && recordingContextRef.current.state !== 'closed') {
            recordingContextRef.current.close();
            recordingContextRef.current = null;
        }

        processorRef.current = null;
        setIsRecording(false);

        // Disconnect WebSocket
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
        setStatus('idle');

        console.log('[GeminiLive] Live conversation ended');
    }, []);

    // Legacy functions for backwards compatibility (can be removed later)
    const startRecording = useCallback(async () => {
        await startLiveConversation();
    }, [startLiveConversation]);

    const stopRecording = useCallback(() => {
        // Just stop recording, don't disconnect (for push-to-talk mode)
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (recordingContextRef.current && recordingContextRef.current.state !== 'closed') {
            recordingContextRef.current.close();
            recordingContextRef.current = null;
        }
        processorRef.current = null;
        setIsRecording(false);
        console.log('[GeminiLive] Recording stopped');
    }, []);

    const sendAudioData = useCallback((data: ArrayBuffer | Int16Array) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            const buffer = data instanceof ArrayBuffer ? data : data.buffer;
            const pcmData = new Int16Array(buffer);
            const chunkSize = 4000;

            for (let i = 0; i < pcmData.length; i += chunkSize) {
                const chunk = pcmData.slice(i, i + chunkSize);
                const base64Data = arrayBufferToBase64(chunk.buffer);
                const realtimeInput = {
                    realtime_input: {
                        media_chunks: [{
                            mime_type: "audio/pcm;rate=16000",
                            data: base64Data
                        }]
                    }
                };
                wsRef.current.send(JSON.stringify(realtimeInput));
            }
        }
    }, []);

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (recordingContextRef.current && recordingContextRef.current.state !== 'closed') {
                recordingContextRef.current.close();
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, []);

    return useMemo(() => ({
        isConnected,
        isRecording,
        isSpeaking,
        status,
        connect,
        disconnect,
        startRecording,
        stopRecording,
        startLiveConversation,
        stopLiveConversation,
        sendAudioData,
        // Expose the raw readyState for immediate checks (bypass React state lag)
        getReadyState: () => wsRef.current?.readyState
    }), [
        isConnected,
        isRecording,
        isSpeaking,
        status,
        connect,
        disconnect,
        startRecording,
        stopRecording,
        startLiveConversation,
        stopLiveConversation,
        sendAudioData
    ]);
};
