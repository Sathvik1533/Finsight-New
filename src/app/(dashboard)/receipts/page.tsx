'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Filter, Receipt, CheckCircle, X, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ReceiptUploadModal } from '@/components/upload/ReceiptUploadModal'
import { BlurFade } from '@/components/ui/blur-fade'
import { toast } from 'sonner'

type Tx = {
  id: string
  merchant: string
  category: string
  amount: number
  transaction_date: string
  gst_head: string | null
  gst_rate: string | null
  itc_eligible: boolean
  confidence_score?: number
  status?: string
}

const CAT_COLORS: Record<string, string> = {
  'Food & Dining':   '#f97316',
  'Travel':          '#3b82f6',
  'Office Supplies': '#8b5cf6',
  'Software':        '#06b6d4',
  'Marketing':       '#ec4899',
  'Utilities':       '#10b981',
  'Healthcare':      '#ef4444',
  'Entertainment':   '#f59e0b',
}
function catColor(cat: string) { return CAT_COLORS[cat] ?? '#f0b429' }
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

const ALL_CATEGORIES = [
  'Food & Dining', 'Travel', 'Office Supplies', 'Software',
  'Marketing', 'Utilities', 'Healthcare', 'Entertainment',
]

export default function ReceiptsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [txList, setTxList]           = useState<Tx[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [uploadOpen, setUploadOpen]   = useState(false)
  const [search, setSearch]           = useState('')
  const [catFilter, setCatFilter]     = useState<string>('All')
  const [itcFilter, setItcFilter]     = useState(false)
  const [showFilter, setShowFilter]   = useState(false)
  const [dragOver, setDragOver]       = useState(false)

  const fetchReceipts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }

      const { data, error: dbErr } = await supabase
        .from('transactions')
        .select('id, merchant, category, amount, transaction_date, gst_head, gst_rate, itc_eligible, confidence_score, status')
        .eq('user_id', session.user.id)
        .order('transaction_date', { ascending: false })

      if (dbErr) throw new Error(dbErr.message)
      setTxList(data ?? [])
    } catch (e: any) {
      setError(e.message ?? 'Failed to load receipts')
    } finally {
      setLoading(false)
    }
  }, [router, supabase])

  useEffect(() => { fetchReceipts() }, [fetchReceipts])

  // Filter
  const filtered = txList.filter((tx) => {
    const matchSearch = !search || tx.merchant.toLowerCase().includes(search.toLowerCase()) || (tx.category ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === 'All' || tx.category === catFilter
    const matchItc = !itcFilter || tx.itc_eligible
    return matchSearch && matchCat && matchItc
  })

  const totalAmount = filtered.reduce((s, t) => s + t.amount, 0)
  const itcAmount   = filtered.filter((t) => t.itc_eligible).reduce((s, t) => s + t.amount, 0)

  // Drag-drop
  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setDragOver(true) }
  function handleDragLeave() { setDragOver(false) }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    setUploadOpen(true)
  }

  return (
    <div
      style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 32px 80px' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <BlurFade delay={0} duration={0.5} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>
                Receipts
              </p>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 300, letterSpacing: '-0.04em', color: 'var(--t100)', lineHeight: 1.1 }}>
                All Receipts
              </h1>
              {!loading && txList.length > 0 && (
                <p style={{ fontSize: 13, color: 'var(--t40)', marginTop: 6 }}>
                  {txList.length} receipt{txList.length !== 1 ? 's' : ''} · {inr(txList.reduce((s, t) => s + t.amount, 0))} total spend
                </p>
              )}
            </div>
            <motion.button
              onClick={() => setUploadOpen(true)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'var(--gold)', color: '#09090f',
                border: 'none', borderRadius: 9,
                padding: '11px 20px', fontSize: 13, fontWeight: 700,
                fontFamily: 'var(--font-body)', cursor: 'pointer',
                letterSpacing: '-0.01em',
              }}
            >
              <Plus size={14} strokeWidth={2.5} />
              Upload Receipt
            </motion.button>
          </div>
        </BlurFade>

        {/* Summary strip */}
        {!loading && filtered.length > 0 && (
          <BlurFade delay={0.05} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'Showing', value: `${filtered.length} receipts` },
                { label: 'Subtotal', value: inr(totalAmount) },
                { label: 'ITC Eligible', value: inr(itcAmount), green: true },
              ].map(({ label, value, green }) => (
                <div key={label} style={{
                  padding: '8px 14px', borderRadius: 8,
                  background: 'var(--surface)', border: '1px solid var(--hair)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t30)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: green ? '#4ade80' : 'var(--t80)' }}>{value}</span>
                </div>
              ))}
            </div>
          </BlurFade>
        )}

        {/* Search + filter bar */}
        <BlurFade delay={0.08} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--t30)', pointerEvents: 'none' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search merchant or category…"
                style={{
                  width: '100%', padding: '10px 12px 10px 34px',
                  background: 'var(--surface)', border: '1px solid var(--hair)',
                  borderRadius: 8, fontSize: 13, color: 'var(--t80)',
                  fontFamily: 'var(--font-body)', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Category dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowFilter((f) => !f)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 14px', background: 'var(--surface)',
                  border: catFilter !== 'All' ? '1px solid rgba(240,180,41,0.4)' : '1px solid var(--hair)',
                  borderRadius: 8, fontSize: 12, fontWeight: 500,
                  color: catFilter !== 'All' ? 'var(--gold)' : 'var(--t40)',
                  fontFamily: 'var(--font-body)', cursor: 'pointer',
                }}
              >
                <Filter size={12} />
                {catFilter === 'All' ? 'Category' : catFilter}
                <ChevronDown size={11} />
              </button>
              <AnimatePresence>
                {showFilter && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                    style={{
                      position: 'absolute', top: '110%', left: 0, zIndex: 50,
                      background: 'var(--surface-3)', border: '1px solid var(--hair-2)',
                      borderRadius: 10, padding: 6, minWidth: 180,
                      boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                    }}
                  >
                    {['All', ...ALL_CATEGORIES].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setCatFilter(cat); setShowFilter(false) }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '8px 12px', borderRadius: 6, fontSize: 12,
                          fontFamily: 'var(--font-body)', cursor: 'pointer', border: 'none',
                          background: catFilter === cat ? 'rgba(240,180,41,0.1)' : 'transparent',
                          color: catFilter === cat ? 'var(--gold)' : 'var(--t60)',
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ITC toggle */}
            <button
              onClick={() => setItcFilter((f) => !f)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 14px', background: itcFilter ? 'rgba(22,163,74,0.1)' : 'var(--surface)',
                border: itcFilter ? '1px solid rgba(22,163,74,0.35)' : '1px solid var(--hair)',
                borderRadius: 8, fontSize: 12, fontWeight: 500,
                color: itcFilter ? '#4ade80' : 'var(--t40)',
                fontFamily: 'var(--font-body)', cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              <CheckCircle size={12} />
              ITC Only
            </button>

            {/* Clear filters */}
            {(search || catFilter !== 'All' || itcFilter) && (
              <button
                onClick={() => { setSearch(''); setCatFilter('All'); setItcFilter(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '10px 12px', background: 'transparent',
                  border: 'none', borderRadius: 8, fontSize: 12,
                  color: 'var(--t30)', fontFamily: 'var(--font-body)', cursor: 'pointer',
                }}
              >
                <X size={11} /> Clear
              </button>
            )}
          </div>
        </BlurFade>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)',
            borderRadius: 9, padding: '14px 18px', fontSize: 13,
            color: 'var(--red)', marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            {error}
            <button onClick={fetchReceipts} style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>
              retry
            </button>
          </div>
        )}

        {/* Drag overlay */}
        <AnimatePresence>
          {dragOver && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: 'fixed', inset: 0, zIndex: 100,
                background: 'rgba(240,180,41,0.08)', backdropFilter: 'blur(4px)',
                border: '2px dashed rgba(240,180,41,0.5)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
                pointerEvents: 'none',
              }}
            >
              <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Receipt size={28} style={{ color: 'var(--gold)' }} />
              </div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, color: 'var(--gold)' }}>Drop to upload receipt</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table / list */}
        <BlurFade delay={0.1}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Pulse w={36} h={36} r={8} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <Pulse h={12} r={4} />
                    <Pulse w="50%" h={9} r={4} />
                  </div>
                  <Pulse w={70} h={14} r={4} />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 14, padding: '80px 24px',
              border: '1px dashed var(--hair)', borderRadius: 12, textAlign: 'center',
            }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(240,180,41,0.08)', border: '1px solid rgba(240,180,41,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Receipt size={22} style={{ color: 'var(--gold)', opacity: 0.6 }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--t50)', marginBottom: 4 }}>
                  {txList.length === 0 ? 'No receipts yet' : 'No receipts match your filters'}
                </p>
                <p style={{ fontSize: 12, color: 'var(--t30)', lineHeight: 1.6 }}>
                  {txList.length === 0
                    ? 'Drag a receipt here or click Upload to get started'
                    : 'Try clearing filters or searching for something else'}
                </p>
              </div>
              {txList.length === 0 && (
                <button
                  onClick={() => setUploadOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: 'var(--gold)', color: '#09090f',
                    border: 'none', borderRadius: 8,
                    padding: '10px 18px', fontSize: 13, fontWeight: 700,
                    fontFamily: 'var(--font-body)', cursor: 'pointer',
                  }}
                >
                  <Plus size={13} strokeWidth={2.5} />
                  Upload first receipt
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* Table header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 140px 100px 100px 100px',
                padding: '6px 16px', gap: 12,
              }}>
                {['Merchant', 'Date', 'GST Head', 'ITC', 'Amount'].map((h) => (
                  <p key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t25)' }}>
                    {h}
                  </p>
                ))}
              </div>

              {/* Rows */}
              {filtered.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.025 }}
                  onClick={() => router.push(`/receipts/${tx.id}`)}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 140px 100px 100px 100px',
                    alignItems: 'center', gap: 12,
                    background: 'var(--surface)', border: '1px solid var(--hair)',
                    borderRadius: 10, padding: '12px 16px',
                    cursor: 'pointer', transition: 'border-color 150ms, background 150ms',
                  }}
                  whileHover={{ backgroundColor: 'var(--surface-2)' } as any}
                >
                  {/* Merchant */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: `${catColor(tx.category)}18`,
                      border: `1px solid ${catColor(tx.category)}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: catColor(tx.category),
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {(tx.merchant ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--t90)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                        {tx.merchant}
                      </p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t30)', letterSpacing: '0.04em' }}>
                        {tx.category}
                      </p>
                    </div>
                  </div>

                  {/* Date */}
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t50)' }}>
                    {fmtDate(tx.transaction_date)}
                  </p>

                  {/* GST head */}
                  <div>
                    {tx.gst_head ? (
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
                        padding: '2px 6px', borderRadius: 4,
                        background: 'rgba(240,180,41,0.1)', color: 'var(--gold)',
                        border: '1px solid rgba(240,180,41,0.2)',
                      }}>
                        {tx.gst_head}{tx.gst_rate ? ` ${tx.gst_rate}` : ''}
                      </span>
                    ) : (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t20)' }}>—</span>
                    )}
                  </div>

                  {/* ITC */}
                  <div>
                    {tx.itc_eligible ? (
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
                        padding: '2px 6px', borderRadius: 4,
                        background: 'rgba(22,163,74,0.12)', color: '#4ade80',
                        border: '1px solid rgba(22,163,74,0.25)',
                      }}>
                        ITC
                      </span>
                    ) : (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t20)' }}>—</span>
                    )}
                  </div>

                  {/* Amount */}
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--t80)', textAlign: 'right' }}>
                    {inr(tx.amount)}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </BlurFade>

      </div>

      <ReceiptUploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onReceiptProcessed={() => {
          setTimeout(() => fetchReceipts(), 800)
          toast.success('Receipt processed successfully')
        }}
      />
    </div>
  )
}
