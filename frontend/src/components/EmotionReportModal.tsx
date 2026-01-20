import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { aiChatApi, EmotionReport } from '../services/api'
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ReferenceArea } from 'recharts'

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
  'happiness': '#F9D849',
  'calm': '#2BA8A4',
  'fatigue': '#4B4E91',
  'confusion': '#D278A3',
}

const getEmotionColor = (emotion: string): string => {
  return EMOTION_COLORS[emotion.toLowerCase()] || '#808080'
}

// 根据分数获取颜色（正分暖色，负分冷色）
const getScoreColor = (score: number): string => {
  if (score >= 0.6) return '#FF9500'   // 橙色 - Great
  if (score >= 0.2) return '#F9D849'   // 黄色 - Good
  if (score >= -0.2) return '#66B04C'  // 绿色 - Okay
  if (score >= -0.6) return '#3266B1'  // 蓝色 - Low
  return '#D32F2F'                      // 红色 - Bad
}

// 根据分数获取标签
const getScoreLabel = (score: number): string => {
  if (score >= 0.6) return 'Great'
  if (score >= 0.2) return 'Good'
  if (score >= -0.2) return 'Okay'
  if (score >= -0.6) return 'Low'
  return 'Bad'
}

// 根据情绪类型返回对应的 emoji
const getEmotionEmoji = (emotion: string): string => {
  const emojiMap: Record<string, string> = {
    'joy': '😊',
    'happiness': '😊',
    'calm': '😌',
    'sadness': '😢',
    'anger': '😠',
    'anxiety': '😰',
    'fear': '😨',
    'disgust': '🤢',
    'bored': '😐',
    'embarrassment': '😳',
    'envy': '😒',
    'fatigue': '😴',
    'confusion': '😕',
  }
  return emojiMap[emotion.toLowerCase()] || '😐'
}

// 清除 markdown 格式，确保显示纯文本
const stripMarkdown = (text: string): string => {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // **bold** -> bold
    .replace(/\*([^*]+)\*/g, '$1')       // *italic* -> italic
    .replace(/__([^_]+)__/g, '$1')       // __bold__ -> bold
    .replace(/_([^_]+)_/g, '$1')         // _italic_ -> italic
    .replace(/`([^`]+)`/g, '$1')         // `code` -> code
}

// 缓存相关函数
const getCacheKey = (userId: string, period: string) =>
  `emotion_report_${userId}_${period}`

const getLastActivityKey = (userId: string) =>
  `emotion_last_activity_${userId}`

// 记录用户最后活动时间（写日记、聊天等）
export const markUserActivity = (userId: string) => {
  try {
    sessionStorage.setItem(getLastActivityKey(userId), Date.now().toString())
  } catch {}
}

// 获取用户最后活动时间
const getLastActivityTime = (userId: string): number => {
  try {
    const time = sessionStorage.getItem(getLastActivityKey(userId))
    return time ? parseInt(time, 10) : 0
  } catch {
    return 0
  }
}

export const getCachedReport = (userId: string, period: string): EmotionReport | null => {
  try {
    const cached = sessionStorage.getItem(getCacheKey(userId, period))
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      const lastActivity = getLastActivityTime(userId)

      // 缓存有效条件：
      // 1. 缓存时间在24小时内
      // 2. 缓存时间晚于最后活动时间（没有新内容）
      const isWithin24Hours = Date.now() - timestamp < 24 * 60 * 60 * 1000
      const noNewContent = timestamp > lastActivity

      if (isWithin24Hours && noNewContent) {
        return data
      }
    }
  } catch {}
  return null
}

export const setCachedReport = (userId: string, period: string, data: EmotionReport) => {
  try {
    sessionStorage.setItem(getCacheKey(userId, period), JSON.stringify({
      data,
      timestamp: Date.now()
    }))
  } catch {}
}

// 生成完整时间轴数据（补全没有数据的日期/周）
type TimelineDataPoint = { date: string; avg_score: number | null; dominant_emotion: string | null }

const generateFullTimeline = (
  dataPoints: { date: string; avg_score: number; dominant_emotion: string }[] | undefined,
  period: 'weekly' | 'monthly',
  startDate: string
): TimelineDataPoint[] => {
  if (!dataPoints || dataPoints.length === 0) return []

  const dataMap = new Map(dataPoints.map(p => [p.date, p]))
  const start = new Date(startDate)

  if (period === 'weekly') {
    // 生成 7 天完整时间轴
    const fullData: TimelineDataPoint[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      // 使用本地日期格式，避免 UTC 时区问题
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

      const existing = dataMap.get(dateStr)
      fullData.push(existing || {
        date: dateStr,
        avg_score: null,
        dominant_emotion: null
      })
    }
    return fullData
  }

  if (period === 'monthly') {
    // 按周分组，生成 4 周数据
    const weeks: typeof dataPoints[] = [[], [], [], []]
    dataPoints.forEach(p => {
      const date = new Date(p.date)
      const daysSinceStart = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      const weekIndex = Math.min(3, Math.max(0, Math.floor(daysSinceStart / 7)))
      weeks[weekIndex].push(p)
    })

    return weeks.map((week, i): TimelineDataPoint => {
      if (week.length === 0) {
        return { date: `W${i + 1}`, avg_score: null, dominant_emotion: null }
      }
      const avgScore = week.reduce((sum, p) => sum + p.avg_score, 0) / week.length
      // 找众数情绪
      const emotionCounts: Record<string, number> = {}
      week.forEach(p => {
        emotionCounts[p.dominant_emotion] = (emotionCounts[p.dominant_emotion] || 0) + 1
      })
      const dominant = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral'

      return {
        date: `W${i + 1}`,
        avg_score: avgScore,
        dominant_emotion: dominant
      }
    })
  }

  return dataPoints
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
    setError(null)

    // 1. 先尝试显示缓存（秒开）
    const cached = getCachedReport(userId, period)
    if (cached) {
      setReport(cached)
      // 有缓存时直接使用，不再调用 API（节省配额）
      return
    }

    // 2. 无缓存时才调用 API
    setIsLoading(true)
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
      const data: EmotionReport = typeof rawData === 'string' ? JSON.parse(rawData) : rawData
      setReport(data)
      setCachedReport(userId, period, data)
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
                      ? 'bg-accent text-accent-inverse'
                      : 'text-gray-400 hover:text-accent'
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
              <div className="grid grid-cols-2 gap-3">
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

              {/* Mood Trend - 根据 period 显示不同内容 */}
              {period === 'daily' ? (
                // Daily: 当日情绪卡片（不显示曲线图）
                report.emotion_trend?.data_points?.[0] && (
                  <div className="bg-gray-50 rounded-2xl p-5">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-4">
                      Today's Mood
                    </h3>
                    <div className="flex items-center justify-center gap-4">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: getEmotionColor(report.emotion_trend.data_points[0].dominant_emotion),
                          boxShadow: `0 8px 24px ${getEmotionColor(report.emotion_trend.data_points[0].dominant_emotion)}40`
                        }}
                      >
                        <span className="text-3xl">{getEmotionEmoji(report.emotion_trend.data_points[0].dominant_emotion)}</span>
                      </div>
                      <div>
                        <p className="text-lg font-black capitalize">
                          {report.emotion_trend.data_points[0].dominant_emotion}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                // Weekly/Monthly: 曲线图
                (() => {
                  // 生成完整时间轴数据
                  const chartData = report.emotion_trend?.data_points
                    ? generateFullTimeline(report.emotion_trend.data_points, period as 'weekly' | 'monthly', report.start_date)
                    : []
                  // 过滤出有数据的点用于渐变
                  const validPoints = chartData.filter(p => p.avg_score !== null)

                  if (validPoints.length === 0) return null

                  return (
                    <div className="bg-gray-50 rounded-2xl p-5">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-4">
                        Mood Trend
                      </h3>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={chartData}>
                            {/* 渐变定义 */}
                            <defs>
                              {/* 纵向渐变 - 填充区域从上到下透明 */}
                              <linearGradient id="emotionAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#4B4E91" stopOpacity={0.25} />
                                <stop offset="100%" stopColor="#4B4E91" stopOpacity={0} />
                              </linearGradient>
                              {/* 横向渐变 - 使用 userSpaceOnUse 和绝对像素坐标 */}
                              <linearGradient
                                id="line-gradient"
                                gradientUnits="userSpaceOnUse"
                                x1="0"
                                y1="0"
                                x2="500"
                                y2="0"
                              >
                                {validPoints.map((point, index) => {
                                  const offset = validPoints.length > 1
                                    ? (index / (validPoints.length - 1)) * 100
                                    : 0
                                  return (
                                    <stop
                                      key={index}
                                      offset={`${offset}%`}
                                      stopColor={getScoreColor(point.avg_score ?? 0)}
                                      stopOpacity={1}
                                    />
                                  )
                                })}
                              </linearGradient>
                            </defs>

                            <XAxis
                              dataKey="date"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 10, fill: '#9ca3af' }}
                              interval={0}
                              padding={{ left: 10, right: 10 }}
                              tickFormatter={(date) => {
                                if (period === 'monthly') {
                                  return date // 已经是 W1, W2, W3, W4 格式
                                }
                                return new Date(date).toLocaleDateString('en-US', { weekday: 'short' })
                              }}
                            />
                            <YAxis
                              domain={[-1, 1]}
                              axisLine={false}
                              tickLine={false}
                              tick={false}
                              width={0}
                            />

                            {/* 背景色块 - 5个分数区间 */}
                            <ReferenceArea y1={0.6} y2={1} fill="#FF9500" fillOpacity={0.15} />
                            <ReferenceArea y1={0.2} y2={0.6} fill="#F9D849" fillOpacity={0.15} />
                            <ReferenceArea y1={-0.2} y2={0.2} fill="#66B04C" fillOpacity={0.15} />
                            <ReferenceArea y1={-0.6} y2={-0.2} fill="#3266B1" fillOpacity={0.15} />
                            <ReferenceArea y1={-1} y2={-0.6} fill="#D32F2F" fillOpacity={0.15} />

                            {/* 拟物化气泡 Tooltip */}
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null
                                const data = payload[0].payload
                                // 没有数据的点不显示 tooltip
                                if (data.avg_score === null) return null
                                const color = getScoreColor(data.avg_score)
                                return (
                                  <div
                                    className="bg-white rounded-2xl p-4 border border-gray-100"
                                    style={{ boxShadow: `0 8px 32px ${color}40, 0 4px 16px rgba(0,0,0,0.1)` }}
                                  >
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                      {period === 'monthly'
                                        ? label
                                        : (label ? new Date(label).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : '')
                                      }
                                    </p>
                                    <div className="mt-2 flex items-center gap-2">
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
                                      />
                                      <span className="text-sm font-black">{getScoreLabel(data.avg_score)}</span>
                                    </div>
                                    <p className="text-lg font-black mt-1">
                                      {data.avg_score >= 0 ? '+' : ''}{data.avg_score.toFixed(2)}
                                    </p>
                                  </div>
                                )
                              }}
                            />

                            {/* 填充区域 */}
                            <Area
                              type="monotone"
                              dataKey="avg_score"
                              stroke="none"
                              fill="url(#emotionAreaGradient)"
                              connectNulls={true}
                              isAnimationActive={true}
                            />

                            {/* 连线 - 使用 userSpaceOnUse 渐变 */}
                            <Line
                              type="monotone"
                              dataKey="avg_score"
                              stroke="url(#line-gradient)"
                              strokeWidth={4}
                              connectNulls={true}
                              isAnimationActive={false}
                              dot={(props: any) => {
                                const { cx, cy, payload } = props
                                if (payload.avg_score === null) return <g key={`empty-${payload.date}`} />
                                const color = getScoreColor(payload.avg_score)
                                return (
                                  <circle
                                    key={`dot-${payload.date}`}
                                    cx={cx}
                                    cy={cy}
                                    r={6}
                                    fill={color}
                                    stroke="white"
                                    strokeWidth={2.5}
                                    style={{ filter: `drop-shadow(0 2px 6px ${color}80)` }}
                                  />
                                )
                              }}
                              activeDot={(props: any) => {
                                const { cx, cy, payload } = props
                                if (payload.avg_score === null) return <g key={`empty-active-${payload.date}`} />
                                const color = getScoreColor(payload.avg_score)
                                return (
                                  <circle
                                    key={`active-dot-${payload.date}`}
                                    cx={cx}
                                    cy={cy}
                                    r={9}
                                    fill={color}
                                    stroke="white"
                                    strokeWidth={3}
                                    style={{ filter: `drop-shadow(0 4px 12px ${color})` }}
                                  />
                                )
                              }}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>

                      {/* 分数图例 */}
                      <div className="flex flex-wrap gap-3 mt-4 justify-center">
                        {[
                          { label: 'Great', color: '#FF9500' },
                          { label: 'Good', color: '#F9D849' },
                          { label: 'Okay', color: '#66B04C' },
                          { label: 'Low', color: '#3266B1' },
                          { label: 'Bad', color: '#D32F2F' },
                        ].map(item => (
                          <div key={item.label} className="flex items-center gap-1.5">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-[9px] font-bold text-gray-400">{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()
              )}

              {/* Emotion Distribution & Triggers */}
              <div className="grid grid-cols-2 gap-4">
                {/* Emotion Distribution - Donut Chart */}
                <div className="bg-gray-50 rounded-2xl p-5">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-4">Top Emotions</h3>
                  {topEmotions.length > 0 ? (
                    <div className="flex items-center gap-4">
                      {/* 环形图 */}
                      <div className="w-28 h-28 flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={topEmotions.map(([emotion, percentage]) => ({
                                name: emotion,
                                value: percentage
                              }))}
                              innerRadius={30}
                              outerRadius={50}
                              dataKey="value"
                              strokeWidth={0}
                            >
                              {topEmotions.map(([emotion], index) => (
                                <Cell key={`cell-${index}`} fill={getEmotionColor(emotion)} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* 图例 */}
                      <div className="flex-1 space-y-1.5">
                        {topEmotions.map(([emotion, percentage]) => (
                          <div key={emotion} className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: getEmotionColor(emotion) }}
                            />
                            <span className="text-[10px] font-bold capitalize flex-1 truncate">{emotion}</span>
                            <span className="text-[10px] font-bold text-gray-400">{Math.round(percentage)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-400">No emotion data yet</p>
                  )}
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
                        'social': '🤝',
                        'academic': '📚',
                        'personal_growth': '🌱',
                        'daily_routine': '☀️',
                        'unexpected_events': '⚡'
                      }
                      const icon = icons[trigger.trigger_type.toLowerCase()] || '📌'
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xl">{icon}</span>
                          <div className="flex-1">
                            <div className="flex justify-between text-[11px] font-black">
                              <span className="capitalize">{trigger.trigger_type.replace('_', ' ')}</span>
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

              {/* Word Cloud */}
              {report.word_cloud?.top_emotions && report.word_cloud.top_emotions.length > 0 && (() => {
                const words = report.word_cloud?.words || {}
                const maxCount = Math.max(...Object.values(words).map(Number), 1)
                return (
                  <div className="bg-gray-50 rounded-2xl p-5">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-4">Emotion Words</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(words).slice(0, 15).map(([word, count]) => {
                        const bgOpacity = Math.min(1, 0.3 + (Number(count) / maxCount) * 0.7)
                        return (
                          <span
                            key={word}
                            className="px-3 py-1.5 rounded-full font-bold relative"
                            style={{ fontSize: '14px', color: 'var(--accent-text)' }}
                          >
                            <span
                              className="absolute inset-0 rounded-full"
                              style={{
                                backgroundColor: 'var(--accent-color)',
                                opacity: bgOpacity
                              }}
                            />
                            <span className="relative">{word}</span>
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* Key Insights */}
              {report.key_insights && report.key_insights.length > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-blue-600 mb-4 flex items-center gap-2">
                    <span>🔍</span> Key Insights
                  </h3>
                  <ul className="space-y-3">
                    {report.key_insights.map((insight, i) => (
                      <li key={i} className="text-sm font-bold text-gray-700 flex items-start gap-3">
                        <span className="text-blue-500 mt-0.5">{i + 1}.</span>
                        <span>{stripMarkdown(insight)}</span>
                      </li>
                    ))}
                  </ul>
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
                        <span>{stripMarkdown(suggestion)}</span>
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
            className="w-full py-3 bg-accent text-accent-inverse rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
