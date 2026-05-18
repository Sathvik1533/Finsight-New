'use client'

import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { AuditedUnderline } from '@/components/ui/AuditedUnderline'

/* ─── Spend-by-month data ─────────────────────────────────────────────── */
const MONTHLY = [
  { month: 'Oct', spend: 42800, gst: 6120, itc: 4890 },
  { month: 'Nov', spend: 38200, gst: 5470, itc: 3980 },
  { month: 'Dec', spend: 51600, gst: 7380, itc: 5940 },
  { month: 'Jan', spend: 44900, gst: 6420, itc: 5100 },
  { month: 'Feb', spend: 39700, gst: 5680, itc: 4320 },
  { month: 'Mar', spend: 67400, gst: 9640, itc: 7820 },
  { month: 'Apr', spend: 58200, gst: 8320, itc: 6640 },
  { month: 'May', spend: 31400, gst: 4490, itc: 3580 },
]

/* ─── GST head breakdown ──────────────────────────────────────────────── */
const GST_HEADS = [
  { head: 'Cloud Compute',    amount: 6840,  pct: 37, rate: '18%', eligible: true  },
  { head: 'Telecom',          amount: 4320,  pct: 24, rate: '18%', eligible: true  },
  { head: 'Software',         amount: 3060,  pct: 17, rate: '18%', eligible: true  },
  { head: 'Payment Gateway',  amount: 2196,  pct: 12, rate: '18%', eligible: true  },
  { head: 'Staff Meals',      amount: 744,   pct:  4, rate: '18%', eligible: false },
  { head: 'Local Travel',     amount: 540,   pct:  3, rate: '5%',  eligible: false },
  { head: 'Groceries',        amount: 168,   pct:  1, rate: '5%',  eligible: false },
  { head: 'Banking Fee',      amount: 0,     pct:  0, rate: '—',   eligible: false },
]

/* ─── Quarter summary ─────────────────────────────────────────────────── */
const SUMMARY = [
  { label: 'Total Spend',    value: '₹3,73,200', sub: 'Q4 FY 2025–26'     },
  { label: 'GST Paid',       value: '₹53,520',   sub: '47 receipts'        },
  { label: 'ITC Claimable',  value: '₹28,370',   sub: '53% of GST paid', highlight: true },
  { label: 'Pending Review', value: '₹930',      sub: '3 receipts'         },
]

/* ─── Custom tooltip ──────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number; name: string }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--hair-2)',
      padding: '10px 14px',
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
    }}>
      <div style={{ color: 'var(--t40)', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: 'var(--t100)', marginBottom: 2 }}>
          {p.name === 'itc' ? 'ITC' : p.name === 'gst' ? 'GST' : 'Spend'}{' '}
          ₹{p.value.toLocaleString('en-IN')}
        </div>
      ))}
    </div>
  )
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

/* ─── Section label ───────────────────────────────────────────────────── */
function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      color: 'var(--t40)', marginBottom: 20,
    }}>
      {children}
    </div>
  )
}

/* ─── Export button ───────────────────────────────────────────────────── */
function ExportBtn({ label }: { label: string }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '7px 16px',
        border: '1px solid var(--hair-2)',
        borderRadius: 4,
        background: hover ? 'var(--surface-2)' : 'transparent',
        color: hover ? 'var(--t100)' : 'var(--t60)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'background 140ms, color 140ms',
      }}
    >
      {label}
    </button>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────── */
export default function ReportsPage() {
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 32px 80px' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-end',
        justifyContent: 'space-between', marginBottom: 40,
      }}>
        <div>
          <Eyebrow label="FY 2025–26 · Q4 Report" />
          <h1 style={{
            fontFamily: 'var(--font-body)', fontSize: 32, fontWeight: 400,
            color: 'var(--t100)', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1,
          }}>
            Reports
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ExportBtn label="Export PDF" />
          <ExportBtn label="CA Export" />
        </div>
      </div>

      {/* Summary tiles — ledger strip, no card boxes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        borderTop: '2px solid var(--hair-2)',
        marginBottom: 52,
      }}>
        {SUMMARY.map((tile, i) => (
          <div
            key={tile.label}
            style={{
              padding: '24px 0 24px',
              paddingRight: i < 3 ? 32 : 0,
              borderRight: i < 3 ? '1px solid var(--hair)' : 'none',
              paddingLeft: i > 0 ? 32 : 0,
            }}
          >
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
              letterSpacing: '0.10em', textTransform: 'uppercase',
              color: 'var(--t40)', marginBottom: 10,
            }}>
              {tile.label}
            </div>

            {tile.highlight ? (
              <div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 400,
                  fontVariantNumeric: 'tabular-nums', color: 'var(--t100)',
                  letterSpacing: '-0.02em', lineHeight: 1,
                }}>
                  {tile.value}
                </div>
                {/* AuditedUnderline — ONCE per screen, under ITC Claimable figure */}
                <AuditedUnderline width={110} strokeWidth={2} delay={0.5} duration={0.6} />
              </div>
            ) : (
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 400,
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

      {/* Main chart grid — 8fr / 4fr */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '8fr 4fr',
        gap: 48,
        marginBottom: 52,
      }}>

        {/* LEFT — Monthly spend area chart */}
        <div>
          <SectionLabel>Monthly Spend vs ITC · Oct 25 – May 26</SectionLabel>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={MONTHLY} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="var(--ink-canvas)" stopOpacity={0.07} />
                  <stop offset="100%" stopColor="var(--ink-canvas)" stopOpacity={0.00} />
                </linearGradient>
                <linearGradient id="itcFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#0a5938" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#0a5938" stopOpacity={0.00} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--hair)" strokeDasharray="0" />
              <XAxis
                dataKey="month"
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--t40)', letterSpacing: '0.08em' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--t40)' }}
                axisLine={false} tickLine={false}
                tickFormatter={v => `₹${(v/1000).toFixed(0)}k`}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone" dataKey="spend" name="spend"
                stroke="var(--ink-canvas)" strokeWidth={1.5}
                fill="url(#spendFill)" dot={false}
              />
              <Area
                type="monotone" dataKey="itc" name="itc"
                stroke="#0a5938" strokeWidth={1.5}
                fill="url(#itcFill)" dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Chart legend — editorial, typography-only */}
          <div style={{
            display: 'flex', gap: 24, marginTop: 16,
            paddingLeft: 4,
          }}>
            {[
              { color: 'var(--t100)', label: 'Total Spend' },
              { color: 'var(--accent)', label: 'ITC Claimable' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 20, height: 1.5, background: item.color, display: 'inline-block' }} />
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: 'var(--t40)', letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — GST by month bar chart */}
        <div>
          <SectionLabel>GST Paid by Month</SectionLabel>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={MONTHLY} margin={{ top: 4, right: 0, left: -24, bottom: 0 }} barSize={14}>
              <CartesianGrid vertical={false} stroke="var(--hair)" strokeDasharray="0" />
              <XAxis
                dataKey="month"
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--t40)', letterSpacing: '0.08em' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--t40)' }}
                axisLine={false} tickLine={false}
                tickFormatter={v => `₹${(v/1000).toFixed(0)}k`}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="gst" name="gst" fill="var(--t20)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GST head breakdown — full-width ledger table */}
      <div style={{ borderTop: '1px solid var(--hair-2)' }}>
        <SectionLabel>GST Breakdown by Head</SectionLabel>

        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 120px 80px 80px 160px',
          gap: '0 24px',
          padding: '8px 0 8px',
          borderBottom: '1px solid var(--hair-2)',
        }}>
          {['GST Head', 'Amount', 'Rate', '% of Total', 'Eligibility'].map(col => (
            <span key={col} style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
              letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--t40)',
            }}>
              {col}
            </span>
          ))}
        </div>

        {/* Rows */}
        {GST_HEADS.map((row, i) => (
          <HeadRow key={row.head} row={row} alt={i % 2 === 1} />
        ))}

        {/* Total row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 120px 80px 80px 160px',
          gap: '0 24px',
          padding: '14px 0',
          borderTop: '1px solid var(--hair-2)',
          marginTop: 2,
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--t100)', letterSpacing: '0.04em' }}>
            TOTAL
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: 'var(--t100)' }}>
            ₹17,868
          </span>
          <span />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--t100)' }}>
            100%
          </span>
          <span />
        </div>
      </div>

      {/* CA Export footer note */}
      <div style={{
        marginTop: 32,
        paddingTop: 20,
        borderTop: '1px solid var(--hair)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--t40)', letterSpacing: '0.06em',
        }}>
          GENERATED · 18 MAY 2026 · FY 2025–26 Q4
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--t40)', letterSpacing: '0.06em',
        }}>
          READY FOR CA REVIEW
        </span>
      </div>

    </div>
  )
}

/* ─── GST head row ────────────────────────────────────────────────────── */
function HeadRow({ row, alt }: {
  row: typeof GST_HEADS[0]; alt: boolean
}) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 120px 80px 80px 160px',
        gap: '0 24px',
        padding: '13px 0',
        background: hover ? 'var(--accent-dim)' : alt ? 'var(--surface-2)' : 'transparent',
        borderBottom: '1px solid var(--hair)',
        alignItems: 'center',
        transition: 'background 120ms',
      }}
    >
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--t100)' }}>
        {row.head}
      </span>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 13,
        fontVariantNumeric: 'tabular-nums',
        color: row.amount === 0 ? 'var(--t40)' : 'var(--t100)',
      }}>
        {row.amount === 0 ? '—' : `₹${row.amount.toLocaleString('en-IN')}`}
      </span>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--t60)',
      }}>
        {row.rate}
      </span>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--t60)',
      }}>
        {row.pct > 0 ? `${row.pct}%` : '—'}
      </span>
      <span style={{
        display: 'inline-flex', alignItems: 'center',
        fontFamily: 'var(--font-mono)', fontSize: 11,
        padding: '2px 8px', borderRadius: 4,
        color: row.eligible ? 'var(--green)' : 'var(--t40)',
        background: row.eligible ? 'rgba(21,128,61,0.08)' : 'rgba(13,31,23,0.05)',
      }}>
        {row.eligible ? 'ITC Eligible' : 'Not Eligible'}
      </span>
    </div>
  )
}