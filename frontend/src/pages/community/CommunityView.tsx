import { useState } from 'react'

interface Post {
  id: string
  author: string
  isAnonymous: boolean
  content: string
  mood: string
  color: string
  textColor: string
  timestamp: string
  likes: number
  comments: number
  tags: string[]
  avatar: string
}

interface PostCardProps {
  post: Post
  onResonate: (e: React.MouseEvent) => void
}

function PostCard({ post, onResonate }: PostCardProps) {
  const [liked, setLiked] = useState(false)
  const handleLike = (e: React.MouseEvent) => {
    setLiked(!liked)
    onResonate(e)
  }

  return (
    <div className="p-10 rounded-[2.5rem] border border-black/[0.05] shadow-xl flex flex-col justify-between transition-all hover:scale-[1.02]" style={{ backgroundColor: post.color }}>
      <div className="flex justify-between items-start mb-10">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shadow-inner border border-white/20">
            {post.isAnonymous ? '🎭' : post.avatar}
          </div>
          <div className="space-y-0.5">
            <p className="text-[13px] font-black uppercase tracking-widest" style={{ color: post.textColor }}>{post.author}</p>
            <p className="text-[14px] font-black uppercase opacity-60" style={{ color: post.textColor }}>{post.timestamp}</p>
          </div>
        </div>
        <div className="text-[14px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white/20" style={{ color: post.textColor }}>{post.mood}</div>
      </div>
      <p className="text-2xl font-black tracking-tight leading-snug mb-10" style={{ color: post.textColor }}>{post.content}</p>
      <div className="flex justify-between items-center pt-8 border-t border-white/10">
        <div className="flex space-x-8">
          <button onClick={handleLike} className={`flex items-center space-x-2 transition-transform active:scale-90 ${liked ? 'scale-110' : ''}`} style={{ color: post.textColor }}>
            <span className="text-lg">{liked ? '❤️' : '🤍'}</span>
            <span className="text-[13px] font-black">{post.likes + (liked ? 1 : 0)}</span>
          </button>
          <button className="flex items-center space-x-2" style={{ color: post.textColor }}>
            <span className="text-lg">💬</span>
            <span className="text-[13px] font-black">{post.comments}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

interface TrendingItemProps {
  tag: string
  count: string
  color: string
}

function TrendingItem({ tag, count, color }: TrendingItemProps) {
  return (
    <div className="flex items-center justify-between group cursor-pointer">
      <div className="flex items-center space-x-3">
        <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: color }}></div>
        <span className="text-[14px] font-black uppercase tracking-tighter text-gray-800 group-hover:text-accent transition-colors">#{tag}</span>
      </div>
      <span className="text-[12px] font-black text-gray-300 uppercase tracking-widest">{count}</span>
    </div>
  )
}

interface CommunityViewProps {
  onInteract: (e: React.MouseEvent) => void
}

export default function CommunityView({ onInteract }: CommunityViewProps) {
  const [posts] = useState<Post[]>([
    {
      id: '1',
      author: 'Cyber_Spirit',
      isAnonymous: false,
      content: "Just unlocked the 'Neon Dream' series. The aesthetics are unmatched! 💎",
      mood: 'Joy',
      color: '#F9D849',
      textColor: '#121212',
      timestamp: '2H AGO',
      likes: 124,
      comments: 12,
      tags: ['Series01', 'NeonDream'],
      avatar: '🦄'
    },
    {
      id: '2',
      author: 'Unknown_Vibe',
      isAnonymous: true,
      content: "Sometimes the silence is louder than any music. Feeling deeply connected to the void tonight.",
      mood: 'Sad',
      color: '#3266B1',
      textColor: '#ffffff',
      timestamp: '5H AGO',
      likes: 89,
      comments: 4,
      tags: ['MidnightThoughts', 'Void'],
      avatar: '👤'
    },
    {
      id: '3',
      author: 'Rage_Machine',
      isAnonymous: false,
      content: "The lag in the metaverse today is absolutely unacceptable. I'm about to short-circuit! ⚡",
      mood: 'Angry',
      color: '#D32F2F',
      textColor: '#ffffff',
      timestamp: '1H AGO',
      likes: 45,
      comments: 28,
      tags: ['Metaverse', 'Lag'],
      avatar: '🤖'
    }
  ])

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <h2 className="text-6xl font-black tracking-tighter uppercase leading-none">Community</h2>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Synchronized frequencies around the world</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-full border border-black/5 shadow-sm">
          <button className="px-8 py-3 rounded-full text-[13px] font-black uppercase tracking-widest bg-accent text-accent-inverse shadow-lg">Trending</button>
          <button className="px-8 py-3 rounded-full text-[13px] font-black uppercase tracking-widest text-gray-400 hover:text-accent">Latest</button>
        </div>
      </header>

      <div className="grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-8">
          {posts.map(post => (
            <PostCard key={post.id} post={post} onResonate={onInteract} />
          ))}
        </div>
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white p-10 rounded-[2.5rem] border border-black/[0.03] space-y-8">
            <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-300">Hot Frequencies</h4>
            <div className="space-y-6">
              <TrendingItem tag="TheInnerCircle" count="12.4k" color="#F9D849" />
              <TrendingItem tag="VoidVibes" count="8.2k" color="#3266B1" />
              <TrendingItem tag="EmotionalMeta" count="5.1k" color="#9381BA" />
              <TrendingItem tag="SystemOverload" count="3.9k" color="#D32F2F" />
            </div>
          </div>

          <div className="bg-[#1a1a1a] p-10 rounded-[2.5rem] space-y-6 text-white overflow-hidden relative group">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/40 transition-colors"></div>
            <h4 className="font-black text-[13px] uppercase tracking-[0.25em] text-gray-500 relative z-10">Series Drop</h4>
            <div className="space-y-2 relative z-10">
              <p className="text-2xl font-black tracking-tighter leading-tight">Neon Dream <br/>Limited Edition</p>
              <p className="text-[12px] font-black uppercase tracking-widest text-indigo-400">Available for 48h</p>
            </div>
            <button className="w-full py-4 bg-white text-black rounded-2xl font-black text-[13px] uppercase tracking-widest hover:bg-indigo-400 hover:text-white transition-all relative z-10">Claim Avatar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
