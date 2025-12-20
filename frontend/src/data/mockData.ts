// Mock data for future implementation

export interface EmotionTag {
  id: string
  name: string
  color: 'lavender' | 'mint' | 'peach' | 'butter'
}

export interface Post {
  id: string
  authorId: string
  authorName: string
  isAnonymous: boolean
  content: string
  emotionTag: EmotionTag
  imageUrl?: string
  createdAt: string
  likes: number
  comments: number
  tags: string[]
}

export interface Match {
  id: string
  userId: string
  username: string
  avatar: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  emotionMatch: string
}

export interface Message {
  id: string
  senderId: string
  senderName: string
  content: string
  emotionTag?: EmotionTag
  timestamp: string
  isRead: boolean
}

export interface DiaryEntry {
  id: string
  title: string
  content: string
  emotionTag: EmotionTag
  date: string
  tags: string[]
}

export interface UserProfile {
  id: string
  username: string
  email: string
  avatar: string
  joinedDate: string
  settings: {
    incognitoMode: boolean
    showEmotionTags: boolean
    allowMatching: boolean
  }
  vipStatus: boolean
}

// Mock emotion tags
export const emotionTags: EmotionTag[] = [
  { id: '1', name: 'Anxiety', color: 'lavender' },
  { id: '2', name: 'Sadness', color: 'mint' },
  { id: '3', name: 'Happiness', color: 'peach' },
  { id: '4', name: 'Calm', color: 'butter' },
  { id: '5', name: 'Anger', color: 'lavender' },
  { id: '6', name: 'Confusion', color: 'mint' },
  { id: '7', name: 'Fatigue', color: 'peach' },
]

// Mock posts
export const mockPosts: Post[] = [
  {
    id: '1',
    authorId: '1',
    authorName: 'Anonymous User',
    isAnonymous: true,
    content: "Just wanted to share that it's okay to not be okay. We're all going through something.",
    emotionTag: emotionTags[0],
    createdAt: '2025-12-19T10:30:00Z',
    likes: 42,
    comments: 8,
    tags: ['#support', '#community'],
  },
  {
    id: '2',
    authorId: '2',
    authorName: 'Alex',
    isAnonymous: false,
    content: 'Had a breakthrough in therapy today. Feeling hopeful for the first time in months.',
    emotionTag: emotionTags[2],
    createdAt: '2025-12-19T09:15:00Z',
    likes: 67,
    comments: 15,
    tags: ['#growth', '#therapy'],
  },
]

// Mock matches
export const mockMatches: Match[] = [
  {
    id: '1',
    userId: '1',
    username: 'Sarah',
    avatar: '👩',
    lastMessage: 'Thank you for listening. It really helps.',
    lastMessageTime: '2025-12-19T11:00:00Z',
    unreadCount: 2,
    emotionMatch: 'Anxiety',
  },
  {
    id: '2',
    userId: '2',
    username: 'Jordan',
    avatar: '🧑',
    lastMessage: 'How are you feeling today?',
    lastMessageTime: '2025-12-19T10:45:00Z',
    unreadCount: 0,
    emotionMatch: 'Calm',
  },
]

// Mock messages
export const mockMessages: Message[] = [
  {
    id: '1',
    senderId: '1',
    senderName: 'Sarah',
    content: 'Hey, how are you doing?',
    emotionTag: emotionTags[0],
    timestamp: '2025-12-19T10:50:00Z',
    isRead: true,
  },
  {
    id: '2',
    senderId: 'me',
    senderName: 'You',
    content: "I'm doing okay, thanks for asking.",
    timestamp: '2025-12-19T10:55:00Z',
    isRead: true,
  },
]

// Mock diary entries
export const mockDiaryEntries: DiaryEntry[] = [
  {
    id: '1',
    title: 'Reflections on today',
    content: 'Today was challenging but I made it through. Learning to be gentle with myself.',
    emotionTag: emotionTags[1],
    date: '2025-12-19',
    tags: ['#selfcare', '#reflection'],
  },
  {
    id: '2',
    title: 'Small victories',
    content: 'Got out of bed, showered, and made breakfast. These small things matter.',
    emotionTag: emotionTags[3],
    date: '2025-12-18',
    tags: ['#progress', '#selfcompassion'],
  },
]

// Mock user profile
export const mockUserProfile: UserProfile = {
  id: '1',
  username: 'user123',
  email: 'user@example.com',
  avatar: '😊',
  joinedDate: '2025-01-15',
  settings: {
    incognitoMode: false,
    showEmotionTags: true,
    allowMatching: true,
  },
  vipStatus: false,
}
