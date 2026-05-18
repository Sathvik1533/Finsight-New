'use client'

import React from 'react'
import { motion, useInView } from 'framer-motion'

type AuditedUnderlineProps = {
  /** Width of the underline in px. Should match or slightly exceed the text above it. */
  width?: number
  /** Stroke thickness in px. Default 2.5 = fountain-pen weight. */
  strokeWidth?: number
  /** Ink color. Defaults to FinSight forest green (--accent). */
  color?: string
  /** Animation duration in seconds. Default 0.6 = a confident pen stroke, not slow. */
  duration?: number
  /** Delay in seconds before the stroke begins. Default 0.2. */
  delay?: number
  /** If true, animation triggers when scrolled into view. If false, on mount. */
  inViewTrigger?: boolean
}

/**
 * Audited Underline — FinSight's signature visual element.
 *
 * A hand-traced forest-green underline drawn beneath ONE critical number per
 * screen. Animates being drawn left-to-right on mount (or on scroll-into-view),
 * with a deliberate wobble and a small upward flick at the end — like a
 * Chartered Accountant running their pen under a verified figure.
 *
 * Rules:
 * - Use ONCE per screen, never decoratively
 * - Only under critical numbers (ITC totals, spend totals, the figure being verified)
 * - Never under headings, labels, or buttons
 */
export function AuditedUnderline({
  width         = 220,
  strokeWidth   = 2.5,
  color         = '#0a5938',
  duration      = 0.6,
  delay         = 0.2,
  inViewTrigger = false,
}: AuditedUnderlineProps) {
  const ref    = React.useRef<SVGSVGElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20px' })
  const shouldAnimate = inViewTrigger ? inView : true

  // Build a hand-traced path with deliberate irregularity.
  // SVG viewBox is 240×24, the path scales with `width`.
  // The path is a series of cubic Beziers with tiny vertical wobble (±0.8px)
  // and an upward flick at the end (the CA's pen lift).
  //
  // Coordinates designed so the visual line sits at y≈14 with wobble between
  // y=12.4 and y=15.2, ending with a flick up to y=8 at x=232.
  const path = `
    M 4,14
    C 24,13.5 44,14.7 64,14.2
    C 84,13.6 104,15.0 124,14.4
    C 144,13.9 164,14.8 184,14.0
    C 200,13.4 214,13.8 222,12.6
    L 232,8
  `.trim().replace(/\s+/g, ' ')

  return (
    <svg
      ref={ref}
      width={width}
      height={24}
      viewBox="0 0 240 24"
      role="presentation"
      aria-hidden="true"
      style={{
        display: 'block',
        overflow: 'visible',
        marginTop: 4,
      }}
    >
      <motion.path
        d={path}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={shouldAnimate ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
        transition={{
          pathLength: {
            duration,
            delay,
            ease: [0.65, 0, 0.35, 1],
          },
          opacity: {
            duration: 0.1,
            delay,
          },
        }}
      />
    </svg>
  )
}
