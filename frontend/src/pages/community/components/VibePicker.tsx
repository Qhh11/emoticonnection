/**
 * VibePicker - 情绪选择器组件
 * 使用 2D Avatar 图标让用户选择当前心情
 * 支持自定义情绪和颜色
 */

import { useState } from 'react'

interface VibePickerProps {
  selectedVibe: string | null
  onSelect: (vibe: string, color?: string) => void
  size?: 'small' | 'medium' | 'large'
  customColor?: string  // Custom color for custom vibe
  onCustomColorChange?: (color: string) => void  // Callback when custom color changes
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

// Convert hue to Morandi-style color (low saturation, muted tones)
const hueToMorandiColor = (hue: number): string => {
  const s = 45 // Low saturation for muted feel
  const l = 55 // Medium lightness
  const c = (1 - Math.abs(2 * l / 100 - 1)) * s / 100
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1))
  const m = l / 100 - c / 2
  let r = 0, g = 0, b = 0
  if (hue < 60) { r = c; g = x }
  else if (hue < 120) { r = x; g = c }
  else if (hue < 180) { g = c; b = x }
  else if (hue < 240) { g = x; b = c }
  else if (hue < 300) { r = x; b = c }
  else { r = c; b = x }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export default function VibePicker({ selectedVibe, onSelect, size = 'medium', customColor, onCustomColorChange }: VibePickerProps) {
  const { container, icon } = sizeConfig[size]
  const [showCustom, setShowCustom] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  const [customHue, setCustomHue] = useState(260)

  const currentCustomColor = customColor || hueToMorandiColor(customHue)
  const isCustomSelected = selectedVibe && !VIBE_DATA.find(v => v.id === selectedVibe)

  const handleCustomSelect = () => {
    setShowCustom(true)
    const label = customLabel.trim() || 'Custom'
    onSelect(label, currentCustomColor)
  }

  const handleCustomLabelChange = (label: string) => {
    setCustomLabel(label)
    if (isCustomSelected) {
      onSelect(label.trim() || 'Custom', currentCustomColor)
    }
  }

  const handleCustomHueChange = (hue: number) => {
    setCustomHue(hue)
    const newColor = hueToMorandiColor(hue)
    onCustomColorChange?.(newColor)
    if (isCustomSelected) {
      onSelect(customLabel.trim() || 'Custom', newColor)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-center">
        {VIBE_DATA.map((vibe) => {
          const isSelected = selectedVibe === vibe.id
          return (
            <button
              key={vibe.id}
              onClick={() => {
                setShowCustom(false)
                onSelect(vibe.id, vibe.color)
              }}
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

        {/* Custom button */}
        <button
          onClick={handleCustomSelect}
          className={`
            relative flex flex-col items-center gap-1 p-2 rounded-2xl
            transition-all duration-300 ease-out
            ${isCustomSelected
              ? 'scale-110 bg-white/20'
              : 'hover:scale-105 hover:bg-white/10'
            }
          `}
          style={{
            boxShadow: isCustomSelected
              ? `0 0 20px ${currentCustomColor}60, 0 0 40px ${currentCustomColor}30`
              : 'none',
          }}
        >
          <div
            className={`
              ${container} rounded-full flex items-center justify-center
              transition-all duration-300
              ${isCustomSelected ? 'ring-2 ring-offset-2' : ''}
            `}
            style={{
              backgroundColor: isCustomSelected ? `${currentCustomColor}40` : `${currentCustomColor}20`,
              border: `2px dashed ${currentCustomColor}`,
            }}
          >
            <span className="text-lg">+</span>
          </div>
          <span
            className={`
              text-[10px] font-black uppercase tracking-wider
              transition-all duration-300
              ${isCustomSelected ? 'opacity-100' : 'opacity-60'}
            `}
            style={{ color: isCustomSelected ? currentCustomColor : 'inherit' }}
          >
            Custom
          </span>
          {isCustomSelected && (
            <div
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px]"
              style={{ backgroundColor: currentCustomColor }}
            >
              ✓
            </div>
          )}
        </button>
      </div>

      {/* Custom input panel */}
      {(showCustom || isCustomSelected) && (
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex-shrink-0 shadow-inner"
              style={{ backgroundColor: currentCustomColor }}
            />
            <input
              type="text"
              value={customLabel}
              onChange={(e) => handleCustomLabelChange(e.target.value)}
              placeholder="Name your vibe..."
              maxLength={20}
              className="flex-1 px-3 py-2 bg-white rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 text-sm font-bold placeholder:text-gray-300"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">
              Choose Color
            </label>
            <div className="relative">
              <input
                type="range"
                min="0"
                max="360"
                value={customHue}
                onChange={(e) => handleCustomHueChange(Number(e.target.value))}
                className="w-full h-2.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: 'linear-gradient(to right, #b88e8e, #b8a88e, #a8b88e, #8eb8a8, #8ea8b8, #988eb8, #b88eb8, #b88e8e)',
                }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg pointer-events-none"
                style={{
                  backgroundColor: currentCustomColor,
                  left: `calc(${(customHue / 360) * 100}% - 8px)`,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 导出情绪数据供其他组件使用
export { VIBE_DATA }
