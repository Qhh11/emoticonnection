export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-text-dark text-paper py-16">
      <div className="container mx-auto px-6 md:px-12 lg:px-20 max-w-7xl">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-lavender-300 rounded-full flex items-center justify-center">
                <span className="text-2xl">✨</span>
              </div>
              <span className="font-display font-bold text-xl">EmotionConnect</span>
            </div>
            <p className="text-paper text-opacity-70 leading-relaxed">
              A safe space for emotional wellness and authentic connection.
            </p>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h4 className="font-bold text-lg">Product</h4>
            <ul className="space-y-2 text-paper text-opacity-70">
              <li>
                <a href="#features" className="hover:text-opacity-100 transition-opacity">
                  Features
                </a>
              </li>
              <li>
                <a href="#safety" className="hover:text-opacity-100 transition-opacity">
                  Safety
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-opacity-100 transition-opacity">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="font-bold text-lg">Support</h4>
            <ul className="space-y-2 text-paper text-opacity-70">
              <li>
                <a href="#" className="hover:text-opacity-100 transition-opacity">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-opacity-100 transition-opacity">
                  Community Guidelines
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-opacity-100 transition-opacity">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-bold text-lg">Legal</h4>
            <ul className="space-y-2 text-paper text-opacity-70">
              <li>
                <a href="#" className="hover:text-opacity-100 transition-opacity">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-opacity-100 transition-opacity">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-opacity-100 transition-opacity">
                  Cookie Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-paper border-opacity-20 mt-12 pt-8 text-center text-paper text-opacity-60 text-sm">
          <p>&copy; {currentYear} EmotionConnect. Made with care for emotional wellness.</p>
        </div>
      </div>
    </footer>
  )
}
