export default function Navbar() {
  return (
    <nav className="flex items-center justify-between py-8">
      {/* TODO: Replace with custom logo/brand asset */}
      <div className="flex items-center space-x-2">
        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <span className="text-2xl font-black tracking-tight text-[#1a1a1a]">emoticonnection</span>
      </div>
    </nav>
  )
}
