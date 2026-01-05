import { useState } from 'react'
import { Avatar3D } from '../../config/avatars'

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
}

function StatItem({ label, value }: StatItemProps) {
  return (
    <div className="space-y-0.5">
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
}

function GalleryCard({ title, mood, date, color, textColor }: GalleryCardProps) {
  return (
    <div className="card-pullable flex-shrink-0 w-64 h-80 rounded-[2.5rem] p-8 flex flex-col justify-between border border-black/[0.04] shadow-xl" style={{ backgroundColor: color }}>
      <span className="text-[12px] font-black uppercase tracking-widest opacity-40" style={{ color: textColor }}>{date}</span>
      <div className="space-y-1.5">
        <p className="text-[14px] font-black uppercase tracking-[0.25em] opacity-80" style={{ color: textColor }}>{mood}</p>
        <h5 className="text-xl font-black leading-tight tracking-tight" style={{ color: textColor }}>{title}</h5>
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
}

function DiaryStackItem({ title, date, color, mood, accent }: DiaryStackItemProps) {
  return (
    <div className="diary-item-pullable p-8 rounded-[2.5rem] border border-black/[0.05] shadow-xl flex flex-col justify-between cursor-pointer mb-[-60px]" style={{ backgroundColor: color }}>
      <div className="flex items-center space-x-4">
        <span className="text-[12px] font-black uppercase tracking-widest opacity-60" style={{ color: accent }}>{date}</span>
        <span className="text-[14px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-white/20" style={{ color: accent }}>{mood}</span>
      </div>
      <h6 className="text-2xl font-black tracking-tight" style={{ color: accent }}>{title}</h6>
    </div>
  )
}

interface ProfileViewProps {
  points: number
  onCheckIn: (e: React.MouseEvent) => void
  onThemeChange: (theme: Theme) => void
  currentTheme: Theme
  onOpenAvatarGallery: () => void
  selectedAvatar: Avatar3D | null
}

export default function ProfileView({ points, onCheckIn, onThemeChange, currentTheme, onOpenAvatarGallery, selectedAvatar }: ProfileViewProps) {
  const [checkedInMood, setCheckedInMood] = useState<{ label: string; color: string; text: string } | null>(null)
  const [showMoodPicker, setShowMoodPicker] = useState(false)
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

  const handleCheckIn = (e: React.MouseEvent, mood: typeof MOOD_DATA[0]) => {
    onCheckIn(e)
    setCheckedInMood(mood)
    setShowMoodPicker(false)
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
              🦊
            </div>
            <div className="absolute -bottom-1 -right-1 bg-accent text-accent-inverse px-3 py-1 rounded-full text-[14px] font-black uppercase tracking-widest border-2 border-white transition-colors">LVL 4</div>
          </div>
          <div className="flex-1 space-y-6 w-full">
            <div className="flex justify-between items-start">
              <div className="space-y-0.5">
                <h3 className="text-xl font-black text-gray-800">Alex_Vibe_99</h3>
                <p className="text-gray-400 font-bold text-[13px] uppercase tracking-[0.2em]">Resonance: <span className="text-accent transition-colors">{points.toLocaleString()}</span></p>
              </div>
              <button
                onClick={onOpenAvatarGallery}
                className="px-4 py-2 rounded-xl bg-accent text-accent-inverse hover:opacity-90 transition-all flex items-center gap-2 shadow-md"
              >
                <span className="text-[12px] font-black uppercase tracking-widest">3D Avatar</span>
              </button>
            </div>
            <div className="flex space-x-10">
              <StatItem label="Posts" value="142" />
              <StatItem label="Followers" value="3.8k" />
              <StatItem label="Friends" value="219" />
            </div>
          </div>
        </div>
      </header>

      <section className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 bg-white p-10 rounded-[2.5rem] border border-black/[0.03] space-y-8 flex flex-col justify-between h-[420px]">
          <div className="flex justify-between items-center">
            <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-300">Trend</h4>
            <span className="text-[12px] font-bold text-black/20">7 Days</span>
          </div>
          <div className="flex-1 flex items-center justify-center relative px-4">
            <svg className="w-full h-full opacity-60" viewBox="0 0 400 180">
              <path d="M0,130 Q50,10 100,90 T200,70 T300,120 T400,50" fill="none" stroke="currentColor" className="text-accent transition-all duration-500" strokeWidth="3" strokeLinecap="round" />
              <circle cx="100" cy="90" r="5" fill="currentColor" className="text-accent" />
              <circle cx="300" cy="120" r="5" fill="white" stroke="currentColor" className="text-accent" strokeWidth="2" />
            </svg>
          </div>
          <div className="flex justify-between text-[12px] font-black uppercase tracking-widest text-gray-400 px-4">
            <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
          </div>
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
                  <button key={m.label} onClick={(e) => handleCheckIn(e, m)} className="aspect-square rounded-xl flex flex-col items-center justify-center space-y-1 transition-all hover:scale-105 active:scale-95 shadow-sm" style={{ backgroundColor: m.color }}>
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
                  <button key={i} disabled={!!checkedInMood} onClick={() => !checkedInMood && setShowMoodPicker(!showMoodPicker)} className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-500 border-2 text-[12px] ${checkedInMood ? 'border-transparent shadow-lg font-black' : 'bg-transparent border-accent text-accent hover:bg-accent hover:text-white hover:scale-105'}`} style={{ backgroundColor: checkedInMood?.color || 'transparent', color: checkedInMood?.text || 'inherit' }}>
                    {checkedInMood ? dateInfo.day : <span className="text-lg">+</span>}
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

      <section className="space-y-12">
        <h4 className="text-3xl font-black tracking-tighter uppercase px-4">My Moments</h4>
        <div className="card-stack overflow-visible px-4 pt-10">
          <GalleryCard title="Midnight Silence" mood="Bored" date="MAY 24" color="#4B4E91" textColor="#ffffff" />
          <GalleryCard title="Peak Success" mood="Joy" date="MAY 22" color="#F9D849" textColor="#121212" />
          <GalleryCard title="Nightmare Steps" mood="Fear" date="MAY 15" color="#9381BA" textColor="#ffffff" />
          <GalleryCard title="Deep Blue Hour" mood="Sad" date="MAY 10" color="#3266B1" textColor="#ffffff" />
          <GalleryCard title="Vivid Desire" mood="Envy" date="MAY 08" color="#2BA8A4" textColor="#ffffff" />
        </div>
      </section>

      <section className="space-y-12 pb-20">
        <h4 className="text-3xl font-black tracking-tighter uppercase px-4">Private Logs</h4>
        <div className="diary-stack px-4">
          <DiaryStackItem title="Breaking through the anxiety loop" date="MAY 23" color="#E67E22" mood="Anxious" accent="#ffffff" />
          <DiaryStackItem title="The social tension today" date="MAY 21" color="#D278A3" mood="Awkward" accent="#ffffff" />
          <DiaryStackItem title="Fueling the fire of ambition" date="MAY 18" color="#D32F2F" mood="Angry" accent="#ffffff" />
          <DiaryStackItem title="Synthesis of internal disgust" date="MAY 15" color="#66B04C" mood="Disgust" accent="#ffffff" />
        </div>
      </section>
    </div>
  )
}
