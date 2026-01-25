/**
 * PostCard - 帖子卡片组件
 * 极致透明玻璃拟态风格
 * 背景: rgba(255, 255, 255, 0.05)
 * 边框: 1px solid rgba(255, 255, 255, 0.15)
 * 模糊: backdrop-filter: blur(25px)
 * 无发光阴影
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

// 获取情绪颜色 - 优先使用自定义颜色
function getMoodColors(emotion: string | null, customColor?: string | null) {
  // If custom color provided, use it
  if (customColor) {
    // Determine text color based on brightness
    const hex = customColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return { bg: customColor, text: brightness > 128 ? '#121212' : '#ffffff' }
  }

  if (!emotion) return { bg: '#9381BA', text: '#ffffff' } // 默认紫色
  const normalized = emotion.charAt(0).toUpperCase() + emotion.slice(1).toLowerCase()
  return MOOD_COLORS[normalized] || { bg: '#9381BA', text: '#ffffff' }
}

export default function PostCard({ post, onClick, onLike, userId }: PostCardProps) {
  const [isLiking, setIsLiking] = useState(false)
  const [isLiked, setIsLiked] = useState(post.is_liked)
  const [likeCount, setLikeCount] = useState(post.like_count)

  const emotion = post.emotion || post.ai_emotion
  const colors = getMoodColors(emotion, post.emotion_color)
  const hasImage = post.media_urls && post.media_urls.length > 0
  const authorName = post.is_anonymous ? 'Anonymous' : (post.author_name || 'User')
  const authorInitial = post.is_anonymous ? '?' : (post.author_name?.charAt(0).toUpperCase() || 'U')

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isLiking || !userId) return

    setIsLiking(true)
    try {
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
        hover:scale-[1.02]
        active:scale-[0.98]"
      style={{
        aspectRatio: '4/5',
        background: 'rgba(255, 255, 255, 0.45)',
        backdropFilter: 'blur(35px)',
        WebkitBackdropFilter: 'blur(35px)',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* 有图模式 */}
      {hasImage ? (
        <>
          {/* 图片区域 */}
          <div className="relative h-[82%] p-2">
            <div className="w-full h-full rounded-2xl overflow-hidden relative">
              <img
                src={getMediaUrl(post.media_urls![0])}
                alt=""
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* 渐变遮罩 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

              {/* 情绪标签 - 纯色背景 */}
              {emotion && (
                <div
                  className="absolute top-3 left-3 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                  style={{
                    backgroundColor: colors.bg,
                    color: colors.text,
                  }}
                >
                  {emotion}
                </div>
              )}
            </div>
          </div>

          {/* 底部信息区 */}
          <div
            className="h-[18%] px-4 flex items-center justify-between"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <AuthorInfo
              authorAvatar={post.author_avatar}
              authorName={authorName}
              authorInitial={authorInitial}
              colors={colors}
            />
            <InteractionButtons
              isLiked={isLiked}
              likeCount={likeCount}
              commentCount={post.comment_count}
              isLiking={isLiking}
              onLike={handleLike}
            />
          </div>
        </>
      ) : (
        /* 纯文字模式 */
        <>
          {/* 内容区域 */}
          <div className="relative h-[82%] p-5 flex flex-col">
            {/* 情绪标签 - 纯色背景 */}
            {emotion && (
              <div
                className="self-start px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                style={{
                  backgroundColor: colors.bg,
                  color: colors.text,
                }}
              >
                {emotion}
              </div>
            )}

            {/* 内容 - 居中 */}
            <div className="flex-1 flex items-center justify-center px-2">
              <p className="text-xl md:text-2xl font-black leading-snug text-center line-clamp-4 text-gray-800">
                "{post.content.slice(0, 100)}{post.content.length > 100 ? '...' : ''}"
              </p>
            </div>
          </div>

          {/* 底部信息区 */}
          <div
            className="h-[18%] px-4 flex items-center justify-between"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <AuthorInfo
              authorAvatar={post.author_avatar}
              authorName={authorName}
              authorInitial={authorInitial}
              colors={colors}
            />
            <InteractionButtons
              isLiked={isLiked}
              likeCount={likeCount}
              commentCount={post.comment_count}
              isLiking={isLiking}
              onLike={handleLike}
            />
          </div>
        </>
      )}
    </div>
  )
}

// 作者信息子组件
interface AuthorInfoProps {
  authorAvatar?: string | null
  authorName: string
  authorInitial: string
  colors: { bg: string; text: string }
}

function AuthorInfo({ authorAvatar, authorName, authorInitial, colors }: AuthorInfoProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0"
        style={{ background: 'rgba(255, 255, 255, 0.2)' }}
      >
        {authorAvatar ? (
          <img src={getAvatarUrl(authorAvatar)} alt="" className="w-full h-full object-cover" />
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
      <span className="text-sm font-bold text-gray-700 truncate max-w-[80px]">
        {authorName}
      </span>
    </div>
  )
}

// 交互按钮子组件
interface InteractionButtonsProps {
  isLiked: boolean
  likeCount: number
  commentCount: number
  isLiking: boolean
  onLike: (e: React.MouseEvent) => void
}

function InteractionButtons({ isLiked, likeCount, commentCount, isLiking, onLike }: InteractionButtonsProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onLike}
        className="flex items-center gap-1 text-gray-500 hover:text-pink-500 transition-colors"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={isLiked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-all duration-300 ${isLiked ? 'text-accent' : 'text-gray-400'} ${isLiking ? 'animate-bounce' : ''}`}
          style={{
            transform: isLiked ? 'scale(1.1)' : 'scale(1)',
          }}
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <span className="text-xs font-bold">{likeCount}</span>
      </button>
      <div className="flex items-center gap-1 text-gray-500">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span className="text-xs font-bold">{commentCount}</span>
      </div>
    </div>
  )
}

export { MOOD_COLORS, getMoodColors }
