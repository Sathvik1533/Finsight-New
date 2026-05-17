'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, AlertTriangle, Plus, X, Check } from 'lucide-react'

const CATEGORIES = [
  'Food & Dining', 'Groceries', 'Transportation', 'Shopping & Retail',
  'Entertainment & Leisure', 'Health & Medical', 'Travel & Accommodation',
  'Utilities & Bills', 'Software & Subscriptions', 'Business & Professional',
  'Education', 'Other',
]

interface Budget {
  id: string
  category: string
  monthly_limit: number
  spent: number
  percent: number
  exceeded: boolean
}

export function BudgetAlerts() {
  const [budgets, setBudgets]   = useState<Budget[]>([])
  const [adding, setAdding]     = useState(false)
  const [category, setCategory] = useState(CATEGORIES[0])
  const [limit, setLimit]       = useState('')
  const [saving, setSaving]     = useState(false)

  const load = async () => {
    const res = await fetch('/api/budgets')
    if (res.ok) setBudgets(await res.json())
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!limit || isNaN(Number(limit))) return
    setSaving(true)
    await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, monthly_limit: Number(limit) }),
    })
    setSaving(false)
    setAdding(false)
    setLimit('')
    load()
  }

  const handleDelete = async (cat: string) => {
    await fetch(`/api/budgets?category=${encodeURIComponent(cat)}`, { method: 'DELETE' })
    load()
  }

  const exceeded = budgets.filter((b) => b.exceeded)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.42 }}
      className="fs-card p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Target className="h-3.5 w-3.5 text-[var(--t30)]" />
          <span className="type-label">Budget Alerts</span>
          {exceeded.length > 0 && (
            <span className="ml-1 rounded bg-[var(--red)]/15 border border-[var(--red)]/25 px-1.5 py-0.5 text-[10px] font-bold font-mono text-[var(--red)]">
              {exceeded.length} exceeded
            </span>
          )}
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="btn-ghost py-1.5 px-2.5 text-xs"
        >
          <Plus className="h-3 w-3" />
          Set Budget
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="rounded border border-[var(--hair2)] bg-[var(--surface-h)] p-4 flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[140px]">
                <p className="type-label mb-1.5">Category</p>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded border border-[var(--hair)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--t100)] focus:outline-none focus:border-[var(--signal-40)] transition-colors"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="w-36">
                <p className="type-label mb-1.5">Monthly Limit (₹)</p>
                <input
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  placeholder="5000"
                  className="w-full rounded border border-[var(--hair)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--t100)] placeholder-[var(--t30)] focus:outline-none focus:border-[var(--signal-40)] transition-colors"
                />
              </div>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="btn-signal py-2 px-3 text-xs disabled:opacity-50"
              >
                <Check className="h-3 w-3" />
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Budget list */}
      {budgets.length === 0 ? (
        <p className="text-xs text-[var(--t30)] text-center py-6">
          No budgets set. Click "Set Budget" to track category limits.
        </p>
      ) : (
        <div className="space-y-4">
          {budgets.map((b, i) => {
            const barColor = b.exceeded
              ? 'bg-[var(--red)]'
              : b.percent >= 80
              ? 'bg-[var(--amber)]'
              : 'bg-[var(--signal)]'
            const pct = Math.min(b.percent, 100)

            return (
              <div key={b.id} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {(b.exceeded || b.percent >= 80) && (
                      <AlertTriangle className={`h-3 w-3 flex-shrink-0 ${b.exceeded ? 'text-[var(--red)]' : 'text-[var(--amber)]'}`} />
                    )}
                    <span className="text-xs font-medium text-[var(--t60)]">{b.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`type-number text-xs ${b.exceeded ? 'text-[var(--red)]' : 'text-[var(--t30)]'}`}>
                      ₹{b.spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      {' '}<span className="text-[var(--hair2)]">/</span>{' '}
                      ₹{b.monthly_limit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                    <button
                      onClick={() => handleDelete(b.category)}
                      className="opacity-0 group-hover:opacity-100 text-[var(--t30)] hover:text-[var(--red)] transition-all"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="h-1 w-full rounded-full bg-[var(--t10)] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className={`h-full rounded-full ${barColor}`}
                  />
                </div>
                {b.exceeded && (
                  <p className="mt-1 text-[10px] text-[var(--red)]/70">
                    Over budget by ₹{(b.spent - b.monthly_limit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                )}
                {i < budgets.length - 1 && <div className="fs-divider mt-4" />}
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
