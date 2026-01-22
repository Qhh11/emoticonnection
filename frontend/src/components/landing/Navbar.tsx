export default function Navbar() {
  return (
    <nav className="flex items-center justify-between py-8">
      {/* TODO: Replace with custom logo/brand asset */}
      <div className="flex items-center space-x-2">
        <img src="/logo.png" alt="EmotiConnection" className="w-12 h-12 object-contain" />
        <span className="text-2xl font-black tracking-tight text-[#1a1a1a]">emoticonnection</span>
      </div>
    </nav>
  )
}
