import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { socialApi, FollowUser } from '../services/api'

interface FollowListModalProps {
  userId: string
  currentUserId: string
  type: 'following' | 'followers'
  isOpen: boolean
  onClose: () => void
  onViewProfile: (userId: string) => void
  onStatsChange?: () => void  // 当 follow/unfollow 后刷新统计
}

export default function FollowListModal({
  userId,
  currentUserId,
  type,
  isOpen,
  onClose,
  onViewProfile,
  onStatsChange
}: FollowListModalProps) {
  const [users, setUsers] = useState<FollowUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({})
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (isOpen && userId) {
      loadUsers()
    }
  }, [isOpen, userId, type])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const data = type === 'following'
        ? await socialApi.getFollowing(userId)
        : await socialApi.getFollowers(userId)

      setUsers(data)

      // Initialize following states
      const states: Record<string, boolean> = {}
      data.forEach(user => {
        states[user.id] = user.is_following
      })
      setFollowingStates(states)
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollowToggle = async (targetUserId: string) => {
    if (!currentUserId || loadingStates[targetUserId]) return

    setLoadingStates(prev => ({ ...prev, [targetUserId]: true }))

    try {
      const isCurrentlyFollowing = followingStates[targetUserId]
      if (isCurrentlyFollowing) {
        await socialApi.unfollow(currentUserId, targetUserId)
      } else {
        await socialApi.follow(currentUserId, targetUserId)
      }
      setFollowingStates(prev => ({ ...prev, [targetUserId]: !isCurrentlyFollowing }))
      // 通知父组件刷新统计
      onStatsChange?.()
    } catch (err) {
      console.error('Failed to toggle follow:', err)
    } finally {
      setLoadingStates(prev => ({ ...prev, [targetUserId]: false }))
    }
  }

  const handleUserClick = (clickedUserId: string) => {
    onClose()
    onViewProfile(clickedUserId)
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[80vh] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-black/5">
          <h2 className="text-xl font-black uppercase tracking-tight">
            {type === 'following' ? 'Following' : 'Followers'}
            <span className="ml-2 text-gray-400 font-bold">({users.length})</span>
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User List */}
        <div className="overflow-y-auto max-h-[60vh] p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-accent rounded-full animate-spin"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 font-bold">
                {type === 'following' ? 'Not following anyone yet' : 'No followers yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map(user => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors"
                >
                  <div
                    className="flex items-center space-x-4 cursor-pointer flex-1"
                    onClick={() => handleUserClick(user.id)}
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-2xl shadow-sm">
                      👤
                    </div>
                    <div>
                      <p className="font-black text-sm uppercase tracking-tight">@{user.username}</p>
                      <p className="text-gray-400 text-xs font-bold">{user.nickname || user.username}</p>
                    </div>
                  </div>

                  {/* Follow/Unfollow button - don't show for current user */}
                  {currentUserId && user.id !== currentUserId && (
                    <button
                      onClick={() => handleFollowToggle(user.id)}
                      disabled={loadingStates[user.id]}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        followingStates[user.id]
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-black text-white hover:bg-gray-800'
                      } ${loadingStates[user.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {loadingStates[user.id] ? '...' : followingStates[user.id] ? 'Following' : 'Follow'}
                    </button>
                  )}

                  {/* Show "You" badge for current user */}
                  {user.id === currentUserId && (
                    <span className="px-3 py-1.5 bg-accent/10 text-accent rounded-full text-xs font-black uppercase tracking-widest">
                      You
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
