import { Lock, Eye, Shield } from 'lucide-react'
import Section from '../ui/Section'
import Pill from '../ui/Pill'
import Decor from '../ui/Decor'

const safetyFeatures = [
  {
    icon: Lock,
    title: 'End-to-End Privacy',
    description: 'Your data is encrypted and never shared. What you say here stays here.',
  },
  {
    icon: Eye,
    title: 'Anonymous by Default',
    description: 'Choose when to reveal your identity. Stay completely anonymous in community spaces.',
  },
  {
    icon: Shield,
    title: 'No Judgment Zone',
    description: 'A moderated space where kindness is required and empathy is the default.',
  },
]

export default function Safety() {
  return (
    <Section id="safety" spacing="xl" background="mint">
      <div className="relative">
        {/* Decorative elements */}
        <Decor
          type="circle"
          color="mint"
          size="lg"
          className="absolute -top-16 -right-16 animate-float"
        />
        <Decor
          type="sparkle"
          color="coral"
          size="md"
          className="absolute -bottom-8 -left-8"
        />

        <div className="text-center space-y-6 mb-20 relative z-10">
          <Pill variant="mint" size="md">
            Safety First
          </Pill>
          <h2 className="text-display-sm md:text-display lg:text-display-lg text-balance">
            Your emotional safety is our{' '}
            <span className="text-mint-600">priority</span>
          </h2>
          <p className="text-lg md:text-xl text-text-muted text-balance max-w-2xl mx-auto">
            We've designed every feature with your privacy, security, and wellbeing in mind.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12 relative z-10">
          {safetyFeatures.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div key={index} className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-3xl bg-white shadow-soft flex items-center justify-center">
                    <Icon className="w-10 h-10 text-mint-600" strokeWidth={2} />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold">{feature.title}</h3>
                  <p className="text-text-muted text-lg leading-relaxed">{feature.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Dotted connector line */}
        <div className="hidden md:block absolute top-1/2 left-0 right-0 -translate-y-1/2 -z-10">
          <Decor type="line" color="mint" size="xl" className="w-full" />
        </div>
      </div>
    </Section>
  )
}
