'use client'

import { useState } from 'react'
import { AuditedUnderline } from '@/components/ui/AuditedUnderline'

/* ─── Types ──────────────────────────────────────────────────────────── */
type ITCStatus = 'eligible' | 'not-eligible' | 'pending' | 'not-applicable'
type FilterKey  = 'all' | 'eligible' | 'pending' | 'month' | 'highvalue'

interface Receipt {
  id: number
  date: string
  merchant: string
  amount: number
  gst: number
  gstRate: string
  head: string
  status: ITCStatus
  highlight?: boolean
}

/* ─── Data ───────────────────────────────────────────────────────────── */
const RECEIPTS: Receipt[] = [
  { id: 1, date: '18 May', merchant: 'Airtel Business',   amount: 2124,  gst: 324,  gstRate: '18%', head: 'Telecom',          status: 'eligible'        },
  { id: 2, date: '17 May', merchant: 'AWS India',         amount: 11800, gst: 1800, gstRate: '18%', head: 'Cloud Compute',    status: 'eligible', highlight: true },
  { id: 3, date: '16 May', merchant: 'Zepto',             amount: 842,   gst: 42,   gstRate: '5%',  head: 'Groceries',        status: 'not-eligible'    },
  { id: 4, date: '15 May', merchant: 'Swiggy Business',   amount: 1240,  gst: 186,  gstRate: '18%', head: 'Staff Meals',      status: 'pending'         },
  { id: 5, date: '14 May', merchant: 'HDFC Bank',         amount: 0,     gst: 0,    gstRate: '—',   head: 'Banking Fee',      status: 'not-applicable'  },
  { id: 6, date: '13 May', merchant: 'Adobe Creative',    amount: 4992,  gst: 762,  gstRate: '18%', head: 'Software',         status: 'eligible'        },
  { id: 7, date: '12 May', merchant: 'Uber Business',     amount: 680,   gst: 0,    gstRate: '—',   head: 'Local Travel',     status: 'not-eligible'    },
  { id: 8, date: '11 May', merchant: 'Razorpay',          amount: 3600,  gst: 549,  gstRate: '18%', head: 'Payment Gateway',  status: 'eligible'        },
]

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',       label: 'All'           },
  { key: 'eligible',  label: 'ITC Eligible'  },
  { key: 'pending',   label: 'Pending Review'},
  { key: 'month',     label: 'This Month'    },
  { key: 'highvalue', label: 'High Value ₹5k+'},
]

function applyFilter(rows: Receipt[], filter: FilterKey): Receipt[] {
  if (filter === 'all')       return rows
  if (filter === 'eligible')  return rows.filter(r => r.status === 'eligible')
  if (filter === 'pending')   return rows.filter(r => r.status === 'pending')
  if (filter === 'month')     return rows  // all data is May
  if (filter === 'highvalue') return rows.filter(r => r.amount >= 5000)
  return rows
}

/* ─── Formatting ─────────────────────────────────────────────────────── */
function fmt(n: number): string {
  if (n === 0) return '₹0'
  return '₹' + n.toLocaleString('en-IN')
}

/* ─── Status badge ───────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: ITCStatus }) {
  const map: Record<ITCStatus, { label: string; color: string; bg: string }> = {
    'eligible':       { label: 'ITC Eligible',    color: 'var(--green)',  bg: 'rgba(21,128,61,0.08)'    },
    'not-eligible':   { label: 'Not Eligible',     color: 'var(--amber)',  bg: 'rgba(180,83,9,0.08)'     },
    'pending':        { label: 'Pending Review',   color: 'var(--accent)', bg: 'var(--accent-dim)'       },
    'not-applicable': { label: 'Not Applicable',   color: 'var(--t40)',    bg: 'rgba(13,31,23,0.05)'     },
  }
  const { label, color, bg } = map[status]
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: '0.04em',
      color,
      background: bg,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

/* ─── Amount cell — highlight row gets AuditedUnderline ─────────────── */
function AmountCell({ row }: { row: Receipt }) {
  if (!row.highlight) {
    return (
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 14,
        fontWeight: 400,
        fontVariantNumeric: 'tabular-nums',
        color: 'var(--t100)',
      }}>
        {fmt(row.amount)}
      </span>
    )
  }
  return (
    <div style={{ display: 'inline-block' }}>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 14,
        fontWeight: 500,
        fontVariantNumeric: 'tabular-nums',
        color: 'var(--t100)',
        display: 'block',
      }}>
        {fmt(row.amount)}
      </span>
      <AuditedUnderline width={76} strokeWidth={2} delay={0.4} duration={0.55} />
    </div>
  )
}

/* ─── Eyebrow ────────────────────────────────────────────────────────── */
function Eyebrow({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    }}>
      <span style={{
        width: 4, height: 4, borderRadius: '50%',
        background: 'var(--t40)',
        flexShrink: 0,
        display: 'inline-block',
      }} />
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--t40)',
      }}>
        {label}
      </span>
    </div>
  )
}

/* ─── Filter pill ────────────────────────────────────────────────────── */
function FilterPill({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '5px 14px',
        borderRadius: 4,
        border: active ? 'none' : '1px solid var(--hair-2)',
        background: active ? 'var(--accent)' : (hover ? 'var(--surface-2)' : 'transparent'),
        color: active ? '#fafaf6' : (hover ? 'var(--t100)' : 'var(--t60)'),
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        fontWeight: active ? 500 : 400,
        cursor: 'pointer',
        transition: 'background 160ms, color 160ms, border-color 160ms',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

/* ─── Action button ──────────────────────────────────────────────────── */
function ActionBtn({ label }: { label: string }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '3px 10px',
        border: '1px solid var(--hair-2)',
        borderRadius: 3,
        background: hover ? 'var(--surface-2)' : 'transparent',
        color: hover ? 'var(--t100)' : 'var(--t60)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: '0.04em',
        cursor: 'pointer',
        transition: 'background 140ms, color 140ms',
      }}
    >
      {label}
    </button>
  )
}

/* ─── Table columns ──────────────────────────────────────────────────── */
const COLS = ['Date', 'Merchant', 'Amount', 'GST', 'Head', 'ITC Status', 'Actions']
const COL_WIDTHS = ['80px', '1fr', '120px', '110px', '160px', '160px', '120px']

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function ReceiptsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)

  const rows = applyFilter(RECEIPTS, activeFilter)

  const gridTemplate = COL_WIDTHS.join(' ')

  return (
    <div style={{
      maxWidth: 1280,
      margin: '0 auto',
      padding: '48px 32px 80px',
    }}>

      {/* Page header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 32,
      }}>
        <div>
          <Eyebrow label="Ledger · 47 Entries" />
          <h1 style={{
            fontFamily: 'var(--font-body)',
            fontSize: 32,
            fontWeight: 400,
            color: 'var(--t100)',
            margin: 0,
            letterSpacing: '-0.01em',
            lineHeight: 1.1,
          }}>
            Receipts
          </h1>
        </div>

        {/* FILE A NEW ENTRY — forest green #1 */}
        <FileNewEntry />
      </div>

      {/* Filter pills */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 28,
        flexWrap: 'wrap',
      }}>
        {FILTERS.map(f => (
          <FilterPill
            key={f.key}
            label={f.label}
            active={activeFilter === f.key}
            onClick={() => setActiveFilter(f.key)}
          />
        ))}
      </div>

      {/* Ledger table */}
      <div style={{
        borderTop: '1px solid var(--hair-2)',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: gridTemplate,
          gap: '0 24px',
          padding: '10px 16px',
          borderBottom: '1px solid var(--hair-2)',
        }}>
          {COLS.map(col => (
            <span
              key={col}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: 'var(--t40)',
              }}
            >
              {col}
            </span>
          ))}
        </div>

        {/* Rows */}
        {rows.length === 0 && (
          <div style={{
            padding: '48px 16px',
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: 'var(--t40)',
            letterSpacing: '0.06em',
          }}>
            NO ENTRIES MATCH THIS FILTER
          </div>
        )}

        {rows.map((row, i) => (
          <div
            key={row.id}
            onMouseEnter={() => setHoveredRow(row.id)}
            onMouseLeave={() => setHoveredRow(null)}
            style={{
              display: 'grid',
              gridTemplateColumns: gridTemplate,
              gap: '0 24px',
              padding: '14px 16px',
              background: hoveredRow === row.id
                ? 'var(--accent-dim)'
                : i % 2 === 1
                  ? 'var(--surface-2)'
                  : 'transparent',
              borderBottom: '1px solid var(--hair)',
              alignItems: 'center',
              transition: 'background 120ms',
            }}
          >
            {/* Date */}
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--t40)',
              letterSpacing: '0.04em',
            }}>
              {row.date}
            </span>

            {/* Merchant */}
            <span style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--t100)',
              fontWeight: 400,
            }}>
              {row.merchant}
            </span>

            {/* Amount */}
            <AmountCell row={row} />

            {/* GST */}
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontVariantNumeric: 'tabular-nums',
              color: row.gst === 0 ? 'var(--t40)' : 'var(--t70)',
            }}>
              {row.gst === 0 ? '—' : `${fmt(row.gst)} (${row.gstRate})`}
            </span>

            {/* Head */}
            <span style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--t70)',
            }}>
              {row.head}
            </span>

            {/* ITC Status */}
            <StatusBadge status={row.status} />

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6 }}>
              <ActionBtn label="VIEW" />
              <ActionBtn label="EDIT" />
            </div>
          </div>
        ))}
      </div>

      {/* Footer count */}
      <div style={{
        marginTop: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--t40)',
          letterSpacing: '0.08em',
        }}>
          SHOWING {rows.length} OF 47 ENTRIES
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--t40)',
          letterSpacing: '0.08em',
        }}>
          FY 2025–26 · Q4
        </span>
      </div>

    </div>
  )
}

/* ─── FILE A NEW ENTRY button — forest green #2 ──────────────────────── */
function FileNewEntry() {
  const [hover, setHover] = useState(false)
  const [press, setPress] = useState(false)
  return (
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
        padding: '10px 20px',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: '0.025em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        boxShadow: press
          ? 'inset 0 -1px 0 rgba(0,0,0,0.20)'
          : (hover ? 'inset 0 1px 0 rgba(255,255,255,0.12)' : 'none'),
        transition: 'background 180ms, box-shadow 180ms',
      }}
    >
      File a new entry
    </button>
  )
}