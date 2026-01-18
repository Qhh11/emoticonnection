/**
 * PostCard - 帖子卡片组件
 * 支持有图模式和纯文字模式（大字报风格）
 * 便当盒风格，情绪标签发光效果，磨砂质感
 */

import { useState } from 'react'
import { Post, getMediaUrl } from '../../../services/api'
import { getAvatarUrl } from '../../../config/userAvatars'

interface PostCardProps {
  post: Post
  onClick: () => void
  onLike: (postId: string) => void
  userId?: string
}

// 情绪颜色映射
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
}

// 获取情绪颜色
function getMoodColors(emotion: string | null) {
  if (!emotion) return { bg: '#6B7280', text: '#ffffff' }
  // 首字母大写匹配
  const normalized = emotion.charAt(0).toUpperCase() + emotion.slice(1).toLowerCase()
  return MOOD_COLORS[normalized] || { bg: '#6B7280', text: '#ffffff' }
}

// 默认紫色渐变（无情绪时使用）
const DEFAULT_GRADIENT = 'linear-gradient(135deg, #9381BA 0%, #6B5B95 100%)'

export default function PostCard({ post, onClick, onLike, userId }: PostCardProps) {
  const [isLiking, setIsLiking] = useState(false)
  const [isLiked, setIsLiked] = useState(post.is_liked)
  const [likeCount, setLikeCount] = useState(post.like_count)

  const emotion = post.emotion || post.ai_emotion
  const colors = getMoodColors(emotion)
  const hasImage = post.media_urls && post.media_urls.length > 0
  const authorName = post.is_anonymous ? 'Anonymous' : (post.author_name || 'User')
  const authorInitial = post.is_anonymous ? '?' : (post.author_name?.charAt(0).toUpperCase() || 'U')

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isLiking || !userId) return

    setIsLiking(true)
    try {
      // 乐观更新
      if (isLiked) {
        setIsLiked(false)
        setLikeCount(prev => Math.max(0, prev - 1))
      } else {
        setIsLiked(true)
        setLikeCount(prev => prev + 1)
      }
      await onLike(post.id)
    } finally {
      setIsLiking(false)
    }
  }

  return (
    <div
      onClick={onClick}
      className="group relative rounded-3xl overflow-hidden cursor-pointer
        transform transition-all duration-300 ease-out
        hover:scale-[1.02] hover:shadow-xl
        active:scale-[0.98]"
      style={{
        aspectRatio: '4/5',
        boxShadow: emotion
          ? `inset 0 0 40px ${colors.bg}15, 0 4px 16px rgba(0,0,0,0.08)`
          : '0 4px 16px rgba(0,0,0,0.08)',
      }}
    >
      {/* 有图模式 */}
      {hasImage ? (
        <>
          {/* 图片区域 - 70% */}
          <div className="relative h-[70%] overflow-hidden">
            <img
              src={getMediaUrl(post.media_urls![0])}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* 渐变遮罩 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

            {/* 情绪标签 - 磨砂质感 */}
            {emotion && (
              <div
                className="absolute top-3 left-3 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-sm"
                style={{
                  backgroundColor: `${colors.bg}cc`,
                  color: colors.text,
                  boxShadow: `0 0 20px ${colors.bg}60`,
                }}
              >
                {emotion}
              </div>
            )}
          </div>

          {/* 底部信息区 - 30% */}
          <div className="h-[30%] bg-white p-4 flex flex-col justify-between">
            {/* 用户头像 + 用户名 */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                {post.author_avatar ? (
                  <img src={getAvatarUrl(post.author_avatar)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-xs font-black uppercase"
                    style={{
                      backgroundColor: colors.bg + '30',
                      color: colors.bg === '#F9D849' ? '#121212' : colors.bg,
                    }}
                  >
                    {authorInitial}
                  </div>
                )}
              </div>
              <span className="text-sm font-bold text-gray-700 truncate">
                {authorName}
              </span>
            </div>

            {/* 点赞和评论 */}
            <div className="flex items-center gap-4">
              {/* 点赞按钮 */}
              <button
                onClick={handleLike}
                className="flex items-center gap-1.5 text-gray-500 hover:text-pink-500 transition-colors"
              >
                <span
                  className={`text-lg transition-all duration-300 ${isLiking ? 'animate-bounce' : ''}`}
                  style={{
                    transform: isLiked ? 'scale(1.1)' : 'scale(1)',
                    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  {isLiked ? '❤️' : '🤍'}
                </span>
                <span className="text-xs font-bold">{likeCount}</span>
              </button>
              {/* 评论数 */}
              <div className="flex items-center gap-1.5 text-gray-500">
                <span className="text-lg">💬</span>
                <span className="text-xs font-bold">{post.comment_count}</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* 纯文字模式 - 大字报风格 */
        <div
          className="w-full h-full p-5 flex flex-col"
          style={{
            background: emotion
              ? `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg}99 100%)`
              : DEFAULT_GRADIENT,
          }}
        >
          {/* 情绪标签 - 磨砂质感 */}
          {emotion && (
            <div
              className="self-start px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-sm mb-4"
              style={{
                backgroundColor: 'rgba(255,255,255,0.25)',
                color: colors.text,
                boxShadow: '0 0 16px rgba(255,255,255,0.4)',
              }}
            >
              {emotion}
            </div>
          )}

          {/* 大字报内容 - 居中放大 */}
          <div className="flex-1 flex items-center justify-center px-2">
            <p
              className="text-xl md:text-2xl font-black leading-snug text-center line-clamp-4"
              style={{ color: emotion ? colors.text : '#ffffff' }}
            >
              "{post.content.slice(0, 100)}{post.content.length > 100 ? '...' : ''}"
            </p>
          </div>

          {/* 底部信息 */}
          <div
            className="pt-4 mt-auto border-t flex items-center justify-between"
            style={{ borderColor: 'rgba(255,255,255,0.2)' }}
          >
            {/* 用户头像 + 用户名 */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md overflow-hidden flex-shrink-0">
                {post.author_avatar ? (
                  <img src={getAvatarUrl(post.author_avatar)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-[10px] font-black uppercase"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.25)',
                      color: emotion ? colors.text : '#ffffff',
                    }}
                  >
                    {authorInitial}
                  </div>
                )}
              </div>
              <span
                className="text-xs font-bold truncate max-w-[80px]"
                style={{ color: emotion ? colors.text : '#ffffff', opacity: 0.9 }}
              >
                {authorName}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* 点赞按钮 */}
              <button
                onClick={handleLike}
                className="flex items-center gap-1 transition-transform"
                style={{
                  color: emotion ? colors.text : '#ffffff',
                  transform: isLiking ? 'scale(0.9)' : 'scale(1)',
                }}
              >
                <span
                  className="text-base"
                  style={{
                    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    transform: isLiked ? 'scale(1.2)' : 'scale(1)',
                  }}
                >
                  {isLiked ? '❤️' : '🤍'}
                </span>
                <span className="text-xs font-bold">{likeCount}</span>
              </button>
              {/* 评论数 */}
              <div
                className="flex items-center gap-1"
                style={{ color: emotion ? colors.text : '#ffffff' }}
              >
                <span className="text-base">💬</span>
                <span className="text-xs font-bold">{post.comment_count}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hover 效果 - 光晕增强 */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 80px ${colors.bg}25`,
        }}
      />
    </div>
  )
}

export { MOOD_COLORS, getMoodColors }
