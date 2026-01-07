import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { matchApi, chatApi, createChatWebSocket, UserRoom, ChatMessage as ApiChatMessage } from '../../services/api'

// Global Mood-Color Mapping from DESIGN_SYSTEM.md
const MOOD_DATA = [
  { label: 'Bored', color: '#4B4E91', text: '#ffffff', value: 'neutral' },
  { label: 'Fear', color: '#9381BA', text: '#ffffff', value: 'anxious' },
  { label: 'Joy', color: '#F9D849', text: '#121212', value: 'happy' },
  { label: 'Sad', color: '#3266B1', text: '#ffffff', value: 'sad' },
  { label: 'Disgust', color: '#66B04C', text: '#ffffff', value: 'frustrated' },
  { label: 'Anxious', color: '#E67E22', text: '#ffffff', value: 'anxious' },
  { label: 'Angry', color: '#D32F2F', text: '#ffffff', value: 'frustrated' },
  { label: 'Awkward', color: '#D278A3', text: '#ffffff', value: 'uncertain' },
  { label: 'Envy', color: '#2BA8A4', text: '#ffffff', value: 'frustrated' },
]

interface ChatMessage {
  id: string
  role: 'user' | 'peer'
  text: string
  timestamp: number
  emotion: string
}

export interface PeerSession {
  id: string
  roomId: string
  partnerName: string
  partnerAvatar: string
  partnerId: string
  isAnonymous: boolean
  isRevealed: boolean
  lastMessage: string
  moodColor: string
  messages: ChatMessage[]
}

interface SoulSyncViewProps {
  onInteract: (e: React.MouseEvent) => void
  userId?: string
}

export default function SoulSyncView({ onInteract, userId }: SoulSyncViewProps) {
  const [isSearching, setIsSearching] = useState(false)
  const [matchedPartner, setMatchedPartner] = useState<{ roomId: string; partnerId: string; isAnonymous: boolean } | null>(null)
  const [sessions, setSessions] = useState<PeerSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [selectedMood, setSelectedMood] = useState<typeof MOOD_DATA[0]>(MOOD_DATA[2])
  const [isAnonymousMatch, setIsAnonymousMatch] = useState(true)
  const [chatInput, setChatInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load existing chat rooms on mount
  useEffect(() => {
    if (userId) {
      loadUserRooms()
    }
  }, [userId])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sessions])

  // Connect WebSocket when session changes
  useEffect(() => {
    const currentSession = sessions.find(s => s.id === currentSessionId)
    if (currentSession && userId) {
      connectWebSocket(currentSession.roomId)
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [currentSessionId, userId])

  const loadUserRooms = async () => {
    if (!userId) return
    try {
      const rooms = await chatApi.getUserRooms(userId)
      const sessionsFromRooms: PeerSession[] = rooms.map((room: UserRoom) => ({
        id: room.room_id,
        roomId: room.room_id,
        partnerName: room.other_user_name || 'Anonymous',
        partnerId: room.other_user_id,
        partnerAvatar: room.is_anonymous ? '🎭' : '👤',
        isAnonymous: room.is_anonymous,
        isRevealed: !room.is_anonymous,
        lastMessage: room.last_message || 'Start chatting...',
        moodColor: '#4B4E91',
        messages: []
      }))
      setSessions(sessionsFromRooms)
    } catch (err) {
      console.error('Failed to load rooms:', err)
    }
  }

  const loadRoomMessages = async (roomId: string) => {
    try {
      const messages = await chatApi.getRoomMessages(roomId, 50)
      const chatMessages: ChatMessage[] = messages.map((m: ApiChatMessage) => ({
        id: m.id,
        role: m.sender_id === userId ? 'user' : 'peer',
        text: m.content,
        timestamp: new Date(m.created_at).getTime(),
        emotion: m.emotion || 'Neutral'
      }))

      setSessions(prev => prev.map(s =>
        s.roomId === roomId ? { ...s, messages: chatMessages } : s
      ))
    } catch (err) {
      console.error('Failed to load messages:', err)
    }
  }

  const connectWebSocket = useCallback((roomId: string) => {
    if (wsRef.current) {
      wsRef.current.close()
    }

    const ws = createChatWebSocket(roomId)

    ws.onopen = () => {
      console.log('WebSocket connected to room:', roomId)
      // Load existing messages
      loadRoomMessages(roomId)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const newMessage: ChatMessage = {
          id: data.id || Date.now().toString(),
          role: data.sender_id === userId ? 'user' : 'peer',
          text: data.content,
          timestamp: new Date(data.created_at || Date.now()).getTime(),
          emotion: data.emotion || 'Neutral'
        }

        setSessions(prev => prev.map(s =>
          s.roomId === roomId
            ? { ...s, messages: [...s.messages, newMessage], lastMessage: data.content }
            : s
        ))
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
    }

    wsRef.current = ws
  }, [userId])

  const startMatching = async (e: React.MouseEvent) => {
    if (!userId) return
    onInteract(e)
    setIsSearching(true)
    setIsLoading(true)

    try {
      const response = await matchApi.findMatch(userId, {
        current_emotion: selectedMood.value,
        role: 'either',
        need: 'companion',
        intensity: 3,
        is_anonymous: isAnonymousMatch,
        preferred_mode: isAnonymousMatch ? 'human_anonymous' : 'human_non_anonymous'
      })

      if (response.matched && response.room_id) {
        setMatchedPartner({
          roomId: response.room_id,
          partnerId: response.matched_user_id || 'unknown',
          isAnonymous: response.is_anonymous || isAnonymousMatch
        })
      } else {
        // No match found yet, show waiting or fallback
        setTimeout(() => {
          // Simulate a match for demo purposes
          const demoRoomId = `demo_${Date.now()}`
          setMatchedPartner({
            roomId: demoRoomId,
            partnerId: 'demo_partner',
            isAnonymous: isAnonymousMatch
          })
        }, 2000)
      }
    } catch (err) {
      console.error('Match failed:', err)
      // Fallback simulation
      setTimeout(() => {
        const demoRoomId = `demo_${Date.now()}`
        setMatchedPartner({
          roomId: demoRoomId,
          partnerId: 'demo_partner',
          isAnonymous: isAnonymousMatch
        })
      }, 2000)
    } finally {
      setIsLoading(false)
    }
  }

  const cancelMatching = async () => {
    if (userId) {
      try {
        await matchApi.cancelMatch(userId)
      } catch (err) {
        console.error('Cancel match failed:', err)
      }
    }
    setIsSearching(false)
    setMatchedPartner(null)
  }

  const confirmMatch = async () => {
    if (matchedPartner && userId) {
      try {
        // Create or get the chat room
        const room = await chatApi.createRoom(userId, matchedPartner.partnerId, matchedPartner.isAnonymous)

        const newSession: PeerSession = {
          id: room.id,
          roomId: room.id,
          partnerName: matchedPartner.isAnonymous ? 'Ghost_Vibe' : 'Echo_Explorer',
          partnerId: matchedPartner.partnerId,
          partnerAvatar: matchedPartner.isAnonymous ? '🎭' : '💠',
          isAnonymous: matchedPartner.isAnonymous,
          isRevealed: !matchedPartner.isAnonymous,
          lastMessage: 'Connection established',
          moodColor: selectedMood.color,
          messages: []
        }

        setSessions(prev => [newSession, ...prev])
        setCurrentSessionId(newSession.id)
      } catch (err) {
        console.error('Failed to create room:', err)
        // Fallback to local session
        const fallbackSession: PeerSession = {
          id: matchedPartner.roomId,
          roomId: matchedPartner.roomId,
          partnerName: matchedPartner.isAnonymous ? 'Ghost_Vibe' : 'Echo_Explorer',
          partnerId: matchedPartner.partnerId,
          partnerAvatar: matchedPartner.isAnonymous ? '🎭' : '💠',
          isAnonymous: matchedPartner.isAnonymous,
          isRevealed: !matchedPartner.isAnonymous,
          lastMessage: 'Connection established',
          moodColor: selectedMood.color,
          messages: [{
            id: 'init',
            role: 'peer',
            text: 'Connection established. How are you vibrating today?',
            timestamp: Date.now(),
            emotion: selectedMood.label
          }]
        }
        setSessions(prev => [fallbackSession, ...prev])
        setCurrentSessionId(fallbackSession.id)
      }

      setMatchedPartner(null)
      setIsSearching(false)
    }
  }

  const sendPeerMessage = () => {
    if (!chatInput.trim() || !currentSessionId || !userId) return

    const currentSession = sessions.find(s => s.id === currentSessionId)
    if (!currentSession) return

    // Send via WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        sender_id: userId,
        message_type: 'text',
        content: chatInput
      }))
    } else {
      // Fallback: send via HTTP and add locally
      chatApi.sendMessage(currentSession.roomId, {
        sender_id: userId,
        message_type: 'text',
        content: chatInput
      }).catch(err => console.error('Failed to send message:', err))

      // Add message locally
      const newMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        text: chatInput,
        timestamp: Date.now(),
        emotion: detectEmotion(chatInput)
      }
      setSessions(prev => prev.map(s =>
        s.id === currentSessionId
          ? { ...s, messages: [...s.messages, newMsg], lastMessage: chatInput }
          : s
      ))
    }

    setChatInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendPeerMessage()
    }
  }

  const detectEmotion = (text: string): string => {
    const t = text.toLowerCase()
    if (t.includes('happy') || t.includes('yay') || t.includes('best') || t.includes('great')) return 'Joy'
    if (t.includes('sad') || t.includes('void') || t.includes('lonely')) return 'Sad'
    if (t.includes('angry') || t.includes('rage') || t.includes('mad')) return 'Angry'
    if (t.includes('anxious') || t.includes('stress') || t.includes('worried')) return 'Anxious'
    if (t.includes('bored') || t.includes('nothing')) return 'Bored'
    return 'Neutral'
  }

  const currentSession = sessions.find(s => s.id === currentSessionId)

  if (isSearching) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-1000">
          {!matchedPartner ? (
            <>
              <div className="relative">
                <div className="w-48 h-48 rounded-full border-4 border-accent/20 animate-ping absolute"></div>
                <div className="w-48 h-48 rounded-full border-2 border-accent/40 animate-pulse absolute delay-75"></div>
                <div className="w-48 h-48 bg-white rounded-[3rem] shadow-2xl flex items-center justify-center text-7xl z-10 relative">
                  {selectedMood.label === 'Joy' ? '😊' : selectedMood.label === 'Sad' ? '😢' : '😐'}
                </div>
              </div>
              <div className="text-center space-y-4">
                <h3 className="text-4xl font-black uppercase tracking-tighter text-white">
                  {isLoading ? 'Searching Pulse' : 'Finding Match...'}
                </h3>
                <p className="text-white/80 font-black uppercase text-[13px] tracking-[0.3em]">
                  Synchronizing frequencies in {selectedMood.label} mode
                </p>
              </div>
              <button onClick={cancelMatching} className="px-8 py-3 bg-white text-gray-800 rounded-full text-[13px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all shadow-xl">
                Cancel
              </button>
            </>
          ) : (
            <div className="bg-white p-12 rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border border-black/5 text-center space-y-8 animate-in zoom-in-95 duration-500">
              <div className="w-32 h-32 mx-auto rounded-[2.5rem] bg-gray-50 flex items-center justify-center text-6xl shadow-inner border-4 border-white" style={{ borderColor: selectedMood.color + '40' }}>
                {matchedPartner.isAnonymous ? '🎭' : '💠'}
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black uppercase tracking-tighter">
                  {matchedPartner.isAnonymous ? 'Ghost_Vibe' : 'Echo_Explorer'}
                </h3>
                <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-green-50 text-green-600 border border-green-100">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-[12px] font-black uppercase tracking-widest">Match Found!</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm font-bold max-w-xs mx-auto">
                Soul matched on your current frequency. Enter the pulse?
              </p>
              <button onClick={confirmMatch} className="w-full py-5 bg-black text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
                Connect Pulse
              </button>
            </div>
          )}
        </div>
      </div>,
      document.body
    )
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <h2 className="text-6xl font-black tracking-tighter uppercase leading-none">SoulSync</h2>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Direct emotional synchronization</p>
        </div>
      </header>

      {!currentSessionId ? (
        <div className="grid lg:grid-cols-12 gap-12">
          {/* Match Portal */}
          <div className="lg:col-span-7 bg-white p-12 rounded-[3rem] border border-black/[0.03] shadow-xl space-y-12">
            <div className="space-y-6">
              <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-300">Sync Mode</h4>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setIsAnonymousMatch(true)}
                  className={`p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center space-y-4 ${isAnonymousMatch ? 'border-indigo-500 bg-indigo-50 shadow-inner' : 'border-black/5 hover:border-black/10'}`}
                >
                  <span className="text-4xl">🎭</span>
                  <span className="text-[13px] font-black uppercase tracking-widest">Anonymous Ghost</span>
                </button>
                <button
                  onClick={() => setIsAnonymousMatch(false)}
                  className={`p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center space-y-4 ${!isAnonymousMatch ? 'border-blue-500 bg-blue-50 shadow-inner' : 'border-black/5 hover:border-black/10'}`}
                >
                  <span className="text-4xl">👤</span>
                  <span className="text-[13px] font-black uppercase tracking-widest">Public Echo</span>
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-300">Set Your Resonance</h4>
              <div className="flex flex-wrap gap-2">
                {MOOD_DATA.map(m => (
                  <button
                    key={m.label}
                    onClick={() => setSelectedMood(m)}
                    className={`inline-flex items-center space-x-2 px-5 py-3 rounded-full border transition-all active:scale-95 ${selectedMood.label === m.label ? 'border-black bg-black text-white shadow-lg' : 'border-black/5 bg-gray-50 text-gray-400 hover:border-black/10'}`}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }}></div>
                    <span className="text-[13px] font-black uppercase tracking-widest">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-8">
              <button
                onClick={startMatching}
                disabled={!userId}
                className="w-full py-6 bg-accent text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl hover:opacity-90 transition-all flex items-center justify-center space-x-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Find Echoes</span>
                <span className="text-xl">⚡</span>
              </button>
            </div>
          </div>

          {/* Sync Connections List */}
          <div className="lg:col-span-5 space-y-8">
            <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-300 px-4">Synchronized Echoes</h4>
            <div className="space-y-4">
              {sessions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 font-bold">No connections yet. Start matching!</p>
                </div>
              ) : (
                sessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => setCurrentSessionId(session.id)}
                    className="w-full p-6 bg-white rounded-[2rem] border border-black/[0.03] shadow-sm hover:shadow-xl transition-all flex items-center space-x-6 text-left group"
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner bg-gray-50 border-2 border-white group-hover:rotate-6 transition-transform" style={{ borderColor: session.moodColor + '40' }}>
                      {session.partnerAvatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <p className="text-sm font-black uppercase tracking-tight text-gray-800 truncate">@{session.partnerName}</p>
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-green-500"></span>
                      </div>
                      <p className="text-[13px] font-black uppercase text-gray-300 tracking-[0.1em] truncate">{session.lastMessage}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="h-[700px] w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-black/5 flex">
          {/* Session Sidebar */}
          <div className="w-24 bg-gray-50 border-r border-black/5 flex flex-col items-center py-8 space-y-6">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => setCurrentSessionId(s.id)}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all shadow-md ${currentSessionId === s.id ? 'bg-black text-white scale-110' : 'bg-white hover:bg-black/5'}`}
              >
                {s.partnerAvatar}
              </button>
            ))}
            <button
              onClick={() => setCurrentSessionId(null)}
              className="w-14 h-14 rounded-2xl bg-accent text-white flex items-center justify-center text-xl shadow-lg hover:scale-110 transition-transform"
            >
              +
            </button>
          </div>

          {/* Chat Window */}
          {currentSession && (
            <div className="flex-1 flex flex-col">
              <header className="p-6 border-b border-black/5 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl shadow-inner border-2 border-white" style={{ borderColor: currentSession.moodColor + '40' }}>
                    {currentSession.partnerAvatar}
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase">@{currentSession.partnerName}</h3>
                    <p className="text-[13px] font-black uppercase text-gray-300 tracking-widest">
                      {currentSession.isAnonymous ? '🎭 Ghost Mode' : '👤 Echo Pulse'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {currentSession.isAnonymous && !currentSession.isRevealed && (
                    <button className="px-5 py-2.5 bg-accent text-white rounded-full text-[12px] font-black uppercase tracking-widest hover:scale-105 shadow-xl transition-all">
                      Reveal Echo
                    </button>
                  )}
                  <button onClick={() => setCurrentSessionId(null)} className="text-gray-300 hover:text-black transition-colors font-black text-xs uppercase tracking-widest">
                    Disconnect
                  </button>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-hide">
                {currentSession.messages.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-gray-400 font-bold">Start the conversation!</p>
                  </div>
                ) : (
                  currentSession.messages.map(m => (
                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className="space-y-2 max-w-[70%]">
                        <div className={`p-5 rounded-[1.8rem] font-bold text-sm leading-relaxed shadow-lg ${m.role === 'user' ? 'bg-black text-white rounded-br-none' : 'bg-gray-50 text-gray-800 rounded-bl-none border border-black/5'}`}>
                          {m.text}
                        </div>
                        <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-black/5 text-[12px] font-black uppercase tracking-widest text-gray-400 ${m.role === 'user' ? 'float-right' : 'float-left'}`}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: MOOD_DATA.find(md => md.label === m.emotion)?.color || '#4B4E91' }}></span>
                          <span>{m.emotion}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-6 border-t border-black/5 bg-white">
                <div className="flex items-center space-x-4">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Transmit into the sync..."
                    className="flex-1 h-16 bg-gray-50 rounded-[1.5rem] px-8 border-none focus:ring-2 focus:ring-black text-sm font-bold transition-all placeholder:text-gray-300"
                  />
                  <button onClick={sendPeerMessage} disabled={!chatInput.trim()} className="w-16 h-16 bg-black text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
