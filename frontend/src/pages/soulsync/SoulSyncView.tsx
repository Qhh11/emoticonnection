import { useState, useEffect, useRef, useCallback } from 'react'
import {
  chatApi,
  socialApi,
  userApi,
  createChatWebSocket,
  UserRoom,
  ChatMessage as ApiChatMessage,
  FollowUser,
} from '../../services/api'
import { Avatar3D } from '../../config/avatars'
import EmotionGradientBar from '../../components/chat/EmotionGradientBar'
import { getAvatarUrl } from '../../config/userAvatars'
import OnlineIndicator from './components/OnlineIndicator'
import MeshGradientButton from './components/MeshGradientButton'
import MatchingModal, { MatchResult } from './components/MatchingModal'

// Extended FollowUser with online status
interface FriendWithOnlineStatus extends FollowUser {
  isOnline: boolean
  lastMessageTime?: number
}

interface EmotionAnalysis {
  primary_emotion: string
  primary_percentage: number
  primary_color: string
  secondary_emotion: string
  secondary_percentage: number
  secondary_color: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'peer'
  text: string
  timestamp: number
  emotion: string
  emotion_color: string
  emotionAnalysis?: EmotionAnalysis
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
  lastMessageTime?: number
  moodColor: string
  messages: ChatMessage[]
  isOnline?: boolean
}

interface SoulSyncViewProps {
  onInteract: (e: React.MouseEvent) => void
  userId?: string
  userAvatar?: string
  onViewProfile?: (userId: string) => void
  avatar?: Avatar3D | null
  userLevel?: number
  onSessionChange?: (hasSession: boolean) => void
  onProactiveHintChange?: (show: boolean) => void
  onPartnerMessageChange?: (message: string) => void
  onSessionUpdate?: (session: PeerSession | null) => void
  externalChatInput?: string | null
  onExternalChatInputConsumed?: () => void
  onOpenAssistantWithAction?: (action: 'rewrite' | 'response' | 'topic', inputText?: string) => void
  onMatchingModalChange?: (isOpen: boolean) => void
}

export default function SoulSyncView({
  onInteract,
  userId,
  userAvatar,
  onViewProfile,
  onSessionChange,
  onProactiveHintChange,
  onPartnerMessageChange,
  onSessionUpdate,
  externalChatInput,
  onExternalChatInputConsumed,
  onOpenAssistantWithAction,
  userLevel,
  onMatchingModalChange,
}: SoulSyncViewProps) {
  // Check if user is VIP (level >= 3) for AI assistant features
  const isVip = (userLevel ?? 0) >= 3

  // Matching modal state
  const [showMatchingModal, setShowMatchingModal] = useState(false)

  // Notify parent when matching modal state changes
  useEffect(() => {
    onMatchingModalChange?.(showMatchingModal)
  }, [showMatchingModal, onMatchingModalChange])

  // Sessions and chat states
  const [sessions, setSessions] = useState<PeerSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')

  // Mutual friends with online status
  const [mutualFriends, setMutualFriends] = useState<FriendWithOnlineStatus[]>([])
  const [isLoadingFriends, setIsLoadingFriends] = useState(false)

  // Snapshot-based sorting: lists don't reorder during active chat
  const [sortedFriendSessions, setSortedFriendSessions] = useState<PeerSession[]>([])
  const [sortedNewConnections, setSortedNewConnections] = useState<PeerSession[]>([])
  const [sortSnapshot, setSortSnapshot] = useState<number>(0)

  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null)
  const presenceWsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Connect WebSocket when session changes
  const currentRoomIdRef = useRef<string | null>(null)

  // Get partner's last message - exposed for AssistantBubble
  const getPartnerLastMessage = useCallback((): string => {
    const session = sessions.find(s => s.id === currentSessionId)
    if (!session) return ''
    const partnerMessages = session.messages.filter(m => m.role === 'peer')
    return partnerMessages.length > 0 ? partnerMessages[partnerMessages.length - 1].text : ''
  }, [sessions, currentSessionId])

  // Get current session object
  const getCurrentSession = useCallback((): PeerSession | null => {
    return sessions.find(s => s.id === currentSessionId) || null
  }, [sessions, currentSessionId])

  // Notify Dashboard when partner's last message changes
  useEffect(() => {
    const lastMessage = getPartnerLastMessage()
    onPartnerMessageChange?.(lastMessage)
  }, [getPartnerLastMessage, onPartnerMessageChange])

  // Notify Dashboard when session updates (for AI context)
  useEffect(() => {
    const session = getCurrentSession()
    onSessionUpdate?.(session)
  }, [getCurrentSession, onSessionUpdate])

  // Consume external chat input from AssistantBubble
  useEffect(() => {
    if (externalChatInput) {
      setChatInput(externalChatInput)
      onExternalChatInputConsumed?.()
    }
  }, [externalChatInput, onExternalChatInputConsumed])

  // Proactive hint - show tooltip after 8s of typing pause
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    if (chatInput.length > 5 && currentSessionId) {
      timer = setTimeout(() => {
        onProactiveHintChange?.(true)
      }, 8000)
    } else {
      onProactiveHintChange?.(false)
    }
    return () => {
      clearTimeout(timer)
      onProactiveHintChange?.(false)
    }
  }, [chatInput, currentSessionId, onProactiveHintChange])

  // Load existing chat rooms and mutual friends on mount
  useEffect(() => {
    if (userId) {
      loadUserRooms()
      loadMutualFriends()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Presence WebSocket for real-time friend status updates
  useEffect(() => {
    if (!userId) return

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsHost = import.meta.env.VITE_WS_URL || `${wsProtocol}//${window.location.host}`
    const presenceWs = new WebSocket(`${wsHost}/ws/presence/${userId}`)

    presenceWs.onopen = () => {
      console.log('[Presence WS] Connected')
    }

    presenceWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('[Presence WS] Received:', data)

        if (data.event_type === 'user_status') {
          const { user_id: statusUserId, status } = data.data
          const isOnline = status === 'online'
          console.log('[Presence WS] Friend status update:', statusUserId, status)

          // Update sessions
          setSessions(prev =>
            prev.map(s => (s.partnerId === statusUserId ? { ...s, isOnline } : s))
          )

          // Update mutual friends list
          setMutualFriends(prev => {
            const updated = prev.map(f => (f.id === statusUserId ? { ...f, isOnline } : f))
            return updated.sort((a, b) => {
              if (a.isOnline && !b.isOnline) return -1
              if (!a.isOnline && b.isOnline) return 1
              return 0
            })
          })
        }
      } catch (err) {
        console.error('[Presence WS] Parse error:', err)
      }
    }

    presenceWs.onerror = (err) => {
      console.error('[Presence WS] Error:', err)
    }

    presenceWs.onclose = () => {
      console.log('[Presence WS] Disconnected')
    }

    presenceWsRef.current = presenceWs

    const pingInterval = setInterval(() => {
      if (presenceWs.readyState === WebSocket.OPEN) {
        presenceWs.send('ping')
      }
    }, 30000)

    return () => {
      clearInterval(pingInterval)
      if (presenceWsRef.current) {
        presenceWsRef.current.close()
        presenceWsRef.current = null
      }
    }
  }, [userId])

  // Load mutual friends with online status
  const loadMutualFriends = async () => {
    if (!userId) return
    setIsLoadingFriends(true)
    try {
      const [following, onlineUsers] = await Promise.all([
        socialApi.getFollowing(userId),
        chatApi.getOnlineUsers(),
      ])

      const mutuals = following.filter(user => user.is_mutual)

      const mutualsWithStatus: FriendWithOnlineStatus[] = mutuals
        .map(user => ({
          ...user,
          isOnline: onlineUsers.includes(user.id),
        }))
        .sort((a, b) => {
          if (a.isOnline && !b.isOnline) return -1
          if (!a.isOnline && b.isOnline) return 1
          return 0
        })

      setMutualFriends(mutualsWithStatus)
    } catch (err) {
      console.error('Failed to load mutual friends:', err)
    } finally {
      setIsLoadingFriends(false)
    }
  }

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sessions])

  // Notify parent when session state changes
  useEffect(() => {
    onSessionChange?.(!!currentSessionId)
  }, [currentSessionId, onSessionChange])

  // Update sorted snapshots when sortSnapshot changes or initial load
  useEffect(() => {
    const friends = sessions.filter(s => !s.isAnonymous && mutualFriends.some(f => f.id === s.partnerId))
    const connections = sessions.filter(s => s.isAnonymous || !mutualFriends.some(f => f.id === s.partnerId))

    setSortedFriendSessions(sortSessionsByTime(friends))
    setSortedNewConnections(sortSessionsByTime(connections))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortSnapshot, sessions.length, mutualFriends.length])

  const loadUserRooms = async () => {
    if (!userId) return
    try {
      const [rooms, onlineUsers] = await Promise.all([
        chatApi.getUserRooms(userId),
        chatApi.getOnlineUsers(),
      ])

      const matchingRooms = rooms.filter((room: UserRoom) => room.source === 'matching')

      const sessionsFromRooms: PeerSession[] = matchingRooms.map((room: UserRoom) => ({
        id: room.room_id,
        roomId: room.room_id,
        partnerName: room.is_anonymous ? 'Anonymous' : (room.other_user_name || 'User'),
        partnerId: room.other_user_id,
        partnerAvatar: room.is_anonymous ? '🎭' : (room.other_user_avatar || '👤'),
        isAnonymous: room.is_anonymous,
        isRevealed: !room.is_anonymous,
        lastMessage: room.last_message || 'Start chatting...',
        lastMessageTime: room.last_message_time ? new Date(room.last_message_time).getTime() : undefined,
        moodColor: '#9381BA',
        messages: [],
        isOnline: onlineUsers.includes(room.other_user_id),
      }))
      setSessions(sessionsFromRooms)
    } catch (err) {
      console.error('Failed to load rooms:', err)
    }
  }

  // Check if a partner is a friend
  const isFriend = (partnerId: string): boolean => {
    return mutualFriends.some(f => f.id === partnerId)
  }

  // Start or open chat with a friend
  const startChatWithFriend = async (friend: FriendWithOnlineStatus) => {
    if (!userId) return
    try {
      const room = await chatApi.createRoom(userId, friend.id, false)

      // Check for existing non-anonymous session to avoid revealing anonymous chat history
      const existingSession = sessions.find(s => s.roomId === room.id && !s.isAnonymous)
      if (existingSession) {
        setCurrentSessionId(existingSession.id)
        return
      }

      const newSession: PeerSession = {
        id: room.id,
        roomId: room.id,
        partnerName: friend.nickname || friend.username,
        partnerId: friend.id,
        partnerAvatar: friend.avatar || '👤',
        isAnonymous: false,
        isRevealed: true,
        lastMessage: 'Start chatting...',
        moodColor: '#4B4E91',
        messages: [],
        isOnline: friend.isOnline,
      }

      setSessions(prev => [newSession, ...prev])
      setCurrentSessionId(newSession.id)
    } catch (err) {
      console.error('Failed to create chat room:', err)
    }
  }

  // Sort sessions by lastMessageTime (newest first)
  const sortSessionsByTime = (sessionList: PeerSession[]): PeerSession[] => {
    return [...sessionList].sort((a, b) => {
      const timeA = a.lastMessageTime || 0
      const timeB = b.lastMessageTime || 0
      return timeB - timeA
    })
  }

  // Exit chat and trigger sort update
  const exitChat = () => {
    setSortSnapshot(Date.now())
    setCurrentSessionId(null)
  }

  // Enter chat room from session list
  const enterChatRoom = (session: PeerSession) => {
    setCurrentSessionId(session.id)
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
        emotion_color: m.emotion_color || '#4B4E91',
        emotionAnalysis: m.emotion_analysis || undefined,
      }))

      setSessions(prev => prev.map(s => (s.roomId === roomId ? { ...s, messages: chatMessages } : s)))
    } catch (err) {
      console.error('Failed to load messages:', err)
    }
  }

  const connectWebSocket = useCallback(
    (roomId: string) => {
      if (wsRef.current) {
        wsRef.current.close()
      }

      const ws = createChatWebSocket(roomId, userId)

      ws.onopen = () => {
        console.log('WebSocket connected to room:', roomId)
        loadRoomMessages(roomId)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('[WS] Received message:', data)

          if (data.event_type === 'user_status') {
            const { user_id: statusUserId, status } = data.data
            const isOnline = status === 'online'
            console.log('[WS] User status update:', statusUserId, status)

            setSessions(prev =>
              prev.map(s => (s.partnerId === statusUserId ? { ...s, isOnline } : s))
            )

            setMutualFriends(prev => {
              const updated = prev.map(f => (f.id === statusUserId ? { ...f, isOnline } : f))
              return updated.sort((a, b) => {
                if (a.isOnline && !b.isOnline) return -1
                if (!a.isOnline && b.isOnline) return 1
                return 0
              })
            })
            return
          }

          if (data.type === 'peer_disconnected') {
            const sysMsg: ChatMessage = {
              id: `sys-${Date.now()}`,
              role: 'peer',
              text: '⚠️ The other user disconnected.',
              timestamp: Date.now(),
              emotion: 'Neutral',
              emotion_color: '#808080',
            }
            setSessions(prev =>
              prev.map(s =>
                s.roomId === roomId ? { ...s, messages: [...s.messages, sysMsg], isOnline: false } : s
              )
            )
            return
          }

          if (data.sender_id === userId) {
            return
          }

          const newMessage: ChatMessage = {
            id: data.id || Date.now().toString(),
            role: 'peer',
            text: data.content,
            timestamp: new Date(data.created_at || Date.now()).getTime(),
            emotion: data.emotion || 'Neutral',
            emotion_color: data.emotion_color || '#4B4E91',
            emotionAnalysis: data.emotion_analysis || undefined,
          }

          setSessions(prev =>
            prev.map(s =>
              s.roomId === roomId
                ? { ...s, messages: [...s.messages, newMessage], lastMessage: data.content }
                : s
            )
          )
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId]
  )

  useEffect(() => {
    const targetSession = sessions.find(s => s.id === currentSessionId)
    const newRoomId = targetSession?.roomId || null

    if (newRoomId && newRoomId !== currentRoomIdRef.current && userId) {
      currentRoomIdRef.current = newRoomId
      connectWebSocket(newRoomId)
    } else if (!newRoomId && wsRef.current) {
      currentRoomIdRef.current = null
      wsRef.current.close()
      wsRef.current = null
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId, userId])

  // Handle match success from MatchingModal
  const handleMatchSuccess = async (result: MatchResult) => {
    if (!userId) return

    const existing = sessions.find(s => s.roomId === result.roomId)

    if (existing) {
      setCurrentSessionId(existing.id)
      setShowMatchingModal(false)
      return
    }

    let partnerName = 'Anonymous'
    let partnerAvatar = '🎭'
    if (!result.isAnonymous && result.partnerId && result.partnerId !== 'unknown') {
      try {
        const partnerUser = await userApi.getUser(result.partnerId)
        partnerName = partnerUser.nickname || partnerUser.username
        partnerAvatar = partnerUser.avatar || '💠'
      } catch (err) {
        console.error('Failed to fetch partner info:', err)
      }
    }

    const newSession: PeerSession = {
      id: result.roomId,
      roomId: result.roomId,
      partnerName,
      partnerId: result.partnerId,
      partnerAvatar,
      isAnonymous: result.isAnonymous,
      isRevealed: !result.isAnonymous,
      lastMessage: 'Connection established',
      lastMessageTime: Date.now(),
      moodColor: result.moodColor,
      messages: [],
      isOnline: true,
    }

    setSessions(prev => [newSession, ...prev])
    setCurrentSessionId(newSession.id)
    setShowMatchingModal(false)
  }

  const sendPeerMessage = () => {
    if (!chatInput.trim() || !currentSessionId || !userId) return

    const targetSession = sessions.find(s => s.id === currentSessionId)
    if (!targetSession) return

    const messageContent = chatInput
    const tempId = `temp-${Date.now()}`

    const newMsg: ChatMessage = {
      id: tempId,
      role: 'user',
      text: messageContent,
      timestamp: Date.now(),
      emotion: 'Neutral',
      emotion_color: '#808080',
    }

    setSessions(prev =>
      prev.map(s =>
        s.id === currentSessionId
          ? { ...s, messages: [...s.messages, newMsg], lastMessage: messageContent, lastMessageTime: Date.now() }
          : s
      )
    )

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          sender_id: userId,
          message_type: 'text',
          content: messageContent,
        })
      )
    } else {
      chatApi
        .sendMessage(targetSession.roomId, {
          sender_id: userId,
          message_type: 'text',
          content: messageContent,
        })
        .catch(err => console.error('Failed to send message:', err))
    }

    setChatInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      sendPeerMessage()
    }
  }

  // Format last contact time
  const formatLastContact = (timestamp?: number): string => {
    if (!timestamp) return 'Start chatting'
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString()
  }

  // Find current session
  const currentSession = sessions.find(s => s.id === currentSessionId)

  // Separate friends and new connections
  // When in chat, use snapshot to prevent reordering; otherwise sort in real-time
  const friendSessions = currentSessionId
    ? sortedFriendSessions
    : sortSessionsByTime(sessions.filter(s => !s.isAnonymous && isFriend(s.partnerId)))
  const newConnections = currentSessionId
    ? sortedNewConnections
    : sortSessionsByTime(sessions.filter(s => s.isAnonymous || !isFriend(s.partnerId)))

  // AI Handlers - Now delegate to Avatar AssistantBubble
  const handleRewrite = () => {
    if (!chatInput.trim()) return
    onOpenAssistantWithAction?.('rewrite', chatInput)
  }

  const handleSuggestReply = () => {
    if (!currentSessionId) return
    const session = sessions.find(s => s.id === currentSessionId)
    if (!session || session.messages.length === 0) return
    onOpenAssistantWithAction?.('response')
  }

  const handleSuggestTopic = () => {
    onOpenAssistantWithAction?.('topic')
  }

  // Render avatar with gradient ring
  const renderAvatarWithRing = (
    avatar: string | undefined,
    isAnonymous: boolean,
    bgColor: string = 'bg-blue-50',
    size: 'sm' | 'md' = 'md'
  ) => {
    const sizeClasses = size === 'sm' ? 'w-9 h-9' : 'w-12 h-12'
    const emojiSize = size === 'sm' ? 'text-lg' : 'text-2xl'
    const fallbackSize = size === 'sm' ? 'text-base' : 'text-xl'

    return (
      <div className="relative">
        {/* Four-color gradient breathing ring */}
        <div
          className="absolute -inset-1 rounded-xl animate-pulse opacity-60 blur-sm"
          style={{
            background: 'conic-gradient(from 0deg, #D32F2F, #F9D849, #66B04C, #3266B1, #D32F2F)'
          }}
        />
        <div className={`relative ${sizeClasses} rounded-xl overflow-hidden ${bgColor} flex items-center justify-center`}>
          {isAnonymous ? (
            <span className={emojiSize}>🎭</span>
          ) : avatar && avatar.length > 2 ? (
            <img src={getAvatarUrl(avatar)} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className={fallbackSize}>{avatar || '👤'}</span>
          )}
        </div>
      </div>
    )
  }

  // Render chat sidebar list item (for chat view)
  const renderChatSidebarItem = (
    session: PeerSession,
    isActive: boolean,
    showGradientRing: boolean = false
  ) => (
    <button
      key={session.id}
      onClick={() => enterChatRoom(session)}
      className={`w-full p-2 flex items-center gap-2 rounded-xl transition-all text-left ${
        isActive ? 'bg-accent/10 border-l-2 border-accent' : 'hover:bg-white/40'
      }`}
    >
      <div className="relative">
        {showGradientRing ? (
          renderAvatarWithRing(session.partnerAvatar, session.isAnonymous, 'bg-gray-100', 'sm')
        ) : (
          renderAvatarWithRing(session.partnerAvatar, false, 'bg-blue-50', 'sm')
        )}
        <OnlineIndicator isOnline={session.isOnline || false} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-xs truncate">
          {session.isAnonymous ? 'Anonymous' : `@${session.partnerName}`}
        </p>
        <p className="text-[10px] text-gray-400 truncate">{session.lastMessage}</p>
      </div>
    </button>
  )

  // Render friend sidebar item (for chat view)
  const renderChatFriendSidebarItem = (friend: FriendWithOnlineStatus) => (
    <button
      key={friend.id}
      onClick={() => startChatWithFriend(friend)}
      className="w-full p-2 flex items-center gap-2 rounded-xl hover:bg-white/40 transition-all text-left"
    >
      <div className="relative">
        {renderAvatarWithRing(friend.avatar, false, 'bg-blue-50', 'sm')}
        <OnlineIndicator isOnline={friend.isOnline} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-xs truncate">@{friend.username}</p>
        <p className="text-[10px] text-gray-400">Start chatting</p>
      </div>
    </button>
  )

  // Chat View with sidebar (when a session is selected)
  if (currentSession) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header */}
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={exitChat}
              className="p-2 hover:bg-gray-100 rounded-xl transition-all"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">SoulSync</h1>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Connect with your echoes</p>
            </div>
          </div>
        </header>

        {/* Chat View with Sidebar */}
        <section className="h-[600px] bg-white/60 backdrop-blur-xl rounded-3xl border border-white/20 shadow-lg overflow-hidden flex">
          {/* Left Sidebar: Contact Lists - Two independent scrollable sections */}
          <div className="w-56 border-r-2 border-gray-200 flex flex-col bg-white/40">
            {/* Friends Section - Independent scroll area */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-4 border-b border-black/5 bg-white/80 backdrop-blur-sm flex-shrink-0">
                <h3 className="font-black text-[10px] uppercase tracking-[0.25em] text-gray-400">
                  Friends
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {isLoadingFriends ? (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-gray-200 border-t-accent rounded-full animate-spin" />
                  </div>
                ) : friendSessions.length === 0 && mutualFriends.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs py-4">No friends yet</p>
                ) : (
                  <>
                    {friendSessions.map(session => renderChatSidebarItem(session, currentSessionId === session.id, false))}
                    {mutualFriends
                      .filter(f => !friendSessions.some(s => s.partnerId === f.id))
                      .map(friend => renderChatFriendSidebarItem(friend))}
                  </>
                )}
              </div>
            </div>

            {/* New Connections Section - Independent scroll area */}
            <div className="flex-1 flex flex-col min-h-0 border-t border-black/5">
              <div className="p-4 border-b border-black/5 bg-white/80 backdrop-blur-sm flex-shrink-0">
                <h3 className="font-black text-[10px] uppercase tracking-[0.25em] text-gray-400">
                  New Connections
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {newConnections.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs py-4">No new connections</p>
                ) : (
                  newConnections.map(session => renderChatSidebarItem(session, currentSessionId === session.id, true))
                )}
              </div>
            </div>
          </div>

          {/* Right: Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <header className="flex items-center p-4 border-b border-black/5 bg-white/60">
              <div className="flex items-center gap-3 flex-1">
                <div
                  className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center ${
                    currentSession.isAnonymous ? 'bg-purple-50' : 'bg-blue-50'
                  } ${!currentSession.isAnonymous ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
                  onClick={() => !currentSession.isAnonymous && onViewProfile?.(currentSession.partnerId)}
                >
                  {currentSession.partnerAvatar && currentSession.partnerAvatar.length > 2 ? (
                    <img src={getAvatarUrl(currentSession.partnerAvatar)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">{currentSession.partnerAvatar || '👤'}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3
                      className={`font-black text-sm uppercase ${!currentSession.isAnonymous ? 'cursor-pointer hover:underline' : ''}`}
                      onClick={() => !currentSession.isAnonymous && onViewProfile?.(currentSession.partnerId)}
                    >
                      {currentSession.isAnonymous ? 'Anonymous' : `@${currentSession.partnerName}`}
                    </h3>
                    {!currentSession.isAnonymous && isFriend(currentSession.partnerId) && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[9px] font-black uppercase rounded-full">
                        Friend
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <OnlineIndicator isOnline={currentSession.isOnline || false} inline />
                    <p className="text-[11px] font-bold text-gray-400">
                      {currentSession.isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
              </div>
              {currentSession.isAnonymous && !currentSession.isRevealed && (
                <button className="px-4 py-2 bg-accent text-white rounded-full text-[11px] font-black uppercase tracking-widest hover:scale-105 shadow-lg transition-all">
                  Reveal
                </button>
              )}
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {currentSession.messages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 font-bold text-sm">Start the conversation!</p>
                </div>
              ) : (
                currentSession.messages.map(m => (
                  <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-end gap-2">
                      {/* Partner avatar - show on left for peer messages */}
                      {m.role === 'peer' && (
                        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                          {currentSession.isAnonymous ? (
                            <span className="text-base">🎭</span>
                          ) : currentSession.partnerAvatar && currentSession.partnerAvatar.length > 2 ? (
                            <img src={getAvatarUrl(currentSession.partnerAvatar)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm">{currentSession.partnerAvatar || '👤'}</span>
                          )}
                        </div>
                      )}
                      <div
                        className={`p-3 rounded-2xl font-bold text-sm leading-relaxed shadow-md max-w-[280px] ${
                          m.role === 'user'
                            ? 'bg-black text-white rounded-br-sm'
                            : 'bg-white text-gray-800 rounded-bl-sm border border-black/5'
                        }`}
                      >
                        {m.text}
                      </div>
                      {/* User avatar - show on right for user messages */}
                      {m.role === 'user' && (
                        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                          {userAvatar && userAvatar.length > 2 ? (
                            <img src={getAvatarUrl(userAvatar)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm">{userAvatar || '👤'}</span>
                          )}
                        </div>
                      )}
                    </div>
                    {m.role === 'peer' && m.emotionAnalysis && (
                      <div className="ml-10 mt-1.5">
                        <EmotionGradientBar
                          primaryEmotion={m.emotionAnalysis.primary_emotion}
                          primaryPercentage={m.emotionAnalysis.primary_percentage}
                          primaryColor={m.emotionAnalysis.primary_color}
                          secondaryEmotion={m.emotionAnalysis.secondary_emotion}
                          secondaryPercentage={m.emotionAnalysis.secondary_percentage}
                          secondaryColor={m.emotionAnalysis.secondary_color}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="p-3 border-t border-black/5 bg-white/60">
              <div className="flex gap-2 mb-2 overflow-x-auto scrollbar-hide">
                {isVip ? (
                  <>
                    <button
                      onClick={handleRewrite}
                      disabled={!chatInput.trim()}
                      className="flex items-center space-x-1 px-2.5 py-1 bg-purple-50 text-purple-600 rounded-full text-[9px] font-black uppercase tracking-wider hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                    >
                      <span>✨</span>
                      <span>Rewrite</span>
                    </button>
                    <button
                      onClick={handleSuggestReply}
                      disabled={currentSession.messages.length === 0}
                      className="flex items-center space-x-1 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-wider hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                    >
                      <span>💡</span>
                      <span>Reply</span>
                    </button>
                    <button
                      onClick={handleSuggestTopic}
                      className="flex items-center space-x-1 px-2.5 py-1 bg-green-50 text-green-600 rounded-full text-[9px] font-black uppercase tracking-wider hover:bg-green-100 transition-all whitespace-nowrap"
                    >
                      <span>🗣️</span>
                      <span>Topic</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button disabled className="flex items-center space-x-1 px-2.5 py-1 bg-gray-100 text-gray-400 rounded-full text-[9px] font-black uppercase tracking-wider cursor-not-allowed whitespace-nowrap">
                      <span>🔒</span>
                      <span>Rewrite</span>
                    </button>
                    <button disabled className="flex items-center space-x-1 px-2.5 py-1 bg-gray-100 text-gray-400 rounded-full text-[9px] font-black uppercase tracking-wider cursor-not-allowed whitespace-nowrap">
                      <span>🔒</span>
                      <span>Reply</span>
                    </button>
                    <button disabled className="flex items-center space-x-1 px-2.5 py-1 bg-gray-100 text-gray-400 rounded-full text-[9px] font-black uppercase tracking-wider cursor-not-allowed whitespace-nowrap">
                      <span>🔒</span>
                      <span>Topic</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 h-11 bg-gray-50 rounded-xl px-4 border-none focus:ring-2 focus:ring-black text-sm font-bold transition-all placeholder:text-gray-300"
                />
                <button
                  onClick={sendPeerMessage}
                  disabled={!chatInput.trim()}
                  className="w-11 h-11 bg-black text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Matching Modal */}
        <MatchingModal
          isOpen={showMatchingModal}
          onClose={() => setShowMatchingModal(false)}
          onMatchSuccess={handleMatchSuccess}
          userId={userId}
          onInteract={onInteract}
        />
      </div>
    )
  }

  // SoulSync Main View (original two-column layout)
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div className="space-y-2">
          <h1 className="text-5xl font-black tracking-tighter uppercase leading-none">SoulSync</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Connect with your echoes</p>
        </div>
      </header>

      {/* Vibe Match Section - Find Your Echo Button */}
      <section>
        <MeshGradientButton
          onClick={() => setShowMatchingModal(true)}
          label="FRIEND MATCHING"
          subtitle="Match with someone who vibes with you"
        />
      </section>

      {/* Messages Section - Two Column Layout */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Friends */}
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/20 shadow-lg p-6 min-h-[400px]">
          <h3 className="font-black text-[11px] uppercase tracking-[0.25em] text-gray-400 mb-4">
            Friends
          </h3>

          {isLoadingFriends ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-accent rounded-full animate-spin" />
            </div>
          ) : mutualFriends.length === 0 && friendSessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                <span className="text-3xl">👥</span>
              </div>
              <p className="text-gray-400 font-bold text-sm">No friends yet</p>
              <p className="text-gray-300 text-xs mt-1">Follow someone who follows you back!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Show friends with existing chats first */}
              {friendSessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => enterChatRoom(session)}
                  className="w-full p-3 flex items-center gap-3 rounded-2xl hover:bg-white/40 transition-all text-left"
                >
                  <div className="relative">
                    {renderAvatarWithRing(session.partnerAvatar, false, 'bg-blue-50')}
                    <OnlineIndicator isOnline={session.isOnline || false} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm truncate">@{session.partnerName}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {formatLastContact(session.lastMessageTime)}
                    </p>
                  </div>
                </button>
              ))}

              {/* Then show friends without chats */}
              {mutualFriends
                .filter(f => !friendSessions.some(s => s.partnerId === f.id))
                .map(friend => (
                  <button
                    key={friend.id}
                    onClick={() => startChatWithFriend(friend)}
                    className="w-full p-3 flex items-center gap-3 rounded-2xl hover:bg-white/40 transition-all text-left"
                  >
                    <div className="relative">
                      {renderAvatarWithRing(friend.avatar, false, 'bg-blue-50')}
                      <OnlineIndicator isOnline={friend.isOnline} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm truncate">@{friend.username}</p>
                      <p className="text-xs text-gray-400">Start chatting</p>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Right: New Connections */}
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/20 shadow-lg p-6 min-h-[400px]">
          <h3 className="font-black text-[11px] uppercase tracking-[0.25em] text-gray-400 mb-4">
            New Connections
          </h3>

          {newConnections.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                <span className="text-3xl">🌊</span>
              </div>
              <p className="text-gray-400 font-bold text-sm">No new connections</p>
              <p className="text-gray-300 text-xs mt-1">Start matching to find new friends!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {newConnections.map(session => (
                <button
                  key={session.id}
                  onClick={() => enterChatRoom(session)}
                  className="w-full p-3 flex items-center gap-3 rounded-2xl hover:bg-white/40 transition-all text-left"
                >
                  <div className="relative">
                    {renderAvatarWithRing(session.partnerAvatar, session.isAnonymous, 'bg-gray-100')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm truncate">
                      {session.isAnonymous ? 'Anonymous' : `@${session.partnerName}`}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{session.lastMessage}</p>
                  </div>
                  {session.isOnline && (
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Matching Modal */}
      <MatchingModal
        isOpen={showMatchingModal}
        onClose={() => setShowMatchingModal(false)}
        onMatchSuccess={handleMatchSuccess}
        userId={userId}
        onInteract={onInteract}
      />
    </div>
  )
}
