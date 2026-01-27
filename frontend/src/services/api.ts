// API 服务层 - 统一管理所有后端 API 调用

//const BASE_URL = 'http://localhost:8000'
const BASE_URL = "https://emoticonnection-backend.onrender.com"

/**
 * 获取用户本地时区的"昨天"日期（YYYY-MM-DD 格式）
 * 用于 emotion report API，确保查询的是用户实际的昨天
 */
const getLocalYesterday = (): string => {
  const now = new Date()
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
}

// Token 管理
export const getToken = (): string | null => {
  return sessionStorage.getItem('access_token')
}

export const setToken = (token: string): void => {
  sessionStorage.setItem('access_token', token)
}

export const removeToken = (): void => {
  sessionStorage.removeItem('access_token')
}

// 通用请求函数
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

// ============ 认证 API ============

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  success: boolean
  message: string
  user_id: string
  username: string
  nickname: string
  access_token: string
  token_type: string
}

export interface RegisterRequest {
  username: string
  password: string
  email: string
  nickname: string
}

export const authApi = {
  login: (data: LoginRequest) =>
    request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  register: (data: RegisterRequest) =>
    request<LoginResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getUsers: () =>
    request<Array<{ id: string; nickname: string; username: string }>>('/api/auth/users'),
}

// ============ 用户 API ============
export type MBTIProfile = {
  type: string
  completed_at?: string
}

export type UserPreferences = {
  chat_duration_preference?: 'short' | 'medium' | 'long'
  age_range_min?: number
  age_range_max?: number
  notification_enabled?: boolean
  theme?: string
}

export interface User {
  _id: string
  username: string
  nickname: string
  email?: string
  bio?: string
  avatar?: string
  created_at?: string
  age?: number
  gender?: string
  mbti?: MBTIProfile
  preferences: UserPreferences
  level: number
  points: number
  last_login?: string
}

export interface UpdateUserRequest {
  nickname?: string
  password?: string
  email?: string
  bio?: string
  avatar?: string
  age?: number
  gender?: string
  mbti?: MBTIProfile
  preferences?: UserPreferences
}

export interface SocialStats {
  user_id: string
  following_count: number
  followers_count: number
}

export interface PointsResponse {
  points: number
  level: number
}

export interface CheckInRequest {
  mood: string
  date?: string
  // 情绪坐标轴相关字段
  coordinate_x?: number  // -1 (消极) 到 1 (积极)
  coordinate_y?: number  // -1 (低能量) 到 1 (高能量)
  color?: string         // 计算出的颜色HEX值
  emoji?: string         // 表情图标: 'angry' | 'happy' | 'sad' | 'calm'
}

export interface CheckInResponse {
  success: boolean
  message: string
  points: number
  total_points: number
}

export interface CheckInHistoryItem {
  date: string
  mood: string
  points_earned: number
  // 情绪坐标轴相关字段
  coordinate_x?: number
  coordinate_y?: number
  color?: string
  emoji?: string
}

export const userApi = {
  getUser: (userId: string) =>
    request<User>(`/api/users/${userId}`),

  updateUser: (userId: string, data: UpdateUserRequest) =>
    request<{ success: boolean }>(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getSocialStats: (userId: string) =>
    request<SocialStats>(`/api/social/stats/${userId}`),

  // Points/Energy API
  getPoints: (userId: string) =>
    request<PointsResponse>(`/api/users/${userId}/points`),

  checkIn: (userId: string, data: CheckInRequest) =>
    request<CheckInResponse>(`/api/users/${userId}/check-in`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCheckIn: (userId: string, data: CheckInRequest) =>
    request<CheckInResponse>(`/api/users/${userId}/check-in`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getCheckInHistory: (userId: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : ''
    return request<CheckInHistoryItem[]>(`/api/users/${userId}/check-in/history${query}`)
  },

  getTodayCheckIn: (userId: string) =>
    request<{ checked_in: boolean; check_in: CheckInHistoryItem | null; streak: number }>(`/api/users/${userId}/check-in/today`),
}

// ============ 帖子 API ============

export interface Post {
  id: string
  author_id: string
  author_name: string | null
  author_avatar: string | null
  title: string | null
  content: string
  post_type: 'text' | 'image' | 'video' | 'mixed'
  media_urls: string[] | null
  is_anonymous: boolean
  visibility: 'public' | 'friends' | 'anonymous'
  tags: string[]
  emotion: string | null
  emotion_color: string | null  // Custom emotion color
  ai_emotion: string | null
  like_count: number
  comment_count: number
  is_liked: boolean
  created_at: string
  updated_at: string | null
}

export interface PostsResponse {
  posts: Post[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

export interface CreatePostRequest {
  author_id: string
  title?: string
  content: string
  post_type?: string
  is_anonymous?: boolean
  tags?: string[]
  emotion?: string
  emotion_color?: string  // Custom emotion color
  media_urls?: string[]
  visibility?: string
}

export interface Comment {
  id: string
  post_id: string
  author_id: string
  author_name: string | null
  author_avatar: string | null
  content: string
  is_anonymous: boolean
  parent_id: string | null
  like_count: number
  reply_count: number
  created_at: string
}

export interface CommentsResponse {
  comments: Comment[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

export interface TrendingTag {
  tag: string
  post_count: number
  trending_score: number
}

export const postApi = {
  getPosts: (params?: { page?: number; page_size?: number; viewer_id?: string; tag?: string; emotion?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString())
    if (params?.viewer_id) searchParams.append('viewer_id', params.viewer_id)
    if (params?.tag) searchParams.append('tag', params.tag)
    if (params?.emotion) searchParams.append('emotion', params.emotion)
    const query = searchParams.toString()
    return request<PostsResponse>(`/api/posts${query ? `?${query}` : ''}`)
  },

  getFollowingPosts: (params: { user_id: string; page?: number; page_size?: number }) => {
    const searchParams = new URLSearchParams()
    searchParams.append('user_id', params.user_id)
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString())
    return request<PostsResponse>(`/api/posts/following?${searchParams.toString()}`)
  },

  getPost: (postId: string, viewerId?: string) => {
    const query = viewerId ? `?viewer_id=${viewerId}` : ''
    return request<Post>(`/api/posts/${postId}${query}`)
  },

  createPost: (data: CreatePostRequest) =>
    request<Post>('/api/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deletePost: (postId: string, userId: string) =>
    request<{ success: boolean; message: string }>(`/api/posts/${postId}?user_id=${userId}`, {
      method: 'DELETE',
    }),

  likePost: (postId: string, userId: string) =>
    request<{ success: boolean; action: string; new_like_count: number }>(`/api/posts/${postId}/like`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),

  unlikePost: (postId: string, userId: string) =>
    request<{ success: boolean; action: string; new_like_count: number }>(`/api/posts/${postId}/unlike`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),

  getComments: (postId: string, params?: { page?: number; page_size?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString())
    const query = searchParams.toString()
    return request<CommentsResponse>(`/api/posts/${postId}/comments${query ? `?${query}` : ''}`)
  },

  createComment: (postId: string, data: { author_id: string; content: string; is_anonymous?: boolean; parent_id?: string }) =>
    request<Comment>(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteComment: (commentId: string, userId: string) =>
    request<{ success: boolean; message: string }>(`/api/posts/comments/${commentId}?user_id=${userId}`, {
      method: 'DELETE',
    }),

  getTrendingTags: (limit?: number, days?: number) => {
    const searchParams = new URLSearchParams()
    if (limit) searchParams.append('limit', limit.toString())
    if (days) searchParams.append('days', days.toString())
    const query = searchParams.toString()
    return request<{ tags: TrendingTag[] }>(`/api/posts/tags/trending${query ? `?${query}` : ''}`)
  },

  getUserPosts: (userId: string, params?: { page?: number; include_anonymous?: boolean }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.include_anonymous) searchParams.append('include_anonymous', 'true')
    const query = searchParams.toString()
    return request<PostsResponse>(`/api/posts/user/${userId}${query ? `?${query}` : ''}`)
  },
}

// ============ 匹配 API ============

// Backend V2 Emotion Types
export type EmotionType =
  | 'happy' | 'excited' | 'grateful' | 'hopeful' | 'calm'  // Positive
  | 'warm' | 'friendly' | 'neutral' | 'curious'             // Neutral
  | 'sad' | 'anxious' | 'stressed' | 'lonely' | 'frustrated' | 'overwhelmed' | 'uncertain' | 'distant'  // Negative

export type SupportRole = 'seeker' | 'supporter' | 'either'
export type SupportNeed = 'vent' | 'advice' | 'companion' | 'distraction'
export type TopicTag = 'general' | 'relationships' | 'anxiety' | 'depression' | 'work_stress' | 'academic' | 'family' | 'loneliness' | 'self_esteem'
export type MatchMode = 'human_anonymous' | 'human_non_anonymous' | 'ai_chat'
export type RiskLevel = 'safe' | 'moderate' | 'high' | 'crisis'

export interface MatchRequest {
  current_emotion: EmotionType
  emotion_intensity?: number  // 1-5, default 3
  role?: SupportRole          // default 'either'
  support_need?: SupportNeed  // default 'vent'
  topic?: TopicTag            // default 'general'
  preferred_topics?: TopicTag[]
  mode?: MatchMode            // default 'human_anonymous'
  risk_level?: RiskLevel      // default 'safe'
}

export interface MatchResponse {
  matched: boolean
  room_id?: string
  matched_user_id?: string
  is_anonymous: boolean
  match_type: MatchMode
  match_score?: number
  match_reason?: string
  safety_tips?: string[]
  queue_position?: number
  estimated_wait?: string
}

export interface MatchStatus {
  matched: boolean
  in_queue?: boolean
  room_id?: string
  matched_user_id?: string
  is_anonymous?: boolean
  match_type?: MatchMode
  match_score?: number
  match_reason?: string
  mode?: string
  emotion?: string
  role?: string
  need?: string
  queued_at?: string
  queue_position?: number
  total_in_queue?: number
  estimated_wait?: string
}

export const matchApi = {
  // JWT auth - no user_id in query params
  findMatch: (data: MatchRequest) =>
    request<MatchResponse>('/api/match/find', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  ackMatch: (roomId: string) =>
    request<{ success: boolean; message?: string }>('/api/match/ack', {
      method: 'POST',
      body: JSON.stringify({ room_id: roomId }),
    }),


  cancelMatch: () =>
    request<{ success: boolean; message: string }>('/api/match/cancel', {
      method: 'POST',
    }),

  getStatus: () =>
    request<MatchStatus>('/api/match/status'),

  getEmotions: () =>
    request<{ emotions: Record<string, Array<{ value: string; label: string; emoji: string }>> }>('/api/match/emotions'),

  getRoles: () =>
    request<{ roles: Array<{ value: string; label: string; description: string; emoji: string }> }>('/api/match/roles'),

  getNeeds: () =>
    request<{ needs: Array<{ value: string; label: string; description: string; emoji: string }> }>('/api/match/needs'),

  getTopics: () =>
    request<{ topics: Array<{ value: string; label: string; emoji: string }> }>('/api/match/topics'),

  getStats: () =>
    request<{ total_in_queue: number; by_mode: Record<string, number>; by_role: Record<string, number>; by_emotion_category: Record<string, number> }>('/api/match/stats'),
}

// ============ 聊天 API ============

export interface ChatRoom {
  id: string
  user1_id: string
  user2_id: string
  is_anonymous?: boolean
  created_at?: string
}

// 双情绪分析结果
export interface EmotionAnalysis {
  primary_emotion: string
  primary_percentage: number  // 0.0-1.0
  primary_color: string       // hex color
  secondary_emotion: string
  secondary_percentage: number
  secondary_color: string
}

export interface ChatMessage {
  id: string
  room_id: string
  sender_id: string
  message_type: 'text' | 'emoji' | 'image' | 'video'
  content: string
  media_url?: string | null
  emotion?: string | null
  emotion_color?: string | null
  emotion_analysis?: EmotionAnalysis | null  // 新增：双情绪分析
  created_at: string
}

export interface UserRoom {
  room_id: string
  other_user_id: string
  other_user_name: string
  other_user_avatar?: string  // User's emoji avatar (e.g., 🦊)
  is_anonymous: boolean
  source?: string  // 'matching' or 'direct' - to distinguish room origin
  last_message?: string
  last_message_time?: string
}

export const chatApi = {
  createRoom: (user1Id: string, user2Id: string, isAnonymous?: boolean) =>
    request<ChatRoom>('/api/chat/rooms/extended', {
      method: 'POST',
      body: JSON.stringify({ user1_id: user1Id, user2_id: user2Id, is_anonymous: isAnonymous }),
    }),

  getRoom: (roomId: string) =>
    request<ChatRoom>(`/api/chat/rooms/${roomId}`),

  getRoomMessages: (roomId: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : ''
    return request<ChatMessage[]>(`/api/chat/rooms/${roomId}/messages${query}`)
  },

  sendMessage: (roomId: string, data: { sender_id: string; message_type: string; content: string; media_url?: string }) =>
    request<ChatMessage>(`/api/chat/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getUserRooms: (userId: string) =>
    request<UserRoom[]>(`/api/chat/users/${userId}/rooms`),

  revealIdentity: (roomId: string, userId: string) =>
    request<{ success: boolean; message: string }>(`/api/chat/rooms/${roomId}/reveal`, {
      method: 'POST',
      body: JSON.stringify({ room_id: roomId, user_id: userId }),
    }),

  getOnlineUsers: () =>
    request<string[]>('/api/chat/online-users'),
}

// ============ AI 聊天 API ============

export interface AIChatRequest {
  user_id: string
  session_id?: string
  message: string
  history?: Array<{ role: string; parts: string[] }>
  avatar_id?: string
}

export interface AIChatResponse {
  response: string
}

export interface AISession {
  id: string
  user_id: string
  created_at: string
  message_count?: number
}

export interface AIMessage {
  id: string
  session_id: string
  sender_id: string
  sender_type: 'user' | 'ai'
  content: string
  created_at: string
}

export interface Diary {
  id: string
  user_id: string
  session_id?: string
  title: string
  content: string
  mood: string
  color?: string  // Custom mood color (for custom emotions)
  created_at: string
}

export interface CreateDiaryRequest {
  user_id: string
  title: string
  content: string
  mood: string
  color?: string  // Custom mood color (for custom emotions)
  session_id?: string
}

export const aiChatApi = {
  chat: async (data: AIChatRequest): Promise<AIChatResponse> => {
    const formData = new FormData()
    formData.append('user_id', data.user_id)
    formData.append('message', data.message)
    if (data.session_id) {
      formData.append('session_id', data.session_id)
    }
    if (data.history) {
      formData.append('history', JSON.stringify(data.history))
    }
    if (data.avatar_id) {
      formData.append('avatar_id', data.avatar_id)
    }

    const token = getToken()
    const headers: HeadersInit = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${BASE_URL}/api/ai-chat/`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  },

  getSessions: (userId: string) =>
    request<AISession[]>(`/api/ai-chat/sessions?user_id=${userId}`),

  createSession: (userId: string) =>
    request<AISession>('/api/ai-chat/sessions', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, message: '', history: [] }),
    }),

  getSessionMessages: (sessionId: string) =>
    request<AIMessage[]>(`/api/ai-chat/sessions/${sessionId}/messages`),

  getSessionSummary: (sessionId: string) =>
    request<SessionSummary>(`/api/diary/summary/${sessionId}`),

  generateDiary: (sessionId: string, userId: string) =>
    request<Diary>('/api/diary/diaries/generate', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, user_id: userId }),
    }),

  getDiaries: (userId: string) =>
    request<Diary[]>(`/api/diary/diaries?user_id=${userId}`),

  getDiary: (diaryId: string) =>
    request<Diary>(`/api/diary/diaries/${diaryId}`),

  deleteDiary: (diaryId: string, userId: string) =>
    request<{ success: boolean }>(`/api/diary/diaries/${diaryId}?user_id=${userId}`, {
      method: 'DELETE',
    }),

  createDiary: (data: CreateDiaryRequest) =>
    request<Diary>('/api/diary/diaries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  aiSaveDiary: (userId: string, content: string) =>
    request<Diary>('/api/diary/diaries/ai-save', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, content }),
    }),

  // VIP Feature: Context-aware emotion analysis (placeholder for backend implementation)
  analyzeContextEmotion: (messages: { role: string; content: string; emotion?: string }[], userId: string) =>
    request<ContextEmotionAnalysis>('/api/ai-chat/analyze-context', {
      method: 'POST',
      body: JSON.stringify({ messages, user_id: userId }),
    }),

  // Emotion Reports
  // 自动计算用户本地时区的"昨天"日期传给后端
  // forceRefresh: 跳过后端 MongoDB 缓存，强制 GenAI 重新生成
  getDailyReport: (userId: string, forceRefresh: boolean = false) => {
    const yesterday = getLocalYesterday()
    return request<EmotionReport>(`/api/diary/reports/daily?user_id=${userId}&target_date=${yesterday}&force_refresh=${forceRefresh}`)
  },

  getWeeklyReport: (userId: string, forceRefresh: boolean = false) => {
    const yesterday = getLocalYesterday()
    return request<EmotionReport>(`/api/diary/reports/weekly?user_id=${userId}&target_date=${yesterday}&force_refresh=${forceRefresh}`)
  },

  getMonthlyReport: (userId: string, forceRefresh: boolean = false) => {
    const yesterday = getLocalYesterday()
    return request<EmotionReport>(`/api/diary/reports/monthly?user_id=${userId}&target_date=${yesterday}&force_refresh=${forceRefresh}`)
  },

  // Sync missing historical reports
  // 从用户本地昨天开始往前 sync
  // reportType: 直接返回对应类型的 report，避免二次 API 调用
  syncHistoryReports: (userId: string, days: number = 7, reportType: 'daily' | 'weekly' | 'monthly' = 'daily') => {
    const yesterday = getLocalYesterday()
    return request<{ synced_dates: string[]; skipped_dates: string[]; count: number; report: EmotionReport | null }>(
      `/api/diary/reports/sync-history?user_id=${userId}&days=${days}&start_from=${yesterday}&report_type=${reportType}`,
      { method: 'POST' }
    )
  },

  // Persistent Daily Emotion Scores (consistent across all devices)
  // These APIs call the backend server for persistent storage in MongoDB
  // Pass user's timezone to ensure correct date alignment
  getWeeklyEmotionScores: (userId: string) => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return request<{ scores: DailyEmotionScore[] }>(
      `/api/emotion-scores/weekly?user_id=${userId}&timezone=${encodeURIComponent(tz)}`
    )
  },

  getMonthlyEmotionScores: (userId: string) => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return request<{ scores: DailyEmotionScore[] }>(
      `/api/emotion-scores/monthly?user_id=${userId}&timezone=${encodeURIComponent(tz)}`
    )
  },

  refreshTodayScore: (userId: string) => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return request<{ success: boolean; score: DailyEmotionScore }>(
      `/api/emotion-scores/refresh-today?user_id=${userId}&timezone=${encodeURIComponent(tz)}`,
      { method: 'POST' }
    )
  },
}

// ============ AI Helper API ============

export interface RewriteRequest {
  text: string
  context?: string
  styles?: string[]
}

export interface RewriteResponse {
  rewritten_text: string
}

export interface SuggestReplyRequest {
  history: Array<{ role: string; parts: string[] }>
  context?: string
  styles?: string[]
}

export interface SuggestReplyResponse {
  suggestions: string
}

export interface SuggestTopicRequest {
  history: Array<{ role: string; parts: string[] }>
  context?: string
}

export interface SuggestTopicResponse {
  suggestions: string
}

export const aiHelperApi = {
  rewrite: (data: RewriteRequest) =>
    request<RewriteResponse>('/api/ai-helper/rewrite', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  suggestReply: (data: SuggestReplyRequest) =>
    request<SuggestReplyResponse>('/api/ai-helper/suggest-reply', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  suggestTopic: (data: SuggestTopicRequest) =>
    request<SuggestTopicResponse>('/api/ai-helper/suggest-topic', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}


// Session Summary Response
export interface SessionSummary {
  session_id: string
  message_count: number
  summary: string
  key_topics: string[]
  emotional_journey: string
  dominant_emotion: 'Bored' | 'Fear' | 'Joy' | 'Sad' | 'Disgust' | 'Anxious' | 'Angry' | 'Awkward' | 'Envy'
  user_needs?: string
  suggestions: string[]
}

// VIP Context Emotion Analysis Response
export interface ContextEmotionAnalysis {
  overall_mood: string
  mood_trend: 'improving' | 'stable' | 'declining'
  key_emotions: { emotion: string; count: number }[]
  analysis_summary: string
  suggested_response?: string
}

// Emotion Report Types
export interface EmotionTrendDataPoint {
  date: string
  avg_score: number
  dominant_emotion: string
}

export interface EmotionTrend {
  period: string
  data_points: EmotionTrendDataPoint[]
  trend_direction: 'improving' | 'declining' | 'stable'
  volatility: number
}

export interface EmotionWordCloud {
  words: Record<string, number>
  top_emotions: string[]
  total_count: number
}

export interface TriggerAnalysis {
  trigger_type: string
  frequency: number
  associated_emotions: string[]
  example_contexts: string[]
  impact_score: number
}

export interface DailyEmotionScore {
  id: string
  user_id: string
  utc_date: string  // YYYY-MM-DD format in UTC timezone
  avg_score: number  // -1 to 1
  dominant_emotion: string
  interaction_count: number
  locked: boolean
  created_at?: string
  updated_at?: string
}

/**
 * Convert UTC date string to user's local date string.
 * Used for displaying dates in user's timezone.
 *
 * @param utcDateStr - Date string in YYYY-MM-DD format (UTC)
 * @returns Date string in YYYY-MM-DD format (local timezone)
 */
export function utcDateToLocalDate(utcDateStr: string): string {
  // Parse UTC date at noon to avoid timezone edge cases
  const utcDate = new Date(utcDateStr + 'T12:00:00Z')
  const year = utcDate.getFullYear()
  const month = String(utcDate.getMonth() + 1).padStart(2, '0')
  const day = String(utcDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export interface EmotionReport {
  user_id: string
  period_type: 'daily' | 'weekly' | 'monthly'
  start_date: string
  end_date: string
  average_mood_score: number
  mood_stability: number
  total_interactions: number
  emotion_distribution: Record<string, number>
  emotion_trend: EmotionTrend
  word_cloud: EmotionWordCloud
  triggers: TriggerAnalysis[]
  summary_text: string
  key_insights: string[]
  suggestions: string[]
  trend_prediction: string
}

// ============ 社交 API ============

export interface FollowUser {
  id: string
  username: string
  nickname: string
  avatar?: string  // User's emoji avatar
  is_following: boolean
  is_follower: boolean
  is_mutual: boolean
}

export const socialApi = {
  follow: (userId: string, targetUserId: string) =>
    request<{ success: boolean; message: string }>(`/api/social/follow?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify({ target_user_id: targetUserId }),
    }),

  unfollow: (userId: string, targetUserId: string) =>
    request<{ success: boolean; message: string }>(`/api/social/unfollow?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify({ target_user_id: targetUserId }),
    }),

  getFollowing: (userId: string) =>
    request<FollowUser[]>(`/api/social/following/${userId}`),

  getFollowers: (userId: string) =>
    request<FollowUser[]>(`/api/social/followers/${userId}`),

  getContacts: (userId: string) =>
    request<FollowUser[]>(`/api/social/contacts/${userId}`),

  discover: (userId: string) =>
    request<FollowUser[]>(`/api/social/discover/${userId}`),

  checkFollow: (userId: string, targetUserId: string) =>
    request<{ is_following: boolean; is_follower: boolean; is_mutual: boolean }>(`/api/social/check/${userId}/${targetUserId}`),
}

// ============ 媒体 API ============

export const mediaApi = {
  upload: async (file: File): Promise<{ success: boolean; media_url: string; media_type: string; filename: string }> => {
    const formData = new FormData()
    formData.append('file', file)

    const token = getToken()
    const headers: HeadersInit = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${BASE_URL}/api/media/upload`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }))
      throw new Error(error.detail)
    }

    return response.json()
  },

  getInfo: (filename: string) =>
    request<{ exists: boolean; filename: string; media_type: string; file_size: number; url: string }>(`/api/media/info/${filename}`),

  delete: (filename: string) =>
    request<{ success: boolean; message: string }>(`/api/media/delete/${filename}`, {
      method: 'DELETE',
    }),
}

// ============ WebSocket 连接 ============

export const createChatWebSocket = (roomId: string, userId?: string): WebSocket => {
  // 动态获取 WebSocket URL，支持本地开发和生产环境
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  // 使用 BASE_URL 的主机部分，或者回退到当前页面主机
  let wsHost: string
  try {
    wsHost = new URL(BASE_URL).host
  } catch {
    wsHost = window.location.host
  }

  const wsUrl = userId
    ? `${wsProtocol}//${wsHost}/ws/rooms/${roomId}?user_id=${userId}`
    : `${wsProtocol}//${wsHost}/ws/rooms/${roomId}`

  console.log('[WebSocket] Connecting to:', wsUrl)
  return new WebSocket(wsUrl)
}

// ============ 工具函数 ============

/**
 * 获取完整的媒体 URL
 * 后端返回相对路径 /static/uploads/xxx.jpg，需要加上 BASE_URL
 */
export const getMediaUrl = (url: string | undefined | null): string => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  return `${BASE_URL}${url}`
}

// ============ 通知 API ============

export interface NotificationCounts {
  profile_total: number
  chat_total: number
  community_total: number
  new_followers: number
  unread_comments: number
  unread_comments_by_post: Record<string, number>
  unread_chats_by_room: Record<string, number>
}

export const notificationApi = {
  getCounts: (userId: string) =>
    request<NotificationCounts>(`/api/notifications/counts?user_id=${userId}`),

  markRead: (userId: string, type: string, sourceId?: string) =>
    request<{ success: boolean }>('/api/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        notification_type: type,
        source_id: sourceId,
      }),
    }),

  markAllRead: (userId: string, type?: string) =>
    request<{ success: boolean }>('/api/notifications/mark-all-read', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        notification_type: type,
      }),
    }),
}
