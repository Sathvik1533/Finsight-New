'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

interface BlurFadeProps {
  children: React.ReactNode
  delay?: number
  duration?: number
  yOffset?: number
  className?: string
  style?: React.CSSProperties
}

export function BlurFade({
  children,
  delay = 0,
  duration = 0.5,
  yOffset = 16,
  className,
  style,
}: BlurFadeProps) {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: yOffset, filter: 'blur(6px)' }}
      animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}
