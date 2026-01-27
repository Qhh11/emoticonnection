import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { notificationApi } from '../services/api'

// WebSocket base URL
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

// Types
interface NotificationCounts {
  profile_total: number      // new_followers count
  chat_total: number         // sum of all unread chat messages
  community_total: number    // sum of all unread post comments
  new_followers: number
  unread_comments_by_post: Record<string, number>
  unread_chats_by_room: Record<string, number>
}

// User status change callback type
type UserStatusCallback = (userId: string, isOnline: boolean) => void

interface NotificationContextType {
  // Badge counts for Dashboard tabs
  profileBadge: number
  chatBadge: number
  communityBadge: number

  // Detailed counts
  newFollowersCount: number
  unreadCommentsByPost: Record<string, number>
  unreadChatsByRoom: Record<string, number>

  // Loading state
  isLoading: boolean

  // Actions
  refreshCounts: () => Promise<void>
  markFollowersRead: () => Promise<void>
  markChatRead: (roomId: string) => Promise<void>
  markPostCommentsRead: (postId: string) => Promise<void>
  markAllRead: () => Promise<void>

  // Track active chat room to suppress notifications
  setActiveRoomId: (roomId: string | null) => void

  // Subscribe to user status changes (for online/offline updates)
  subscribeToUserStatus: (callback: UserStatusCallback) => () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: ReactNode
  userId: string | null
}

export function NotificationProvider({ children, userId }: NotificationProviderProps) {
  const [counts, setCounts] = useState<NotificationCounts>({
    profile_total: 0,
    chat_total: 0,
    community_total: 0,
    new_followers: 0,
    unread_comments_by_post: {},
    unread_chats_by_room: {}
  })
  const [isLoading, setIsLoading] = useState(false)

  // Track active chat room to suppress notifications for it
  const activeRoomIdRef = useRef<string | null>(null)

  // User status change subscribers
  const userStatusCallbacksRef = useRef<Set<UserStatusCallback>>(new Set())

  const setActiveRoomId = useCallback((roomId: string | null) => {
    console.log('[NotificationContext] setActiveRoomId:', roomId)
    activeRoomIdRef.current = roomId
  }, [])

  // Subscribe to user status changes
  const subscribeToUserStatus = useCallback((callback: UserStatusCallback) => {
    userStatusCallbacksRef.current.add(callback)
    // Return unsubscribe function
    return () => {
      userStatusCallbacksRef.current.delete(callback)
    }
  }, [])

  // Fetch notification counts from API
  const refreshCounts = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    try {
      const data = await notificationApi.getCounts(userId)
      console.log('[NotificationContext] Fetched counts for user', userId, ':', data)
      setCounts(data)
    } catch (err) {
      console.error('Failed to fetch notification counts:', err)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Mark all follower notifications as read
  const markFollowersRead = useCallback(async () => {
    if (!userId) return

    try {
      await notificationApi.markRead(userId, 'new_follower')
      // Optimistically update local state
      setCounts(prev => ({
        ...prev,
        profile_total: 0,
        new_followers: 0
      }))
    } catch (err) {
      console.error('Failed to mark followers as read:', err)
      // Refresh to get accurate counts
      refreshCounts()
    }
  }, [userId, refreshCounts])

  // Mark chat notifications as read for a specific room
  const markChatRead = useCallback(async (roomId: string) => {
    if (!userId) return

    console.log('[NotificationContext] markChatRead called for room:', roomId)
    try {
      await notificationApi.markRead(userId, 'chat_message', roomId)
      console.log('[NotificationContext] markChatRead API success')
      // Optimistically update local state
      setCounts(prev => {
        const newUnreadChats = { ...prev.unread_chats_by_room }
        const roomCount = newUnreadChats[roomId] || 0
        delete newUnreadChats[roomId]
        const newCounts = {
          ...prev,
          chat_total: Math.max(0, prev.chat_total - roomCount),
          unread_chats_by_room: newUnreadChats
        }
        console.log('[NotificationContext] Updated counts:', newCounts)
        return newCounts
      })
    } catch (err) {
      console.error('Failed to mark chat as read:', err)
      refreshCounts()
    }
  }, [userId, refreshCounts])

  // Mark post comment notifications as read
  const markPostCommentsRead = useCallback(async (postId: string) => {
    if (!userId) return

    try {
      await notificationApi.markRead(userId, 'post_comment', postId)
      // Optimistically update local state
      setCounts(prev => {
        const newUnreadComments = { ...prev.unread_comments_by_post }
        const postCount = newUnreadComments[postId] || 0
        delete newUnreadComments[postId]
        return {
          ...prev,
          community_total: Math.max(0, prev.community_total - postCount),
          unread_comments_by_post: newUnreadComments
        }
      })
    } catch (err) {
      console.error('Failed to mark comments as read:', err)
      refreshCounts()
    }
  }, [userId, refreshCounts])

  // Mark all notifications as read
  const markAllRead = useCallback(async () => {
    if (!userId) return

    try {
      await notificationApi.markAllRead(userId)
      setCounts({
        profile_total: 0,
        chat_total: 0,
        community_total: 0,
        new_followers: 0,
        unread_comments_by_post: {},
        unread_chats_by_room: {}
      })
    } catch (err) {
      console.error('Failed to mark all as read:', err)
      refreshCounts()
    }
  }, [userId, refreshCounts])

  // Initial fetch when userId changes
  useEffect(() => {
    if (userId) {
      refreshCounts()
    } else {
      // Reset counts when logged out
      setCounts({
        profile_total: 0,
        chat_total: 0,
        community_total: 0,
        new_followers: 0,
        unread_comments_by_post: {},
        unread_chats_by_room: {}
      })
    }
  }, [userId, refreshCounts])

  // WebSocket connection for real-time notification updates
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!userId) {
      // Close existing connection when logged out
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      return
    }

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(`${WS_BASE_URL}/ws/presence/${userId}`)

        ws.onopen = () => {
          console.log('[NotificationContext] WebSocket connected for presence')
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)

            // Handle notification update events
            if (data.event_type === 'notification_update') {
              const notificationData = data.data
              console.log('[NotificationContext] Received notification update:', notificationData)

              // If this is a chat notification for the active room, ignore it
              // (the user is already viewing that chat, so no need to show badge)
              if (
                notificationData.notification_type === 'chat_message' &&
                notificationData.source_id === activeRoomIdRef.current
              ) {
                console.log('[NotificationContext] Ignoring notification for active room:', activeRoomIdRef.current)
                // Still mark it as read in background
                if (userId) {
                  notificationApi.markRead(userId, 'chat_message', notificationData.source_id)
                }
                return
              }

              // Refresh counts when we receive a notification
              refreshCounts()
            }

            // Handle user status events (online/offline)
            if (data.event_type === 'user_status') {
              const { user_id: statusUserId, status } = data.data
              const isOnline = status === 'online'
              console.log('[NotificationContext] User status update:', statusUserId, status)

              // Notify all subscribers
              userStatusCallbacksRef.current.forEach(callback => {
                callback(statusUserId, isOnline)
              })
            }
          } catch {
            // Ignore non-JSON messages (like pong)
          }
        }

        ws.onerror = (error) => {
          console.error('[NotificationContext] WebSocket error:', error)
        }

        ws.onclose = () => {
          console.log('[NotificationContext] WebSocket disconnected')
          wsRef.current = null
          // Attempt to reconnect after 5 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            if (userId) {
              connectWebSocket()
            }
          }, 5000)
        }

        wsRef.current = ws
      } catch (error) {
        console.error('[NotificationContext] Failed to connect WebSocket:', error)
      }
    }

    connectWebSocket()

    // Cleanup on unmount or userId change
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [userId, refreshCounts])

  // Periodic refresh (every 30 seconds as fallback if WebSocket fails)
  useEffect(() => {
    if (!userId) return

    const interval = setInterval(() => {
      refreshCounts()
    }, 30000)

    return () => clearInterval(interval)
  }, [userId, refreshCounts])

  return (
    <NotificationContext.Provider
      value={{
        profileBadge: counts.profile_total,
        chatBadge: counts.chat_total,
        communityBadge: counts.community_total,
        newFollowersCount: counts.new_followers,
        unreadCommentsByPost: counts.unread_comments_by_post,
        unreadChatsByRoom: counts.unread_chats_by_room,
        isLoading,
        refreshCounts,
        markFollowersRead,
        markChatRead,
        markPostCommentsRead,
        markAllRead,
        setActiveRoomId,
        subscribeToUserStatus
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}
