import { ReactNode } from 'react'

interface SectionProps {
  children: ReactNode
  className?: string
  spacing?: 'sm' | 'md' | 'lg' | 'xl'
  background?: 'transparent' | 'vivid' | 'royal' | 'coral' | 'sunny' | 'fresh' | 'dark' | 'paper'
  id?: string
}

export default function Section({
  children,
  className = '',
  spacing = 'lg',
  background = 'transparent',
  id,
}: SectionProps) {
  const spacings = {
    sm: 'py-12 md:py-16',
    md: 'py-16 md:py-24',
    lg: 'py-24 md:py-32',
    xl: 'py-32 md:py-40',
  }

  const backgrounds = {
    transparent: '',
    vivid: 'gradient-wash-vivid',
    royal: 'gradient-wash-royal',
    coral: 'gradient-wash-coral',
    sunny: 'gradient-wash-sunny',
    fresh: 'gradient-wash-fresh',
    dark: 'gradient-wash-dark',
    paper: 'gradient-wash-paper',
  }

  return (
    <section id={id} className={`${spacings[spacing]} ${backgrounds[background]} ${className}`}>
      <div className="container mx-auto px-6 md:px-12 lg:px-20 max-w-7xl">
        {children}
      </div>
    </section>
  )
}
