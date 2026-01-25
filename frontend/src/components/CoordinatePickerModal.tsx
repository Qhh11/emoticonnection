import { useState } from 'react'
import { createPortal } from 'react-dom'

// 表情图片映射
const EMOJI_IMAGES: Record<string, string> = {
  happy: '/checkin/快乐.png',
  angry: '/checkin/愤怒.png',
  sad: '/checkin/悲伤.png',
  calm: '/checkin/安详.png',
}

// 8x8 网格颜色矩阵
const COLOR_GRID = [
  ['#D32F2F', '#DC4545', '#E55A5A', '#EE7070', '#FAD870', '#F9D040', '#E8C020', '#D8B010'],
  ['#DC4545', '#E55A5A', '#EE7070', '#F58585', '#FBE4A0', '#FAD870', '#F9D040', '#E8C020'],
  ['#E55A5A', '#EE7070', '#F58585', '#FAA0A0', '#FCF0C0', '#FBE4A0', '#FAD870', '#F9D040'],
  ['#EE7070', '#F58585', '#FAA0A0', '#FDB5B5', '#FDFAE0', '#FCF0C0', '#FBE4A0', '#FAD870'],
  ['#5588CC', '#6699D5', '#77AADD', '#88BBE5', '#E0F0D0', '#D0E8C0', '#C0E0B0', '#B0D8A0'],
  ['#4477BB', '#5588CC', '#6699D5', '#77AADD', '#B0D8A0', '#A0D090', '#90C880', '#80C070'],
  ['#3266B1', '#4477BB', '#5588CC', '#6699D5', '#90C880', '#80C070', '#70B860', '#66B04C'],
  ['#2855A0', '#3266B1', '#4477BB', '#5588CC', '#80C070', '#70B860', '#66B04C', '#56A03C'],
]

function calculateColor(x: number, y: number): string {
  const col = Math.min(7, Math.max(0, Math.floor((x + 1) / 2 * 8)))
  const row = Math.min(7, Math.max(0, Math.floor((1 - y) / 2 * 8)))
  return COLOR_GRID[row][col]
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
          {/* 8x8 渐变色块网格 */}
          <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
            <div className="bg-[#D32F2F]" /><div className="bg-[#DC4545]" /><div className="bg-[#E55A5A]" /><div className="bg-[#EE7070]" />
            <div className="bg-[#FAD870]" /><div className="bg-[#F9D040]" /><div className="bg-[#E8C020]" /><div className="bg-[#D8B010]" />
            <div className="bg-[#DC4545]" /><div className="bg-[#E55A5A]" /><div className="bg-[#EE7070]" /><div className="bg-[#F58585]" />
            <div className="bg-[#FBE4A0]" /><div className="bg-[#FAD870]" /><div className="bg-[#F9D040]" /><div className="bg-[#E8C020]" />
            <div className="bg-[#E55A5A]" /><div className="bg-[#EE7070]" /><div className="bg-[#F58585]" /><div className="bg-[#FAA0A0]" />
            <div className="bg-[#FCF0C0]" /><div className="bg-[#FBE4A0]" /><div className="bg-[#FAD870]" /><div className="bg-[#F9D040]" />
            <div className="bg-[#EE7070]" /><div className="bg-[#F58585]" /><div className="bg-[#FAA0A0]" /><div className="bg-[#FDB5B5]" />
            <div className="bg-[#FDFAE0]" /><div className="bg-[#FCF0C0]" /><div className="bg-[#FBE4A0]" /><div className="bg-[#FAD870]" />
            <div className="bg-[#5588CC]" /><div className="bg-[#6699D5]" /><div className="bg-[#77AADD]" /><div className="bg-[#88BBE5]" />
            <div className="bg-[#E0F0D0]" /><div className="bg-[#D0E8C0]" /><div className="bg-[#C0E0B0]" /><div className="bg-[#B0D8A0]" />
            <div className="bg-[#4477BB]" /><div className="bg-[#5588CC]" /><div className="bg-[#6699D5]" /><div className="bg-[#77AADD]" />
            <div className="bg-[#B0D8A0]" /><div className="bg-[#A0D090]" /><div className="bg-[#90C880]" /><div className="bg-[#80C070]" />
            <div className="bg-[#3266B1]" /><div className="bg-[#4477BB]" /><div className="bg-[#5588CC]" /><div className="bg-[#6699D5]" />
            <div className="bg-[#90C880]" /><div className="bg-[#80C070]" /><div className="bg-[#70B860]" /><div className="bg-[#66B04C]" />
            <div className="bg-[#2855A0]" /><div className="bg-[#3266B1]" /><div className="bg-[#4477BB]" /><div className="bg-[#5588CC]" />
            <div className="bg-[#80C070]" /><div className="bg-[#70B860]" /><div className="bg-[#66B04C]" /><div className="bg-[#56A03C]" />
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
