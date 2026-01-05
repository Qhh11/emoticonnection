interface PlaceholderImageProps {
  /** Can be emoji, image URL, or object with emoji and color */
  content: string | { emoji: string; color: string }
  /** Optional custom rotation angle in degrees */
  rotation?: number
  className?: string
}

export default function PlaceholderImage({
  content,
  rotation = 0,
  className = '',
}: PlaceholderImageProps) {
  // Check if content is an object with emoji and color
  const isObject = typeof content === 'object'
  const emoji = isObject ? content.emoji : content
  const bgColor = isObject ? content.color : 'bg-white'

  // Check if content is an emoji or image URL
  const isEmoji = typeof emoji === 'string' && emoji.length <= 4 && /[\p{Emoji}]/u.test(emoji)

  return (
    <div
      className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-2xl ${bgColor} shadow-soft flex items-center justify-center overflow-hidden ${className}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {isEmoji ? (
        <span className="text-3xl md:text-4xl">{emoji}</span>
      ) : (
        <img
          src={emoji}
          alt="User content"
          className="w-full h-full object-cover"
        />
      )}
    </div>
  )
}
