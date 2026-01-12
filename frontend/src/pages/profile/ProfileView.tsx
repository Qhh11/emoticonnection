import { useState } from 'react'
import { Avatar3D } from '../../config/avatars'
import { SocialStats, Post, User, EmotionReport } from '../../services/api'

interface AuthUser {
  user_id: string
  // username: string
  // nickname: string
}

// Global Mood-Color Mapping from DESIGN_SYSTEM.md
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
  onClick?: () => void
}

function GalleryCard({ title, mood, date, color, textColor, onClick }: GalleryCardProps) {
  return (
    <div
      onClick={onClick}
      className="card-pullable flex-shrink-0 w-64 h-80 rounded-[2.5rem] p-8 flex flex-col justify-between border border-black/[0.04] shadow-xl cursor-pointer hover:scale-[1.02] transition-transform"
      style={{ backgroundColor: color }}
    >
      <span className="text-[12px] font-black uppercase tracking-widest opacity-40" style={{ color: textColor }}>{date}</span>
      <div className="space-y-1.5">
        <p className="text-[14px] font-black uppercase tracking-[0.25em] opacity-80" style={{ color: textColor }}>{mood}</p>
        <h5 className="text-xl font-black leading-tight tracking-tight" style={{ color: textColor }}>{title}</h5>
        <p className="text-[11px] font-bold mt-2 opacity-50" style={{ color: textColor }}>Click to view</p>
      </div>
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

export interface DiaryEntry {
  date: string
  mood: string
  color: string
  text: string
}

interface ProfileViewProps {
  points: number
  level: number
  avatar: string
  onCheckIn: (mood: string) => Promise<boolean>
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
  todayCheckIn: { mood: string; color: string; text: string } | null
  onOpenSettings?: () => void
  onViewFollowing?: () => void
  onViewFollowers?: () => void
  onOpenEmotionReport?: () => void
  weeklyReport?: EmotionReport | null
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

export default function ProfileView({ points, level, avatar, onCheckIn, onThemeChange, currentTheme, onOpenAvatarGallery, user, socialStats, diaryEntries, userPosts, onOpenJournalDetail, onOpenPostDetail, todayCheckIn, onOpenSettings, onViewFollowing, onViewFollowers, onOpenEmotionReport, weeklyReport }: ProfileViewProps) {
  const [checkedInMood, setCheckedInMood] = useState<{ label: string; color: string; text: string } | null>(null)
  const [showMoodPicker, setShowMoodPicker] = useState(false)

  // Use todayCheckIn from props or local state
  const effectiveCheckIn = todayCheckIn || checkedInMood
  const [showThemeSelector, setShowThemeSelector] = useState(false)

  // Generate current month calendar
  const [calendarData] = useState(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const currentDay = today.getDate()

    // Get month name
    const monthName = today.toLocaleString('en-US', { month: 'short' }).toUpperCase()

    // Get number of days in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const dates = []
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = day === currentDay
      const isPast = day < currentDay

      dates.push({
        day,
        isToday,
        isPast,
        mood: isPast ? MOOD_DATA[Math.floor(Math.random() * MOOD_DATA.length)] : null
      })
    }

    return {
      monthYear: `${monthName} ${year}`,
      dates
    }
  })

  const currentMonth = calendarData.monthYear
  const calendarDates = calendarData.dates

  const handleCheckIn = async (mood: typeof MOOD_DATA[0]) => {
    const success = await onCheckIn(mood.label)
    if (success) {
      setCheckedInMood(mood)
      setShowMoodPicker(false)
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
          <div className="relative group">
            <div className="w-32 h-32 md:w-36 md:h-36 rounded-[3rem] bg-gray-50 flex items-center justify-center text-6xl shadow-inner border-4 border-white group-hover:scale-105 transition-transform duration-700 font-black tracking-tighter overflow-hidden">
              {avatar}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-accent text-accent-inverse px-3 py-1 rounded-full text-[14px] font-black uppercase tracking-widest border-2 border-white transition-colors">Lv.{level}</div>
          </div>
          <div className="flex-1 space-y-6 w-full">
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
            <div className="flex space-x-10">
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
            <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-300">Emotion Insights</h4>
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

          {/* Simplified Bar Chart - Using real data */}
          <div className="flex-1 flex items-end justify-between gap-2 px-4">
            {weeklyReport?.emotion_trend?.data_points && weeklyReport.emotion_trend.data_points.length > 0 ? (
              weeklyReport.emotion_trend.data_points.map((point, i) => {
                // Normalize score from [-1, 1] to [20, 100] for bar height
                const height = Math.max(20, ((point.avg_score + 1) / 2) * 100)
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-lg bg-accent transition-all hover:opacity-80"
                      style={{ height: `${height}%`, minHeight: '20px' }}
                      title={`${point.dominant_emotion}: ${point.avg_score.toFixed(2)}`}
                    />
                  </div>
                )
              })
            ) : (
              // Placeholder bars when no data
              ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((_, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-lg bg-gray-200 transition-all" style={{ height: '30%', minHeight: '20px' }} />
                </div>
              ))
            )}
          </div>
          <div className="flex justify-between text-[12px] font-black uppercase tracking-widest text-gray-400 px-4">
            <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
          </div>

          {/* View Full Report Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onOpenEmotionReport?.()
            }}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-600 transition-all flex items-center justify-center gap-2"
          >
            <span>View Full Report</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-black/[0.03] flex flex-col shadow-sm relative">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-300">Check-in</h4>
            <span className="text-[13px] font-black tracking-widest text-accent">STREAK: 12</span>
          </div>
          <div className="mb-3">
            <p className="text-[14px] font-black tracking-wider text-gray-800">{currentMonth}</p>
          </div>

          {/* Mood Picker - Show at top when active */}
          {showMoodPicker && (
            <div className="mb-4 bg-gray-50 p-4 rounded-2xl border border-black/5">
              <p className="text-[12px] font-black uppercase tracking-[0.2em] text-gray-300 mb-3">Choose Vibe</p>
              <div className="grid grid-cols-3 gap-2">
                {MOOD_DATA.map(m => (
                  <button key={m.label} onClick={() => handleCheckIn(m)} className="aspect-square rounded-xl flex flex-col items-center justify-center space-y-1 transition-all hover:scale-105 active:scale-95 shadow-sm" style={{ backgroundColor: m.color }}>
                    <span className="text-[14px] font-black tracking-tighter uppercase" style={{ color: m.text }}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-7 gap-2 z-10 max-h-[300px] overflow-y-auto scrollbar-hide">
            {calendarDates.map((dateInfo, i) => {
              // Today - show check-in button
              if (dateInfo.isToday) {
                return (
                  <button key={i} disabled={!!effectiveCheckIn} onClick={() => !effectiveCheckIn && setShowMoodPicker(!showMoodPicker)} className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-500 border-2 text-[12px] ${effectiveCheckIn ? 'border-transparent shadow-lg font-black' : 'bg-transparent border-accent text-accent hover:bg-accent hover:text-white hover:scale-105'}`} style={{ backgroundColor: effectiveCheckIn?.color || 'transparent', color: effectiveCheckIn?.text || 'inherit' }}>
                    {effectiveCheckIn ? dateInfo.day : <span className="text-lg">+</span>}
                  </button>
                )
              }

              // Past days - show with mood color
              if (dateInfo.isPast) {
                return (
                  <div key={i} className="aspect-square rounded-xl border border-transparent flex items-center justify-center text-[12px] font-black transition-all duration-500 shadow-sm" style={{ backgroundColor: dateInfo.mood?.color || 'transparent', color: dateInfo.mood?.text || 'inherit' }}>
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
              const moodData = MOOD_DATA.find(m => m.label.toLowerCase() === postMood.toLowerCase())
              const color = moodData?.color || '#4B4E91'
              const textColor = postMood === 'Joy' ? '#121212' : '#ffffff'
              return (
                <GalleryCard
                  key={post.id || i}
                  title={post.content.substring(0, 30) + (post.content.length > 30 ? '...' : '')}
                  mood={postMood}
                  date={new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase()}
                  color={color}
                  textColor={textColor}
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
            {diaryEntries.slice(0, 4).map((entry, i) => (
              <DiaryStackItem
                key={i}
                title={entry.text.substring(0, 40) + (entry.text.length > 40 ? '...' : '')}
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
