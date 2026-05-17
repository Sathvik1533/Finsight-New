'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, RefreshCw, FileText, AlertTriangle, Lock,
  CheckCircle, User, ArrowLeft, X
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Contractor {
  id: string
  name: string
  role?: string
  contact?: string
  notes?: string
  status: 'active' | 'paused' | 'completed'
  risk_score: number
  risk_reason?: string
  risk_action?: 'pay' | 'hold' | 'investigate'
  total_paid: number
  last_update: string
  created_at: string
}

// ── Risk helpers ──────────────────────────────────────────────────────────────
function riskColor(score: number) {
  if (score <= 30) return { bg: 'bg-[#f0b429]/15', text: 'text-[#f0b429]', border: 'border-[#f0b429]/30', glow: 'shadow-[#f0b429]/20' }
  if (score <= 65) return { bg: 'bg-amber-500/15',   text: 'text-amber-400',   border: 'border-amber-500/30',   glow: 'shadow-amber-500/20' }
  return              { bg: 'bg-red-500/15',          text: 'text-red-400',     border: 'border-red-500/30',     glow: 'shadow-red-500/20' }
}

function riskLabel(score: number) {
  if (score <= 30) return 'Low Risk'
  if (score <= 65) return 'Moderate'
  return 'High Risk'
}

function actionBadge(action?: string) {
  if (action === 'pay')         return { label: 'Pay',         cls: 'bg-[#f0b429]/10 text-[#f0b429] border-[#f0b429]/20' }
  if (action === 'hold')        return { label: 'Hold',        cls: 'bg-amber-500/10   text-amber-400   border-amber-500/20' }
  if (action === 'investigate') return { label: 'Investigate', cls: 'bg-red-500/10     text-red-400     border-red-500/20' }
  return { label: 'Unscored', cls: 'bg-white/5 text-white/40 border-white/10' }
}

function daysAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return d === 0 ? 'today' : d === 1 ? '1 day ago' : `${d} days ago`
}

// ── Add Contractor Modal ──────────────────────────────────────────────────────
function AddContractorModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName]       = useState('')
  const [role, setRole]       = useState('')
  const [contact, setContact] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), role: role.trim() || undefined, contact: contact.trim() || undefined }),
      })
      if (!res.ok) throw new Error('Failed to create contractor')
      onCreated()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f14] p-8 shadow-2xl"
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Add Contractor</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">Name *</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ravi Kumar"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">Role</label>
            <input
              value={role} onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Plumber, Electrician"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">Contact</label>
            <input
              value={contact} onChange={(e) => setContact(e.target.value)}
              placeholder="Phone or email"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 py-3 text-sm font-medium text-white/60 hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || !name.trim()}
              className="flex-1 rounded-lg bg-[#f0b429] py-3 text-sm font-semibold text-black hover:bg-[#f0b429] disabled:opacity-50 transition-colors">
              {loading ? 'Adding…' : 'Add Contractor'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── Audit Brief Panel ─────────────────────────────────────────────────────────
function AuditBriefPanel({ brief, streaming, onClose }: { brief: string; streaming: boolean; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
      className="mt-4 rounded-xl border border-sky-500/20 bg-sky-500/5 p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-sky-400">AI Audit Brief</span>
          {streaming && <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />}
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      {/* Serif card — intentional contrast, tokens stream in live */}
      <p className="font-serif text-sm leading-relaxed text-white/80">
        {brief}
        {streaming && <span className="animate-pulse text-sky-400">▍</span>}
      </p>
    </motion.div>
  )
}

// ── Contractor Card ───────────────────────────────────────────────────────────
function ContractorCard({
  contractor, onScored, index
}: {
  contractor: Contractor
  onScored: () => void
  index: number
}) {
  const [scoring, setScoring]       = useState(false)
  const [briefing, setBriefing]     = useState(false)
  const [brief, setBrief]           = useState<string | null>(null)
  // brief === null → not requested; brief === '' → streaming started; brief === 'text' → done
  const [scoreError, setScoreError] = useState('')

  const colors = riskColor(contractor.risk_score)
  const action = actionBadge(contractor.risk_action)
  const isGated = contractor.risk_score > 65 && contractor.risk_score > 0
  const hasScore = contractor.risk_score > 0 || contractor.risk_action

  async function handleScore() {
    setScoring(true)
    setScoreError('')
    try {
      const res = await fetch(`/api/risk/score/${contractor.id}`, { method: 'POST' })
      if (!res.ok) throw new Error('Scoring failed')
      onScored()
    } catch (e: any) {
      setScoreError('Scoring failed — check FastAPI connection')
    } finally {
      setScoring(false)
    }
  }

  async function handleBrief() {
    if (brief) { setBrief(null); return }
    setBriefing(true)
    setBrief('')
    try {
      const res = await fetch(`/api/risk/brief/stream/${contractor.id}`, { method: 'POST' })
      if (!res.ok) throw new Error('Brief generation failed')

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let text = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        setBrief(text)
      }
    } catch {
      setBrief('Failed to generate brief. Ensure FastAPI is running.')
    } finally {
      setBriefing(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 hover:border-white/14 hover:bg-white/[0.05] transition-all duration-200"
    >
      {/* Top row: name + risk badge */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/8">
            <User className="h-5 w-5 text-white/60" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{contractor.name}</h3>
            <p className="text-xs text-white/40">{contractor.role || 'Contractor'}</p>
          </div>
        </div>

        {/* Risk score badge */}
        {hasScore ? (
          <div className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 ${colors.bg} ${colors.border}`}>
            <span className={`font-mono text-lg font-bold tabular-nums ${colors.text}`}>
              {contractor.risk_score}
            </span>
            <div>
              <p className={`text-xs font-semibold ${colors.text}`}>{riskLabel(contractor.risk_score)}</p>
              {contractor.risk_reason && (
                <p className="text-xs text-white/40 max-w-[120px] truncate" title={contractor.risk_reason}>
                  {contractor.risk_reason}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">
            <p className="text-xs text-white/30">Not scored</p>
          </div>
        )}
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${action.cls}`}>
          {action.label}
        </span>
        {contractor.total_paid > 0 && (
          <span className="text-xs text-white/40">
            ₹{contractor.total_paid.toLocaleString('en-IN', { maximumFractionDigits: 0 })} paid
          </span>
        )}
        <span className="text-xs text-white/30">
          Active {daysAgo(contractor.last_update)}
        </span>
      </div>

      {/* Payment gate warning */}
      <AnimatePresence>
        {isGated && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/8 px-4 py-3"
          >
            <Lock className="h-4 w-4 flex-shrink-0 text-red-400" />
            <p className="text-xs text-red-300">
              <strong>Payment Gate Active</strong> — {contractor.risk_reason || 'High risk score detected'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audit brief */}
      <AnimatePresence>
        {brief !== null && <AuditBriefPanel brief={brief} streaming={briefing} onClose={() => setBrief(null)} />}
      </AnimatePresence>

      {scoreError && <p className="mb-3 text-xs text-red-400">{scoreError}</p>}

      {/* Action buttons */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={handleScore}
          disabled={scoring}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium text-white/70 hover:border-[#f0b429]/30 hover:bg-[#f0b429]/10 hover:text-[#f0b429] disabled:opacity-50 transition-all duration-150"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${scoring ? 'animate-spin' : ''}`} />
          {scoring ? 'Scoring…' : 'AI Score'}
        </button>

        <button
          onClick={handleBrief}
          disabled={briefing}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium text-white/70 hover:border-sky-500/30 hover:bg-sky-500/10 hover:text-sky-400 disabled:opacity-50 transition-all duration-150"
        >
          <FileText className="h-3.5 w-3.5" />
          {briefing ? 'Generating…' : brief !== null ? 'Hide Brief' : 'Audit Brief'}
        </button>

        <button
          onClick={() => isGated && alert(`Payment blocked: ${contractor.risk_reason}`)}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-semibold transition-all duration-150 ${
            isGated
              ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
              : 'border-[#f0b429]/30 bg-[#f0b429]/10 text-[#f0b429] hover:bg-[#f0b429]/15'
          }`}
        >
          {isGated ? <Lock className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
          {isGated ? 'Blocked' : 'Release'}
        </button>
      </div>
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ContractorsPage() {
  const router = useRouter()
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [showAdd, setShowAdd]         = useState(false)
  const [alerts, setAlerts]           = useState<any[]>([])

  const fetchContractors = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/contractors')
      if (res.status === 401) { router.push('/auth'); return }
      if (!res.ok) throw new Error('Failed to load contractors')
      setContractors(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [router])

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/risk/alerts')
      if (res.ok) setAlerts(await res.json())
    } catch { /* alerts are optional */ }
  }, [])

  useEffect(() => {
    fetchContractors()
    fetchAlerts()
  }, [fetchContractors, fetchAlerts])

  const highRisk = contractors.filter((c) => c.risk_score > 65).length
  const avgScore = contractors.length
    ? Math.round(contractors.reduce((s, c) => s + c.risk_score, 0) / contractors.length)
    : 0

  return (
    <div className="min-h-screen bg-[var(--bg)] px-6 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="space-y-1">
            <button
              onClick={() => router.push('/dashboard')}
              className="mb-2 flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
            </button>
            <h1 className="type-h1">Contractors</h1>
            <p className="type-body mt-1">Track payments and risk across all contractors</p>
          </div>

          <button
            onClick={() => setShowAdd(true)}
            className="btn-ghost flex items-center gap-2"
            style={{ border: '1px solid var(--signal)', color: 'var(--signal)' }}
          >
            <Plus className="h-4 w-4" />
            Add Contractor
          </button>
        </motion.div>

        {/* Ghost alerts banner */}
        <AnimatePresence>
          {alerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="rounded-xl border border-amber-500/20 bg-amber-500/8 p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-semibold text-amber-400">
                  {alerts.length} Ghost Contractor Alert{alerts.length > 1 ? 's' : ''}
                </span>
              </div>
              <ul className="space-y-2">
                {alerts.map((a) => (
                  <li key={a.contractor_id} className="text-xs text-white/60">
                    <span className="text-white/80 font-medium">{a.contractor_name}</span> — {a.alert_text}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats row */}
        {contractors.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
            className="grid grid-cols-3 gap-4"
          >
            {[
              { label: 'Total Contractors', value: contractors.length.toString() },
              { label: 'Avg Risk Score', value: avgScore > 0 ? avgScore.toString() : '—' },
              { label: 'High Risk', value: highRisk.toString(), warn: highRisk > 0 },
            ].map(({ label, value, warn }) => (
              <div key={label} className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs text-white/40 mb-1">{label}</p>
                <p className={`text-2xl font-bold tabular-nums ${warn ? 'text-red-400' : 'text-white'}`}>
                  {value}
                </p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl border border-white/8 bg-white/[0.03]" />
            ))}
          </div>
        )}

        {/* Contractor grid */}
        {!loading && contractors.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-20 text-center"
          >
            <User className="mb-4 h-10 w-10 text-white/20" />
            <p className="text-base font-medium text-white/50">No contractors yet</p>
            <p className="mt-1 text-sm text-white/30">Add your first contractor to start AI risk scoring</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-6 rounded-lg bg-[#f0b429]/10 border border-[#f0b429]/20 px-5 py-2.5 text-sm font-medium text-[#f0b429] hover:bg-[#f0b429]/15 transition-colors"
            >
              Add Contractor
            </button>
          </motion.div>
        )}

        {!loading && contractors.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {contractors.map((c, i) => (
              <ContractorCard key={c.id} contractor={c} onScored={fetchContractors} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Add modal */}
      <AnimatePresence>
        {showAdd && (
          <AddContractorModal
            onClose={() => setShowAdd(false)}
            onCreated={fetchContractors}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
