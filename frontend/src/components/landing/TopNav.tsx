import Button from '../ui/Button'

export default function TopNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-paper bg-opacity-95 backdrop-blur-sm border-b border-text-dark border-opacity-5">
      <div className="container mx-auto px-6 md:px-12 lg:px-20 max-w-7xl">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-lavender-300 rounded-full flex items-center justify-center">
              <span className="text-2xl">✨</span>
            </div>
            <span className="font-display font-bold text-xl">EmotionConnect</span>
          </div>

          {/* Nav Links - Hidden on mobile */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-text-muted hover:text-text-dark transition-colors">
              Product
            </a>
            <a href="#safety" className="text-text-muted hover:text-text-dark transition-colors">
              Safety
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="hidden sm:block">
              Log in
            </Button>
            <Button variant="primary" size="sm">
              Sign up
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
