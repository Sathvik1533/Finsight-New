'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Eye, EyeOff, Check } from 'lucide-react'

const EASE = [0.22, 1, 0.36, 1] as const

const STATS = [
  { value: '97%',  label: 'OCR accuracy' },
  { value: '< 2s', label: 'per receipt' },
  { value: '₹0',   label: 'to start' },
]

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  padding: '12px 14px',
  color: 'var(--t100)',
  fontSize: 14,
  fontFamily: 'var(--font-body)',
  outline: 'none',
  transition: 'border-color 0.15s',
}

function FocusInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      {...props}
      style={{
        ...INPUT_STYLE,
        ...(props.style ?? {}),
        borderColor: focused ? 'rgba(240,180,41,0.4)' : 'rgba(255,255,255,0.08)',
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

export default function SignUpPage() {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)
  const [showPass, setShowPass] = useState(false)
  const supabase = createClient()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: name },
      },
    })
    if (error) { setError(error.message); setLoading(false) }
    else { setSuccess(true); setLoading(false) }
  }

  const strengthColor =
    password.length >= 10 ? 'var(--signal)'
    : password.length >= 7 ? 'var(--amber)'
    : 'var(--red)'

  return (
    <div style={{ height: '100vh', display: 'flex', overflow: 'hidden', background: '#07070d' }}>

      {/* LEFT — brand panel 40% */}
      <div style={{
        width: '40%',
        flexShrink: 0,
        position: 'relative',
        background: '#0a0a0f',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        padding: '48px 48px 40px',
        overflow: 'hidden',
      }}>

        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
        }} />

        {/* Gold glow bottom-left */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, zIndex: 0,
          width: '100%', height: '100%',
          background: 'radial-gradient(ellipse 60% 50% at 0% 100%, rgba(240,180,41,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16, fontWeight: 600,
            letterSpacing: '-0.035em',
            color: 'var(--t100)',
          }}>
            Fin<span style={{ color: 'var(--signal)' }}>Sight</span>
          </span>
        </div>

        {/* Center content — quote + stats */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
          <div>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem, 2.8vw, 2.4rem)',
              fontWeight: 300,
              letterSpacing: '-0.04em',
              lineHeight: 1.08,
              color: 'var(--t100)',
              marginBottom: 48,
            }}>
              Your receipts.
              <br />
              <span style={{ color: 'var(--signal)' }}>Finally organised.</span>
            </p>

            {/* Micro-stats with left gold bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {STATS.map((s) => (
                <div
                  key={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: 16 }}
                >
                  <div style={{ width: 3, height: 32, borderRadius: 2, background: 'rgba(240,180,41,0.5)', flexShrink: 0 }} />
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 20, fontWeight: 700,
                      letterSpacing: '-0.04em',
                      color: 'var(--signal)',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1,
                    }}>
                      {s.value}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      fontWeight: 500, letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.28)',
                      marginTop: 3,
                    }}>
                      {s.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom — testimonial */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{
            fontSize: 12,
            fontStyle: 'italic',
            color: 'rgba(255,255,255,0.3)',
            lineHeight: 1.6,
            margin: 0,
          }}>
            &ldquo;Saved 3 hours per month on CA prep.&rdquo;<br />
            <span style={{ fontStyle: 'normal', color: 'rgba(255,255,255,0.2)' }}>
              — Rahul M., Freelance Designer
            </span>
          </p>
        </div>
      </div>

      {/* RIGHT — form panel 60% */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        overflowY: 'auto',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          style={{ width: '100%', maxWidth: 360 }}
        >
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: 'center', padding: '32px 0' }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 14, stiffness: 280, delay: 0.1 }}
                  style={{
                    width: 56, height: 56, borderRadius: 6,
                    background: 'rgba(240,180,41,0.06)',
                    border: '1px solid rgba(240,180,41,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 24px',
                  }}
                >
                  <Check size={24} color="var(--signal)" />
                </motion.div>
                <h2 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.6rem', fontWeight: 300,
                  letterSpacing: '-0.04em',
                  color: 'var(--t100)', marginBottom: 12,
                }}>
                  You&apos;re in
                </h2>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 32 }}>
                  Account created for <span style={{ color: 'var(--t100)' }}>{email}</span>.
                </p>
                <Link href="/auth/login" style={{
                  fontSize: 13, color: 'var(--signal)',
                  textDecoration: 'none', fontWeight: 500,
                }}>
                  Sign in →
                </Link>
              </motion.div>
            ) : (
              <motion.div key="form">
                <h1 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.5rem, 2.2vw, 1.85rem)',
                  fontWeight: 300,
                  letterSpacing: '-0.04em',
                  color: 'var(--t100)',
                  marginBottom: 6,
                }}>
                  Create your account
                </h1>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginBottom: 32 }}>
                  Free during beta. No card required.
                </p>

                <form onSubmit={handleSignUp} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {/* Full name */}
                  <div>
                    <label style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      fontWeight: 500, letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.35)',
                      display: 'block', marginBottom: 7,
                    }}>
                      Full name
                    </label>
                    <FocusInput
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Priya Sharma"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      fontWeight: 500, letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.35)',
                      display: 'block', marginBottom: 7,
                    }}>
                      Email
                    </label>
                    <FocusInput
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      fontWeight: 500, letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.35)',
                      display: 'block', marginBottom: 7,
                    }}>
                      Password
                    </label>
                    <PasswordInput
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      show={showPass}
                      onToggle={() => setShowPass(p => !p)}
                      placeholder="Min. 8 characters"
                    />
                    {password.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ marginTop: 7, display: 'flex', gap: 4 }}
                      >
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} style={{
                            height: 2, flex: 1, borderRadius: 2,
                            background: password.length >= i * 3 ? strengthColor : 'rgba(255,255,255,0.08)',
                            transition: 'background 0.3s',
                          }} />
                        ))}
                      </motion.div>
                    )}
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        fontSize: 13, color: 'var(--red)',
                        background: 'rgba(224,62,62,0.07)',
                        border: '1px solid rgba(224,62,62,0.18)',
                        borderRadius: 8, padding: '10px 14px',
                      }}
                    >
                      {error}
                    </motion.div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={loading ? {} : { scale: 1.01 }}
                    whileTap={loading ? {} : { scale: 0.98 }}
                    animate={{
                      boxShadow: loading ? '0 0 0 0 rgba(240,180,41,0)' : [
                        '0 0 0 0 rgba(240,180,41,0)',
                        '0 0 20px 5px rgba(240,180,41,0.3)',
                        '0 0 0 0 rgba(240,180,41,0)',
                      ],
                    }}
                    transition={{
                      boxShadow: { duration: 2.2, repeat: Infinity, repeatDelay: 1.8, ease: 'easeInOut' },
                    }}
                    style={{
                      marginTop: 4,
                      width: '100%',
                      background: '#f0b429',
                      border: 'none',
                      color: '#07070d',
                      fontFamily: 'var(--font-body)',
                      fontSize: 14, fontWeight: 700,
                      letterSpacing: '-0.01em',
                      padding: '13px',
                      borderRadius: 8,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    {loading ? (
                      <span style={{
                        width: 14, height: 14,
                        border: '2px solid rgba(7,7,13,0.3)',
                        borderTopColor: '#07070d',
                        borderRadius: '50%',
                        display: 'inline-block',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                    ) : 'Create account →'}
                  </motion.button>
                </form>

                <p style={{
                  textAlign: 'center', fontSize: 13,
                  color: 'rgba(255,255,255,0.3)',
                  marginTop: 24,
                }}>
                  Already have an account?{' '}
                  <Link href="/auth/login" style={{
                    color: 'var(--signal)', textDecoration: 'none', fontWeight: 500,
                  }}>
                    Sign in
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .auth-left-panel { display: none !important; }
        }
      `}</style>
    </div>
  )
}

function PasswordInput({
  value, onChange, show, onToggle, placeholder,
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  show: boolean
  onToggle: () => void
  placeholder: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
        minLength={8}
        style={{
          ...INPUT_STYLE,
          paddingRight: 44,
          borderColor: focused ? 'rgba(240,180,41,0.4)' : 'rgba(255,255,255,0.08)',
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label="Toggle password visibility"
        style={{
          position: 'absolute', right: 14,
          top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none',
          color: 'rgba(255,255,255,0.3)',
          cursor: 'pointer', padding: 0,
        }}
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}
