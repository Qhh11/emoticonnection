/**
 * OnlineIndicator - 在线状态呼吸灯组件
 * 使用 Tailwind CSS animate-ping 实现呼吸动画效果
 */

interface OnlineIndicatorProps {
  isOnline: boolean
  size?: 'sm' | 'md'
}

export default function OnlineIndicator({ isOnline, size = 'sm' }: OnlineIndicatorProps) {
  if (!isOnline) return null

  const sizeClass = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'

  return (
    <span className={`absolute -bottom-1 -right-1 flex ${sizeClass}`}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className={`relative inline-flex rounded-full ${sizeClass} bg-green-500 border-2 border-white`} />
    </span>
  )
}
