/**
 * CommunityView - 社区主页面
 * 重构版：使用网格布局、Following/Exploring Tab、Modal 弹窗
 * 三维联动系统：内容 -> 统计 -> 背景
 */

import { useState, useEffect, useCallback } from 'react'
import { postApi, Post, mediaApi } from '../../services/api'
import { useNotification } from '../../contexts/NotificationContext'

// 导入子组件
import CommunityHeader from './components/CommunityHeader'
import PostGrid from './components/PostGrid'
import PostDetailModal from './components/PostDetailModal'
import CreatePostModal, { CreatePostData } from './components/CreatePostModal'
interface CommunityViewProps {
  onInteract: (e: React.MouseEvent) => void
  userId?: string
  userNickname?: string
  onPostCreated?: () => void
  onPointsChanged?: () => void
  onViewProfile?: (userId: string) => void
  onPostDetailChange?: (isOpen: boolean, postContent?: string, postEmotion?: string, hasImage?: boolean) => void  // Callback when post detail modal opens/closes
  onCreatePostChange?: (isOpen: boolean) => void  // Callback when create post modal opens/closes
  onRequestPolish?: (content: string) => void  // Callback to request polish from avatar
  onPolishReady?: (fn: () => boolean) => void  // Register polish function for Avatar click trigger, returns true if content exists
  polishedContent?: string | null  // Polished content from avatar assistant
  onPolishedContentConsumed?: () => void  // Callback when polished content is consumed
}

export default function CommunityView({
  //onInteract,
  userId,
  userNickname,
  onPostCreated,
  onPointsChanged,
  onViewProfile,
  onPostDetailChange,
  onCreatePostChange,
  onRequestPolish,
  onPolishReady,
  polishedContent,
  onPolishedContentConsumed,
}: CommunityViewProps) {
  // Notification context for showing unread comment badges
  const { unreadCommentsByPost, communityBadge } = useNotification()

  // Tab 状态
  const [activeTab, setActiveTab] = useState<'following' | 'exploring' | 'myposts'>('exploring')

  // 帖子数据
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)


  // Modal 状态
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)

  // 加载帖子
  const loadPosts = useCallback(async (reset = false) => {
    if (!reset && isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const currentPage = reset ? 1 : page
      let response

      if (activeTab === 'myposts' && userId) {
        // Load user's own posts
        response = await postApi.getUserPosts(userId, { page: currentPage, include_anonymous: true })
      } else if (activeTab === 'following' && userId) {
        response = await postApi.getFollowingPosts({
          user_id: userId,
          page: currentPage,
          page_size: 20,
        })
      } else {
        response = await postApi.getPosts({
          viewer_id: userId,
          page: currentPage,
          page_size: 20,
        })
      }

      if (reset) {
        setPosts(response.posts)
        setPage(2)
      } else {
        setPosts((prev) => [...prev, ...response.posts])
        setPage((prev) => prev + 1)
      }

      setHasMore(response.posts.length === 20)
    } catch (err) {
      console.error('Failed to load posts:', err)
      setError('Failed to load posts')
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, userId, page, isLoading])

  // 初始加载
  useEffect(() => {
    loadPosts(true)
  }, [activeTab, userId])

  // Tab 切换
  const handleTabChange = (tab: 'following' | 'exploring' | 'myposts') => {
    setActiveTab(tab)
    setPosts([])
    setPage(1)
    setHasMore(true)
  }

  // 加载更多
  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadPosts()
    }
  }

  // 点赞处理
  const handleLike = async (postId: string) => {
    if (!userId) return

    const post = posts.find((p) => p.id === postId)
    if (!post) return

    try {
      if (post.is_liked) {
        await postApi.unlikePost(postId, userId)
      } else {
        await postApi.likePost(postId, userId)
      }

      // 更新本地状态
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                is_liked: !p.is_liked,
                like_count: p.is_liked ? p.like_count - 1 : p.like_count + 1,
              }
            : p
        )
      )
    } catch (err) {
      console.error('Failed to like post:', err)
    }
  }

  // 创建帖子
  const handleCreatePost = async (data: CreatePostData) => {
    if (!userId) throw new Error('Please login first')

    // 上传图片
    let mediaUrls: string[] = []
    if (data.images.length > 0) {
      try {
        const uploadPromises = data.images.map((file) => mediaApi.upload(file))
        const results = await Promise.all(uploadPromises)
        mediaUrls = results.map((r) => r.media_url)
      } catch (err) {
        throw new Error('Failed to upload images')
      }
    }

    // 创建帖子
    const newPost = await postApi.createPost({
      author_id: userId,
      title: data.title,
      content: data.content,
      is_anonymous: data.isAnonymous,
      post_type: mediaUrls.length > 0 ? 'image' : 'text',
      visibility: 'public',
      emotion: data.emotion,
      emotion_color: data.emotionColor,  // Pass custom emotion color
      media_urls: mediaUrls,
    })

    // 添加到列表顶部
    const postWithNickname = {
      ...newPost,
      author_name: data.isAnonymous ? null : (userNickname || newPost.author_name),
    }
    setPosts((prev) => [postWithNickname, ...prev])

    // 通知父组件
    onPostCreated?.()
    onPointsChanged?.()
  }

  // 帖子卡片点击
  const handlePostClick = (post: Post) => {
    setSelectedPost(post)
    const hasImage = !!(post.media_urls && post.media_urls.length > 0)
    onPostDetailChange?.(true, post.content, post.emotion || post.ai_emotion || undefined, hasImage)
  }

  // 关闭帖子详情
  const handleClosePostDetail = () => {
    setSelectedPost(null)
    onPostDetailChange?.(false)
  }

  // 打开创建帖子弹窗
  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true)
    onCreatePostChange?.(true)
  }

  // 关闭创建帖子弹窗
  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false)
    onCreatePostChange?.(false)
  }


  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      {/* 主内容区 - 无局部背景，使用全局 Aurora 背景 */}
      <main className="w-full space-y-8 relative z-10">
        {/* Header */}
        <CommunityHeader
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onCreatePost={handleOpenCreateModal}
          userNickname={userNickname}
          myPostsBadge={communityBadge}
        />

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm font-bold">
            {error}
            <button onClick={() => loadPosts(true)} className="ml-4 underline">
              Retry
            </button>
          </div>
        )}

        {/* Main Content - Full Width */}
        <PostGrid
          posts={posts}
          onPostClick={handlePostClick}
          onLike={handleLike}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          isLoading={isLoading}
          userId={userId}
          unreadCommentsByPost={activeTab === 'myposts' ? unreadCommentsByPost : undefined}
        />
      </main>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSubmit={handleCreatePost}
        userId={userId || ''}
        onRequestPolish={onRequestPolish}
        onPolishReady={onPolishReady}
        polishedContent={polishedContent}
        onPolishedContentConsumed={onPolishedContentConsumed}
      />

      {/* Post Detail Modal */}
      <PostDetailModal
        post={selectedPost}
        isOpen={!!selectedPost}
        onClose={handleClosePostDetail}
        onLike={handleLike}
        userId={userId}
        onViewProfile={onViewProfile}
        onPointsChanged={onPointsChanged}
      />

    </div>
  )
}
