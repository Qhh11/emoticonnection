import { Heart, MessageCircle, BookOpen, Sparkles, Shield } from 'lucide-react'
import Card from '../ui/Card'
import Pill from '../ui/Pill'
import Section from '../ui/Section'

const features = [
  {
    icon: Heart,
    title: 'AI Emotional Support',
    description: 'Talk to an empathetic AI companion that understands your feelings without judgment.',
    pill: 'AI Chat',
    color: 'lavender' as const,
  },
  {
    icon: MessageCircle,
    title: 'Peer Chat',
    description: 'Connect with others who understand. Match based on shared emotions and experiences.',
    pill: 'Community',
    color: 'sky' as const,
  },
  {
    icon: BookOpen,
    title: 'Private Diary',
    description: 'A secure space for your thoughts. Write, reflect, and track your emotional journey.',
    pill: 'Personal',
    color: 'coral' as const,
  },
  {
    icon: Sparkles,
    title: 'Mood Hub',
    description: "Share your feelings anonymously and discover you're not alone in what you're experiencing.",
    pill: 'Anonymous',
    color: 'sunshine' as const,
  },
  {
    icon: Shield,
    title: 'Premium Insights',
    description: 'Unlock deeper emotional analytics, custom avatars, and exclusive features with VIP.',
    pill: 'VIP',
    color: 'mint' as const,
  },
]

export default function Features() {
  return (
    <Section id="features" spacing="xl" background="lavender">
      <div className="text-center space-y-6 mb-20">
        <Pill variant="neutral" size="md">
          Features
        </Pill>
        <h2 className="text-display-sm md:text-display lg:text-display-lg text-balance">
          Everything you need to feel{' '}
          <span className="text-lavender-600">supported</span>
        </h2>
        <p className="text-lg md:text-xl text-text-muted text-balance max-w-2xl mx-auto">
          A complete toolkit for emotional wellness, built with privacy and empathy at its core.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <Card key={index} hover padding="lg">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-${feature.color}-200 flex items-center justify-center`}
                  >
                    <Icon className={`w-7 h-7 text-${feature.color}-500`} strokeWidth={2} />
                  </div>
                  <Pill variant={feature.color} size="sm">
                    {feature.pill}
                  </Pill>
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">{feature.title}</h3>
                  <p className="text-text-muted leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </Section>
  )
}
