/**
 * PostCard - 帖子卡片组件
 * 使用 TiltedCard 实现 3D 倾斜交互动画
 * 图片帖子：显示用户上传图片
 * 文字帖子：显示情绪颜色渐变背景
 */

import { Post, getMediaUrl } from '../../../services/api'
import { getAvatarUrl } from '../../../config/userAvatars'
import TiltedCard from '../../../components/TiltedCard'

interface PostCardProps {
  post: Post
  onClick: () => void
  onLike?: (postId: string) => void
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
  if (customColor) {
    const hex = customColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return { bg: customColor, text: brightness > 128 ? '#121212' : '#ffffff' }
  }

  if (!emotion) return { bg: '#9381BA', text: '#ffffff' }
  const normalized = emotion.charAt(0).toUpperCase() + emotion.slice(1).toLowerCase()
  return MOOD_COLORS[normalized] || { bg: '#9381BA', text: '#ffffff' }
}

// 格式化日期为 MM/DD 格式
function formatDate(dateString: string) {
  const date = new Date(dateString)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}/${day}`
}

// 文字帖子统一使用浅灰背景
const TEXT_POST_BG = '#E8E8E8'

export default function PostCard({ post, onClick }: PostCardProps) {
  const emotion = post.emotion || post.ai_emotion
  const colors = getMoodColors(emotion, post.emotion_color)
  const hasImage = post.media_urls && post.media_urls.length > 0
  const authorName = post.is_anonymous ? 'Anonymous' : (post.author_name || 'User')
  const authorInitial = post.is_anonymous ? '?' : (post.author_name?.charAt(0).toUpperCase() || 'U')

  const captionText = `${post.title || 'Untitled'} - ${emotion || 'Mood'}`

  // 计算文字帖子高度和行数：基于内容长度
  const getTextPostConfig = () => {
    if (!post.content) return { height: '160px', lines: 3 }
    const len = post.content.length
    if (len < 50) return { height: '140px', lines: 2 }
    if (len < 100) return { height: '180px', lines: 4 }
    if (len < 200) return { height: '220px', lines: 5 }
    return { height: '280px', lines: 7 }
  }

  const textPostConfig = getTextPostConfig()

  return (
    <div style={{
      aspectRatio: hasImage ? '4/5' : undefined,
      height: hasImage ? undefined : textPostConfig.height,
    }}>
      <TiltedCard
        imageSrc={hasImage ? getMediaUrl(post.media_urls![0]) : undefined}
        gradientBg={!hasImage ? TEXT_POST_BG : undefined}
        useGlassmorphism={true}
        blurContent={false}
        blurAmount={0}
        showGrain={true}
        showBorder={true}
        showOilPaint={false}
        captionText={captionText}
        rotateAmplitude={12}
        scaleOnHover={1.05}
        showTooltip
        displayOverlayContent
        borderRadius={12}
        onClick={onClick}
        overlayContent={
          <PostOverlay
            title={post.title ?? undefined}
            emotionColor={colors.bg}
            emotionLabel={emotion ?? undefined}
            content={hasImage ? undefined : post.content}
            maxLines={hasImage ? undefined : textPostConfig.lines}
            authorName={authorName}
            authorAvatar={post.author_avatar ?? undefined}
            authorInitial={authorInitial}
            date={formatDate(post.created_at)}
            hasImage={hasImage ?? false}
          />
        }
      />
    </div>
  )
}

// Post Overlay 内容组件
interface PostOverlayProps {
  title?: string
  emotionColor: string
  emotionLabel?: string
  content?: string
  maxLines?: number
  authorName: string
  authorAvatar?: string
  authorInitial: string
  date: string
  hasImage: boolean
}

function PostOverlay({
  title,
  emotionColor,
  emotionLabel,
  content,
  maxLines = 5,
  authorName,
  authorAvatar,
  authorInitial,
  date,
  hasImage,
}: PostOverlayProps) {
  // 底部信息栏高度（标题 + 用户信息）
  const bottomBarHeight = 70

  // 文字帖子：浅灰背景用黑色文字；图片帖子：深色渐变背景用白色文字
  const isTextPost = !hasImage
  const textColor = isTextPost ? '#121212' : '#ffffff'
  const textColorSecondary = isTextPost ? 'rgba(18,18,18,0.85)' : 'rgba(255,255,255,0.9)'
  const textColorTertiary = isTextPost ? 'rgba(18,18,18,0.6)' : 'rgba(255,255,255,0.75)'

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* 文字帖子：内容区域 - 模糊效果 */}
      {!hasImage && content && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: bottomBarHeight,
            padding: '12px 16px',
            overflow: 'hidden',
            filter: 'blur(0px)',
            transform: 'scale(1.05)',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              fontWeight: 500,
              lineHeight: 1.6,
              color: '#121212',
              fontFamily: 'Outfit, system-ui, sans-serif',
              display: '-webkit-box',
              WebkitLineClamp: maxLines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}
          >
            {content}
          </p>
        </div>
      )}

      {/* 底部信息区 - 固定在底部 */}
      {/* 图片帖子：深色渐变背景；文字帖子：浅色渐变背景 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '12px 16px',
          background: isTextPost
            ? 'linear-gradient(to top, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.7) 70%, transparent 100%)'
            : 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
        }}
      >
        {/* 标题 */}
        <h3
          style={{
            margin: 0,
            marginBottom: '8px',
            fontSize: '15px',
            fontWeight: 600,
            color: textColor,
            fontFamily: 'Outfit, system-ui, sans-serif',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textShadow: isTextPost ? 'none' : '0 1px 3px rgba(0,0,0,0.5)'
          }}
        >
          {title || 'Untitled'}
        </h3>

        {/* 用户信息和日期 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* 用户信息 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                overflow: 'hidden',
                background: '#D9D9D9',
                flexShrink: 0,
              }}
            >
              {authorAvatar ? (
                <img
                  src={getAvatarUrl(authorAvatar)}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: emotionColor + '80',
                    color: '#333',
                  }}
                >
                  {authorInitial}
                </div>
              )}
            </div>
            <span
              style={{
                color: textColorSecondary,
                fontSize: '12px',
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 600,
                maxWidth: '70px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {authorName}
            </span>
          </div>

          {/* 日期 + 情绪标签 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                color: textColorTertiary,
                fontSize: '11px',
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 500,
              }}
            >
              {date}
            </span>
            {emotionLabel && (
              <span
                style={{
                  color: emotionColor,
                  fontSize: '11px',
                  fontWeight: 700,
                  fontFamily: 'Outfit, system-ui, sans-serif',
                  textTransform: 'capitalize',
                }}
              >
                {emotionLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export { MOOD_COLORS, getMoodColors }
