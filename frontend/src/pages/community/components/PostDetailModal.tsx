/**
 * PostDetailModal - 帖子详情弹窗
 * 左侧/上方显示内容，右侧/下方显示评论
 * 底部固定点赞、评论输入
 */

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Post, Comment, postApi, getMediaUrl } from '../../../services/api'
import CommentBubble from './CommentBubble'
import { getMoodColors } from './PostCard'
import { getAvatarUrl } from '../../../config/userAvatars'
import ConfirmModal from '../../../components/ConfirmModal'

// 默认紫色渐变（无情绪时使用）
const DEFAULT_GRADIENT = 'linear-gradient(135deg, #9381BA 0%, #6B5B95 100%)'

interface PostDetailModalProps {
  post: Post | null
  isOpen: boolean
  onClose: () => void
  onLike: (postId: string) => void
  userId?: string
  onViewProfile?: (userId: string) => void
  onPointsChanged?: () => void
  onDelete?: (postId: string) => void
}

export default function PostDetailModal({
  post,
  isOpen,
  onClose,
  onLike,
  userId,
  onViewProfile,
  onPointsChanged,
  onDelete,
}: PostDetailModalProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const commentInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (post && isOpen) {
      setIsLiked(post.is_liked)
      setLikeCount(post.like_count)
      loadComments()
    }
  }, [post, isOpen])

  const loadComments = async () => {
    if (!post) return
    setIsLoadingComments(true)
    try {
      const response = await postApi.getComments(post.id)
      setComments(response.comments || [])
    } catch (error) {
      console.error('Failed to load comments:', error)
    } finally {
      setIsLoadingComments(false)
    }
  }

  const handleLike = async () => {
    if (!post || !userId) return
    try {
      if (isLiked) {
        setIsLiked(false)
        setLikeCount((prev) => Math.max(0, prev - 1))
        await postApi.unlikePost(post.id, userId)
      } else {
        setIsLiked(true)
        setLikeCount((prev) => prev + 1)
        await postApi.likePost(post.id, userId)
      }
      onLike(post.id)
    } catch (error) {
      // 回滚
      setIsLiked(!isLiked)
      setLikeCount(post.like_count)
    }
  }

  const handleSubmitComment = async () => {
    if (!post || !userId || !newComment.trim()) return

    setIsSubmittingComment(true)
    try {
      const comment = await postApi.createComment(post.id, {
        author_id: userId,
        content: newComment.trim(),
        is_anonymous: false,
      })
      setComments((prev) => [comment, ...prev])
      setNewComment('')
      onPointsChanged?.()
    } catch (error) {
      console.error('Failed to create comment:', error)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleDelete = async () => {
    if (!post || !onDelete) return

    setIsDeleting(true)
    try {
      onDelete(post.id)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (!isOpen || !post) return null

  const emotion = post.emotion || post.ai_emotion
  const colors = getMoodColors(emotion, post.emotion_color)
  const hasImage = post.media_urls && post.media_urls.length > 0
  const authorName = post.is_anonymous ? 'Anonymous' : (post.author_name || 'User')

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col lg:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Content */}
        <div className="lg:w-[60%] flex flex-col">
          {/* Image or Text Content */}
          {hasImage ? (
            <div className="relative aspect-square lg:aspect-auto lg:flex-1 bg-gray-100">
              <img
                src={getMediaUrl(post.media_urls![0])}
                alt=""
                className="w-full h-full object-contain"
              />
              {/* Emotion Tag */}
              {emotion && (
                <div
                  className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                  style={{
                    backgroundColor: colors.bg,
                    color: colors.text,
                    boxShadow: `0 0 16px ${colors.bg}80`,
                  }}
                >
                  {emotion}
                </div>
              )}
            </div>
          ) : (
            <div
              className="flex-1 min-h-[300px] p-8 flex flex-col justify-center"
              style={{
                background: emotion
                  ? `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg}99 100%)`
                  : DEFAULT_GRADIENT,
              }}
            >
              {/* Emotion Tag */}
              {emotion && (
                <div
                  className="self-start px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-6 backdrop-blur-sm"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    color: colors.text,
                    boxShadow: '0 0 16px rgba(255,255,255,0.4)',
                  }}
                >
                  {emotion}
                </div>
              )}
              <p
                className="text-2xl font-black leading-relaxed"
                style={{ color: emotion ? colors.text : '#ffffff' }}
              >
                "{post.content}"
              </p>
            </div>
          )}

          {/* Post text for image posts */}
          {hasImage && post.content && (
            <div className="p-6 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 leading-relaxed">
                {post.content}
              </p>
            </div>
          )}
        </div>

        {/* Right: Comments */}
        <div className="lg:w-[40%] flex flex-col border-l border-gray-100">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => !post.is_anonymous && onViewProfile?.(post.author_id)}
                className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-black uppercase
                  ${post.is_anonymous ? 'bg-gray-300 cursor-default' : 'bg-gray-200 hover:ring-2 ring-gray-300'}`}
                disabled={post.is_anonymous}
              >
                {post.is_anonymous ? '?' : (
                  post.author_avatar ? (
                    <img src={getAvatarUrl(post.author_avatar)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    authorName.charAt(0)
                  )
                )}
              </button>
              <div>
                <p className="text-sm font-black">{authorName}</p>
                <p className="text-[10px] text-gray-400">
                  {new Date(post.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Delete button - only for post author */}
              {onDelete && userId === post.author_id && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-600 text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {isDeleting ? '...' : 'Delete'}
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoadingComments ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 font-medium">No comments yet</p>
                <p className="text-xs text-gray-400 mt-1">Be the first to comment!</p>
              </div>
            ) : (
              comments.map((comment) => (
                <CommentBubble
                  key={comment.id}
                  comment={comment}
                  isOwn={comment.author_id === userId}
                  onViewProfile={onViewProfile}
                />
              ))
            )}
          </div>

          {/* Footer: Actions */}
          <div className="p-4 border-t border-gray-100 space-y-3">
            {/* Like */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleLike}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill={isLiked ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`transition-all duration-300 ${isLiked ? 'text-accent' : 'text-gray-400'}`}
                  style={{
                    transform: isLiked ? 'scale(1.1)' : 'scale(1)',
                    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span className="text-sm font-bold">{likeCount}</span>
              </button>
            </div>

            {/* Comment Input */}
            <div className="flex gap-2">
              <input
                ref={commentInputRef}
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                maxLength={500}
                className="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-sm font-medium
                  placeholder:text-gray-400 outline-none focus:ring-2 ring-black/10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    handleSubmitComment()
                  }
                }}
              />
              <button
                onClick={handleSubmitComment}
                disabled={isSubmittingComment || !newComment.trim()}
                className="px-5 py-3 bg-black text-white rounded-xl font-bold text-sm
                  disabled:opacity-50 disabled:cursor-not-allowed
                  hover:bg-gray-800 transition-colors"
              >
                {isSubmittingComment ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        danger
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
      />
    </div>,
    document.body
  )
}
