'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, User, Trash2, RefreshCw, FileText, Lock, CheckCircle, AlertTriangle, X } from 'lucide-react'
import { BlurFade } from '@/components/ui/blur-fade'
import { toast } from 'sonner'

type Contractor = {
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

function inr(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function riskBadge(score: number) {
  if (score <= 0)  return { label: 'Unscored',  bg: 'rgba(255,255,255,0.04)', color: 'var(--t30)',  border: 'var(--hair)' }
  if (score <= 30) return { label: 'Low Risk',  bg: 'rgba(240,180,41,0.1)',  color: 'var(--gold)', border: 'rgba(240,180,41,0.25)' }
  if (score <= 65) return { label: 'Moderate',  bg: 'rgba(245,158,11,0.1)',  color: '#fbbf24',     border: 'rgba(245,158,11,0.25)' }
  return               { label: 'High Risk',    bg: 'rgba(239,68,68,0.1)',   color: '#f87171',     border: 'rgba(239,68,68,0.25)' }
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

// ── Add Contractor Modal ──────────────────────────────────────────────────────
function AddModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName]       = useState('')
  const [role, setRole]       = useState('')
  const [contact, setContact] = useState('')
  const [notes, setNotes]     = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr('Name is required'); return }
    setLoading(true); setErr('')
    try {
      const res = await fetch('/api/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          role: role.trim() || undefined,
          contact: contact.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to create contractor')
      toast.success(`${name.trim()} added`)
      onCreated(); onClose()
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
        style={{ width: '100%', maxWidth: 440, background: '#0f0f14', border: '1px solid var(--hair)', borderRadius: 16, padding: 28 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 400, letterSpacing: '-0.03em', color: 'var(--t100)' }}>
            Add Contractor
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t30)', padding: 0 }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Name *',           value: name,    set: setName,    placeholder: 'e.g. Ravi Kumar' },
            { label: 'Role',             value: role,    set: setRole,    placeholder: 'e.g. Electrician' },
            { label: 'Phone / Email',    value: contact, set: setContact, placeholder: 'e.g. 9876543210' },
            { label: 'Notes',            value: notes,   set: setNotes,   placeholder: 'Optional notes' },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t40)', marginBottom: 7 }}>
                {label}
              </label>
              <input
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                style={{
                  width: '100%', padding: '10px 13px', boxSizing: 'border-box',
                  background: 'var(--surface)', border: '1px solid var(--hair)',
                  borderRadius: 8, fontSize: 13, color: 'var(--t80)',
                  fontFamily: 'var(--font-body)', outline: 'none',
                }}
              />
            </div>
          ))}

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
              {loading ? 'Adding…' : 'Add Contractor'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── Delete Confirmation Modal ─────────────────────────────────────────────────
function DeleteModal({ name, onClose, onConfirm, loading }: {
  name: string; onClose: () => void; onConfirm: () => void; loading: boolean
}) {
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
        style={{ width: '100%', maxWidth: 380, background: '#0f0f14', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: 28 }}
      >
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Trash2 size={18} style={{ color: '#f87171' }} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 400, letterSpacing: '-0.03em', color: 'var(--t100)', marginBottom: 8 }}>
          Delete contractor?
        </h2>
        <p style={{ fontSize: 13, color: 'var(--t40)', lineHeight: 1.6, marginBottom: 22 }}>
          <strong style={{ color: 'var(--t70)' }}>{name}</strong> will be permanently removed. This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '11px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: 'transparent', border: '1px solid var(--hair)', color: 'var(--t40)',
            fontFamily: 'var(--font-body)', cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} style={{
            flex: 1, padding: '11px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
            background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none',
            fontFamily: 'var(--font-body)', cursor: 'pointer', opacity: loading ? 0.7 : 1,
          }}>
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Contractor Card ───────────────────────────────────────────────────────────
function ContractorCard({ c, index, onDelete, onScored }: {
  c: Contractor; index: number; onDelete: () => void; onScored: () => void
}) {
  const [scoring, setScoring]   = useState(false)
  const [scoreErr, setScoreErr] = useState('')
  const badge = riskBadge(c.risk_score)
  const isGated = c.risk_score > 65 && c.risk_score > 0

  async function handleScore() {
    setScoring(true); setScoreErr('')
    try {
      const res = await fetch(`/api/risk/score/${c.id}`, { method: 'POST' })
      if (!res.ok) throw new Error()
      onScored()
      toast.success('Risk score updated')
    } catch {
      setScoreErr('Scoring failed — check FastAPI')
    } finally {
      setScoring(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      style={{
        background: 'var(--surface)',
        border: isGated ? '1px solid rgba(239,68,68,0.25)' : '1px solid var(--hair)',
        borderRadius: 12, padding: '20px 22px',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: 'rgba(240,180,41,0.08)', border: '1px solid rgba(240,180,41,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--gold)',
          }}>
            {c.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t100)', marginBottom: 2 }}>{c.name}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--t30)' }}>
              {c.role ?? 'Contractor'}{c.contact ? ` · ${c.contact}` : ''}
            </p>
          </div>
        </div>

        {/* Risk badge + delete */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
            padding: '4px 9px', borderRadius: 20,
            background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
          }}>
            {c.risk_score > 0 ? `${c.risk_score} · ` : ''}{badge.label}
          </span>
          <motion.button
            onClick={onDelete}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--t25)', padding: 4, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color 150ms',
            }}
          >
            <Trash2 size={13} />
          </motion.button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--t25)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Total Paid</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: c.total_paid > 0 ? 'var(--t90)' : 'var(--t30)', letterSpacing: '-0.02em' }}>
            {c.total_paid > 0 ? inr(c.total_paid) : '—'}
          </p>
        </div>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--t25)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Status</p>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
            padding: '2px 7px', borderRadius: 4,
            background: c.status === 'active' ? 'rgba(22,163,74,0.1)' : 'rgba(255,255,255,0.05)',
            color: c.status === 'active' ? '#4ade80' : 'var(--t40)',
            border: c.status === 'active' ? '1px solid rgba(22,163,74,0.25)' : '1px solid var(--hair)',
          }}>
            {c.status}
          </span>
        </div>
      </div>

      {/* Payment gate warning */}
      {isGated && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px', borderRadius: 8, marginBottom: 12,
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
        }}>
          <Lock size={12} style={{ color: '#f87171', flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: '#fca5a5' }}>
            Payment gate active — {c.risk_reason ?? 'High risk score'}
          </p>
        </div>
      )}

      {scoreErr && <p style={{ fontSize: 11, color: 'var(--red)', marginBottom: 8 }}>{scoreErr}</p>}

      {/* Action buttons */}
      <motion.button
        onClick={handleScore}
        disabled={scoring}
        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          width: '100%', padding: '9px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
          background: 'transparent', border: '1px solid var(--hair)', color: 'var(--t40)',
          fontFamily: 'var(--font-body)', cursor: 'pointer',
          transition: 'border-color 150ms, color 150ms',
          opacity: scoring ? 0.6 : 1,
        }}
      >
        <RefreshCw size={12} style={{ animation: scoring ? 'spin 1s linear infinite' : 'none' }} />
        {scoring ? 'Scoring…' : 'Run AI Risk Score'}
      </motion.button>
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
  const [deleteTarget, setDeleteTarget] = useState<Contractor | null>(null)
  const [deleting, setDeleting]       = useState(false)

  const fetchContractors = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/contractors')
      if (res.status === 401) { router.push('/auth'); return }
      if (!res.ok) throw new Error('Failed to load contractors')
      setContractors(await res.json())
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchContractors() }, [fetchContractors])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/contractors/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      toast.success(`${deleteTarget.name} removed`)
      setDeleteTarget(null)
      fetchContractors()
    } catch {
      toast.error('Failed to delete contractor')
    } finally {
      setDeleting(false)
    }
  }

  const highRisk = contractors.filter((c) => c.risk_score > 65).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 32px 80px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <BlurFade delay={0} duration={0.5} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>
                Contractors
              </p>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 300, letterSpacing: '-0.04em', color: 'var(--t100)', lineHeight: 1.1 }}>
                All Contractors
              </h1>
              {!loading && contractors.length > 0 && (
                <p style={{ fontSize: 13, color: 'var(--t40)', marginTop: 6 }}>
                  {contractors.length} contractor{contractors.length !== 1 ? 's' : ''}
                  {highRisk > 0 && <span style={{ color: '#f87171' }}> · {highRisk} high risk</span>}
                </p>
              )}
            </div>
            <motion.button
              onClick={() => setShowAdd(true)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'var(--gold)', color: '#09090f',
                border: 'none', borderRadius: 9,
                padding: '11px 20px', fontSize: 13, fontWeight: 700,
                fontFamily: 'var(--font-body)', cursor: 'pointer', letterSpacing: '-0.01em',
              }}
            >
              <Plus size={14} strokeWidth={2.5} />
              Add Contractor
            </motion.button>
          </div>
        </BlurFade>

        {/* Error state */}
        {error && (
          <BlurFade delay={0.05} style={{ marginBottom: 20 }}>
            <div style={{
              background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)',
              borderRadius: 9, padding: '14px 18px', fontSize: 13, color: 'var(--red)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              {error}
              <button onClick={fetchContractors} style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>
                retry
              </button>
            </div>
          </BlurFade>
        )}

        {/* Loading — skeleton cards */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 12 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 12, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Pulse w={40} h={40} r={10} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <Pulse h={13} r={4} />
                    <Pulse w="60%" h={10} r={4} />
                  </div>
                </div>
                <Pulse h={36} r={8} />
                <Pulse h={36} r={8} />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && contractors.length === 0 && (
          <BlurFade delay={0.08}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 14, padding: '80px 24px',
              border: '1px dashed var(--hair)', borderRadius: 12, textAlign: 'center',
            }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(240,180,41,0.08)', border: '1px solid rgba(240,180,41,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={22} style={{ color: 'var(--gold)', opacity: 0.6 }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--t50)', marginBottom: 4 }}>No contractors added yet</p>
                <p style={{ fontSize: 12, color: 'var(--t30)', lineHeight: 1.6 }}>
                  Add your first contractor to start tracking<br />payments and AI risk scoring.
                </p>
              </div>
              <motion.button
                onClick={() => setShowAdd(true)}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: 'var(--gold)', color: '#09090f',
                  border: 'none', borderRadius: 8,
                  padding: '10px 18px', fontSize: 13, fontWeight: 700,
                  fontFamily: 'var(--font-body)', cursor: 'pointer',
                }}
              >
                <Plus size={13} strokeWidth={2.5} />
                Add your first contractor
              </motion.button>
            </div>
          </BlurFade>
        )}

        {/* Contractor grid */}
        {!loading && contractors.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 12 }}>
            {contractors.map((c, i) => (
              <ContractorCard
                key={c.id}
                c={c}
                index={i}
                onDelete={() => setDeleteTarget(c)}
                onScored={fetchContractors}
              />
            ))}
          </div>
        )}

      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAdd && <AddModal onClose={() => setShowAdd(false)} onCreated={fetchContractors} />}
      </AnimatePresence>
      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal
            name={deleteTarget.name}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            loading={deleting}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
