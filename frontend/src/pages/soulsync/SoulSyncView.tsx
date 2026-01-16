import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { matchApi, chatApi, socialApi, createChatWebSocket, UserRoom, ChatMessage as ApiChatMessage, FollowUser, EmotionType, SupportRole, SupportNeed, TopicTag } from '../../services/api'
import { Avatar3D } from '../../config/avatars'
import ModelViewer3D from '../../components/dashboard/ModelViewer3D'

// Global Mood-Color Mapping from DESIGN_SYSTEM.md
const MOOD_DATA: { label: string; color: string; text: string; value: EmotionType }[] = [
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

// Role data for V2 matching
const ROLE_DATA: { value: SupportRole; label: string; description: string; emoji: string }[] = [
  { value: 'seeker', label: 'Seeker', description: 'I need support', emoji: '🙋' },
  { value: 'supporter', label: 'Supporter', description: 'I can help', emoji: '🤗' },
  { value: 'either', label: 'Either', description: 'Both is fine', emoji: '💬' },
]

// Support need data for V2 matching
const NEED_DATA: { value: SupportNeed; label: string; description: string; emoji: string }[] = [
  { value: 'vent', label: 'Vent', description: 'Just need to talk', emoji: '💭' },
  { value: 'advice', label: 'Advice', description: 'Want suggestions', emoji: '💡' },
  { value: 'companion', label: 'Companion', description: 'Just want company', emoji: '🫂' },
  { value: 'distraction', label: 'Distraction', description: 'Take my mind off', emoji: '🎮' },
]

// Topic data for V2 matching
const TOPIC_DATA: { value: TopicTag; label: string; emoji: string }[] = [
  { value: 'general', label: 'General', emoji: '💬' },
  { value: 'relationships', label: 'Relationships', emoji: '💑' },
  { value: 'anxiety', label: 'Anxiety', emoji: '😰' },
  { value: 'depression', label: 'Depression', emoji: '😞' },
  { value: 'work_stress', label: 'Work', emoji: '💼' },
  { value: 'academic', label: 'Academic', emoji: '📚' },
  { value: 'family', label: 'Family', emoji: '👨‍👩‍👧' },
  { value: 'loneliness', label: 'Loneliness', emoji: '🏠' },
  { value: 'self_esteem', label: 'Self Esteem', emoji: '🪞' },
]


interface ChatMessage {
  id: string
  role: 'user' | 'peer'
  text: string
  timestamp: number
  emotion: string
  emotion_color: string
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
  onViewProfile?: (userId: string) => void
  avatar?: Avatar3D | null
  userLevel?: number
  showEmotionAnalysis?: boolean       // Controlled from parent (via Avatar click)
  onCloseEmotionAnalysis?: () => void // Close callback
  onSessionChange?: (hasSession: boolean) => void // Notify parent when in/out of chat
}

// Removed unused VIP_REQUIRED_LEVEL

export default function SoulSyncView({ onInteract, userId, onViewProfile, avatar, showEmotionAnalysis: propShowAnalysis, onCloseEmotionAnalysis, onSessionChange }: SoulSyncViewProps) {
  const [isSearching, setIsSearching] = useState(false)
  const [matchedPartner, setMatchedPartner] = useState<{ roomId: string; partnerId: string; isAnonymous: boolean; matchScore?: number; matchReason?: string } | null>(null)
  const [sessions, setSessions] = useState<PeerSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [selectedMood, setSelectedMood] = useState<typeof MOOD_DATA[0]>(MOOD_DATA[2])
  const [isAnonymousMatch, setIsAnonymousMatch] = useState(true)
  const [chatInput, setChatInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const pollTimerRef = useRef<number | null>(null)

  // V2 Matching preferences
  const [selectedRole, setSelectedRole] = useState<SupportRole>('either')
  const [selectedNeed, setSelectedNeed] = useState<SupportNeed>('companion')
  const [selectedTopic, setSelectedTopic] = useState<TopicTag>('general')
  const [selectedIntensity, setSelectedIntensity] = useState(3)

  // Queue status
  const [queuePosition, setQueuePosition] = useState<number | null>(null)
  const [estimatedWait, setEstimatedWait] = useState<string | null>(null)
  const [safetyTips, setSafetyTips] = useState<string[]>([])

  // VIP Emotion Analysis state - controlled by prop or internal state
  const [internalShowAnalysis, setInternalShowAnalysis] = useState(false)
  const showEmotionAnalysis = propShowAnalysis ?? internalShowAnalysis
  const closeEmotionAnalysis = () => {
    setInternalShowAnalysis(false)
    onCloseEmotionAnalysis?.()
  }

  // Mutual friends (互相关注的好友)
  const [mutualFriends, setMutualFriends] = useState<FollowUser[]>([])
  const [isLoadingFriends, setIsLoadingFriends] = useState(false)

  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load existing chat rooms and mutual friends on mount
  useEffect(() => {
    if (userId) {
      loadUserRooms()
      loadMutualFriends()
    }
  }, [userId])

  // Load mutual friends (互相关注的好友)
  const loadMutualFriends = async () => {
    if (!userId) return
    setIsLoadingFriends(true)
    try {
      const following = await socialApi.getFollowing(userId)
      // Filter to only mutual friends
      const mutuals = following.filter(user => user.is_mutual)
      setMutualFriends(mutuals)
    } catch (err) {
      console.error('Failed to load mutual friends:', err)
    } finally {
      setIsLoadingFriends(false)
    }
  }

  useEffect(() => {
    if (!isSearching) {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
      return
    }

    ; (async () => {
      try {
        const status = await matchApi.getStatus()
        if (status.matched && status.room_id) {
          setMatchedPartner({
            roomId: status.room_id,
            partnerId: status.matched_user_id || 'unknown',
            isAnonymous: status.is_anonymous ?? isAnonymousMatch,
            matchScore: status.match_score,
            matchReason: status.match_reason
          })
          setIsSearching(false)
          return
        }

        if (status.in_queue) {
          setQueuePosition(status.queue_position || null)
          setEstimatedWait(status.estimated_wait || null)
        }
      } catch (e) {
        console.error('Initial status check failed:', e)
      }
    })()

    pollTimerRef.current = window.setInterval(async () => {
      try {
        const status = await matchApi.getStatus()
        if (status.matched && status.room_id) {
          setMatchedPartner({
            roomId: status.room_id,
            partnerId: status.matched_user_id || 'unknown',
            isAnonymous: status.is_anonymous ?? isAnonymousMatch,
            matchScore: status.match_score,
            matchReason: status.match_reason
          })
          setIsSearching(false) // 会触发 cleanup 停止轮询
        } else if (status.in_queue) {
          setQueuePosition(status.queue_position || null)
          setEstimatedWait(status.estimated_wait || null)
        }
      } catch (e) {
        console.error('Status polling failed:', e)
      }
    }, 1500)

    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [isSearching, isAnonymousMatch])

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

  // Notify parent when session state changes (for VIP hint display)
  useEffect(() => {
    onSessionChange?.(!!currentSessionId)
  }, [currentSessionId, onSessionChange])

  const loadUserRooms = async () => {
    if (!userId) return
    try {
      const rooms = await chatApi.getUserRooms(userId)
      const sessionsFromRooms: PeerSession[] = rooms.map((room: UserRoom) => ({
        id: room.room_id,
        roomId: room.room_id,
        // For non-anonymous chats, show actual username; for anonymous, show "Anonymous"
        partnerName: room.is_anonymous ? 'Anonymous' : (room.other_user_name || 'User'),
        partnerId: room.other_user_id,
        // Use actual avatar for friends, mask for anonymous
        partnerAvatar: room.is_anonymous ? '🎭' : (room.other_user_avatar || '👤'),
        isAnonymous: room.is_anonymous,
        isRevealed: !room.is_anonymous,
        lastMessage: room.last_message || 'Start chatting...',
        moodColor: room.is_anonymous ? '#9381BA' : '#4B4E91', // Purple for anonymous, blue for friend
        messages: []
      }))
      setSessions(sessionsFromRooms)
    } catch (err) {
      console.error('Failed to load rooms:', err)
    }
  }

  // Start or open chat with a friend
  const startChatWithFriend = async (friend: FollowUser) => {
    if (!userId) return

    // Check if we already have a chat room with this friend
    const existingSession = sessions.find(s => s.partnerId === friend.id)
    if (existingSession) {
      // Open existing chat
      setCurrentSessionId(existingSession.id)
      return
    }

    // Create new chat room (non-anonymous since it's a friend)
    try {
      const room = await chatApi.createRoom(userId, friend.id, false)

      // Add new session with friend's actual avatar
      const newSession: PeerSession = {
        id: room.id,
        roomId: room.id,
        partnerName: friend.nickname || friend.username,
        partnerId: friend.id,
        partnerAvatar: friend.avatar || '👤',  // Use friend's avatar
        isAnonymous: false,
        isRevealed: true,
        lastMessage: 'Start chatting...',
        moodColor: '#4B4E91',
        messages: []
      }

      setSessions(prev => [newSession, ...prev])
      setCurrentSessionId(newSession.id)
    } catch (err) {
      console.error('Failed to create chat room:', err)
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
        emotion: m.emotion || 'Neutral',
        emotion_color: m.emotion_color || '#4B4E91'
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

        if (data.type === 'peer_disconnected') {
          const sysMsg: ChatMessage = {
            id: `sys-${Date.now()}`,
            role: 'peer',
            text: '⚠️ The other user disconnected.',
            timestamp: Date.now(),
            emotion: 'Neutral',
            emotion_color: '#808080'
          }
          setSessions(prev => prev.map(s =>
            s.roomId === roomId ? { ...s, messages: [...s.messages, sysMsg] } : s
          ))
          return
        }

        const newMessage: ChatMessage = {
          id: data.id || Date.now().toString(),
          role: data.sender_id === userId ? 'user' : 'peer',
          text: data.content,
          timestamp: new Date(data.created_at || Date.now()).getTime(),
          emotion: data.emotion || 'Neutral',
          emotion_color: data.emotion_color || '#4B4E91'
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
    console.log('[debug] userId prop =', userId)
    console.log('[debug] token prefix =', (localStorage.getItem('access_token') || '').slice(0, 16))

    onInteract(e)
    setIsSearching(true)
    setIsLoading(true)
    setSafetyTips([])
    setQueuePosition(null)
    setEstimatedWait(null)

    try {
      const response = await matchApi.findMatch({
        current_emotion: selectedMood.value,
        emotion_intensity: selectedIntensity,
        role: selectedRole,
        support_need: selectedNeed,
        topic: selectedTopic,
        mode: isAnonymousMatch ? 'human_anonymous' : 'human_non_anonymous',
        risk_level: 'safe'
      })

      if (response.matched && response.room_id) {
        setMatchedPartner({
          roomId: response.room_id,
          partnerId: response.matched_user_id || 'unknown',
          isAnonymous: response.is_anonymous,
          matchScore: response.match_score,
          matchReason: response.match_reason
        })
      } else {
        // Not matched yet, show queue status
        if (response.queue_position) {
          setQueuePosition(response.queue_position)
        }
        if (response.estimated_wait) {
          setEstimatedWait(response.estimated_wait)
        }
        if (response.safety_tips) {
          setSafetyTips(response.safety_tips)
        }

      }
    } catch (err) {
      console.error('Match failed:', err)
      // Show error state, keep user in queue view
      setQueuePosition(1)
      setEstimatedWait('Waiting for other users...')
    } finally {
      setIsLoading(false)
    }
  }


  const cancelMatching = async () => {
    try {
      await matchApi.cancelMatch()
    } catch (err) {
      console.error('Cancel match failed:', err)
    }
    setIsSearching(false)
    setMatchedPartner(null)
    setQueuePosition(null)
    setEstimatedWait(null)
    setSafetyTips([])
  }

  const confirmMatch = async () => {
    if (!matchedPartner || !userId) return

    const roomId = matchedPartner.roomId

    const existing = sessions.find(s => s.roomId === roomId)
    if (existing) {
      setCurrentSessionId(existing.id)
      setMatchedPartner(null)
      setIsSearching(false)
      return
    }

    const newSession: PeerSession = {
      id: roomId,
      roomId,
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
    setMatchedPartner(null)
    setIsSearching(false)
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

      // Add message locally (only for HTTP fallback)
      const emotion = detectEmotion(chatInput)
      const newMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        text: chatInput,
        timestamp: Date.now(),
        emotion: emotion,
        emotion_color: getEmotionColor(emotion)
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

  const getEmotionColor = (emotion: string): string => {
    if (!emotion) return '#808080'
    const e = emotion.toLowerCase()
    // 情绪名称映射到 MOOD_DATA 的 label
    const emotionToLabel: Record<string, string> = {
      'joy': 'Joy', 'happy': 'Joy',
      'sad': 'Sad', 'sadness': 'Sad',
      'angry': 'Angry', 'anger': 'Angry',
      'anxious': 'Anxious', 'anxiety': 'Anxious',
      'bored': 'Bored',
      'fear': 'Fear',
      'disgust': 'Disgust',
      'awkward': 'Awkward', 'embarrassment': 'Awkward',
      'envy': 'Envy',
      'neutral': 'Bored' // 默认用 Bored 的颜色
    }
    const label = emotionToLabel[e]
    const mood = MOOD_DATA.find(m => m.label === label)
    return mood?.color || '#808080'
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
                  {isLoading ? 'Searching Pulse' : 'In Queue...'}
                </h3>
                <p className="text-white/80 font-black uppercase text-[13px] tracking-[0.3em]">
                  {selectedRole === 'seeker' ? '🙋 Seeking Support' : selectedRole === 'supporter' ? '🤗 Ready to Help' : '💬 Open to Both'} • {selectedMood.label}
                </p>
                {/* Queue Status Info */}
                {(queuePosition || estimatedWait) && (
                  <div className="mt-4 space-y-2">
                    {queuePosition && (
                      <p className="text-white/60 text-sm font-bold">
                        Queue Position: #{queuePosition}
                      </p>
                    )}
                    {estimatedWait && (
                      <p className="text-white/60 text-sm font-bold">
                        Estimated Wait: {estimatedWait}
                      </p>
                    )}
                  </div>
                )}
                {/* Safety Tips */}
                {safetyTips.length > 0 && (
                  <div className="mt-6 p-4 bg-white/10 rounded-2xl text-left max-w-md">
                    <p className="text-white/80 text-xs font-black uppercase tracking-widest mb-2">Safety Tips</p>
                    {safetyTips.map((tip, i) => (
                      <p key={i} className="text-white/70 text-sm mb-1">• {tip}</p>
                    ))}
                  </div>
                )}
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
              {/* Match Score & Reason */}
              {(matchedPartner.matchScore || matchedPartner.matchReason) && (
                <div className="flex justify-center gap-4">
                  {matchedPartner.matchScore && (
                    <div className="px-4 py-2 bg-accent/10 rounded-xl">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Compatibility</p>
                      <p className="text-xl font-black text-accent">{Math.round(matchedPartner.matchScore * 10)}%</p>
                    </div>
                  )}
                  {matchedPartner.matchReason && (
                    <div className="px-4 py-2 bg-gray-50 rounded-xl">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Match Type</p>
                      <p className="text-sm font-black text-gray-600">{matchedPartner.matchReason.replace(/_/g, ' ')}</p>
                    </div>
                  )}
                </div>
              )}
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
            <div className="space-y-3">
              <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-300">Sync Mode</h4>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsAnonymousMatch(true)}
                  className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-center space-x-2 ${isAnonymousMatch ? 'border-indigo-500 bg-indigo-50 shadow-inner' : 'border-black/5 hover:border-black/10'}`}
                >
                  <span className="text-xl">🎭</span>
                  <span className="text-[11px] font-black uppercase tracking-widest">Anonymous</span>
                </button>
                <button
                  onClick={() => setIsAnonymousMatch(false)}
                  className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-center space-x-2 ${!isAnonymousMatch ? 'border-blue-500 bg-blue-50 shadow-inner' : 'border-black/5 hover:border-black/10'}`}
                >
                  <span className="text-xl">👤</span>
                  <span className="text-[11px] font-black uppercase tracking-widest">Public</span>
                </button>
              </div>
            </div>

            {/* Role Selector */}
            <div className="space-y-4">
              <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-300">Your Role</h4>
              <div className="grid grid-cols-3 gap-3">
                {ROLE_DATA.map(r => (
                  <button
                    key={r.value}
                    onClick={() => setSelectedRole(r.value)}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center space-y-2 ${selectedRole === r.value ? 'border-accent bg-accent/5 shadow-inner' : 'border-black/5 hover:border-black/10'}`}
                  >
                    <span className="text-2xl">{r.emoji}</span>
                    <span className="text-[11px] font-black uppercase tracking-widest">{r.label}</span>
                    <span className="text-[9px] text-gray-400 font-bold">{r.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Support Need Selector */}
            <div className="space-y-4">
              <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-300">What Do You Need?</h4>
              <div className="flex flex-wrap gap-2">
                {NEED_DATA.map(n => (
                  <button
                    key={n.value}
                    onClick={() => setSelectedNeed(n.value)}
                    className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-full border transition-all active:scale-95 ${selectedNeed === n.value ? 'border-accent bg-accent text-white shadow-lg' : 'border-black/5 bg-gray-50 text-gray-500 hover:border-black/10'}`}
                  >
                    <span>{n.emoji}</span>
                    <span className="text-[12px] font-black uppercase tracking-widest">{n.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Emotion/Resonance Selector */}
            <div className="space-y-4">
              <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-300">Set Your Resonance</h4>
              <div className="flex flex-wrap gap-2">
                {MOOD_DATA.map(m => (
                  <button
                    key={m.label}
                    onClick={() => setSelectedMood(m)}
                    className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-full border transition-all active:scale-95 ${selectedMood.label === m.label ? 'border-accent bg-accent text-white shadow-lg' : 'border-black/5 bg-gray-50 text-gray-400 hover:border-black/10'}`}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedMood.label === m.label ? '#ffffff' : m.color }}></div>
                    <span className="text-[12px] font-black uppercase tracking-widest">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Intensity Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-300">Intensity</h4>
                <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                  {selectedIntensity === 1 ? 'Very Low' : selectedIntensity === 2 ? 'Low' : selectedIntensity === 3 ? 'Moderate' : selectedIntensity === 4 ? 'High' : 'Very High'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map(level => (
                  <button
                    key={level}
                    onClick={() => setSelectedIntensity(level)}
                    className={`flex-1 h-10 rounded-xl transition-all ${selectedIntensity >= level ? 'bg-accent shadow-inner' : 'bg-gray-100 hover:bg-gray-200'}`}
                    style={{ opacity: selectedIntensity >= level ? 0.4 + (level * 0.15) : 1 }}
                  />
                ))}
              </div>
            </div>

            {/* Topic Selector */}
            <div className="space-y-4">
              <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-300">Topic (Optional)</h4>
              <div className="flex flex-wrap gap-2">
                {TOPIC_DATA.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setSelectedTopic(t.value)}
                    className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-full border transition-all active:scale-95 text-[11px] ${selectedTopic === t.value ? 'border-accent bg-accent/10 text-accent shadow-sm' : 'border-black/5 bg-gray-50 text-gray-400 hover:border-black/10'}`}
                  >
                    <span>{t.emoji}</span>
                    <span className="font-black uppercase tracking-wider">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={startMatching}
                disabled={!userId}
                className="w-full py-5 bg-accent text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl hover:opacity-90 transition-all flex items-center justify-center space-x-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Find Echoes</span>
                <span className="text-xl">⚡</span>
              </button>
            </div>
          </div>

          {/* Right Column: Friends + Connections */}
          <div className="lg:col-span-5 space-y-8">
            {/* Mutual Friends Section */}
            <div className="bg-white p-6 rounded-[2rem] border border-black/[0.03] shadow-sm">
              <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-300 mb-4">Friends Online</h4>
              {isLoadingFriends ? (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-gray-200 border-t-accent rounded-full animate-spin"></div>
                </div>
              ) : mutualFriends.length === 0 ? (
                <p className="text-gray-400 text-sm font-bold text-center py-4">
                  No mutual friends yet. Follow someone who follows you back!
                </p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {mutualFriends.map(friend => (
                    <button
                      key={friend.id}
                      onClick={() => startChatWithFriend(friend)}
                      className="group flex flex-col items-center space-y-2 p-3 rounded-2xl hover:bg-gray-50 transition-all"
                      title={`Chat with @${friend.username}`}
                    >
                      <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center text-2xl shadow-sm border-2 border-white group-hover:scale-110 transition-transform">
                          {friend.avatar || '👤'}
                        </div>
                        {/* Online indicator */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 truncate max-w-[60px]">
                        {friend.nickname || friend.username}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sync Connections List */}
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
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner border-2 border-white group-hover:rotate-6 transition-transform ${session.isAnonymous ? 'bg-purple-50' : 'bg-blue-50'}`}
                      style={{ borderColor: session.moodColor + '40' }}
                    >
                      {session.partnerAvatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-black uppercase tracking-tight text-gray-800 truncate">
                            {session.isAnonymous ? '🎭 Anonymous' : `@${session.partnerName}`}
                          </p>
                          {!session.isAnonymous && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[9px] font-black uppercase rounded-full">
                              Friend
                            </span>
                          )}
                        </div>
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
                title={s.isAnonymous ? 'Anonymous Chat' : `@${s.partnerName}`}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all shadow-md relative ${currentSessionId === s.id ? 'bg-black text-white scale-110' : s.isAnonymous ? 'bg-purple-100 hover:bg-purple-200' : 'bg-blue-100 hover:bg-blue-200'}`}
              >
                {s.partnerAvatar}
                {/* Friend badge indicator */}
                {!s.isAnonymous && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-[8px] text-white">✓</span>
                  </span>
                )}
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
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-3xl shadow-inner border-2 border-white ${currentSession.isAnonymous ? 'bg-purple-50' : 'bg-blue-50'} ${!currentSession.isAnonymous ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
                    style={{ borderColor: currentSession.moodColor + '40' }}
                    onClick={() => !currentSession.isAnonymous && onViewProfile?.(currentSession.partnerId)}
                  >
                    {currentSession.partnerAvatar}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3
                        className={`font-black text-sm uppercase ${!currentSession.isAnonymous ? 'cursor-pointer hover:underline' : ''}`}
                        onClick={() => !currentSession.isAnonymous && onViewProfile?.(currentSession.partnerId)}
                      >
                        {currentSession.isAnonymous ? 'Anonymous' : `@${currentSession.partnerName}`}
                      </h3>
                      {!currentSession.isAnonymous && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[9px] font-black uppercase rounded-full">
                          Friend
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] font-black uppercase text-gray-300 tracking-widest">
                      {currentSession.isAnonymous ? '🎭 Ghost Mode' : '👤 Friend Chat'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {/* VIP Emotion Analysis is now triggered by clicking the floating Avatar */}
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
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getEmotionColor(m.emotion) }}></span>
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

      {/* VIP Emotion Analysis Modal */}
      {showEmotionAnalysis && avatar && currentSession && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => closeEmotionAnalysis()}
        >
          <div
            className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Header with Avatar */}
            <div
              className="p-6 flex items-center justify-between"
              style={{ background: `linear-gradient(135deg, ${avatar.color}20 0%, ${avatar.color}05 100%)` }}
            >
              <div className="flex items-center space-x-4">
                <div
                  className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center"
                  style={{ background: `${avatar.color}30` }}
                >
                  <ModelViewer3D
                    modelPath={avatar.modelPath}
                    avatarName={avatar.name}
                    avatarColor={avatar.color}
                    size="small"
                    exposure={avatar.exposure}
                    environmentImage={avatar.environmentImage}
                    shadowIntensity={0}
                  />
                </div>
                <div>
                  <h3 className="font-black text-lg uppercase" style={{ color: avatar.color }}>{avatar.name}'s Analysis</h3>
                  <p className="text-[11px] font-black uppercase text-gray-400 tracking-widest">VIP Emotion Insights</p>
                </div>
              </div>
              <button
                onClick={() => closeEmotionAnalysis()}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Analysis Content */}
            <div className="p-6 space-y-6">
              {/* Analyzed Messages Count */}
              <div className="text-center p-4 bg-gray-50 rounded-2xl">
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1">
                  Based on recent messages
                </p>
                <p className="text-2xl font-black">
                  {Math.min(currentSession.messages.length, 20)} / 20
                </p>
              </div>

              {/* Coming Soon Notice */}
              <div className="text-center py-8 space-y-4">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 flex items-center justify-center shadow-xl">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-black uppercase tracking-tight">Coming Soon</h4>
                  <p className="text-gray-400 font-bold text-sm mt-2">
                    Advanced context-aware emotion analysis is being developed.
                  </p>
                </div>

                {/* Preview of what's coming */}
                <div className="mt-6 space-y-3 text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 text-center">
                    What to expect
                  </p>
                  <div className="grid gap-2">
                    {[
                      { icon: '📊', text: 'Overall mood trajectory' },
                      { icon: '🎯', text: 'Key emotions detected' },
                      { icon: '💡', text: 'Suggested responses' },
                      { icon: '🔍', text: 'Conversation insights' }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-sm font-bold text-gray-600">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => closeEmotionAnalysis()}
                className="w-full py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
