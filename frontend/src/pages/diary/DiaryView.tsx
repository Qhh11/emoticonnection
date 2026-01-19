import { useState, useEffect, useRef } from 'react'
import { aiChatApi } from '../../services/api'
import { AVATARS_3D, Avatar3D } from '../../config/avatars'
import ModelViewer3D from '../../components/dashboard/ModelViewer3D'
import VoiceChatOverlay from '../../components/chat/VoiceChatOverlay'
import { markUserActivity } from '../../components/EmotionReportModal'

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
  onAISaveEntry?: (content: string) => void
  avatar?: Avatar3D | null
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

function ChatAIView({ userId, onRefreshDiaries, avatar: initialAvatar }: ChatAIViewProps) {
  // Determine avatar and its greeting once at the start of component lifecycle
  // Default to AVATARS_3D[0] (Blushy) if no avatar is provided by parent
  const [activeAvatar, setActiveAvatar] = useState<Avatar3D>(() => initialAvatar || AVATARS_3D[0])
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
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

  // Sync with initialAvatar if it changes from parent (e.g. user selects in Gallery)
  useEffect(() => {
    if (initialAvatar && initialAvatar.id !== activeAvatar?.id) {
      setActiveAvatar(initialAvatar)
      // If conversation hasn't started, also update the greeting
      if (messages.length <= 1) {
        setMessages([{ role: 'ai', content: initialAvatar.greeting }])
      }
    }
  }, [initialAvatar])

  // Update greeting when picking a different avatar via the inline switcher
  useEffect(() => {
    if (messages.length <= 1 && activeAvatar) {
      setMessages([{ role: 'ai', content: activeAvatar.greeting }])
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

  // Get the latest AI message to display
  const latestAiMessage = messages.filter(m => m.role === 'ai').slice(-1)[0]?.content || ''
  const latestUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || ''

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage = input
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setInput('')
    setIsLoading(true)

    try {
      // Build history for context - skip the first hardcoded welcome message
      // Only include messages after the initial greeting (index > 0)
      const history = messages.slice(1).map(m => ({
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

      setMessages(prev => [...prev, { role: 'ai', content: response.response }])

      // 标记用户有新活动，用于 Emotion Report 缓存失效
      if (userId) {
        markUserActivity(userId)
      }
    } catch (err) {
      console.error('Failed to get AI response:', err)
      // Show error message to user instead of fake fallback
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to AI service'
      setMessages(prev => [...prev, { role: 'ai', content: `⚠️ Error: ${errorMessage}. Please check if the backend server is running.` }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
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

  // VIP Immersive View - Dark background with centered 3D Avatar
  if (activeAvatar) {
    return (
      <div className="h-full flex flex-col bg-[#0a0a0a] relative overflow-hidden">
        {/* Ambient glow effect */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(ellipse at center, ${activeAvatar.color}40 0%, transparent 70%)`
          }}
        />

        {/* Top bar with save button and Avatar Switcher */}
        <div className="relative z-10 flex items-center justify-between p-6">
          <div className="flex items-center space-x-4 overflow-hidden">
            {messages.length <= 1 ? (
              <div className="flex items-center space-x-6">
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
            ) : (
              <div className="flex flex-col">
                <div className="flex items-center space-x-3">
                  <span className="px-3 py-1.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                    VIP
                  </span>
                  <span className="text-white text-[12px] font-black uppercase tracking-widest">
                    {activeAvatar.name}
                  </span>
                </div>
                <span className="text-white/50 text-[11px] font-medium mt-1 leading-relaxed">
                  {activeAvatar.description}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleSaveReflection}
            disabled={isSaving || messages.length < 2}
            className={`px-5 py-2 rounded-full font-black text-[11px] uppercase tracking-widest transition-all ${saveSuccess
              ? 'bg-green-500 text-white'
              : 'bg-white/10 text-white/80 hover:bg-white/20'
              } disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            {isSaving ? '...' : saveSuccess ? 'Saved!' : 'Save'}
          </button>
        </div>

        {/* Main content area with Avatar */}
        <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-8">
          {/* Avatar Video - Large centered display */}
          <div className="relative w-48 h-48 mb-8">
            {/* Glow ring */}
            <div
              className="absolute inset-0 rounded-full animate-pulse"
              style={{
                background: `radial-gradient(circle, ${activeAvatar.color}30 0%, transparent 70%)`,
                transform: 'scale(1.5)'
              }}
            />
            {activeAvatar.videoPath ? (
              <img
                src={activeAvatar.videoPath}
                alt={activeAvatar.name}
                className="w-full h-full object-contain"
                style={{
                  filter: `drop-shadow(0 0 30px ${activeAvatar.color}60)`
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
          </div>

          {/* Message display area */}
          <div className="w-full max-w-md text-center space-y-4">
            {/* AI Response */}
            <div className="min-h-[80px]">
              {isLoading ? (
                <div className="flex justify-center space-x-2">
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: activeAvatar.color, animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: activeAvatar.color, animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: activeAvatar.color, animationDelay: '300ms' }}></div>
                </div>
              ) : (
                <div className="space-y-2 animate-in fade-in duration-500">
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">
                    {activeAvatar.name}
                  </p>
                  <p className="text-white text-lg font-bold leading-relaxed">
                    {latestAiMessage}
                  </p>
                </div>
              )}
            </div>

            {/* User's last message (if any) */}
            {latestUserMessage && (
              <p className="text-white/40 text-sm font-bold">
                You: "{latestUserMessage}"
              </p>
            )}
          </div>
        </div>

        {/* Bottom input area */}
        <div className="relative z-10 p-6 pb-8">
          <div className="flex items-center justify-center space-x-4 max-w-md mx-auto">


            {/* Text input button - opens input */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Share your thoughts..."
                className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm rounded-full border border-white/10 focus:outline-none focus:border-white/30 text-white text-sm font-bold placeholder:text-white/30"
              />
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${activeAvatar.color} 0%, ${activeAvatar.color}80 100%)`,
                boxShadow: `0 0 30px ${activeAvatar.color}40`
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
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

export default function DiaryView({ onInteract, entries, onAddEntry, onAISaveEntry, userId, onRefreshDiaries, onOpenEntryDetail, avatar }: DiaryViewProps) {
  const [mode, setMode] = useState<DiaryMode>('manual')
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [selectedMood, setSelectedMood] = useState<typeof MOOD_DATA[0] | null>(null)

  const handleSave = (e: React.MouseEvent) => {
    if (!content.trim()) return

    if (onAISaveEntry) {
      // Use AI to process and save
      onAISaveEntry(content)
    } else {
      // Manual save fallback
      onAddEntry({
        title: title.trim() || `Journal - ${new Date().toLocaleDateString()}`,
        mood: selectedMood?.label || 'Neutral',
        color: selectedMood?.color || '#121212',
        text: content
      })
    }

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
                <button onClick={handleSave} className="px-12 py-4 bg-accent text-accent-inverse rounded-full font-black text-[13px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl">Process with AI & Log</button>
              </div>
            </div>
          </div>
          <div className="lg:col-span-4">
            <div className="bg-white p-10 rounded-[2.5rem] border border-black/[0.03] space-y-8">
              <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-300">Previous Logs</h4>
              <div className="diary-stack">
                {entries.map((item, i) => (
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
