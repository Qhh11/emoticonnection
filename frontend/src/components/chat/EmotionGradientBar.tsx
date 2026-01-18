/**
 * EmotionGradientBar - 双情绪渐变进度条组件
 *
 * 在消息下方显示两种情绪及其占比，使用渐变色进度条展示
 */

interface EmotionGradientBarProps {
  primaryEmotion: string
  primaryPercentage: number  // 0-1
  primaryColor: string
  secondaryEmotion: string
  secondaryPercentage?: number  // 可选，保留接口兼容性
  secondaryColor: string
}

export default function EmotionGradientBar({
  primaryEmotion,
  primaryPercentage,
  primaryColor,
  secondaryEmotion,
  secondaryColor,
}: EmotionGradientBarProps) {
  // 转换为百分比整数用于渐变计算
  const primaryPct = Math.round(primaryPercentage * 100)

  // 计算渐变过渡点
  const transitionStart = Math.max(0, primaryPct - 15)
  const transitionEnd = Math.min(100, primaryPct + 15)

  return (
    <div className="w-full max-w-[240px] space-y-1">
      {/* 情绪标签 - 只显示情绪名称，不显示百分比 */}
      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider gap-2">
        <span style={{ color: primaryColor }}>
          {primaryEmotion}
        </span>
        <span style={{ color: secondaryColor }}>
          {secondaryEmotion}
        </span>
      </div>

      {/* 渐变进度条 */}
      <div
        className="h-1.5 rounded-full shadow-inner"
        style={{
          background: `linear-gradient(to right,
            ${primaryColor} 0%,
            ${primaryColor} ${transitionStart}%,
            ${secondaryColor} ${transitionEnd}%,
            ${secondaryColor} 100%
          )`,
        }}
      />
    </div>
  )
}
