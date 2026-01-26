import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  matchApi,
  EmotionType,
  SupportRole,
  SupportNeed,
  TopicTag,
} from '../../../services/api'
import { MatchLock } from '../matchLock'

// Global Mood-Color Mapping from DESIGN_SYSTEM.md
const MOOD_DATA: { label: string; color: string; text: string; value: EmotionType }[] = [
  { label: 'Bored', color: '#4B4E91', text: '#ffffff', value: 'neutral' },
  { label: 'Fear', color: '#9381BA', text: '#ffffff', value: 'anxious' },
  { label: 'Joy', color: '#F9D849', text: '#121212', value: 'happy' },
  { label: 'Sad', color: '#3266B1', text: '#ffffff', value: 'sad' },
  { label: 'Disgust', color: '#66B04C', text: '#ffffff', value: 'frustrated' },
  { label: 'Anxious', color: '#E67E22', text: '#ffffff', value: 'anxious' },
  { label: 'Angry', color: '#D32F2F', text: '#ffffff', value: 'frustrated' },
  { label: 'Awkward', color: '#D278A3', text: '#ffffff', value: 'uncertain' },
  { label: 'Envy', color: '#2BA8A4', text: '#ffffff', value: 'frustrated' },
]

// Role data for V2 matching
const ROLE_DATA: { value: SupportRole; label: string; description: string; emoji: string }[] = [
  { value: 'seeker', label: 'Seeker', description: 'I need support', emoji: '🙋' },
  { value: 'supporter', label: 'Supporter', description: 'I can help', emoji: '🤗' },
  { value: 'either', label: 'Either', description: 'Both is fine', emoji: '💬' },
]

// Support need data for V2 matching
const NEED_DATA: { value: SupportNeed; label: string; description: string; emoji: string }[] = [
  { value: 'vent', label: 'Vent', description: 'Just need to talk', emoji: '💭' },
  { value: 'advice', label: 'Advice', description: 'Want suggestions', emoji: '💡' },
  { value: 'companion', label: 'Companion', description: 'Just want company', emoji: '🫂' },
  { value: 'distraction', label: 'Distraction', description: 'Take my mind off', emoji: '🎮' },
]

// Topic data for V2 matching
const TOPIC_DATA: { value: TopicTag; label: string; emoji: string }[] = [
  { value: 'general', label: 'General', emoji: '💬' },
  { value: 'relationships', label: 'Relationships', emoji: '💑' },
  { value: 'anxiety', label: 'Anxiety', emoji: '😰' },
  { value: 'depression', label: 'Depression', emoji: '😞' },
  { value: 'work_stress', label: 'Work', emoji: '💼' },
  { value: 'academic', label: 'Academic', emoji: '📚' },
  { value: 'family', label: 'Family', emoji: '👨‍👩‍👧' },
  { value: 'loneliness', label: 'Loneliness', emoji: '🏠' },
  { value: 'self_esteem', label: 'Self Esteem', emoji: '🪞' },
]

export interface MatchResult {
  roomId: string
  partnerId: string
  isAnonymous: boolean
  matchScore?: number
  matchReason?: string
  moodColor: string
}

interface MatchingModalProps {
  isOpen: boolean
  onClose: () => void
  onMatchSuccess: (result: MatchResult) => void
  userId?: string
  onInteract: (e: React.MouseEvent) => void
}

export default function MatchingModal({
  isOpen,
  onClose,
  onMatchSuccess,
  userId,
  onInteract,
}: MatchingModalProps) {
  // Matching states
  const [isSearching, setIsSearching] = useState(false)
  const [matchedPartner, setMatchedPartner] = useState<{
    roomId: string
    partnerId: string
    isAnonymous: boolean
    matchScore?: number
    matchReason?: string
  } | null>(null)
  const [selectedMood, setSelectedMood] = useState<typeof MOOD_DATA[0]>(MOOD_DATA[2])
  const [isAnonymousMatch, setIsAnonymousMatch] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const pollTimerRef = useRef<number | null>(null)

  // V2 Matching preferences
  const [selectedRole, setSelectedRole] = useState<SupportRole>('either')
  const [selectedNeed, setSelectedNeed] = useState<SupportNeed>('companion')
  const [selectedTopic, setSelectedTopic] = useState<TopicTag>('general')
  const [selectedIntensity, setSelectedIntensity] = useState(3)

  // Queue status
  const [queuePosition, setQueuePosition] = useState<number | null>(null)
  const [estimatedWait, setEstimatedWait] = useState<string | null>(null)
  const [safetyTips, setSafetyTips] = useState<string[]>([])

  // MatchLock for cross-tab sync
  const matchLockRef = useRef<MatchLock | null>(null)

  // Init lock once
  useEffect(() => {
    matchLockRef.current = new MatchLock({
      onLockLost: () => {
        console.warn('[MatchLock] Lost lock to another tab. Stopping search.')
        matchApi.cancelMatch().catch(() => {})
        setIsSearching(false)
        setMatchedPartner(null)
        setQueuePosition(null)
        setEstimatedWait(null)
        setSafetyTips([])
      },
    })

    return () => {
      const lock = matchLockRef.current
      lock?.stopHeartbeat()
      lock?.releaseIfOwned()
      lock?.dispose()
      matchLockRef.current = null
    }
  }, [])

  // Keep lock alive while searching
  useEffect(() => {
    const lock = matchLockRef.current
    if (!lock) return

    if (isSearching) {
      lock.startHeartbeat()
    } else {
      lock.stopHeartbeat()
    }

    return () => {
      lock.stopHeartbeat()
    }
  }, [isSearching])

  // Match status polling
  useEffect(() => {
    if (!isSearching) {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
      return
    }

    ;(async () => {
      try {
        const status = await matchApi.getStatus()
        if (status.matched && status.room_id) {
          setMatchedPartner({
            roomId: status.room_id,
            partnerId: status.matched_user_id || 'unknown',
            isAnonymous: status.is_anonymous ?? isAnonymousMatch,
            matchScore: status.match_score,
            matchReason: status.match_reason,
          })
          return
        }

        if (status.in_queue) {
          setQueuePosition(status.queue_position || null)
          setEstimatedWait(status.estimated_wait || null)
        }
      } catch (e) {
        console.error('Initial status check failed:', e)
      }
    })()

    pollTimerRef.current = window.setInterval(async () => {
      try {
        const status = await matchApi.getStatus()
        if (status.matched && status.room_id) {
          setMatchedPartner({
            roomId: status.room_id,
            partnerId: status.matched_user_id || 'unknown',
            isAnonymous: status.is_anonymous ?? isAnonymousMatch,
            matchScore: status.match_score,
            matchReason: status.match_reason,
          })
        } else if (status.in_queue) {
          setQueuePosition(status.queue_position || null)
          setEstimatedWait(status.estimated_wait || null)
        }
      } catch (e) {
        console.error('Status polling failed:', e)
      }
    }, 1500)

    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [isSearching, isAnonymousMatch])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Don't reset if still searching
      if (!isSearching) {
        setMatchedPartner(null)
        setQueuePosition(null)
        setEstimatedWait(null)
        setSafetyTips([])
      }
    }
  }, [isOpen, isSearching])

  const startMatching = async (e: React.MouseEvent) => {
    onInteract(e)

    const lock = matchLockRef.current
    if (!lock) return

    const ok = lock.acquire()
    if (!ok) {
      alert('You are already matching in another tab/window.')
      return
    }

    setIsSearching(true)
    setIsLoading(true)
    setSafetyTips([])
    setQueuePosition(null)
    setEstimatedWait(null)

    try {
      const response = await matchApi.findMatch({
        current_emotion: selectedMood.value,
        emotion_intensity: selectedIntensity,
        role: selectedRole,
        support_need: selectedNeed,
        topic: selectedTopic,
        mode: isAnonymousMatch ? 'human_anonymous' : 'human_non_anonymous',
        risk_level: 'safe',
      })

      if (response.matched && response.room_id) {
        setMatchedPartner({
          roomId: response.room_id,
          partnerId: response.matched_user_id || 'unknown',
          isAnonymous: response.is_anonymous,
          matchScore: response.match_score,
          matchReason: response.match_reason,
        })
      } else {
        if (response.queue_position) setQueuePosition(response.queue_position)
        if (response.estimated_wait) setEstimatedWait(response.estimated_wait)
        if (response.safety_tips) setSafetyTips(response.safety_tips)
      }
    } catch (err) {
      console.error('Match failed:', err)
      setQueuePosition(1)
      setEstimatedWait('Waiting for other users...')
    } finally {
      setIsLoading(false)
    }
  }

  const cancelMatching = async () => {
    try {
      await matchApi.cancelMatch()
    } catch (err) {
      console.error('Cancel match failed:', err)
    }

    const lock = matchLockRef.current
    lock?.stopHeartbeat()
    lock?.releaseIfOwned()

    setIsSearching(false)
    setMatchedPartner(null)
    setQueuePosition(null)
    setEstimatedWait(null)
    setSafetyTips([])
  }

  const confirmMatch = useCallback(async () => {
    if (!matchedPartner || !userId) return
    const roomId = matchedPartner.roomId

    try {
      await matchApi.ackMatch(roomId)
    } catch (e) {
      console.warn('ack match failed', e)
    }

    const lock = matchLockRef.current
    lock?.stopHeartbeat()
    lock?.releaseIfOwned()

    setIsSearching(false)
    setMatchedPartner(null)

    // Call success callback with match result
    onMatchSuccess({
      roomId,
      partnerId: matchedPartner.partnerId,
      isAnonymous: matchedPartner.isAnonymous,
      matchScore: matchedPartner.matchScore,
      matchReason: matchedPartner.matchReason,
      moodColor: selectedMood.color,
    })
  }, [matchedPartner, userId, selectedMood.color, onMatchSuccess])

  // Handle close - cancel if searching
  const handleClose = () => {
    if (isSearching) {
      cancelMatching()
    }
    onClose()
  }

  if (!isOpen && !isSearching) return null

  // Searching/Match Found Portal
  if (isSearching) {
    return createPortal(
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <div className="flex flex-col items-center justify-center space-y-12">
          {!matchedPartner ? (
            <>
              <div className="relative">
                <div className="w-48 h-48 rounded-full border-4 border-accent/20 animate-ping absolute"></div>
                <div className="w-48 h-48 rounded-full border-2 border-accent/40 animate-pulse absolute delay-75"></div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="w-48 h-48 bg-white rounded-[3rem] shadow-2xl flex items-center justify-center text-7xl z-10 relative"
                >
                  {selectedMood.label === 'Joy' ? '😊' : selectedMood.label === 'Sad' ? '😢' : '😐'}
                </motion.div>
              </div>
              <div className="text-center space-y-4">
                <h3 className="text-4xl font-black uppercase tracking-tighter text-white">
                  {isLoading ? 'Searching Pulse' : 'In Queue...'}
                </h3>
                <p className="text-white/80 font-black uppercase text-[13px] tracking-[0.3em]">
                  {selectedRole === 'seeker'
                    ? '🙋 Seeking Support'
                    : selectedRole === 'supporter'
                      ? '🤗 Ready to Help'
                      : '💬 Open to Both'}{' '}
                  • {selectedMood.label}
                </p>
                {(queuePosition || estimatedWait) && (
                  <div className="mt-4 space-y-2">
                    {queuePosition && (
                      <p className="text-white/60 text-sm font-bold">Queue Position: #{queuePosition}</p>
                    )}
                    {estimatedWait && (
                      <p className="text-white/60 text-sm font-bold">Estimated Wait: {estimatedWait}</p>
                    )}
                  </div>
                )}
                {safetyTips.length > 0 && (
                  <div className="mt-6 p-4 bg-white/10 rounded-2xl text-left max-w-md">
                    <p className="text-white/80 text-xs font-black uppercase tracking-widest mb-2">Safety Tips</p>
                    {safetyTips.map((tip, i) => (
                      <p key={i} className="text-white/70 text-sm mb-1">
                        • {tip}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={cancelMatching}
                className="px-8 py-3 bg-white text-gray-800 rounded-full text-[13px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all shadow-xl"
              >
                Cancel
              </button>
            </>
          ) : (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="bg-white p-10 rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border border-black/5 text-center space-y-8"
            >
              <div className="space-y-2">
                <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-green-50 text-green-600 border border-green-100">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-[12px] font-black uppercase tracking-widest">Match Found!</span>
                </div>
              </div>
              <button
                onClick={confirmMatch}
                className="px-12 py-5 bg-black text-white rounded-[1.5rem] text-sm font-black uppercase tracking-wide shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                Confirm Connection
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>,
      document.body
    )
  }

  // Preference Selection Modal
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="bg-white/90 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/30 shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black tracking-tight">FRIEND MATCHING</h2>
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Sync Mode */}
              <div id="tour-sync-mode" className="space-y-3">
                <h4 className="font-black text-[11px] uppercase tracking-[0.25em] text-gray-400">Sync Mode</h4>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsAnonymousMatch(true)}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-center space-x-2 ${
                      isAnonymousMatch ? 'border-indigo-500 bg-indigo-50 shadow-inner' : 'border-black/5 hover:border-black/10'
                    }`}
                  >
                    <span className="text-xl">🎭</span>
                    <span className="text-[11px] font-black uppercase tracking-widest">Anonymous</span>
                  </button>
                  <button
                    onClick={() => setIsAnonymousMatch(false)}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-center space-x-2 ${
                      !isAnonymousMatch ? 'border-blue-500 bg-blue-50 shadow-inner' : 'border-black/5 hover:border-black/10'
                    }`}
                  >
                    <span className="text-xl">👤</span>
                    <span className="text-[11px] font-black uppercase tracking-widest">Public</span>
                  </button>
                </div>
              </div>

              {/* Role Selector */}
              <div id="tour-your-role" className="space-y-3">
                <h4 className="font-black text-[11px] uppercase tracking-[0.25em] text-gray-400">Your Role</h4>
                <div className="grid grid-cols-3 gap-2">
                  {ROLE_DATA.map(r => (
                    <button
                      key={r.value}
                      onClick={() => setSelectedRole(r.value)}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center space-y-1 ${
                        selectedRole === r.value ? 'border-accent bg-accent/5 shadow-inner' : 'border-black/5 hover:border-black/10'
                      }`}
                    >
                      <span className="text-xl">{r.emoji}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest">{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Support Need Selector */}
              <div id="tour-what-you-need" className="space-y-3">
                <h4 className="font-black text-[11px] uppercase tracking-[0.25em] text-gray-400">What Do You Need?</h4>
                <div className="flex flex-wrap gap-2">
                  {NEED_DATA.map(n => (
                    <button
                      key={n.value}
                      onClick={() => setSelectedNeed(n.value)}
                      className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-full border transition-all active:scale-95 ${
                        selectedNeed === n.value
                          ? 'border-accent bg-accent text-white shadow-lg'
                          : 'border-black/5 bg-gray-50 text-gray-500 hover:border-black/10'
                      }`}
                    >
                      <span>{n.emoji}</span>
                      <span className="text-[11px] font-black uppercase tracking-widest">{n.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Emotion/Resonance Selector */}
              <div id="tour-resonance" className="space-y-3">
                <h4 className="font-black text-[11px] uppercase tracking-[0.25em] text-gray-400">Set Your Resonance</h4>
                <div className="flex flex-wrap gap-2">
                  {MOOD_DATA.map(m => (
                    <button
                      key={m.label}
                      onClick={() => setSelectedMood(m)}
                      className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-full border transition-all active:scale-95 ${
                        selectedMood.label === m.label
                          ? 'border-accent bg-accent text-white shadow-lg'
                          : 'border-black/5 bg-gray-50 text-gray-400 hover:border-black/10'
                      }`}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: selectedMood.label === m.label ? '#ffffff' : m.color }}
                      ></div>
                      <span className="text-[11px] font-black uppercase tracking-widest">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Intensity Slider */}
              <div id="tour-intensity" className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-[11px] uppercase tracking-[0.25em] text-gray-400">Intensity</h4>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {selectedIntensity === 1
                      ? 'Very Low'
                      : selectedIntensity === 2
                        ? 'Low'
                        : selectedIntensity === 3
                          ? 'Moderate'
                          : selectedIntensity === 4
                            ? 'High'
                            : 'Very High'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map(level => (
                    <button
                      key={level}
                      onClick={() => setSelectedIntensity(level)}
                      className={`flex-1 h-8 rounded-lg transition-all ${
                        selectedIntensity >= level ? 'bg-accent shadow-inner' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                      style={{ opacity: selectedIntensity >= level ? 0.4 + level * 0.15 : 1 }}
                    />
                  ))}
                </div>
              </div>

              {/* Topic Selector */}
              <div className="space-y-3">
                <h4 className="font-black text-[11px] uppercase tracking-[0.25em] text-gray-400">Topic (Optional)</h4>
                <div className="flex flex-wrap gap-2">
                  {TOPIC_DATA.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setSelectedTopic(t.value)}
                      className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-full border transition-all active:scale-95 text-[10px] ${
                        selectedTopic === t.value
                          ? 'border-accent bg-accent/10 text-accent shadow-sm'
                          : 'border-black/5 bg-gray-50 text-gray-400 hover:border-black/10'
                      }`}
                    >
                      <span>{t.emoji}</span>
                      <span className="font-black uppercase tracking-wider">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Find Button */}
              <div className="pt-4">
                <button
                  onClick={startMatching}
                  disabled={!userId}
                  className="w-full py-4 bg-accent text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:opacity-90 transition-all flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Find Friends</span>
                  <span className="text-xl">⚡</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
