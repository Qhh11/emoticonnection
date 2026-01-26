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

// 情绪颜色映射 - 低饱和度柔和色调
const MOOD_COLORS: Record<string, { bg: string; text: string }> = {
  'Joy': { bg: '#EDE5B4', text: '#5C5832' },        // 柔和米黄
  'Sad': { bg: '#B8C5D6', text: '#3A4A5C' },        // 柔和灰蓝
  'Angry': { bg: '#E5C4C4', text: '#6B4444' },      // 柔和粉红
  'Anxious': { bg: '#E5D4C4', text: '#6B5844' },    // 柔和橙米
  'Bored': { bg: '#C4C4D6', text: '#4A4A5C' },      // 柔和灰紫
  'Fear': { bg: '#D4C4D6', text: '#5A4A5C' },       // 柔和淡紫
  'Disgust': { bg: '#C4D6C4', text: '#4A5C4A' },    // 柔和浅绿
  'Awkward': { bg: '#E5C4D4', text: '#6B4458' },    // 柔和粉
  'Envy': { bg: '#B8D6D4', text: '#3A5C5A' },       // 柔和青绿
}

// 将颜色转换为低饱和度版本
function desaturateColor(hex: string): string {
  const cleanHex = hex.replace('#', '')
  const r = parseInt(cleanHex.substr(0, 2), 16)
  const g = parseInt(cleanHex.substr(2, 2), 16)
  const b = parseInt(cleanHex.substr(4, 2), 16)

  // 转换到 HSL，降低饱和度，提高亮度
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  let h = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r / 255: h = ((g - b) / 255 / d + (g < b ? 6 : 0)) / 6; break
      case g / 255: h = ((b - r) / 255 / d + 2) / 6; break
      case b / 255: h = ((r - g) / 255 / d + 4) / 6; break
    }
  }

  // 降低饱和度到 25%，亮度提升到 82%
  const newS = Math.min(s * 0.35, 0.25)
  const newL = 0.82

  // HSL 转回 RGB
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }

  const q = newL < 0.5 ? newL * (1 + newS) : newL + newS - newL * newS
  const p = 2 * newL - q
  const newR = Math.round(hue2rgb(p, q, h + 1/3) * 255)
  const newG = Math.round(hue2rgb(p, q, h) * 255)
  const newB = Math.round(hue2rgb(p, q, h - 1/3) * 255)

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

// 获取情绪颜色 - 优先使用自定义颜色（会转换为低饱和度）
function getMoodColors(emotion: string | null, customColor?: string | null) {
  if (customColor) {
    const desaturated = desaturateColor(customColor)
    // 文字颜色：取原色的深色版本
    const hex = customColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    // 深色文字
    const darkR = Math.round(r * 0.4)
    const darkG = Math.round(g * 0.4)
    const darkB = Math.round(b * 0.4)
    const textColor = `#${darkR.toString(16).padStart(2, '0')}${darkG.toString(16).padStart(2, '0')}${darkB.toString(16).padStart(2, '0')}`
    return { bg: desaturated, text: textColor }
  }

  if (!emotion) return { bg: '#D4C4D6', text: '#5A4A5C' }
  const normalized = emotion.charAt(0).toUpperCase() + emotion.slice(1).toLowerCase()
  return MOOD_COLORS[normalized] || { bg: '#D4C4D6', text: '#5A4A5C' }
}

// 格式化日期为 MM/DD 格式
function formatDate(dateString: string) {
  const date = new Date(dateString)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}/${day}`
}

export default function PostCard({ post, onClick }: PostCardProps) {
  const emotion = post.emotion || post.ai_emotion
  const colors = getMoodColors(emotion, post.emotion_color)
  const hasImage = post.media_urls && post.media_urls.length > 0
  const authorName = post.is_anonymous ? 'Anonymous' : (post.author_name || 'User')
  const authorInitial = post.is_anonymous ? '?' : (post.author_name?.charAt(0).toUpperCase() || 'U')

  // 文字帖子使用情绪颜色作为背景
  const textPostBg = colors.bg

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
        gradientBg={!hasImage ? textPostBg : undefined}
        useGlassmorphism={!!hasImage}
        blurContent={false}
        blurAmount={0}
        showGrain={false}
        showBorder={true}
        showOilPaint={false}
        rotateAmplitude={12}
        scaleOnHover={1.05}
        showTooltip={false}
        displayOverlayContent
        borderRadius={12}
        onClick={onClick}
        overlayContent={
          <PostOverlay
            title={post.title ?? undefined}
            emotionColor={colors.bg}
            emotionTextColor={colors.text}
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
  emotionTextColor?: string
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
  emotionColor,
  emotionTextColor = '#121212',
  emotionLabel,
  content,
  maxLines = 5,
  authorName,
  authorAvatar,
  authorInitial,
  date,
  hasImage,
}: PostOverlayProps) {
  // 底部信息栏高度（用户信息）
  const bottomBarHeight = 60

  // 文字帖子：使用与背景匹配的文字颜色
  const textColorMain = emotionTextColor
  const textColorSecondary = hasImage ? 'rgba(18,18,18,0.85)' : emotionTextColor
  const textColorTertiary = hasImage ? 'rgba(18,18,18,0.6)' : `${emotionTextColor}99`

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* 文字帖子：内容区域 + 点阵效果 */}
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
          }}
        >
          {/* 点阵纹理层 - 只在文本区域 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 0,
              backgroundImage: 'radial-gradient(circle, rgba(0, 0, 0, 0.06) 1px, transparent 1px)',
              backgroundSize: '12px 12px',
              backgroundPosition: '0 0',
            }}
          />
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              fontWeight: 500,
              lineHeight: 1.6,
              color: textColorMain,
              fontFamily: 'Outfit, system-ui, sans-serif',
              display: '-webkit-box',
              WebkitLineClamp: maxLines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {content}
          </p>
        </div>
      )}

      {/* 底部信息区 - 文字帖子使用同色背景，图片帖子使用白色渐变 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '14px 16px',
          background: hasImage
            ? 'linear-gradient(to top, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 40%, rgba(255,255,255,0.5) 70%, rgba(255,255,255,0.2) 85%, transparent 100%)'
            : 'transparent',
          backdropFilter: hasImage ? 'blur(8px)' : 'none',
          WebkitBackdropFilter: hasImage ? 'blur(8px)' : 'none',
        }}
      >
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
                background: hasImage ? '#E8E8E8' : emotionColor,
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
                    backgroundColor: emotionColor,
                    color: textColorMain,
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
                  color: hasImage ? emotionColor : textColorMain,
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'Outfit, system-ui, sans-serif',
                  textTransform: 'capitalize',
                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
                  padding: '3px 8px',
                  borderRadius: '6px',
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
