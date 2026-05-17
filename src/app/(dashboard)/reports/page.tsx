'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FileDown, CheckCircle, Receipt, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BlurFade } from '@/components/ui/blur-fade'
import { exportExpenseReport } from '@/lib/export-pdf'

type Tx = {
  id: string
  merchant: string
  category: string
  amount: number
  transaction_date: string
  gst_head: string | null
  gst_rate: string | null
  itc_eligible: boolean
}

type GstGroup = {
  head: string
  rate: string
  total: number
  itcTotal: number
  count: number
  itcEligible: boolean
}

function inr(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

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

export default function ReportsPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [txList, setTxList]       = useState<Tx[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }

      const { data, error: dbErr } = await supabase
        .from('transactions')
        .select('id, merchant, category, amount, transaction_date, gst_head, gst_rate, itc_eligible')
        .eq('user_id', session.user.id)
        .order('transaction_date', { ascending: false })

      if (dbErr) throw new Error(dbErr.message)
      setTxList(data ?? [])
    } catch (e: any) {
      setError(e.message ?? 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [router, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  // Build GST breakdown groups
  const gstGroups: GstGroup[] = Object.values(
    txList.reduce<Record<string, GstGroup>>((acc, tx) => {
      const head = tx.gst_head ?? 'Unclassified'
      if (!acc[head]) {
        acc[head] = { head, rate: tx.gst_rate ?? '—', total: 0, itcTotal: 0, count: 0, itcEligible: tx.itc_eligible }
      }
      acc[head].total += tx.amount
      acc[head].count += 1
      if (tx.itc_eligible) acc[head].itcTotal += tx.amount
      return acc
    }, {})
  ).sort((a, b) => b.total - a.total)

  const totalSpend    = txList.reduce((s, t) => s + t.amount, 0)
  const totalItc      = txList.filter((t) => t.itc_eligible).reduce((s, t) => s + t.amount, 0)
  const topCategory   = txList.length > 0
    ? Object.entries(txList.reduce<Record<string, number>>((a, t) => { a[t.category] = (a[t.category] ?? 0) + t.amount; return a }, {})).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
    : '—'

  function handleExport() {
    if (!txList.length) return
    setExporting(true)
    try {
      exportExpenseReport({
        transactions: txList.map((t) => ({
          ...t,
          date: fmtDate(t.transaction_date),
        })),
        totalSpend: inr(totalSpend),
        topCategory,
        days: 90,
      })
    } finally {
      setTimeout(() => setExporting(false), 1000)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 32px 80px' }}>
      <div style={{ maxWidth: 940, margin: '0 auto' }}>

        {/* Header */}
        <BlurFade delay={0} duration={0.5} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>
                Reports
              </p>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 300, letterSpacing: '-0.04em', color: 'var(--t100)', lineHeight: 1.1 }}>
                GST Summary
              </h1>
              <p style={{ fontSize: 13, color: 'var(--t40)', marginTop: 6 }}>
                All-time data · {txList.length} receipt{txList.length !== 1 ? 's' : ''}
              </p>
            </div>
            <motion.button
              onClick={handleExport}
              disabled={!txList.length || exporting}
              whileHover={{ scale: txList.length ? 1.02 : 1 }} whileTap={{ scale: 0.97 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: txList.length ? 'var(--gold)' : 'var(--surface)',
                color: txList.length ? '#09090f' : 'var(--t30)',
                border: txList.length ? 'none' : '1px solid var(--hair)',
                borderRadius: 9, padding: '12px 20px', fontSize: 13, fontWeight: 700,
                fontFamily: 'var(--font-body)', cursor: txList.length ? 'pointer' : 'not-allowed',
                letterSpacing: '-0.01em', opacity: exporting ? 0.7 : 1,
                transition: 'all 200ms',
              }}
            >
              <FileDown size={14} />
              {exporting ? 'Generating PDF…' : 'Export CA-Ready PDF'}
            </motion.button>
          </div>
        </BlurFade>

        {/* Summary KPIs */}
        <BlurFade delay={0.06} style={{ marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {loading
              ? [...Array(3)].map((_, i) => <Pulse key={i} h={80} r={10} />)
              : [
                  { label: 'Total Spend',    value: inr(totalSpend), sub: `${txList.length} transactions` },
                  { label: 'Total ITC Claimable', value: inr(totalItc), sub: `${txList.filter(t => t.itc_eligible).length} ITC receipts`, green: true },
                  { label: 'Top Category',   value: topCategory, sub: 'by spend' },
                ].map(({ label, value, sub, green }) => (
                  <div key={label} style={{
                    background: green ? 'rgba(22,163,74,0.04)' : 'var(--surface)',
                    border: green ? '1px solid rgba(22,163,74,0.25)' : '1px solid var(--hair)',
                    borderRadius: 10, padding: '18px 20px',
                  }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: green ? 'rgba(74,222,128,0.7)' : 'var(--t30)', marginBottom: 8 }}>
                      {label}
                    </p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: green ? '#4ade80' : 'var(--t100)', marginBottom: 4 }}>
                      {value}
                    </p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t30)' }}>{sub}</p>
                  </div>
                ))
            }
          </div>
        </BlurFade>

        {/* ITC highlight callout */}
        {!loading && totalItc > 0 && (
          <BlurFade delay={0.10} style={{ marginBottom: 24 }}>
            <div style={{
              background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)',
              borderRadius: 10, padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <CheckCircle size={16} style={{ color: '#4ade80', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#4ade80', marginBottom: 2 }}>
                  {inr(totalItc)} in ITC claimable
                </p>
                <p style={{ fontSize: 12, color: 'var(--t40)' }}>
                  Export the CA-ready PDF and share with your accountant to file a GST ITC claim.
                </p>
              </div>
            </div>
          </BlurFade>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)',
            borderRadius: 9, padding: '14px 18px', fontSize: 13,
            color: 'var(--red)', marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            {error}
            <button onClick={fetchData} style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>
              retry
            </button>
          </div>
        )}

        {/* GST breakdown table */}
        <BlurFade delay={0.12}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '20px 22px 14px', borderBottom: '1px solid var(--hair)' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t30)' }}>
                GST Head Breakdown
              </p>
            </div>

            {loading ? (
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[...Array(4)].map((_, i) => <Pulse key={i} h={44} r={6} />)}
              </div>
            ) : gstGroups.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <Receipt size={28} style={{ color: 'var(--t20)', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 13, color: 'var(--t40)' }}>No GST data yet</p>
                <p style={{ fontSize: 12, color: 'var(--t25)', marginTop: 4 }}>Upload receipts to see GST breakdown</p>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 80px 120px 120px',
                  padding: '8px 22px', gap: 12,
                  borderBottom: '1px solid var(--hair)',
                }}>
                  {['GST Head', 'Rate', 'Receipts', 'Amount', 'ITC Eligible'].map((h) => (
                    <p key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t25)' }}>
                      {h}
                    </p>
                  ))}
                </div>

                {/* Rows */}
                {gstGroups.map((g, i) => (
                  <motion.div
                    key={g.head}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.04 }}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr 80px 80px 120px 120px',
                      padding: '14px 22px', gap: 12, alignItems: 'center',
                      borderBottom: i < gstGroups.length - 1 ? '1px solid var(--hair)' : 'none',
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--t90)' }}>{g.head}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t50)' }}>{g.rate}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t50)' }}>{g.count}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--t80)' }}>{inr(g.total)}</p>
                    <div>
                      {g.itcTotal > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                            padding: '2px 6px', borderRadius: 4,
                            background: 'rgba(22,163,74,0.1)', color: '#4ade80',
                            border: '1px solid rgba(22,163,74,0.25)',
                          }}>
                            {inr(g.itcTotal)}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t20)' }}>—</span>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Total row */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 80px 120px 120px',
                  padding: '14px 22px', gap: 12, alignItems: 'center',
                  borderTop: '1px solid var(--hair)',
                  background: 'rgba(240,180,41,0.03)',
                }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t50)' }}>Total</p>
                  <span />
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--t60)' }}>{txList.length}</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--gold)', letterSpacing: '-0.02em' }}>{inr(totalSpend)}</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#4ade80' }}>{inr(totalItc)}</p>
                </div>
              </>
            )}
          </div>
        </BlurFade>

        {/* Disclaimer */}
        {!loading && txList.length > 0 && (
          <BlurFade delay={0.18}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 16, padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 8 }}>
              <AlertCircle size={12} style={{ color: 'var(--t30)', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t30)', lineHeight: 1.6 }}>
                This report is AI-generated. ITC amounts are estimates. Verify all figures with a CA before official GST filing.
              </p>
            </div>
          </BlurFade>
        )}

      </div>
    </div>
  )
}
