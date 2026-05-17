'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Receipt, CheckCircle, FileDown, Calendar, Tag, Percent } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BlurFade } from '@/components/ui/blur-fade'

type Tx = {
  id: string
  merchant: string
  category: string
  amount: number
  transaction_date: string
  gst_head: string | null
  gst_rate: string | null
  itc_eligible: boolean
  confidence_score: number | null
  raw_text: string | null
  image_url: string | null
  status: string | null
}

function inr(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function Field({ label, value, mono = false, gold = false }: { label: string; value: string; mono?: boolean; gold?: boolean }) {
  return (
    <div style={{ padding: '14px 0', borderBottom: '1px solid var(--hair)' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t30)', marginBottom: 5 }}>
        {label}
      </p>
      <p style={{
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)',
        fontSize: 14, fontWeight: mono ? 600 : 500,
        color: gold ? 'var(--gold)' : 'var(--t90)',
        letterSpacing: mono ? '-0.02em' : undefined,
      }}>
        {value}
      </p>
    </div>
  )
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

export default function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const supabase = createClient()

  const [tx, setTx]         = useState<Tx | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  const fetchTx = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }

      const { data, error: dbErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .single()

      if (dbErr || !data) throw new Error(dbErr?.message ?? 'Receipt not found')
      setTx(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id, router, supabase])

  useEffect(() => { fetchTx() }, [fetchTx])

  // GST breakdown
  const gstRateNum = tx?.gst_rate ? parseFloat(tx.gst_rate.replace('%', '')) : null
  const baseAmount = (tx && gstRateNum) ? tx.amount / (1 + gstRateNum / 100) : null
  const gstAmount  = (tx && baseAmount) ? tx.amount - baseAmount : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 32px 80px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Back nav */}
        <BlurFade delay={0} duration={0.4} style={{ marginBottom: 28 }}>
          <button
            onClick={() => router.push('/receipts')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--t40)', fontSize: 12, fontFamily: 'var(--font-body)',
              transition: 'color 150ms',
            }}
          >
            <ArrowLeft size={13} /> All Receipts
          </button>
        </BlurFade>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 24 }}>
            <Pulse h={420} r={12} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[...Array(6)].map((_, i) => <Pulse key={i} h={52} r={8} />)}
            </div>
          </div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ color: 'var(--red)', fontSize: 14, marginBottom: 12 }}>{error}</p>
            <button onClick={() => router.push('/receipts')} style={{ color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>
              ← Back to receipts
            </button>
          </div>
        ) : tx ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 24, alignItems: 'start' }}>

            {/* Left — image or placeholder */}
            <BlurFade delay={0.05}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 12, overflow: 'hidden' }}>
                {tx.image_url ? (
                  <img
                    src={tx.image_url}
                    alt="Receipt"
                    style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: 500 }}
                  />
                ) : (
                  <div style={{
                    height: 340, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: 14,
                      background: 'rgba(240,180,41,0.08)', border: '1px solid rgba(240,180,41,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Receipt size={26} style={{ color: 'var(--gold)', opacity: 0.5 }} />
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--t30)' }}>No image stored</p>
                  </div>
                )}

                {/* Confidence badge */}
                {tx.confidence_score !== null && (
                  <div style={{ padding: '12px 16px', borderTop: '1px solid var(--hair)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t30)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>OCR Confidence</span>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                      color: tx.confidence_score >= 0.8 ? '#4ade80' : tx.confidence_score >= 0.5 ? 'var(--gold)' : 'var(--red)',
                    }}>
                      {Math.round(tx.confidence_score * 100)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Raw text (collapsible) */}
              {tx.raw_text && (
                <details style={{ marginTop: 10 }}>
                  <summary style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t30)', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', userSelect: 'none', padding: '8px 0' }}>
                    OCR Raw Text
                  </summary>
                  <pre style={{
                    background: 'var(--surface)', border: '1px solid var(--hair)',
                    borderRadius: 8, padding: 14,
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--t50)', lineHeight: 1.7,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    maxHeight: 200, overflowY: 'auto', marginTop: 6,
                  }}>
                    {tx.raw_text}
                  </pre>
                </details>
              )}
            </BlurFade>

            {/* Right — extracted fields */}
            <BlurFade delay={0.1}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 12, padding: '24px 24px 8px' }}>
                <div style={{ marginBottom: 18 }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>
                    Receipt Detail
                  </p>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 300, letterSpacing: '-0.04em', color: 'var(--t100)' }}>
                    {tx.merchant}
                  </h1>
                </div>

                <Field label="Amount" value={inr(tx.amount)} mono gold />
                <Field label="Date" value={fmtDate(tx.transaction_date)} />
                <Field label="Category" value={tx.category ?? '—'} />
                {tx.gst_head && <Field label="GST Head" value={`${tx.gst_head}${tx.gst_rate ? ` @ ${tx.gst_rate}` : ''}`} mono />}

                {/* GST breakdown */}
                {baseAmount && gstAmount && (
                  <div style={{ padding: '14px 0', borderBottom: '1px solid var(--hair)' }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t30)', marginBottom: 10 }}>
                      GST Breakdown
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[
                        { label: 'Base Amount', value: inr(baseAmount) },
                        { label: `GST (${tx.gst_rate})`, value: inr(gstAmount) },
                        { label: 'Total', value: inr(tx.amount) },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t40)' }}>{label}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: label === 'Total' ? 'var(--t90)' : 'var(--t60)' }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ITC status */}
                <div style={{ padding: '16px 0', borderBottom: '1px solid var(--hair)' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t30)', marginBottom: 8 }}>
                    ITC Status
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 20,
                      background: tx.itc_eligible ? 'rgba(22,163,74,0.1)' : 'rgba(255,255,255,0.04)',
                      border: tx.itc_eligible ? '1px solid rgba(22,163,74,0.3)' : '1px solid var(--hair)',
                    }}>
                      <CheckCircle size={12} style={{ color: tx.itc_eligible ? '#4ade80' : 'var(--t30)' }} />
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                        color: tx.itc_eligible ? '#4ade80' : 'var(--t30)',
                      }}>
                        {tx.itc_eligible ? 'ITC Claimable' : 'Not ITC Eligible'}
                      </span>
                    </div>
                    {tx.itc_eligible && gstAmount && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4ade80', fontWeight: 600 }}>
                        {inr(gstAmount)} claimable
                      </span>
                    )}
                  </div>
                </div>

                {/* Download PDF */}
                <div style={{ paddingTop: 20, paddingBottom: 8 }}>
                  <motion.button
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    onClick={() => window.print()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      justifyContent: 'center',
                      background: 'transparent', color: 'var(--t60)',
                      border: '1px solid var(--hair)', borderRadius: 9,
                      padding: '12px 20px', fontSize: 13, fontWeight: 500,
                      fontFamily: 'var(--font-body)', cursor: 'pointer',
                      transition: 'border-color 150ms, color 150ms',
                    }}
                  >
                    <FileDown size={14} />
                    Download Receipt PDF
                  </motion.button>
                </div>
              </div>
            </BlurFade>
          </div>
        ) : null}
      </div>
    </div>
  )
}
