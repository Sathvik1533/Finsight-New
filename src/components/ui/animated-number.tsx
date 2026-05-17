'use client'

import { useEffect, useRef } from 'react'
import { useInView, useMotionValue, useSpring, animate } from 'framer-motion'

interface AnimatedNumberProps {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
  style?: React.CSSProperties
}

export function AnimatedNumber({
  value,
  duration = 1.2,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
  style,
}: AnimatedNumberProps) {
  const ref      = useRef<HTMLSpanElement>(null)
  const motVal   = useMotionValue(0)
  const spring   = useSpring(motVal, { duration: duration * 1000, bounce: 0 })
  const inView   = useInView(ref, { once: true, margin: '-20px' })

  useEffect(() => {
    if (inView) motVal.set(value)
  }, [inView, value, motVal])

  useEffect(() => {
    const unsub = spring.on('change', (v) => {
      if (ref.current) {
        const formatted = decimals > 0
          ? v.toFixed(decimals)
          : Math.round(v).toLocaleString('en-IN')
        ref.current.textContent = `${prefix}${formatted}${suffix}`
      }
    })
    return unsub
  }, [spring, prefix, suffix, decimals])

  return (
    <span ref={ref} className={className} style={style}>
      {prefix}0{suffix}
    </span>
  )
}
