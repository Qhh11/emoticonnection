import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

interface GeminiLiveConfig {
    onTranscript?: (text: string) => void;
    onError?: (error: string) => void;
    onTurnComplete?: () => void;
    systemInstruction?: string;
    voiceName?: string;
}

export const useGeminiLive = ({ onTranscript, onError, onTurnComplete, systemInstruction, voiceName }: GeminiLiveConfig) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error' | 'disconnected'>('idle');
    const [conversation, setConversation] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
    const [transcripts, setTranscripts] = useState<{ id: string, role: 'user' | 'ai', text: string, isFinal: boolean }[]>([]);

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const playbackQueueRef = useRef<Int16Array[]>([]);
    const isPlayingRef = useRef(false);
    const currentAiTurnRef = useRef<string>("");
    const nextStartTimeRef = useRef<number>(0);

    const mediaStreamRef = useRef<MediaStream | null>(null);
    const recordingContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<AudioWorkletNode | null>(null);

    // Helper: ArrayBuffer to Base64
    const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    };

    // Helper: Base64 to ArrayBuffer
    const base64ToArrayBuffer = (base64: string) => {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    };

    // Connect Directly to Gemini Live API
    const connect = useCallback(async () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        setStatus('connecting');
        setConversation([]); // Reset conversation on new session

        try {
            const apiKey = import.meta.env.GEMINI_API_KEY;
            const model = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash-native-audio-preview-12-2025';

            if (!apiKey) {
                console.error('[GeminiLive] ERROR: GEMINI_API_KEY is undefined. Check environment variables.');
                throw new Error('Missing GEMINI_API_KEY in environment');
            } else {
                console.log(`[GeminiLive] API Key detected (prefix: ${apiKey.substring(0, 4)}..., length: ${apiKey.length})`);
            }

            const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

            console.log('[GeminiLive] Connecting directly to Gemini API...');

            return new Promise<void>((resolve, reject) => {
                const ws = new WebSocket(url);
                wsRef.current = ws;

                const timeout = setTimeout(() => {
                    if (ws.readyState !== WebSocket.OPEN) {
                        ws.close();
                        reject(new Error('Connection timeout'));
                    }
                }, 10000);

                ws.onopen = () => {
                    clearTimeout(timeout);
                    console.log('[GeminiLive] WebSocket Connected');

                    // Send Setup Message
                    const setupMessage: any = {
                        setup: {
                            model: `models/${model}`,
                            generationConfig: {
                                responseModalities: ['audio']
                            }
                        }
                    };

                    // Add system instruction if provided
                    if (systemInstruction) {
                        setupMessage.setup.systemInstruction = {
                            parts: [{ text: systemInstruction }]
                        };
                    }

                    // Add voice config if provided
                    if (voiceName) {
                        setupMessage.setup.generationConfig.speechConfig = {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: voiceName
                                }
                            }
                        };
                    }

                    ws.send(JSON.stringify(setupMessage));

                    setIsConnected(true);
                    setStatus('connected');
                    resolve();
                };

                ws.onmessage = async (event) => {
                    let data = event.data;

                    // Handle Blob if sent
                    if (data instanceof Blob) {
                        data = await data.text();
                    }

                    try {
                        const response = JSON.parse(data);

                        if (response.serverContent) {
                            const content = response.serverContent;

                            // 1. Handle Transcriptions (AI Output)
                            if (content.outputTranscription) {
                                const text = content.outputTranscription.text;
                                currentAiTurnRef.current += text;
                                onTranscript?.(text);

                                // Update transcripts state for real-time UI mapping
                                setTranscripts(prev => {
                                    const last = prev[prev.length - 1];
                                    if (last && last.role === 'ai' && !last.isFinal) {
                                        return [...prev.slice(0, -1), { ...last, text: currentAiTurnRef.current }];
                                    }
                                    return [...prev, { id: 'ai-' + Date.now(), role: 'ai', text: currentAiTurnRef.current, isFinal: false }];
                                });
                            }

                            // 1.1 Handle Transcriptions (User Input - if enabled in setup)
                            if (content.inputTranscription) {
                                const text = content.inputTranscription.text;
                                setTranscripts(prev => {
                                    const last = prev[prev.length - 1];
                                    if (last && last.role === 'user' && !last.isFinal) {
                                        return [...prev.slice(0, -1), { ...last, text }];
                                    }
                                    return [...prev, { id: 'user-' + Date.now(), role: 'user', text, isFinal: false }];
                                });
                            }

                            // 2. Handle Audio
                            if (content.modelTurn && content.modelTurn.parts) {
                                for (const part of content.modelTurn.parts) {
                                    if (part.inlineData && part.inlineData.data) {
                                        const pcmBuffer = base64ToArrayBuffer(part.inlineData.data);
                                        const pcmData = new Int16Array(pcmBuffer);
                                        scheduleAudioPlayback(pcmData);
                                    }
                                }
                            }

                            // 3. Handle Interruption
                            if (content.interrupted) {
                                console.log('[GeminiLive] Interrupted');
                                playbackQueueRef.current = [];
                                isPlayingRef.current = false;
                                setIsSpeaking(false);
                                nextStartTimeRef.current = 0;

                                if (currentAiTurnRef.current) {
                                    const finalContent = currentAiTurnRef.current + " [Interrupted]";
                                    setConversation(prev => [...prev, { role: 'ai', content: finalContent }]);
                                    setTranscripts([]); // Clear real-time transcripts
                                    currentAiTurnRef.current = "";
                                }
                            }

                            // 4. Handle Turn Complete
                            if (content.turnComplete) {
                                if (currentAiTurnRef.current) {
                                    const cleanText = currentAiTurnRef.current
                                        .split('\n')
                                        .map(l => l.trim())
                                        .filter(l => l.length > 0)
                                        .join('\n')
                                        .replace(/\*/g, ''); // Remove all Markdown asterisks
                                    setConversation(prev => [...prev, { role: 'ai', content: cleanText }]);
                                    setTranscripts([]); // Clear real-time transcripts
                                    currentAiTurnRef.current = "";
                                }
                                onTurnComplete?.();
                            }
                        }
                    } catch (e) {
                        console.error("[GeminiLive] Error parsing message:", e, data);
                    }
                };

                ws.onerror = (e) => {
                    clearTimeout(timeout);
                    console.error('[GeminiLive] WebSocket Error Handle:', e);
                    setStatus('error');
                    onError?.('WebSocket connection error. Check if API Key is valid and region is supported.');
                    reject(new Error('WebSocket connection error'));
                };

                ws.onclose = (e) => {
                    console.log('[GeminiLive] WebSocket Closed:', e.code, e.reason);
                    setIsConnected(false);
                    setStatus('disconnected');
                    stopStreaming();

                    if (e.code !== 1000) {
                        console.error(`[GeminiLive] Connection closed abnormally (${e.code}). Reason: ${e.reason || 'Unknown'}. Common causes: Invalid API Key, exceeded quota, or region restriction.`);
                    }
                };
            });

        } catch (error) {
            console.error('[GeminiLive] Connection Failed:', error);
            const errorMsg = error instanceof Error ? error.message : String(error);
            setStatus('error');
            throw new Error(`Gemini Live Connection Failed: ${errorMsg}. Hint: Check Render Env Vars for GEMINI_API_KEY.`);
        }
    }, [onTranscript, onError, onTurnComplete]);

    const disconnect = useCallback(() => {
        stopStreaming();
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        // Close playback audio context
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }
        playbackQueueRef.current = []; // Clear any pending audio
        isPlayingRef.current = false; // Reset playback state
        setIsSpeaking(false); // Reset speaking state
        nextStartTimeRef.current = 0; // Reset audio scheduling time
    }, []);

    // Unified Audio Scheduler (Avoids jitter/gaps)
    const scheduleAudioPlayback = useCallback(async (pcmData: Int16Array) => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }

        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        // Convert Int16 to Float32
        const floatData = new Float32Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
            floatData[i] = pcmData[i] / 32768.0;
        }

        const audioBuffer = ctx.createBuffer(1, floatData.length, 24000);
        audioBuffer.getChannelData(0).set(floatData);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);

        const currentTime = ctx.currentTime;
        // If we fall behind or just start, reset start time to current
        if (nextStartTimeRef.current < currentTime) {
            nextStartTimeRef.current = currentTime;
        }

        // Schedule playback
        source.start(nextStartTimeRef.current);

        // Track the end of this buffer for the next one
        nextStartTimeRef.current += audioBuffer.duration;

        // Visual state tracking (with debounce or simplified)
        if (!isPlayingRef.current) {
            isPlayingRef.current = true;
            setIsSpeaking(true);
        }

        // Reset speaking state after a long silence (e.g., 500ms beyond last scheduled end)
        // This timeout will check if the audio has truly finished playing after its scheduled end time.
        const scheduledEndTime = nextStartTimeRef.current;
        source.onended = () => {
            // Give a small buffer to ensure all audio is played, then check if no more audio is scheduled
            setTimeout(() => {
                if (ctx.currentTime >= scheduledEndTime - 0.01) { // Check if current time is past or very close to scheduled end
                    // If no new audio has been scheduled since this one, then we are done speaking
                    if (nextStartTimeRef.current <= scheduledEndTime) {
                        setIsSpeaking(false);
                        isPlayingRef.current = false;
                    }
                }
            }, 50); // Small delay to ensure onended has fully processed and nextStartTimeRef is updated if new audio arrived
        };

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
                    // Convert ArrayBuffer to Base64 for the Live API
                    const base64Audio = arrayBufferToBase64(event.data);
                    const message = {
                        realtimeInput: {
                            mediaChunks: [{
                                data: base64Audio,
                                mimeType: 'audio/pcm;rate=16000'
                            }]
                        }
                    };
                    wsRef.current.send(JSON.stringify(message));
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
            recordingContextRef.current.close().catch(console.error);
            recordingContextRef.current = null;
        }

        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }

        setIsRecording(false);
        console.log('[GeminiLive] Streaming stopped');
    }, []);

    const sendText = useCallback((text: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            setConversation(prev => [...prev, { role: 'user', content: text }]);
            const message = {
                clientContent: {
                    turns: [{
                        role: 'user',
                        parts: [{ text }]
                    }],
                    turnComplete: true
                }
            };
            wsRef.current.send(JSON.stringify(message));
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
        startLiveConversation: startStreaming,
        stopLiveConversation: stopStreaming,
        sendText,
        transcripts,
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
        sendText,
        transcripts
    ]);
};

