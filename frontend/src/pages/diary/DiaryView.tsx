import { useState, useRef, useEffect } from 'react'
import { aiChatApi } from '../../services/api'

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
  mood: string
  color: string
  text: string
}

type DiaryMode = 'manual' | 'ai'

interface DiaryViewProps {
  onInteract: (e: React.MouseEvent) => void
  entries: DiaryEntry[]
  onAddEntry: (entry: {mood: string, color: string, text: string}) => void
  userId?: string
  onRefreshDiaries?: () => void
  onOpenEntryDetail: (entry: DiaryEntry) => void
}

interface ChatAIViewProps {
  onSaveToDiary: (entry: {mood: string, color: string, text: string}) => void
  embedded?: boolean
  userId?: string
  onRefreshDiaries?: () => void
}

interface ChatMessage {
  role: 'user' | 'ai'
  content: string
}

function ChatAIView({ onSaveToDiary, userId, onRefreshDiaries }: ChatAIViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', content: "Hey there! I'm here to help you reflect on your emotions. How are you feeling today?" }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Create session on mount
  useEffect(() => {
    if (userId) {
      aiChatApi.createSession(userId)
        .then(session => setSessionId(session.id))
        .catch(err => console.error('Failed to create AI session:', err))
    }
  }, [userId])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage = input
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setInput('')
    setIsLoading(true)

    try {
      // Build history for context
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [m.content]
      }))

      const response = await aiChatApi.chat({
        user_id: userId || 'anonymous',
        session_id: sessionId || undefined,
        message: userMessage,
        history
      })

      setMessages(prev => [...prev, { role: 'ai', content: response.response }])
    } catch (err) {
      console.error('Failed to get AI response:', err)
      // Fallback to simulated response
      const fallbackResponses = [
        "That's really interesting. Can you tell me more about what triggered this feeling?",
        "I hear you. It sounds like you're experiencing something important. What stands out most about this moment?",
        "Thank you for sharing that. How does this emotion feel in your body right now?",
        "I appreciate your openness. What would help you process this feeling?",
        "That makes sense. Have you experienced something similar before?"
      ]
      const aiResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
      setMessages(prev => [...prev, { role: 'ai', content: aiResponse }])
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
      // Try to generate diary from AI
      if (userId && sessionId) {
        try {
          await aiChatApi.generateDiary(sessionId, userId)
          // Backend automatically saves the diary, so refresh from backend
          if (onRefreshDiaries) {
            onRefreshDiaries()
          }
          setSaveSuccess(true)
          setTimeout(() => setSaveSuccess(false), 3000)
          return
        } catch (err) {
          console.error('Failed to generate diary:', err)
        }
      }

      // Fallback: Extract the conversation and save as a diary entry
      const conversationText = messages.map(m => `${m.role === 'user' ? 'Me' : 'AI'}: ${m.content}`).join('\n\n')
      const randomMood = MOOD_DATA[Math.floor(Math.random() * MOOD_DATA.length)]
      onSaveToDiary({
        mood: randomMood.label,
        color: randomMood.color,
        text: conversationText
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
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
          className={`px-6 py-2 rounded-full font-black text-[13px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg ${
            saveSuccess
              ? 'bg-green-500 text-white'
              : 'bg-accent text-accent-inverse'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save to Journal'}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-6 rounded-3xl ${msg.role === 'user' ? 'bg-black text-white' : 'bg-gray-100 text-gray-800'}`}>
              <p className="text-sm font-bold leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-6 rounded-3xl bg-gray-100">
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

      {/* Input */}
      <div className="p-8 border-t border-black/5">
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

export default function DiaryView({ onInteract, entries, onAddEntry, userId, onRefreshDiaries, onOpenEntryDetail }: DiaryViewProps) {
  const [mode, setMode] = useState<DiaryMode>('manual')
  const [content, setContent] = useState('')
  const [selectedMood, setSelectedMood] = useState<typeof MOOD_DATA[0] | null>(null)

  const handleSave = (e: React.MouseEvent) => {
    if (!content.trim()) return
    onAddEntry({
      mood: selectedMood?.label || 'Neutral',
      color: selectedMood?.color || '#121212',
      text: content
    })
    setContent('')
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
            AI Reflection
          </button>
        </div>
      </header>

      {mode === 'manual' ? (
        <div className="grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-10">
          <div className="bg-white p-12 rounded-[3rem] border border-black/[0.03] shadow-xl space-y-10">
            <div className="flex flex-col space-y-6">
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
              placeholder="What's your current frequency?"
              className="w-full min-h-[300px] bg-transparent border-none focus:ring-0 text-xl font-bold leading-relaxed placeholder:text-gray-200 resize-none"
            />
            <div className="flex justify-end">
              <button onClick={handleSave} className="px-12 py-4 bg-accent text-accent-inverse rounded-full font-black text-[13px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl">Secure Log</button>
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
                  <p className="text-sm font-bold line-clamp-2" style={{ color: item.mood === 'Joy' ? '#121212' : '#ffffff' }}>{item.text}</p>
                  <p className="text-[11px] font-bold mt-2 opacity-50" style={{ color: item.mood === 'Joy' ? '#121212' : '#ffffff' }}>Click to view full</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      ) : (
        <div className="h-[580px] w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-black/5">
          <ChatAIView onSaveToDiary={onAddEntry} userId={userId} onRefreshDiaries={onRefreshDiaries} embedded />
        </div>
      )}

    </div>
  )
}
