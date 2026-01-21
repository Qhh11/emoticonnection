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

    // Connect to Backend WebSocket Proxy
    const connect = useCallback(async () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        setStatus('connecting');

        try {
            // Determine WebSocket URL (handling dev/prod)
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            // In dev, frontend is 5173, backend 8000. Assuming Vite proxy is set up for /ws
            // IF NO PROXY: Use explicit localhost:8000
            // Let's assume proxy or same origin for robustness. 
            // If direct access needed: `ws://localhost:8000/ws/gemini-live`
            const host = "localhost:8000"; // Hardcoding for local dev as per usual setup
            const url = `${protocol}//${host}/ws/gemini-live`;

            console.log('[GeminiLive] Connecting to Backend:', url);

            return new Promise<void>((resolve, reject) => {
                const ws = new WebSocket(url);
                wsRef.current = ws;
                ws.binaryType = 'arraybuffer'; // Critical for receiving raw audio

                const timeout = setTimeout(() => {
                    if (ws.readyState !== WebSocket.OPEN) {
                        ws.close();
                        reject(new Error('Connection timeout'));
                    }
                }, 10000);

                ws.onopen = () => {
                    clearTimeout(timeout);
                    console.log('[GeminiLive] Connected to Backend');
                    setIsConnected(true);
                    setStatus('connected');
                    resolve();
                };

                ws.onmessage = async (event) => {
                    // Handle Binary Audio
                    if (event.data instanceof ArrayBuffer) {
                        try {
                            const pcmData = new Int16Array(event.data);
                            playbackQueueRef.current.push(pcmData);
                            if (!isPlayingRef.current) playAudioQueue();
                        } catch (e) {
                            console.error("Error processing audio bytes:", e);
                        }
                        return;
                    }

                    // Handle Text/JSON
                    if (typeof event.data === 'string') {
                        try {
                            const message = JSON.parse(event.data);
                            if (message.text) {
                                console.log('[GeminiLive] AI Transcript:', message.text);
                                onTranscript?.(message.text);
                            }
                            if (message.type === 'interrupted') {
                                console.log('[GeminiLive] Interrupted');
                                playbackQueueRef.current = [];
                                isPlayingRef.current = false;
                                setIsSpeaking(false);
                            }
                        } catch (e) {
                            console.error("Error parsing JSON:", e);
                        }
                    }
                };

                ws.onerror = (error) => {
                    clearTimeout(timeout);
                    console.error('[GeminiLive] WebSocket error:', error);
                    setStatus('error');
                    onError?.('Connection failed');
                };

                ws.onclose = () => {
                    console.log('[GeminiLive] Disconnected');
                    setIsConnected(false);
                    setStatus('disconnected');
                };
            });

        } catch (error) {
            console.error('[GeminiLive] Connection error:', error);
            setStatus('error');
            throw error;
        }
    }, [onTranscript, onError]);

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

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
        if (ctx.state === 'suspended') await ctx.resume();

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

    const startRecording = useCallback(async () => {
        try {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                await connect();
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioContext = new AudioContext({ sampleRate: 16000 });
            const source = audioContext.createMediaStreamSource(stream);

            await audioContext.audioWorklet.addModule('/gemini-audio-processor.js');
            const processor = new AudioWorkletNode(audioContext, 'gemini-audio-processor');

            processor.port.onmessage = (event) => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    // Send RAW BYTES (Float32Array converted to Int16 usually, or raw from worklet)
                    // The worklet typically sends Float32 or Int16. 
                    // Let's assume the worklet sends Int16 array buffer ready for transport
                    // If event.data is Int16Array or ArrayBuffer:
                    wsRef.current.send(event.data);
                }
            };

            source.connect(processor);
            setIsRecording(true);
        } catch (error) {
            console.error('[GeminiLive] Failed to start recording:', error);
            onError?.('Failed to start recording');
        }
    }, [connect, onError]);

    const stopRecording = useCallback(() => {
        setIsRecording(false);
    }, []);

    return useMemo(() => ({
        isConnected,
        isRecording,
        isSpeaking,
        status,
        connect,
        disconnect,
        startRecording,
        stopRecording
    }), [isConnected, isRecording, isSpeaking, status, connect, disconnect, startRecording, stopRecording]);
};
