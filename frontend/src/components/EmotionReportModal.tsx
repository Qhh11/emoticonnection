import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { aiChatApi, EmotionReport } from '../services/api'

// Emotion color mapping
const EMOTION_COLORS: Record<string, string> = {
  'joy': '#F9D849',
  'sadness': '#3266B1',
  'anger': '#D32F2F',
  'anxiety': '#E67E22',
  'bored': '#4B4E91',
  'fear': '#9381BA',
  'disgust': '#66B04C',
  'embarrassment': '#D278A3',
  'envy': '#2BA8A4',
}

const getEmotionColor = (emotion: string): string => {
  return EMOTION_COLORS[emotion.toLowerCase()] || '#808080'
}

const getMoodEmoji = (score: number): string => {
  if (score >= 0.6) return '😊'
  if (score >= 0.2) return '🙂'
  if (score >= -0.2) return '😐'
  if (score >= -0.6) return '😔'
  return '😢'
}

const getTrendIcon = (direction: string): string => {
  if (direction === 'improving') return '📈'
  if (direction === 'declining') return '📉'
  return '➡️'
}

interface EmotionReportModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
}

type ReportPeriod = 'daily' | 'weekly' | 'monthly'

export default function EmotionReportModal({ isOpen, onClose, userId }: EmotionReportModalProps) {
  const [period, setPeriod] = useState<ReportPeriod>('weekly')
  const [report, setReport] = useState<EmotionReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && userId) {
      loadReport()
    }
  }, [isOpen, userId, period])

  const loadReport = async () => {
    setIsLoading(true)
    setError(null)
    try {
      let rawData: EmotionReport | string
      switch (period) {
        case 'daily':
          rawData = await aiChatApi.getDailyReport(userId)
          break
        case 'weekly':
          rawData = await aiChatApi.getWeeklyReport(userId)
          break
        case 'monthly':
          rawData = await aiChatApi.getMonthlyReport(userId)
          break
      }
      // Handle double-serialized JSON from backend (returns JSON string instead of object)
      const data: EmotionReport = typeof rawData === 'string' ? JSON.parse(rawData) : rawData
      setReport(data)
    } catch (err) {
      console.error('Failed to load emotion report:', err)
      setError(err instanceof Error ? err.message : 'Failed to load report')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  // Get top 5 emotions from distribution
  const topEmotions = report?.emotion_distribution
    ? Object.entries(report.emotion_distribution)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
    : []

  // Format date range
  const formatDateRange = () => {
    if (!report) return ''
    const start = new Date(report.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const end = new Date(report.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${start} - ${end}`
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-black/5 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Emotion Report</h2>
            <p className="text-[11px] font-black uppercase text-gray-400 tracking-widest">
              {formatDateRange()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <div className="flex bg-gray-100 p-1 rounded-full">
              {(['daily', 'weekly', 'monthly'] as ReportPeriod[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    period === p
                      ? 'bg-black text-white'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-500 font-bold mb-4">{error}</p>
              <button
                onClick={loadReport}
                className="px-6 py-2 bg-black text-white rounded-full text-sm font-bold"
              >
                Retry
              </button>
            </div>
          ) : report ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                  <span className="text-3xl">{getMoodEmoji(report.average_mood_score)}</span>
                  <p className="text-lg font-black mt-1">{report.average_mood_score.toFixed(1)}</p>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Mood</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                  <span className="text-3xl">{getTrendIcon(report.emotion_trend?.trend_direction || 'stable')}</span>
                  <p className="text-lg font-black mt-1 capitalize">{report.emotion_trend?.trend_direction || 'stable'}</p>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Trend</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                  <span className="text-3xl">🎯</span>
                  <p className="text-lg font-black mt-1">{Math.round(report.mood_stability * 100)}%</p>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Stability</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                  <span className="text-3xl">💬</span>
                  <p className="text-lg font-black mt-1">{report.total_interactions}</p>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Chats</p>
                </div>
              </div>

              {/* Emotion Distribution & Triggers */}
              <div className="grid grid-cols-2 gap-4">
                {/* Emotion Distribution */}
                <div className="bg-gray-50 rounded-2xl p-5">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-4">Top Emotions</h3>
                  <div className="space-y-3">
                    {topEmotions.map(([emotion, percentage]) => (
                      <div key={emotion} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-black">
                          <span className="capitalize">{emotion}</span>
                          <span className="text-gray-400">{Math.round(percentage)}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: getEmotionColor(emotion)
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Triggers */}
                <div className="bg-gray-50 rounded-2xl p-5">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-4">Main Triggers</h3>
                  <div className="space-y-3">
                    {report.triggers.slice(0, 3).map((trigger, i) => {
                      const icons: Record<string, string> = {
                        'work': '💼',
                        'relationships': '💕',
                        'health': '🏃',
                        'finance': '💰',
                        'family': '👨‍👩‍👧',
                        'social': '🤝'
                      }
                      const icon = icons[trigger.trigger_type.toLowerCase()] || '📌'
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xl">{icon}</span>
                          <div className="flex-1">
                            <div className="flex justify-between text-[11px] font-black">
                              <span className="capitalize">{trigger.trigger_type}</span>
                              <span className="text-gray-400">{trigger.frequency}x</span>
                            </div>
                            <p className="text-[9px] text-gray-400 truncate">
                              {trigger.associated_emotions.join(', ')}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                    {report.triggers.length === 0 && (
                      <p className="text-[11px] text-gray-400">No trigger data yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Word Cloud (Simple version) */}
              {report.word_cloud?.top_emotions && report.word_cloud.top_emotions.length > 0 && (
                <div className="bg-gray-50 rounded-2xl p-5">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-4">Emotion Words</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(report.word_cloud?.words || {}).slice(0, 15).map(([word, count]) => (
                      <span
                        key={word}
                        className="px-3 py-1.5 rounded-full text-white font-bold"
                        style={{
                          fontSize: `${Math.min(14, 10 + count)}px`,
                          backgroundColor: getEmotionColor(word) || '#808080',
                          opacity: Math.min(1, 0.5 + count * 0.1)
                        }}
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {report.suggestions && report.suggestions.length > 0 && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-5">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-emerald-600 mb-4 flex items-center gap-2">
                    <span>💡</span> Suggestions
                  </h3>
                  <ul className="space-y-3">
                    {report.suggestions.map((suggestion, i) => (
                      <li key={i} className="text-sm font-bold text-gray-700 flex items-start gap-3">
                        <span className="text-emerald-500 mt-0.5">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <p className="font-bold">No report data available</p>
              <p className="text-sm mt-2">Start chatting to generate emotion insights!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-black/5 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
