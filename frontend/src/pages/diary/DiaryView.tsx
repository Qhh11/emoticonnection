import { useState, useEffect, useRef } from 'react'
import { motion, LayoutGroup } from 'framer-motion'
import { aiChatApi } from '../../services/api'
import { AVATARS_3D, Avatar3D } from '../../config/avatars'
import ModelViewer3D from '../../components/dashboard/ModelViewer3D'
import VoiceChatOverlay from '../../components/chat/VoiceChatOverlay'
import { markUserActivity } from '../../components/EmotionReportModal'
import { useGeminiLive } from '../../hooks/useGeminiLive'

// Global Mood-Color Mapping from DESIGN_SYSTEM.md
const MOOD_DATA = [
  { label: 'Bored', color: '#4B4E91', text: '#ffffff' },
  { label: 'Fear', color: '#9381BA', text: '#ffffff' },
  { label: 'Joy', color: '#F9D849', text: '#121212' },
  { label: 'Sad', color: '#3266B1', text: '#ffffff' },
  { label: 'Disgust', color: '#66B04C', text: '#ffffff' },
  { label: 'Anxious', color: '#E67E22', text: '#ffffff' },
  { label: 'Angry', color: '#D32F2F', text: '#ffffff' },
  { label: 'Awkward', color: '#D278A3', text: '#ffffff' },
  { label: 'Envy', color: '#2BA8A4', text: '#ffffff' },
]

export interface DiaryEntry {
  id?: string
  date: string
  title: string
  mood: string
  color: string
  text: string
}

type DiaryMode = 'manual' | 'ai' | 'voice'

export interface DiaryViewProps {
  onInteract: (e: React.MouseEvent) => void
  entries: DiaryEntry[]
  onAddEntry: (entry: { title: string, mood: string, color: string, text: string }) => void
  userId?: string
  onRefreshDiaries?: () => void
  onOpenEntryDetail: (entry: DiaryEntry) => void
  avatar?: Avatar3D | null
  onModeChange?: (mode: 'ai' | 'voice' | 'manual') => void
  onRewriteReady?: (fn: () => void) => void
  onOpenAssistantWithRewrite?: (text: string) => void  // Open AssistantBubble with rewrite action
  onSetContentReady?: (fn: (text: string) => void) => void  // Register setContent function with parent
}

interface ChatAIViewProps {
  embedded?: boolean
  userId?: string
  onRefreshDiaries?: () => void
  avatar?: Avatar3D | null
}

interface ChatMessage {
  role: 'user' | 'ai'
  content: string
}

// Voice status type for real-time conversation
type VoiceStatus = 'idle' | 'connecting' | 'connected'

function ChatAIView({ userId, onRefreshDiaries, avatar: initialAvatar }: ChatAIViewProps) {
  // Determine avatar and its greeting once at the start of component lifecycle
  // Default to AVATARS_3D[0] (Blushy) if no avatar is provided by parent
  const [activeAvatar, setActiveAvatar] = useState<Avatar3D>(() => initialAvatar || AVATARS_3D[0])

  // Text mode messages (separate from voice mode)
  const [textMessages, setTextMessages] = useState<ChatMessage[]>(() => [
    {
      role: 'ai',
      content: (initialAvatar || AVATARS_3D[0]).greeting
    }
  ])

  // Voice mode messages (separate from text mode)
  const [voiceMessages, setVoiceMessages] = useState<ChatMessage[]>(() => [
    {
      role: 'ai',
      content: (initialAvatar || AVATARS_3D[0]).greeting
    }
  ])

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Voice mode states
  const [chatMode, setChatMode] = useState<'text' | 'voice'>('text')
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle')
  const [transcript, setTranscript] = useState('')

  // Get current mode's messages
  const messages = chatMode === 'text' ? textMessages : voiceMessages
  const setMessages = chatMode === 'text' ? setTextMessages : setVoiceMessages

  // Gemini Live hook for real-time voice chat
  const geminiLive = useGeminiLive({
    onTranscript: (text) => {
      console.log('[ChatAIView] Gemini transcript:', text)
      setTranscript(text)
      // Add AI response to voice messages when in connected state
      if (text && voiceStatus === 'connected') {
        setVoiceMessages(prev => {
          // Update the last AI message or add new one
          const lastMsg = prev[prev.length - 1]
          if (lastMsg?.role === 'ai' && lastMsg.content !== text) {
            // Add new AI message
            return [...prev, { role: 'ai', content: text }]
          }
          return prev
        })
      }
    },
    onError: (error) => {
      console.error('[ChatAIView] Gemini Live error:', error)
      setVoiceStatus('idle')
    },
    onTurnComplete: () => {
      console.log('[ChatAIView] Gemini turn complete')
      // Don't reset to idle - stay connected for continuous conversation
    }
  })

  // Sync voice status with Gemini Live connection state
  useEffect(() => {
    if (geminiLive.status === 'connecting') {
      setVoiceStatus('connecting')
    } else if (geminiLive.status === 'connected' && geminiLive.isRecording) {
      setVoiceStatus('connected')
    } else if (geminiLive.status === 'disconnected' || geminiLive.status === 'error') {
      setVoiceStatus('idle')
    }
  }, [geminiLive.status, geminiLive.isRecording])

  // Sync with initialAvatar if it changes from parent (e.g. user selects in Gallery)
  useEffect(() => {
    if (initialAvatar && initialAvatar.id !== activeAvatar?.id) {
      setActiveAvatar(initialAvatar)
      // If conversation hasn't started, also update the greeting for both modes
      if (textMessages.length <= 1) {
        setTextMessages([{ role: 'ai', content: initialAvatar.greeting }])
      }
      if (voiceMessages.length <= 1) {
        setVoiceMessages([{ role: 'ai', content: initialAvatar.greeting }])
      }
    }
  }, [initialAvatar])

  // Update greeting when picking a different avatar via the inline switcher
  useEffect(() => {
    if (activeAvatar) {
      // Update greeting for both modes if conversation hasn't started
      if (textMessages.length <= 1) {
        setTextMessages([{ role: 'ai', content: activeAvatar.greeting }])
      }
      if (voiceMessages.length <= 1) {
        setVoiceMessages([{ role: 'ai', content: activeAvatar.greeting }])
      }
    }
  }, [activeAvatar?.id])

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  // Create session on mount
  useEffect(() => {
    if (userId) {
      aiChatApi.createSession(userId)
        .then(session => setSessionId(session.id))
        .catch(err => console.error('Failed to create AI session:', err))
    }
  }, [userId])

  // Get the latest AI message to display (used in voice mode)
  const latestAiMessage = messages.filter(m => m.role === 'ai').slice(-1)[0]?.content || ''

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage = input
    setTextMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setInput('')
    setIsLoading(true)

    try {
      // Build history for context - skip the first hardcoded welcome message
      // Only include messages after the initial greeting (index > 0)
      const history = textMessages.slice(1).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [m.content]
      }))

      const response = await aiChatApi.chat({
        user_id: userId || 'anonymous',
        session_id: sessionId || undefined,
        message: userMessage,
        history,
        avatar_id: activeAvatar?.id
      })

      setTextMessages(prev => [...prev, { role: 'ai', content: response.response }])

      // 标记用户有新活动，用于 Emotion Report 缓存失效
      if (userId) {
        markUserActivity(userId)
      }
    } catch (err) {
      console.error('Failed to get AI response:', err)
      // Show error message to user instead of fake fallback
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to AI service'
      setTextMessages(prev => [...prev, { role: 'ai', content: `⚠️ Error: ${errorMessage}. Please check if the backend server is running.` }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 检查是否在 IME 组合输入中（如中文输入法选词）
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSaveReflection = async () => {
    if (isSaving) return
    setIsSaving(true)
    setSaveSuccess(false)

    try {
      if (userId && sessionId) {
        try {
          // 调用 AI 生成日记 API - 会基于对话历史生成日记式的 summary
          await aiChatApi.generateDiary(sessionId, userId)

          // 标记用户有新活动，用于 Emotion Report 缓存失效
          markUserActivity(userId)

          if (onRefreshDiaries) {
            onRefreshDiaries()
          }
          setSaveSuccess(true)
          setTimeout(() => setSaveSuccess(false), 3000)
          return
        } catch (err) {
          console.error('Failed to generate diary:', err)
          alert('Failed to save your reflection. Please try again.')
        }
      }
    } finally {
      setIsSaving(false)
    }
  }

  // ========== Live Conversation Functions (using Gemini Live) ==========

  // Start real-time conversation - like starting a phone call
  const startLiveConversation = async () => {
    setTranscript('')
    setVoiceStatus('connecting')
    try {
      await geminiLive.startLiveConversation()
      setVoiceStatus('connected')
    } catch (error) {
      console.error('[ChatAIView] Error starting live conversation:', error)
      setVoiceStatus('idle')
    }
  }

  // End real-time conversation - like hanging up the phone
  const endLiveConversation = () => {
    geminiLive.stopLiveConversation()
    setVoiceStatus('idle')
  }

  // Switch between text and voice modes with animation
  const switchToVoiceMode = () => {
    setChatMode('voice')
    setTranscript('')
    setVoiceStatus('idle')
    // Don't auto-connect - user will tap to start conversation
  }

  const switchToTextMode = () => {
    // End any ongoing conversation
    if (voiceStatus === 'connected') {
      endLiveConversation()
    }
    setChatMode('text')
    setVoiceStatus('idle')
  }

  // VIP Immersive View - Dark background with Text/Voice mode switching
  if (activeAvatar) {
    return (
      <LayoutGroup>
        <div className="h-full flex flex-col bg-[#0a0a0a] relative overflow-hidden">
          {/* Ambient glow effect */}
          <motion.div
            className="absolute inset-0 opacity-30"
            animate={{
              background: `radial-gradient(ellipse at center, ${activeAvatar.color}40 0%, transparent 70%)`
            }}
            transition={{ duration: 0.5 }}
          />

          {/* Top bar - shared between modes */}
          <div className="relative z-10 flex items-center justify-between p-6">
            <div className="flex items-center space-x-6 overflow-hidden">
              {/* Avatar Switcher - Always visible */}
              <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide py-1">
                {AVATARS_3D.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setActiveAvatar(a)}
                    className={`flex-shrink-0 w-8 h-8 rounded-full border-2 transition-all ${activeAvatar.id === a.id ? 'border-yellow-400 scale-110 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'border-white/10 opacity-40'}`}
                  >
                    <img src={a.videoPath || ''} alt={a.name} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
              <div className="flex flex-col">
                <span className="text-white text-[12px] font-black uppercase tracking-widest">
                  {activeAvatar.name}
                </span>
                <span className="text-white/60 text-[11px] font-medium leading-relaxed">
                  {activeAvatar.description}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Mode switch button */}
              {chatMode === 'voice' && (
                <button
                  onClick={switchToTextMode}
                  className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center space-x-2"
                  title="Switch to text mode"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
                  </svg>
                  <span className="text-white text-[10px] font-black uppercase tracking-widest">Text</span>
                </button>
              )}

              <button
                onClick={handleSaveReflection}
                disabled={isSaving || textMessages.length < 2}
                className={`px-5 py-2 rounded-full font-black text-[11px] uppercase tracking-widest transition-all ${saveSuccess
                  ? 'bg-green-500 text-white'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
                  } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                {isSaving ? '...' : saveSuccess ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>

          {/* ========== TEXT MODE ========== */}
          {chatMode === 'text' && (
            <>
              {/* Fixed Avatar area with layoutId for smooth transition */}
              <div className="relative z-10 flex flex-col items-center py-2 flex-shrink-0">
                <motion.div
                  layoutId="chat-avatar"
                  className="relative w-20 h-20"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `radial-gradient(circle, ${activeAvatar.color}30 0%, transparent 70%)`,
                      transform: 'scale(1.4)'
                    }}
                  />
                  {activeAvatar.videoPath ? (
                    <img
                      src={activeAvatar.videoPath}
                      alt={activeAvatar.name}
                      className="w-full h-full object-contain"
                      style={{ filter: `drop-shadow(0 0 15px ${activeAvatar.color}60)` }}
                    />
                  ) : (
                    <ModelViewer3D
                      modelPath={activeAvatar.modelPath}
                      avatarName={activeAvatar.name}
                      avatarColor={activeAvatar.color}
                      size="small"
                      exposure={activeAvatar.exposure}
                      environmentImage={activeAvatar.environmentImage}
                      shadowIntensity={0}
                    />
                  )}
                </motion.div>
              </div>

            {/* Chat messages area - scrollable, Avatar is fixed above */}
            <div className="flex-1 overflow-y-auto px-8 py-4 space-y-4 min-h-0 relative z-10">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[75%]`}>
                    {msg.role === 'ai' && (
                      <span className="text-[9px] font-black uppercase text-white/40 mb-1 ml-3 tracking-widest">
                        {activeAvatar.name}
                      </span>
                    )}
                    <div
                      className={`p-4 rounded-2xl ${msg.role === 'user'
                        ? 'bg-white/20 text-white rounded-br-sm'
                        : 'bg-white/10 text-white/90 rounded-bl-sm'
                        }`}
                    >
                      <p className="text-sm font-bold leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="p-4 rounded-2xl bg-white/10 rounded-bl-sm">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: activeAvatar.color, animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: activeAvatar.color, animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: activeAvatar.color, animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom input area with voice button */}
            <div className="relative z-10 p-4 border-t border-white/5">
              <div className="flex items-center space-x-3 max-w-2xl mx-auto">
                {/* Text input */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Share your thoughts..."
                    className="w-full px-5 py-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/10 focus:outline-none focus:border-white/30 text-white text-sm font-bold placeholder:text-white/30"
                  />
                </div>

                {/* Voice button - switches to voice mode */}
                <button
                  onClick={switchToVoiceMode}
                  className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all hover:scale-105 active:scale-95"
                  title="Switch to voice mode"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  </svg>
                </button>

                {/* Send button */}
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${activeAvatar.color} 0%, ${activeAvatar.color}80 100%)`,
                    boxShadow: `0 0 20px ${activeAvatar.color}40`
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}

          {/* ========== VOICE MODE ========== */}
          {chatMode === 'voice' && (
            <>
              {/* Main content - Large centered avatar with layoutId */}
              <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-8">
                {/* Large Avatar with smooth transition via layoutId */}
                <motion.div
                  layoutId="chat-avatar"
                  className="relative w-48 h-48 mb-6"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  {/* Glow ring - pulses when connected (live conversation) */}
                  <motion.div
                    className={`absolute inset-0 rounded-full ${voiceStatus === 'connected' ? 'animate-pulse' : ''}`}
                    style={{
                      background: `radial-gradient(circle, ${activeAvatar.color}${voiceStatus === 'connected' ? '50' : '30'} 0%, transparent 70%)`,
                      transform: voiceStatus === 'connected' ? 'scale(1.8)' : 'scale(1.5)'
                    }}
                  />
                  {activeAvatar.videoPath ? (
                    <img
                      src={activeAvatar.videoPath}
                      alt={activeAvatar.name}
                      className="w-full h-full object-contain"
                      style={{
                        filter: `drop-shadow(0 0 ${voiceStatus === 'connected' ? '40px' : '30px'} ${activeAvatar.color}60)`
                      }}
                    />
                  ) : (
                    <ModelViewer3D
                      modelPath={activeAvatar.modelPath}
                      avatarName={activeAvatar.name}
                      avatarColor={activeAvatar.color}
                      size="large"
                      exposure={activeAvatar.exposure}
                      environmentImage={activeAvatar.environmentImage}
                      shadowIntensity={0}
                    />
                  )}
                </motion.div>

                {/* Status text */}
                <div className="text-center mb-6">
                  <p className="text-white/60 text-sm font-bold uppercase tracking-widest">
                    {voiceStatus === 'idle' && 'Tap to start conversation'}
                    {voiceStatus === 'connecting' && 'Connecting...'}
                    {voiceStatus === 'connected' && (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        Live with {activeAvatar.name}
                      </span>
                    )}
                  </p>
                </div>

                {/* Latest AI response (shown during conversation) */}
                {transcript && voiceStatus === 'connected' && (
                  <div className="w-full max-w-md text-center animate-in fade-in duration-300">
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                      {activeAvatar.name}
                    </p>
                    <p className="text-white text-base font-bold leading-relaxed">
                      {transcript}
                    </p>
                  </div>
                )}

                {/* Show last message when idle */}
                {latestAiMessage && voiceStatus === 'idle' && (
                  <div className="w-full max-w-md text-center animate-in fade-in duration-500">
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                      {activeAvatar.name}
                    </p>
                    <p className="text-white text-base font-bold leading-relaxed">
                      {latestAiMessage}
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom - Call button (Connect/Disconnect) */}
              <div className="relative z-10 p-6 pb-8 flex justify-center">
                <button
                  onClick={voiceStatus === 'connected' ? endLiveConversation : startLiveConversation}
                  disabled={voiceStatus === 'connecting'}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed border-2 bg-transparent ${
                    voiceStatus === 'connected'
                      ? 'border-red-500 hover:bg-red-500/10 scale-110'
                      : 'border-green-500 hover:bg-green-500/10 hover:scale-105 active:scale-95'
                  }`}
                >
                  {voiceStatus === 'connecting' ? (
                    // Loading spinner
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  ) : voiceStatus === 'connected' ? (
                    // Hang up icon (phone) - red color for transparent button
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="#ef4444">
                      <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
                    </svg>
                  ) : (
                    // Phone call icon (start) - green color for transparent button
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="#22c55e">
                      <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
                    </svg>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </LayoutGroup>
    )
  }

  // Non-VIP: Regular chat interface
  return (
    <div className="h-full flex flex-col">
      {/* Regular Header */}
      <div className="flex items-center justify-between p-8 border-b border-black/5">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h3 className="font-black text-sm uppercase">AI Reflection Guide</h3>
            <p className="text-[12px] font-black uppercase text-gray-300 tracking-widest">Powered by Emotional Intelligence</p>
          </div>
        </div>
        <button
          onClick={handleSaveReflection}
          disabled={isSaving}
          className={`px-6 py-2 rounded-full font-black text-[13px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg ${saveSuccess
            ? 'bg-green-500 text-white'
            : 'bg-accent text-accent-inverse'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save to Journal'}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[75%]`}>
              {msg.role === 'ai' && (
                <span className="text-[10px] font-black uppercase text-gray-400 mb-1 ml-2 tracking-widest">
                  AI Companion
                </span>
              )}
              <div
                className={`w-full p-5 rounded-2xl ${msg.role === 'user'
                  ? 'bg-black text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
              >
                <p className="text-sm font-bold leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[75%] p-5 rounded-2xl bg-gray-100">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Fixed at bottom, never shrinks */}
      <div className="flex-shrink-0 p-6 border-t border-black/5 bg-white">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share your thoughts..."
            className="flex-1 px-6 py-4 bg-gray-50 rounded-full border border-black/5 focus:outline-none focus:ring-2 focus:ring-accent text-sm font-bold placeholder:text-gray-300"
          />
          <button onClick={handleSend} disabled={!input.trim() || isLoading} className="w-12 h-12 bg-accent text-accent-inverse rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DiaryView({ onInteract, entries, onAddEntry, userId, onRefreshDiaries, onOpenEntryDetail, avatar, onModeChange, onRewriteReady, onOpenAssistantWithRewrite, onSetContentReady }: DiaryViewProps) {
  const [mode, setMode] = useState<DiaryMode>('manual')
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [selectedMood, setSelectedMood] = useState<typeof MOOD_DATA[0] | null>(null)

  // Notify parent about mode changes
  useEffect(() => {
    onModeChange?.(mode)
  }, [mode, onModeChange])

  // Handle rewrite triggered by Avatar click - notify Dashboard to open AssistantBubble
  const handleOpenRewrite = () => {
    if (!content.trim()) return
    onOpenAssistantWithRewrite?.(content)
  }

  // Register rewrite handler with parent
  useEffect(() => {
    onRewriteReady?.(handleOpenRewrite)
  }, [content, onRewriteReady, onOpenAssistantWithRewrite])

  // Register setContent function with parent for receiving rewrite results
  useEffect(() => {
    onSetContentReady?.(setContent)
  }, [onSetContentReady])

  const handleSave = (e: React.MouseEvent) => {
    if (!content.trim()) return

    // Manual mode: save with user-selected mood and color
    onAddEntry({
      title: title.trim() || `Journal - ${new Date().toLocaleDateString()}`,
      mood: selectedMood?.label || 'Neutral',
      color: selectedMood?.color || '#121212',
      text: content
    })

    setContent('')
    setTitle('')
    setSelectedMood(null)
    onInteract(e)
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <h2 className="text-6xl font-black tracking-tighter uppercase leading-none">Journal</h2>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Archive your frequency</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-full border border-black/5 shadow-sm">
          <button
            onClick={() => setMode('manual')}
            className={`px-8 py-3 rounded-full text-[13px] font-black uppercase tracking-widest transition-all ${mode === 'manual' ? 'bg-accent text-accent-inverse shadow-lg' : 'text-gray-400 hover:text-black'}`}
          >
            Manual Log
          </button>
          <button
            onClick={() => setMode('ai')}
            className={`px-8 py-3 rounded-full text-[13px] font-black uppercase tracking-widest transition-all ${mode === 'ai' ? 'bg-accent text-accent-inverse shadow-lg' : 'text-gray-400 hover:text-black'}`}
          >
            AI Chat
          </button>
          <button
            onClick={() => setMode('voice')}
            className={`px-8 py-3 rounded-full text-[13px] font-black uppercase tracking-widest transition-all ${mode === 'voice' ? 'bg-accent text-accent-inverse shadow-lg' : 'text-gray-400 hover:text-black'}`}
          >
            🎤 Voice
          </button>
        </div>
      </header>

      {mode === 'manual' ? (
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-10">
            <div className="bg-white p-12 rounded-[3rem] border border-black/[0.03] shadow-xl space-y-10">
              <div className="flex flex-col space-y-6">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your entry a title..."
                  className="w-full text-3xl font-black tracking-tight bg-transparent border-none focus:ring-0 placeholder:text-gray-100 p-0"
                />
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-black/5 flex items-center justify-center overflow-hidden">
                    <span className="text-2xl">{selectedMood ? '🎭' : '✨'}</span>
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase">Private entry</h3>
                    <p className="text-[12px] font-black uppercase text-gray-300 tracking-widest">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {MOOD_DATA.map(m => (
                    <button
                      key={m.label}
                      onClick={() => setSelectedMood(m)}
                      className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full border transition-all active:scale-95 ${selectedMood?.label === m.label ? 'border-black bg-black text-white shadow-lg' : 'border-black/5 bg-gray-50 text-gray-400 hover:border-black/10'}`}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }}></div>
                      <span className="text-[13px] font-black uppercase tracking-widest">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's your current frequency? Write anything, and I'll help you capture the essence..."
                className="w-full min-h-[300px] bg-transparent border-none focus:ring-0 text-xl font-bold leading-relaxed placeholder:text-gray-200 resize-none"
              />
              <div className="flex justify-end">
                <button onClick={handleSave} className="px-12 py-4 bg-accent text-accent-inverse rounded-full font-black text-[13px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl">Save</button>
              </div>
            </div>

          </div>
          <div className="lg:col-span-4 relative">
            <div className="bg-white p-10 rounded-[2.5rem] border border-black/[0.03] space-y-8">
              <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-300">Previous Logs</h4>
              <div className="diary-stack">
                {entries.slice(0, 5).map((item, i) => (
                  <div
                    key={i}
                    onClick={() => onOpenEntryDetail(item)}
                    className="diary-item-pullable p-8 rounded-[2rem] border border-black/[0.04] shadow-md flex flex-col justify-between cursor-pointer group hover:scale-[1.02] transition-transform mb-[-80px] last:mb-0"
                    style={{ backgroundColor: item.color }}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[12px] font-black uppercase tracking-widest opacity-60" style={{ color: item.mood === 'Joy' ? '#121212' : '#ffffff' }}>{item.date}</span>
                      <div className="text-[12px] font-black uppercase tracking-widest" style={{ color: item.mood === 'Joy' ? '#121212' : '#ffffff' }}>{item.mood}</div>
                    </div>
                    <h5 className="text-[15px] font-black uppercase tracking-tight mb-2 line-clamp-1" style={{ color: item.mood === 'Joy' ? '#121212' : '#ffffff' }}>{item.title}</h5>
                    <p className="text-sm font-bold line-clamp-2" style={{ color: item.mood === 'Joy' ? '#121212' : '#ffffff' }}>{item.text}</p>
                    <p className="text-[11px] font-bold mt-2 opacity-50" style={{ color: item.mood === 'Joy' ? '#121212' : '#ffffff' }}>Click to view full</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : mode === 'ai' ? (
        <div className="h-[700px] w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-black/5">
          <ChatAIView userId={userId} onRefreshDiaries={onRefreshDiaries} avatar={avatar} embedded />
        </div>
      ) : (
        <div className="h-[700px] w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-black/5">
          <VoiceChatOverlay
            isOpen={true}
            onClose={() => { }}
            userId={userId || 'anonymous'}
            embedded={true}
          />
        </div>
      )}

    </div>
  )
}
