import { useState } from 'react'
import { createPortal } from 'react-dom'

// 表情图片映射
const EMOJI_IMAGES: Record<string, string> = {
  happy: '/checkin/快乐.png',
  angry: '/checkin/愤怒.png',
  sad: '/checkin/悲伤.png',
  calm: '/checkin/安详.png',
}

// 四角颜色（使用情绪标准色）
const CORNER_COLORS = {
  topLeft: { r: 211, g: 47, b: 47 },      // #D32F2F - Angry (红)
  topRight: { r: 249, g: 216, b: 73 },    // #F9D849 - Joy (黄)
  bottomLeft: { r: 50, g: 102, b: 177 },  // #3266B1 - Sad (蓝)
  bottomRight: { r: 102, g: 176, b: 76 }, // #66B04C - Calm/Disgust (绿)
}

// 根据坐标计算颜色 - 使用四角颜色双线性插值，混入白色使中心更亮
function calculateColor(x: number, y: number): string {
  // 将 x, y 从 [-1, 1] 映射到 [0, 1]
  const nx = (x + 1) / 2  // 0 = left, 1 = right
  const ny = (1 - y) / 2  // 0 = top, 1 = bottom

  // 双线性插值四角颜色
  const { topLeft, topRight, bottomLeft, bottomRight } = CORNER_COLORS

  // 上边插值 (topLeft -> topRight)
  const topR = topLeft.r + (topRight.r - topLeft.r) * nx
  const topG = topLeft.g + (topRight.g - topLeft.g) * nx
  const topB = topLeft.b + (topRight.b - topLeft.b) * nx

  // 下边插值 (bottomLeft -> bottomRight)
  const bottomR = bottomLeft.r + (bottomRight.r - bottomLeft.r) * nx
  const bottomG = bottomLeft.g + (bottomRight.g - bottomLeft.g) * nx
  const bottomB = bottomLeft.b + (bottomRight.b - bottomLeft.b) * nx

  // 垂直插值 (top -> bottom)
  let r = topR + (bottomR - topR) * ny
  let g = topG + (bottomG - topG) * ny
  let b = topB + (bottomB - topB) * ny

  // 计算到中心的距离 (0 = 角落, 1 = 中心)
  const distToCenter = 1 - Math.sqrt(x * x + y * y) / Math.sqrt(2)

  // 混入白色使中心更亮（最多混入40%白色）
  const whiteMix = distToCenter * 0.4
  r = r + (255 - r) * whiteMix
  g = g + (255 - g) * whiteMix
  b = b + (255 - b) * whiteMix

  // 转为十六进制
  const toHex = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function getEmojiFromCoordinate(x: number, y: number): string {
  if (x >= 0 && y >= 0) return 'happy'
  if (x < 0 && y >= 0) return 'angry'
  if (x < 0 && y < 0) return 'sad'
  return 'calm'
}

function getMoodLabelFromCoordinate(x: number, y: number): string {
  if (x >= 0 && y >= 0) return 'Excited'
  if (x < 0 && y >= 0) return 'Stressed'
  if (x < 0 && y < 0) return 'Sad'
  return 'Calm'
}

export interface CheckInData {
  coordinate: { x: number; y: number }
  color: string
  emoji: string
  mood: string
}

interface CoordinatePickerModalProps {
  isOpen: boolean
  onClose: () => void
  onCheckIn: (data: CheckInData) => Promise<boolean>
  onUpdateCheckIn?: (data: CheckInData) => Promise<boolean>
  existingCheckIn?: {
    coordinate_x?: number
    coordinate_y?: number
  } | null
}

export default function CoordinatePickerModal({
  isOpen,
  onClose,
  onCheckIn,
  onUpdateCheckIn,
  existingCheckIn,
}: CoordinatePickerModalProps) {
  const [coordinate, setCoordinate] = useState({
    x: existingCheckIn?.coordinate_x ?? 0,
    y: existingCheckIn?.coordinate_y ?? 0
  })
  const [isDragging, setIsDragging] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)

  if (!isOpen) return null

  const currentColor = calculateColor(coordinate.x, coordinate.y)
  const currentEmoji = getEmojiFromCoordinate(coordinate.x, coordinate.y)

  const updatePosition = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    let x = (e.clientX - rect.left - centerX) / centerX
    let y = -(e.clientY - rect.top - centerY) / centerY
    x = Math.max(-1, Math.min(1, x))
    y = Math.max(-1, Math.min(1, y))
    setCoordinate({ x, y })
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    updatePosition(e)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    updatePosition(e)
  }

  const handlePointerUp = () => setIsDragging(false)

  const handleConfirmCheckIn = async () => {
    const data: CheckInData = {
      coordinate: coordinate,
      color: currentColor,
      emoji: currentEmoji,
      mood: getMoodLabelFromCoordinate(coordinate.x, coordinate.y)
    }

    const handler = existingCheckIn ? onUpdateCheckIn : onCheckIn
    if (handler) {
      const success = await handler(data)
      if (success) {
        onClose()
      }
    }
  }

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 w-80 max-w-[90vw] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 + Help */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black">How are you feeling?</h3>
          <div className="relative">
            <button
              onClick={() => setShowHelpModal(!showHelpModal)}
              className="w-6 h-6 rounded-full bg-gray-200 text-gray-400 text-xs flex items-center justify-center hover:bg-gray-300 transition-colors"
            >
              ?
            </button>

            {showHelpModal && (
              <div className="absolute right-0 top-8 w-64 bg-white rounded-2xl shadow-xl border border-black/5 z-50 p-4">
                <div className="absolute -top-2 right-2 w-4 h-4 bg-white rotate-45 border-l border-t border-black/5" />
                <h4 className="text-[13px] font-black text-gray-800 mb-3">Emotion Coordinate Guide</h4>
                <div className="relative aspect-square bg-gray-50 rounded-xl overflow-hidden mb-3">
                  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                    <div className="bg-[#D32F2F]/15" />
                    <div className="bg-[#F9D040]/15" />
                    <div className="bg-[#3266B1]/15" />
                    <div className="bg-[#66B04C]/15" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="absolute w-full h-[1px] bg-gray-200" />
                    <div className="absolute h-full w-[1px] bg-gray-200" />
                  </div>
                  <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-gray-400">Negative</span>
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-gray-400">Positive</span>
                  <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-gray-400">High Energy</span>
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-gray-400">Low Energy</span>
                  <div className="absolute top-[12%] left-[12%] flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-[#D32F2F] flex items-center justify-center">
                      <img src="/checkin/愤怒.png" alt="angry" className="w-5 h-5" />
                    </div>
                    <span className="text-[7px] font-bold text-gray-500 mt-0.5">Stressed</span>
                  </div>
                  <div className="absolute top-[12%] right-[12%] flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-[#F9D040] flex items-center justify-center">
                      <img src="/checkin/快乐.png" alt="happy" className="w-5 h-5" />
                    </div>
                    <span className="text-[7px] font-bold text-gray-500 mt-0.5">Excited</span>
                  </div>
                  <div className="absolute bottom-[12%] left-[12%] flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-[#3266B1] flex items-center justify-center">
                      <img src="/checkin/悲伤.png" alt="sad" className="w-5 h-5" />
                    </div>
                    <span className="text-[7px] font-bold text-gray-500 mt-0.5">Depressed</span>
                  </div>
                  <div className="absolute bottom-[12%] right-[12%] flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-[#66B04C] flex items-center justify-center">
                      <img src="/checkin/安详.png" alt="calm" className="w-5 h-5" />
                    </div>
                    <span className="text-[7px] font-bold text-gray-500 mt-0.5">Relaxed</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 text-center">
                  Drag the dot to express your emotion
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 坐标轴画布 */}
        <div
          className="relative w-full aspect-square rounded-xl overflow-hidden cursor-crosshair touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* 8x8 渐变色块网格 - 高饱和度版本 */}
          <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
            <div className="bg-[#FF3B3B]" /><div className="bg-[#FF5252]" /><div className="bg-[#FF6B6B]" /><div className="bg-[#FF8585]" />
            <div className="bg-[#FFE066]" /><div className="bg-[#FFD633]" /><div className="bg-[#FFC800]" /><div className="bg-[#FFB800]" />
            <div className="bg-[#FF5252]" /><div className="bg-[#FF6B6B]" /><div className="bg-[#FF8585]" /><div className="bg-[#FFA0A0]" />
            <div className="bg-[#FFF0A0]" /><div className="bg-[#FFE066]" /><div className="bg-[#FFD633]" /><div className="bg-[#FFC800]" />
            <div className="bg-[#FF6B6B]" /><div className="bg-[#FF8585]" /><div className="bg-[#FFA0A0]" /><div className="bg-[#FFB8B8]" />
            <div className="bg-[#FFFAD0]" /><div className="bg-[#FFF0A0]" /><div className="bg-[#FFE066]" /><div className="bg-[#FFD633]" />
            <div className="bg-[#FF8585]" /><div className="bg-[#FFA0A0]" /><div className="bg-[#FFB8B8]" /><div className="bg-[#FFD0D0]" />
            <div className="bg-[#FFFFE0]" /><div className="bg-[#FFFAD0]" /><div className="bg-[#FFF0A0]" /><div className="bg-[#FFE066]" />
            <div className="bg-[#5599EE]" /><div className="bg-[#66AAFF]" /><div className="bg-[#77BBFF]" /><div className="bg-[#99CCFF]" />
            <div className="bg-[#D0F0D0]" /><div className="bg-[#B8E8B8]" /><div className="bg-[#A0E0A0]" /><div className="bg-[#88D888]" />
            <div className="bg-[#4488DD]" /><div className="bg-[#5599EE]" /><div className="bg-[#66AAFF]" /><div className="bg-[#77BBFF]" />
            <div className="bg-[#A0E0A0]" /><div className="bg-[#88D888]" /><div className="bg-[#70D070]" /><div className="bg-[#58C858]" />
            <div className="bg-[#3377CC]" /><div className="bg-[#4488DD]" /><div className="bg-[#5599EE]" /><div className="bg-[#66AAFF]" />
            <div className="bg-[#88D888]" /><div className="bg-[#70D070]" /><div className="bg-[#58C858]" /><div className="bg-[#40C040]" />
            <div className="bg-[#2266BB]" /><div className="bg-[#3377CC]" /><div className="bg-[#4488DD]" /><div className="bg-[#5599EE]" />
            <div className="bg-[#70D070]" /><div className="bg-[#58C858]" /><div className="bg-[#40C040]" /><div className="bg-[#28B828]" />
          </div>

          {/* 坐标轴线 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute w-full h-[2px] bg-white/40" />
            <div className="absolute h-full w-[2px] bg-white/40" />
          </div>

          {/* 坐标轴标签 */}
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-black/70 text-[10px] font-bold">Negative</span>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-black/70 text-[10px] font-bold">Positive</span>
          <span className="absolute top-2 left-1/2 -translate-x-1/2 text-black/70 text-[10px] font-bold">High Energy</span>
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-black/70 text-[10px] font-bold">Low Energy</span>

          {/* 中心表情 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors duration-200"
              style={{ backgroundColor: currentColor }}
            >
              <img
                src={EMOJI_IMAGES[currentEmoji]}
                alt={currentEmoji}
                className="w-9 h-9 transition-all duration-200"
              />
            </div>
          </div>

          {/* 可拖拽的点 */}
          <div
            className="absolute w-5 h-5 bg-white rounded-full shadow-lg border-2 border-gray-400 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
            style={{
              left: `${(coordinate.x + 1) / 2 * 100}%`,
              top: `${(1 - (coordinate.y + 1) / 2) * 100}%`,
            }}
          />
        </div>

        {/* 按钮 */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-black rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmCheckIn}
            className="flex-1 py-2.5 bg-black text-white rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-gray-800 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
