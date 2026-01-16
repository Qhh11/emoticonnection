interface DecorProps {
  type: 'circle' | 'blob' | 'sparkle' | 'line'
  color?: 'vivid' | 'royal' | 'coral' | 'sunny' | 'fresh' | 'lavender' | 'sky' | 'sunshine' | 'mint'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  animated?: boolean
}

export default function Decor({
  type,
  color = 'vivid',
  size = 'md',
  className = '',
  animated = true,
}: DecorProps) {
  const colors = {
    vivid: 'bg-vivid-300',
    royal: 'bg-royal-300',
    coral: 'bg-coral-300',
    sunny: 'bg-sunny-300',
    fresh: 'bg-fresh-300',
    lavender: 'bg-purple-300',
    sky: 'bg-sky-300',
    sunshine: 'bg-yellow-300',
    mint: 'bg-emerald-300',
  }

  const sizes = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-40 h-40',
    xl: 'w-64 h-64',
  }

  const animation = animated ? 'animate-float' : ''

  if (type === 'circle') {
    return (
      <div
        className={`rounded-full ${colors[color]} ${sizes[size]} ${animation} ${className}`}
        style={{ opacity: 0.3 }}
      />
    )
  }

  if (type === 'blob') {
    return (
      <div
        className={`${colors[color]} ${sizes[size]} ${animation} ${className}`}
        style={{
          borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
          opacity: 0.25,
        }}
      />
    )
  }

  if (type === 'sparkle') {
    return (
      <svg
        className={`${sizes[size]} ${animation} ${className}`}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 0L13.5 8.5L18 7L14 12L22 12L14 17L18 22L13.5 15.5L12 24L10.5 15.5L6 22L10 17L2 12L10 12L6 7L10.5 8.5L12 0Z"
          className={`${color === 'vivid' ? 'fill-vivid-400' :
              color === 'royal' ? 'fill-royal-400' :
                color === 'coral' ? 'fill-coral-400' :
                  color === 'sunny' ? 'fill-sunny-400' :
                    color === 'fresh' ? 'fill-fresh-400' :
                      color === 'lavender' ? 'fill-purple-400' :
                        color === 'sky' ? 'fill-sky-400' :
                          color === 'sunshine' ? 'fill-yellow-400' :
                            'fill-emerald-400'
            }`}
          opacity="0.4"
        />
      </svg>
    )
  }

  if (type === 'line') {
    return (
      <svg
        className={`${sizes[size]} ${className}`}
        viewBox="0 0 200 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 10 50 Q 50 20, 100 50 T 190 50"
          stroke={
            color === 'vivid' ? '#D8B4FE' :
              color === 'royal' ? '#5B8DEE' :
                color === 'coral' ? '#FFB1A8' :
                  color === 'sunny' ? '#FDE047' :
                    color === 'fresh' ? '#86EFAC' :
                      color === 'lavender' ? '#D8B4FE' :
                        color === 'sky' ? '#7DD3FC' :
                          color === 'sunshine' ? '#FDE047' :
                            '#6EE7B7'
          }
          strokeWidth="2"
          strokeDasharray="5,5"
          fill="none"
          opacity="0.5"
        />
      </svg>
    )
  }

  return null
}
