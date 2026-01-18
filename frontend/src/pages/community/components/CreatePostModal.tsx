/**
 * CreatePostModal - 发帖弹窗
 * 标题 + 内容 + 图片上传 + Vibe Picker + 匿名选项
 */

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import VibePicker from './VibePicker'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreatePostData) => Promise<void>
  userId: string
}

export interface CreatePostData {
  title: string
  content: string
  emotion: string
  images: File[]
  isAnonymous: boolean
}

export default function CreatePostModal({
  isOpen,
  onClose,
  onSubmit,
  userId,
}: CreatePostModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null)
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + images.length > 4) {
      setError('Maximum 4 images allowed')
      return
    }

    const newImages = [...images, ...files]
    setImages(newImages)

    // 生成预览
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    // 验证
    if (!content.trim()) {
      setError('Please write something')
      return
    }
    if (!selectedVibe) {
      setError('Please pick your vibe')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      await onSubmit({
        title: title.trim() || content.slice(0, 50),
        content: content.trim(),
        emotion: selectedVibe,
        images,
        isAnonymous,
      })

      // 重置表单
      setTitle('')
      setContent('')
      setSelectedVibe(null)
      setImages([])
      setImagePreviews([])
      setIsAnonymous(false)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Share Your Vibe</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              What's on your mind?
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Title Input */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
              Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={50}
              placeholder="Give your post a title..."
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border-2 border-transparent
                focus:border-black focus:bg-white outline-none transition-all
                text-sm font-bold placeholder:text-gray-400"
            />
          </div>

          {/* Content Input */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={500}
              placeholder="Share your story..."
              rows={4}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border-2 border-transparent
                focus:border-black focus:bg-white outline-none transition-all resize-none
                text-sm font-medium placeholder:text-gray-400"
            />
            <div className="text-right mt-1">
              <span className="text-[10px] text-gray-400">{content.length}/500</span>
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
              Images (optional)
            </label>
            <div className="flex flex-wrap gap-3">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative w-20 h-20 rounded-xl overflow-hidden group">
                  <img src={preview} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity
                      flex items-center justify-center text-white text-xl"
                  >
                    ×
                  </button>
                </div>
              ))}
              {images.length < 4 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300
                    flex flex-col items-center justify-center gap-1
                    hover:border-gray-400 hover:bg-gray-50 transition-all"
                >
                  <span className="text-2xl text-gray-400">📷</span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase">Add</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {/* Vibe Picker */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
              Pick Your Vibe *
            </label>
            <VibePicker
              selectedVibe={selectedVibe}
              onSelect={setSelectedVibe}
              size="small"
            />
          </div>

          {/* Anonymous Toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={`
                w-12 h-6 rounded-full p-0.5 transition-colors duration-300
                ${isAnonymous ? 'bg-black' : 'bg-gray-200'}
              `}
              onClick={() => setIsAnonymous(!isAnonymous)}
            >
              <div
                className={`
                  w-5 h-5 rounded-full bg-white shadow transition-transform duration-300
                  ${isAnonymous ? 'translate-x-6' : 'translate-x-0'}
                `}
              />
            </div>
            <span className="text-sm font-bold text-gray-700">Post Anonymously</span>
          </label>

          {/* Error Message */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm font-bold text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim() || !selectedVibe}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest
              bg-gradient-to-r from-gray-900 to-gray-700 text-white
              hover:from-gray-800 hover:to-gray-600
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-300
              shadow-lg hover:shadow-xl"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sharing...
              </span>
            ) : (
              '✨ Share Now ✨'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
