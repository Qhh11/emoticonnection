import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'rounded-full font-semibold transition-all duration-200 hover:scale-105 active:scale-95'

  const variants = {
    primary: 'bg-coral-500 text-white hover:bg-coral-600 shadow-soft',
    secondary: 'bg-vivid-300 text-vivid-600 hover:bg-vivid-400',
    ghost: 'bg-transparent text-text-dark hover:bg-text-dark hover:bg-opacity-5',
  }

  const sizes = {
    sm: 'px-5 py-2 text-sm',
    md: 'px-8 py-3 text-base',
    lg: 'px-10 py-4 text-lg',
  }

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
