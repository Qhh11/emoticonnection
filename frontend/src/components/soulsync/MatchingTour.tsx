import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import tourDialogue from '../../config/matchingTourDialogue.json'

interface TourStep {
  step: number
  target: string
  title: string
  text: string
}

interface MatchingTourProps {
  currentStep: number
}

export const TARGET_IDS: Record<string, string> = {
  syncMode: 'tour-sync-mode',
  yourRole: 'tour-your-role',
  whatYouNeed: 'tour-what-you-need',
  resonance: 'tour-resonance',
  intensity: 'tour-intensity',
  topic: 'tour-topic',
}

export default function MatchingTour({ currentStep }: MatchingTourProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  const steps = tourDialogue.tourSteps as TourStep[]
  const currentStepData = steps.find(s => s.step === currentStep)

  useEffect(() => {
    if (!currentStepData) return

    const targetId = TARGET_IDS[currentStepData.target]
    let cleanup: (() => void) | null = null

    // Retry mechanism to find element
    let retryCount = 0
    const maxRetries = 20

    const updateRect = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect(rect)
      }
    }

    const setupObserver = () => {
      const element = document.getElementById(targetId)

      if (!element) {
        if (retryCount < maxRetries) {
          retryCount++
          requestAnimationFrame(setupObserver)
        }
        return
      }

      // Use ResizeObserver to continuously monitor element size changes
      const resizeObserver = new ResizeObserver(() => updateRect(element))
      resizeObserver.observe(element)

      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })

      // Multiple position checks to ensure stability
      const timers = [
        setTimeout(() => updateRect(element), 100),
        setTimeout(() => updateRect(element), 300),
        setTimeout(() => updateRect(element), 600),
      ]

      // Also listen for scroll/resize events
      const handleUpdate = () => updateRect(element)
      window.addEventListener('scroll', handleUpdate, true)
      window.addEventListener('resize', handleUpdate)

      cleanup = () => {
        resizeObserver.disconnect()
        timers.forEach(clearTimeout)
        window.removeEventListener('scroll', handleUpdate, true)
        window.removeEventListener('resize', handleUpdate)
      }
    }

    // Clear old position, start finding element
    setTargetRect(null)
    requestAnimationFrame(setupObserver)

    return () => cleanup?.()
  }, [currentStep, currentStepData])

  if (!currentStepData || !targetRect) return null

  return createPortal(
    <div className="fixed inset-0 z-[99] pointer-events-none animate-in fade-in duration-300">
      {/* Large rounded highlight with soft glow - uses box-shadow for cutout effect */}
      <div
        className="absolute transition-all duration-500 ease-out"
        style={{
          top: targetRect.top - 16,
          left: targetRect.left - 16,
          width: targetRect.width + 32,
          height: targetRect.height + 32,
          borderRadius: '32px',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55), 0 0 60px rgba(255, 255, 255, 0.25)',
          outline: '3px solid rgba(255, 255, 255, 0.2)',
        }}
      />
    </div>,
    document.body
  )
}

// Helper to get the tour step text (used by Dashboard)
export function getTourStepText(step: number): string {
  const steps = tourDialogue.tourSteps as TourStep[]
  const stepData = steps.find(s => s.step === step)
  return stepData?.text || ''
}

export function getTotalTourSteps(): number {
  return tourDialogue.tourSteps.length
}
