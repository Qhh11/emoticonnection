/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paper White - Background
        paper: '#FAFAF7',

        // 7 Core Brand Colors from reference image
        dark: {
          // Deep Charcoal - Main text, dark backgrounds, navigation
          50: '#F5F6F6',
          100: '#E8EAEB',
          200: '#D1D5D7',
          300: '#A3ABB0',
          400: '#6B767D',
          500: '#2D3436',  // Main
          600: '#252A2C',
        },
        royal: {
          // Royal Blue - Sadness emotion, info, links
          50: '#EEF4FE',
          100: '#D5E3FC',
          200: '#B3CEFA',
          300: '#5B8DEE',  // Main (500 level moved to 300 for consistency)
          400: '#4A7EE8',
          500: '#5B8DEE',  // Main brand color
          600: '#3D6FCC',
        },
        vivid: {
          // Vivid Purple - Anxiety emotion, primary brand color
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',  // Main brand color
          600: '#9333EA',
        },
        sunny: {
          // Warm Yellow - Happiness/Fatigue emotions, highlights, warnings
          50: '#FFFDF0',
          100: '#FEF9C3',
          200: '#FEF08A',
          300: '#FDE047',
          400: '#FACC15',
          500: '#F1C40F',  // Main brand color
          600: '#CA9A0A',
        },
        fresh: {
          // Fresh Green - Calm emotion, success, safety
          50: '#F0FDF5',
          100: '#DCFCE8',
          200: '#BBF7D5',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#5FBD8C',  // Main brand color
          600: '#4F9D73',
        },
        coral: {
          // Vibrant Coral - Anger/Confusion emotions, CTA buttons, emphasis
          50: '#FFF5F4',
          100: '#FFE5E2',
          200: '#FFCBC5',
          300: '#FFB1A8',
          400: '#FF978B',
          500: '#FF7E67',  // Main brand color
          600: '#E6654C',
        },

        // Alias for text colors (using deep charcoal)
        'text-dark': '#2D3436',
        'text-muted': '#636E72',
        'text-light': '#B2BEC3',
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'hero-sm': ['64px', { lineHeight: '1.1', fontWeight: '800' }],
        'hero': ['80px', { lineHeight: '1.05', fontWeight: '800' }],
        'hero-lg': ['96px', { lineHeight: '1', fontWeight: '800' }],
        'display-sm': ['48px', { lineHeight: '1.2', fontWeight: '700' }],
        'display': ['56px', { lineHeight: '1.15', fontWeight: '700' }],
        'display-lg': ['64px', { lineHeight: '1.1', fontWeight: '700' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '38': '9.5rem',
        '42': '10.5rem',
        '46': '11.5rem',
        '50': '12.5rem',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'soft': '0 2px 20px rgba(0, 0, 0, 0.06)',
        'soft-lg': '0 4px 30px rgba(0, 0, 0, 0.08)',
        'soft-xl': '0 8px 40px rgba(0, 0, 0, 0.10)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'float-slower': 'float 10s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
    },
  },
  plugins: [],
}
