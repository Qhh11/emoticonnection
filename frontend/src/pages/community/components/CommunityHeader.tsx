/**
 * CommunityHeader - 社区顶部导航栏
 * Following/Exploring 切换 + 3D 质感发帖按钮
 * MoodWeatherBar 在 header 下方，全宽流动渐变
 */

interface CommunityHeaderProps {
  activeTab: 'following' | 'exploring'
  onTabChange: (tab: 'following' | 'exploring') => void
  onCreatePost: () => void
  userNickname?: string
}

export default function CommunityHeader({
  activeTab,
  onTabChange,
  onCreatePost,
  userNickname,
}: CommunityHeaderProps) {
  return (
    <div className="flex flex-col space-y-6 mb-8">
      {/* 上排：标题 + Tab 切换 + 发帖按钮 */}
      <div className="flex items-center justify-between">
        {/* 左侧：标题 */}
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 uppercase leading-none">
            Hi, {userNickname || 'Friend'}
          </h1>
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mt-1">
            Share Your Vibe
          </p>
        </div>

        {/* 中间：Tab 切换 */}
        <div className="flex items-center bg-white/60 backdrop-blur-sm p-1.5 rounded-full border border-white/30">
          <button
            onClick={() => onTabChange('following')}
            className={`
              px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider
              transition-all duration-300
              ${activeTab === 'following'
                ? 'bg-accent text-white shadow-lg'
                : 'text-gray-500 hover:text-accent'
              }
            `}
          >
            Following
          </button>
          <button
            onClick={() => onTabChange('exploring')}
            className={`
              px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider
              transition-all duration-300
              ${activeTab === 'exploring'
                ? 'bg-accent text-white shadow-lg'
                : 'text-gray-500 hover:text-accent'
              }
            `}
          >
            Exploring
          </button>
        </div>

        {/* 右侧：发帖按钮 (3D 质感) */}
        <button
          onClick={onCreatePost}
          className="
            relative w-14 h-14 rounded-2xl
            bg-accent
            text-white text-2xl font-black
            flex items-center justify-center
            transition-all duration-300 ease-out
            hover:scale-105 active:scale-95
            shadow-[0_8px_20px_-4px_rgba(0,0,0,0.3)]
            hover:shadow-[0_12px_28px_-4px_rgba(0,0,0,0.4)]
            active:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.3)]
          "
          style={{
            transform: 'translateY(0)',
          }}
        >
          <span className="relative z-10">+</span>
          {/* 高光效果 */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-transparent" />
          {/* 底部阴影增强立体感 */}
          <div className="absolute -bottom-1 left-1 right-1 h-2 bg-accent/30 rounded-b-2xl blur-sm" />
        </button>
      </div>

    </div>
  )
}
