import { useEffect, useRef, useState } from 'react'
import '@google/model-viewer'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any
    }
  }
}

interface ModelViewer3DProps {
  modelPath: string
  avatarName: string
  avatarColor: string
  className?: string
  size?: 'small' | 'medium' | 'large'
  exposure?: number
  environmentImage?: string
  shadowIntensity?: number
  disableAutoRotate?: boolean
  cameraOrbit?: string
  showResetButton?: boolean
}

export default function ModelViewer3D({
  modelPath,
  avatarName,
  avatarColor,
  className = '',
  size = 'medium',
  exposure = 1,
  environmentImage = 'neutral',
  shadowIntensity = 1,
  disableAutoRotate = false,
  cameraOrbit = '0deg 75deg 105%',
  showResetButton = true
}: ModelViewer3DProps) {
  const modelViewerRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState(0)
  const [error, setError] = useState(false)

  const sizeClasses = {
    small: 'w-24 h-24',
    medium: 'w-64 h-64',
    large: 'w-full h-full'
  }

  useEffect(() => {
    const modelViewer = modelViewerRef.current
    if (!modelViewer) return

    const handleLoad = () => {
      setIsLoading(false)
      setLoadProgress(100)
    }

    const handleProgress = (event: any) => {
      const progress = event.detail.totalProgress * 100
      setLoadProgress(progress)
    }

    const handleError = () => {
      setError(true)
      setIsLoading(false)
    }

    modelViewer.addEventListener('load', handleLoad)
    modelViewer.addEventListener('progress', handleProgress)
    modelViewer.addEventListener('error', handleError)

    return () => {
      modelViewer.removeEventListener('load', handleLoad)
      modelViewer.removeEventListener('progress', handleProgress)
      modelViewer.removeEventListener('error', handleError)
    }
  }, [])

  const resetCamera = () => {
    if (modelViewerRef.current) {
      modelViewerRef.current.resetTurntableRotation()
      modelViewerRef.current.cameraOrbit = '0deg 75deg 105%'
      modelViewerRef.current.fieldOfView = '30deg'
    }
  }

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Loading Progress */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/80 backdrop-blur-sm rounded-2xl">
          <div className="relative w-24 h-24">
            {/* Circular progress */}
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke={avatarColor + '30'}
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke={avatarColor}
                strokeWidth="6"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - loadProgress / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-black text-sm">
                {Math.round(loadProgress)}%
              </span>
            </div>
          </div>
          <p className="mt-4 text-white text-xs font-black uppercase tracking-widest">
            Loading {avatarName}...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/80 backdrop-blur-sm rounded-2xl">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ff4444" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <p className="mt-4 text-white text-xs font-black uppercase tracking-widest">
            Failed to load
          </p>
        </div>
      )}

      {/* Glowing Base Platform */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-8 rounded-full blur-2xl opacity-40 animate-pulse"
        style={{ backgroundColor: avatarColor }}
      />
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[70%] h-2 rounded-full opacity-60"
        style={{
          background: `radial-gradient(ellipse, ${avatarColor} 0%, transparent 70%)`,
          boxShadow: `0 0 40px ${avatarColor}80`
        }}
      />

      {/* 3D Model Viewer */}
      <model-viewer
        ref={modelViewerRef}
        src={modelPath}
        alt={avatarName}
        camera-controls={disableAutoRotate ? undefined : true}
        touch-action="pan-y"
        auto-rotate={disableAutoRotate ? undefined : true}
        auto-rotate-delay="1000"
        rotation-per-second="30deg"
        camera-orbit={cameraOrbit}
        field-of-view="30deg"
        min-camera-orbit="auto auto 50%"
        max-camera-orbit="auto auto 200%"
        shadow-intensity={String(shadowIntensity)}
        shadow-softness="0.5"
        exposure={String(exposure)}
        environment-image={environmentImage}
        style={{
          width: '100%',
          height: '100%',
          background: 'transparent'
        }}
      />

      {/* Reset Camera Button */}
      {!isLoading && !error && size !== 'small' && showResetButton && (
        <button
          onClick={resetCamera}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white text-[9px] font-black uppercase tracking-widest hover:bg-white/20 transition-all shadow-xl z-10"
          style={{
            textShadow: `0 0 10px ${avatarColor}`,
          }}
        >
          Reset View
        </button>
      )}
    </div>
  )
}
