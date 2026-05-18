'use client'

import { useState } from 'react'
import { AuditedUnderline } from '@/components/ui/AuditedUnderline'

/* ─── Types ───────────────────────────────────────────────────────────── */
type BudgetHealth = 'on-track' | 'warning' | 'over'

interface Budget {
  id: number
  category: string
  head: string
  allocated: number
  spent: number
  invoices: number
  health: BudgetHealth
  highlight?: boolean
}

/* ─── Data ────────────────────────────────────────────────────────────── */
const BUDGETS: Budget[] = [
  {
    id: 1,
    category: 'Cloud & Infrastructure',
    head: 'Cloud Compute',
    allocated: 180000,
    spent: 141600,
    invoices: 6,
    health: 'on-track',
    highlight: true,
  },
  {
    id: 2,
    category: 'Software & Subscriptions',
    head: 'Software',
    allocated: 60000,
    spent: 59904,
    invoices: 4,
    health: 'warning',
  },
  {
    id: 3,
    category: 'Telecom',
    head: 'Telecom',
    allocated: 36000,
    spent: 25488,
    invoices: 5,
    health: 'on-track',
  },
  {
    id: 4,
    category: 'Contractor Payments',
    head: 'Professional Fees',
    allocated: 480000,
    spent: 696000,
    invoices: 24,
    health: 'over',
  },
  {
    id: 5,
    category: 'Meals & Entertainment',
    head: 'Staff Meals',
    allocated: 24000,
    spent: 14880,
    invoices: 8,
    health: 'on-track',
  },
]

/* ─── Summary ─────────────────────────────────────────────────────────── */
const SUMMARY = [
  { label: 'Total Allocated',  value: '₹7,80,000', sub: 'FY 2025–26 Q4'    },
  { label: 'Total Spent',      value: '₹9,37,872', sub: '47 invoices'       },
  { label: 'Over Budget',      value: '₹1,57,872', sub: '1 category',       highlight: true },
  { label: 'On Track',         value: '3 of 5',    sub: 'categories'        },
]

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN')
}

function pct(spent: number, allocated: number) {
  return Math.round((spent / allocated) * 100)
}

/* ─── Health config ───────────────────────────────────────────────────── */
const HEALTH_MAP: Record<BudgetHealth, { label: string; color: string; bg: string; barColor: string }> = {
  'on-track': { label: 'On Track',  color: 'var(--green)',  bg: 'rgba(21,128,61,0.08)',  barColor: 'var(--green)'  },
  'warning':  { label: 'Near Limit', color: 'var(--amber)', bg: 'rgba(180,83,9,0.08)',   barColor: 'var(--amber)'  },
  'over':     { label: 'Over Budget', color: 'var(--error)', bg: 'rgba(163,56,46,0.10)', barColor: 'var(--error)'  },
}

/* ─── Eyebrow ─────────────────────────────────────────────────────────── */
function Eyebrow({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <span style={{
        width: 4, height: 4, borderRadius: '50%',
        background: 'var(--t40)', flexShrink: 0, display: 'inline-block',
      }} />
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
        letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--t40)',
      }}>
        {label}
      </span>
    </div>
  )
}

/* ─── Health badge ────────────────────────────────────────────────────── */
function HealthBadge({ health }: { health: BudgetHealth }) {
  const { label, color, bg } = HEALTH_MAP[health]
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
      letterSpacing: '0.04em', color, background: bg, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

/* ─── Spend bar — editorial rule, not a progress bar widget ──────────── */
function SpendBar({ spent, allocated, health }: { spent: number; allocated: number; health: BudgetHealth }) {
  const ratio = Math.min(spent / allocated, 1)
  const over  = spent > allocated
  const { barColor } = HEALTH_MAP[health]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Track */}
      <div style={{
        flex: 1, height: 2,
        background: 'var(--hair-2)',
        position: 'relative', overflow: 'visible',
      }}>
        {/* Fill */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: `${ratio * 100}%`,
          height: '100%',
          background: barColor,
          transition: 'width 600ms cubic-bezier(0.65,0,0.35,1)',
        }} />
        {/* Over-budget tick mark */}
        {over && (
          <div style={{
            position: 'absolute', top: -3, right: 0,
            width: 1, height: 8,
            background: 'var(--error)',
          }} />
        )}
      </div>
      {/* Pct label */}
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: health === 'on-track' ? 'var(--t40)' : barColor,
        flexShrink: 0, minWidth: 36, textAlign: 'right',
      }}>
        {pct(spent, allocated)}%
      </span>
    </div>
  )
}

/* ─── Add budget button ───────────────────────────────────────────────── */
function AddBudgetBtn() {
  const [hover, setHover] = useState(false)
  const [press, setPress] = useState(false)
  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false) }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        background: press ? '#053a22' : hover ? 'var(--accent-hover)' : 'var(--accent)',
        color: '#fafaf6', border: 'none', borderRadius: 8,
        padding: '10px 20px',
        fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
        letterSpacing: '0.025em', textTransform: 'uppercase', cursor: 'pointer',
        boxShadow: press
          ? 'inset 0 -1px 0 rgba(0,0,0,0.20)'
          : hover ? 'inset 0 1px 0 rgba(255,255,255,0.12)' : 'none',
        transition: 'background 180ms, box-shadow 180ms',
      }}
    >
      Set budget
    </button>
  )
}

/* ─── Table columns ───────────────────────────────────────────────────── */
const COLS   = ['Category', 'GST Head', 'Allocated', 'Spent', 'Remaining', 'Utilisation', 'Status']
const WIDTHS = ['1fr', '160px', '130px', '130px', '130px', '200px', '140px']

/* ─── Page ────────────────────────────────────────────────────────────── */
export default function BudgetsPage() {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const gridTemplate = WIDTHS.join(' ')

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 32px 80px' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-end',
        justifyContent: 'space-between', marginBottom: 40,
      }}>
        <div>
          <Eyebrow label="Budget Ledger · FY 2025–26 Q4" />
          <h1 style={{
            fontFamily: 'var(--font-body)', fontSize: 32, fontWeight: 400,
            color: 'var(--t100)', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1,
          }}>
            Budgets
          </h1>
        </div>
        {/* forest green mark #1 */}
        <AddBudgetBtn />
      </div>

      {/* Summary strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        borderTop: '2px solid var(--hair-2)', marginBottom: 48,
      }}>
        {SUMMARY.map((tile, i) => (
          <div key={tile.label} style={{
            padding: '22px 0',
            paddingRight: i < 3 ? 32 : 0,
            paddingLeft: i > 0 ? 32 : 0,
            borderRight: i < 3 ? '1px solid var(--hair)' : 'none',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
              letterSpacing: '0.10em', textTransform: 'uppercase',
              color: 'var(--t40)', marginBottom: 8,
            }}>
              {tile.label}
            </div>

            {tile.highlight ? (
              <div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 400,
                  fontVariantNumeric: 'tabular-nums', color: 'var(--error)',
                  letterSpacing: '-0.02em', lineHeight: 1,
                }}>
                  {tile.value}
                </div>
                {/* AuditedUnderline — once, under the over-budget figure */}
                <AuditedUnderline width={110} strokeWidth={2} delay={0.5} duration={0.6} />
              </div>
            ) : (
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 400,
                fontVariantNumeric: 'tabular-nums', color: 'var(--t100)',
                letterSpacing: '-0.02em', lineHeight: 1,
              }}>
                {tile.value}
              </div>
            )}

            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 12,
              color: 'var(--t40)', marginTop: tile.highlight ? 6 : 8,
            }}>
              {tile.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Budget ledger table */}
      <div style={{ borderTop: '1px solid var(--hair-2)' }}>

        {/* Header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: gridTemplate,
          gap: '0 20px', padding: '10px 16px',
          borderBottom: '1px solid var(--hair-2)',
        }}>
          {COLS.map(col => (
            <span key={col} style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
              letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--t40)',
            }}>
              {col}
            </span>
          ))}
        </div>

        {/* Data rows */}
        {BUDGETS.map((b, i) => {
          const remaining = b.allocated - b.spent
          const isOver    = remaining < 0
          return (
            <div
              key={b.id}
              onMouseEnter={() => setHoveredRow(b.id)}
              onMouseLeave={() => setHoveredRow(null)}
              style={{
                display: 'grid', gridTemplateColumns: gridTemplate,
                gap: '0 20px', padding: '16px 16px',
                background: hoveredRow === b.id
                  ? 'var(--accent-dim)'
                  : i % 2 === 1 ? 'var(--surface-2)' : 'transparent',
                borderBottom: '1px solid var(--hair)',
                alignItems: 'center',
                transition: 'background 120ms',
              }}
            >
              {/* Category */}
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: 14,
                fontWeight: 500, color: 'var(--t100)',
              }}>
                {b.category}
              </span>

              {/* GST Head */}
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--t60)',
              }}>
                {b.head}
              </span>

              {/* Allocated */}
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 13,
                fontVariantNumeric: 'tabular-nums', color: 'var(--t70)',
              }}>
                {fmt(b.allocated)}
              </span>

              {/* Spent */}
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 13,
                fontVariantNumeric: 'tabular-nums',
                fontWeight: b.highlight ? 500 : 400,
                color: isOver ? 'var(--error)' : 'var(--t100)',
              }}>
                {fmt(b.spent)}
              </span>

              {/* Remaining */}
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 13,
                fontVariantNumeric: 'tabular-nums',
                color: isOver ? 'var(--error)' : 'var(--t70)',
              }}>
                {isOver ? `−${fmt(Math.abs(remaining))}` : fmt(remaining)}
              </span>

              {/* Utilisation bar */}
              <SpendBar spent={b.spent} allocated={b.allocated} health={b.health} />

              {/* Status badge */}
              <HealthBadge health={b.health} />
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--t40)', letterSpacing: '0.08em',
        }}>
          5 BUDGET LINES · 47 INVOICES MAPPED
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--t40)', letterSpacing: '0.08em',
        }}>
          FY 2025–26 · Q4
        </span>
      </div>

    </div>
  )
}