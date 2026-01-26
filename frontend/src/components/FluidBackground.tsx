/**
 * FluidBackground - 主题色流动渐变背景组件
 * 匹配当前系统主题颜色，创建淡色流动渐变效果
 */

import './FluidBackground.css'

interface FluidBackgroundProps {
  themeColor?: string  // 当前主题颜色，如 '#F9D849'
}

export default function FluidBackground({ themeColor = '#121212' }: FluidBackgroundProps) {
  // 将 hex 转为 rgba，用于创建淡色版本
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 18, g: 18, b: 18 }
  }

  const rgb = hexToRgb(themeColor)
  const colorLight = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`
  const colorMedium = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-white pointer-events-none">
      {/* 主色 blob - 左上 - 流动动画1 */}
      <div
        className="fluid-blob fluid-blob-1"
        style={{ background: colorLight }}
      />
      {/* 次色 blob - 右下 - 流动动画2 */}
      <div
        className="fluid-blob fluid-blob-2"
        style={{ background: colorMedium }}
      />
      {/* 点缀 blob - 右上 - 流动动画3 */}
      <div
        className="fluid-blob fluid-blob-3"
        style={{ background: colorMedium }}
      />
      {/* 点缀 blob - 左下 - 流动动画4 */}
      <div
        className="fluid-blob fluid-blob-4"
        style={{ background: colorLight }}
      />
    </div>
  )
}
