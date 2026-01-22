import { useState, useRef, useEffect, useCallback } from 'react'
import { Avatar3D } from '../../config/avatars'
import ModelViewer3D from './ModelViewer3D'
import AssistantBubble from './AssistantBubble'

interface TourMode {
  currentStep: number
  totalSteps: number
  text: string
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

interface AvatarCompanionProps {
  avatar: Avatar3D
  onClose: () => void
  onClick?: () => void           // Click callback for VIP features
  activeTab?: string             // Current page tab
  showVipHint?: boolean          // Show VIP feature hint
  showProactiveHint?: boolean    // Show proactive hint tooltip
  showAssistantBubble?: boolean  // Show assistant bubble popup
  onCloseBubble?: () => void     // Close bubble callback
  onSelectText?: (text: string) => void  // Text selection callback
  partnerLastMessage?: string    // Partner's last message for response suggestions
  chatHistory?: any[] // Context for AI
  initialAction?: 'rewrite' | 'response' | 'topic' | null  // Initial action from chat toolbar
  initialInputText?: string      // Initial input text for rewrite action
  onActionConsumed?: () => void  // Callback when action is consumed
  showPolishHint?: boolean       // Show polish hint tooltip (diary manual mode)
  showPolishButton?: boolean     // Show polish button (diary manual mode)
  profileDialogueText?: string | null  // Dialogue text to show on profile page
  animateLookingCloser?: boolean // Animate avatar moving closer when viewing community post
  showCommunityPolishButton?: boolean // Show polish button when creating community post
  tourTargetPosition?: { x: number; y: number } | null  // Override position during tour guide
  tourMode?: TourMode | null     // Tour guide mode with unified bubble
}

export default function AvatarCompanion({ avatar, onClose, onClick, activeTab, showVipHint, showProactiveHint, showAssistantBubble, onCloseBubble, onSelectText, partnerLastMessage, chatHistory, initialAction, initialInputText, onActionConsumed, showPolishHint, showPolishButton, profileDialogueText, animateLookingCloser, showCommunityPolishButton, tourTargetPosition, tourMode }: AvatarCompanionProps) {
  const [position, setPosition] = useState(() => {
    // Load saved position from sessionStorage or use default
    const saved = sessionStorage.getItem('avatarCompanionPosition')
    return saved ? JSON.parse(saved) : { x: window.innerWidth - 200, y: 100 }
  })
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const companionRef = useRef<HTMLDivElement>(null)

  // Use refs to avoid stale closures in event handlers
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const clickStartRef = useRef({ x: 0, y: 0, time: 0 })
  const onClickRef = useRef(onClick)
  onClickRef.current = onClick

  // Save position to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('avatarCompanionPosition', JSON.stringify(position))
  }, [position])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't drag when clicking buttons or textareas
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('textarea')) {
      return
    }

    e.preventDefault() // Prevent browser drag behavior on images

    // Record click start position and time
    clickStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() }

    // Calculate offset from current position
    const rect = companionRef.current?.getBoundingClientRect()
    if (rect) {
      dragOffsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    }

    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      const newX = e.clientX - dragOffsetRef.current.x
      const newY = e.clientY - dragOffsetRef.current.y

      // Keep within viewport bounds
      const maxX = window.innerWidth - 120
      const maxY = window.innerHeight - 120

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      })
    }

    const handleMouseUp = (e: MouseEvent) => {
      // Check if this was a click (small movement, short duration)
      const dx = Math.abs(e.clientX - clickStartRef.current.x)
      const dy = Math.abs(e.clientY - clickStartRef.current.y)
      const dt = Date.now() - clickStartRef.current.time

      // If movement < 5px and time < 300ms, treat as click
      if (dx < 5 && dy < 5 && dt < 300 && onClickRef.current) {
        onClickRef.current()
      }

      setIsDragging(false)
    }

    // Add listeners immediately
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // Get tooltip text based on activeTab
  const getTooltipText = () => {
    if (activeTab === 'soulsync' && showVipHint) {
      return 'Click for emotion analysis'
    }
    return avatar.name
  }

  // Elevate z-index when viewing post detail OR when creating post (to stay above modal backdrop)
  // Also stay elevated when AssistantBubble is open on community tab, or during tour
  const shouldElevate = animateLookingCloser || showCommunityPolishButton || (showAssistantBubble && activeTab === 'community') || !!tourTargetPosition

  // Use tour target position if provided, otherwise use draggable position
  const displayPosition = tourTargetPosition || position

  return (
    <div
      ref={companionRef}
      className={`fixed ${shouldElevate ? 'z-[101]' : 'z-[90]'} ${isDragging ? 'cursor-grabbing scale-110' : onClick ? 'cursor-pointer' : 'cursor-grab'} ${isHovered && !animateLookingCloser ? 'scale-105' : ''}`}
      style={{
        left: `${displayPosition.x}px`,
        top: `${displayPosition.y}px`,
        userSelect: 'none',
        transform: animateLookingCloser ? 'translateX(30px) scale(1.15)' : undefined,
        transition: tourTargetPosition
          ? 'left 0.4s ease-out, top 0.4s ease-out, transform 0.3s ease-out, z-index 0.1s'
          : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), z-index 0.1s'
      }}
      onMouseDown={tourTargetPosition ? undefined : handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Avatar Container */}
      <div className="relative group">
        {/* Assistant Bubble - smart positioning based on Avatar location */}
        <AssistantBubble
          isOpen={showAssistantBubble || false}
          onClose={onCloseBubble || (() => { })}
          onSelectText={onSelectText || (() => { })}
          partnerLastMessage={partnerLastMessage}
          chatHistory={chatHistory}
          initialAction={initialAction}
          initialInputText={initialInputText}
          onActionConsumed={onActionConsumed}
          avatarPosition={position}
        />

        {/* Avatar Display - Video or 3D Model fallback */}
        <div className="relative w-48 h-48">
          {avatar.videoPath ? (
            <img
              src={avatar.videoPath}
              alt={avatar.name}
              draggable={false}
              className="w-full h-full object-contain pointer-events-none"
              style={{
                filter: `drop-shadow(0 0 20px ${avatar.color}40)`
              }}
            />
          ) : (
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
          )}
        </div>

        {/* Hover tooltip - hide when bubble is open */}
        {isHovered && !isDragging && !showProactiveHint && !showAssistantBubble && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-2 bg-black/90 backdrop-blur-sm text-white rounded-2xl text-xs font-black uppercase tracking-widest whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-300">
            {getTooltipText()}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
          </div>
        )}

        {/* Proactive hint tooltip - persistent bubble when user pauses typing */}
        {showProactiveHint && !isDragging && !showAssistantBubble && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-5 py-3 bg-white rounded-2xl shadow-xl border border-purple-100 whitespace-nowrap animate-in fade-in zoom-in-95 duration-300">
            <p className="text-sm font-bold text-gray-700">Need help polishing? ✨</p>
            <p className="text-[10px] text-gray-400 font-bold mt-0.5">Click me to get suggestions</p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-white"></div>
          </div>
        )}

        {/* Polish hint - 5 second reminder on diary manual mode */}
        {showPolishHint && !isDragging && !showAssistantBubble && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-5 py-3 bg-white rounded-2xl shadow-xl border border-purple-100 whitespace-nowrap animate-in fade-in zoom-in-95 duration-300">
            <p className="text-sm font-bold text-gray-700">Try the polish feature! ✨</p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-white"></div>
          </div>
        )}

        {/* Profile dialogue bubble - welcome/catchphrase on profile page */}
        {profileDialogueText && !isDragging && !showAssistantBubble && !tourMode && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-5 py-2.5 bg-white rounded-2xl shadow-xl border border-purple-100 max-w-[320px] min-w-[200px] animate-in fade-in zoom-in-95 duration-300">
            <p className="text-sm font-bold text-gray-700 text-center">{profileDialogueText}</p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-white"></div>
          </div>
        )}

        {/* Tour mode unified bubble - integrated step progress + dialogue + navigation */}
        {tourMode && !isDragging && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-[320px] animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 shadow-2xl border border-white/30">
              {/* Step progress bar */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex space-x-1.5">
                  {Array.from({ length: tourMode.totalSteps }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i + 1 === tourMode.currentStep
                          ? 'bg-accent w-5'
                          : i + 1 < tourMode.currentStep
                            ? 'bg-accent/50 w-3'
                            : 'bg-gray-200 w-3'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={tourMode.onSkip}
                  className="text-gray-300 hover:text-gray-500 transition-colors p-1"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Step number indicator */}
              <div className="mb-2">
                <span className="px-2 py-0.5 bg-accent/10 text-accent rounded-full text-[10px] font-black uppercase tracking-wider">
                  Step {tourMode.currentStep}/{tourMode.totalSteps}
                </span>
              </div>

              {/* Dialogue text */}
              <p className="text-sm text-gray-700 leading-relaxed mb-4">{tourMode.text}</p>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between">
                <div>
                  {tourMode.currentStep > 1 ? (
                    <button
                      onClick={tourMode.onBack}
                      className="text-gray-400 hover:text-gray-600 font-bold text-xs transition-colors flex items-center space-x-1"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                      <span>Back</span>
                    </button>
                  ) : (
                    <button
                      onClick={tourMode.onSkip}
                      className="text-gray-400 hover:text-gray-600 font-medium text-xs transition-colors"
                    >
                      Skip tour
                    </button>
                  )}
                </div>
                <button
                  onClick={tourMode.onNext}
                  className="px-4 py-2 bg-accent text-white rounded-full font-black text-sm shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center space-x-1.5"
                >
                  <span>{tourMode.currentStep === tourMode.totalSteps ? 'Got it!' : 'Next'}</span>
                  {tourMode.currentStep < tourMode.totalSteps && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {/* Triangle pointer towards Avatar */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-4 h-4 bg-white/95 rotate-45 rounded-sm shadow-lg" />
          </div>
        )}

        {/* Control buttons - only show on hover, hide during tour to prevent stuck state */}
        {isHovered && !isDragging && !tourMode && (
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

        {/* VIP Feature Hint Badge - Show when showVipHint is true */}
        {showVipHint && !isDragging && !showAssistantBubble && (
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="px-3 py-1.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg whitespace-nowrap flex items-center space-x-1">
              <span>✨</span>
              <span>Click me!</span>
            </div>
          </div>
        )}

        {/* Polish button - Show in diary manual mode (same style as Click me!) */}
        {showPolishButton && !isDragging && !showAssistantBubble && (
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="px-3 py-1.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg whitespace-nowrap flex items-center space-x-1">
              <span>✨</span>
              <span>Polish</span>
            </div>
          </div>
        )}

        {/* Polish button - Show when creating community post (same style as diary) */}
        {showCommunityPolishButton && !isDragging && !showAssistantBubble && (
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="px-3 py-1.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg whitespace-nowrap flex items-center space-x-1">
              <span>✨</span>
              <span>Polish</span>
            </div>
          </div>
        )}

        {/* Drag hint - only show when no VIP hint or Polish button */}
        {!isDragging && !showVipHint && !showPolishButton && !showCommunityPolishButton && (
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
