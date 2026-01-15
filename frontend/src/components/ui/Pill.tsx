import { ReactNode } from 'react'

interface PillProps {
  variant?: 'vivid' | 'royal' | 'coral' | 'sunny' | 'fresh' | 'dark' | 'neutral'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  className?: string
}

export default function Pill({
  variant = 'neutral',
  size = 'md',
  children,
  className = '',
}: PillProps) {
  const variants = {
    vivid: 'bg-vivid-200 text-vivid-600',    // Anxiety, primary brand
    royal: 'bg-royal-200 text-royal-600',    // Sadness
    coral: 'bg-coral-200 text-coral-600',    // Anger, Confusion
    sunny: 'bg-sunny-200 text-sunny-600',    // Happiness, Fatigue
    fresh: 'bg-fresh-200 text-fresh-600',    // Calm
    dark: 'bg-dark-200 text-dark-600',       // Neutral dark
    neutral: 'bg-text-dark bg-opacity-10 text-text-dark',
  }

  const sizes = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-1.5 text-sm',
    lg: 'px-5 py-2 text-base',
  }

  return (
    <span
      className={`inline-block rounded-full font-medium ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  )
}
