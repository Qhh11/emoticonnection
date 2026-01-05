import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AVATARS_3D, Avatar3D } from '../../config/avatars'
import ModelViewer3D from './ModelViewer3D'

// Import 2D avatar images for preview thumbnails
import BlueyImg from '../../assets/2d/Bluey.png'
import BlushyImg from '../../assets/2d/Blushy.png'
import GrumpyImg from '../../assets/2d/Grumpy.png'
import ScaredyImg from '../../assets/2d/Scaredy.png'
import SnoozyImg from '../../assets/2d/Snoozy.png'
import SparkleImg from '../../assets/2d/Sparkle.png'
import SunnyImg from '../../assets/2d/Sunny.png'
import YuckyImg from '../../assets/2d/Yucky.png'
import ZippyImg from '../../assets/2d/Zippy.png'

const avatarImages: Record<string, string> = {
  'bluey': BlueyImg,
  'blushy': BlushyImg,
  'grumpy': GrumpyImg,
  'scaredy': ScaredyImg,
  'snoozy': SnoozyImg,
  'sparkle': SparkleImg,
  'sunny': SunnyImg,
  'yucky': YuckyImg,
  'zippy': ZippyImg,
}

interface AvatarGalleryProps {
  isOpen: boolean
  onClose: () => void
  onSelectAvatar: (avatar: Avatar3D) => void
  selectedAvatarId?: string
}

export default function AvatarGallery({ isOpen, onClose, onSelectAvatar, selectedAvatarId }: AvatarGalleryProps) {
  const [viewingAvatar, setViewingAvatar] = useState<Avatar3D | null>(null)

  if (!isOpen) return null

  if (viewingAvatar) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
        <div className="relative w-full max-w-3xl bg-white rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-500 my-4">
          {/* Close button */}
          <button
            onClick={() => setViewingAvatar(null)}
            className="absolute top-8 right-8 z-10 w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm border border-black/5 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <div className="grid lg:grid-cols-2 gap-0">
            {/* 3D Model Display */}
            <div
              className="relative h-[400px] lg:h-[480px] flex items-center justify-center overflow-hidden"
              style={{
                background: `radial-gradient(ellipse at center, ${viewingAvatar.color}15 0%, ${viewingAvatar.color}05 50%, transparent 100%)`
              }}
            >
              {/* Ambient glow */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  background: `radial-gradient(circle at 50% 80%, ${viewingAvatar.color}40 0%, transparent 60%)`
                }}
              />

              {/* 3D Model Viewer */}
              <div className="relative z-10 w-full h-full flex items-center justify-center p-8">
                <ModelViewer3D
                  modelPath={viewingAvatar.modelPath}
                  avatarName={viewingAvatar.name}
                  avatarColor={viewingAvatar.color}
                  size="large"
                  className="drop-shadow-2xl"
                  exposure={viewingAvatar.exposure}
                  environmentImage={viewingAvatar.environmentImage}
                  shadowIntensity={viewingAvatar.shadowIntensity}
                />
              </div>

              {/* Floating particles */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(15)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 rounded-full animate-float-slower"
                    style={{
                      backgroundColor: viewingAvatar.color,
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      opacity: Math.random() * 0.4,
                      animationDelay: `${Math.random() * 3}s`
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Avatar Details */}
            <div className="p-8 flex flex-col justify-between">
              <div className="space-y-8">
                <div className="space-y-3">
                  <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full border border-black/10 bg-gray-50">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: viewingAvatar.color }}></div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">{viewingAvatar.emotion}</span>
                  </div>
                  <h2 className="text-4xl font-black tracking-tighter uppercase">{viewingAvatar.name}</h2>
                </div>

                <p className="text-base font-bold text-gray-600 leading-relaxed">
                  {viewingAvatar.description}
                </p>

                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-300">Personality Traits</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {viewingAvatar.personality.map((trait, i) => (
                      <div
                        key={i}
                        className="px-4 py-3 rounded-2xl bg-gray-50 border border-black/5 text-xs font-bold text-gray-700 text-center hover:scale-105 transition-transform"
                      >
                        {trait}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-8">
                <button
                  onClick={() => setViewingAvatar(null)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    onSelectAvatar(viewingAvatar)
                    setViewingAvatar(null)
                    onClose()
                  }}
                  className="flex-1 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
                  style={{
                    backgroundColor: viewingAvatar.color,
                    color: viewingAvatar.emotion === 'Joy' ? '#121212' : '#ffffff'
                  }}
                >
                  {selectedAvatarId === viewingAvatar.id ? 'Selected ✓' : 'Select Companion'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-500 my-4">
        {/* Header */}
        <div className="relative p-8 border-b border-black/5">
          <button
            onClick={onClose}
            className="absolute top-8 right-8 w-12 h-12 rounded-full bg-gray-50 border border-black/5 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tighter uppercase">Avatar Gallery</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Choose your emotional companion</p>
          </div>
        </div>

        {/* Avatar Grid */}
        <div className="p-8 max-h-[65vh] overflow-y-auto scrollbar-hide">
          <div className="grid md:grid-cols-3 gap-5">
            {AVATARS_3D.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => setViewingAvatar(avatar)}
                disabled={avatar.isLocked}
                className="group relative aspect-[3/4] rounded-[2rem] overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  borderColor: selectedAvatarId === avatar.id ? avatar.color : 'transparent',
                  backgroundColor: avatar.color + '10'
                }}
              >
                {/* Glass showcase effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/10 to-transparent backdrop-blur-[2px] pointer-events-none"></div>

                {/* Avatar Image */}
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <img
                    src={avatarImages[avatar.id]}
                    alt={avatar.name}
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                  />
                </div>

                {/* Avatar Info */}
                <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black/80 to-transparent text-white">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black uppercase tracking-tight">{avatar.name}</h3>
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-80">{avatar.emotion}</p>
                  </div>
                </div>

                {/* Selected indicator */}
                {selectedAvatarId === avatar.id && (
                  <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center animate-in zoom-in-95 duration-300">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={avatar.color} strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                )}

                {/* Lock overlay */}
                {avatar.isLocked && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white">VIP Only</p>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
