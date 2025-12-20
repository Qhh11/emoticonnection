import { useState, useRef, useEffect } from 'react'
import { Avatar3D } from '../../config/avatars'
import ModelViewer3D from './ModelViewer3D'

interface AvatarCompanionProps {
  avatar: Avatar3D
  onClose: () => void
}

export default function AvatarCompanion({ avatar, onClose }: AvatarCompanionProps) {
  const [position, setPosition] = useState(() => {
    // Load saved position from localStorage or use default
    const saved = localStorage.getItem('avatarCompanionPosition')
    return saved ? JSON.parse(saved) : { x: window.innerWidth - 200, y: 100 }
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const companionRef = useRef<HTMLDivElement>(null)

  // Save position to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('avatarCompanionPosition', JSON.stringify(position))
  }, [position])

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return // Don't drag when clicking buttons

    setIsDragging(true)
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x
        const newY = e.clientY - dragOffset.y

        // Keep within viewport bounds
        const maxX = window.innerWidth - 120
        const maxY = window.innerHeight - 120

        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  return (
    <div
      ref={companionRef}
      className={`fixed z-[90] transition-transform ${isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab'} ${isHovered ? 'scale-105' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Avatar Container */}
      <div className="relative group">
        {/* 3D Model - Direct Display */}
        <div className="relative w-48 h-48">
          <ModelViewer3D
            modelPath={avatar.modelPath}
            avatarName={avatar.name}
            avatarColor={avatar.color}
            size="medium"
            exposure={avatar.exposure}
            environmentImage={avatar.environmentImage}
            shadowIntensity={avatar.shadowIntensity}
            disableAutoRotate={true}
            showResetButton={false}
          />
        </div>

        {/* Hover tooltip */}
        {isHovered && !isDragging && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-2 bg-black/90 backdrop-blur-sm text-white rounded-2xl text-xs font-black uppercase tracking-widest whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-300">
            {avatar.name}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
          </div>
        )}

        {/* Control buttons - only show on hover */}
        {isHovered && !isDragging && (
          <div className="absolute -top-2 -right-2 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg"
              title="Remove companion"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Drag hint - only show briefly on first render */}
        {!isDragging && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-widest text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Drag to move
          </div>
        )}
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full animate-float-slower"
            style={{
              backgroundColor: avatar.color,
              left: `${20 + Math.random() * 60}%`,
              top: `${20 + Math.random() * 60}%`,
              opacity: Math.random() * 0.4,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${8 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>
    </div>
  )
}
