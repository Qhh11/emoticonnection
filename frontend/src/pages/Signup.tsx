import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Avatar images
import Bluey from '../assets/2d/Bluey.png'
import Blushy from '../assets/2d/Blushy.png'
import Grumpy from '../assets/2d/Grumpy.png'
import Scaredy from '../assets/2d/Scaredy.png'
import Snoozy from '../assets/2d/Snoozy.png'
import Sparkle from '../assets/2d/Sparkle.png'
import Sunny from '../assets/2d/Sunny.png'
import Yucky from '../assets/2d/Yucky.png'
import Zippy from '../assets/2d/Zippy.png'

interface CharacterDecoration {
  src: string
  name: string
  x: number
  y: number
  factor: number
  size: number
  rotate: number
  opacity: number
}

const characters: CharacterDecoration[] = [
  // 左侧阵营
  { src: Bluey, name: 'Bluey', x: 20, y: 10, factor: 0.025, size: 210, rotate: -12, opacity: 0.65 },
  { src: Sparkle, name: 'Sparkle', x: 18, y: 65, factor: 0.02, size: 250, rotate: -8, opacity: 0.68 },
  { src: Snoozy, name: 'Snoozy', x: 6, y: 45, factor: 0.028, size: 200, rotate: 8, opacity: 0.62 },
  // 中轴阵营
  { src: Blushy, name: 'Blushy', x: 40, y: 20, factor: 0.015, size: 190, rotate: 5, opacity: 0.6 },
  { src: Zippy, name: 'Zippy', x: 41, y: 60, factor: 0.022, size: 220, rotate: 12, opacity: 0.68 },
  // 右侧阵营
  { src: Sunny, name: 'Sunny', x: 82, y: 22, factor: 0.035, size: 230, rotate: 10, opacity: 0.7 },
  { src: Grumpy, name: 'Grumpy', x: 78, y: 68, factor: 0.03, size: 220, rotate: 15, opacity: 0.65 },
  { src: Scaredy, name: 'Scaredy', x: 50, y: 70, factor: 0.04, size: 210, rotate: -15, opacity: 0.65 },
  { src: Yucky, name: 'Yucky', x: 85, y: 45, factor: 0.032, size: 190, rotate: -10, opacity: 0.6 },
]

export default function Signup() {
  const [username, setUsername] = useState('')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  const { register } = useAuth()
  const navigate = useNavigate()

  // Mouse tracking for avatar animation
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2)
      const y = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2)
      setMousePosition({ x, y })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await register({ username, password, email, nickname: nickname || username })
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-[#1a1a1a]" style={{ transform: 'scale(0.8)', transformOrigin: 'top center', width: '125%', marginLeft: '-12.5%' }}>
      {/* Background blobs for that modern style */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blob opacity-50 pointer-events-none"></div>
      <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-green-50 rounded-full blob opacity-50 pointer-events-none"></div>
      <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-purple-50 rounded-full blob opacity-30 pointer-events-none"></div>

      {/* Decorative Avatars - cursor following */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden select-none -z-0">
        {characters.map(character => (
          <img
            key={character.name}
            src={character.src}
            alt={character.name}
            className="absolute transition-transform duration-700 ease-out select-none pointer-events-none drop-shadow-xl"
            style={{
              left: `${character.x}%`,
              top: `${character.y}%`,
              transform: `translate(${mousePosition.x * character.factor * 1000}px, ${mousePosition.y * character.factor * 1000}px) rotate(${character.rotate + (mousePosition.x * 25)}deg)`,
              opacity: character.opacity,
              width: `${character.size}px`,
              height: `${character.size}px`,
            }}
            draggable={false}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navbar */}
        <nav className="flex items-center justify-between py-8">
          <Link to="/" className="flex items-center space-x-2">
            <img src="/logo.png" alt="EmotiConnection" className="w-12 h-12 object-contain" />
            <span className="text-2xl font-black tracking-tight text-[#1a1a1a]">emoticonnection</span>
          </Link>
        </nav>

        {/* Hero Section */}
        <div className="mt-12 md:mt-20 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Hero Content */}
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

          </div>

          {/* Right Side - Signup Form Card */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="w-full max-w-[450px] bg-white/95 backdrop-blur-2xl rounded-[3rem] p-10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border border-gray-100">
              <h2 className="text-3xl font-black text-[#1a1a1a] mb-2">
                Join us
              </h2>
              <p className="text-gray-500 mb-6 font-medium">
                Create your safe space account
              </p>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-bold text-[#1a1a1a] mb-2"
                  >
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all text-[#1a1a1a] placeholder:text-gray-400 font-medium"
                    placeholder="your_username"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label
                    htmlFor="nickname"
                    className="block text-sm font-bold text-[#1a1a1a] mb-2"
                  >
                    Nickname (Display Name)
                  </label>
                  <input
                    id="nickname"
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all text-[#1a1a1a] placeholder:text-gray-400 font-medium"
                    placeholder="How others will see you"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-bold text-[#1a1a1a] mb-2"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all text-[#1a1a1a] placeholder:text-gray-400 font-medium"
                    placeholder="you@example.com"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-bold text-[#1a1a1a] mb-2"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all text-[#1a1a1a] placeholder:text-gray-400 font-medium"
                    placeholder="••••••••"
                    required
                    minLength={8}
                    disabled={isLoading}
                  />
                  <p className="mt-2 text-xs text-gray-400 font-medium">
                    At least 8 characters
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-[#1a1a1a] text-white font-black rounded-3xl shadow-lg hover:-translate-y-1 hover:shadow-xl active:scale-95 transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg mt-2"
                >
                  {isLoading ? 'Creating account...' : 'Sign up'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-gray-500 font-medium">
                  Already have an account?{' '}
                  <Link to="/login" className="text-purple-600 hover:text-purple-700 font-bold">
                    Log in
                  </Link>
                </p>
              </div>
            </div>

            {/* Connection Lines Illustration */}
            <svg className="absolute top-0 left-0 w-full h-full -z-10 opacity-30 hidden lg:block" viewBox="0 0 400 400">
              <path d="M50 200 Q 150 50 350 200" fill="none" stroke="#4f46e5" strokeWidth="4" strokeDasharray="10,10" />
              <path d="M50 100 Q 200 350 350 150" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="10,10" />
            </svg>
          </div>
        </div>
      </div>

      {/* Simple Footer */}
      <div className="relative z-10 py-12 text-center text-gray-400 text-sm bg-white mt-48">
        <p className="font-medium tracking-wide">© 2024 emoticonnection. Feel the world.</p>
      </div>
    </div>
  )
}
