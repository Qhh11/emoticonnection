/**
 * AssistantBubble - Avatar 助手气泡弹窗
 * 位于 Avatar 上方，提供 Rewrite/Response/Topic 三个功能
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AssistantBubbleProps {
  isOpen: boolean
  onClose: () => void
  onSelectText: (text: string) => void
  partnerLastMessage?: string
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

export default function AssistantBubble({ isOpen, onClose, onSelectText, partnerLastMessage }: AssistantBubbleProps) {
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

  // Mock API - Rewrite
  const handleRewrite = async () => {
    if (!input.trim()) return
    setIsThinking(true)
    await new Promise(r => setTimeout(r, 1500))
    setOptions({
      gentle: `${input}... 可以吗？✨`,
      cool: `${input}. 就这样。`,
      humorous: `哈哈，${input}！😄`,
      direct: `说实话，${input}。`
    })
    setIsThinking(false)
  }

  // Mock API - Response suggestions
  const handleResponse = async () => {
    if (!partnerLastMessage) return
    setIsThinking(true)
    await new Promise(r => setTimeout(r, 1500))
    setOptions({
      gentle: `I understand what you mean... 💕`,
      cool: `Got it.`,
      humorous: `Haha, that's interesting! 😄`,
      direct: `I see. Let me think about it.`
    })
    setIsThinking(false)
  }

  // Mock API - Topic suggestions
  const handleTopics = async () => {
    setIsThinking(true)
    await new Promise(r => setTimeout(r, 1000))
    setTopics([
      { emoji: '🎬', text: 'What movie are you watching lately?' },
      { emoji: '🍕', text: 'Had anything good to eat today?' },
      { emoji: '🌙', text: 'How was your day?' },
      { emoji: '🎮', text: 'Any hobbies you want to share?' }
    ])
    setIsThinking(false)
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
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          style={{ originX: 0.5, originY: 1 }}
          className="absolute -top-4 left-1/2 -translate-x-1/2 -translate-y-full z-[100] w-72"
        >
          {/* Bubble body */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-4
            shadow-[0_20px_50px_rgba(0,0,0,0.15),inset_0_-4px_4px_rgba(0,0,0,0.05)]
            border border-white/50 relative">

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
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(toneConfigs).map(([key, config]) => (
                        <button
                          key={key}
                          onClick={() => handleSelectOption(options[key])}
                          className={`p-2.5 rounded-xl border font-medium text-xs transition-all hover:scale-105 active:scale-95 ${config.color}`}
                        >
                          <span className="mr-1">{config.icon}</span>
                          {config.label}
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

                  {!isThinking && !partnerLastMessage && (
                    <p className="text-center text-gray-400 text-xs py-4">No partner message yet</p>
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

            {/* Bubble pointer */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/95 rotate-45 border-r border-b border-white/50" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
