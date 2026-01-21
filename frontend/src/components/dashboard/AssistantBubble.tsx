/**
 * AssistantBubble - Avatar 助手气泡弹窗
 * 位于 Avatar 上方，提供 Rewrite/Response/Topic 三个功能
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { aiHelperApi } from '../../services/api'

interface AssistantBubbleProps {
  isOpen: boolean
  onClose: () => void
  onSelectText: (text: string) => void
  partnerLastMessage?: string
  chatHistory?: any[]
  initialAction?: 'rewrite' | 'response' | 'topic' | null  // Initial action from chat toolbar
  initialInputText?: string      // Initial input text for rewrite action
  onActionConsumed?: () => void  // Callback when action is consumed
  avatarPosition?: { x: number; y: number }  // Avatar position for smart positioning
  context?: 'chat' | 'diary' | 'community'  // Scene context for filtering features
}

// 功能按钮配置
const features = [
  { id: 'rewrite' as const, label: 'REWRITE', icon: '✍️', bg: 'bg-orange-50', hover: 'hover:bg-orange-100' },
  { id: 'response' as const, label: 'REPLY', icon: '💬', bg: 'bg-blue-50', hover: 'hover:bg-blue-100' },
  { id: 'topic' as const, label: 'TOPIC', icon: '💡', bg: 'bg-yellow-50', hover: 'hover:bg-yellow-100' }
]

// 语气配置
const toneConfigs = {
  gentle: { label: 'Gentle', color: 'bg-pink-100 text-pink-600 border-pink-200', icon: '🌸' },
  cool: { label: 'Cool', color: 'bg-blue-100 text-blue-600 border-blue-200', icon: '❄️' },
  humorous: { label: 'Humorous', color: 'bg-yellow-100 text-yellow-600 border-yellow-200', icon: '🤡' },
  direct: { label: 'Direct', color: 'bg-purple-100 text-purple-600 border-purple-200', icon: '🎯' }
}

type ViewType = 'menu' | 'rewrite' | 'response' | 'topic'

export default function AssistantBubble({ isOpen, onClose, onSelectText, partnerLastMessage, chatHistory, initialAction, initialInputText, onActionConsumed, avatarPosition, context }: AssistantBubbleProps) {
  const [view, setView] = useState<ViewType>('menu')
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [options, setOptions] = useState<Record<string, string> | null>(null)
  const [topics, setTopics] = useState<{ emoji: string; text: string }[] | null>(null)

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setView('menu')
      setInput('')
      setIsThinking(false)
      setOptions(null)
      setTopics(null)
    }
  }, [isOpen])

  // Track if initial action has been processed
  const [initialActionProcessed, setInitialActionProcessed] = useState(false)

  // Reset processed flag when action changes - allows switching between actions while bubble is open
  useEffect(() => {
    setInitialActionProcessed(false)
  }, [initialAction, initialInputText])

  // Helper function for auto rewrite (used in initial action)
  const autoRewrite = async (text: string) => {
    setIsThinking(true)
    try {
      const res = await aiHelperApi.rewrite({
        text,
        styles: ['gentle', 'cool', 'humorous', 'direct']
      })
      try {
        const cleanJson = res.rewritten_text.replace(/```json/g, '').replace(/```/g, '').trim()
        const results = JSON.parse(cleanJson)
        setOptions(results)
      } catch (e) {
        console.error('Failed to parse rewrite JSON:', e, res.rewritten_text)
        setOptions({ direct: res.rewritten_text })
      }
    } catch (err) {
      console.error('Rewrite failed:', err)
    } finally {
      setIsThinking(false)
    }
  }

  // Helper function for auto response (used in initial action)
  const autoResponse = async () => {
    let historyToUse = chatHistory || []
    if (historyToUse.length === 0 && partnerLastMessage) {
      historyToUse = [{ role: 'user', text: partnerLastMessage }]
    }
    if (historyToUse.length === 0) return

    setIsThinking(true)
    try {
      const history = historyToUse.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [m.text]
      }))
      const res = await aiHelperApi.suggestReply({
        history,
        styles: ['gentle', 'cool', 'humorous', 'direct']
      })
      try {
        const cleanJson = res.suggestions.replace(/```json/g, '').replace(/```/g, '').trim()
        const results = JSON.parse(cleanJson)
        setOptions(results)
      } catch (e) {
        console.error('Failed to parse reply JSON:', e, res.suggestions)
        setOptions({ direct: res.suggestions })
      }
    } catch (err) {
      console.error('Suggest reply failed:', err)
    } finally {
      setIsThinking(false)
    }
  }

  // Helper function for auto topics (used in initial action)
  const autoTopics = async () => {
    const historyToUse = chatHistory || []
    setIsThinking(true)
    try {
      const history = historyToUse.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [m.text]
      }))
      const res = await aiHelperApi.suggestTopic({ history })
      const rawTopics = res.suggestions.split('\n')
        .map(t => t.replace(/^\d+\.\s*/, '').replace(/^- \s*/, '').trim())
        .filter(t => t.length > 0)
        .slice(0, 4)
      const emojis = ['🎬', '🍕', '🌙', '🎮', '💡', '🎵', '✈️', '📚', '🎨', '🌮', '🧘']
      const topicObjects = rawTopics.map(text => ({
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        text
      }))
      setTopics(topicObjects)
    } catch (err) {
      console.error('Suggest topics failed:', err)
    } finally {
      setIsThinking(false)
    }
  }

  // Handle initial action from chat toolbar buttons
  useEffect(() => {
    if (isOpen && initialAction && !initialActionProcessed) {
      setView(initialAction)
      setInitialActionProcessed(true)
      setOptions(null)
      setTopics(null)

      // Auto-trigger the corresponding action
      setTimeout(() => {
        if (initialAction === 'rewrite' && initialInputText) {
          setInput(initialInputText)
          autoRewrite(initialInputText)
        } else if (initialAction === 'response') {
          autoResponse()
        } else if (initialAction === 'topic') {
          autoTopics()
        }
      }, 100)

      onActionConsumed?.()
    }

    // Reset processed flag when closed
    if (!isOpen) {
      setInitialActionProcessed(false)
    }
  }, [isOpen, initialAction, initialInputText, initialActionProcessed, onActionConsumed, chatHistory, partnerLastMessage])

  // Rewrite - Real API
  const handleRewrite = async () => {
    if (!input.trim()) return
    setIsThinking(true)
    try {
      const res = await aiHelperApi.rewrite({
        text: input,
        styles: ['gentle', 'cool', 'humorous', 'direct']
      })

      try {
        const cleanJson = res.rewritten_text.replace(/```json/g, '').replace(/```/g, '').trim()
        const results = JSON.parse(cleanJson)
        setOptions(results)
      } catch (e) {
        console.error('Failed to parse rewrite JSON:', e, res.rewritten_text)
        setOptions({ direct: res.rewritten_text })
      }
    } catch (err) {
      console.error('Rewrite failed:', err)
    } finally {
      setIsThinking(false)
    }
  }

  // Suggest Reply - Real API
  const handleResponse = async () => {
    // Determine history to use
    let historyToUse = chatHistory || []

    // If no history but we have a partner message (e.g. from props), construct a fake history
    if (historyToUse.length === 0 && partnerLastMessage) {
      historyToUse = [{ role: 'user', text: partnerLastMessage }]
    }

    if (historyToUse.length === 0) {
      console.warn('No chat history or partner message to reply to.')
      return
    }

    setIsThinking(true)
    try {
      // Format history
      const history = historyToUse.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [m.text]
      }))

      const res = await aiHelperApi.suggestReply({
        history,
        styles: ['gentle', 'cool', 'humorous', 'direct']
      })

      try {
        const cleanJson = res.suggestions.replace(/```json/g, '').replace(/```/g, '').trim()
        const results = JSON.parse(cleanJson)
        setOptions(results)
      } catch (e) {
        console.error('Failed to parse reply JSON:', e, res.suggestions)
        setOptions({ direct: res.suggestions })
      }
    } catch (err) {
      console.error('Suggest reply failed:', err)
    } finally {
      setIsThinking(false)
    }
  }

  // Topic Suggestions - Real API
  const handleTopics = async () => {
    const historyToUse = chatHistory || []
    setIsThinking(true)
    try {
      // Format history
      const history = historyToUse.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [m.text]
      }))

      const res = await aiHelperApi.suggestTopic({ history })

      // Parse suggestions (expecting line separated list)
      const rawTopics = res.suggestions.split('\n')
        .map(t => t.replace(/^\d+\.\s*/, '').replace(/^- \s*/, '').trim())
        .filter(t => t.length > 0)
        .slice(0, 4)

      // Assign random emojis for visual appeal (since API might not return them consistently)
      const emojis = ['🎬', '🍕', '🌙', '🎮', '💡', '🎵', '✈️', '📚', '🎨', '🌮', '🧘']
      const topicObjects = rawTopics.map(text => ({
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        text
      }))

      setTopics(topicObjects)
    } catch (err) {
      console.error('Suggest topics failed:', err)
    } finally {
      setIsThinking(false)
    }
  }

  const handleFeatureClick = (featureId: ViewType) => {
    setView(featureId)
    setOptions(null)
    setTopics(null)
    if (featureId === 'response') handleResponse()
    if (featureId === 'topic') handleTopics()
  }

  const handleSelectOption = (text: string) => {
    onSelectText(text)
    onClose()
  }

  const handleBack = () => {
    setView('menu')
    setOptions(null)
    setTopics(null)
    setInput('')
  }

  // Smart bubble position calculation - prefer left side to avoid blocking chat content
  const getBubblePosition = (): 'left' | 'right' => {
    if (!avatarPosition) return 'left'  // Default to left side

    const bubbleWidth = 288  // w-72 = 18rem = 288px
    const margin = 24  // mr-6 = 24px

    // Check available space on left side
    const spaceOnLeft = avatarPosition.x - margin

    // Prefer left side: only use right if left has no space
    if (spaceOnLeft >= bubbleWidth) {
      return 'left'
    }
    // Fallback to right only when left side has no space
    return 'right'
  }

  const bubblePosition = getBubblePosition()


  // Thinking indicator
  const ThinkingDots = () => (
    <div className="flex justify-center gap-1 py-4">
      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={`absolute bottom-full mb-4 z-[100] w-72 ${
            bubblePosition === 'left' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Bubble body */}
          <div
            className="bg-white/95 backdrop-blur-md rounded-3xl p-4
              shadow-[0_20px_50px_rgba(0,0,0,0.15),inset_0_-4px_4px_rgba(0,0,0,0.05)]
              border border-white/50 relative"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center shadow-md transition-all z-10"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <AnimatePresence mode="wait">
              {/* Menu View */}
              {view === 'menu' && (
                <motion.div
                  key="menu"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.15 }}
                  className="flex justify-between gap-2"
                >
                  {features.map((feature) => (
                    <button
                      key={feature.id}
                      onClick={() => handleFeatureClick(feature.id)}
                      className={`flex flex-col items-center gap-1 group flex-1 p-2 rounded-2xl transition-all ${feature.bg} ${feature.hover}`}
                    >
                      <span className="text-2xl">{feature.icon}</span>
                      <span className="text-[9px] font-black text-gray-500 tracking-wider">{feature.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}

              {/* Rewrite View */}
              {view === 'rewrite' && (
                <motion.div
                  key="rewrite"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  <button onClick={handleBack} className="text-gray-400 text-xs font-bold flex items-center gap-1 hover:text-gray-600">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Back
                  </button>

                  {!options && (
                    <>
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type what you want to say..."
                        className="w-full h-16 p-3 bg-gray-50 rounded-xl border-2 border-transparent focus:border-purple-200 focus:outline-none resize-none text-sm font-medium text-gray-700"
                        disabled={isThinking}
                      />
                      <button
                        onClick={handleRewrite}
                        disabled={!input.trim() || isThinking}
                        className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isThinking ? <ThinkingDots /> : '✍️ Rewrite'}
                      </button>
                    </>
                  )}

                  {options && (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 scrollbar-hide">
                      <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-widest pl-1">Select a style to send:</p>
                      {Object.entries(toneConfigs).map(([key, config]) => (
                        <button
                          key={key}
                          onClick={() => handleSelectOption(options[key])}
                          className={`w-full p-2.5 rounded-xl border font-medium text-xs text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${config.color}`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 opacity-70">
                            <span>{config.icon}</span>
                            <span className="font-black uppercase text-[9px] tracking-wider">{config.label}</span>
                          </div>
                          <div className="line-clamp-3 text-gray-700 leading-relaxed font-semibold">
                            {options[key]}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Response View */}
              {view === 'response' && (
                <motion.div
                  key="response"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  <button onClick={handleBack} className="text-gray-400 text-xs font-bold flex items-center gap-1 hover:text-gray-600">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Back
                  </button>

                  {isThinking && <ThinkingDots />}

                  {!isThinking && !options && !partnerLastMessage && (
                    <div className="text-center text-gray-400 text-xs py-4 px-4">
                      <p className="mb-2">No message to reply to yet.</p>
                      <p className="text-[10px]">Wait for your partner to say something!</p>
                    </div>
                  )}

                  {!isThinking && !options && partnerLastMessage && (
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                        <p className="text-[10px] uppercase font-black text-blue-400 tracking-wider mb-1">Replying to</p>
                        <p className="text-xs font-medium text-gray-600 line-clamp-3 italic">"{partnerLastMessage}"</p>
                      </div>
                      <button
                        onClick={handleResponse}
                        className="w-full py-2 bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md hover:bg-blue-600 transition-all"
                      >
                        Generate Suggestions
                      </button>
                    </div>
                  )}

                  {!isThinking && options && (
                    <>
                      <div className="p-2 bg-gray-50 rounded-lg">
                        <p className="text-[10px] text-gray-400 font-bold">Partner said:</p>
                        <p className="text-xs font-medium text-gray-700 line-clamp-2">"{partnerLastMessage}"</p>
                      </div>
                      <div className="space-y-1.5">
                        {Object.entries(toneConfigs).map(([key, config]) => (
                          <button
                            key={key}
                            onClick={() => handleSelectOption(options[key])}
                            className={`w-full p-2.5 rounded-xl border font-medium text-xs text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${config.color}`}
                          >
                            <span className="mr-1.5">{config.icon}</span>
                            {options[key]}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {/* Topic View */}
              {view === 'topic' && (
                <motion.div
                  key="topic"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  <button onClick={handleBack} className="text-gray-400 text-xs font-bold flex items-center gap-1 hover:text-gray-600">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Back
                  </button>

                  {isThinking && <ThinkingDots />}

                  {topics && (
                    <div className="space-y-1.5">
                      {topics.map((topic, index) => (
                        <button
                          key={index}
                          onClick={() => handleSelectOption(topic.text)}
                          className="w-full p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 font-medium text-xs text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <span className="mr-2">{topic.emoji}</span>
                          {topic.text}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bubble pointer - points down towards Avatar */}
            <div
              className={`absolute -bottom-2 w-4 h-4 bg-white/95 rotate-45 border-r border-b border-white/50 ${
                bubblePosition === 'left' ? 'right-8' : 'left-8'
              }`}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
