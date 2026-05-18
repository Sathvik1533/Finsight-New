'use client'

import { useState } from 'react'
import Link from 'next/link'

/* ─── Field ───────────────────────────────────────────────────────────── */
function Field({
  label, type = 'text', placeholder, value, onChange, error, hint,
}: {
  label: string
  type?: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  error?: string
  hint?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
        letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t40)',
      }}>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          fontFamily: 'var(--font-body)', fontSize: 14,
          color: 'var(--t100)', background: 'var(--surface)',
          border: `1px solid ${error ? 'var(--error)' : focused ? 'var(--accent)' : 'var(--hair-2)'}`,
          borderRadius: 6, padding: '11px 14px',
          outline: 'none',
          transition: 'border-color 160ms',
          width: '100%', boxSizing: 'border-box',
        }}
      />
      {hint && !error && (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--t40)', letterSpacing: '0.04em',
        }}>
          {hint}
        </span>
      )}
      {error && (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--error)', letterSpacing: '0.04em',
        }}>
          {error}
        </span>
      )}
    </div>
  )
}

/* ─── Submit button ───────────────────────────────────────────────────── */
function SubmitBtn({ label, loading }: { label: string; loading: boolean }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="submit"
      disabled={loading}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', padding: '12px',
        background: loading ? 'var(--accent-hover)' : hover ? 'var(--accent-hover)' : 'var(--accent)',
        color: '#fafaf6', border: 'none', borderRadius: 6,
        fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
        letterSpacing: '0.04em', textTransform: 'uppercase',
        cursor: loading ? 'default' : 'pointer',
        opacity: loading ? 0.75 : 1,
        transition: 'background 160ms, opacity 160ms',
      }}
    >
      {loading ? 'Creating account…' : label}
    </button>
  )
}

/* ─── Freelancer type selector ────────────────────────────────────────── */
const TYPES = ['Freelancer', 'Sole Proprietor', 'Small Business']

function TypeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
        letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t40)',
      }}>
        Business Type
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        {TYPES.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            style={{
              flex: 1, padding: '9px 8px',
              border: `1px solid ${value === t ? 'var(--accent)' : 'var(--hair-2)'}`,
              borderRadius: 6,
              background: value === t ? 'var(--accent-dim)' : 'transparent',
              color: value === t ? 'var(--accent)' : 'var(--t60)',
              fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: value === t ? 500 : 400,
              cursor: 'pointer',
              transition: 'border-color 160ms, background 160ms, color 160ms',
            }}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────── */
export default function SignupPage() {
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [gstin,    setGstin]    = useState('')
  const [password, setPassword] = useState('')
  const [bizType,  setBizType]  = useState('Freelancer')
  const [loading,  setLoading]  = useState(false)
  const [errors,   setErrors]   = useState<{
    name?: string; email?: string; password?: string; gstin?: string
  }>({})

  function validate() {
    const e: typeof errors = {}
    if (!name.trim())              e.name     = 'Enter your full name'
    if (!email.includes('@'))      e.email    = 'Enter a valid email address'
    if (password.length < 8)       e.password = 'Password must be at least 8 characters'
    if (gstin && gstin.length !== 15) e.gstin = 'GSTIN must be 15 characters'
    return e
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setLoading(true)
    setTimeout(() => setLoading(false), 1400)
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Minimal nav */}
      <header style={{
        height: 60, display: 'flex', alignItems: 'center',
        padding: '0 32px', borderBottom: '1px solid var(--hair)',
        background: 'var(--surface)',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500,
            letterSpacing: '-0.025em',
          }}>
            <span style={{ color: 'var(--t100)' }}>Fin</span>
            <span style={{ color: 'var(--accent)' }}>Sight</span>
          </span>
        </Link>
      </header>

      {/* Card */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 16px',
      }}>
        <div style={{
          width: '100%', maxWidth: 440,
          background: 'var(--surface)',
          border: '1px solid var(--hair-2)',
          borderRadius: 10,
          padding: '36px 32px',
        }}>
          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{
              width: 4, height: 4, borderRadius: '50%',
              background: 'var(--t40)', display: 'inline-block',
            }} />
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
              letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--t40)',
            }}>
              Create Account
            </span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400,
            color: 'var(--t100)', margin: '0 0 28px', letterSpacing: '-0.015em',
          }}>
            Start your ledger.
          </h1>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Field
              label="Full Name"
              placeholder="Arjun Mehta"
              value={name}
              onChange={setName}
              error={errors.name}
            />
            <Field
              label="Work Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={setEmail}
              error={errors.email}
            />
            <TypeSelector value={bizType} onChange={setBizType} />
            <Field
              label="GSTIN (optional)"
              placeholder="22AAAAA0000A1Z5"
              value={gstin}
              onChange={setGstin}
              error={errors.gstin}
              hint="15-character GST registration number — skip if not registered"
            />
            <Field
              label="Password"
              type="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={setPassword}
              error={errors.password}
              hint="At least 8 characters"
            />

            {/* forest green mark #1 */}
            <SubmitBtn label="Create account" loading={loading} />
          </form>

          {/* Divider */}
          <div style={{ margin: '24px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--t40)', letterSpacing: '0.08em',
            }}>
              OR
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
          </div>

          {/* Switch to login */}
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 13,
            color: 'var(--t60)', textAlign: 'center', margin: 0,
          }}>
            Already have an account?{' '}
            <Link href="/auth/login" style={{
              color: 'var(--accent)', textDecoration: 'none', fontWeight: 500,
            }}>
              Sign in →
            </Link>
          </p>
        </div>
      </div>

      {/* Footer note */}
      <div style={{ padding: '16px 32px', textAlign: 'center' }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--t40)', letterSpacing: '0.08em',
        }}>
          YOUR DATA NEVER LEAVES INDIA · SOC 2 TYPE II PENDING
        </span>
      </div>
    </div>
  )
}