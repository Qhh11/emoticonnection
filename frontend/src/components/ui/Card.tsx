import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  padding?: 'sm' | 'md' | 'lg'
}

export default function Card({
  children,
  className = '',
  hover = false,
  padding = 'md',
}: CardProps) {
  const paddings = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  const hoverStyles = hover
    ? 'transition-all duration-300 hover:shadow-soft-lg hover:-translate-y-1'
    : ''

  return (
    <div
      className={`bg-white rounded-3xl shadow-soft ${paddings[padding]} ${hoverStyles} ${className}`}
    >
      {children}
    </div>
  )
}
