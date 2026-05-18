'use client'

import React from 'react'

type AuditedUnderlineProps = {
  /** Width of the underline in px. Should match or slightly exceed the text above it. */
  width?: number
  /** Stroke thickness in px. Default 2.5 = fountain-pen weight. */
  strokeWidth?: number
  /** Ink color. Defaults to verification vermillion. Two-color discipline:
   *  forest green = primary UI; vermillion = the ONE verification gesture. */
  color?: string
  /** Animation duration in seconds. Default 0.65 = a confident pen stroke, not slow. */
  duration?: number
  /** Delay in seconds before the stroke begins. Default 0.2. */
  delay?: number
}

/**
 * Audited Underline — FinSight's signature visual element.
 *
 * A hand-traced vermillion underline drawn beneath ONE critical number per
 * screen. Animates being drawn left-to-right on mount via CSS
 * stroke-dashoffset (more reliable than Framer's pathLength under SSR + headless
 * screenshot tools), with a deliberate wobble and a small upward flick at the
 * end — like a Chartered Accountant running their pen under a verified figure.
 *
 * Two-color discipline: forest green (#0a5938) is primary UI everywhere.
 * Vermillion (#b8341a) is ONLY this gesture, ONCE per screen. The colour
 * difference is what makes the verification feel like a separate act of ink.
 *
 * Rules:
 * - Use ONCE per screen, never decoratively
 * - Only under critical numbers (ITC totals, spend totals, the figure being verified)
 * - Never under headings, labels, or buttons
 */
export function AuditedUnderline({
  width       = 220,
  strokeWidth = 2.5,
  color       = '#b8341a',
  duration    = 0.65,
  delay       = 0.2,
}: AuditedUnderlineProps) {
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

  // The dash length is a generous upper bound on the path length.
  // The actual path is ~232 units long; 300 gives headroom for stroke joins
  // without leaving a visible end-of-path gap once draw completes.
  const dashLength = 300

  // Unique class per instance so multiple underlines on the same page
  // (shouldn't happen by the one-per-screen rule, but defensive) don't
  // collide via a shared keyframe name.
  const animId = React.useId().replace(/:/g, '')
  const keyframesName = `audited-draw-${animId}`

  return (
    <>
      <style>{`
        @keyframes ${keyframesName} {
          0%   { stroke-dashoffset: ${dashLength}; opacity: 0; }
          10%  { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
      `}</style>
      <svg
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
        <path
          d={path}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          style={{
            strokeDasharray: dashLength,
            strokeDashoffset: dashLength,
            animation: `${keyframesName} ${duration}s cubic-bezier(0.65, 0, 0.35, 1) ${delay}s forwards`,
          }}
        />
      </svg>
    </>
  )
}
