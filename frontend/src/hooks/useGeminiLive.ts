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
    const [conversation, setConversation] = useState<{ role: 'user' | 'ai', content: string }[]>([]);

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const playbackQueueRef = useRef<Int16Array[]>([]);
    const isPlayingRef = useRef(false);
    const currentAiTurnRef = useRef<string>("");

    const mediaStreamRef = useRef<MediaStream | null>(null);
    const recordingContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<AudioWorkletNode | null>(null);

    // Connect to Backend WebSocket Proxy
    const connect = useCallback(async () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        setStatus('connecting');
        setConversation([]); // Reset conversation on new session

        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
            const url = `${protocol}//${host}/ws/gemini-live`;

            console.log('[GeminiLive] Connecting to:', url);

            return new Promise<void>((resolve, reject) => {
                const ws = new WebSocket(url);
                wsRef.current = ws;
                ws.binaryType = 'arraybuffer';

                const timeout = setTimeout(() => {
                    if (ws.readyState !== WebSocket.OPEN) {
                        ws.close();
                        reject(new Error('Connection timeout'));
                    }
                }, 10000);

                ws.onopen = () => {
                    clearTimeout(timeout);
                    console.log('[GeminiLive] Connected');
                    setIsConnected(true);
                    setStatus('connected');
                    resolve();
                };

                ws.onmessage = async (event) => {
                    if (event.data instanceof ArrayBuffer) {
                        try {
                            const pcmData = new Int16Array(event.data);
                            playbackQueueRef.current.push(pcmData);
                            if (!isPlayingRef.current) playAudioQueue();
                        } catch (e) {
                            console.error("[GeminiLive] Error processing audio:", e);
                        }
                        return;
                    }

                    if (typeof event.data === 'string') {
                        try {
                            const message = JSON.parse(event.data);
                            if (message.type === 'text' && message.content) {
                                currentAiTurnRef.current += message.content;
                                onTranscript?.(message.content);
                            }
                            if (message.type === 'interrupted') {
                                console.log('[GeminiLive] Interrupted');
                                playbackQueueRef.current = [];
                                isPlayingRef.current = false;
                                setIsSpeaking(false);

                                if (currentAiTurnRef.current) {
                                    setConversation(prev => [...prev, { role: 'ai', content: currentAiTurnRef.current + " [Interrupted]" }]);
                                    currentAiTurnRef.current = "";
                                }
                            }
                            if (message.type === 'turn_complete') {
                                if (currentAiTurnRef.current) {
                                    setConversation(prev => [...prev, { role: 'ai', content: currentAiTurnRef.current }]);
                                    currentAiTurnRef.current = "";
                                }
                                onTurnComplete?.();
                            }
                        } catch (e) {
                            console.error("[GeminiLive] Error parsing JSON:", e);
                        }
                    }
                };

                ws.onerror = () => {
                    clearTimeout(timeout);
                    setStatus('error');
                    onError?.('WebSocket connection error');
                };

                ws.onclose = () => {
                    setIsConnected(false);
                    setStatus('disconnected');
                    stopStreaming();
                };
            });

        } catch (error) {
            setStatus('error');
            throw error;
        }
    }, [onTranscript, onError, onTurnComplete]);

    const disconnect = useCallback(() => {
        stopStreaming();
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

        const chunk = playbackQueueRef.current.shift();
        if (!chunk) {
            isPlayingRef.current = false;
            setIsSpeaking(false);
            return;
        }

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

    const startStreaming = useCallback(async () => {
        try {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                await connect();
            }

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
                    wsRef.current.send(event.data);
                }
            };

            source.connect(processor);
            setIsRecording(true);
            console.log('[GeminiLive] Streaming started');
        } catch (error) {
            console.error('[GeminiLive] Failed to start streaming:', error);
            onError?.(error instanceof Error ? error.message : 'Failed to start streaming');
        }
    }, [connect, onError]);

    const stopStreaming = useCallback(() => {
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
        console.log('[GeminiLive] Streaming stopped');
    }, []);

    // For manual user input (text chat within voice overlay)
    const sendText = useCallback((text: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            setConversation(prev => [...prev, { role: 'user', content: text }]);
            wsRef.current.send(JSON.stringify({ text }));
        }
    }, []);

    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return useMemo(() => ({
        isConnected,
        isRecording,
        isSpeaking,
        status,
        conversation,
        connect,
        disconnect,
        startStreaming,
        stopStreaming,
        sendText,
        getReadyState: () => wsRef.current?.readyState
    }), [
        isConnected,
        isRecording,
        isSpeaking,
        status,
        conversation,
        connect,
        disconnect,
        startStreaming,
        stopStreaming,
        sendText
    ]);
};
