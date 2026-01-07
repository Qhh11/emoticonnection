import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AvatarGallery from '../components/dashboard/AvatarGallery'
import AvatarCompanion from '../components/dashboard/AvatarCompanion'
import { Avatar3D } from '../config/avatars'
import CommunityView from './community/CommunityView'
import DiaryView, { DiaryEntry } from './diary/DiaryView'
import SoulSyncView from './soulsync/SoulSyncView'
import ProfileView, { Theme, THEMES } from './profile/ProfileView'
import { useAuth } from '../contexts/AuthContext'
import { userApi, aiChatApi, postApi, SocialStats, Diary, Post } from '../services/api'

type Tab = 'profile' | 'diary' | 'chat' | 'community' | 'soulsync'

// Avatar emoji options for user selection
const AVATAR_OPTIONS = ['🦊', '🐱', '🐶', '🐼', '🦁', '🐯', '🐸', '🦄', '🐲', '🦋', '🌸', '⭐']

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
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [points, setPoints] = useState(0)
  const [level, setLevel] = useState(1)
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([])
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[THEMES.length - 1])
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([])
  const [userPosts, setUserPosts] = useState<Post[]>([])

  // Social stats from API
  const [socialStats, setSocialStats] = useState<SocialStats | null>(null)

  // Avatar gallery state
  const [showAvatarGallery, setShowAvatarGallery] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar3D | null>(() => {
    const saved = localStorage.getItem('selectedAvatar')
    return saved ? JSON.parse(saved) : null
  })

  // Modal states for journal/post detail
  const [selectedJournalModal, setSelectedJournalModal] = useState<DiaryEntry | null>(null)
  const [selectedPostModal, setSelectedPostModal] = useState<Post | null>(null)

  // Today's check-in status
  const [todayCheckIn, setTodayCheckIn] = useState<{ mood: string; color: string; text: string } | null>(null)

  // Settings modal state
  const [showSettings, setShowSettings] = useState(false)
  const [settingsNickname, setSettingsNickname] = useState('')
  const [settingsPassword, setSettingsPassword] = useState('')
  const [settingsAvatar, setSettingsAvatar] = useState('🦊')
  const [settingsSaving, setSettingsSaving] = useState(false)

  // User avatar state
  const [userAvatar, setUserAvatar] = useState('🦊')

  // Sync userAvatar when user data changes (e.g., after login loads user data)
  useEffect(() => {
    if (user?.avatar) {
      setUserAvatar(user.avatar)
    }
  }, [user?.avatar])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--accent-color', currentTheme.color)
    root.style.setProperty('--accent-soft', currentTheme.soft)
    root.style.setProperty('--accent-text', currentTheme.text)
  }, [currentTheme])

  // Fetch social stats, points, and diaries when user is available
  useEffect(() => {
    if (user?.user_id) {
      userApi.getSocialStats(user.user_id)
        .then(stats => setSocialStats(stats))
        .catch(err => console.error('Failed to fetch social stats:', err))

      // Load user points and level from API
      userApi.getPoints(user.user_id)
        .then(data => {
          setPoints(data.points)
          setLevel(data.level)
        })
        .catch(err => console.error('Failed to fetch points:', err))

      // Load diaries from API
      aiChatApi.getDiaries(user.user_id)
        .then((diaries: Diary[]) => {
          const entries: DiaryEntry[] = diaries.map(d => ({
            date: new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase(),
            mood: d.mood || 'Neutral',
            color: getMoodColor(d.mood),
            text: d.content
          }))
          setDiaryEntries(entries)
        })
        .catch(err => console.error('Failed to fetch diaries:', err))

      // Load user's posts from API
      postApi.getUserPosts(user.user_id)
        .then(response => {
          setUserPosts(response.posts)
        })
        .catch(err => console.error('Failed to fetch user posts:', err))

      // Check if user has checked in today
      userApi.getTodayCheckIn(user.user_id)
        .then(response => {
          if (response.checked_in && response.check_in) {
            const moodData = MOOD_DATA.find(m => m.label.toLowerCase() === response.check_in!.mood.toLowerCase())
            if (moodData) {
              setTodayCheckIn({ mood: moodData.label, color: moodData.color, text: moodData.text })
            }
          }
        })
        .catch(err => console.error('Failed to fetch today check-in:', err))
    }
  }, [user?.user_id])

  // Helper function to get mood color
  const getMoodColor = (mood: string | undefined): string => {
    if (!mood) return '#4B4E91'
    const moodData = MOOD_DATA.find(m => m.label.toLowerCase() === mood.toLowerCase())
    return moodData?.color || '#4B4E91'
  }

  const handleLogout = () => {
    logout()
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
    // Add to local state
    // Note: AI-generated diaries are automatically saved by the generateDiary API endpoint
    // Manual diaries are stored locally (backend POST /diaries endpoint would be needed for persistence)
    setDiaryEntries(prev => [newEntry, ...prev])
  }

  const refreshDiaries = () => {
    if (user?.user_id) {
      aiChatApi.getDiaries(user.user_id)
        .then((diaries: Diary[]) => {
          const entries: DiaryEntry[] = diaries.map(d => ({
            date: new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase(),
            mood: d.mood || 'Neutral',
            color: getMoodColor(d.mood),
            text: d.content
          }))
          setDiaryEntries(entries)
        })
        .catch(err => console.error('Failed to fetch diaries:', err))
    }
  }

  const refreshUserPosts = () => {
    if (user?.user_id) {
      postApi.getUserPosts(user.user_id)
        .then(response => {
          setUserPosts(response.posts)
        })
        .catch(err => console.error('Failed to fetch user posts:', err))
    }
  }

  const refreshPoints = () => {
    if (user?.user_id) {
      userApi.getPoints(user.user_id)
        .then(data => setPoints(data.points))
        .catch(err => console.error('Failed to fetch points:', err))
    }
  }

  const handleCheckIn = async (mood: string): Promise<boolean> => {
    if (!user?.user_id) return false
    try {
      const response = await userApi.checkIn(user.user_id, { mood })
      if (response.success) {
        setPoints(response.total_points)
        // Update todayCheckIn state
        const moodData = MOOD_DATA.find(m => m.label.toLowerCase() === mood.toLowerCase())
        if (moodData) {
          setTodayCheckIn({ mood: moodData.label, color: moodData.color, text: moodData.text })
        }
        return true
      }
      return false
    } catch (err) {
      console.error('Failed to check in:', err)
      return false
    }
  }

  const handleSelectAvatar = (avatar: Avatar3D) => {
    setSelectedAvatar(avatar)
    localStorage.setItem('selectedAvatar', JSON.stringify(avatar))
  }

  const handleCloseCompanion = () => {
    setSelectedAvatar(null)
    localStorage.removeItem('selectedAvatar')
  }

  const handleOpenSettings = () => {
    setSettingsNickname(user?.nickname || user?.username || '')
    setSettingsPassword('')
    setSettingsAvatar(userAvatar)
    setShowSettings(true)
  }

  const handleSaveSettings = async () => {
    if (!user?.user_id) return
    setSettingsSaving(true)
    try {
      const updateData: { nickname?: string; password?: string; avatar?: string } = {}
      if (settingsNickname.trim() && settingsNickname !== user.nickname) {
        updateData.nickname = settingsNickname.trim()
      }
      if (settingsPassword.trim()) {
        updateData.password = settingsPassword.trim()
      }
      if (settingsAvatar !== userAvatar) {
        updateData.avatar = settingsAvatar
      }
      if (Object.keys(updateData).length > 0) {
        await userApi.updateUser(user.user_id, updateData)
        // Update local avatar state immediately without page reload
        if (updateData.avatar) {
          setUserAvatar(updateData.avatar)
        }
        setShowSettings(false)
        // Only reload if nickname or password changed (to update auth context)
        if (updateData.nickname || updateData.password) {
          window.location.reload()
        }
      } else {
        // No changes made, just close the modal
        setShowSettings(false)
      }
    } catch (err) {
      console.error('Failed to update user:', err)
      alert('Failed to update settings')
    } finally {
      setSettingsSaving(false)
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileView
          points={points}
          level={level}
          avatar={userAvatar}
          onCheckIn={handleCheckIn}
          onThemeChange={setCurrentTheme}
          currentTheme={currentTheme}
          onOpenAvatarGallery={() => setShowAvatarGallery(true)}
          selectedAvatar={selectedAvatar}
          user={user}
          socialStats={socialStats}
          diaryEntries={diaryEntries}
          userPosts={userPosts}
          onOpenJournalDetail={setSelectedJournalModal}
          onOpenPostDetail={setSelectedPostModal}
          todayCheckIn={todayCheckIn}
          onOpenSettings={handleOpenSettings}
        />
      case 'diary':
        return <DiaryView onInteract={triggerCheckIn} entries={diaryEntries} onAddEntry={addDiaryEntry} userId={user?.user_id} onRefreshDiaries={refreshDiaries} onOpenEntryDetail={setSelectedJournalModal} />
      case 'community':
        return <CommunityView onInteract={triggerCheckIn} userId={user?.user_id} userNickname={user?.nickname || user?.username} onPostCreated={refreshUserPosts} onPointsChanged={refreshPoints} />
      case 'soulsync':
        return <SoulSyncView onInteract={triggerCheckIn} userId={user?.user_id} />
      default:
        return <PlaceholderView title={activeTab} />
    }
  }

  return (
    <div className="flex h-screen bg-[#FAFAFA] text-[#121212] overflow-hidden">
      <aside className="fixed left-0 top-0 h-screen w-20 md:w-24 bg-white border-r border-black/[0.03] flex flex-col items-center py-12 z-50 shadow-sm">
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

      <main className="flex-1 overflow-y-auto scrollbar-hide perspective-container ml-20 md:ml-24">
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

      {/* Journal Detail Modal */}
      {selectedJournalModal && (() => {
        const txtColor = selectedJournalModal.mood === 'Joy' ? '#121212' : '#ffffff'
        return (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)'
            }}
            onClick={() => setSelectedJournalModal(null)}
          >
            <div
              className="w-full max-w-2xl max-h-[85vh] rounded-[3rem] p-10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20"
              style={{ backgroundColor: selectedJournalModal.color }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-8">
                <div className="space-y-3">
                  <span className="text-[12px] font-black uppercase tracking-widest opacity-70" style={{ color: txtColor }}>
                    {selectedJournalModal.date}
                  </span>
                  <div className="inline-block px-5 py-2 rounded-full border border-white/30 text-[13px] font-black uppercase tracking-widest backdrop-blur-sm" style={{ color: txtColor, backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    {selectedJournalModal.mood}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedJournalModal(null)}
                  className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 hover:scale-110 active:scale-95 transition-all"
                  style={{ color: txtColor }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto max-h-[55vh] pr-4 scrollbar-hide" style={{ color: txtColor }}>
                <p className="text-lg font-bold leading-relaxed whitespace-pre-wrap">{selectedJournalModal.text}</p>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Post Detail Modal */}
      {selectedPostModal && (() => {
        const postMood = selectedPostModal.emotion || selectedPostModal.ai_emotion || 'Neutral'
        const moodData = MOOD_DATA.find(m => m.label.toLowerCase() === postMood.toLowerCase())
        const bgColor = moodData?.color || '#4B4E91'
        const txtColor = postMood === 'Joy' ? '#121212' : '#ffffff'
        return (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)'
            }}
            onClick={() => setSelectedPostModal(null)}
          >
            <div
              className="w-full max-w-2xl max-h-[85vh] rounded-[3rem] p-10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20"
              style={{ backgroundColor: bgColor }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-8">
                <div className="space-y-3">
                  <span className="text-[12px] font-black uppercase tracking-widest opacity-70" style={{ color: txtColor }}>
                    {new Date(selectedPostModal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <div className="inline-block px-5 py-2 rounded-full border border-white/30 text-[13px] font-black uppercase tracking-widest backdrop-blur-sm" style={{ color: txtColor, backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    {postMood}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPostModal(null)}
                  className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 hover:scale-110 active:scale-95 transition-all"
                  style={{ color: txtColor }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto max-h-[45vh] pr-4 scrollbar-hide mb-6" style={{ color: txtColor }}>
                <p className="text-lg font-bold leading-relaxed whitespace-pre-wrap">{selectedPostModal.content}</p>
              </div>
              {selectedPostModal.tags && selectedPostModal.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedPostModal.tags.map((tag: string, i: number) => (
                    <span key={i} className="px-3 py-1.5 rounded-full border border-white/20 text-xs font-bold backdrop-blur-sm" style={{ color: txtColor, backgroundColor: 'rgba(255,255,255,0.1)' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center space-x-6 pt-4 border-t border-white/20">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">❤️</span>
                  <span className="text-sm font-black" style={{ color: txtColor }}>{selectedPostModal.like_count}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">💬</span>
                  <span className="text-sm font-black" style={{ color: txtColor }}>{selectedPostModal.comment_count}</span>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)'
          }}
          onClick={() => setShowSettings(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] animate-in zoom-in-95 duration-500"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black tracking-tight">Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Nickname */}
              <div className="space-y-2">
                <label className="text-[12px] font-black uppercase tracking-widest text-gray-400">
                  Display Name
                </label>
                <input
                  type="text"
                  value={settingsNickname}
                  onChange={(e) => setSettingsNickname(e.target.value)}
                  placeholder="Enter your display name"
                  className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-black/5 focus:outline-none focus:ring-2 focus:ring-accent text-sm font-bold placeholder:text-gray-300"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-[12px] font-black uppercase tracking-widest text-gray-400">
                  New Password
                </label>
                <input
                  type="password"
                  value={settingsPassword}
                  onChange={(e) => setSettingsPassword(e.target.value)}
                  placeholder="Leave empty to keep current"
                  className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-black/5 focus:outline-none focus:ring-2 focus:ring-accent text-sm font-bold placeholder:text-gray-300"
                />
              </div>

              {/* Avatar Selection */}
              <div className="space-y-2">
                <label className="text-[12px] font-black uppercase tracking-widest text-gray-400">
                  Avatar
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSettingsAvatar(emoji)}
                      className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all ${
                        settingsAvatar === emoji
                          ? 'bg-accent scale-110 shadow-lg'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* User Info Display */}
              <div className="p-4 bg-gray-50 rounded-2xl space-y-2">
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-300">Account Info</p>
                <p className="text-sm font-bold text-gray-600">Username: {user?.username}</p>
                <p className="text-sm font-bold text-gray-600">Level: {level}</p>
                <p className="text-sm font-bold text-gray-600">Energy: {points.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-[13px] uppercase tracking-widest hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={settingsSaving}
                className="flex-1 py-4 bg-accent text-accent-inverse rounded-2xl font-black text-[13px] uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50"
              >
                {settingsSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
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
