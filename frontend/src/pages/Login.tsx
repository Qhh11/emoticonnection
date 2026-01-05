import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'
import Decor from '../components/ui/Decor'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: API integration
    console.log('Login:', { email, password })
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text-dark mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-text-dark border-opacity-20 focus:border-vivid-500 focus:outline-none focus:ring-2 focus:ring-vivid-300 transition-all"
                placeholder="you@example.com"
                required
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
              />
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full">
              Log in
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
