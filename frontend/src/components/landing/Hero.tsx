import { Link } from 'react-router-dom'
import ChatDemo from './ChatDemo'

export default function Hero() {
  return (
    <div className="mt-16 md:mt-24 grid lg:grid-cols-2 gap-12 items-center">
      <div className="space-y-8">
        <h1 className="text-6xl md:text-8xl font-black leading-[0.9] tracking-tight text-[#1a1a1a]">
          Connect <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-500 to-green-400">
            beyond
          </span> <br />
          words.
        </h1>

        <p className="text-xl text-gray-500 max-w-lg leading-relaxed font-medium">
          emoticonnection is the world's first platform designed around genuine human emotions. Shared feelings, synchronized smiles.
        </p>

        <div className="flex items-center space-x-6">
          <Link to="/signup">
            <button className="px-10 py-5 bg-[#1a1a1a] text-white font-black rounded-3xl shadow-lg hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] transition-all duration-300 ease-out text-lg active:scale-95">
              Sign up
            </button>
          </Link>
          <Link to="/login">
            <button className="px-10 py-5 bg-white text-[#1a1a1a] font-black rounded-3xl shadow-lg border-2 border-gray-200 hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] transition-all duration-300 ease-out text-lg active:scale-95">
              Log in
            </button>
          </Link>
        </div>
      </div>

      <div className="relative hidden lg:block">
        {/* Chat Demo Component */}
        <ChatDemo />

        {/* Connection Lines Illustration */}
        <svg className="absolute top-0 left-0 w-full h-full -z-10 opacity-30" viewBox="0 0 400 400">
           <path d="M50 200 Q 150 50 350 200" fill="none" stroke="#4f46e5" strokeWidth="4" strokeDasharray="10,10" />
           <path d="M50 100 Q 200 350 350 150" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="10,10" />
        </svg>
      </div>
    </div>
  )
}
