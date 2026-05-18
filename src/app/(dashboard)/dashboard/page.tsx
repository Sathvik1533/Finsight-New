'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, animate } from 'framer-motion'
import { AuditedUnderline } from '@/components/ui/AuditedUnderline'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

/* ─────────────────────────────────────────────────────────────────────
   Demo data — hardcoded so the dashboard always reads as populated.
   When the Supabase layer rewires (Phase 6+), these become props.
   ──────────────────────────────────────────────────────────────────── */

const HERO = {
  recovered: 18240,
  receiptCount: 47,
  categoryCount: 12,
}

const STATS = [
  { label: 'Receipts',  value: '47',       sub: '+8 this week',     subTone: 'green' as const },
  { label: 'Pending',   value: '3',        sub: 'needs your review', subTone: 'amber' as const },
  { label: 'Tax saved', value: '₹3,283',  sub: 'this quarter',      subTone: 'mute'  as const },
]

const LEDGER_FEED = [
  { merchant: 'Airtel Business',  amount: 2124, itc: true,  ago: '14m' },
  { merchant: 'AWS India',        amount: 8499, itc: true,  ago: '1h'  },
  { merchant: 'Swiggy for Work',  amount: 412,  itc: false, ago: '2h'  },
  { merchant: 'Figma',            amount: 4100, itc: true,  ago: '3h'  },
  { merchant: 'Uber',             amount: 287,  itc: true,  ago: '5h'  },
  { merchant: 'Razorpay fee',     amount: 96,   itc: true,  ago: '6h'  },
]

const TREND_DATA = [
  { day: 'Feb 19', spend: 1800 },
  { day: 'Mar 01', spend: 3400 },
  { day: 'Mar 12', spend: 2900 },
  { day: 'Mar 23', spend: 5200 },
  { day: 'Apr 03', spend: 4600 },
  { day: 'Apr 14', spend: 6800 },
  { day: 'Apr 25', spend: 5900 },
  { day: 'May 06', spend: 7800 },
  { day: 'May 17', spend: 6400 },
]

const GST_HEADS = [
  { name: 'Telecom services',    pct: 28, top: true  },
  { name: 'Software & SaaS',     pct: 22, top: false },
  { name: 'Travel & Conveyance', pct: 18, top: false },
  { name: 'Food & Beverages',    pct: 8,  top: false },
  { name: 'Other',               pct: 24, top: false },
]

/* ─────────────────────────────────────────────────────────────────────
   Utilities
   ──────────────────────────────────────────────────────────────────── */

function inr(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/* Animated count-up for the hero number */
function useCountUp(to: number, duration = 1.4, delay = 0.15) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const controls = animate(0, to, {
      duration,
      delay,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setVal(Math.round(v)),
    })
    return () => controls.stop()
  }, [to, duration, delay])
  return val
}

/* ─── Eyebrow with the ● dot ─────────────────────────────────────────────
   The dot is PUNCTUATION, not an accent mark. Always var(--t40) muted ink.
   The 4-mark forest-green budget is reserved for real UI signals
   (active nav, primary CTA, the GST top category, etc.) — never for dots. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      color: 'var(--t40)',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: 'var(--t40)',
        flexShrink: 0,
        marginTop: 1,
      }} />
      <span>{children}</span>
    </p>
  )
}

/* ─── Live ticker — autoplays on mount, pauses on hover ──────────────── */
function LedgerTicker() {
  const [paused, setPaused] = useState(false)
  // Duplicate the data so the CSS animation loops seamlessly.
  const items = [...LEDGER_FEED, ...LEDGER_FEED]

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderTop: '1px solid var(--hair)',
        borderBottom: '1px solid var(--hair)',
        paddingTop: 18,
        paddingBottom: 18,
        maskImage: 'linear-gradient(90deg, transparent 0%, black 60px, black calc(100% - 60px), transparent 100%)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 60px, black calc(100% - 60px), transparent 100%)',
      }}
    >
      <motion.div
        animate={{ x: paused ? undefined : ['0%', '-50%'] }}
        transition={{
          duration: 46,
          ease: 'linear',
          repeat: Infinity,
        }}
        style={{
          display: 'flex',
          gap: 48,
          width: 'max-content',
        }}
      >
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            whiteSpace: 'nowrap',
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: item.itc ? 'var(--accent)' : 'var(--t20)',
              alignSelf: 'center',
              flexShrink: 0,
            }} />
            <span style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 400,
              color: 'var(--t100)',
            }}>
              {item.merchant}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              fontWeight: 400,
              color: 'var(--t70)',
              letterSpacing: '-0.01em',
            }}>
              {inr(item.amount)}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 400,
              color: 'var(--t40)',
              letterSpacing: '0.05em',
            }}>
              {item.ago} ago
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  )
}

/* ─── The page ─────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const recovered = useCountUp(HERO.recovered, 1.4, 0.25)
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div ref={ref} style={{
      maxWidth: 1280,
      margin: '0 auto',
      padding: '56px 32px 96px',
      fontFamily: 'var(--font-body)',
      color: 'var(--t100)',
    }}>

      {/* ════════ ROW 1 — Eyebrow + greeting ════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ marginBottom: 64 }}
      >
        <Eyebrow>Ledger · FY 2025-26</Eyebrow>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(32px, 4vw, 42px)',
          fontWeight: 500,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          color: 'var(--t100)',
          marginTop: 16,
        }}>
          {greeting()}, Sathvik.
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 16,
          fontWeight: 400,
          color: 'var(--t70)',
          marginTop: 10,
          lineHeight: 1.5,
          maxWidth: 540,
        }}>
          Here&rsquo;s where your ledger stands today.
        </p>
      </motion.section>

      {/* ════════ ROW 2 — 8 cols hero + 4 cols stat column ═════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 8fr) minmax(0, 4fr)',
          gap: 64,
          alignItems: 'start',
          marginBottom: 80,
        }}
      >

        {/* LEFT — hero figure. Flush-left composition. */}
        <div>
          <Eyebrow>ITC Recovered this year</Eyebrow>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'clamp(56px, 7vw, 76px)',
            fontWeight: 400,
            letterSpacing: '-0.04em',
            color: 'var(--t100)',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            margin: '20px 0 0',
          }}>
            {inr(recovered)}
          </p>
          {/* The ONE AuditedUnderline on this page — sits flush-left under the number.
              Animation runs once on mount, ~1.7s after the count-up settles. */}
          <div style={{ marginTop: 2 }}>
            <AuditedUnderline width={300} strokeWidth={3} delay={1.7} duration={0.65} />
          </div>

          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 400,
            color: 'var(--t70)',
            marginTop: 16,
            lineHeight: 1.5,
          }}>
            across {HERO.receiptCount} receipts · {HERO.categoryCount} categories
          </p>
        </div>

        {/* RIGHT — stat column. Single column, top-border separators only. */}
        <div>
          {STATS.map((s, i) => (
            <div key={s.label} style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 20,
              padding: '18px 0 18px',
              borderTop: i === 0 ? 'none' : '1px solid var(--hair)',
            }}>
              <div>
                <p style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'var(--t40)',
                }}>
                  {s.label}
                </p>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  fontWeight: 400,
                  color: s.subTone === 'green' ? 'var(--green-text)'
                    : s.subTone === 'amber' ? 'var(--amber)'
                    : 'var(--t60)',
                  marginTop: 6,
                  letterSpacing: '0.01em',
                }}>
                  {s.sub}
                </p>
              </div>
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 26,
                fontWeight: 400,
                letterSpacing: '-0.03em',
                color: 'var(--t100)',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
              }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

      </motion.section>

      {/* ════════ ROW 3 — Live Ledger Feed (horizontal ticker) ═════════ */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
        style={{ marginBottom: 80 }}
      >
        <div style={{ marginBottom: 14 }}>
          <Eyebrow>Ledger activity</Eyebrow>
        </div>
        <LedgerTicker />
      </motion.section>

      {/* ════════ ROW 4 — Trend (8) + Top GST Heads (4) ════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 8fr) minmax(0, 4fr)',
          gap: 64,
          alignItems: 'start',
        }}
      >

        {/* LEFT — Spending trend (ink stroke, ink-tinted fill — NOT vermillion/green) */}
        <div>
          <div style={{ marginBottom: 18, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Eyebrow>Spending · 90 days</Eyebrow>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 400,
              color: 'var(--t40)',
              letterSpacing: '0.05em',
            }}>
              ₹44,800 total
            </span>
          </div>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND_DATA} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#0d1f17" stopOpacity={0.10} />
                    <stop offset="100%" stopColor="#0d1f17" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'rgba(13,31,23,0.40)' }}
                  axisLine={false}
                  tickLine={false}
                  interval={1}
                />
                <YAxis
                  tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'rgba(13,31,23,0.40)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--hair-2)',
                    borderRadius: 6,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--t100)',
                    boxShadow: '0 4px 12px rgba(13,31,23,0.06)',
                  }}
                  labelStyle={{ color: 'var(--t40)', fontSize: 10 }}
                  formatter={(v) => [inr(Number(v)), 'Spend'] as [string, string]}
                />
                <Area
                  type="monotone"
                  dataKey="spend"
                  stroke="var(--t100)"
                  strokeWidth={1.5}
                  fill="url(#trend-fill)"
                  dot={false}
                  activeDot={{ r: 3, fill: 'var(--t100)', stroke: 'var(--bg)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RIGHT — Top GST Heads. Ledger-row treatment, not progress bars. */}
        <div>
          <div style={{ marginBottom: 18 }}>
            <Eyebrow>Top GST heads</Eyebrow>
          </div>
          <div>
            {GST_HEADS.map((g, i) => (
              <div key={g.name} style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 12,
                padding: '14px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--hair)',
              }}>
                <span style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  fontWeight: g.top ? 500 : 400,
                  color: g.top ? 'var(--accent)' : 'var(--t70)',
                  letterSpacing: '-0.005em',
                }}>
                  {g.name}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  fontWeight: 400,
                  color: g.top ? 'var(--accent)' : 'var(--t70)',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.01em',
                }}>
                  {g.pct}%
                </span>
              </div>
            ))}
            <div style={{
              borderTop: '1px solid var(--hair-2)',
              marginTop: 6,
              paddingTop: 14,
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--t40)',
              }}>
                Total
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                fontWeight: 400,
                color: 'var(--t100)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                100%
              </span>
            </div>
          </div>
        </div>

      </motion.section>
    </div>
  )
}
