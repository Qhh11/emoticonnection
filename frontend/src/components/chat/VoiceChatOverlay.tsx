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

const ActionButton = styled.button<{ color?: string; $transparent?: boolean }>`
  padding: 0.8rem 1.5rem;
  border: ${props => props.$transparent ? `2px solid ${props.color || '#7c4dff'}` : 'none'};
  border-radius: 2rem;
  background: ${props => props.$transparent ? 'transparent' : (props.color || '#7c4dff')};
  color: ${props => props.$transparent ? (props.color || '#7c4dff') : 'white'};
  font-weight: 700;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: ${props => props.$transparent ? 'none' : '0 4px 12px rgba(0, 0, 0, 0.1)'};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.$transparent ? '0 2px 8px rgba(0, 0, 0, 0.1)' : '0 6px 16px rgba(0, 0, 0, 0.15)'};
    background: ${props => props.$transparent ? `${props.color || '#7c4dff'}15` : undefined};
    filter: ${props => props.$transparent ? 'none' : 'brightness(1.1)'};
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: ${props => props.$transparent ? 'transparent' : '#ccc'};
    border-color: ${props => props.$transparent ? '#ccc' : 'transparent'};
    color: ${props => props.$transparent ? '#ccc' : 'white'};
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

const ConversationScroll = styled.div`
  width: 100%;
  max-width: 700px;
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
  mask-image: linear-gradient(to bottom, transparent, black 5%, black 95%, transparent);
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 2px;
  }
`;

const MessageRow = styled.div<{ $isUser: boolean }>`
  display: flex;
  justify-content: ${props => props.$isUser ? 'flex-end' : 'flex-start'};
  width: 100%;
`;

const Bubble = styled.div<{ $isUser: boolean }>`
  max-width: 80%;
  padding: 0.8rem 1.2rem;
  border-radius: ${props => props.$isUser ? '1.5rem 1.5rem 0 1.5rem' : '1.5rem 1.5rem 1.5rem 0'};
  background: ${props => props.$isUser ? '#7c4dff' : '#f0f2f5'};
  color: ${props => props.$isUser ? 'white' : '#333'};
  font-size: 0.9rem;
  line-height: 1.5;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  white-space: pre-wrap;
  word-wrap: break-word;
`;

interface VoiceChatOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    embedded?: boolean;
}

const VoiceChatOverlay: React.FC<VoiceChatOverlayProps> = ({ isOpen, onClose, embedded = false }) => {
    const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
    const [transcript, setTranscript] = useState<string>("");
    const scrollRef = useRef<HTMLDivElement>(null);

    const onTranscript = useCallback((text: string) => {
        setTranscript(text);
    }, []);

    const onError = useCallback((error: string) => {
        console.error('[VoiceChat] Error:', error);
        if (isOpen) setStatus('idle');
    }, [isOpen]);

    const onTurnComplete = useCallback(() => {
        setTranscript("");
    }, []);

    // Gemini Live hook
    const geminiLive = useGeminiLive({ onTranscript, onError, onTurnComplete });

    // Sync UI status with hook status
    useEffect(() => {
        if (geminiLive.status === 'idle') {
            setStatus('idle');
        } else if (geminiLive.status === 'connecting') {
            setStatus('processing');
        } else if (geminiLive.status === 'connected') {
            if (geminiLive.isRecording) {
                setStatus('listening');
            } else if (geminiLive.isSpeaking) {
                setStatus('speaking');
            } else {
                setStatus('idle');
            }
        } else if (geminiLive.status === 'error') {
            setStatus('idle');
        }
    }, [geminiLive.status, geminiLive.isRecording, geminiLive.isSpeaking]);

    useEffect(() => {
        if (!isOpen) {
            setTranscript("");
            setStatus('idle');
            geminiLive.disconnect();
        }
    }, [isOpen, geminiLive]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [geminiLive.conversation, transcript]);

    const handleToggleInteraction = async () => {
        if (geminiLive.isRecording) {
            geminiLive.stopStreaming();
        } else {
            setTranscript("");
            await geminiLive.startStreaming();
        }
    };

    const handleClose = () => {
        geminiLive.disconnect();
        onClose();
    };

    if (!isOpen) return null;

    const renderContent = () => (
        <>
            <StatusText>
                {status === 'listening' && "🎤 Listening..."}
                {status === 'processing' && "💭 Connecting..."}
                {status === 'speaking' && "🔊 AI is speaking..."}
                {status === 'idle' && (geminiLive.isConnected ? "Ready to chat" : "Click to Start")}
            </StatusText>

            <MicrophoneCircle $status={status} onClick={handleToggleInteraction}>
                {status === 'listening' ? (
                    <VisualizerContainer key="listening-viz">
                        {[0, 0.15, 0.3, 0.15, 0].map((delay, i) => (
                            <Bar key={i} $delay={delay} />
                        ))}
                    </VisualizerContainer>
                ) : status === 'speaking' ? (
                    <VisualizerContainer key="speaking-viz">
                        {[0, 0.1, 0.2, 0.1, 0].map((delay, i) => (
                            <Bar key={i} $delay={delay} style={{ background: '#4cffaf' }} />
                        ))}
                    </VisualizerContainer>
                ) : (
                    <MicIcon key="status-icon" $status={status} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 14C14.2091 14 16 12.2091 16 10V4C16 1.79086 14.2091 0 12 0C9.79086 0 8 1.79086 8 4V10C8 12.2091 9.79086 14 12 14Z" fill="currentColor" />
                        <path d="M19 10V10.5C19 14.09 16.09 17 12.5 17C8.91 17 6 14.09 6 10.5V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M12 17V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </MicIcon>
                )}
            </MicrophoneCircle>

            <ConversationScroll ref={scrollRef}>
                {geminiLive.conversation.map((msg, i) => (
                    <MessageRow key={i} $isUser={msg.role === 'user'}>
                        <Bubble $isUser={msg.role === 'user'}>{msg.content}</Bubble>
                    </MessageRow>
                ))}

                {/* Real-time Transcripts */}
                {geminiLive.transcripts.map((t) => (
                    <MessageRow key={t.id} $isUser={t.role === 'user'}>
                        <Bubble $isUser={t.role === 'user'}>
                            {t.text || "..."}
                        </Bubble>
                    </MessageRow>
                ))}

                {/* Fallback for when no transcripts but AI is speaking or user is listening */}
                {geminiLive.transcripts.length === 0 && (transcript || status === 'speaking') && (
                    <MessageRow $isUser={status !== 'speaking'}>
                        <Bubble $isUser={status !== 'speaking'}>
                            {transcript || "..."}
                        </Bubble>
                    </MessageRow>
                )}
            </ConversationScroll>

            <ControlsRow>
                {!geminiLive.isRecording ? (
                    <ActionButton key="start-btn" onClick={handleToggleInteraction} disabled={geminiLive.status === 'connecting'}>
                        {geminiLive.status === 'connecting' ? 'Connecting...' : '⚡ Start Real-time Chat'}
                    </ActionButton>
                ) : (
                    <ActionButton key="stop-btn" color="#f44336" onClick={handleToggleInteraction}>
                        ⏹ Stop Interaction
                    </ActionButton>
                )}

                {geminiLive.isConnected && (
                    <ActionButton key="end-btn" $transparent color="#999" onClick={() => geminiLive.disconnect()}>
                        🛑 End Session
                    </ActionButton>
                )}
            </ControlsRow>
        </>
    );

    if (embedded) {
        return (
            <ModalContainer $embedded={true}>
                <Header>
                    <div style={{ fontWeight: 700, color: '#333' }}>Gemini Real-time Voice</div>
                </Header>
                <ContentArea>
                    {renderContent()}
                </ContentArea>
            </ModalContainer>
        );
    }

    return (
        <Overlay onClick={handleClose}>
            <ModalContainer onClick={(e) => e.stopPropagation()}>
                <Header>
                    <div style={{ fontWeight: 700, color: '#333' }}>Gemini Real-time Voice</div>
                    <CloseButton onClick={handleClose}>&times;</CloseButton>
                </Header>
                <ContentArea>
                    {renderContent()}
                </ContentArea>
            </ModalContainer>
        </Overlay>
    );
};

export default VoiceChatOverlay;
