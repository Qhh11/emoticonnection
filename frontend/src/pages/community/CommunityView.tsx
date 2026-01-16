import { useState, useEffect } from 'react'
import { postApi, Post as ApiPost, TrendingTag, Comment } from '../../services/api'

// Mood color mapping
const MOOD_COLORS: Record<string, { bg: string; text: string }> = {
  'Joy': { bg: '#F9D849', text: '#121212' },
  'Sad': { bg: '#3266B1', text: '#ffffff' },
  'Angry': { bg: '#D32F2F', text: '#ffffff' },
  'Anxious': { bg: '#E67E22', text: '#ffffff' },
  'Bored': { bg: '#4B4E91', text: '#ffffff' },
  'Fear': { bg: '#9381BA', text: '#ffffff' },
  'Disgust': { bg: '#66B04C', text: '#ffffff' },
  'Awkward': { bg: '#D278A3', text: '#ffffff' },
  'Envy': { bg: '#2BA8A4', text: '#ffffff' },
  'happy': { bg: '#F9D849', text: '#121212' },
  'sad': { bg: '#3266B1', text: '#ffffff' },
  'angry': { bg: '#D32F2F', text: '#ffffff' },
  'anxious': { bg: '#E67E22', text: '#ffffff' },
  'neutral': { bg: '#4B4E91', text: '#ffffff' },
}

const getColorForMood = (mood: string | null) => {
  if (!mood) return { bg: '#4B4E91', text: '#ffffff' }
  return MOOD_COLORS[mood] || MOOD_COLORS[mood.toLowerCase()] || { bg: '#4B4E91', text: '#ffffff' }
}

interface PostCardProps {
  post: ApiPost
  onResonate: (e: React.MouseEvent) => void
  onLike: (postId: string) => void
  userId?: string
  onPointsChanged?: () => void
  onViewProfile?: (userId: string) => void
}

function PostCard({ post, onResonate, onLike, userId, onPointsChanged, onViewProfile }: PostCardProps) {
  const [liked, setLiked] = useState(post.is_liked)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentInput, setCommentInput] = useState('')
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [isPostingComment, setIsPostingComment] = useState(false)
  const [commentCount, setCommentCount] = useState(post.comment_count)
  const [isLiking, setIsLiking] = useState(false)

  const colors = getColorForMood(post.emotion || post.ai_emotion)

  const handleLike = async (e: React.MouseEvent) => {
    console.log('handleLike called:', { postId: post.id, userId, isLiking, liked })
    if (!userId) {
      console.log('No userId, returning')
      return
    }
    if (isLiking) {
      console.log('Already liking, returning')
      return
    }

    setIsLiking(true)
    try {
      if (liked) {
        console.log('Unliking post:', post.id)
        await postApi.unlikePost(post.id, userId)
        setLikeCount(prev => prev - 1)
      } else {
        console.log('Liking post:', post.id)
        await postApi.likePost(post.id, userId)
        setLikeCount(prev => prev + 1)
      }
      setLiked(!liked)
      onResonate(e)
      onLike(post.id)
      console.log('Like action completed successfully')
    } catch (err) {
      console.error('Failed to like/unlike post:', err)
    } finally {
      setIsLiking(false)
    }
  }

  const handleToggleComments = async () => {
    if (!showComments && comments.length === 0) {
      setIsLoadingComments(true)
      try {
        const response = await postApi.getComments(post.id)
        setComments(response.comments)
      } catch (err) {
        console.error('Failed to load comments:', err)
      } finally {
        setIsLoadingComments(false)
      }
    }
    setShowComments(!showComments)
  }

  const handlePostComment = async () => {
    if (!userId || !commentInput.trim()) return

    setIsPostingComment(true)
    try {
      const newComment = await postApi.createComment(post.id, {
        author_id: userId,
        content: commentInput,
        is_anonymous: false
      })
      setComments(prev => [newComment, ...prev])
      setCommentCount(prev => prev + 1)
      setCommentInput('')
      // Refresh points after commenting (+5 points)
      if (onPointsChanged) {
        onPointsChanged()
      }
    } catch (err) {
      console.error('Failed to post comment:', err)
    } finally {
      setIsPostingComment(false)
    }
  }

  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}H AGO`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}D AGO`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="p-10 rounded-[2.5rem] border border-black/[0.05] shadow-xl flex flex-col justify-between transition-all hover:scale-[1.02]" style={{ backgroundColor: colors.bg }}>
      <div className="flex justify-between items-start mb-10">
        <div className="flex items-center space-x-4">
          <div
            className={`w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shadow-inner border border-white/20 ${!post.is_anonymous ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
            onClick={() => !post.is_anonymous && onViewProfile?.(post.author_id)}
          >
            {post.is_anonymous ? '🎭' : '👤'}
          </div>
          <div className="space-y-0.5">
            <p
              className={`text-[13px] font-black uppercase tracking-widest ${!post.is_anonymous ? 'cursor-pointer hover:underline' : ''}`}
              style={{ color: colors.text }}
              onClick={() => !post.is_anonymous && onViewProfile?.(post.author_id)}
            >
              {post.is_anonymous ? 'Anonymous' : (post.author_name || 'User')}
            </p>
            <p className="text-[14px] font-black uppercase opacity-60" style={{ color: colors.text }}>
              {formatTimestamp(post.created_at)}
            </p>
          </div>
        </div>
        <div className="text-[14px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white/20" style={{ color: colors.text }}>
          {post.emotion || post.ai_emotion || 'Neutral'}
        </div>
      </div>
      <p className="text-2xl font-black tracking-tight leading-snug mb-10" style={{ color: colors.text }}>{post.content}</p>
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {post.tags.map(tag => (
            <span key={tag} className="text-[11px] font-black uppercase tracking-widest opacity-70 px-2 py-1 rounded-full bg-white/10" style={{ color: colors.text }}>
              #{tag}
            </span>
          ))}
        </div>
      )}
      <div className="flex justify-between items-center pt-8 border-t border-white/10">
        <div className="flex space-x-8">
          <button onClick={handleLike} disabled={isLiking} className={`flex items-center space-x-2 transition-transform active:scale-90 ${liked ? 'scale-110' : ''} ${isLiking ? 'opacity-50' : ''}`} style={{ color: colors.text }}>
            <span className="text-lg">{liked ? '❤️' : '🤍'}</span>
            <span className="text-[13px] font-black">{likeCount}</span>
          </button>
          <button onClick={handleToggleComments} className="flex items-center space-x-2 hover:scale-105 transition-transform" style={{ color: colors.text }}>
            <span className="text-lg">💬</span>
            <span className="text-[13px] font-black">{commentCount}</span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
          {/* Comment Input */}
          {userId && (
            <div className="flex space-x-3">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-4 py-3 rounded-xl bg-white/20 border border-white/10 text-sm font-bold placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                style={{ color: colors.text }}
                onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
              />
              <button
                onClick={handlePostComment}
                disabled={!commentInput.trim() || isPostingComment}
                className="px-4 py-3 rounded-xl bg-white/30 text-sm font-black uppercase tracking-widest hover:bg-white/40 transition-all disabled:opacity-50"
                style={{ color: colors.text }}
              >
                {isPostingComment ? '...' : 'Post'}
              </button>
            </div>
          )}

          {/* Comments List */}
          {isLoadingComments ? (
            <div className="text-center py-4">
              <span className="text-sm font-bold opacity-60" style={{ color: colors.text }}>Loading comments...</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-4">
              <span className="text-sm font-bold opacity-60" style={{ color: colors.text }}>No comments yet. Be the first!</span>
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {comments.map(comment => (
                <div key={comment.id} className="p-4 rounded-xl bg-white/10">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[12px] font-black uppercase tracking-widest opacity-80" style={{ color: colors.text }}>
                      {comment.is_anonymous ? 'Anonymous' : (comment.author_name || 'User')}
                    </span>
                    <span className="text-[11px] font-bold opacity-50" style={{ color: colors.text }}>
                      {formatTimestamp(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm font-bold" style={{ color: colors.text }}>{comment.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface TrendingItemProps {
  tag: TrendingTag
}

function TrendingItem({ tag }: TrendingItemProps) {
  const colors = ['#F9D849', '#3266B1', '#9381BA', '#D32F2F', '#E67E22', '#66B04C', '#D278A3', '#2BA8A4', '#4B4E91']
  const colorIndex = tag.tag.length % colors.length

  const formatCount = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
    return count.toString()
  }

  return (
    <div className="flex items-center justify-between group cursor-pointer">
      <div className="flex items-center space-x-3">
        <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: colors[colorIndex] }}></div>
        <span className="text-[14px] font-black uppercase tracking-tighter text-gray-800 group-hover:text-accent transition-colors">#{tag.tag}</span>
      </div>
      <span className="text-[12px] font-black text-gray-300 uppercase tracking-widest">{formatCount(tag.post_count)}</span>
    </div>
  )
}

interface CommunityViewProps {
  onInteract: (e: React.MouseEvent) => void
  userId?: string
  userNickname?: string
  onPostCreated?: () => void
  onPointsChanged?: () => void
  onViewProfile?: (userId: string) => void
}

export default function CommunityView({ onInteract, userId, userNickname, onPostCreated, onPointsChanged, onViewProfile }: CommunityViewProps) {
  const [posts, setPosts] = useState<ApiPost[]>([])
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'trending' | 'latest'>('trending')

  // New post state
  const [showNewPost, setShowNewPost] = useState(false)
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostAnonymous, setNewPostAnonymous] = useState(false)
  const [isPosting, setIsPosting] = useState(false)

  useEffect(() => {
    loadPosts()
    loadTrendingTags()
  }, [userId])

  const loadPosts = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await postApi.getPosts({ viewer_id: userId, page_size: 20 })
      setPosts(response.posts)
    } catch (err) {
      console.error('Failed to load posts:', err)
      setError('Failed to load posts')
    } finally {
      setIsLoading(false)
    }
  }

  const loadTrendingTags = async () => {
    try {
      const response = await postApi.getTrendingTags(5)
      setTrendingTags(response.tags)
    } catch (err) {
      console.error('Failed to load trending tags:', err)
    }
  }

  const handleCreatePost = async () => {
    if (!userId || !newPostContent.trim()) return

    setIsPosting(true)
    try {
      const newPost = await postApi.createPost({
        author_id: userId,
        content: newPostContent,
        is_anonymous: newPostAnonymous,
        post_type: 'text',
        visibility: 'public',
      })
      // Use nickname for display if not anonymous
      const postWithNickname = {
        ...newPost,
        author_name: newPostAnonymous ? null : (userNickname || newPost.author_name)
      }
      setPosts(prev => [postWithNickname, ...prev])
      setNewPostContent('')
      setNewPostAnonymous(false)
      setShowNewPost(false)
      // Notify parent to refresh user posts and points
      if (onPostCreated) {
        onPostCreated()
      }
      if (onPointsChanged) {
        onPointsChanged()
      }
    } catch (err) {
      console.error('Failed to create post:', err)
    } finally {
      setIsPosting(false)
    }
  }

  const handleLike = (postId: string) => {
    // Update local state if needed
    console.log('Liked post:', postId)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <h2 className="text-6xl font-black tracking-tighter uppercase leading-none">Community</h2>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Synchronized frequencies around the world</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowNewPost(!showNewPost)}
            className="px-6 py-3 rounded-full text-[13px] font-black uppercase tracking-widest bg-accent text-accent-inverse shadow-lg hover:scale-105 transition-transform"
          >
            + New Post
          </button>
          <div className="flex bg-white p-1.5 rounded-full border border-black/5 shadow-sm">
            <button
              onClick={() => setActiveTab('trending')}
              className={`px-8 py-3 rounded-full text-[13px] font-black uppercase tracking-widest transition-all ${activeTab === 'trending' ? 'bg-accent text-accent-inverse shadow-lg' : 'text-gray-400 hover:text-accent'}`}
            >
              Trending
            </button>
            <button
              onClick={() => setActiveTab('latest')}
              className={`px-8 py-3 rounded-full text-[13px] font-black uppercase tracking-widest transition-all ${activeTab === 'latest' ? 'bg-accent text-accent-inverse shadow-lg' : 'text-gray-400 hover:text-accent'}`}
            >
              Latest
            </button>
          </div>
        </div>
      </header>

      {/* New Post Form */}
      {showNewPost && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-black/[0.03] shadow-xl space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-lg uppercase tracking-tight">Share Your Frequency</h3>
            <button onClick={() => setShowNewPost(false)} className="text-gray-400 hover:text-gray-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="What's your current vibe?"
            className="w-full min-h-[120px] p-4 bg-gray-50 rounded-2xl border border-black/5 focus:outline-none focus:ring-2 focus:ring-accent text-lg font-bold resize-none"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={newPostAnonymous}
                onChange={(e) => setNewPostAnonymous(e.target.checked)}
                className="w-5 h-5 rounded accent-accent"
              />
              <span className="text-[13px] font-black uppercase tracking-widest text-gray-500">Post Anonymously</span>
            </label>
            <button
              onClick={handleCreatePost}
              disabled={!newPostContent.trim() || isPosting}
              className="px-8 py-3 rounded-full text-[13px] font-black uppercase tracking-widest bg-accent text-accent-inverse shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPosting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
          {error}
          <button onClick={loadPosts} className="ml-4 underline">Retry</button>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-8">
          {posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 font-bold text-lg">No posts yet. Be the first to share!</p>
            </div>
          ) : (
            posts.map(post => (
              <PostCard key={post.id} post={post} onResonate={onInteract} onLike={handleLike} userId={userId} onPointsChanged={onPointsChanged} onViewProfile={onViewProfile} />
            ))
          )}
        </div>
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white p-10 rounded-[2.5rem] border border-black/[0.03] space-y-8">
            <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-300">Hot Frequencies</h4>
            <div className="space-y-6">
              {trendingTags.length > 0 ? (
                trendingTags.map(tag => (
                  <TrendingItem key={tag.tag} tag={tag} />
                ))
              ) : (
                <p className="text-gray-400 text-sm">No trending tags yet</p>
              )}
            </div>
          </div>

          <div className="bg-[#1a1a1a] p-10 rounded-[2.5rem] space-y-6 text-white overflow-hidden relative group">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/40 transition-colors"></div>
            <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-500 relative z-10">Series Drop</h4>
            <div className="space-y-2 relative z-10">
              <p className="text-2xl font-black tracking-tighter leading-tight">Neon Dream <br/>Limited Edition</p>
              <p className="text-[12px] font-black uppercase tracking-widest text-indigo-400">Available for 48h</p>
            </div>
            <button className="w-full py-4 bg-white text-black rounded-2xl font-black text-[13px] uppercase tracking-widest hover:bg-indigo-400 hover:text-white transition-all relative z-10">Claim Avatar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
