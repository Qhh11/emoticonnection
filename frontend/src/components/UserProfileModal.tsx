import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { userApi, socialApi, postApi, Post, getMediaUrl } from '../services/api'
import { getAvatarUrl } from '../config/userAvatars'
import PostDetailModal from '../pages/community/components/PostDetailModal'

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

export default function UserProfileModal({ userId, currentUserId, isOpen, onClose }: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<SocialStats | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)

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

  const getEmotionColor = (emotion: string | null): string => {
    const colors: Record<string, string> = {
      'Joy': '#F9D849',
      'Sad': '#3266B1',
      'Angry': '#D32F2F',
      'Fear': '#9381BA',
      'Disgust': '#66B04C',
      'Anxious': '#E67E22',
      'Bored': '#4B4E91',
      'Awkward': '#D278A3',
      'Envy': '#2BA8A4'
    }
    return colors[emotion || ''] || '#4B4E91'
  }

  if (!isOpen) return null

  return <>{[createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
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

            {/* User's Posts - Overlapping card style */}
            {posts.length > 0 && (
              <div className="pb-8">
                <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4 px-8">
                  Their Moments
                </h3>
                <div className="card-stack overflow-x-auto pb-4 px-8">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className="card-pullable w-64 h-80 rounded-2xl overflow-hidden cursor-pointer shadow-lg flex-shrink-0"
                      style={{ backgroundColor: getEmotionColor(post.emotion || post.ai_emotion) }}
                    >
                      {/* Post with image */}
                      {post.media_urls && post.media_urls.length > 0 ? (
                        <div className="relative w-full h-full">
                          <img
                            src={getMediaUrl(post.media_urls[0])}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <p className="text-white text-sm font-bold line-clamp-3">{post.content}</p>
                            <p className="text-white/60 text-xs mt-2">{formatDate(post.created_at)}</p>
                          </div>
                        </div>
                      ) : (
                        /* Text-only post */
                        <div className="p-6 h-full flex flex-col justify-between">
                          <p className="text-white text-sm font-bold line-clamp-8">{post.content}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-white/60 text-xs">{formatDate(post.created_at)}</span>
                            {(post.emotion || post.ai_emotion) && (
                              <span className="text-white/80 text-xs capitalize">{post.emotion || post.ai_emotion}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
  ),

  // PostDetailModal - separate portal for post detail view
  selectedPost && createPortal(
    <PostDetailModal
      post={selectedPost}
      isOpen={!!selectedPost}
      onClose={() => setSelectedPost(null)}
      onLike={(postId) => {
        setPosts(prev => prev.map(p =>
          p.id === postId
            ? { ...p, is_liked: !p.is_liked, like_count: p.is_liked ? p.like_count - 1 : p.like_count + 1 }
            : p
        ))
      }}
      userId={currentUserId}
      onViewProfile={() => {}}
    />,
    document.body
  )
  ].filter(Boolean)}</>
}
