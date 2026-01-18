import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { userApi, socialApi, postApi, Post } from '../services/api'
import { getAvatarUrl } from '../config/userAvatars'

interface UserProfile {
  _id: string
  username: string
  nickname: string
  avatar: string
  points: number
  level: number
  bio?: string
}

interface SocialStats {
  following_count: number
  followers_count: number
}

interface UserProfileModalProps {
  userId: string
  currentUserId: string
  isOpen: boolean
  onClose: () => void
}

// Mood color mapping
const MOOD_COLORS: Record<string, { bg: string; text: string }> = {
  joy: { bg: '#F9D849', text: '#121212' },
  happy: { bg: '#F9D849', text: '#121212' },
  sad: { bg: '#3266B1', text: '#ffffff' },
  angry: { bg: '#D32F2F', text: '#ffffff' },
  anxious: { bg: '#E67E22', text: '#ffffff' },
  fear: { bg: '#9381BA', text: '#ffffff' },
  neutral: { bg: '#4B4E91', text: '#ffffff' },
  frustrated: { bg: '#D32F2F', text: '#ffffff' },
}

export default function UserProfileModal({ userId, currentUserId, isOpen, onClose }: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<SocialStats | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    if (isOpen && userId) {
      loadUserData()
    }
  }, [isOpen, userId])

  const loadUserData = async () => {
    setIsLoading(true)
    try {
      // Load user profile, stats, posts, and follow status in parallel
      const [userProfile, userStats, userPosts, followStatus] = await Promise.all([
        userApi.getUser(userId),
        userApi.getSocialStats(userId),
        postApi.getUserPosts(userId, { include_anonymous: false }),
        currentUserId ? socialApi.checkFollow(currentUserId, userId) : Promise.resolve({ is_following: false })
      ])

      setProfile(userProfile as unknown as UserProfile)
      setStats(userStats)
      setPosts(userPosts.posts || [])
      setIsFollowing(followStatus.is_following)
    } catch (err) {
      console.error('Failed to load user data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!currentUserId || followLoading) return

    setFollowLoading(true)
    try {
      if (isFollowing) {
        await socialApi.unfollow(currentUserId, userId)
        setIsFollowing(false)
        if (stats) {
          setStats({ ...stats, followers_count: stats.followers_count - 1 })
        }
      } else {
        await socialApi.follow(currentUserId, userId)
        setIsFollowing(true)
        if (stats) {
          setStats({ ...stats, followers_count: stats.followers_count + 1 })
        }
      }
    } catch (err) {
      console.error('Failed to follow/unfollow:', err)
    } finally {
      setFollowLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-accent rounded-full animate-spin"></div>
          </div>
        ) : profile ? (
          <div className="overflow-y-auto max-h-[90vh]">
            {/* Header with close button */}
            <div className="relative p-6 pb-0">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Profile Info */}
            <div className="px-8 pb-6 text-center">
              {/* Avatar */}
              <div className="w-24 h-24 mx-auto rounded-[2rem] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden shadow-lg border-4 border-white">
                <img src={getAvatarUrl(profile.avatar)} alt="" className="w-full h-full object-cover" />
              </div>

              {/* Username & Nickname */}
              <div className="mt-4 space-y-1">
                <h2 className="text-xl font-black uppercase tracking-tight">@{profile.username}</h2>
                <p className="text-gray-400 font-bold text-sm">{profile.nickname}</p>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="mt-3 text-gray-500 text-sm leading-relaxed px-4">
                  {profile.bio}
                </p>
              )}

              {/* Level & Points */}
              <div className="mt-3 inline-flex items-center space-x-3 px-4 py-2 bg-gray-50 rounded-full">
                <span className="text-sm font-black text-accent">Lv.{profile.level}</span>
                <span className="text-gray-300">·</span>
                <span className="text-sm font-bold text-gray-500">{profile.points} Energy</span>
              </div>

              {/* Stats */}
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-2xl">
                  <p className="text-2xl font-black">{posts.length}</p>
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Posts</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-2xl">
                  <p className="text-2xl font-black">{stats?.following_count || 0}</p>
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Following</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-2xl">
                  <p className="text-2xl font-black">{stats?.followers_count || 0}</p>
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Followers</p>
                </div>
              </div>

              {/* Follow Button - Only show if not viewing own profile */}
              {currentUserId && currentUserId !== userId && (
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`mt-6 w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all ${
                    isFollowing
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-black text-white hover:bg-gray-800'
                  } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>

            {/* User's Posts */}
            {posts.length > 0 && (
              <div className="px-8 pb-8">
                <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">
                  Their Moments
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {posts.slice(0, 6).map(post => {
                    const emotion = (post.emotion || post.ai_emotion || 'neutral').toLowerCase()
                    const colors = MOOD_COLORS[emotion] || MOOD_COLORS.neutral

                    return (
                      <div
                        key={post.id}
                        className="p-4 rounded-2xl"
                        style={{ backgroundColor: colors.bg }}
                      >
                        <p
                          className="text-sm font-bold line-clamp-3"
                          style={{ color: colors.text }}
                        >
                          {post.content}
                        </p>
                        <p
                          className="mt-2 text-xs opacity-70"
                          style={{ color: colors.text }}
                        >
                          {formatDate(post.created_at)}
                        </p>
                      </div>
                    )
                  })}
                </div>
                {posts.length > 6 && (
                  <p className="text-center text-gray-400 text-sm font-bold mt-4">
                    +{posts.length - 6} more posts
                  </p>
                )}
              </div>
            )}

            {/* No posts message */}
            {posts.length === 0 && (
              <div className="px-8 pb-8 text-center">
                <p className="text-gray-400 font-bold">No public posts yet</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400 font-bold">User not found</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
