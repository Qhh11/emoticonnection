import { useState, useEffect } from 'react'
import { Avatar3D } from '../../config/avatars'
import { getAvatarUrl } from '../../config/userAvatars'
import { SocialStats, Post, User, EmotionReport, DailyEmotionScore, getMediaUrl, userApi, CheckInHistoryItem, aiChatApi, utcDateToLocalDate } from '../../services/api'
import { DiaryEntry } from '../diary/DiaryView'

// 表情图片映射 - 使用 public 目录下的透明图片
const EMOJI_IMAGES: Record<string, string> = {
  happy: '/checkin/happy.png',   // 第一象限 - 黄色区域
  angry: '/checkin/angry.png',   // 第二象限 - 红色区域
  sad: '/checkin/sad.png',       // 第三象限 - 蓝色区域
  calm: '/checkin/peace.png',    // 第四象限 - 绿色区域
}

// 8x8 网格颜色矩阵 - 与渲染的色块完全一致
const COLOR_GRID = [
  // 行1 (最上)
  ['#D32F2F', '#DC4545', '#E55A5A', '#EE7070', '#FAD870', '#F9D040', '#E8C020', '#D8B010'],
  // 行2
  ['#DC4545', '#E55A5A', '#EE7070', '#F58585', '#FBE4A0', '#FAD870', '#F9D040', '#E8C020'],
  // 行3
  ['#E55A5A', '#EE7070', '#F58585', '#FAA0A0', '#FCF0C0', '#FBE4A0', '#FAD870', '#F9D040'],
  // 行4 (靠近中心上)
  ['#EE7070', '#F58585', '#FAA0A0', '#FDB5B5', '#FDFAE0', '#FCF0C0', '#FBE4A0', '#FAD870'],
  // 行5 (靠近中心下)
  ['#5588CC', '#6699D5', '#77AADD', '#88BBE5', '#E0F0D0', '#D0E8C0', '#C0E0B0', '#B0D8A0'],
  // 行6
  ['#4477BB', '#5588CC', '#6699D5', '#77AADD', '#B0D8A0', '#A0D090', '#90C880', '#80C070'],
  // 行7
  ['#3266B1', '#4477BB', '#5588CC', '#6699D5', '#90C880', '#80C070', '#70B860', '#66B04C'],
  // 行8 (最下)
  ['#2855A0', '#3266B1', '#4477BB', '#5588CC', '#80C070', '#70B860', '#66B04C', '#56A03C'],
]

// 根据坐标从网格中采样颜色
function calculateColor(x: number, y: number): string {
  // 将 [-1, 1] 映射到 [0, 7]
  const col = Math.min(7, Math.max(0, Math.floor((x + 1) / 2 * 8)))
  // y 轴反转: y=1 对应 row=0, y=-1 对应 row=7
  const row = Math.min(7, Math.max(0, Math.floor((1 - y) / 2 * 8)))
  return COLOR_GRID[row][col]
}

// 根据坐标获取表情
function getEmojiFromCoordinate(x: number, y: number): string {
  if (x >= 0 && y >= 0) return 'happy'   // 右上
  if (x < 0 && y >= 0) return 'angry'    // 左上
  if (x < 0 && y < 0) return 'sad'       // 左下
  return 'calm'                           // 右下
}

// 根据坐标获取情绪标签
function getMoodLabelFromCoordinate(x: number, y: number): string {
  if (x >= 0 && y >= 0) return 'Excited'
  if (x < 0 && y >= 0) return 'Stressed'
  if (x < 0 && y < 0) return 'Sad'
  return 'Calm'
}

// Global Mood-Color Mapping from DESIGN_SYSTEM.md (保留用于向后兼容)
const MOOD_DATA = [
  { label: 'Bored', color: '#4B4E91', text: '#ffffff' },
  { label: 'Fear', color: '#9381BA', text: '#ffffff' },
  { label: 'Joy', color: '#F9D849', text: '#121212' },
  { label: 'Sad', color: '#3266B1', text: '#ffffff' },
  { label: 'Disgust', color: '#66B04C', text: '#ffffff' },
  { label: 'Anxious', color: '#E67E22', text: '#ffffff' },
  { label: 'Angry', color: '#D32F2F', text: '#ffffff' },
  { label: 'Awkward', color: '#D278A3', text: '#ffffff' },
  { label: 'Envy', color: '#2BA8A4', text: '#ffffff' },
]

// 根据分数获取颜色（与 EmotionReportModal 保持一致）
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

export interface Theme {
  name: string
  color: string
  soft: string
  text: string
}

export const THEMES: Theme[] = [
  ...MOOD_DATA.map(m => ({ name: m.label, color: m.color, soft: `${m.color}15`, text: m.text })),
  { name: 'Classic', color: '#121212', soft: '#F5F5F5', text: '#ffffff' },
]

interface StatItemProps {
  label: string
  value: string
  onClick?: () => void
}

function StatItem({ label, value, onClick }: StatItemProps) {
  return (
    <div
      className={`space-y-0.5 ${onClick ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}`}
      onClick={onClick}
    >
      <p className="text-xl font-black tracking-tighter text-gray-800">{value}</p>
      <p className="text-[12px] font-black uppercase tracking-widest text-gray-300">{label}</p>
    </div>
  )
}

interface GalleryCardProps {
  title: string
  mood: string
  date: string
  color: string
  textColor: string
  imageUrl?: string
  onClick?: () => void
}

function GalleryCard({ title, mood, date, color, textColor, imageUrl, onClick }: GalleryCardProps) {
  return (
    <div
      onClick={onClick}
      className="card-pullable flex-shrink-0 w-64 h-80 rounded-[2.5rem] overflow-hidden border border-black/[0.04] shadow-xl cursor-pointer hover:scale-[1.02] transition-transform relative"
      style={{ backgroundColor: color }}
    >
      {imageUrl ? (
        // 有图片：显示图片
        <>
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <span className="text-[12px] font-black uppercase tracking-widest opacity-70 text-white">{date}</span>
            <div className="mt-2 space-y-1">
              <p className="text-[14px] font-black uppercase tracking-[0.25em] opacity-90 text-white">{mood}</p>
              <h5 className="text-lg font-black leading-tight tracking-tight text-white">{title}</h5>
            </div>
          </div>
        </>
      ) : (
        // 无图片：使用与图片版相同的布局
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <span className="text-[12px] font-black uppercase tracking-widest opacity-70" style={{ color: textColor }}>{date}</span>
            <div className="mt-2 space-y-1">
              <p className="text-[14px] font-black uppercase tracking-[0.25em] opacity-90" style={{ color: textColor }}>{mood}</p>
              <h5 className="text-lg font-black leading-tight tracking-tight" style={{ color: textColor }}>{title}</h5>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface DiaryStackItemProps {
  title: string
  date: string
  color: string
  mood: string
  accent: string
  onClick?: () => void
}

function DiaryStackItem({ title, date, color, mood, accent, onClick }: DiaryStackItemProps) {
  return (
    <div
      onClick={onClick}
      className="diary-item-pullable p-8 rounded-[2.5rem] border border-black/[0.05] shadow-xl flex flex-col justify-between cursor-pointer mb-[-60px] hover:scale-[1.02] transition-transform"
      style={{ backgroundColor: color }}
    >
      <div className="flex items-center space-x-4">
        <span className="text-[12px] font-black uppercase tracking-widest opacity-60" style={{ color: accent }}>{date}</span>
        <span className="text-[14px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-white/20" style={{ color: accent }}>{mood}</span>
      </div>
      <h6 className="text-2xl font-black tracking-tight" style={{ color: accent }}>{title}</h6>
      <p className="text-[11px] font-bold mt-2 opacity-50" style={{ color: accent }}>Click to view full</p>
    </div>
  )
}


// 签到数据类型
export interface CheckInData {
  coordinate: { x: number; y: number }
  color: string
  emoji: string
  mood: string
}

interface ProfileViewProps {
  points: number
  level: number
  avatar: string
  onCheckIn: (data: CheckInData) => Promise<boolean>
  onUpdateCheckIn: (data: CheckInData) => Promise<boolean>
  onThemeChange: (theme: Theme) => void
  currentTheme: Theme
  onOpenAvatarGallery: () => void
  selectedAvatar: Avatar3D | null
  user: User | null
  socialStats: SocialStats | null
  diaryEntries: DiaryEntry[]
  userPosts: Post[]
  onOpenJournalDetail: (entry: DiaryEntry) => void
  onOpenPostDetail: (post: Post) => void
  todayCheckIn: {
    mood: string
    color: string
    text: string
    streak: number
    coordinate_x?: number
    coordinate_y?: number
    emoji?: string
  } | null
  onOpenSettings?: () => void
  onViewFollowing?: () => void
  onViewFollowers?: () => void
  onOpenEmotionReport?: () => void
  weeklyReport?: EmotionReport | null
  persistedScores?: DailyEmotionScore[] | null
  onRefreshScores?: (scores: DailyEmotionScore[]) => void
}

// Helper functions for emotion display
const getMoodEmoji = (score: number): string => {
  if (score >= 0.6) return '😊'
  if (score >= 0.2) return '🙂'
  if (score >= -0.2) return '😐'
  if (score >= -0.6) return '😔'
  return '😢'
}

const getMoodLabel = (score: number): string => {
  if (score >= 0.6) return 'Great'
  if (score >= 0.2) return 'Good'
  if (score >= -0.2) return 'Okay'
  if (score >= -0.6) return 'Low'
  return 'Bad'
}

const getTrendIcon = (direction: string): string => {
  if (direction === 'improving') return '📈'
  if (direction === 'declining') return '📉'
  return '➡️'
}

const getTrendLabel = (direction: string): string => {
  if (direction === 'improving') return '+Up'
  if (direction === 'declining') return '-Down'
  return 'Stable'
}

export default function ProfileView({ points, level, avatar, onCheckIn, onUpdateCheckIn, onThemeChange, currentTheme, onOpenAvatarGallery, selectedAvatar: _selectedAvatar, user, socialStats, diaryEntries, userPosts, onOpenJournalDetail, onOpenPostDetail, todayCheckIn, onOpenSettings, onViewFollowing, onViewFollowers, onOpenEmotionReport, weeklyReport, persistedScores, onRefreshScores }: ProfileViewProps) {
  const [isRefreshingScore, setIsRefreshingScore] = useState(false)
  const [showThemeSelector, setShowThemeSelector] = useState(false)

  // 坐标轴打卡相关状态
  const [showCoordinatePicker, setShowCoordinatePicker] = useState(false)
  const [coordinate, setCoordinate] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)

  // 计算当前颜色和表情
  const currentColor = calculateColor(coordinate.x, coordinate.y)
  const currentEmoji = getEmojiFromCoordinate(coordinate.x, coordinate.y)

  // 使用 todayCheckIn 判断是否已签到
  const effectiveCheckIn = todayCheckIn

  // Calendar state with check-in history
  type CalendarDate = {
    day: number
    isToday: boolean
    isPast: boolean
    mood: typeof MOOD_DATA[0] | null
    // 新增坐标轴签到字段
    customColor?: string
    emoji?: string
  }

  const [calendarData, setCalendarData] = useState<{ monthYear: string; dates: CalendarDate[]; startDayOffset: number }>(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const currentDay = today.getDate()
    const monthName = today.toLocaleString('en-US', { month: 'short' }).toUpperCase()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // 计算本月第一天是星期几 (0=Sunday, 1=Monday, ...)
    const firstDayOfMonth = new Date(year, month, 1).getDay()
    // 转换为 Mon=0, Tue=1, ... Sun=6 格式
    const startDayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1

    const dates: CalendarDate[] = []
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push({
        day,
        isToday: day === currentDay,
        isPast: day < currentDay,
        mood: null
      })
    }

    return { monthYear: `${monthName} ${year}`, dates, startDayOffset }
  })

  // Fetch check-in history and populate calendar
  useEffect(() => {
    if (!user?._id) return

    const fetchCheckInHistory = async () => {
      try {
        const history = await userApi.getCheckInHistory(user._id, 31)

        // Create a map of date -> mood/color/emoji data
        const today = new Date()
        const year = today.getFullYear()
        const month = today.getMonth()

        const checkInMap = new Map<number, { mood: typeof MOOD_DATA[0] | null; customColor?: string; emoji?: string }>()

        history.forEach((item: CheckInHistoryItem) => {
          const itemDate = new Date(item.date)
          // Only consider check-ins from current month
          if (itemDate.getFullYear() === year && itemDate.getMonth() === month) {
            const day = itemDate.getDate()

            // 优先使用坐标轴签到的数据
            if (item.color && item.emoji) {
              checkInMap.set(day, {
                mood: null,
                customColor: item.color,
                emoji: item.emoji
              })
            } else {
              // 旧的心情签到数据 - 向后兼容
              const moodData = MOOD_DATA.find(m =>
                m.label.toLowerCase() === item.mood.toLowerCase()
              )
              if (moodData) {
                checkInMap.set(day, { mood: moodData })
              }
            }
          }
        })

        // Update calendar with check-in data
        setCalendarData(prev => ({
          ...prev,
          dates: prev.dates.map(dateInfo => {
            const checkIn = checkInMap.get(dateInfo.day)
            return {
              ...dateInfo,
              mood: checkIn?.mood || null,
              customColor: checkIn?.customColor,
              emoji: checkIn?.emoji
            }
          })
        }))
      } catch (err) {
        console.error('Failed to fetch check-in history:', err)
      }
    }

    fetchCheckInHistory()
  }, [user?._id])

  const currentMonth = calendarData.monthYear
  const calendarDates = calendarData.dates

  // 拖拽处理
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    updatePosition(e)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    updatePosition(e)
  }

  const handlePointerUp = () => setIsDragging(false)

  const updatePosition = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    let x = (e.clientX - rect.left - centerX) / centerX
    let y = -(e.clientY - rect.top - centerY) / centerY
    x = Math.max(-1, Math.min(1, x))
    y = Math.max(-1, Math.min(1, y))
    setCoordinate({ x, y })
  }

  // 确认打卡
  const handleConfirmCheckIn = async () => {
    const data: CheckInData = {
      coordinate: coordinate,
      color: currentColor,
      emoji: currentEmoji,
      mood: getMoodLabelFromCoordinate(coordinate.x, coordinate.y)
    }

    let success: boolean
    if (effectiveCheckIn) {
      // Already checked in today, update
      success = await onUpdateCheckIn(data)
    } else {
      // First check-in of the day
      success = await onCheckIn(data)
    }

    if (success) {
      setShowCoordinatePicker(false)
      // Update calendar to reflect new check-in
      setCalendarData(prev => ({
        ...prev,
        dates: prev.dates.map(d => d.isToday ? {
          ...d,
          mood: null,
          customColor: currentColor,
          emoji: currentEmoji
        } : d)
      }))
    }
  }

  return (
    <div className="space-y-24 pb-32">
      <header className="space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-none uppercase">Profile</h2>
          <div className="flex items-center gap-3">
            {/* Theme Selector Button */}
            <div className="relative">
              <button onClick={() => setShowThemeSelector(!showThemeSelector)} className="w-10 h-10 rounded-full border-2 border-black/5 flex items-center justify-center hover:scale-110 transition-transform active:scale-90 shadow-sm" style={{ backgroundColor: currentTheme.color }}>
                <span className="text-white text-[13px]">🎨</span>
              </button>
              {showThemeSelector && (
                <div className="absolute right-0 mt-4 bg-white p-6 rounded-[2rem] shadow-2xl border border-black/5 z-[60] w-64 theme-panel-enter">
                  <p className="text-[12px] font-black uppercase tracking-widest text-gray-300 mb-4 px-2">Atmosphere Sync</p>
                  <div className="grid grid-cols-5 gap-3">
                    {THEMES.map(t => (
                      <button key={t.name} onClick={() => { onThemeChange(t); setShowThemeSelector(false) }} className={`w-8 h-8 rounded-full transition-all ${currentTheme.name === t.name ? 'scale-125 ring-2 ring-offset-2 ring-black' : 'hover:scale-110'}`} style={{ backgroundColor: t.color }} title={t.name} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] border border-black/[0.03] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-center gap-10">
          {/* User Profile Avatar */}
          <div className="relative group">
            <div className="w-32 h-32 md:w-36 md:h-36 rounded-[3rem] bg-gray-50 flex items-center justify-center shadow-inner border-4 border-white group-hover:scale-105 transition-transform duration-700 overflow-hidden">
              <img src={getAvatarUrl(avatar)} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-accent text-accent-inverse px-3 py-1 rounded-full text-[14px] font-black uppercase tracking-widest border-2 border-white transition-colors">Lv.{level}</div>
          </div>
          <div className="flex-1 space-y-4 w-full">
            <div className="flex justify-between items-start">
              <div className="space-y-0.5">
                <h3 className="text-xl font-black text-gray-800">{user?.nickname || user?.username || 'User'}</h3>
                <p className="text-gray-400 font-bold text-[13px] uppercase tracking-[0.2em]">Energy: <span className="text-accent transition-colors">{points.toLocaleString()}</span></p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onOpenAvatarGallery}
                  className="px-4 py-2 rounded-xl bg-accent text-accent-inverse hover:opacity-90 transition-all flex items-center gap-2 shadow-md"
                >
                  <span className="text-[12px] font-black uppercase tracking-widest">3D Avatar</span>
                </button>
                {onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all flex items-center gap-2 shadow-md"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"></path>
                    </svg>
                    <span className="text-[12px] font-black uppercase tracking-widest">Settings</span>
                  </button>
                )}
              </div>
            </div>
            {/* Bio - inline display */}
            <p className="text-gray-500 text-sm leading-relaxed">
              {user?.bio || "This soul hasn't written a bio yet."}
            </p>
            <div className="flex space-x-10 pt-2">
              <StatItem label="Posts" value={String(userPosts.length)} />
              <StatItem label="Followers" value={socialStats?.followers_count?.toString() || '0'} onClick={onViewFollowers} />
              <StatItem label="Following" value={socialStats?.following_count?.toString() || '0'} onClick={onViewFollowing} />
            </div>
          </div>
        </div>
      </header>

      <section className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 bg-white p-10 rounded-[2.5rem] border border-black/[0.03] space-y-6 flex flex-col justify-between h-[420px]">
          <div className="flex justify-between items-center">
            <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-black">Emotion Insights</h4>
            <span className="text-[12px] font-bold text-black/20">Weekly</span>
          </div>

          {/* Quick Stats - Using real data from weeklyReport */}
          <div className="flex justify-around">
            <div className="text-center">
              <span className="text-3xl">{getMoodEmoji(weeklyReport?.average_mood_score ?? 0)}</span>
              <p className="text-lg font-black mt-1">{getMoodLabel(weeklyReport?.average_mood_score ?? 0)}</p>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Mood</p>
            </div>
            <div className="text-center">
              <span className="text-3xl">{getTrendIcon(weeklyReport?.emotion_trend?.trend_direction || 'stable')}</span>
              <p className="text-lg font-black mt-1">{getTrendLabel(weeklyReport?.emotion_trend?.trend_direction || 'stable')}</p>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Trend</p>
            </div>
            <div className="text-center">
              <span className="text-3xl">🎯</span>
              <p className="text-lg font-black mt-1">{Math.round((weeklyReport?.mood_stability ?? 1) * 100)}%</p>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Stable</p>
            </div>
          </div>

          {/* Simplified Bar Chart - 7 bars for Mon-Sun with real data */}
          <div className="flex items-end justify-between gap-2 px-4 h-24">
            {(() => {
              // Generate the 7 days of the current week (Monday to Sunday)
              const today = new Date()
              const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, ...
              const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

              const weekDays: { date: Date; dateStr: string }[] = []
              for (let i = 0; i < 7; i++) {
                const d = new Date(today)
                d.setDate(today.getDate() + mondayOffset + i)
                weekDays.push({
                  date: d,
                  dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                })
              }

              // Create a map of date -> data point
              // Prefer persistedScores (consistent across devices) over weeklyReport
              // persistedScores use UTC dates, convert to local for display matching
              const dataByDate: Record<string, { avg_score: number; dominant_emotion: string }> = {}
              if (persistedScores && persistedScores.length > 0) {
                // Use persisted scores for consistent display across all devices
                // Convert UTC date to local date for matching with weekDays
                persistedScores.forEach(score => {
                  const localDate = utcDateToLocalDate(score.utc_date)
                  dataByDate[localDate] = {
                    avg_score: score.avg_score,
                    dominant_emotion: score.dominant_emotion
                  }
                })
              } else if (weeklyReport?.emotion_trend?.data_points) {
                // Fallback to weeklyReport if no persisted scores
                weeklyReport.emotion_trend.data_points.forEach(point => {
                  const pointDate = point.date.split('T')[0]
                  dataByDate[pointDate] = point
                })
              }

              const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

              return weekDays.map((day, i) => {
                const data = dataByDate[day.dateStr]
                const isToday = day.dateStr === todayStr
                const isFuture = day.date > today

                if (data) {
                  // Has data: show score color + height based on score
                  // Map [-1, 1] to [30px, 96px] for visible height differences
                  const normalizedScore = (data.avg_score + 1) / 2  // 0 to 1
                  const heightPx = Math.round(30 + normalizedScore * 66)  // 30px to 96px
                  const barColor = getScoreColor(data.avg_score)
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t-lg transition-all hover:opacity-80"
                        style={{
                          height: `${heightPx}px`,
                          backgroundColor: barColor
                        }}
                        title={`${getScoreLabel(data.avg_score)}: ${data.avg_score.toFixed(2)}`}
                      />
                    </div>
                  )
                } else {
                  // No data: show gray placeholder
                  // Today without data = darker gray, past = medium gray, future = light gray
                  const bgColor = isToday ? '#9CA3AF' : isFuture ? '#E5E7EB' : '#D1D5DB'
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t-lg transition-all"
                        style={{ height: '30px', backgroundColor: bgColor }}
                        title={isToday ? 'Today (no data yet)' : isFuture ? 'Future' : 'No data'}
                      />
                    </div>
                  )
                }
              })
            })()}
          </div>
          <div className="flex justify-between text-[12px] font-black uppercase tracking-widest text-gray-400 px-4">
            <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
          </div>

          {/* Score Legend */}
          <div className="flex flex-wrap gap-2 mt-3 justify-center px-4">
            {[
              { label: 'Great', color: '#FF9500' },
              { label: 'Good', color: '#F9D849' },
              { label: 'Okay', color: '#66B04C' },
              { label: 'Low', color: '#3266B1' },
              { label: 'Bad', color: '#D32F2F' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[10px] font-bold text-gray-500">{item.label}</span>
              </div>
            ))}
          </div>

          {/* View Full Report Button with Refresh */}
          <div className="flex gap-2">
            {/* Refresh Today's Score Button */}
            <button
              type="button"
              onClick={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!user?._id || isRefreshingScore) return
                setIsRefreshingScore(true)
                try {
                  await aiChatApi.refreshTodayScore(user._id)
                  const data = await aiChatApi.getWeeklyEmotionScores(user._id)
                  onRefreshScores?.(data.scores)
                } catch (err) {
                  console.error('Failed to refresh today score:', err)
                } finally {
                  setIsRefreshingScore(false)
                }
              }}
              disabled={isRefreshingScore}
              className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-all disabled:opacity-50"
              title="Refresh today's score"
            >
              <svg
                className={`w-4 h-4 text-gray-600 ${isRefreshingScore ? 'animate-spin' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
            </button>

            {/* View Full Report Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onOpenEmotionReport?.()
              }}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-600 transition-all flex items-center justify-center gap-2"
            >
              <span>View Full Report</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-black/[0.03] flex flex-col shadow-sm relative">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-black">Check-in</h4>
            <span className="text-[13px] font-black tracking-widest text-accent">STREAK: {todayCheckIn?.streak ?? 0}</span>
          </div>
          <div className="mb-3">
            <p className="text-[14px] font-black tracking-wider text-gray-800">{currentMonth}</p>
          </div>

          {/* 坐标轴打卡组件 */}
          {showCoordinatePicker && (
            <div className="mb-4 bg-gray-50 p-4 rounded-2xl border border-black/5">
              {/* 标题 + Help Dropdown */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] font-black uppercase tracking-[0.2em] text-gray-300">
                  How are you feeling?
                </p>
                {/* Help Dropdown 触发按钮 */}
                <div className="relative">
                  <button
                    onClick={() => setShowHelpModal(!showHelpModal)}
                    className="w-5 h-5 rounded-full bg-gray-200 text-gray-400 text-xs flex items-center justify-center hover:bg-gray-300 transition-colors"
                  >
                    ?
                  </button>

                  {/* Help Dropdown Panel */}
                  {showHelpModal && (
                    <div className="absolute right-0 top-7 w-64 bg-white rounded-2xl shadow-xl border border-black/5 z-50 p-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
                      {/* Arrow */}
                      <div className="absolute -top-2 right-2 w-4 h-4 bg-white rotate-45 border-l border-t border-black/5" />

                      {/* Title */}
                      <h4 className="text-[13px] font-black text-gray-800 mb-3">Emotion Coordinate Guide</h4>

                      {/* Coordinate diagram */}
                      <div className="relative aspect-square bg-gray-50 rounded-xl overflow-hidden mb-3">
                        {/* 4 quadrant backgrounds */}
                        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                          <div className="bg-[#D32F2F]/15" />
                          <div className="bg-[#F9D040]/15" />
                          <div className="bg-[#3266B1]/15" />
                          <div className="bg-[#66B04C]/15" />
                        </div>

                        {/* Axis lines */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="absolute w-full h-[1px] bg-gray-200" />
                          <div className="absolute h-full w-[1px] bg-gray-200" />
                        </div>

                        {/* Center point */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-gray-300" />
                        </div>

                        {/* Axis labels */}
                        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[7px] font-bold text-gray-400">Negative</span>
                        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[7px] font-bold text-gray-400">Positive</span>
                        <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[7px] font-bold text-gray-400">High Energy</span>
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[7px] font-bold text-gray-400">Low Energy</span>

                        {/* Four quadrant emotions */}
                        <div className="absolute top-[12%] left-[12%] flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full bg-[#D32F2F] flex items-center justify-center">
                            <img src="/checkin/angry.png" alt="angry" className="w-4 h-4" />
                          </div>
                          <span className="text-[7px] font-bold text-gray-500 mt-0.5">Stressed</span>
                        </div>

                        <div className="absolute top-[12%] right-[12%] flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full bg-[#F9D040] flex items-center justify-center">
                            <img src="/checkin/happy.png" alt="happy" className="w-5 h-5" />
                          </div>
                          <span className="text-[7px] font-bold text-gray-500 mt-0.5">Excited</span>
                        </div>

                        <div className="absolute bottom-[12%] left-[12%] flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full bg-[#3266B1] flex items-center justify-center">
                            <img src="/checkin/sad.png" alt="sad" className="w-5 h-5" />
                          </div>
                          <span className="text-[7px] font-bold text-gray-500 mt-0.5">Sad</span>
                        </div>

                        <div className="absolute bottom-[12%] right-[12%] flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full bg-[#66B04C] flex items-center justify-center">
                            <img src="/checkin/peace.png" alt="calm" className="w-6 h-6" />
                          </div>
                          <span className="text-[7px] font-bold text-gray-500 mt-0.5">Relaxed</span>
                        </div>
                      </div>

                      {/* Instructions */}
                      <p className="text-[10px] text-gray-400 text-center">
                        Drag the dot to express your mood
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 坐标轴画布 */}
              <div
                className="relative w-full aspect-square rounded-xl overflow-hidden cursor-crosshair touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              >
                {/* 8x8 渐变色块网格 - 每个象限4x4，四个角最深，中心最浅 */}
                <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
                  {/* 行1 (最上) - 左上红色最深，右上黄色最深 */}
                  <div className="bg-[#D32F2F]" /><div className="bg-[#DC4545]" /><div className="bg-[#E55A5A]" /><div className="bg-[#EE7070]" />
                  <div className="bg-[#FAD870]" /><div className="bg-[#F9D040]" /><div className="bg-[#E8C020]" /><div className="bg-[#D8B010]" />
                  {/* 行2 */}
                  <div className="bg-[#DC4545]" /><div className="bg-[#E55A5A]" /><div className="bg-[#EE7070]" /><div className="bg-[#F58585]" />
                  <div className="bg-[#FBE4A0]" /><div className="bg-[#FAD870]" /><div className="bg-[#F9D040]" /><div className="bg-[#E8C020]" />
                  {/* 行3 */}
                  <div className="bg-[#E55A5A]" /><div className="bg-[#EE7070]" /><div className="bg-[#F58585]" /><div className="bg-[#FAA0A0]" />
                  <div className="bg-[#FCF0C0]" /><div className="bg-[#FBE4A0]" /><div className="bg-[#FAD870]" /><div className="bg-[#F9D040]" />
                  {/* 行4 (靠近中心) */}
                  <div className="bg-[#EE7070]" /><div className="bg-[#F58585]" /><div className="bg-[#FAA0A0]" /><div className="bg-[#FDB5B5]" />
                  <div className="bg-[#FDFAE0]" /><div className="bg-[#FCF0C0]" /><div className="bg-[#FBE4A0]" /><div className="bg-[#FAD870]" />

                  {/* 行5 (靠近中心) - 蓝色和绿色都是原点最浅 */}
                  <div className="bg-[#5588CC]" /><div className="bg-[#6699D5]" /><div className="bg-[#77AADD]" /><div className="bg-[#88BBE5]" />
                  <div className="bg-[#E0F0D0]" /><div className="bg-[#D0E8C0]" /><div className="bg-[#C0E0B0]" /><div className="bg-[#B0D8A0]" />
                  {/* 行6 */}
                  <div className="bg-[#4477BB]" /><div className="bg-[#5588CC]" /><div className="bg-[#6699D5]" /><div className="bg-[#77AADD]" />
                  <div className="bg-[#B0D8A0]" /><div className="bg-[#A0D090]" /><div className="bg-[#90C880]" /><div className="bg-[#80C070]" />
                  {/* 行7 */}
                  <div className="bg-[#3266B1]" /><div className="bg-[#4477BB]" /><div className="bg-[#5588CC]" /><div className="bg-[#6699D5]" />
                  <div className="bg-[#90C880]" /><div className="bg-[#80C070]" /><div className="bg-[#70B860]" /><div className="bg-[#66B04C]" />
                  {/* 行8 (最下) - 左下蓝色最深，右下绿色最深 */}
                  <div className="bg-[#2855A0]" /><div className="bg-[#3266B1]" /><div className="bg-[#4477BB]" /><div className="bg-[#5588CC]" />
                  <div className="bg-[#80C070]" /><div className="bg-[#70B860]" /><div className="bg-[#66B04C]" /><div className="bg-[#56A03C]" />
                </div>

                {/* 坐标轴线 */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="absolute w-full h-[2px] bg-white/40" />
                  <div className="absolute h-full w-[2px] bg-white/40" />
                </div>

                {/* 坐标轴标签 - 放在轴的两端 */}
                {/* 横轴: Negative -> Positive */}
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-black/70 text-[11px] font-bold">Negative</span>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-black/70 text-[11px] font-bold">Positive</span>
                {/* 纵轴: Low Energy -> High Energy */}
                <span className="absolute top-2 left-1/2 -translate-x-1/2 text-black/70 text-[11px] font-bold">High Energy</span>
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-black/70 text-[11px] font-bold">Low Energy</span>

                {/* 中心表情 - 背景颜色随光标位置动态变化 */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors duration-200"
                    style={{ backgroundColor: currentColor }}
                  >
                    <img
                      src={EMOJI_IMAGES[currentEmoji]}
                      alt={currentEmoji}
                      className="w-9 h-9 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* 可拖拽的点 */}
                <div
                  className="absolute w-5 h-5 bg-white rounded-full shadow-lg border-2 border-gray-400 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
                  style={{
                    left: `${(coordinate.x + 1) / 2 * 100}%`,
                    top: `${(1 - (coordinate.y + 1) / 2) * 100}%`,
                  }}
                />
              </div>

              {/* 确认按钮 */}
              <button
                onClick={handleConfirmCheckIn}
                className="mt-3 w-full py-2.5 bg-black text-white rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-gray-800 transition-colors"
              >
                Confirm Check-in
              </button>
            </div>
          )}

          {/* 星期表头 */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <div key={i} className="text-center text-[10px] font-black uppercase tracking-wider text-gray-400">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 z-10 max-h-[260px] overflow-y-auto scrollbar-hide">
            {/* 空白占位 - 对齐到正确的星期几 */}
            {Array.from({ length: calendarData.startDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {calendarDates.map((dateInfo, i) => {
              // Today - show check-in button (always clickable to allow mood update)
              if (dateInfo.isToday) {
                const todayColor = effectiveCheckIn?.color || dateInfo.customColor
                return (
                  <button
                    key={i}
                    onClick={() => {
                      // 如果已签到，初始化坐标到已有位置
                      if (effectiveCheckIn?.coordinate_x !== undefined && effectiveCheckIn?.coordinate_y !== undefined) {
                        setCoordinate({ x: effectiveCheckIn.coordinate_x, y: effectiveCheckIn.coordinate_y })
                      } else {
                        setCoordinate({ x: 0, y: 0 })
                      }
                      setShowCoordinatePicker(!showCoordinatePicker)
                    }}
                    className={`group w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-500 border-2 text-[12px] relative ${todayColor ? 'border-transparent shadow-lg font-black hover:opacity-90' : 'bg-transparent border-accent text-accent hover:bg-accent hover:text-white hover:scale-105'}`}
                    style={{ backgroundColor: todayColor || 'transparent', color: todayColor ? '#fff' : 'inherit' }}
                  >
                    {todayColor ? (
                      <>
                        {/* 显示表情图标 */}
                        {(effectiveCheckIn?.emoji || dateInfo.emoji) && (
                          <img
                            src={EMOJI_IMAGES[effectiveCheckIn?.emoji || dateInfo.emoji || 'happy']}
                            alt=""
                            className="w-8 h-8 group-hover:hidden"
                          />
                        )}
                        <span className="hidden group-hover:block text-sm">✎</span>
                      </>
                    ) : (
                      <span className="text-lg">+</span>
                    )}
                  </button>
                )
              }

              // Past days - show with mood color if checked in, gray if not
              if (dateInfo.isPast) {
                // 优先使用新的坐标轴签到数据 - 显示表情图标
                if (dateInfo.customColor && dateInfo.emoji) {
                  return (
                    <div key={i} className="aspect-square rounded-xl border border-transparent flex items-center justify-center transition-all duration-500 shadow-sm" style={{ backgroundColor: dateInfo.customColor }}>
                      <img
                        src={EMOJI_IMAGES[dateInfo.emoji]}
                        alt=""
                        className="w-8 h-8"
                      />
                    </div>
                  )
                }
                // 旧的心情签到数据 - 向后兼容，显示数字
                if (dateInfo.mood) {
                  return (
                    <div key={i} className="aspect-square rounded-xl border border-transparent flex items-center justify-center text-[12px] font-black transition-all duration-500 shadow-sm" style={{ backgroundColor: dateInfo.mood.color, color: dateInfo.mood.text }}>
                      {dateInfo.day}
                    </div>
                  )
                }
                // 没有签到记录，显示灰色数字
                return (
                  <div key={i} className="aspect-square rounded-xl border border-black/5 flex items-center justify-center text-[12px] font-black text-black/10 transition-all duration-500">
                    {dateInfo.day}
                  </div>
                )
              }

              // Future days - show as empty
              return (
                <div key={i} className="aspect-square rounded-xl border border-black/5 flex items-center justify-center text-[12px] font-black text-black/10 transition-all duration-500">
                  {dateInfo.day}
                </div>
              )
            })}
          </div>
          <p className="text-center text-[14px] font-black uppercase tracking-[0.3em] text-gray-300 mt-2">Pick current vibe</p>
        </div>
      </section>

      {/* My Moments - User's Posts */}
      <section className="space-y-12">
        <h4 className="text-3xl font-black tracking-tighter uppercase px-4">My Moments</h4>
        {userPosts.length > 0 ? (
          <div className="card-stack overflow-visible px-4 pt-10">
            {userPosts.slice(0, 5).map((post, i) => {
              const postMood = post.emotion || post.ai_emotion || 'Neutral'
              // Use custom emotion_color if available, otherwise fall back to mood color mapping
              let color: string
              let textColor: string
              if (post.emotion_color) {
                color = post.emotion_color
                // Calculate text color based on brightness
                const hex = post.emotion_color.replace('#', '')
                const r = parseInt(hex.substr(0, 2), 16)
                const g = parseInt(hex.substr(2, 2), 16)
                const b = parseInt(hex.substr(4, 2), 16)
                const brightness = (r * 299 + g * 587 + b * 114) / 1000
                textColor = brightness > 128 ? '#121212' : '#ffffff'
              } else {
                const moodData = MOOD_DATA.find(m => m.label.toLowerCase() === postMood.toLowerCase())
                color = moodData?.color || '#4B4E91'
                textColor = postMood === 'Joy' ? '#121212' : '#ffffff'
              }
              const imageUrl = post.media_urls && post.media_urls.length > 0 ? getMediaUrl(post.media_urls[0]) : undefined
              return (
                <GalleryCard
                  key={post.id || i}
                  title={post.content.substring(0, 30) + (post.content.length > 30 ? '...' : '')}
                  mood={postMood}
                  date={new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase()}
                  color={color}
                  textColor={textColor}
                  imageUrl={imageUrl}
                  onClick={() => onOpenPostDetail(post)}
                />
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400 font-bold px-4">
            No posts yet. Share your moments in the Community tab!
          </div>
        )}
      </section>

      {/* My Journals - User's Diary Entries */}
      <section className="space-y-12 pb-20">
        <h4 className="text-3xl font-black tracking-tighter uppercase px-4">My Journals</h4>
        {diaryEntries.length > 0 ? (
          <div className="diary-stack px-4">
            {diaryEntries.map((entry, i) => (
              <DiaryStackItem
                key={i}
                title={entry.title}
                date={entry.date}
                color={entry.color}
                mood={entry.mood}
                accent={entry.mood === 'Joy' ? '#121212' : '#ffffff'}
                onClick={() => onOpenJournalDetail(entry)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400 font-bold px-4">
            No journal entries yet. Start writing in the Journal tab!
          </div>
        )}
      </section>

    </div>
  )
}
