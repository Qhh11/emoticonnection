// 3D Avatar configuration
export interface Avatar3D {
  id: string
  name: string
  emotion: string
  description: string
  personality: string[]
  color: string
  modelPath: string
  isLocked: boolean
  exposure?: number
  environmentImage?: string
  shadowIntensity?: number
  skyboxImage?: string // Custom HDRI for specific avatar
}

export const AVATARS_3D: Avatar3D[] = [
  {
    id: 'bluey',
    name: 'Bluey',
    emotion: 'Sad',
    description: 'A gentle soul who understands the depths of melancholy and provides comfort in quiet moments.',
    personality: [
      'Empathetic listener',
      'Calming presence',
      'Deep emotional understanding',
      'Patient and supportive'
    ],
    color: '#3266B1',
    modelPath: new URL('../assets/3davatar/Bluey.glb', import.meta.url).href,
    isLocked: false
  },
  {
    id: 'blushy',
    name: 'Blushy',
    emotion: 'Awkward',
    description: 'Your companion through socially challenging moments, bringing warmth to uncomfortable situations.',
    personality: [
      'Relatable and humble',
      'Breaks tension with humor',
      'Non-judgmental',
      'Celebrates small victories'
    ],
    color: '#D278A3',
    modelPath: new URL('../assets/3davatar/Blushy.glb', import.meta.url).href,
    isLocked: false
  },
  {
    id: 'grumpy',
    name: 'Grumpy',
    emotion: 'Angry',
    description: 'A fiery spirit who validates your frustrations and helps channel anger productively.',
    personality: [
      'Honest and direct',
      'Protective energy',
      'Encourages boundaries',
      'Transforms anger into action'
    ],
    color: '#D32F2F',
    modelPath: new URL('../assets/3davatar/Grumpy.glb', import.meta.url).href,
    isLocked: false
  },
  {
    id: 'scaredy',
    name: 'Scaredy',
    emotion: 'Fear',
    description: 'A brave companion who faces fears alongside you, making anxiety feel less lonely.',
    personality: [
      'Acknowledges vulnerability',
      'Provides reassurance',
      'Courage in small steps',
      'Safety-focused'
    ],
    color: '#9381BA',
    modelPath: new URL('../assets/3davatar/Scaredy.glb', import.meta.url).href,
    isLocked: false
  },
  {
    id: 'snoozy',
    name: 'Snoozy',
    emotion: 'Bored',
    description: 'A dreamy presence that finds wonder in the mundane and sparks creativity during dull moments.',
    personality: [
      'Imaginative explorer',
      'Finds hidden beauty',
      'Encourages rest',
      'Transforms routine'
    ],
    color: '#4B4E91',
    modelPath: new URL('../assets/3davatar/Snoozy.glb', import.meta.url).href,
    isLocked: false
  },
  {
    id: 'sunny',
    name: 'Sunny',
    emotion: 'Joy',
    description: 'A radiant companion who amplifies happiness and helps you savor joyful moments.',
    personality: [
      'Enthusiastic celebrator',
      'Spreads positivity',
      'Grateful mindset',
      'Infectious energy'
    ],
    color: '#F9D849',
    modelPath: new URL('../assets/3davatar/Sunny.glb', import.meta.url).href,
    isLocked: false
  },
  {
    id: 'zippy',
    name: 'Zippy',
    emotion: 'Anxious',
    description: 'A steady presence who helps ground you when worry spirals, bringing calm to chaos.',
    personality: [
      'Grounding techniques',
      'Rational perspective',
      'Breathing exercises',
      'Present-moment focus'
    ],
    color: '#E67E22',
    modelPath: new URL('../assets/3davatar/Zippy.glb', import.meta.url).href,
    isLocked: false
  },
  {
    id: 'yucky',
    name: 'Yucky',
    emotion: 'Disgust',
    description: 'An honest friend who validates when something feels off and supports your boundaries.',
    personality: [
      'Authentic reactions',
      'Boundary advocate',
      'Gut-feeling validator',
      'Self-protection guide'
    ],
    color: '#66B04C',
    modelPath: new URL('../assets/3davatar/Yucky.glb', import.meta.url).href,
    isLocked: false
  },
  {
    id: 'sparkle',
    name: 'Sparkle',
    emotion: 'Envy',
    description: 'A motivating companion who transforms comparison into inspiration for personal growth.',
    personality: [
      'Growth-oriented',
      'Reframes comparison',
      'Celebrates uniqueness',
      'Aspiration coach'
    ],
    color: '#2BA8A4',
    modelPath: new URL('../assets/3davatar/Sparkle.glb', import.meta.url).href,
    isLocked: false,
    exposure: 1.2, // Mimicking higher HDRI intensity
    environmentImage: 'neutral',
    shadowIntensity: 0.8
  }
]
