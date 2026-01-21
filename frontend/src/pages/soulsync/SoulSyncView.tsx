import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  matchApi,
  chatApi,
  socialApi,
  userApi,
  createChatWebSocket,
  UserRoom,
  ChatMessage as ApiChatMessage,
  FollowUser,
  EmotionType,
  SupportRole,
  SupportNeed,
  TopicTag,
} from '../../services/api'
import { markUserActivity } from '../../components/EmotionReportModal'

import { Avatar3D } from '../../config/avatars'
import EmotionGradientBar from '../../components/chat/EmotionGradientBar'
import { getAvatarUrl } from '../../config/userAvatars'
import OnlineIndicator from './components/OnlineIndicator'

import { MatchLock } from './matchLock'

// Extended FollowUser with online status
interface FriendWithOnlineStatus extends FollowUser {
  isOnline: boolean
}

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
}: SoulSyncViewProps) {
  // Check if user is VIP (level >= 3) for AI assistant features
  const isVip = (userLevel ?? 0) >= 3

  // Tab state
  const [activeTab, setActiveTab] = useState<'matching' | 'social'>('matching')


  // Matching states
  const [isSearching, setIsSearching] = useState(false)
  const [matchedPartner, setMatchedPartner] = useState<{
    roomId: string
    partnerId: string
    isAnonymous: boolean
    matchScore?: number
    matchReason?: string
  } | null>(null)
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

  // Mutual friends with online status
  const [mutualFriends, setMutualFriends] = useState<FriendWithOnlineStatus[]>([])
  const [isLoadingFriends, setIsLoadingFriends] = useState(false)

  // Social view category
  const [socialCategory, setSocialCategory] = useState<'chats' | 'friends'>('chats')

  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null)
  const presenceWsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Connect WebSocket when session changes
  const currentRoomIdRef = useRef<string | null>(null)


  // =======================
  // ✅ Scheme C: Match Lock
  // =======================
  const matchLockRef = useRef<MatchLock | null>(null)

  // Init lock once
  useEffect(() => {
    matchLockRef.current = new MatchLock({
      onLockLost: () => {
        console.warn('[MatchLock] Lost lock to another tab. Stopping search.')
        // 尝试取消后端队列（不阻塞）
        matchApi.cancelMatch().catch(() => {})
        // 立刻退出 UI（核心：避免两个窗口都 stuck 在 searching）
        setIsSearching(false)
        setMatchedPartner(null)
        setQueuePosition(null)
        setEstimatedWait(null)
        setSafetyTips([])
      },
    })

    return () => {
      const lock = matchLockRef.current
      lock?.stopHeartbeat()
      lock?.releaseIfOwned()
      lock?.dispose()
      matchLockRef.current = null
    }
  }, [])

  // Keep lock alive while searching
  useEffect(() => {
    const lock = matchLockRef.current
    if (!lock) return

    if (isSearching) {
      lock.startHeartbeat()
    } else {
      lock.stopHeartbeat()
    }

    return () => {
      lock.stopHeartbeat()
    }
  }, [isSearching])

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

  // Match status polling
  useEffect(() => {
    if (!isSearching) {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
      return
    }

    ;(async () => {
      try {
        const status = await matchApi.getStatus()
        if (status.matched && status.room_id) {
          setMatchedPartner({
            roomId: status.room_id,
            partnerId: status.matched_user_id || 'unknown',
            isAnonymous: status.is_anonymous ?? isAnonymousMatch,
            matchScore: status.match_score,
            matchReason: status.match_reason,
          })
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
            matchReason: status.match_reason,
          })
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

  // Notify parent when session state changes
  useEffect(() => {
    onSessionChange?.(activeTab === 'social' && !!currentSessionId)
  }, [currentSessionId, activeTab, onSessionChange])

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
        moodColor: '#9381BA',
        messages: [],
        isOnline: onlineUsers.includes(room.other_user_id),
      }))
      setSessions(sessionsFromRooms)
    } catch (err) {
      console.error('Failed to load rooms:', err)
    }
  }

  // Start or open chat with a friend
  const startChatWithFriend = async (friend: FriendWithOnlineStatus) => {
    if (!userId) return
    try {
      const room = await chatApi.createRoom(userId, friend.id, false)

      const existingSession = sessions.find(s => s.roomId === room.id)
      if (existingSession) {
        setCurrentSessionId(existingSession.id)
        setSocialCategory('friends')
        setActiveTab('social')
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
      setSocialCategory('friends')
      setActiveTab('social')
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

  // ✅ startMatching with lock acquire
  const startMatching = async (e: React.MouseEvent) => {
    onInteract(e)

    const lock = matchLockRef.current
    if (!lock) return

    const ok = lock.acquire()
    if (!ok) {
      alert('You are already matching in another tab/window.')
      return
    }

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
        risk_level: 'safe',
      })

      if (response.matched && response.room_id) {
        setMatchedPartner({
          roomId: response.room_id,
          partnerId: response.matched_user_id || 'unknown',
          isAnonymous: response.is_anonymous,
          matchScore: response.match_score,
          matchReason: response.match_reason,
        })
      } else {
        if (response.queue_position) setQueuePosition(response.queue_position)
        if (response.estimated_wait) setEstimatedWait(response.estimated_wait)
        if (response.safety_tips) setSafetyTips(response.safety_tips)
      }
    } catch (err) {
      console.error('Match failed:', err)
      setQueuePosition(1)
      setEstimatedWait('Waiting for other users...')
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ cancel releases lock
  const cancelMatching = async () => {
    try {
      await matchApi.cancelMatch()
    } catch (err) {
      console.error('Cancel match failed:', err)
    }

    const lock = matchLockRef.current
    lock?.stopHeartbeat()
    lock?.releaseIfOwned()

    setIsSearching(false)
    setMatchedPartner(null)
    setQueuePosition(null)
    setEstimatedWait(null)
    setSafetyTips([])
  }

  // ✅ confirm releases lock
  const confirmMatch = async () => {
    if (!matchedPartner || !userId) return

    const roomId = matchedPartner.roomId
    const existing = sessions.find(s => s.roomId === roomId)

    if (existing) {
      setCurrentSessionId(existing.id)
      setMatchedPartner(null)
      setIsSearching(false)
      setActiveTab('social')

      const lock = matchLockRef.current
      lock?.stopHeartbeat()
      lock?.releaseIfOwned()
      return
    }

    let partnerName = 'Anonymous'
    let partnerAvatar = '🎭'
    if (!matchedPartner.isAnonymous && matchedPartner.partnerId && matchedPartner.partnerId !== 'unknown') {
      try {
        const partnerUser = await userApi.getUser(matchedPartner.partnerId)
        partnerName = partnerUser.nickname || partnerUser.username
        partnerAvatar = partnerUser.avatar || '💠'
      } catch (err) {
        console.error('Failed to fetch partner info:', err)
      }
    }

    const newSession: PeerSession = {
      id: roomId,
      roomId,
      partnerName,
      partnerId: matchedPartner.partnerId,
      partnerAvatar,
      isAnonymous: matchedPartner.isAnonymous,
      isRevealed: !matchedPartner.isAnonymous,
      lastMessage: 'Connection established',
      moodColor: selectedMood.color,
      messages: [],
      isOnline: true,
    }

    setSessions(prev => [newSession, ...prev])
    setCurrentSessionId(newSession.id)
    setMatchedPartner(null)
    setIsSearching(false)
    setActiveTab('social')

    const lock = matchLockRef.current
    lock?.stopHeartbeat()
    lock?.releaseIfOwned()
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
          ? { ...s, messages: [...s.messages, newMsg], lastMessage: messageContent }
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

    markUserActivity(userId)
    setChatInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      sendPeerMessage()
    }
  }

  // Find current session
  const currentSession = sessions.find(s => s.id === currentSessionId)

  // Searching Portal
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
                  {selectedRole === 'seeker'
                    ? '🙋 Seeking Support'
                    : selectedRole === 'supporter'
                      ? '🤗 Ready to Help'
                      : '💬 Open to Both'}{' '}
                  • {selectedMood.label}
                </p>
                {(queuePosition || estimatedWait) && (
                  <div className="mt-4 space-y-2">
                    {queuePosition && (
                      <p className="text-white/60 text-sm font-bold">Queue Position: #{queuePosition}</p>
                    )}
                    {estimatedWait && (
                      <p className="text-white/60 text-sm font-bold">Estimated Wait: {estimatedWait}</p>
                    )}
                  </div>
                )}
                {safetyTips.length > 0 && (
                  <div className="mt-6 p-4 bg-white/10 rounded-2xl text-left max-w-md">
                    <p className="text-white/80 text-xs font-black uppercase tracking-widest mb-2">Safety Tips</p>
                    {safetyTips.map((tip, i) => (
                      <p key={i} className="text-white/70 text-sm mb-1">
                        • {tip}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={cancelMatching}
                className="px-8 py-3 bg-white text-gray-800 rounded-full text-[13px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all shadow-xl"
              >
                Cancel
              </button>
            </>
          ) : (
            <div className="bg-white p-10 rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border border-black/5 text-center space-y-8 animate-in zoom-in-95 duration-500">
              <div className="space-y-2">
                <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-green-50 text-green-600 border border-green-100">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-[12px] font-black uppercase tracking-widest">Match Found!</span>
                </div>
              </div>
              <button
                onClick={confirmMatch}
                className="px-12 py-5 bg-black text-white rounded-[1.5rem] text-sm font-black uppercase tracking-wide shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                Confirm Connection
              </button>
            </div>
          )}
        </div>
      </div>,
      document.body
    )
  }

  // MatchingContent - 匹配偏好设置
  const MatchingContent = () => (
    <div className="bg-white p-10 rounded-[3rem] border border-black/[0.03] shadow-xl space-y-10">
      <div id="tour-sync-mode" className="space-y-3">
        <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-300">Sync Mode</h4>
        <div className="flex gap-3">
          <button
            onClick={() => setIsAnonymousMatch(true)}
            className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-center space-x-2 ${
              isAnonymousMatch ? 'border-indigo-500 bg-indigo-50 shadow-inner' : 'border-black/5 hover:border-black/10'
            }`}
          >
            <span className="text-xl">🎭</span>
            <span className="text-[11px] font-black uppercase tracking-widest">Anonymous</span>
          </button>
          <button
            onClick={() => setIsAnonymousMatch(false)}
            className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-center space-x-2 ${
              !isAnonymousMatch ? 'border-blue-500 bg-blue-50 shadow-inner' : 'border-black/5 hover:border-black/10'
            }`}
          >
            <span className="text-xl">👤</span>
            <span className="text-[11px] font-black uppercase tracking-widest">Public</span>
          </button>
        </div>
      </div>

      {/* Role Selector */}
      <div id="tour-your-role" className="space-y-4">
        <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-300">Your Role</h4>
        <div className="grid grid-cols-3 gap-3">
          {ROLE_DATA.map(r => (
            <button
              key={r.value}
              onClick={() => setSelectedRole(r.value)}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center space-y-2 ${
                selectedRole === r.value ? 'border-accent bg-accent/5 shadow-inner' : 'border-black/5 hover:border-black/10'
              }`}
            >
              <span className="text-2xl">{r.emoji}</span>
              <span className="text-[11px] font-black uppercase tracking-widest">{r.label}</span>
              <span className="text-[9px] text-gray-400 font-bold">{r.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Support Need Selector */}
      <div id="tour-what-you-need" className="space-y-4">
        <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-300">What Do You Need?</h4>
        <div className="flex flex-wrap gap-2">
          {NEED_DATA.map(n => (
            <button
              key={n.value}
              onClick={() => setSelectedNeed(n.value)}
              className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-full border transition-all active:scale-95 ${
                selectedNeed === n.value
                  ? 'border-accent bg-accent text-white shadow-lg'
                  : 'border-black/5 bg-gray-50 text-gray-500 hover:border-black/10'
              }`}
            >
              <span>{n.emoji}</span>
              <span className="text-[12px] font-black uppercase tracking-widest">{n.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Emotion/Resonance Selector */}
      <div id="tour-resonance" className="space-y-4">
        <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-300">Set Your Resonance</h4>
        <div className="flex flex-wrap gap-2">
          {MOOD_DATA.map(m => (
            <button
              key={m.label}
              onClick={() => setSelectedMood(m)}
              className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-full border transition-all active:scale-95 ${
                selectedMood.label === m.label
                  ? 'border-accent bg-accent text-white shadow-lg'
                  : 'border-black/5 bg-gray-50 text-gray-400 hover:border-black/10'
              }`}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: selectedMood.label === m.label ? '#ffffff' : m.color }}
              ></div>
              <span className="text-[12px] font-black uppercase tracking-widest">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Intensity Slider */}
      <div id="tour-intensity" className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-300">Intensity</h4>
          <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">
            {selectedIntensity === 1
              ? 'Very Low'
              : selectedIntensity === 2
                ? 'Low'
                : selectedIntensity === 3
                  ? 'Moderate'
                  : selectedIntensity === 4
                    ? 'High'
                    : 'Very High'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {[1, 2, 3, 4, 5].map(level => (
            <button
              key={level}
              onClick={() => setSelectedIntensity(level)}
              className={`flex-1 h-10 rounded-xl transition-all ${
                selectedIntensity >= level ? 'bg-accent shadow-inner' : 'bg-gray-100 hover:bg-gray-200'
              }`}
              style={{ opacity: selectedIntensity >= level ? 0.4 + level * 0.15 : 1 }}
            />
          ))}
        </div>
      </div>

      {/* Topic Selector */}
      <div id="tour-topic" className="space-y-4">
        <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-300">Topic (Optional)</h4>
        <div className="flex flex-wrap gap-2">
          {TOPIC_DATA.map(t => (
            <button
              key={t.value}
              onClick={() => setSelectedTopic(t.value)}
              className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-full border transition-all active:scale-95 text-[11px] ${
                selectedTopic === t.value
                  ? 'border-accent bg-accent/10 text-accent shadow-sm'
                  : 'border-black/5 bg-gray-50 text-gray-400 hover:border-black/10'
              }`}
            >
              <span>{t.emoji}</span>
              <span className="font-black uppercase tracking-wider">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div id="tour-find-echoes" className="pt-4">
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
  )

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

  const renderChatDetail = (session: PeerSession) => (
    <div className="flex-1 flex flex-col h-full">
      <header className="p-4 border-b border-black/5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center ${
              session.isAnonymous ? 'bg-purple-50' : 'bg-blue-50'
            } ${!session.isAnonymous ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
            onClick={() => !session.isAnonymous && onViewProfile?.(session.partnerId)}
          >
            {session.partnerAvatar && session.partnerAvatar.length > 2 ? (
              <img src={getAvatarUrl(session.partnerAvatar)} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl">{session.partnerAvatar || '👤'}</span>
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3
                className={`font-black text-sm uppercase ${!session.isAnonymous ? 'cursor-pointer hover:underline' : ''}`}
                onClick={() => !session.isAnonymous && onViewProfile?.(session.partnerId)}
              >
                {session.isAnonymous ? 'Anonymous' : `@${session.partnerName}`}
              </h3>
              {!session.isAnonymous && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[9px] font-black uppercase rounded-full">
                  Friend
                </span>
              )}
            </div>
            <p className="text-[11px] font-bold text-gray-400">
              {session.isAnonymous ? '🎭 Ghost Mode' : '👤 Friend Chat'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {session.isAnonymous && !session.isRevealed && (
            <button className="px-4 py-2 bg-accent text-white rounded-full text-[11px] font-black uppercase tracking-widest hover:scale-105 shadow-lg transition-all">
              Reveal
            </button>
          )}
          <button
            onClick={() => setCurrentSessionId(null)}
            className="text-gray-400 hover:text-black transition-colors font-black text-[11px] uppercase tracking-widest"
          >
            Close
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {session.messages.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 font-bold">Start the conversation!</p>
          </div>
        ) : (
          session.messages.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="space-y-2 max-w-[70%]">
                <div
                  className={`p-4 rounded-[1.5rem] font-bold text-sm leading-relaxed shadow-lg ${
                    m.role === 'user'
                      ? 'bg-black text-white rounded-br-none'
                      : 'bg-gray-50 text-gray-800 rounded-bl-none border border-black/5'
                  }`}
                >
                  {m.text}
                </div>
                {m.role === 'peer' && m.emotionAnalysis && (
                  <div className="float-left">
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
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-black/5 bg-white relative">
        <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
          {isVip ? (
            // VIP users: Full access to AI assistant buttons
            <>
              <button
                onClick={handleRewrite}
                disabled={!chatInput.trim()}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg md:rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
              >
                <span>✨</span>
                <span>Rewrite</span>
              </button>
              <button
                onClick={handleSuggestReply}
                disabled={session.messages.length === 0}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg md:rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
              >
                <span>💡</span>
                <span>Suggest Reply</span>
              </button>
              <button
                onClick={handleSuggestTopic}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg md:rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
              >
                <span>🗣️</span>
                <span>Topic</span>
              </button>
            </>
          ) : (
            // Non-VIP users: Locked buttons with VIP L3 indicator
            <>
              <button
                disabled
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-100 text-gray-400 rounded-lg md:rounded-full text-[10px] font-black uppercase tracking-wider cursor-not-allowed transition-all whitespace-nowrap"
              >
                <span>🔒</span>
                <span>Rewrite</span>
                <span className="text-[8px] opacity-60">(VIP L3)</span>
              </button>
              <button
                disabled
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-100 text-gray-400 rounded-lg md:rounded-full text-[10px] font-black uppercase tracking-wider cursor-not-allowed transition-all whitespace-nowrap"
              >
                <span>🔒</span>
                <span>Suggest Reply</span>
                <span className="text-[8px] opacity-60">(VIP L3)</span>
              </button>
              <button
                disabled
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-100 text-gray-400 rounded-lg md:rounded-full text-[10px] font-black uppercase tracking-wider cursor-not-allowed transition-all whitespace-nowrap"
              >
                <span>🔒</span>
                <span>Topic</span>
                <span className="text-[8px] opacity-60">(VIP L3)</span>
              </button>
            </>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Transmit into the sync..."
            className="flex-1 h-14 bg-gray-50 rounded-[1.2rem] px-6 border-none focus:ring-2 focus:ring-black text-sm font-bold transition-all placeholder:text-gray-300"
          />
          <button
            onClick={sendPeerMessage}
            disabled={!chatInput.trim()}
            className="w-14 h-14 bg-black text-white rounded-[1.2rem] flex items-center justify-center shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )

  const renderConversationItem = (session: PeerSession, isActive: boolean) => (
    <button
      key={session.id}
      onClick={() => setCurrentSessionId(session.id)}
      className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-all text-left border-b border-black/5 ${
        isActive ? 'bg-accent/5 border-l-4 border-l-accent' : ''
      }`}
    >
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-xl overflow-hidden">
          {session.partnerAvatar && session.partnerAvatar.length > 2 ? (
            <img src={getAvatarUrl(session.partnerAvatar)} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center text-2xl ${session.isAnonymous ? 'bg-purple-50' : 'bg-blue-50'}`}>
              {session.partnerAvatar || '👤'}
            </div>
          )}
        </div>
        <OnlineIndicator isOnline={session.isOnline || false} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-black text-sm truncate">{session.isAnonymous ? '🎭 Anonymous' : `@${session.partnerName}`}</p>
          {!session.isAnonymous && (
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[8px] font-black uppercase rounded">
              Friend
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 truncate">{session.lastMessage}</p>
      </div>
    </button>
  )

  const renderFriendItem = (friend: FriendWithOnlineStatus) => (
    <button
      key={friend.id}
      onClick={() => startChatWithFriend(friend)}
      className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-all text-left border-b border-black/5"
    >
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-xl overflow-hidden">
          {friend.avatar && friend.avatar.length > 2 ? (
            <img src={getAvatarUrl(friend.avatar)} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-blue-50 flex items-center justify-center text-2xl">
              {friend.avatar || '👤'}
            </div>
          )}
        </div>
        <OnlineIndicator isOnline={friend.isOnline} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-black text-sm truncate">@{friend.username}</p>
          {friend.isOnline && <span className="text-[10px] font-bold text-green-500 uppercase">Online</span>}
        </div>
        <p className="text-xs text-gray-400 truncate">{friend.nickname || 'Send a message'}</p>
      </div>
    </button>
  )

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <h2 className="text-6xl font-black tracking-tighter uppercase leading-none">SoulSync</h2>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Direct emotional synchronization</p>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('matching')}
            className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
              activeTab === 'matching' ? 'bg-accent text-white shadow-lg' : 'text-gray-500 hover:text-accent'
            }`}
          >
            Matching
          </button>
          <button
            onClick={() => setActiveTab('social')}
            className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all relative ${
              activeTab === 'social' ? 'bg-accent text-white shadow-lg' : 'text-gray-500 hover:text-accent'
            }`}
          >
            Social
            {sessions.length > 0 && activeTab !== 'social' && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-white text-[10px] font-black rounded-full flex items-center justify-center">
                {sessions.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {activeTab === 'matching' ? (
        <MatchingContent />
      ) : (
        <div className="h-[700px] bg-white rounded-[3rem] shadow-xl overflow-hidden border border-black/5 flex">
          <div className="w-20 bg-gray-50 border-r border-black/5 flex flex-col items-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-accent/10 flex items-center justify-center">
              {userAvatar ? (
                <img src={getAvatarUrl(userAvatar)} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">👤</span>
              )}
            </div>
            <div className="w-8 h-[1px] bg-gray-200" />

            <button
              onClick={() => setSocialCategory('chats')}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                socialCategory === 'chats' ? 'bg-accent text-white' : 'hover:bg-gray-100 text-gray-400'
              }`}
              title="Chats"
            >
              <span className="text-xl">💬</span>
            </button>
            <button
              onClick={() => setSocialCategory('friends')}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                socialCategory === 'friends' ? 'bg-accent text-white' : 'hover:bg-gray-100 text-gray-400'
              }`}
              title="Friends"
            >
              <span className="text-xl">👥</span>
            </button>
          </div>

          <div className="w-80 border-r border-black/5 flex flex-col">
            <div className="p-4 border-b border-black/5">
              <h3 className="font-black text-sm uppercase tracking-widest text-gray-800">
                {socialCategory === 'chats' ? 'Synchronized Echoes' : 'Friends'}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {socialCategory === 'chats' ? (
                sessions.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <p className="text-gray-400 font-bold text-sm">No conversations yet</p>
                    <p className="text-gray-300 text-xs mt-2">Start matching to connect!</p>
                  </div>
                ) : (
                  sessions.map(session => renderConversationItem(session, currentSessionId === session.id))
                )
              ) : (
                isLoadingFriends ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-gray-200 border-t-accent rounded-full animate-spin" />
                  </div>
                ) : mutualFriends.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <p className="text-gray-400 font-bold text-sm">No friends yet</p>
                    <p className="text-gray-300 text-xs mt-2">Follow someone who follows you back!</p>
                  </div>
                ) : (
                  mutualFriends.map(friend => renderFriendItem(friend))
                )
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {currentSession ? (
              renderChatDetail(currentSession)
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 mx-auto rounded-3xl bg-gray-50 flex items-center justify-center">
                    <span className="text-5xl">💬</span>
                  </div>
                  <div>
                    <p className="font-black text-gray-800 uppercase tracking-tight">Select a Chat</p>
                    <p className="text-gray-400 text-sm font-bold mt-1">Choose a conversation from the list</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
