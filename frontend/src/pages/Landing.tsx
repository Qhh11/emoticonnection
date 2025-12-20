import Navbar from '../components/landing/Navbar'
import Hero from '../components/landing/Hero'
import DecorativeShapes from '../components/landing/DecorativeShapes'
import WaveSeparator from '../components/landing/WaveSeparator'

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-[#1a1a1a]" style={{ transform: 'scale(0.8)', transformOrigin: 'top center', width: '125%', marginLeft: '-12.5%' }}>
      {/* Background blobs for that modern style */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blob opacity-50 pointer-events-none"></div>
      <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-green-50 rounded-full blob opacity-50 pointer-events-none"></div>
      <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-purple-50 rounded-full blob opacity-30 pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Navbar />
        <Hero />
      </div>

      <WaveSeparator />

      <DecorativeShapes />

      {/* Simple Footer */}
      <div className="relative z-10 py-12 text-center text-gray-400 text-sm bg-white">
        <p className="font-medium tracking-wide">© 2024 emoticonnection. Feel the world.</p>
      </div>
    </div>
  )
}
