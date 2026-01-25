import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

interface NavItemData {
  id: string
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}

interface FisheyeSidebarProps {
  items: NavItemData[]
  onLogout: () => void
  logoutIcon: React.ReactNode
}

export default function FisheyeSidebar({ items, onLogout, logoutIcon }: FisheyeSidebarProps) {
  const sidebarRef = useRef<HTMLElement>(null)
  const mouseY = useMotionValue(Infinity)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (sidebarRef.current) {
      const rect = sidebarRef.current.getBoundingClientRect()
      mouseY.set(e.clientY - rect.top)
    }
  }

  const handleMouseLeave = () => {
    mouseY.set(Infinity)
  }

  return (
    <aside
      ref={sidebarRef}
      className="fixed left-0 top-0 h-screen w-20 md:w-24 bg-white/80 backdrop-blur-xl border-r border-black/[0.03] flex flex-col items-center py-12 z-50 shadow-sm"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <nav className="flex-1 flex flex-col items-center justify-center space-y-6">
        {items.map((item) => (
          <FisheyeNavItem
            key={item.id}
            item={item}
            mouseY={mouseY}
          />
        ))}
      </nav>

      <motion.button
        onClick={onLogout}
        className="mt-auto text-gray-300 hover:text-accent transition-colors p-3"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {logoutIcon}
      </motion.button>
    </aside>
  )
}

interface FisheyeNavItemProps {
  item: NavItemData
  mouseY: ReturnType<typeof useMotionValue<number>>
}

function FisheyeNavItem({ item, mouseY }: FisheyeNavItemProps) {
  const ref = useRef<HTMLButtonElement>(null)

  // Calculate distance from mouse to this item's center
  const distance = useTransform(mouseY, (val) => {
    if (!ref.current || val === Infinity) return 150 // Far away when mouse not in sidebar

    const rect = ref.current.getBoundingClientRect()
    const itemCenterY = rect.top + rect.height / 2
    const sidebarTop = ref.current.closest('aside')?.getBoundingClientRect().top || 0
    const relativeItemCenter = itemCenterY - sidebarTop

    return Math.abs(val - relativeItemCenter)
  })

  // Map distance to scale: closer = bigger (1.0 to 1.5)
  const baseSize = 56 // 14 * 4 = 56px (w-14)
  const maxSize = 72 // Maximum size when hovered

  const size = useSpring(
    useTransform(distance, [0, 100, 200], [maxSize, baseSize + 8, baseSize]),
    { stiffness: 400, damping: 25 }
  )

  const iconScale = useSpring(
    useTransform(distance, [0, 100, 200], [1.3, 1.1, 1]),
    { stiffness: 400, damping: 25 }
  )

  return (
    <motion.button
      ref={ref}
      onClick={item.onClick}
      className={`relative group flex items-center justify-center rounded-2xl transition-colors ${
        item.active
          ? 'bg-accent text-accent-inverse shadow-xl'
          : 'text-gray-300 hover:text-accent bg-transparent hover:bg-gray-50'
      }`}
      style={{
        width: size,
        height: size,
      }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div style={{ scale: iconScale }}>
        {item.icon}
      </motion.div>

      {/* Tooltip */}
      <span className="absolute left-full ml-4 px-3 py-1.5 bg-accent text-accent-inverse text-xs font-bold rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 capitalize shadow-lg">
        {item.label}
      </span>

      {/* Active indicator dot */}
      {item.active && (
        <motion.div
          className="absolute -right-1 w-2 h-2 bg-accent rounded-full"
          layoutId="activeIndicator"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </motion.button>
  )
}
