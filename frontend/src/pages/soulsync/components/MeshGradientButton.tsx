/**
 * MeshGradientButton - 动态大按钮组件
 * "Find your echo" 动态大按钮，背景为红、黄、蓝、绿四色流动的 CSS Mesh Gradient 动画
 * 文字带呼吸效果
 */

import { useState, useEffect, useRef } from 'react'

interface MeshGradientButtonProps {
  onClick: () => void
  label: string
  subtitle?: string
}

export default function MeshGradientButton({
  onClick,
  label,
  subtitle,
}: MeshGradientButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * 2
      canvas.height = rect.height * 2
    }
    updateSize()

    // Color blobs with positions - original emotion colors
    const blobs = [
      { x: 0.2, y: 0.2, vx: 0.004, vy: 0.003, color: '#D32F2F' }, // Red
      { x: 0.8, y: 0.2, vx: -0.003, vy: 0.004, color: '#F9D849' }, // Yellow
      { x: 0.8, y: 0.8, vx: -0.004, vy: -0.003, color: '#66B04C' }, // Green
      { x: 0.2, y: 0.8, vx: 0.003, vy: -0.004, color: '#3266B1' }, // Blue
    ]

    const animate = () => {
      const w = canvas.width
      const h = canvas.height

      // Clear canvas with slight fade for trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, w, h)

      // Update blob positions
      blobs.forEach(blob => {
        blob.x += blob.vx
        blob.y += blob.vy

        // Bounce off edges
        if (blob.x < 0.1 || blob.x > 0.9) blob.vx *= -1
        if (blob.y < 0.1 || blob.y > 0.9) blob.vy *= -1

        // Keep in bounds
        blob.x = Math.max(0.1, Math.min(0.9, blob.x))
        blob.y = Math.max(0.1, Math.min(0.9, blob.y))
      })

      // Draw each blob with radial gradient - more vibrant
      blobs.forEach(blob => {
        const gradient = ctx.createRadialGradient(
          blob.x * w, blob.y * h, 0,
          blob.x * w, blob.y * h, w * 0.6
        )
        gradient.addColorStop(0, blob.color + 'FF') // Full opacity at center
        gradient.addColorStop(0.3, blob.color + 'CC') // High opacity
        gradient.addColorStop(0.6, blob.color + '66') // Medium opacity
        gradient.addColorStop(1, blob.color + '00') // Fade out

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, w, h)
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [])

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative w-full py-8 px-6 rounded-3xl overflow-hidden
        transition-all duration-500 ease-out
        ${isHovered ? 'scale-[1.02] shadow-2xl' : 'shadow-lg'}
      `}
      style={{
        border: '1px solid rgba(255,255,255,0.3)',
      }}
    >
      {/* Animated Canvas Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ filter: 'blur(20px)' }}
      />

      {/* Lighter overlay for better contrast */}
      <div className="absolute inset-0 bg-black/10" />

      {/* Content with breathing animation */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <span
          className="text-2xl font-black text-white drop-shadow-lg tracking-tight animate-breathing"
        >
          {label}
        </span>
        {subtitle && (
          <span className="text-sm font-medium text-white/90">
            {subtitle}
          </span>
        )}
      </div>

      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />

      {/* Breathing animation keyframes */}
      <style>{`
        @keyframes breathing {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.9;
          }
        }
        .animate-breathing {
          animation: breathing 3s ease-in-out infinite;
        }
      `}</style>
    </button>
  )
}
