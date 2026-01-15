// API 服务层 - 统一管理所有后端 API 调用

const BASE_URL = 'http://localhost:8000'

// Token 管理
export const getToken = (): string | null => {
  return localStorage.getItem('access_token')
}

export const setToken = (token: string): void => {
  localStorage.setItem('access_token', token)
}

export const removeToken = (): void => {
  localStorage.removeItem('access_token')
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

  getCheckInHistory: (userId: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : ''
    return request<CheckInHistoryItem[]>(`/api/users/${userId}/check-in/history${query}`)
  },

  getTodayCheckIn: (userId: string) =>
    request<{ checked_in: boolean; check_in: CheckInHistoryItem | null }>(`/api/users/${userId}/check-in/today`),
}

// ============ 帖子 API ============

export interface Post {
  id: string
  author_id: string
  author_name: string | null
  content: string
  post_type: 'text' | 'image' | 'video' | 'mixed'
  media_urls: string[] | null
  is_anonymous: boolean
  visibility: 'public' | 'friends' | 'anonymous'
  tags: string[]
  emotion: string | null
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
  content: string
  post_type?: string
  is_anonymous?: boolean
  tags?: string[]
  emotion?: string
  media_urls?: string[]
  visibility?: string
}

export interface Comment {
  id: string
  post_id: string
  author_id: string
  author_name: string | null
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

export interface MatchRequest {
  current_emotion: string
  role: 'seeker' | 'supporter' | 'either'
  need: 'vent' | 'advice' | 'companion' | 'distraction'
  intensity: number
  support_topics?: string[]
  is_anonymous?: boolean
  preferred_mode?: 'human_anonymous' | 'human_non_anonymous'
}

export interface MatchResponse {
  matched: boolean
  room_id?: string
  matched_user_id?: string
  is_anonymous?: boolean
  match_type?: string
  match_score?: number
  wait_time_seconds?: number
}

export interface MatchStatus {
  in_queue: boolean
  position?: number
  wait_time_estimate?: number
  emotion?: string
  intensity?: number
}

export const matchApi = {
  findMatch: (userId: string, data: MatchRequest) =>
    request<MatchResponse>(`/api/match/find?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  cancelMatch: (userId: string) =>
    request<{ success: boolean; message: string }>(`/api/match/cancel?user_id=${userId}`, {
      method: 'POST',
    }),

  getStatus: (userId: string) =>
    request<MatchStatus>(`/api/match/status?user_id=${userId}`),

  getEmotions: () =>
    request<{ emotions: Record<string, Array<{ value: string; label: string; emoji: string }>> }>('/api/match/emotions'),

  getRoles: () =>
    request<{ roles: Array<{ value: string; label: string; description: string; emoji: string }> }>('/api/match/roles'),

  getNeeds: () =>
    request<{ needs: Array<{ value: string; label: string; description: string; emoji: string }> }>('/api/match/needs'),

  getTopics: () =>
    request<{ topics: Array<{ value: string; label: string; emoji: string }> }>('/api/match/topics'),
}

// ============ 聊天 API ============

export interface ChatRoom {
  id: string
  user1_id: string
  user2_id: string
  is_anonymous?: boolean
  created_at?: string
}

export interface ChatMessage {
  id: string
  room_id: string
  sender_id: string
  message_type: 'text' | 'emoji' | 'image' | 'video'
  content: string
  media_url?: string | null
  emotion?: string | null
  created_at: string
}

export interface UserRoom {
  room_id: string
  other_user_id: string
  other_user_name: string
  is_anonymous: boolean
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
}

// ============ AI 聊天 API ============

export interface AIChatRequest {
  user_id: string
  session_id?: string
  message: string
  history?: Array<{ role: string; parts: string[] }>
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
  created_at: string
}

export interface CreateDiaryRequest {
  user_id: string
  title: string
  content: string
  mood: string
  session_id?: string
}

export const aiChatApi = {
  chat: (data: AIChatRequest) =>
    request<AIChatResponse>('/api/ai-chat/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getSessions: (userId: string) =>
    request<AISession[]>(`/api/ai-chat/sessions?user_id=${userId}`),

  createSession: (userId: string) =>
    request<AISession>('/api/ai-chat/sessions', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),

  getSessionMessages: (sessionId: string) =>
    request<AIMessage[]>(`/api/ai-chat/sessions/${sessionId}/messages`),

  generateDiary: (sessionId: string, userId: string) =>
    request<Diary>('/api/ai-chat/diaries/generate', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, user_id: userId }),
    }),

  getDiaries: (userId: string) =>
    request<Diary[]>(`/api/ai-chat/diaries?user_id=${userId}`),

  getDiary: (diaryId: string) =>
    request<Diary>(`/api/ai-chat/diaries/${diaryId}`),

  createDiary: (data: CreateDiaryRequest) =>
    request<Diary>('/api/ai-chat/diaries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// ============ 社交 API ============

export interface FollowUser {
  id: string
  username: string
  nickname: string
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

export const createChatWebSocket = (roomId: string): WebSocket => {
  const wsUrl = `ws://localhost:8000/ws/rooms/${roomId}`
  return new WebSocket(wsUrl)
}
