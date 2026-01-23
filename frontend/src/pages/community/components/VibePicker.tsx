/**
 * VibePicker - 情绪选择器组件
 * 使用 2D Avatar 图标让用户选择当前心情
 */

interface VibePickerProps {
  selectedVibe: string | null
  onSelect: (vibe: string) => void
  size?: 'small' | 'medium' | 'large'
}

// 情绪图标和颜色映射
const VIBE_DATA = [
  { id: 'Joy', icon: '/asset/2d/Sunny.png', color: '#F9D849' },
  { id: 'Sad', icon: '/asset/2d/Bluey.png', color: '#3266B1' },
  { id: 'Angry', icon: '/asset/2d/Grumpy.png', color: '#D32F2F' },
  { id: 'Anxious', icon: '/asset/2d/Zippy.png', color: '#E67E22' },
  { id: 'Bored', icon: '/asset/2d/Snoozy.png', color: '#4B4E91' },
  { id: 'Fear', icon: '/asset/2d/Scaredy.png', color: '#9381BA' },
  { id: 'Disgust', icon: '/asset/2d/Yucky.png', color: '#66B04C' },
  { id: 'Awkward', icon: '/asset/2d/Blushy.png', color: '#D278A3' },
  { id: 'Envy', icon: '/asset/2d/Sparkle.png', color: '#2BA8A4' },
]

const sizeConfig = {
  small: { container: 'w-10 h-10', icon: 'w-8 h-8' },
  medium: { container: 'w-14 h-14', icon: 'w-10 h-10' },
  large: { container: 'w-16 h-16', icon: 'w-12 h-12' },
}

export default function VibePicker({ selectedVibe, onSelect, size = 'medium' }: VibePickerProps) {
  const { container, icon } = sizeConfig[size]

  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {VIBE_DATA.map((vibe) => {
        const isSelected = selectedVibe === vibe.id
        return (
          <button
            key={vibe.id}
            onClick={() => onSelect(vibe.id)}
            className={`
              relative flex flex-col items-center gap-1 p-2 rounded-2xl
              transition-all duration-300 ease-out
              ${isSelected
                ? 'scale-110 bg-white/20'
                : 'hover:scale-105 hover:bg-white/10'
              }
            `}
            style={{
              boxShadow: isSelected
                ? `0 0 20px ${vibe.color}60, 0 0 40px ${vibe.color}30`
                : 'none',
            }}
          >
            {/* Icon container */}
            <div
              className={`
                ${container} rounded-full flex items-center justify-center
                transition-all duration-300
                ${isSelected ? 'ring-2 ring-offset-2' : ''}
              `}
              style={{
                backgroundColor: isSelected ? `${vibe.color}20` : 'transparent',
                //ringColor: isSelected ? vibe.color : 'transparent',
              }}
            >
              <img
                src={vibe.icon}
                alt={vibe.id}
                className={`${icon} object-contain transition-transform duration-300 ${isSelected ? 'scale-110' : ''}`}
                draggable={false}
              />
            </div>

            {/* Label */}
            <span
              className={`
                text-[10px] font-black uppercase tracking-wider
                transition-all duration-300
                ${isSelected ? 'opacity-100' : 'opacity-60'}
              `}
              style={{ color: isSelected ? vibe.color : 'inherit' }}
            >
              {vibe.id}
            </span>

            {/* Selection indicator */}
            {isSelected && (
              <div
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px]"
                style={{ backgroundColor: vibe.color }}
              >
                ✓
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

// 导出情绪数据供其他组件使用
export { VIBE_DATA }
