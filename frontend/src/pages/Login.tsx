import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import Decor from '../components/ui/Decor'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login({ username, password })
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Background decorations */}
      <Decor
        type="circle"
        color="royal"
        size="lg"
        className="absolute -top-10 -right-20 animate-float-slow"
      />
      <Decor
        type="blob"
        color="vivid"
        size="md"
        className="absolute bottom-1/4 -left-16 animate-float-slower"
      />
      <Decor
        type="sparkle"
        color="coral"
        size="sm"
        className="absolute top-1/3 right-1/4"
      />

      {/* Login Form */}
      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex items-center justify-center space-x-3 mb-12">
          <div className="w-12 h-12 bg-vivid-300 rounded-full flex items-center justify-center">
            <span className="text-2xl">✨</span>
          </div>
          <h1 className="font-display font-bold text-3xl text-text-dark">
            EmotionConnect
          </h1>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-soft-lg p-8 md:p-10">
          <h2 className="text-display-sm font-display mb-2 text-text-dark">
            Welcome back
          </h2>
          <p className="text-text-muted mb-8">
            Log in to continue your journey
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-text-dark mb-2"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-text-dark border-opacity-20 focus:border-vivid-500 focus:outline-none focus:ring-2 focus:ring-vivid-300 transition-all"
                placeholder="your_username"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-dark mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-text-dark border-opacity-20 focus:border-vivid-500 focus:outline-none focus:ring-2 focus:ring-vivid-300 transition-all"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Log in'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-muted">
              Don't have an account?{' '}
              <Link to="/signup" className="text-vivid-600 hover:text-vivid-500 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Back to home */}
        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-text-muted hover:text-text-dark transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
