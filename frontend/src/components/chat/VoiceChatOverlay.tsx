import React, { useState, useRef, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';

// Animations
const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 0.6; }
`;

const wave = keyframes`
  0% { height: 10px; }
  50% { height: 50px; }
  100% { height: 10px; }
`;

// Styled Components
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 40px;
  right: 40px;
  background: none;
  border: none;
  color: white;
  font-size: 2rem;
  cursor: pointer;
  opacity: 0.7;
  &:hover { opacity: 1; }
`;

const StatusText = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 2rem;
  font-weight: 300;
  opacity: 0.9;
`;

const VisualizerContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  gap: 10px;
`;

const Bar = styled.div<{ $delay: number; $active: boolean }>`
  width: 10px;
  height: 20px;
  background: white;
  border-radius: 5px;
  animation: ${props => props.$active ? css`${wave} 1s ease-in-out infinite` : 'none'};
  animation-delay: ${props => props.$delay}s;
  transition: height 0.3s ease;
`;

const MicrophoneCircle = styled.div<{ $status: 'listening' | 'processing' | 'speaking' | 'idle' }>`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: ${props => {
        switch (props.$status) {
            case 'listening': return 'rgba(255, 255, 255, 0.2)';
            case 'processing': return 'rgba(255, 255, 255, 0.5)'; // Static
            case 'speaking': return 'white';
            default: return 'white';
        }
    }};
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: inherit;
    z-index: -1;
    animation: ${props => props.$status === 'listening' ? css`${pulse} 2s infinite` : 'none'};
  }
`;

const ControlsContainer = styled.div`
  margin-top: 3rem;
  display: flex;
  gap: 20px;
`;

const ActionButton = styled.button`
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.2); }
`;

interface VoiceChatOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    sessionId?: string;
}

const VoiceChatOverlay: React.FC<VoiceChatOverlayProps> = ({ isOpen, onClose, userId, sessionId }) => {
    const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
    const [transcript, setTranscript] = useState<string>("");
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            startListening();
        } else {
            stopListening();
            if (audioPlayerRef.current) {
                audioPlayerRef.current.pause();
                audioPlayerRef.current = null;
            }
        }
        return () => {
            stopListening();
        };
    }, [isOpen]);

    const startListening = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await handleAudioUpload(audioBlob);
            };

            mediaRecorder.start();
            setStatus('listening');
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setStatus('idle');
        }
    };

    const stopListening = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop(); // Triggers onstop -> handleAudioUpload
        }
        // Also stop tracks
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const handleManualStop = () => {
        stopListening();
    }

    const handleAudioUpload = async (audioBlob: Blob) => {
        setStatus('processing');
        try {
            const formData = new FormData();
            formData.append('user_id', userId);
            if (sessionId) formData.append('session_id', sessionId);
            formData.append('voice_output', 'true');
            formData.append('file', audioBlob, 'recording.webm');

            // Use raw fetch or api client supporting formData
            const response = await fetch('/api/ai-chat/', {
                method: 'POST',
                body: formData,
                // Do not set Content-Type header when sending FormData, browser does it with boundary
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            setTranscript(data.response);

            if (data.audio_url) {
                playResponse(data.audio_url);
            } else {
                setStatus('idle'); // Should restart listening?
            }

        } catch (error) {
            console.error("Error uploading audio:", error);
            setStatus('idle');
        }
    };

    const playResponse = (audioUrl: string) => {
        setStatus('speaking');
        const audio = new Audio(audioUrl);
        audioPlayerRef.current = audio;
        audio.onended = () => {
            setStatus('idle');
            // Auto start listening again for continuous conversation? 
            // For now, let's wait for user to click content or just manual start
            // To mimic ChatGPT, we should auto-listen.
            // startListening(); // Uncomment for continuous mode
        };
        audio.play().catch(e => console.error("Playback error", e));
    };

    if (!isOpen) return null;

    return (
        <Overlay>
            <CloseButton onClick={onClose}>&times;</CloseButton>

            <StatusText>
                {status === 'listening' && "Listening..."}
                {status === 'processing' && "Thinking..."}
                {status === 'speaking' && "Speaking..."}
                {status === 'idle' && "Tap to Speak"}
            </StatusText>

            <MicrophoneCircle
                $status={status}
                onClick={status === 'idle' ? startListening : handleManualStop}
            >
                {status === 'speaking' ? (
                    <VisualizerContainer>
                        {[0, 0.2, 0.4, 0.2, 0].map((delay, i) => (
                            <Bar key={i} $delay={delay} $active={true} />
                        ))}
                    </VisualizerContainer>
                ) : (
                    // Simple Icon or just Circle
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 14C14.2091 14 16 12.2091 16 10V4C16 1.79086 14.2091 0 12 0C9.79086 0 8 1.79086 8 4V10C8 12.2091 9.79086 14 12 14Z" fill={status === 'listening' ? "white" : "#333"} />
                        <path d="M19 10V10.5C19 14.09 16.09 17 12.5 17C8.91 17 6 14.09 6 10.5V10" stroke={status === 'listening' ? "white" : "#333"} strokeWidth="2" strokeLinecap="round" />
                        <path d="M12 17V21" stroke={status === 'listening' ? "white" : "#333"} strokeWidth="2" strokeLinecap="round" />
                    </svg>
                )}
            </MicrophoneCircle>

            <ControlsContainer>
                {status === 'idle' && <ActionButton onClick={startListening}>Start Speaking</ActionButton>}
                {status === 'listening' && <ActionButton onClick={handleManualStop}>Stop & Send</ActionButton>}
            </ControlsContainer>

            {/* Debug/Subtitle */}
            {transcript && <div style={{ marginTop: 20, maxWidth: '80%', textAlign: 'center', opacity: 0.7 }}>{transcript}</div>}

        </Overlay>
    );
};

export default VoiceChatOverlay;
