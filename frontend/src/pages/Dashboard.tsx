import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AvatarGallery from '../components/dashboard/AvatarGallery'
import AvatarCompanion from '../components/dashboard/AvatarCompanion'
import { Avatar3D } from '../config/avatars'
import CommunityView from './community/CommunityView'
import DiaryView, { DiaryEntry } from './diary/DiaryView'
import SoulSyncView from './soulsync/SoulSyncView'
import ProfileView, { Theme, THEMES } from './profile/ProfileView'

type Tab = 'profile' | 'diary' | 'chat' | 'community' | 'soulsync'

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

export default function Dashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [points, setPoints] = useState(2450)
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([])
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[THEMES.length - 1])
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([
    { date: 'DEC 18', mood: 'Joy', color: '#F9D849', text: 'Today was truly special. The park felt alive...' },
    { date: 'DEC 16', mood: 'Bored', color: '#4B4E91', text: 'Stuck in a loop of digital noise. Need to unplug.' },
    { date: 'DEC 15', mood: 'Sad', color: '#3266B1', text: 'The rain matched my internal frequency perfectly.' }
  ])

  // Avatar gallery state
  const [showAvatarGallery, setShowAvatarGallery] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar3D | null>(() => {
    const saved = localStorage.getItem('selectedAvatar')
    return saved ? JSON.parse(saved) : null
  })

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--accent-color', currentTheme.color)
    root.style.setProperty('--accent-soft', currentTheme.soft)
    root.style.setProperty('--accent-text', currentTheme.text)
  }, [currentTheme])

  const handleLogout = () => {
    navigate('/')
  }

  const triggerCheckIn = (e: React.MouseEvent) => {
    const id = Date.now()
    const x = e.clientX
    const y = e.clientY
    setBursts(prev => [...prev, { id, x, y }])
    setPoints(prev => prev + 10)
    setTimeout(() => {
      setBursts(prev => prev.filter(b => b.id !== id))
    }, 1000)
  }

  const addDiaryEntry = (entry: {mood: string, color: string, text: string}) => {
    const newEntry = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase(),
      ...entry
    }
    setDiaryEntries(prev => [newEntry, ...prev])
  }

  const handleSelectAvatar = (avatar: Avatar3D) => {
    setSelectedAvatar(avatar)
    localStorage.setItem('selectedAvatar', JSON.stringify(avatar))
  }

  const handleCloseCompanion = () => {
    setSelectedAvatar(null)
    localStorage.removeItem('selectedAvatar')
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileView
          points={points}
          onCheckIn={triggerCheckIn}
          onThemeChange={setCurrentTheme}
          currentTheme={currentTheme}
          onOpenAvatarGallery={() => setShowAvatarGallery(true)}
          selectedAvatar={selectedAvatar}
        />
      case 'diary':
        return <DiaryView onInteract={triggerCheckIn} entries={diaryEntries} onAddEntry={addDiaryEntry} />
      case 'community':
        return <CommunityView onInteract={triggerCheckIn} />
      case 'soulsync':
        return <SoulSyncView onInteract={triggerCheckIn} />
      default:
        return <PlaceholderView title={activeTab} />
    }
  }

  return (
    <div className="flex h-screen bg-[#FAFAFA] text-[#121212] overflow-hidden" style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: '125%', height: '125%' }}>
      <aside className="w-20 md:w-24 bg-white border-r border-black/[0.03] flex flex-col items-center py-12 z-50 shadow-sm">
        <div className="mb-16 cursor-pointer group" onClick={handleLogout}>
          <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-all duration-500 shadow-xl">
            <div className="w-2 h-2 bg-accent-soft rounded-full animate-pulse"></div>
          </div>
        </div>

        <nav className="flex-1 flex flex-col space-y-10">
          <NavItem active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<ProfileIcon />} label="profile" />
          <NavItem active={activeTab === 'diary'} onClick={() => setActiveTab('diary')} icon={<DiaryIcon />} label="diary" />
          <NavItem active={activeTab === 'soulsync'} onClick={() => setActiveTab('soulsync')} icon={<ChatIcon />} label="chat" />
          <NavItem active={activeTab === 'community'} onClick={() => setActiveTab('community')} icon={<CommunityIcon />} label="community" />
        </nav>

        <button onClick={handleLogout} className="mt-auto text-gray-300 hover:text-accent transition-colors">
          <LogoutIcon />
        </button>
      </aside>

      {bursts.map(burst => (
        <div key={burst.id} className="fixed inset-0 pointer-events-none z-[100]">
          <div className="particle-circle" style={{ left: burst.x - 25, top: burst.y - 25, width: 50, height: 50 }}></div>
          <div className="absolute font-black text-accent text-xl animate-point-float" style={{ left: burst.x, top: burst.y }}>+10</div>
        </div>
      ))}

      <main className="flex-1 overflow-y-auto scrollbar-hide perspective-container">
        <div className="max-w-6xl mx-auto p-10 md:p-20 space-y-24">
          {renderContent()}
        </div>
      </main>

      {/* Avatar Gallery Modal */}
      <AvatarGallery
        isOpen={showAvatarGallery}
        onClose={() => setShowAvatarGallery(false)}
        onSelectAvatar={handleSelectAvatar}
        selectedAvatarId={selectedAvatar?.id}
      />

      {/* Avatar Companion - Floating on dashboard */}
      {selectedAvatar && (
        <AvatarCompanion
          avatar={selectedAvatar}
          onClose={handleCloseCompanion}
        />
      )}
    </div>
  )
}

interface NavItemProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function NavItem({ active, onClick, icon }: NavItemProps) {
  return (
    <button onClick={onClick} className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all ${active ? 'bg-accent text-accent-inverse shadow-xl scale-110' : 'text-gray-300 hover:text-accent'}`}>
      {icon}
    </button>
  )
}

/* --- HELPER COMPONENTS --- */

interface PlaceholderViewProps {
  title: string
}

function PlaceholderView({ title }: PlaceholderViewProps) {
  return <div className="flex items-center justify-center min-h-[60vh] text-6xl font-black opacity-5 uppercase">{title}</div>
}

/* --- ICONS --- */
function ProfileIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}

function DiaryIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M8 7h6"/><path d="M8 11h8"/></svg>
}

function ChatIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
}

function SyncIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 12c0-4.4 3.6-8 8-8 3.3 0 6.2 2 7.4 4.9M22 12c0 4.4-3.6 8-8 8-3.3 0-6.2-2-7.4-4.9"/></svg>
}

function CommunityIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z"/><circle cx="12" cy="12" r="3"/><path d="M12 2L12 12"/></svg>
}

function LogoutIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}
