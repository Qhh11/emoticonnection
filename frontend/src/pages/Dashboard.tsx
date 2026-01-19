import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AvatarGallery from '../components/dashboard/AvatarGallery'
import AvatarCompanion from '../components/dashboard/AvatarCompanion'
import UserProfileModal from '../components/UserProfileModal'
import FollowListModal from '../components/FollowListModal'
import EmotionReportModal, { markUserActivity, getCachedReport, setCachedReport } from '../components/EmotionReportModal'
import ConfirmModal from '../components/ConfirmModal'
import { Avatar3D, AVATARS_3D } from '../config/avatars'
import { USER_AVATARS, DEFAULT_AVATAR, getAvatarUrl } from '../config/userAvatars'
import CommunityView from './community/CommunityView'
import PostDetailModal from './community/components/PostDetailModal'
import DiaryView, { DiaryEntry } from './diary/DiaryView'
import SoulSyncView, { PeerSession } from './soulsync/SoulSyncView'
import ProfileView, { Theme, THEMES } from './profile/ProfileView'
import { useAuth } from '../contexts/AuthContext'
import { userApi, aiChatApi, postApi, SocialStats, Diary, Post, User, EmotionReport, MBTIProfile, UserPreferences } from '../services/api'

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
  const { user: AuthUser, logout } = useAuth()
  const [user, setUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [points, setPoints] = useState(0)
  const [level, setLevel] = useState(1)
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([])
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('currentTheme')
    if (saved) {
      const parsed = JSON.parse(saved)
      // 找到匹配的主题，确保引用完整的 Theme 对象
      const found = THEMES.find(t => t.name === parsed.name)
      return found || THEMES[THEMES.length - 1]
    }
    return THEMES[THEMES.length - 1]
  })
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([])
  const [userPosts, setUserPosts] = useState<Post[]>([])

  // Social stats from API
  const [socialStats, setSocialStats] = useState<SocialStats | null>(null)

  // Avatar gallery state
  const [showAvatarGallery, setShowAvatarGallery] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar3D | null>(() => {
    const saved = localStorage.getItem('selectedAvatar')
    if (saved) {
      try {
        const savedAvatar = JSON.parse(saved)
        // Find the latest version of this avatar from config to get updated properties (like videoPath)
        const latestAvatar = AVATARS_3D.find(a => a.id === savedAvatar.id)
        return latestAvatar || AVATARS_3D[0]
      } catch (e) {
        return AVATARS_3D[0]
      }
    }
    return AVATARS_3D[0]
  })

  // Modal states for journal/post detail
  const [selectedJournalModal, setSelectedJournalModal] = useState<DiaryEntry | null>(null)
  const [selectedPostModal, setSelectedPostModal] = useState<Post | null>(null)

  // Delete confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'post' | 'journal'
    id: string
  } | null>(null)

  // Today's check-in status
  const [todayCheckIn, setTodayCheckIn] = useState<{ mood: string; color: string; text: string } | null>(null)

  // Settings modal state
  const [showSettings, setShowSettings] = useState(false)

  const [settingsNickname, setSettingsNickname] = useState('')
  const [settingsPassword, setSettingsPassword] = useState('')
  const [settingsEmail, setSettingsEmail] = useState('')
  const [settingsBio, setSettingsBio] = useState('')
  const [settingsAvatar, setSettingsAvatar] = useState(DEFAULT_AVATAR)
  const [settingsAge, setSettingsAge] = useState<number>()
  const [settingsGender, setSettingsGender] = useState('')
  const [settingsMbti, setSettingsMbti] = useState<MBTIProfile>()
  const [settingsPreferences, setSettingsPreferences] = useState<UserPreferences>()
  const [settingsSaving, setSettingsSaving] = useState(false)

  // User avatar state
  const [userAvatar, setUserAvatar] = useState(DEFAULT_AVATAR)

  // User profile modal state (for viewing other users)
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)

  // Follow list modal state
  const [followListType, setFollowListType] = useState<'following' | 'followers' | null>(null)

  // Assistant Bubble state (triggered by Avatar click)
  const [showAssistantBubble, setShowAssistantBubble] = useState(false)

  // Track if user is in a peer chat session (for VIP hint display)
  const [hasActiveSession, setHasActiveSession] = useState(false)

  // Track proactive hint from SoulSync (user typing pause)
  const [showProactiveHint, setShowProactiveHint] = useState(false)

  // Partner's last message for AssistantBubble response suggestions
  const [partnerLastMessage, setPartnerLastMessage] = useState('')

  // Active chat session for AssistantBubble context
  const [activeSession, setActiveSession] = useState<PeerSession | null>(null)

  // Text to inject into SoulSync chat input (from AssistantBubble)
  const [chatInputFromBubble, setChatInputFromBubble] = useState<string | null>(null)

  // Assistant action state (for opening AssistantBubble with specific action from chat toolbar)
  const [assistantAction, setAssistantAction] = useState<{
    action: 'rewrite' | 'response' | 'topic' | null
    inputText?: string
  }>({ action: null })

  // Emotion Report Modal state
  const [showEmotionReport, setShowEmotionReport] = useState(false)

  // Weekly emotion report for Profile card preview
  const [weeklyReport, setWeeklyReport] = useState<EmotionReport | null>(null)

  // Load user data from AuthUser on mount or when AuthUser changes
  useEffect(() => {
    if (AuthUser?.user_id) {
      userApi.getUser(AuthUser.user_id).then(userData => { setUser(userData) })
    }
  }, [AuthUser?.user_id])

  // Sync userAvatar when user data changes
  useEffect(() => {
    if (user?.avatar) {
      setUserAvatar(user.avatar)
    }
  }, [user?.avatar, AuthUser?.user_id])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--accent-color', currentTheme.color)
    root.style.setProperty('--accent-soft', currentTheme.soft)
    root.style.setProperty('--accent-text', currentTheme.text)
    // 保存主题到 localStorage
    localStorage.setItem('currentTheme', JSON.stringify(currentTheme))
  }, [currentTheme])

  // Close AssistantBubble when switching away from soulsync tab
  useEffect(() => {
    if (activeTab !== 'soulsync') {
      setShowAssistantBubble(false)
      setAssistantAction({ action: null })
    }
  }, [activeTab])

  // 刷新社交统计的函数
  const refreshSocialStats = () => {
    if (user?._id) {
      userApi.getSocialStats(user._id)
        .then(stats => setSocialStats(stats))
        .catch(err => console.error('Failed to fetch social stats:', err))
    }
  }

  // Fetch social stats, points, and diaries when user is available
  useEffect(() => {
    if (user?._id) {
      // 加载社交统计
      userApi.getSocialStats(user._id)
        .then(stats => setSocialStats(stats))
        .catch(err => console.error('Failed to fetch social stats:', err))

      // 加载积分和等级
      userApi.getPoints(user._id)
        .then(data => {
          setPoints(data.points)
          setLevel(data.level)
        })
        .catch(err => console.error('Failed to fetch points:', err))

      // 加载日记
      aiChatApi.getDiaries(user._id)
        .then((diaries: Diary[]) => {
          const entries: DiaryEntry[] = diaries.map(d => ({
            id: d.id,
            date: new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase(),
            title: d.title || `Journal - ${new Date(d.created_at).toLocaleDateString()}`,
            mood: d.mood || 'Neutral',
            color: getMoodColor(d.mood),
            text: d.content
          }))
          setDiaryEntries(entries)
        })
        .catch(err => console.error('Failed to fetch diaries:', err))

      // 加载用户帖子（包括匿名帖子，因为是自己查看自己）
      postApi.getUserPosts(user._id, { include_anonymous: true })
        .then(response => {
          setUserPosts(response.posts)
        })
        .catch(err => console.error('Failed to fetch user posts:', err))

      // 加载今日签到状态
      userApi.getTodayCheckIn(user._id)
        .then(response => {
          if (response.checked_in && response.check_in) {
            const moodData = MOOD_DATA.find(m => m.label.toLowerCase() === response.check_in!.mood.toLowerCase())
            if (moodData) {
              setTodayCheckIn({ mood: moodData.label, color: moodData.color, text: moodData.text })
            }
          }
        })
        .catch(err => console.error('Failed to fetch check-in status:', err))

      // 加载周报 - 使用缓存机制避免重复调用
      const cachedReport = getCachedReport(user._id, 'weekly')
      if (cachedReport) {
        // 有效缓存，秒开
        setWeeklyReport(cachedReport)
      } else {
        // 无缓存，后台异步加载（不阻塞UI）
        aiChatApi.getWeeklyReport(user._id)
          .then(rawData => {
            const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData
            setWeeklyReport(data)
            setCachedReport(user._id, 'weekly', data)
          })
          .catch(err => console.error('Failed to fetch weekly report:', err))
      }
    }
  }, [user?._id])

  // Prevent background scroll when settings modal is open
  useEffect(() => {
    if (showSettings) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showSettings])

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

  const addDiaryEntry = async (entry: { title: string, mood: string, color: string, text: string }) => {
    const newEntry = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase(),
      ...entry
    }

    // Save to backend if user is logged in
    if (user?._id) {
      try {
        await aiChatApi.createDiary({
          user_id: user._id,
          title: entry.title,
          content: entry.text,
          mood: entry.mood
        })
        // 标记用户活动，用于 Report 缓存判断
        markUserActivity(user._id)
        // Refresh diaries from backend to get the saved entry with ID
        refreshDiaries()
      } catch (err) {
        console.error('Failed to save diary:', err)
        // Fall back to local state if save fails
        setDiaryEntries(prev => [newEntry as DiaryEntry, ...prev])
      }
    } else {
      // No user logged in, only store locally (will be lost on refresh)
      setDiaryEntries(prev => [newEntry as DiaryEntry, ...prev])
    }
  }

  const aiAddDiaryEntry = async (content: string) => {
    if (user?._id) {
      try {
        await aiChatApi.aiSaveDiary(user._id, content)
        // 标记用户活动，用于 Report 缓存判断
        markUserActivity(user._id)
        refreshDiaries()
      } catch (err) {
        console.error('Failed to AI-save diary:', err)
        // Fallback to manual save if AI fails
        addDiaryEntry({
          title: `Journal - ${new Date().toLocaleDateString()}`,
          mood: 'Neutral',
          color: '#121212',
          text: content
        })
      }
    }
  }

  const refreshDiaries = () => {
    if (user?._id) {
      aiChatApi.getDiaries(user._id)
        .then((diaries: Diary[]) => {
          const entries: DiaryEntry[] = diaries.map(d => ({
            id: d.id,
            date: new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase(),
            title: d.title || `Journal - ${new Date(d.created_at).toLocaleDateString()}`,
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
    if (user?._id) {
      postApi.getUserPosts(user._id, { include_anonymous: true })
        .then(response => {
          setUserPosts(response.posts)
        })
        .catch(err => console.error('Failed to fetch user posts:', err))
    }
  }

  const refreshPoints = () => {
    if (user?._id) {
      userApi.getPoints(user._id)
        .then(data => setPoints(data.points))
        .catch(err => console.error('Failed to fetch points:', err))
    }
  }

  const handleCheckIn = async (mood: string): Promise<boolean> => {
    if (!user?._id) return false
    try {
      const response = await userApi.checkIn(user._id, { mood })
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

  // Handle Avatar click based on current tab - toggle bubble
  const handleAvatarClick = () => {
    if (activeTab === 'soulsync' && hasActiveSession) {
      setShowAssistantBubble(prev => !prev)
    }
  }

  // Handle opening AssistantBubble with specific action (from chat toolbar buttons)
  const handleOpenAssistantWithAction = (action: 'rewrite' | 'response' | 'topic', inputText?: string) => {
    setAssistantAction({ action, inputText })
    setShowAssistantBubble(true)
  }

  const handleOpenSettings = () => {
    console.log('Opening settings for user:', user)

    setSettingsNickname(user?.nickname || user?.username || '')
    setSettingsPassword('')
    setSettingsEmail(user?.email || '')
    setSettingsBio(user?.bio || '')
    setSettingsAvatar(userAvatar)
    setSettingsAge(user?.age)
    setSettingsGender(user?.gender || '')
    setSettingsMbti(user?.mbti)
    setSettingsPreferences(user?.preferences)
    setShowSettings(true)
  }

  const handleSaveSettings = async () => {
    if (!user?._id) return
    setSettingsSaving(true)
    try {
      const updateData: { nickname?: string; password?: string; email?: string; bio?: string; avatar?: string; age?: number; gender?: string; mbti?: MBTIProfile, preferences?: UserPreferences } = {}
      if (settingsNickname.trim() && settingsNickname !== user.nickname) {
        updateData.nickname = settingsNickname.trim()
      }
      if (settingsPassword.trim()) {
        updateData.password = settingsPassword.trim()
      }
      if (settingsEmail.trim() && settingsEmail !== user.email) {
        updateData.email = settingsEmail.trim()
      }
      if (settingsBio !== user.bio) {
        updateData.bio = settingsBio.trim()
      }
      if (settingsAvatar !== userAvatar) {
        updateData.avatar = settingsAvatar
      }
      if (settingsAge !== user?.age) {
        updateData.age = settingsAge
      }
      if (settingsGender !== user?.gender) {
        updateData.gender = settingsGender
      }
      if (settingsMbti !== user?.mbti) {
        updateData.mbti = settingsMbti
      }
      if (settingsPreferences !== user?.preferences) {
        updateData.preferences = settingsPreferences
      }
      if (Object.keys(updateData).length > 0) {
        await userApi.updateUser(user._id, updateData)
        userApi.getUser(user._id).then(user => { setUser(user) })
        console.log('User updated successfully:', user)
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
          onViewFollowing={() => setFollowListType('following')}
          onViewFollowers={() => setFollowListType('followers')}
          onOpenEmotionReport={() => setShowEmotionReport(true)}
          weeklyReport={weeklyReport}
        />
      case 'diary':
        return (
          <DiaryView
            onInteract={triggerCheckIn}
            entries={diaryEntries}
            onAddEntry={addDiaryEntry}
            onAISaveEntry={aiAddDiaryEntry}
            userId={user?._id}
            onRefreshDiaries={refreshDiaries}
            onOpenEntryDetail={setSelectedJournalModal}
            avatar={selectedAvatar}
          />
        )
      case 'community':
        return <CommunityView onInteract={triggerCheckIn} userId={user?._id} userNickname={user?.nickname || user?.username} onPostCreated={refreshUserPosts} onPointsChanged={refreshPoints} onViewProfile={setViewingUserId} />
      case 'soulsync':
        return (
          <SoulSyncView
            onInteract={triggerCheckIn}
            userId={user?._id}
            userAvatar={user?.avatar}
            onViewProfile={setViewingUserId}
            avatar={selectedAvatar}
            userLevel={level}
            onSessionChange={setHasActiveSession}
            onProactiveHintChange={setShowProactiveHint}
            onPartnerMessageChange={setPartnerLastMessage}
            onSessionUpdate={(session) => setActiveSession(session)}
            externalChatInput={chatInputFromBubble}
            onExternalChatInputConsumed={() => setChatInputFromBubble(null)}
            onOpenAssistantWithAction={handleOpenAssistantWithAction}
          />
        )
      default:
        return <PlaceholderView title={activeTab} />
    }
  }

  return (
    <div className="flex h-screen bg-[#FAFAFA] text-[#121212] overflow-hidden">
      <aside className="fixed left-0 top-0 h-screen w-20 md:w-24 bg-white border-r border-black/[0.03] flex flex-col items-center py-12 z-50 shadow-sm">
        <nav className="flex-1 flex flex-col space-y-10 mt-4">
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
        userLevel={level}
      />

      {/* Avatar Companion - Floating on dashboard (hidden on diary page since Avatar is embedded in chat) */}
      {selectedAvatar && activeTab !== 'diary' && (
        <AvatarCompanion
          avatar={selectedAvatar}
          onClose={handleCloseCompanion}
          activeTab={activeTab}
          onClick={handleAvatarClick}
          showVipHint={activeTab === 'soulsync' && hasActiveSession && !showAssistantBubble}
          showProactiveHint={activeTab === 'soulsync' && showProactiveHint && !showAssistantBubble}
          showAssistantBubble={showAssistantBubble}
          onCloseBubble={() => {
            setShowAssistantBubble(false)
            setAssistantAction({ action: null })
          }}
          onSelectText={(text) => {
            setChatInputFromBubble(text)
            setShowAssistantBubble(false)
            setAssistantAction({ action: null })
          }}
          partnerLastMessage={partnerLastMessage}
          chatHistory={activeSession?.messages}
          initialAction={assistantAction.action}
          initialInputText={assistantAction.inputText}
          onActionConsumed={() => setAssistantAction({ action: null })}
        />
      )}

      {/* Emotion Report Modal */}
      {user?._id && (
        <EmotionReportModal
          isOpen={showEmotionReport}
          onClose={() => setShowEmotionReport(false)}
          userId={user._id}
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
                  <h3 className="text-3xl font-black tracking-tight" style={{ color: txtColor }}>
                    {selectedJournalModal.title}
                  </h3>
                  <div className="inline-block px-5 py-2 rounded-full border border-white/30 text-[13px] font-black uppercase tracking-widest backdrop-blur-sm" style={{ color: txtColor, backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    {selectedJournalModal.mood}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Delete button */}
                  {selectedJournalModal.id && (
                    <button
                      onClick={() => setDeleteConfirm({ type: 'journal', id: selectedJournalModal.id! })}
                      className="px-4 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 text-white text-[11px] font-bold uppercase tracking-wider transition-all"
                    >
                      Delete
                    </button>
                  )}
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
              </div>
              <div className="overflow-y-auto max-h-[55vh] pr-4 scrollbar-hide" style={{ color: txtColor }}>
                <p className="text-lg font-bold leading-relaxed whitespace-pre-wrap">{selectedJournalModal.text}</p>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Post Detail Modal - 使用与 Community 相同的组件 */}
      <PostDetailModal
        post={selectedPostModal}
        isOpen={!!selectedPostModal}
        onClose={() => setSelectedPostModal(null)}
        onLike={(postId) => {
          setUserPosts(prev => prev.map(p =>
            p.id === postId ? { ...p, is_liked: !p.is_liked, like_count: p.is_liked ? p.like_count - 1 : p.like_count + 1 } : p
          ))
        }}
        userId={user?._id}
        onViewProfile={(userId) => setViewingUserId(userId)}
        onPointsChanged={refreshPoints}
        onDelete={(postId) => setDeleteConfirm({ type: 'post', id: postId })}
      />

      {/* User Profile Modal (for viewing other users) */}
      {viewingUserId && (
        <UserProfileModal
          userId={viewingUserId}
          currentUserId={user?._id || ''}
          isOpen={!!viewingUserId}
          onClose={() => setViewingUserId(null)}
        />
      )}

      {/* Follow List Modal */}
      {followListType && user?._id && (
        <FollowListModal
          userId={user._id}
          currentUserId={user._id}
          type={followListType}
          isOpen={!!followListType}
          onClose={() => setFollowListType(null)}
          onViewProfile={(userId) => {
            setFollowListType(null)
            setViewingUserId(userId)
          }}
          onStatsChange={refreshSocialStats}
        />
      )}

      {/* Settings Modal - 横向两栏布局 */}
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
            className="w-full max-w-4xl bg-white rounded-[2.5rem] p-8 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] animate-in zoom-in-95 duration-500"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
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

            {/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-8">
              {/* Left Column - Account Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-300 mb-4">Account</h4>

                {/* Username (read-only) */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-black uppercase tracking-widest text-gray-400">
                    Username
                  </label>
                  <input
                    type="text"
                    value={user?.username || ''}
                    readOnly
                    className="w-full px-4 py-3 bg-gray-100 rounded-xl border border-black/5 text-sm font-bold text-gray-500 cursor-not-allowed"
                  />
                </div>

                {/* Nickname */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-black uppercase tracking-widest text-gray-400">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={settingsNickname}
                    onChange={(e) => setSettingsNickname(e.target.value)}
                    placeholder="Enter your display name"
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-black/5 focus:outline-none focus:ring-2 focus:ring-accent text-sm font-bold placeholder:text-gray-300"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-black uppercase tracking-widest text-gray-400">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={settingsPassword}
                    onChange={(e) => setSettingsPassword(e.target.value)}
                    placeholder="Leave empty to keep current"
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-black/5 focus:outline-none focus:ring-2 focus:ring-accent text-sm font-bold placeholder:text-gray-300"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-black uppercase tracking-widest text-gray-400">
                    Email
                  </label>
                  <input
                    type="email"
                    value={settingsEmail}
                    onChange={(e) => setSettingsEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-black/5 focus:outline-none focus:ring-2 focus:ring-accent text-sm font-bold placeholder:text-gray-300"
                  />
                </div>

                {/* Avatar Selection - Grid layout */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-black uppercase tracking-widest text-gray-400">
                    Avatar
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {USER_AVATARS.map(avatarId => (
                      <button
                        key={avatarId}
                        type="button"
                        onClick={() => setSettingsAvatar(avatarId)}
                        className={`w-10 h-10 rounded-xl overflow-hidden transition-all duration-200 ${settingsAvatar === avatarId
                          ? 'ring-2 ring-accent scale-110 shadow-lg'
                          : 'bg-gray-100 hover:scale-150 hover:z-10 hover:shadow-xl'
                          }`}
                      >
                        <img src={getAvatarUrl(avatarId)} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Profile Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-300 mb-4">Profile</h4>

                {/* Age & Gender Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-black uppercase tracking-widest text-gray-400">
                      Age
                    </label>
                    <input
                      type="number"
                      value={settingsAge || ''}
                      onChange={(e) => setSettingsAge(Number(e.target.value))}
                      placeholder="Age"
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-black/5 focus:outline-none focus:ring-2 focus:ring-accent text-sm font-bold placeholder:text-gray-300"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-black uppercase tracking-widest text-gray-400">
                      Gender
                    </label>
                    <select
                      value={settingsGender || ''}
                      onChange={(e) => setSettingsGender(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-black/5 focus:outline-none focus:ring-2 focus:ring-accent text-sm font-bold"
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="non-binary">Non-Binary</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Bio - Larger textarea */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-black uppercase tracking-widest text-gray-400">
                    Bio
                  </label>
                  <textarea
                    value={settingsBio}
                    onChange={(e) => setSettingsBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-black/5 focus:outline-none focus:ring-2 focus:ring-accent text-sm font-bold placeholder:text-gray-300 resize-none h-28"
                  />
                </div>

                {/* MBTI */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-black uppercase tracking-widest text-gray-400">
                    MBTI Type
                  </label>
                  <select
                    value={settingsMbti?.type || ''}
                    onChange={(e) => setSettingsMbti({ type: e.target.value, completed_at: new Date().toISOString() })}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-black/5 focus:outline-none focus:ring-2 focus:ring-accent text-sm font-bold"
                  >
                    <option value="">Unknown</option>
                    {[
                      'INFP', 'INFJ', 'INTP', 'INTJ', 'ENFP', 'ENFJ', 'ENTP', 'ENTJ',
                      'ISFP', 'ISFJ', 'ISTP', 'ISTJ', 'ESFP', 'ESFJ', 'ESTP', 'ESTJ'
                    ].map(t => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Preferences Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-black uppercase tracking-widest text-gray-400">
                      Chat Duration
                    </label>
                    <select
                      value={settingsPreferences?.chat_duration_preference || 'medium'}
                      onChange={(e) => setSettingsPreferences({ ...settingsPreferences, chat_duration_preference: e.target.value as 'short' | 'medium' | 'long' })}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-black/5 focus:outline-none focus:ring-2 focus:ring-accent text-sm font-bold"
                    >
                      <option value="short">Short</option>
                      <option value="medium">Medium</option>
                      <option value="long">Long</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-black uppercase tracking-widest text-gray-400">
                      Theme
                    </label>
                    <select
                      value={settingsPreferences?.theme || 'default'}
                      onChange={(e) => setSettingsPreferences({ ...settingsPreferences, theme: e.target.value as 'light' | 'dark' | 'system' })}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-black/5 focus:outline-none focus:ring-2 focus:ring-accent text-sm font-bold"
                    >
                      <option value="default">Default</option>
                      <option value="dark">Dark</option>
                      <option value="soft">Soft</option>
                    </select>
                  </div>
                </div>

                {/* Notifications Toggle */}
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer select-none">
                  <span className="text-sm font-bold text-gray-600">Notifications</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={settingsPreferences?.notification_enabled}
                      onChange={(e) => setSettingsPreferences({ ...settingsPreferences, notification_enabled: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${settingsPreferences?.notification_enabled ? 'bg-accent' : 'bg-gray-300'}`} />
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settingsPreferences?.notification_enabled ? 'translate-x-5' : ''}`} />
                  </div>
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-xl font-black text-[13px] uppercase tracking-widest hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={settingsSaving}
                className="flex-1 py-3.5 bg-accent text-accent-inverse rounded-xl font-black text-[13px] uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50"
              >
                {settingsSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        title={deleteConfirm?.type === 'post' ? 'Delete Post' : 'Delete Journal'}
        message={deleteConfirm?.type === 'post'
          ? 'Are you sure you want to delete this post? This action cannot be undone.'
          : 'Are you sure you want to delete this journal entry? This action cannot be undone.'}
        confirmText="Delete"
        cancelText="Cancel"
        danger
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (!deleteConfirm || !user?._id) return
          try {
            if (deleteConfirm.type === 'post') {
              await postApi.deletePost(deleteConfirm.id, user._id)
              setUserPosts(prev => prev.filter(p => p.id !== deleteConfirm.id))
              setSelectedPostModal(null)
            } else {
              await aiChatApi.deleteDiary(deleteConfirm.id, user._id)
              setDiaryEntries(prev => prev.filter(d => d.id !== deleteConfirm.id))
              setSelectedJournalModal(null)
            }
          } catch (err) {
            console.error(`Failed to delete ${deleteConfirm.type}:`, err)
          }
          setDeleteConfirm(null)
        }}
      />
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
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
}

function DiaryIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" /><path d="M8 7h6" /><path d="M8 11h8" /></svg>
}

function ChatIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
}



function CommunityIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z" /><circle cx="12" cy="12" r="3" /><path d="M12 2L12 12" /></svg>
}

function LogoutIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
}
