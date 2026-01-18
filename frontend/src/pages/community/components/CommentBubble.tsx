/**
 * CommentBubble - 气泡评论组件
 * 黏土块质感的对话框样式，区分自己/他人评论
 */

import { Comment } from '../../../services/api'

interface CommentBubbleProps {
  comment: Comment
  isOwn: boolean
  onViewProfile?: (userId: string) => void
}

// 时间格式化
function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function CommentBubble({ comment, isOwn, onViewProfile }: CommentBubbleProps) {
  const authorName = comment.is_anonymous ? 'Anonymous' : (comment.author_name || 'User')

  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <button
        onClick={() => !comment.is_anonymous && onViewProfile?.(comment.author_id)}
        className={`
          w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center
          text-sm font-black uppercase
          ${comment.is_anonymous ? 'cursor-default' : 'cursor-pointer hover:ring-2 ring-black/10'}
          transition-all
        `}
        style={{
          backgroundColor: comment.is_anonymous ? '#9CA3AF' : '#E5E7EB',
        }}
        disabled={comment.is_anonymous}
      >
        {comment.is_anonymous ? '?' : authorName.charAt(0)}
      </button>

      {/* Bubble */}
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%]`}>
        {/* Author name */}
        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1 px-1">
          {isOwn ? 'You' : authorName}
        </span>

        {/* Message bubble */}
        <div
          className={`
            px-4 py-3 rounded-2xl
            shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)]
            ${isOwn
              ? 'bg-black text-white rounded-br-sm'
              : 'bg-gray-100 text-gray-800 rounded-bl-sm'
            }
          `}
        >
          <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap break-words">
            {comment.content}
          </p>
        </div>

        {/* Timestamp and like */}
        <div className="flex items-center gap-3 mt-1 px-1">
          <span className="text-[10px] text-gray-400">
            {formatTime(comment.created_at)}
          </span>
          {comment.like_count > 0 && (
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <span className="text-pink-400">❤</span>
              {comment.like_count}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
