import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { aiChatApi, EmotionReport } from '../services/api'
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip as ChartTooltip
} from 'chart.js'
import { Line as ChartLine } from 'react-chartjs-2'

// 注册 Chart.js 组件
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, ChartTooltip)

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
  _startDate: string,
  endDate: string
): TimelineDataPoint[] => {
  // 即使没有数据也生成空的时间轴框架
  const safeDataPoints = dataPoints || []

  // 将 data_points 的日期统一为 YYYY-MM-DD 格式（去掉时间部分）
  const dataMap = new Map(safeDataPoints.map(p => [p.date.split('T')[0], p]))

  if (period === 'weekly') {
    // 从 endDate 倒推生成 7 天（今天 + 过去6天）
    const fullData: TimelineDataPoint[] = []

    // 解析 endDate，只取日期部分避免时区问题
    const endDateStr = endDate.split('T')[0]  // "2026-01-23"
    const [year, month, day] = endDateStr.split('-').map(Number)

    for (let i = 6; i >= 0; i--) {
      // 从 end 往前推 i 天
      const date = new Date(year, month - 1, day - i)
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
    // 从 endDate 倒推 4 周
    const endDateStr = endDate.split('T')[0]
    const [year, month, day] = endDateStr.split('-').map(Number)
    const end = new Date(year, month - 1, day)

    // 按周分组，W4 是最近一周（包含今天），W1 是最早一周
    type DataPoint = { date: string; avg_score: number; dominant_emotion: string }
    const weeks: DataPoint[][] = [[], [], [], []]

    safeDataPoints.forEach(p => {
      const pDateStr = p.date.split('T')[0]
      const [pYear, pMonth, pDay] = pDateStr.split('-').map(Number)
      const pDate = new Date(pYear, pMonth - 1, pDay)

      // 计算距离 end 的天数
      const daysFromEnd = Math.floor((end.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24))

      // W4 = 0-6天前, W3 = 7-13天前, W2 = 14-20天前, W1 = 21-27天前
      const weekIndex = Math.min(3, Math.max(0, Math.floor(daysFromEnd / 7)))
      weeks[3 - weekIndex].push(p)  // 反转顺序：W1在前，W4在后
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

  return safeDataPoints
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
                // Weekly/Monthly: 使用 Chart.js 实现两点间渐变
                (() => {
                  // 生成完整时间轴数据
                  const chartData = generateFullTimeline(
                    report.emotion_trend?.data_points,
                    period as 'weekly' | 'monthly',
                    report.start_date,
                    report.end_date
                  )

                  // 准备 Chart.js 数据
                  const labels = chartData.map(p => {
                    if (period === 'monthly') return p.date
                    return new Date(p.date).toLocaleDateString('en-US', { weekday: 'short' })
                  })

                  const values = chartData.map(p => p.avg_score)

                  // 获取每个点的颜色
                  const pointColors = chartData.map(p =>
                    p.avg_score !== null ? getScoreColor(p.avg_score) : 'transparent'
                  )

                  // Chart.js 配置
                  const chartJsData = {
                    labels,
                    datasets: [{
                      data: values,
                      borderWidth: 4,
                      pointRadius: 6,
                      pointBackgroundColor: pointColors,
                      pointBorderColor: 'white',
                      pointBorderWidth: 2.5,
                      pointHoverRadius: 9,
                      pointHoverBorderWidth: 3,
                      fill: false,
                      tension: 0.4,
                      spanGaps: true,
                      segment: {
                        borderColor: (ctx: any) => {
                          const { p0, p1, p0DataIndex, p1DataIndex } = ctx
                          const color0 = pointColors[p0DataIndex]
                          const color1 = pointColors[p1DataIndex]

                          // 如果任一端点没有数据，使用紫色
                          if (color0 === 'transparent' || color1 === 'transparent') {
                            return '#4B4E91'
                          }

                          // 创建从 p0 到 p1 的渐变
                          const gradient = ctx.chart.ctx.createLinearGradient(
                            p0.x, p0.y, p1.x, p1.y
                          )
                          gradient.addColorStop(0, color0)
                          gradient.addColorStop(1, color1)
                          return gradient
                        }
                      }
                    }]
                  }

                  const chartJsOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        enabled: true,
                        backgroundColor: 'white',
                        titleColor: '#9ca3af',
                        bodyColor: '#1f2937',
                        borderColor: '#e5e7eb',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 12,
                        titleFont: { size: 10, weight: 'bold' as const },
                        bodyFont: { size: 14, weight: 'bold' as const },
                        callbacks: {
                          title: (items: any[]) => {
                            const idx = items[0]?.dataIndex
                            if (idx === undefined) return ''
                            const point = chartData[idx]
                            if (period === 'monthly') return point.date
                            return new Date(point.date).toLocaleDateString('en-US', {
                              weekday: 'long', month: 'short', day: 'numeric'
                            })
                          },
                          label: (item: any) => {
                            const score = item.raw
                            if (score === null) return ''
                            return `${getScoreLabel(score)}: ${score >= 0 ? '+' : ''}${score.toFixed(2)}`
                          }
                        }
                      }
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: {
                          color: '#9ca3af',
                          font: { size: 10 }
                        },
                        border: { display: false }
                      },
                      y: {
                        min: -1,
                        max: 1,
                        grid: { display: false },
                        ticks: { display: false },
                        border: { display: false }
                      }
                    }
                  }

                  return (
                    <div className="bg-gray-50 rounded-2xl p-5">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-4">
                        Mood Trend
                      </h3>
                      <div className="h-48 relative">
                        {/* 背景色块 */}
                        <div className="absolute inset-0 flex flex-col pointer-events-none" style={{ top: '0', bottom: '24px' }}>
                          <div className="flex-1" style={{ backgroundColor: 'rgba(255, 149, 0, 0.15)' }} />
                          <div className="flex-1" style={{ backgroundColor: 'rgba(249, 216, 73, 0.15)' }} />
                          <div className="flex-1" style={{ backgroundColor: 'rgba(102, 176, 76, 0.15)' }} />
                          <div className="flex-1" style={{ backgroundColor: 'rgba(50, 102, 177, 0.15)' }} />
                          <div className="flex-1" style={{ backgroundColor: 'rgba(211, 47, 47, 0.15)' }} />
                        </div>
                        <ChartLine data={chartJsData} options={chartJsOptions} />
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

                {/* Emotion Words */}
                <div className="bg-gray-50 rounded-2xl p-5">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-4">Emotion Words</h3>
                  {(() => {
                    const words = report.word_cloud?.words || {}
                    const maxCount = Math.max(...Object.values(words).map(Number), 1)
                    const wordEntries = Object.entries(words).slice(0, 12)
                    if (wordEntries.length === 0) {
                      return <p className="text-[11px] text-gray-400">No emotion words yet</p>
                    }
                    return (
                      <div className="flex flex-wrap gap-1.5">
                        {wordEntries.map(([word, count]) => {
                          const bgOpacity = Math.min(1, 0.3 + (Number(count) / maxCount) * 0.7)
                          return (
                            <span
                              key={word}
                              className="px-2 py-1 rounded-full font-bold relative"
                              style={{ fontSize: '11px', color: 'var(--accent-text)' }}
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
                    )
                  })()}
                </div>
              </div>

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
