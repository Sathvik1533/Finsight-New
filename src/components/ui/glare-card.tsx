'use client'

import { useRef, useState } from 'react'

interface GlareCardProps {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

export function GlareCard({ children, style, className }: GlareCardProps) {
  const cardRef  = useRef<HTMLDivElement>(null)
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setGlare({ x, y, opacity: 0.12 })
  }

  const handleMouseLeave = () => setGlare(g => ({ ...g, opacity: 0 }))

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
    >
      {/* Glare overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 10,
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity}) 0%, transparent 60%)`,
          transition: 'opacity 200ms ease',
          borderRadius: 'inherit',
        }}
      />
      {children}
    </div>
  )
}
