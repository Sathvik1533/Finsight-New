'use client'

import { useState } from 'react'
import { AuditedUnderline } from '@/components/ui/AuditedUnderline'

/* ─── Types ───────────────────────────────────────────────────────────── */
type TDSStatus = 'deducted' | 'pending' | 'exempt'

interface Contractor {
  id: number
  name: string
  pan: string
  role: string
  ytdPaid: number
  tdsRate: number
  tdsDeducted: number
  invoices: number
  status: TDSStatus
  lastInvoice: string
  highlight?: boolean
}

/* ─── Data ────────────────────────────────────────────────────────────── */
const CONTRACTORS: Contractor[] = [
  {
    id: 1,
    name: 'Arjun Mehta',
    pan: 'ABCPM1234D',
    role: 'Full-stack Developer',
    ytdPaid: 384000,
    tdsRate: 10,
    tdsDeducted: 38400,
    invoices: 12,
    status: 'deducted',
    lastInvoice: '12 May 2026',
    highlight: true,
  },
  {
    id: 2,
    name: 'Priya Nair',
    pan: 'BCDPN5678E',
    role: 'UI/UX Designer',
    ytdPaid: 216000,
    tdsRate: 10,
    tdsDeducted: 21600,
    invoices: 8,
    status: 'deducted',
    lastInvoice: '8 May 2026',
  },
  {
    id: 3,
    name: 'Ravi Shankar',
    pan: 'CDESR9012F',
    role: 'Content Strategist',
    ytdPaid: 96000,
    tdsRate: 10,
    tdsDeducted: 0,
    invoices: 4,
    status: 'pending',
    lastInvoice: '1 May 2026',
  },
]

/* ─── Formatting ──────────────────────────────────────────────────────── */
function fmt(n: number): string {
  return '₹' + n.toLocaleString('en-IN')
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

/* ─── TDS status badge ────────────────────────────────────────────────── */
function TDSBadge({ status }: { status: TDSStatus }) {
  const map: Record<TDSStatus, { label: string; color: string; bg: string }> = {
    deducted: { label: 'TDS Deducted',  color: 'var(--green)',  bg: 'rgba(21,128,61,0.08)'  },
    pending:  { label: 'TDS Pending',   color: 'var(--amber)',  bg: 'rgba(180,83,9,0.08)'   },
    exempt:   { label: 'Exempt',        color: 'var(--t40)',    bg: 'rgba(13,31,23,0.05)'   },
  }
  const { label, color, bg } = map[status]
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

/* ─── Add contractor button ───────────────────────────────────────────── */
function AddContractorBtn() {
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
        color: '#fafaf6',
        border: 'none', borderRadius: 8,
        padding: '10px 20px',
        fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
        letterSpacing: '0.025em', textTransform: 'uppercase',
        cursor: 'pointer',
        boxShadow: press
          ? 'inset 0 -1px 0 rgba(0,0,0,0.20)'
          : hover ? 'inset 0 1px 0 rgba(255,255,255,0.12)' : 'none',
        transition: 'background 180ms, box-shadow 180ms',
      }}
    >
      Add contractor
    </button>
  )
}

/* ─── Action button ───────────────────────────────────────────────────── */
function ActionBtn({ label }: { label: string }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '3px 10px',
        border: '1px solid var(--hair-2)', borderRadius: 3,
        background: hover ? 'var(--surface-2)' : 'transparent',
        color: hover ? 'var(--t100)' : 'var(--t60)',
        fontFamily: 'var(--font-mono)', fontSize: 11,
        letterSpacing: '0.04em', cursor: 'pointer',
        transition: 'background 140ms, color 140ms',
      }}
    >
      {label}
    </button>
  )
}

/* ─── Summary strip ───────────────────────────────────────────────────── */
const SUMMARY = [
  { label: 'Total Contractors', value: '3',        sub: 'Active FY 2025–26'  },
  { label: 'Total Paid YTD',    value: '₹6,96,000', sub: '24 invoices'       },
  { label: 'TDS Deducted',      value: '₹60,000',  sub: '10% rate',          highlight: true },
  { label: 'TDS Pending',       value: '₹9,600',   sub: '1 contractor'       },
]

/* ─── Table columns ───────────────────────────────────────────────────── */
const COLS = ['Contractor', 'PAN', 'Role', 'YTD Paid', 'TDS Rate', 'TDS Deducted', 'Invoices', 'Status', 'Actions']
const WIDTHS = ['160px', '120px', '1fr', '130px', '80px', '130px', '80px', '150px', '120px']

/* ─── Page ────────────────────────────────────────────────────────────── */
export default function ContractorsPage() {
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
          <Eyebrow label="TDS Register · FY 2025–26" />
          <h1 style={{
            fontFamily: 'var(--font-body)', fontSize: 32, fontWeight: 400,
            color: 'var(--t100)', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1,
          }}>
            Contractors
          </h1>
        </div>
        {/* forest green mark #1 */}
        <AddContractorBtn />
      </div>

      {/* Summary strip — ledger separators, no card boxes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        borderTop: '2px solid var(--hair-2)',
        marginBottom: 48,
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
                  fontVariantNumeric: 'tabular-nums', color: 'var(--t100)',
                  letterSpacing: '-0.02em', lineHeight: 1,
                }}>
                  {tile.value}
                </div>
                {/* AuditedUnderline — once, under TDS Deducted (the verified obligation) */}
                <AuditedUnderline width={100} strokeWidth={2} delay={0.5} duration={0.6} />
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

      {/* TDS register table */}
      <div style={{ borderTop: '1px solid var(--hair-2)' }}>

        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: gridTemplate,
          gap: '0 16px', padding: '10px 16px',
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

        {/* Rows */}
        {CONTRACTORS.map((c, i) => (
          <div
            key={c.id}
            onMouseEnter={() => setHoveredRow(c.id)}
            onMouseLeave={() => setHoveredRow(null)}
            style={{
              display: 'grid', gridTemplateColumns: gridTemplate,
              gap: '0 16px', padding: '16px 16px',
              background: hoveredRow === c.id
                ? 'var(--accent-dim)'
                : i % 2 === 1 ? 'var(--surface-2)' : 'transparent',
              borderBottom: '1px solid var(--hair)',
              alignItems: 'center',
              transition: 'background 120ms',
            }}
          >
            {/* Name */}
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: 14,
              fontWeight: 500, color: 'var(--t100)',
            }}>
              {c.name}
            </span>

            {/* PAN */}
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 12,
              color: 'var(--t60)', letterSpacing: '0.06em',
            }}>
              {c.pan}
            </span>

            {/* Role */}
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--t70)',
            }}>
              {c.role}
            </span>

            {/* YTD Paid — highlight row gets underline */}
            {c.highlight ? (
              <div style={{ display: 'inline-block' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 14,
                  fontWeight: 500, fontVariantNumeric: 'tabular-nums',
                  color: 'var(--t100)', display: 'block',
                }}>
                  {fmt(c.ytdPaid)}
                </span>
              </div>
            ) : (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 13,
                fontVariantNumeric: 'tabular-nums', color: 'var(--t100)',
              }}>
                {fmt(c.ytdPaid)}
              </span>
            )}

            {/* TDS Rate */}
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--t70)',
            }}>
              {c.tdsRate}%
            </span>

            {/* TDS Deducted */}
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 13,
              fontVariantNumeric: 'tabular-nums',
              color: c.tdsDeducted === 0 ? 'var(--amber)' : 'var(--t100)',
              fontWeight: c.tdsDeducted === 0 ? 400 : 400,
            }}>
              {c.tdsDeducted === 0 ? '—' : fmt(c.tdsDeducted)}
            </span>

            {/* Invoices */}
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 13,
              fontVariantNumeric: 'tabular-nums', color: 'var(--t60)',
            }}>
              {c.invoices}
            </span>

            {/* Status */}
            <TDSBadge status={c.status} />

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6 }}>
              <ActionBtn label="VIEW" />
              <ActionBtn label="FORM 16" />
            </div>
          </div>
        ))}
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
          3 CONTRACTORS · TDS U/S 194C & 194J
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