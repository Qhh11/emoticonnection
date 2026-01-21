import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useGeminiLive } from '../../hooks/useGeminiLive';

// Animations
const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
`;

const wave = keyframes`
  0%, 100% { height: 20%; }
  50% { height: 100%; }
`;

// Styled Components
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  z-index: 2000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
`;

const ModalContainer = styled.div<{ $embedded?: boolean }>`
  width: 100%;
  max-width: ${props => props.$embedded ? 'none' : '900px'};
  height: ${props => props.$embedded ? '100%' : '700px'};
  background: white;
  border-radius: ${props => props.$embedded ? '0' : '3rem'};
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: ${props => props.$embedded ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)'};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
`;

const Header = styled.div`
  padding: 1.5rem 2rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CloseButton = styled.button`
  background: rgba(0, 0, 0, 0.05);
  border: none;
  color: #666;
  font-size: 1.5rem;
  cursor: pointer;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  
  &:hover { 
    background: rgba(0, 0, 0, 0.1);
  }
`;

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  overflow-y: auto;
`;

const StatusText = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 2rem;
`;

const MicrophoneCircle = styled.div<{ $status: 'idle' | 'listening' | 'recorded' | 'processing' | 'speaking' }>`
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: ${props =>
        props.$status === 'listening' ? 'rgba(124, 77, 255, 0.1)' :
            props.$status === 'processing' ? 'rgba(76, 175, 255, 0.1)' :
                props.$status === 'speaking' ? 'rgba(76, 255, 175, 0.1)' :
                    props.$status === 'recorded' ? 'rgba(124, 77, 255, 0.05)' :
                        'rgba(0, 0, 0, 0.03)'
    };
  border: 3px solid ${props =>
        props.$status === 'listening' ? '#7c4dff' :
            props.$status === 'processing' ? '#4cafff' :
                props.$status === 'speaking' ? '#4cffaf' :
                    props.$status === 'recorded' ? '#7c4dff' :
                        'rgba(0, 0, 0, 0.1)'
    };
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${props => props.$status === 'idle' ? 'pointer' : 'default'};
  transition: all 0.3s ease;
  position: relative;
  
  ${props => props.$status === 'listening' && css`
    animation: ${pulse} 2s ease-in-out infinite;
  `}
  
  &:hover {
    transform: ${props => props.$status === 'idle' ? 'scale(1.05)' : 'scale(1)'};
  }
`;

const ControlsRow = styled.div`
  display: flex;
  gap: 1.5rem;
  margin-top: 2rem;
  align-items: center;
`;

const ActionButton = styled.button<{ color?: string }>`
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 2rem;
  background: ${props => props.color || '#7c4dff'};
  color: white;
  font-weight: 700;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
    filter: brightness(1.1);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const MicIcon = styled.svg<{ $status: string }>`
  width: 60px;
  height: 60px;
  color: ${props =>
        props.$status === 'listening' ? '#7c4dff' :
            props.$status === 'processing' ? '#4cafff' :
                props.$status === 'speaking' ? '#4cffaf' :
                    '#999'
    };
`;

const VisualizerContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
  gap: 6px;
`;

const Bar = styled.div<{ $delay: number }>`
  width: 4px;
  background: #7c4dff;
  border-radius: 2px;
  animation: ${wave} 1s ease-in-out infinite;
  animation-delay: ${props => props.$delay}s;
`;

const TranscriptBox = styled.div`
  max-width: 600px;
  min-height: 80px;
  padding: 1.5rem 2rem;
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 1rem;
  margin-top: 1.5rem;
  font-size: 0.95rem;
  line-height: 1.6;
  text-align: center;
  color: #666;
  font-weight: 500;
`;

interface VoiceChatOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    embedded?: boolean;
}

const VoiceChatOverlay: React.FC<VoiceChatOverlayProps> = ({ isOpen, onClose, embedded = false }) => {
    const [status, setStatus] = useState<'idle' | 'listening' | 'recorded' | 'processing' | 'speaking'>('idle');
    const [transcript, setTranscript] = useState<string>("");
    const [aiResponseText, setAiResponseText] = useState<string>("");
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

    const onTranscript = useCallback((text: string) => {
        console.log('[VoiceChat] Received transcript from Gemini:', text);
        if (text) {
            setTranscript(text);
        }
    }, []);

    const onError = useCallback((error: string) => {
        console.error('[VoiceChat] Gemini Live error:', error);
        if (isOpen) setStatus('idle');
    }, [isOpen]);

    const onTurnComplete = useCallback(() => {
        console.log('[VoiceChat] Gemini turn complete');
        setStatus(prev => (prev === 'processing' || prev === 'speaking' ? 'idle' : prev));
    }, []);

    // Gemini Live hook
    const geminiLive = useGeminiLive({ onTranscript, onError, onTurnComplete });

    useEffect(() => {
        if (geminiLive.isConnected) {
            if (geminiLive.isSpeaking) {
                setStatus('speaking');
            } else if (status === 'speaking' && !geminiLive.isSpeaking) {
                setStatus('idle');
            }
        }
    }, [geminiLive.isConnected, geminiLive.isSpeaking, status]);

    useEffect(() => {
        if (!isOpen) {
            if (audioPlayerRef.current) {
                audioPlayerRef.current.pause();
                audioPlayerRef.current = null;
            }
            setTranscript("");
            setAiResponseText("");
            setRecordedBlob(null);
            setStatus('idle');
        }
    }, [isOpen]);

    // Unmount cleanup
    useEffect(() => {
        return () => {
            // Use refs or stable methods for cleanup
            mediaRecorderRef.current?.stop();
            // Note: geminiLive object might change, so we use a stable reference in the hook ideally
            // but for now, we'll try to keep it simple
        };
    }, []);

    const startListening = async () => {
        try {
            setTranscript("");
            setAiResponseText("");
            setRecordedBlob(null);

            if (!geminiLive.isConnected) {
                console.log('[VoiceChat] Connecting to Gemini Live...');
                await geminiLive.connect();
            }

            console.log('[VoiceChat] Accessing microphone...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Check if MediaRecorder is supported
            if (typeof MediaRecorder === 'undefined') {
                throw new Error('MediaRecorder is not supported in this browser. Please use Chrome, Firefox or Edge.');
            }

            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                audioChunksRef.current = [];
                setRecordedBlob(audioBlob);
                setStatus('recorded');

                try {
                    console.log('[VoiceChat] Transcribing user recording...');
                    const formData = new FormData();
                    formData.append('file', audioBlob, 'voice.webm');

                    const response = await fetch('/api/ai-chat/transcribe', {
                        method: 'POST',
                        body: formData
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.text) {
                            setTranscript(data.text);
                        }
                    }
                } catch (err) {
                    console.error('[VoiceChat] Error calling transcribe API:', err);
                }

                console.log('[VoiceChat] Audio recorded, ready to send.');
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;
            setStatus('listening');
        } catch (error) {
            console.error('[VoiceChat] Error in startListening:', error);
            const msg = error instanceof Error ? error.message : 'Unknown error starting microphone session';
            alert(`Voice Chat Error: ${msg}`);
            setStatus('idle');
        }
    };

    const stopListening = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };

    const sendAudio = async () => {
        if (recordedBlob) {
            sendAudioBlob(recordedBlob);
        }
    };

    const sendAudioBlob = async (blob: Blob) => {
        try {
            // Reconnect if needed
            if (geminiLive.getReadyState?.() !== WebSocket.OPEN) {
                console.log('[VoiceChat] Connection lost, attempting to reconnect before sending...');
                await geminiLive.connect();
            }

            if (geminiLive.getReadyState?.() !== WebSocket.OPEN) {
                throw new Error('Could not establish connection to Gemini. Please check your API key and internet.');
            }

            setStatus('processing');

            const audioContext = new AudioContext({ sampleRate: 16000 });
            const arrayBuffer = await blob.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            const channelData = audioBuffer.getChannelData(0); // Mono
            const pcmData = new Int16Array(channelData.length);
            for (let i = 0; i < channelData.length; i++) {
                const s = Math.max(-1, Math.min(1, channelData[i]));
                pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }

            console.log(`[VoiceChat] Sending PCM data: ${pcmData.length} samples to Gemini...`);

            // Manual VAD Control
            geminiLive.sendActivityStart();
            geminiLive.sendAudioData(pcmData);
            geminiLive.sendActivityEnd();

            await audioContext.close();
            setRecordedBlob(null);
        } catch (err) {
            console.error('[VoiceChat] Error in sendAudioBlob:', err);
            setStatus('recorded'); // Stay in recorded state so user can retry
            alert(err instanceof Error ? err.message : 'FAILED to send audio. Please check connection.');
        }
    };

    const handleClear = () => {
        setRecordedBlob(null);
        setTranscript("");
        setAiResponseText("");
        setStatus('idle');
        geminiLive.disconnect();
    };

    if (!isOpen) return null;

    const renderContent = () => (
        <>
            <StatusText>
                {status === 'listening' && "🎤 Listening..."}
                {status === 'processing' && "💭 Processing..."}
                {status === 'speaking' && "🔊 AI is speaking..."}
                {status === 'recorded' && "✅ Audio Recorded"}
                {status === 'idle' && "Ready to chat"}
            </StatusText>

            <MicrophoneCircle $status={status} onClick={status === 'idle' ? startListening : undefined}>
                {status === 'listening' ? (
                    <VisualizerContainer key="listening-viz">
                        {[0, 0.15, 0.3, 0.15, 0].map((delay, i) => (
                            <Bar key={i} $delay={delay} />
                        ))}
                    </VisualizerContainer>
                ) : status === 'recorded' ? (
                    <MicIcon key="recorded-icon" $status={status} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="currentColor" />
                    </MicIcon>
                ) : (
                    <MicIcon key="status-icon" $status={status} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 14C14.2091 14 16 12.2091 16 10V4C16 1.79086 14.2091 0 12 0C9.79086 0 8 1.79086 8 4V10C8 12.2091 9.79086 14 12 14Z" fill="currentColor" />
                        <path d="M19 10V10.5C19 14.09 16.09 17 12.5 17C8.91 17 6 14.09 6 10.5V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M12 17V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </MicIcon>
                )}
            </MicrophoneCircle>

            <ControlsRow>
                {status === 'idle' ? (
                    <ActionButton key="start-btn" onClick={startListening}>
                        ⚡ Start Live API Interaction
                    </ActionButton>
                ) : status === 'listening' ? (
                    <ActionButton key="stop-btn" color="#f44336" onClick={stopListening}>
                        ⏹ Stop Recording
                    </ActionButton>
                ) : status === 'recorded' ? (
                    <React.Fragment key="action-group">
                        <ActionButton key="send-btn" color="#4caf50" onClick={sendAudio}>
                            🚀 Send to AI
                        </ActionButton>
                        <ActionButton key="clear-btn" color="#999" onClick={handleClear}>
                            🗑 Clear / Re-record
                        </ActionButton>
                    </React.Fragment>
                ) : (
                    <ActionButton key="end-btn" color="#f44336" onClick={handleClear}>
                        🛑 End Session
                    </ActionButton>
                )}
            </ControlsRow>

            {(transcript || aiResponseText || (status === 'recorded' && !transcript)) && (
                <TranscriptBox>
                    {status === 'recorded' && !transcript && (
                        <div style={{ opacity: 0.5, fontStyle: 'italic' }}>
                            Transcribing your voice...
                        </div>
                    )}
                    {transcript && (
                        <div style={{ fontStyle: 'italic', opacity: 0.7, marginBottom: '0.5rem' }}>
                            "{transcript}"
                        </div>
                    )}
                    {aiResponseText && (
                        <div style={{ color: '#333', fontWeight: 600 }}>
                            {aiResponseText}
                        </div>
                    )}
                </TranscriptBox>
            )}
        </>
    );

    if (embedded) {
        return (
            <ModalContainer $embedded={true}>
                <Header>
                    <div style={{ fontWeight: 700, color: '#333' }}>Gemini Live AI</div>
                </Header>
                <ContentArea>
                    {renderContent()}
                </ContentArea>
            </ModalContainer>
        );
    }

    return (
        <Overlay onClick={onClose}>
            <ModalContainer onClick={(e) => e.stopPropagation()}>
                <Header>
                    <div style={{ fontWeight: 700, color: '#333' }}>Gemini Live AI</div>
                    <CloseButton onClick={onClose}>&times;</CloseButton>
                </Header>
                <ContentArea>
                    {renderContent()}
                </ContentArea>
            </ModalContainer>
        </Overlay>
    );
};

export default VoiceChatOverlay;
