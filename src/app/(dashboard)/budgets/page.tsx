'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, AlertTriangle, Target, X } from 'lucide-react'
import { BlurFade } from '@/components/ui/blur-fade'
import { toast } from 'sonner'

type Budget = {
  id: string
  category: string
  monthly_limit: number
  spent: number
  percent: number
  exceeded: boolean
}

const ALL_CATEGORIES = [
  'Food & Dining', 'Travel', 'Office Supplies', 'Software',
  'Marketing', 'Utilities', 'Healthcare', 'Entertainment',
]

function inr(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function progressColor(pct: number) {
  if (pct >= 100) return '#ef4444'
  if (pct >= 70)  return '#f59e0b'
  return '#4ade80'
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

// ── Set Budget Modal ──────────────────────────────────────────────────────────
function SetBudgetModal({
  onClose, onSaved, existing,
}: {
  onClose: () => void
  onSaved: () => void
  existing: Budget[]
}) {
  const takenCategories = existing.map((b) => b.category)
  const available       = ALL_CATEGORIES.filter((c) => !takenCategories.includes(c))

  const [category, setCategory] = useState(available[0] ?? ALL_CATEGORIES[0])
  const [limit, setLimit]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(limit)
    if (!category || isNaN(amt) || amt <= 0) { setErr('Enter a valid amount'); return }
    setLoading(true); setErr('')
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, monthly_limit: amt }),
      })
      if (!res.ok) throw new Error('Failed to save budget')
      toast.success(`Budget set for ${category}`)
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420,
          background: '#0f0f14', border: '1px solid var(--hair)',
          borderRadius: 16, padding: 28,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 400, letterSpacing: '-0.03em', color: 'var(--t100)' }}>
            Set Monthly Budget
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t30)', padding: 0 }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t40)', marginBottom: 8 }}>
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%', padding: '11px 14px',
                background: 'var(--surface)', border: '1px solid var(--hair)',
                borderRadius: 8, fontSize: 13, color: 'var(--t80)',
                fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer',
              }}
            >
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}{takenCategories.includes(c) ? ' (update)' : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t40)', marginBottom: 8 }}>
              Monthly Limit (₹)
            </label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="e.g. 5000"
              min={1}
              style={{
                width: '100%', padding: '11px 14px', boxSizing: 'border-box',
                background: 'var(--surface)', border: '1px solid var(--hair)',
                borderRadius: 8, fontSize: 13, color: 'var(--t80)',
                fontFamily: 'var(--font-mono)', outline: 'none',
              }}
            />
          </div>

          {err && <p style={{ fontSize: 12, color: 'var(--red)' }}>{err}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '11px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: 'transparent', border: '1px solid var(--hair)', color: 'var(--t40)',
              fontFamily: 'var(--font-body)', cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{
              flex: 1, padding: '11px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              background: 'var(--gold)', color: '#09090f', border: 'none',
              fontFamily: 'var(--font-body)', cursor: 'pointer', opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Saving…' : 'Set Budget'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── Budget Card ───────────────────────────────────────────────────────────────
function BudgetCard({ budget, onDelete, index }: { budget: Budget; onDelete: () => void; index: number }) {
  const pct   = Math.min(budget.percent, 100)
  const color = progressColor(budget.percent)
  const remaining = budget.monthly_limit - budget.spent

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      style={{
        background: 'var(--surface)', border: budget.exceeded ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--hair)',
        borderRadius: 12, padding: '20px 22px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--t90)' }}>{budget.category}</p>
            {budget.exceeded && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
                padding: '2px 6px', borderRadius: 4,
                background: 'rgba(239,68,68,0.12)', color: '#f87171',
                border: '1px solid rgba(239,68,68,0.25)',
              }}>
                Over budget
              </span>
            )}
            {!budget.exceeded && budget.percent >= 70 && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
                padding: '2px 6px', borderRadius: 4,
                background: 'rgba(245,158,11,0.1)', color: '#fbbf24',
                border: '1px solid rgba(245,158,11,0.25)',
              }}>
                Approaching limit
              </span>
            )}
          </div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t30)' }}>
            Limit: {inr(budget.monthly_limit)} / month
          </p>
        </div>
        <button
          onClick={onDelete}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--t25)', padding: 4, borderRadius: 6,
            transition: 'color 150ms',
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: index * 0.06 }}
            style={{ height: '100%', background: color, borderRadius: 3 }}
          />
        </div>
      </div>

      {/* Spend labels */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.03em', color: color }}>
            {inr(budget.spent)}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t30)' }}>
            / {inr(budget.monthly_limit)}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: budget.exceeded ? '#f87171' : 'var(--t40)' }}>
          {budget.exceeded
            ? `${inr(Math.abs(remaining))} over`
            : `${inr(remaining)} left`}
        </span>
      </div>
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BudgetsPage() {
  const router = useRouter()

  const [budgets, setBudgets]     = useState<Budget[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [showAdd, setShowAdd]     = useState(false)

  const fetchBudgets = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/budgets')
      if (res.status === 401) { router.push('/auth'); return }
      if (!res.ok) throw new Error('Failed to load budgets')
      setBudgets(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchBudgets() }, [fetchBudgets])

  async function handleDelete(category: string) {
    try {
      await fetch(`/api/budgets?category=${encodeURIComponent(category)}`, { method: 'DELETE' })
      toast.success(`Budget for ${category} removed`)
      fetchBudgets()
    } catch {
      toast.error('Failed to delete budget')
    }
  }

  const overBudget = budgets.filter((b) => b.exceeded)
  const totalLimit  = budgets.reduce((s, b) => s + b.monthly_limit, 0)
  const totalSpent  = budgets.reduce((s, b) => s + b.spent, 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 32px 80px' }}>
      <div style={{ maxWidth: 840, margin: '0 auto' }}>

        {/* Header */}
        <BlurFade delay={0} duration={0.5} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>
                Budgets
              </p>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 300, letterSpacing: '-0.04em', color: 'var(--t100)', lineHeight: 1.1 }}>
                Monthly Limits
              </h1>
              <p style={{ fontSize: 13, color: 'var(--t40)', marginTop: 6 }}>
                {budgets.length} budget{budgets.length !== 1 ? 's' : ''} · Set limits per category and track this month's spend
              </p>
            </div>
            <motion.button
              onClick={() => setShowAdd(true)}
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
              Set Budget
            </motion.button>
          </div>
        </BlurFade>

        {/* Summary row */}
        {!loading && budgets.length > 0 && (
          <BlurFade delay={0.06} style={{ marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { label: 'Total Budget', value: inr(totalLimit) },
                { label: 'Total Spent', value: inr(totalSpent), warn: totalSpent > totalLimit },
                { label: 'Over Budget', value: `${overBudget.length} categor${overBudget.length === 1 ? 'y' : 'ies'}`, warn: overBudget.length > 0 },
              ].map(({ label, value, warn }) => (
                <div key={label} style={{
                  background: warn ? 'rgba(239,68,68,0.04)' : 'var(--surface)',
                  border: warn ? '1px solid rgba(239,68,68,0.2)' : '1px solid var(--hair)',
                  borderRadius: 10, padding: '16px 18px',
                }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t30)', marginBottom: 8 }}>
                    {label}
                  </p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, letterSpacing: '-0.03em', color: warn ? '#f87171' : 'var(--t100)' }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </BlurFade>
        )}

        {/* Over-budget alert */}
        <AnimatePresence>
          {overBudget.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              style={{
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 10, padding: '14px 18px', marginBottom: 20,
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}
            >
              <AlertTriangle size={14} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#f87171', marginBottom: 3 }}>
                  {overBudget.length} categor{overBudget.length === 1 ? 'y' : 'ies'} over budget this month
                </p>
                <p style={{ fontSize: 12, color: 'var(--t40)' }}>
                  {overBudget.map((b) => b.category).join(', ')}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)',
            borderRadius: 9, padding: '14px 18px', fontSize: 13,
            color: 'var(--red)', marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            {error}
            <button onClick={fetchBudgets} style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>
              retry
            </button>
          </div>
        )}

        {/* Budget grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
            {[...Array(4)].map((_, i) => <Pulse key={i} h={130} r={12} />)}
          </div>
        ) : budgets.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 14, padding: '80px 24px',
            border: '1px dashed var(--hair)', borderRadius: 12, textAlign: 'center',
          }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(240,180,41,0.08)', border: '1px solid rgba(240,180,41,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={22} style={{ color: 'var(--gold)', opacity: 0.6 }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--t50)', marginBottom: 4 }}>No budgets set</p>
              <p style={{ fontSize: 12, color: 'var(--t30)', lineHeight: 1.6 }}>
                Set a monthly limit per category.<br />FinSight will alert you when you're close.
              </p>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'var(--gold)', color: '#09090f',
                border: 'none', borderRadius: 8,
                padding: '10px 18px', fontSize: 13, fontWeight: 700,
                fontFamily: 'var(--font-body)', cursor: 'pointer',
              }}
            >
              <Plus size={13} strokeWidth={2.5} />
              Set first budget
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
            {budgets.map((b, i) => (
              <BudgetCard
                key={b.id}
                budget={b}
                index={i}
                onDelete={() => handleDelete(b.category)}
              />
            ))}
          </div>
        )}

      </div>

      <AnimatePresence>
        {showAdd && (
          <SetBudgetModal
            onClose={() => setShowAdd(false)}
            onSaved={fetchBudgets}
            existing={budgets}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
