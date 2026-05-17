'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, AlertTriangle, X, FileDown, Receipt,
  ArrowUpRight, Zap, TrendingUp, IndianRupee,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

import { ReceiptUploadModal } from '@/components/upload/ReceiptUploadModal'
import { BudgetAlerts } from '@/components/dashboard/BudgetAlerts'
import { exportExpenseReport } from '@/lib/export-pdf'
import { createClient } from '@/lib/supabase/client'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { GlareCard } from '@/components/ui/glare-card'
import { BlurFade } from '@/components/ui/blur-fade'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { toast } from 'sonner'

type Kpis = {
  activeContractors: number; highRiskContractors: number
  paymentsAtRisk: string; paymentsAtRiskRaw: number; avgRiskScore: number
  totalSpend: string; transactions: number; topCategory: string; topCategoryAmount: string
}
type Tx = {
  id: string; merchant: string; category: string; amount: number; date: string
  gst_head: string | null; gst_rate: string | null; itc_eligible: boolean
}
type Summary = {
  kpis: Kpis
  spendChart: { month: string; amount: number }[]
  transactions: Tx[]
}
type Alert = {
  contractor_id: string; contractor_name: string; alert_text: string
  amount_at_risk: number; days_inactive: number
}

const EASE = [0.22, 1, 0.36, 1] as const
const up = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: EASE },
})

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
function inr(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// Category chip colours
const CAT_COLORS: Record<string, string> = {
  'Food & Dining':    '#f97316',
  'Travel':           '#3b82f6',
  'Office Supplies':  '#8b5cf6',
  'Software':         '#06b6d4',
  'Marketing':        '#ec4899',
  'Utilities':        '#10b981',
  'Healthcare':       '#ef4444',
  'Entertainment':    '#f59e0b',
}
function catColor(cat: string) { return CAT_COLORS[cat] ?? '#f0b429' }

// ── Skeleton pulse ────────────────────────────────────────────────────────────
function Pulse({ w = '100%', h = 20, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg, var(--surface) 0px, var(--surface-2) 150px, var(--surface) 300px)',
      backgroundSize: '600px 100%',
      animation: 'skeleton-sweep 1.6s ease-in-out infinite',
    }} />
  )
}

// ── Chart tooltip ─────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface-3)', border: '1px solid var(--hair-2)',
      borderRadius: 8, padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t30)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--gold)' }}>
        {inr(payload[0].value)}
      </p>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [summary, setSummary]              = useState<Summary | null>(null)
  const [alerts, setAlerts]                = useState<Alert[]>([])
  const [dismissed, setDismissed]          = useState(false)
  const [loading, setLoading]              = useState(true)
  const [loadError, setLoadError]          = useState<string | null>(null)
  const [uploadOpen, setUploadOpen]        = useState(false)
  const [chartDays, setChartDays]          = useState<30 | 60 | 90>(90)
  const [firstName, setFirstName]          = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? ''
      const raw   = email.split('@')[0].split(/[._]/)[0]
      setFirstName(raw.charAt(0).toUpperCase() + raw.slice(1))
    })
  }, [])

  const fetchAll = useCallback(async (days: 30 | 60 | 90 = 30) => {
    setLoading(true); setLoadError(null)
    try {
      const [sRes, aRes] = await Promise.all([
        fetch(`/api/dashboard/summary?days=${days}`),
        fetch('/api/risk/alerts'),
      ])
      if (sRes.status === 401) { router.push('/auth'); return }
      if (!sRes.ok) throw new Error('Failed to load')
      setSummary(await sRes.json())
      if (aRes.ok) setAlerts(await aRes.json())
    } catch (e: any) {
      setLoadError(e?.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchAll(chartDays) }, [fetchAll, chartDays])

  const kpis   = summary?.kpis
  const spend  = kpis?.totalSpend ?? '₹0'
  const count  = kpis?.transactions ?? 0
  const topCat = kpis?.topCategory ?? '—'
  const topAmt = kpis?.topCategoryAmount ?? '₹0'
  const isEmpty = count === 0

  // ITC = total amount on ITC-eligible receipts × avg GST rate (simplified: sum eligible amounts)
  const itcEligibleTx = (summary?.transactions ?? []).filter((t) => t.itc_eligible)
  const itcTotal = itcEligibleTx.reduce((s, t) => s + (t.amount ?? 0), 0)
  const itcCount = itcEligibleTx.length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>

      {/* Ambient glow — top right */}
      <div style={{
        position: 'fixed', top: -200, right: -200, width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(240,180,41,0.05) 0%, transparent 65%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1160, margin: '0 auto', padding: '44px 32px 80px' }}>

        {/* ── Hero greeting ──────────────────────────────────────────────── */}
        <BlurFade delay={0} duration={0.6} style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <p style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'var(--gold)', marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block' }} />
                {greeting()}{firstName ? `, ${firstName}` : ''}
              </p>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
                fontWeight: 300,
                letterSpacing: '-0.045em',
                lineHeight: 1.08,
                color: 'var(--t100)',
                marginBottom: 14,
              }}>
                {isEmpty
                  ? <>Your financial<br /><span style={{ color: 'var(--gold)' }}>intelligence</span> starts here.</>
                  : <>You&apos;ve spent <span style={{ color: 'var(--gold)' }}>{spend}</span><br />this month.</>}
              </h1>
              <p style={{ fontSize: 14, color: 'var(--t40)', lineHeight: 1.5, maxWidth: 480 }}>
                {isEmpty
                  ? 'Upload a receipt and FinSight will extract every line item, detect GST, and categorise it in under 2 seconds.'
                  : `${count} receipt${count !== 1 ? 's' : ''} processed · Top spend: ${topCat} at ${topAmt}`}
              </p>
            </div>

            {/* Primary CTA */}
            <motion.button
              onClick={() => setUploadOpen(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(240,180,41,0)',
                  '0 0 28px 6px rgba(240,180,41,0.28)',
                  '0 0 0 0 rgba(240,180,41,0)',
                ],
              }}
              transition={{ boxShadow: { duration: 2.5, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' } }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--gold)', color: '#09090f',
                border: 'none', borderRadius: 9,
                padding: '13px 22px', fontSize: 14, fontWeight: 700,
                fontFamily: 'var(--font-body)', cursor: 'pointer',
                letterSpacing: '-0.01em', flexShrink: 0,
                alignSelf: 'flex-start', marginTop: 4,
              }}
            >
              <Plus size={15} strokeWidth={2.5} />
              Upload Receipt
            </motion.button>
          </div>
        </BlurFade>

        {/* ── Error ──────────────────────────────────────────────────────── */}
        {loadError && (
          <div style={{
            background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)',
            borderRadius: 9, padding: '14px 18px', fontSize: 13,
            color: 'var(--red)', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            {loadError}
            <button onClick={() => fetchAll(chartDays)} style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>
              retry
            </button>
          </div>
        )}

        {/* ── Risk alerts ────────────────────────────────────────────────── */}
        <AnimatePresence>
          {!dismissed && alerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.22)',
                borderRadius: 10, padding: '14px 18px', marginBottom: 28,
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <AlertTriangle size={13} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--amber)' }}>
                    {alerts.length} contractor alert{alerts.length > 1 ? 's' : ''}
                  </span>
                </div>
                {alerts.slice(0, 2).map((a) => (
                  <p key={a.contractor_id} style={{ fontSize: 13, color: 'var(--t60)', marginBottom: 2 }}>
                    <span style={{ color: 'var(--t100)', fontWeight: 500 }}>{a.contractor_name}</span> — {a.alert_text}
                  </p>
                ))}
                <button onClick={() => router.push('/contractors')} style={{ marginTop: 8, fontSize: 12, fontWeight: 500, color: 'var(--amber)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Review contractors →
                </button>
              </div>
              <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t30)', padding: 0 }}>
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── KPI strip ──────────────────────────────────────────────────── */}
        <motion.div {...up(0.1)} style={{ marginBottom: 24 }}>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {[...Array(4)].map((_, i) => <Pulse key={i} h={96} r={10} />)}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {[
                { label: 'Receipts Processed', numVal: count,      display: String(count), icon: Receipt,      highlight: false, prefix: '',  isNum: true  },
                { label: 'Total ITC Eligible',  numVal: itcTotal,   display: inr(itcTotal), icon: IndianRupee,  highlight: true,  prefix: '₹', isNum: true  },
                { label: 'Top Category',        numVal: 0,          display: topCat,        icon: Zap,          highlight: false, prefix: '',  isNum: false },
                { label: 'Cash Flow (30d)',      numVal: kpis?.paymentsAtRiskRaw ?? 0, display: spend, icon: TrendingUp, highlight: false, prefix: '₹', isNum: true },
              ].map(({ label, numVal, display, icon: Icon, highlight, prefix, isNum }, i) => (
                <BlurFade key={label} delay={0.12 + i * 0.07}>
                  <GlareCard style={{
                    background: highlight ? 'linear-gradient(135deg, rgba(240,180,41,0.12) 0%, rgba(240,180,41,0.04) 100%)' : 'var(--surface)',
                    border: highlight ? '1px solid rgba(240,180,41,0.25)' : '1px solid var(--hair)',
                    borderRadius: 10,
                    padding: '18px 20px',
                    position: 'relative',
                    overflow: 'hidden',
                    height: '100%',
                  }}>
                    {highlight && (
                      <div style={{
                        position: 'absolute', top: -20, right: -20,
                        width: 80, height: 80,
                        background: 'radial-gradient(circle, rgba(240,180,41,0.15) 0%, transparent 70%)',
                        pointerEvents: 'none',
                      }} />
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t30)' }}>
                        {label}
                      </p>
                      <Icon size={13} strokeWidth={1.5} style={{ color: highlight ? 'var(--gold)' : 'var(--t20)' }} />
                    </div>
                    {isNum ? (
                      <AnimatedNumber
                        value={numVal}
                        prefix={prefix}
                        style={{
                          fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700,
                          letterSpacing: '-0.03em', lineHeight: 1,
                          color: highlight ? 'var(--gold)' : 'var(--t100)',
                          fontVariantNumeric: 'tabular-nums',
                          display: 'block',
                        }}
                      />
                    ) : (
                      <p style={{
                        fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700,
                        letterSpacing: '-0.03em', lineHeight: 1,
                        color: 'var(--t100)', fontVariantNumeric: 'tabular-nums',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {display}
                      </p>
                    )}
                  </GlareCard>
                </BlurFade>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Chart + Feed ───────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, marginBottom: 16 }}>

          {/* Chart */}
          <motion.div {...up(0.18)} style={{
            background: 'var(--surface)', border: '1px solid var(--hair)',
            borderRadius: 12, padding: '26px 26px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t30)', marginBottom: 8 }}>
                  Spending Trend
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--t100)', fontVariantNumeric: 'tabular-nums' }}>
                  {spend}
                </p>
                <p style={{ fontSize: 11, color: 'var(--t30)', marginTop: 3 }}>last {chartDays} days</p>
              </div>
              <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 7, padding: 3, gap: 2 }}>
                {([30, 60, 90] as const).map((d) => (
                  <button key={d} onClick={() => setChartDays(d)} style={{
                    padding: '5px 11px', borderRadius: 5, fontSize: 11,
                    fontFamily: 'var(--font-mono)', fontWeight: 600, cursor: 'pointer',
                    background: chartDays === d ? 'var(--surface-3)' : 'transparent',
                    color: chartDays === d ? 'var(--gold)' : 'var(--t30)',
                    border: chartDays === d ? '1px solid var(--hair-2)' : '1px solid transparent',
                    transition: 'all 150ms ease',
                  }}>
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <Pulse h={160} r={6} />
            ) : summary?.spendChart?.length ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={summary.spendChart} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f0b429" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f0b429" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fill: 'rgba(240,242,245,0.2)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(240,242,245,0.2)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v > 0 ? `₹${Math.round(v / 1000)}k` : '0'} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="amount" stroke="#f0b429" strokeWidth={1.5}
                    fill="url(#goldGrad)" dot={false} activeDot={{ r: 4, fill: '#f0b429', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{
                height: 160, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <div style={{ width: 32, height: 2, background: 'var(--hair-2)', borderRadius: 1 }} />
                <p style={{ fontSize: 12, color: 'var(--t30)' }}>Upload receipts to see your trend</p>
              </div>
            )}
          </motion.div>

          {/* Recent receipts */}
          <motion.div {...up(0.24)} style={{
            background: 'var(--surface)', border: '1px solid var(--hair)',
            borderRadius: 12, padding: '26px 24px',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t30)' }}>
                Recent Receipts
              </p>
              {!isEmpty && (
                <button onClick={() => router.push('/receipts')} style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  background: 'none', border: 'none', color: 'var(--t30)',
                  fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)',
                  transition: 'color 120ms',
                }}>
                  All <ArrowUpRight size={11} />
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Pulse w={32} h={32} r={8} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <Pulse h={11} r={4} />
                      <Pulse w="60%" h={9} r={4} />
                    </div>
                    <Pulse w={48} h={14} r={4} />
                  </div>
                ))}
              </div>
            ) : isEmpty ? (
              <div style={{ flex: 1, position: 'relative', borderRadius: 10, overflow: 'hidden', minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center' }}>
                <BackgroundBeams className="opacity-30" />
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(240,180,41,0.2), rgba(240,180,41,0.06))',
                    border: '1px solid rgba(240,180,41,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--gold)',
                  }}>
                    <Receipt size={20} strokeWidth={1.4} />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--t70)', marginBottom: 4 }}>No receipts yet</p>
                    <p style={{ fontSize: 12, color: 'var(--t30)', lineHeight: 1.6 }}>
                      Upload your first receipt<br />to start tracking
                    </p>
                  </div>
                  <button onClick={() => setUploadOpen(true)} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'var(--gold)', color: '#09090f',
                    border: 'none', borderRadius: 7,
                    padding: '9px 16px', fontSize: 13, fontWeight: 700,
                    fontFamily: 'var(--font-body)', cursor: 'pointer',
                  }}>
                    <Plus size={13} strokeWidth={2.5} />
                    Upload first receipt
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                {summary!.transactions.slice(0, 6).map((tx, i, arr) => (
                  <div key={tx.id}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0' }}>
                      {/* Category avatar */}
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0, marginTop: 1,
                        background: `${catColor(tx.category)}18`,
                        border: `1px solid ${catColor(tx.category)}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: catColor(tx.category),
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {tx.merchant.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--t100)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                          {tx.merchant}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t30)', letterSpacing: '0.04em' }}>
                            {tx.category} · {fmtDate(tx.date)}
                          </span>
                          {tx.gst_head && (
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
                              padding: '1px 5px', borderRadius: 4,
                              background: 'rgba(240,180,41,0.1)', color: 'var(--gold)',
                              border: '1px solid rgba(240,180,41,0.2)', letterSpacing: '0.04em',
                            }}>
                              {tx.gst_head}{tx.gst_rate ? ` ${tx.gst_rate}` : ''}
                            </span>
                          )}
                          {tx.itc_eligible && (
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
                              padding: '1px 5px', borderRadius: 4,
                              background: 'rgba(22,163,74,0.12)', color: '#4ade80',
                              border: '1px solid rgba(22,163,74,0.25)', letterSpacing: '0.04em',
                            }}>
                              ITC
                            </span>
                          )}
                        </div>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--t70)', flexShrink: 0, marginTop: 1 }}>
                        {inr(tx.amount)}
                      </span>
                    </div>
                    {i < arr.length - 1 && <div style={{ height: 1, background: 'var(--hair)', marginLeft: 42 }} />}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Budget alerts ─────────────────────────────────────────────── */}
        <motion.div {...up(0.30)}>
          <BudgetAlerts />
        </motion.div>

        {/* ── Footer actions ────────────────────────────────────────────── */}
        <motion.div {...up(0.34)} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20 }}>
          <button
            onClick={() => setUploadOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'var(--gold)', color: '#09090f',
              border: 'none', borderRadius: 7,
              padding: '11px 20px', fontSize: 13, fontWeight: 700,
              fontFamily: 'var(--font-body)', cursor: 'pointer', letterSpacing: '-0.01em',
            }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Upload Receipt
          </button>
          <button
            onClick={() => summary && exportExpenseReport({ transactions: summary.transactions as any, totalSpend: summary.kpis.totalSpend, topCategory: summary.kpis.topCategory, days: chartDays })}
            disabled={!summary}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'transparent', color: 'var(--t40)',
              border: '1px solid var(--hair)', borderRadius: 7,
              padding: '11px 20px', fontSize: 13, fontWeight: 500,
              fontFamily: 'var(--font-body)', cursor: summary ? 'pointer' : 'not-allowed',
              letterSpacing: '-0.01em', opacity: summary ? 1 : 0.4,
              transition: 'color 150ms, border-color 150ms',
            }}
          >
            <FileDown size={14} />
            Export PDF
          </button>
        </motion.div>

      </div>

      <ReceiptUploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onReceiptProcessed={() => {
          // Small delay to let Supabase commit before refetching
          setTimeout(() => fetchAll(chartDays), 800)
          toast.success('Receipt processed successfully')
        }}
      />
    </div>
  )
}
