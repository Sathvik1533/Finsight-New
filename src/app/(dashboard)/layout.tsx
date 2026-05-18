'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

/* ─── Nav model ──────────────────────────────────────────────────────── */
const NAV = [
  { label: 'Dashboard',     href: '/dashboard'    },
  { label: 'Receipts',      href: '/receipts'     },
  { label: 'Reports',       href: '/reports'      },
  { label: 'Contractors',   href: '/contractors'  },
  { label: 'Budgets',       href: '/budgets'      },
  { label: 'AI Assistant',  href: '/assistant'    },
]

/* ─── Quill nib SVG (monoline, hand-drawn feel) ──────────────────────── */
function QuillGlyph({ active }: { active: boolean }) {
  return (
    <motion.svg
      width={15} height={15} viewBox="0 0 16 16"
      fill="none"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <motion.path
        d="M 2.5 13.5 L 9 7 M 9 7 L 13.2 2.8 C 13.5 2.5 13.5 2 13.2 1.7 C 12.9 1.4 12.4 1.4 12.1 1.7 L 7.9 5.9 M 9 7 L 7.9 5.9 M 7.9 5.9 L 5.3 8.5 C 5 8.8 4.6 8.9 4.2 8.8 L 3.5 8.6 L 3 12 L 6.4 11.5 L 6.2 10.8 C 6.1 10.4 6.2 10 6.5 9.7 L 9 7"
        stroke={active ? 'var(--t100)' : 'var(--t40)'}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 1 }}
        animate={{ pathLength: active ? [0.92, 1] : 1 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      />
    </motion.svg>
  )
}

/* ─── Nav link with editorial hover (underscore drift) ───────────────── */
function NavLink({
  label, href, active, hoverDimmed,
  onHoverStart, onHoverEnd,
}: {
  label: string
  href: string
  active: boolean
  hoverDimmed: boolean
  onHoverStart: () => void
  onHoverEnd: () => void
}) {
  const [hover, setHover] = useState(false)

  return (
    <Link
      href={href}
      onMouseEnter={() => { setHover(true);  onHoverStart() }}
      onMouseLeave={() => { setHover(false); onHoverEnd()   }}
      style={{
        position: 'relative',
        padding: '6px 14px',
        textDecoration: 'none',
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        fontWeight: active ? 500 : 400,
        color: active ? 'var(--accent)' : (hover ? 'var(--t100)' : 'var(--t70)'),
        letterSpacing: hover ? '-0.005em' : '0em',
        opacity: hoverDimmed && !hover && !active ? 0.62 : 1,
        transition: [
          'color 180ms cubic-bezier(0.22, 1, 0.36, 1)',
          'letter-spacing 240ms cubic-bezier(0.22, 1, 0.36, 1)',
          'opacity 240ms cubic-bezier(0.22, 1, 0.36, 1)',
        ].join(', '),
        textShadow: active && hover ? '0 0 8px rgba(10,89,56,0.20)' : 'none',
      }}
    >
      {label}

      {/* Permanent 2px bottom border for active link */}
      {active && (
        <span style={{
          position: 'absolute',
          left: 14, right: 14, bottom: -22,
          height: 2,
          background: 'var(--accent)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Hover-only 1px underscore drift — left-to-right scaleX 0→1 / 1→0 on leave */}
      {!active && (
        <span style={{
          position: 'absolute',
          left: 14, right: 14, bottom: -20,
          height: 1,
          background: 'var(--accent)',
          transformOrigin: hover ? 'left center' : 'right center',
          transform: `scaleX(${hover ? 1 : 0})`,
          transition: 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1), transform-origin 0ms',
          pointerEvents: 'none',
        }} />
      )}
    </Link>
  )
}

/* ─── Brand mark with ink-blot hover ─────────────────────────────────── */
function BrandMark({ hoverDimmed }: { hoverDimmed: boolean }) {
  const [hover, setHover] = useState(false)
  return (
    <Link
      href="/dashboard"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textDecoration: 'none',
        fontFamily: 'var(--font-display)',
        fontSize: 20,
        fontWeight: 600,
        letterSpacing: hover ? '-0.022em' : '-0.025em',
        lineHeight: 1,
        opacity: hoverDimmed && !hover ? 0.62 : 1,
        transition: 'letter-spacing 240ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <span style={{
        color: hover ? '#051a10' : 'var(--t100)',
        transition: 'color 200ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}>
        Fin
      </span>
      <span style={{ color: 'var(--accent)' }}>
        Sight
      </span>
    </Link>
  )
}

/* ─── Primary CTA — "File a new entry" — the press ───────────────────── */
function FileEntryCTA({ hoverDimmed }: { hoverDimmed: boolean }) {
  const [hover, setHover] = useState(false)
  const [press, setPress] = useState(false)

  return (
    <Link href="/receipts" style={{ textDecoration: 'none' }}>
      <button
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => { setHover(false); setPress(false) }}
        onMouseDown={() => setPress(true)}
        onMouseUp={() => setPress(false)}
        style={{
          background: press ? '#053a22' : (hover ? 'var(--accent-hover)' : 'var(--accent)'),
          color: '#fafaf6',
          border: 'none',
          borderRadius: 8,
          padding: '9px 18px',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: hover ? '0.01em' : '0.02em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          opacity: hoverDimmed && !hover ? 0.62 : 1,
          boxShadow: press
            ? 'inset 0 -1px 0 rgba(0,0,0,0.20)'
            : (hover ? 'inset 0 1px 0 rgba(255,255,255,0.12)' : 'none'),
          transition: [
            'background 180ms cubic-bezier(0.22, 1, 0.36, 1)',
            'box-shadow 180ms cubic-bezier(0.22, 1, 0.36, 1)',
            'letter-spacing 200ms cubic-bezier(0.22, 1, 0.36, 1)',
            press ? 'background 90ms linear' : '',
            'opacity 240ms cubic-bezier(0.22, 1, 0.36, 1)',
          ].filter(Boolean).join(', '),
        }}
      >
        File a new entry
      </button>
    </Link>
  )
}

/* ─── Live ledger eyebrow (right side, typography-only) ──────────────── */
function LedgerEyebrow({ hoverDimmed }: { hoverDimmed: boolean }) {
  const [hover, setHover] = useState(false)
  const [time,  setTime]  = useState('14:23')

  // Update the IST timestamp every minute (subtle "alive" gesture)
  useEffect(() => {
    const tick = () => {
      const ist = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString()
      setTime(ist.substring(11, 16))
    }
    tick()
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        opacity: hoverDimmed && !hover ? 0.62 : 1,
        transition: 'opacity 240ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <AnimatePresence>
        {hover && (
          <motion.span
            key="dot"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.16 }}
            style={{
              width: 4, height: 4, borderRadius: '50%',
              background: 'var(--accent)',
              flexShrink: 0,
            }}
          />
        )}
      </AnimatePresence>

      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--t40)',
        whiteSpace: 'nowrap',
      }}>
        Ledger · 47 entries · {time} IST
      </span>

      {/* Tooltip caption (typography on canvas, no chrome) */}
      <AnimatePresence>
        {hover && (
          <motion.span
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'absolute',
              top: '100%', right: 0, marginTop: 8,
              fontFamily: 'var(--font-mono)',
              fontSize: 10, color: 'var(--t60)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            Last synced with Supabase 14m ago
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Account glyph dropdown ─────────────────────────────────────────── */
function AccountGlyph({ hoverDimmed }: { hoverDimmed: boolean }) {
  const [hover, setHover] = useState(false)
  const [open,  setOpen]  = useState(false)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onClick = () => setOpen(false)
    const id = setTimeout(() => document.addEventListener('click', onClick), 0)
    return () => { clearTimeout(id); document.removeEventListener('click', onClick) }
  }, [open])

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        aria-label="Account"
        style={{
          background: 'transparent',
          border: 'none',
          padding: 6,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: hoverDimmed && !hover ? 0.62 : 1,
          transition: 'opacity 240ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <QuillGlyph active={hover || open} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: 'calc(100% + 12px)', right: 0,
              minWidth: 200,
              background: 'var(--surface)',
              borderTop: '1px solid var(--hair-2)',
              padding: '12px 0',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--t70)',
            }}
          >
            <div style={{
              padding: '4px 18px 10px',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--t40)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              borderBottom: '1px solid var(--hair)',
              marginBottom: 8,
            }}>
              Sathvik · Freelancer
            </div>
            {[
              { label: 'Account settings' },
              { label: 'Connect my CA' },
              { label: 'Sign out' },
            ].map((item) => (
              <button
                key={item.label}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: 'transparent', border: 'none',
                  padding: '8px 18px', cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: 13, color: 'var(--t70)',
                  transition: 'color 160ms, background 160ms',
                }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--t100)'
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--t70)'
                }}
              >
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Layout ─────────────────────────────────────────────────────────── */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [hoverActive, setHoverActive] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Navbar — full-bleed, no rounded corners, bottom hairline only */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: 60,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--hair)',
      }}>
        <div style={{
          height: '100%',
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          gap: 32,
        }}>

          {/* LEFT — Brand mark */}
          <BrandMark hoverDimmed={hoverActive} />

          {/* CENTER — Nav links, with hover-dim signal across siblings */}
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flex: 1,
            justifyContent: 'center',
          }}>
            {NAV.map(({ label, href }) => {
              const isActive = href === '/dashboard'
                ? pathname === href
                : pathname.startsWith(href)
              return (
                <NavLink
                  key={href}
                  label={label}
                  href={href}
                  active={isActive}
                  hoverDimmed={hoverActive}
                  onHoverStart={() => setHoverActive(true)}
                  onHoverEnd={() => setHoverActive(false)}
                />
              )
            })}
          </nav>

          {/* RIGHT — Live ledger eyebrow + CTA + account glyph */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            flexShrink: 0,
          }}>
            <LedgerEyebrow hoverDimmed={hoverActive} />
            <FileEntryCTA  hoverDimmed={hoverActive} />
            <AccountGlyph  hoverDimmed={hoverActive} />
          </div>

        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>
    </div>
  )
}
