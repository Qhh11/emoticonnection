# EmotionConnect Frontend

A modern, empathetic landing page and design system for EmotionConnect - a safe space for emotional wellness.

## 🎨 Design Philosophy

This frontend follows the **modern editorial + playful geometric decoration** style inspired by Nunito, DSM, and Pet Shelter:

- **Typography-first**: Extra large headings (64-96px) with generous whitespace
- **Paper-like background**: Warm white (#FAFAF7) with subtle noise texture and soft gradient washes
- **Geometric decorations**: Colorful circles, blobs, sparkles, and dotted curved connectors
- **Deep rounded corners**: `rounded-3xl` for cards, pill-shaped buttons
- **Soft shadows**: Minimal borders, focus on elevation through shadows
- **NO glassmorphism**: Explicitly avoiding frosted glass/backdrop-blur effects

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
cd /Users/lyr22ryl/emoticonnection/frontend
npm install
```

### Development

```bash
npm run dev
```

The app will open at `http://localhost:3000`

### Build

```bash
npm run build
```

Production files will be in the `dist/` directory.

## 📁 Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── main.tsx           # React entry point
│   ├── App.tsx            # Root component
│   ├── index.css          # Global styles + Tailwind
│   │
│   ├── pages/             # Page components
│   │   └── Landing.tsx    # Landing page (current)
│   │
│   ├── components/
│   │   ├── ui/            # Reusable UI components
│   │   │   ├── Button.tsx      # Primary, secondary, ghost variants
│   │   │   ├── Pill.tsx        # Emotion tags / labels
│   │   │   ├── Card.tsx        # Content cards with hover effects
│   │   │   ├── Section.tsx     # Page sections with spacing
│   │   │   └── Decor.tsx       # Geometric decorations (circles, blobs, etc)
│   │   │
│   │   └── landing/       # Landing page sections
│   │       ├── TopNav.tsx      # Navigation bar
│   │       ├── Hero.tsx        # Hero section
│   │       ├── Features.tsx    # Feature cards
│   │       ├── Safety.tsx      # Safety/privacy section
│   │       └── Footer.tsx      # Footer
│   │
│   ├── styles/            # Additional styles
│   │   └── (future CSS files)
│   │
│   └── data/              # Mock data
│       └── mockData.ts    # TypeScript interfaces + mock data
│
├── package.json
├── vite.config.ts
├── tailwind.config.js     # Design system tokens
├── tsconfig.json
└── README.md
```

## 🎨 Design System

### Color Palette

Defined in `tailwind.config.js`:

- **paper**: `#FAFAF7` - Warm white background
- **lavender**: Soft purple accent
- **mint**: Soft green accent
- **peach**: Soft orange accent
- **butter**: Soft yellow accent
- **text-dark**: `#2D3436` - Primary text
- **text-muted**: `#636E72` - Secondary text

### Typography

- **Display fonts**: Nunito (bold, 800-900 weight)
- **Body fonts**: Inter (400-600 weight)
- **Hero sizes**: 64px (sm), 80px (md), 96px (lg)
- **Display sizes**: 48px (sm), 56px (md), 64px (lg)

### Spacing

Large whitespace between sections:
- `spacing="sm"`: 12-16rem vertical padding
- `spacing="md"`: 16-24rem
- `spacing="lg"`: 24-32rem (default)
- `spacing="xl"`: 32-40rem

### Shadows

- `shadow-soft`: Light elevation
- `shadow-soft-lg`: Medium elevation
- `shadow-soft-xl`: Strong elevation

## 🧩 Component Library

### Button

```tsx
import Button from '@/components/ui/Button'

<Button variant="primary" size="lg">
  Get Started
</Button>
```

**Variants**: `primary`, `secondary`, `ghost`
**Sizes**: `sm`, `md`, `lg`

### Pill

```tsx
import Pill from '@/components/ui/Pill'

<Pill variant="lavender" size="md">
  Anxiety
</Pill>
```

**Variants**: `lavender`, `mint`, `peach`, `butter`, `neutral`
**Sizes**: `sm`, `md`, `lg`

### Card

```tsx
import Card from '@/components/ui/Card'

<Card hover padding="lg">
  <h3>Card Title</h3>
  <p>Card content...</p>
</Card>
```

**Props**: `hover` (boolean), `padding` (sm/md/lg)

### Section

```tsx
import Section from '@/components/ui/Section'

<Section spacing="xl" background="lavender">
  {/* Content */}
</Section>
```

**Spacing**: `sm`, `md`, `lg`, `xl`
**Background**: `transparent`, `lavender`, `mint`, `peach`, `butter`

### Decor

```tsx
import Decor from '@/components/ui/Decor'

<Decor type="circle" color="lavender" size="lg" animated />
```

**Types**: `circle`, `blob`, `sparkle`, `line`
**Colors**: `lavender`, `mint`, `peach`, `butter`
**Sizes**: `sm`, `md`, `lg`, `xl`

## 🔌 API Integration (Future)

Currently using mock data from `src/data/mockData.ts`. To integrate with the backend:

### Step 1: Create API service

```typescript
// src/services/api.ts
const API_BASE = 'http://localhost:8000'

export async function getPosts() {
  const response = await fetch(`${API_BASE}/api/posts`)
  return response.json()
}

// Add more API calls...
```

### Step 2: Replace mock data

In your components, replace:

```typescript
// Before
import { mockPosts } from '@/data/mockData'

// After
import { getPosts } from '@/services/api'

// Use in component:
const [posts, setPosts] = useState([])
useEffect(() => {
  getPosts().then(setPosts)
}, [])
```

### Step 3: Add environment variables

Create `.env`:

```
VITE_API_BASE_URL=http://localhost:8000
```

Access in code:

```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL
```

## 🎯 Current Status

**Completed**:
- ✅ Project setup (Vite + React + TypeScript + Tailwind)
- ✅ Design system (colors, typography, spacing, shadows)
- ✅ Component library (Button, Pill, Card, Section, Decor)
- ✅ Landing page (TopNav, Hero, Features, Safety, Footer)
- ✅ Paper-like background with noise texture
- ✅ Geometric decorations and animations
- ✅ Mock data structure

**Not Implemented** (as requested):
- ❌ Login/Signup pages
- ❌ App Shell (logged-in layout)
- ❌ Mood Hub page
- ❌ Peer Chat page
- ❌ Private Diary page
- ❌ My Profile page
- ❌ Router setup (currently only Landing page)

## 📝 Notes

- This is a **UI-only implementation** with no backend integration yet
- Uses **mock data** defined in TypeScript for type safety
- Follows **strict design guidelines**: no glassmorphism, typography-first, generous whitespace
- All components are **fully typed** with TypeScript
- Responsive design with **mobile-first approach**

## 🔧 Tech Stack

- **React 18.3** - UI library
- **TypeScript 5.6** - Type safety
- **Vite 6.0** - Build tool
- **Tailwind CSS 3.4** - Utility-first CSS
- **Lucide React** - Icon library
- **React Router** (future) - Client-side routing

## 👥 For Developers

When adding new pages:

1. Create page component in `src/pages/`
2. Create page-specific components in `src/components/[page-name]/`
3. Reuse UI components from `src/components/ui/`
4. Follow design tokens from `tailwind.config.js`
5. Maintain the editorial + geometric decoration style

When connecting to backend:

1. Create API service layer in `src/services/`
2. Replace mock data imports with API calls
3. Add loading states and error handling
4. Use React Query or SWR for data fetching (recommended)

---

Built with care for emotional wellness. 💜
