/**
 * PostGrid - 帖子网格容器
 * 响应式瀑布流布局，支持无限滚动
 */

import { useEffect, useRef, useCallback } from 'react'
import { Post } from '../../../services/api'
import PostCard from './PostCard'

interface PostGridProps {
  posts: Post[]
  onPostClick: (post: Post) => void
  onLike: (postId: string) => void
  onLoadMore: () => void
  hasMore: boolean
  isLoading: boolean
  userId?: string
}

export default function PostGrid({
  posts,
  onPostClick,
  onLike,
  onLoadMore,
  hasMore,
  isLoading,
  userId,
}: PostGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // 无限滚动
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      if (entry.isIntersecting && hasMore && !isLoading) {
        onLoadMore()
      }
    },
    [hasMore, isLoading, onLoadMore]
  )

  useEffect(() => {
    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0.1,
    })

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [handleObserver])

  // 空状态
  if (!isLoading && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl mb-4">🌟</div>
        <h3 className="text-xl font-black text-gray-800 mb-2">No Posts Yet</h3>
        <p className="text-gray-500 font-medium">Be the first to share your vibe!</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* 三列瀑布流布局 */}
      <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
        {posts.map((post) => (
          <div key={post.id} className="break-inside-avoid mb-4">
            <PostCard
              post={post}
              onClick={() => onPostClick(post)}
              onLike={onLike}
              userId={userId}
            />
          </div>
        ))}
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}

      {/* 无限滚动哨兵 */}
      {hasMore && <div ref={sentinelRef} className="h-4" />}

      {/* 到底提示 */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8">
          <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">
            · You've seen it all ·
          </span>
        </div>
      )}
    </div>
  )
}
