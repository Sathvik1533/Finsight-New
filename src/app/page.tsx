'use client'

import { motion, useInView, animate } from 'framer-motion'
import Link from 'next/link'
import { useRef, useEffect, useState } from 'react'

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' as any })
  return { ref, inView }
}

// Animated counter
function Counter({ to, prefix = '', suffix = '' }: { to: number; prefix?: string; suffix?: string }) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, to, {
      duration: 1.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setVal(Math.round(v)),
    })
    return controls.stop
  }, [inView, to])

  return (
    <span ref={ref}>
      {prefix}{val.toLocaleString('en-IN')}{suffix}
    </span>
  )
}

const RECEIPTS = [
  {
    filename: 'IMG_3847.jpg',
    steps: [
      { delay: 0.6,  field: 'merchant', value: 'Swiggy Business',             color: 'var(--t100)' },
      { delay: 1.1,  field: 'amount',   value: '₹1,247.00',                   color: '#f2f4f7' },
      { delay: 1.55, field: 'date',     value: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), color: 'var(--t60)' },
      { delay: 2.0,  field: 'gst_head', value: 'Food & Beverage',              color: '#f0b429' },
      { delay: 2.4,  field: 'gst_rate', value: '5%',                           color: '#f0b429' },
      { delay: 2.75, field: 'itc',      value: 'not eligible',                 color: 'rgba(255,255,255,0.35)' },
    ],
    itc: null as string | null,
    confidence: '96.1%',
  },
  {
    filename: 'IMG_5291.jpg',
    steps: [
      { delay: 0.6,  field: 'merchant', value: 'Airtel Postpaid',              color: 'var(--t100)' },
      { delay: 1.1,  field: 'amount',   value: '₹699.00',                     color: '#f2f4f7' },
      { delay: 1.55, field: 'date',     value: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), color: 'var(--t60)' },
      { delay: 2.0,  field: 'gst_head', value: 'Telecom Services',             color: '#f0b429' },
      { delay: 2.4,  field: 'gst_rate', value: '18%',                          color: '#f0b429' },
      { delay: 2.75, field: 'itc',      value: 'eligible  ₹107 claimable',     color: '#22c55e' },
    ],
    itc: '₹107' as string | null,
    confidence: '98.4%',
  },
  {
    filename: 'IMG_6014.jpg',
    steps: [
      { delay: 0.6,  field: 'merchant', value: 'Amazon Business',              color: 'var(--t100)' },
      { delay: 1.1,  field: 'amount',   value: '₹3,499.00',                   color: '#f2f4f7' },
      { delay: 1.55, field: 'date',     value: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), color: 'var(--t60)' },
      { delay: 2.0,  field: 'gst_head', value: 'Office Supplies',              color: '#f0b429' },
      { delay: 2.4,  field: 'gst_rate', value: '18%',                          color: '#f0b429' },
      { delay: 2.75, field: 'itc',      value: 'eligible  ₹530 claimable',     color: '#22c55e' },
    ],
    itc: '₹530' as string | null,
    confidence: '99.1%',
  },
]

// The receipt demo card — the hero visual
function ReceiptDemo({ receipt }: { receipt: typeof RECEIPTS[0] }) {
  const STEPS = receipt.steps

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 420 }}>
      {/* Ambient glow behind card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 1.2 }}
        style={{
          position: 'absolute',
          top: '20%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 280, height: 280,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(240,180,41,0.12) 0%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        style={{
          position: 'relative',
          background: 'linear-gradient(135deg, #13131c 0%, #0e0e16 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: '28px 28px 24px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Scanning line */}
        <motion.div
          initial={{ top: '0%', opacity: 0 }}
          animate={{ top: ['0%', '100%', '100%'], opacity: [0, 1, 0] }}
          transition={{ delay: 0.5, duration: 2.2, ease: 'linear' }}
          style={{
            position: 'absolute',
            left: 0, right: 0,
            height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(240,180,41,0.6), transparent)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 22,
          paddingBottom: 16,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 9,
              fontWeight: 600, letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.25)',
              marginBottom: 5,
            }}>
              Receipt · Auto-processing
            </div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 13, fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--t100)',
            }}>
              {receipt.filename}
            </div>
          </div>

          {/* Processing badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(240,180,41,0.08)',
              border: '1px solid rgba(240,180,41,0.2)',
              borderRadius: 20,
              padding: '5px 10px',
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              style={{ width: 5, height: 5, borderRadius: '50%', background: '#f0b429' }}
            />
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9,
              fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#f0b429',
            }}>
              AI scanning
            </span>
          </motion.div>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {STEPS.map((step, i) => (
            <motion.div
              key={step.field}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: step.delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center',
                padding: '11px 0',
                borderBottom: i < STEPS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}
            >
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 10,
                fontWeight: 500, letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.28)',
              }}>
                {step.field}
              </span>
              <span style={{
                fontFamily: step.field === 'amount' || step.field === 'gst_rate'
                  ? 'var(--font-mono)' : 'var(--font-body)',
                fontSize: 13, fontWeight: 500,
                letterSpacing: '-0.01em',
                color: step.color,
              }}>
                {step.value}
              </span>
            </motion.div>
          ))}
        </div>

        {/* ITC savings badge — appears last, only when eligible */}
        {receipt.itc !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 3.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              marginTop: 20,
              background: 'rgba(34,197,94,0.06)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 10,
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: 12,
              color: 'rgba(255,255,255,0.55)',
            }}>
              ITC claimable this receipt
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 16,
              fontWeight: 700, letterSpacing: '-0.04em',
              color: '#22c55e',
            }}>
              {receipt.itc}
            </span>
          </motion.div>
        )}

        {/* Confidence score */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.4, duration: 0.4 }}
          style={{
            marginTop: receipt.itc !== null ? 10 : 20,
            textAlign: 'right',
          }}
        >
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9,
            fontWeight: 500, letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.2)',
          }}>
            confidence {receipt.confidence}
          </span>
        </motion.div>
      </motion.div>

      {/* Floating tag — GST */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7, rotate: -6 }}
        animate={{ opacity: 1, scale: 1, rotate: -3 }}
        transition={{ delay: 2.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'absolute',
          top: -18, right: -20,
          background: '#0e0e16',
          border: '1px solid rgba(240,180,41,0.35)',
          borderRadius: 8,
          padding: '7px 12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>
          GST Head
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, letterSpacing: '-0.02em', color: '#f0b429' }}>
          {STEPS[3].value} · {STEPS[4].value}
        </div>
      </motion.div>

      {/* Floating tag — saved (only when ITC eligible) */}
      {receipt.itc !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7, rotate: 4 }}
          animate={{ opacity: 1, scale: 1, rotate: 2 }}
          transition={{ delay: 3.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'absolute',
            bottom: -16, left: -22,
            background: '#0e0e16',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: 8,
            padding: '7px 12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(34,197,94,0.5)', marginBottom: 2 }}>
            Saved
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, letterSpacing: '-0.04em', color: '#22c55e' }}>
            {receipt.itc}
          </div>
        </motion.div>
      )}
    </div>
  )
}

const FEATURES = [
  {
    n: '01',
    title: 'Instant categorisation',
    body: 'Every expense lands in the right bucket. No rules to write. No training required.',
    accent: false,
  },
  {
    n: '02',
    title: 'ITC flagged automatically',
    body: 'Input Tax Credit eligibility surfaces on every transaction — before you file.',
    accent: true,
  },
  {
    n: '03',
    title: 'Cash flow radar',
    body: '30, 60, and 90-day views. Anomalies appear before they become surprises.',
    accent: false,
  },
  {
    n: '04',
    title: 'CA-ready in one click',
    body: 'PDF with GST summary, ITC totals, and category breakdown. Signed off and gone.',
    accent: false,
  },
]

const COMPARE = [
  { f: 'Indian GST categories',   fs: true,  xl: false, tally: true  },
  { f: 'Receipt scan on mobile',  fs: true,  xl: false, tally: false },
  { f: 'ITC eligibility per row', fs: true,  xl: false, tally: true  },
  { f: 'Real-time cash view',     fs: true,  xl: false, tally: false },
  { f: 'CA export PDF',           fs: true,  xl: false, tally: true  },
  { f: 'Freelancer pricing',      fs: true,  xl: true,  tally: false },
]

export default function Page() {
  const featRef = useReveal()
  const pipeRef = useReveal()
  const cmpRef  = useReveal()
  const ctaRef  = useReveal()

  const [receiptIndex, setReceiptIndex] = useState(0)
  const [demoKey, setDemoKey] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setReceiptIndex(i => (i + 1) % RECEIPTS.length)
      setDemoKey(k => k + 1)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div style={{ background: 'var(--bg)', overflowX: 'hidden' }}>

      {/* NAV */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(10,10,15,0.88)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div className="page-container" style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', height: 56,
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 16,
            fontWeight: 600, letterSpacing: '-0.035em',
          }}>
            Fin<span style={{ color: 'var(--signal)' }}>Sight</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/auth/login" style={{
              color: 'var(--t60)', fontSize: 13, fontWeight: 500,
              textDecoration: 'none', letterSpacing: '-0.01em',
              padding: '7px 14px',
            }}>
              Sign in
            </Link>
            <Link href="/auth/signup">
              <button style={{
                background: 'var(--signal)',
                border: 'none',
                color: '#07070d',
                fontFamily: 'var(--font-body)',
                fontSize: 13, fontWeight: 600,
                letterSpacing: '-0.01em',
                padding: '7px 16px',
                borderRadius: 6,
                cursor: 'pointer',
              }}>
                Get started →
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO — split layout: left copy + right receipt demo */}
      <section style={{
        minHeight: 'calc(100vh - 56px)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        alignItems: 'center',
        gap: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Radial gradient — left side warmth */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: 'radial-gradient(ellipse 60% 80% at 20% 50%, rgba(240,180,41,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Subtle grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 100% 100% at 0% 50%, black 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at 0% 50%, black 30%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* LEFT — copy */}
        <div style={{
          position: 'relative', zIndex: 1,
          padding: '80px 48px 80px 64px',
        }}>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(240,180,41,0.07)',
              border: '1px solid rgba(240,180,41,0.2)',
              borderRadius: 20,
              padding: '5px 12px 5px 8px',
              marginBottom: 32,
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              background: 'rgba(240,180,41,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f0b429' }} />
            </div>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#f0b429',
            }}>
              AI expense intelligence · India
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.8rem, 4.5vw, 4.2rem)',
              fontWeight: 700,
              letterSpacing: '-0.045em',
              lineHeight: 1.02,
              color: 'var(--t100)',
              margin: '0 0 22px',
            }}
          >
            Photograph a receipt.
            <br />
            <span style={{
              background: 'linear-gradient(90deg, #f0b429 0%, #fcd34d 40%, #fffbe6 55%, #fcd34d 70%, #f0b429 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'shimmer-once 1.4s ease 0.6s 1 forwards',
            }}>
              FinSight does the rest.
            </span>
          </motion.h1>

          {/* Body */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            style={{
              fontSize: 16, lineHeight: 1.72,
              color: 'rgba(255,255,255,0.48)',
              maxWidth: 400, marginBottom: 40,
            }}
          >
            Every expense categorised, every ITC claim surfaced, every
            GST head tagged — automatically. No accountant needed.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
            style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}
          >
            <Link href="/auth/signup">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                animate={{
                  boxShadow: [
                    '0 0 0 0 rgba(240,180,41,0)',
                    '0 0 24px 6px rgba(240,180,41,0.35)',
                    '0 0 0 0 rgba(240,180,41,0)',
                  ],
                }}
                transition={{
                  boxShadow: {
                    duration: 2.2,
                    repeat: Infinity,
                    repeatDelay: 1.8,
                    ease: 'easeInOut',
                  },
                }}
                style={{
                  background: '#f0b429',
                  border: 'none',
                  color: '#07070d',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14, fontWeight: 700,
                  letterSpacing: '-0.01em',
                  padding: '13px 28px',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                Start free →
              </motion.button>
            </Link>
            <a href="#how" style={{ textDecoration: 'none' }}>
              <motion.button
                whileHover={{ color: 'rgba(255,255,255,0.8)' }}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.42)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14, fontWeight: 500,
                  letterSpacing: '-0.01em',
                  padding: '13px 24px',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                See how it works
              </motion.button>
            </a>
          </motion.div>

          {/* Stats — three numbers below CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            style={{
              display: 'flex', gap: 36,
              marginTop: 52,
              paddingTop: 32,
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {[
              { n: 97, suffix: '%', label: 'OCR accuracy' },
              { n: 2,  suffix: 's',  label: 'per receipt' },
              { n: 12, suffix: '',   label: 'GST categories' },
            ].map((s) => (
              <div key={s.label}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 22, fontWeight: 700,
                  letterSpacing: '-0.04em',
                  color: 'var(--t100)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  <Counter to={s.n} suffix={s.suffix} />
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  fontWeight: 500, letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.25)',
                  marginTop: 4,
                }}>
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* RIGHT — Receipt demo */}
        <div style={{
          position: 'relative', zIndex: 1,
          padding: '80px 64px 80px 48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <ReceiptDemo key={demoKey} receipt={RECEIPTS[receiptIndex]} />
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{
        padding: '96px 0',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div className="page-container">
          <div ref={featRef.ref}>
            <motion.p
              initial={{ opacity: 0 }}
              animate={featRef.inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.4 }}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 10,
                fontWeight: 500, letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.28)', marginBottom: 14,
              }}
            >
              Capabilities
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              animate={featRef.inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.9rem, 3.2vw, 2.7rem)',
                fontWeight: 300, letterSpacing: '-0.04em',
                color: 'var(--t100)', lineHeight: 1.05, marginBottom: 52,
              }}
            >
              Everything your accountant
              <br />
              has been asking for.
            </motion.h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.n}
                  initial={{ opacity: 0, y: 10 }}
                  animate={featRef.inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.45, delay: 0.1 + i * 0.07 }}
                  style={{
                    padding: '30px 26px',
                    borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    borderTop: f.accent ? '2px solid var(--signal)' : undefined,
                    background: f.accent ? 'rgba(240,180,41,0.025)' : 'transparent',
                  }}
                >
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    fontWeight: 500, letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: f.accent ? 'var(--signal)' : 'rgba(255,255,255,0.2)',
                    marginBottom: 16,
                  }}>
                    {f.n}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 15, fontWeight: 500,
                    letterSpacing: '-0.02em',
                    color: 'var(--t100)', marginBottom: 10,
                  }}>
                    {f.title}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--t60)', lineHeight: 1.68, margin: 0 }}>
                    {f.body}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{
        padding: '96px 0',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: '#0a0a0f',
      }}>
        <div className="page-container">
          <div
            ref={pipeRef.ref}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}
          >
            <div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={pipeRef.inView ? { opacity: 1 } : {}}
                transition={{ duration: 0.4 }}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  fontWeight: 500, letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.28)', marginBottom: 14,
                }}
              >
                How it works
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 14 }}
                animate={pipeRef.inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.7rem, 2.8vw, 2.3rem)',
                  fontWeight: 300, letterSpacing: '-0.04em',
                  color: 'var(--t100)', lineHeight: 1.08, marginBottom: 18,
                }}
              >
                Photograph it.
                <br />
                Everything else is automatic.
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={pipeRef.inView ? { opacity: 1 } : {}}
                transition={{ duration: 0.45, delay: 0.14 }}
                style={{
                  fontSize: 14, color: 'rgba(255,255,255,0.45)',
                  lineHeight: 1.72, maxWidth: 320, margin: 0,
                }}
              >
                No setup. No rules engine. No manual entry.
                The pipeline runs on every upload.
              </motion.p>
            </div>

            <div>
              {[
                { n: '01', t: 'Photograph', d: 'Any receipt. Phone camera. Any condition.' },
                { n: '02', t: 'Extract',    d: 'Merchant, amount, date pulled in under 2 seconds.' },
                { n: '03', t: 'Categorise', d: 'Expense mapped to GST head, ITC eligibility flagged.' },
                { n: '04', t: 'Report',     d: 'Dashboard updates. CA export available immediately.' },
              ].map((step, i) => (
                <motion.div
                  key={step.n}
                  initial={{ opacity: 0, x: 14 }}
                  animate={pipeRef.inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                  style={{
                    display: 'flex', gap: 22, padding: '20px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    fontWeight: 500, letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.2)',
                    minWidth: 22, paddingTop: 3,
                  }}>
                    {step.n}
                  </span>
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 14, fontWeight: 500,
                      letterSpacing: '-0.02em',
                      color: 'var(--t100)', marginBottom: 4,
                    }}>
                      {step.t}
                    </div>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', lineHeight: 1.65, margin: 0 }}>
                      {step.d}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section style={{
        padding: '96px 0',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div className="page-container">
          <div ref={cmpRef.ref}>
            <motion.p
              initial={{ opacity: 0 }}
              animate={cmpRef.inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.4 }}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 10,
                fontWeight: 500, letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.28)', marginBottom: 14,
              }}
            >
              Why FinSight
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              animate={cmpRef.inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.7rem, 2.8vw, 2.3rem)',
                fontWeight: 300, letterSpacing: '-0.04em',
                color: 'var(--t100)', lineHeight: 1.08, marginBottom: 44,
              }}
            >
              Built for Indian tax reality.
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={cmpRef.inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{ border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}
            >
              <div style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.015)',
              }}>
                {['Feature','FinSight','Excel','Tally'].map((h, i) => (
                  <div key={h} style={{
                    padding: '11px 16px',
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    fontWeight: 500, letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: i === 1 ? 'var(--signal)' : 'rgba(255,255,255,0.28)',
                    borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}>
                    {h}
                  </div>
                ))}
              </div>
              {COMPARE.map((row, i) => (
                <div key={row.f} style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  borderBottom: i < COMPARE.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}>
                  <div style={{
                    padding: '13px 16px', fontSize: 13,
                    color: 'rgba(255,255,255,0.5)',
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    {row.f}
                  </div>
                  {[row.fs, row.xl, row.tally].map((v, j) => (
                    <div key={j} style={{
                      padding: '13px 16px',
                      borderRight: j < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                      display: 'flex', alignItems: 'center',
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
                        color: j === 0
                          ? (v ? 'var(--signal)' : 'rgba(255,255,255,0.15)')
                          : (v ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.15)'),
                      }}>
                        {v ? '✓' : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '96px 0',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'var(--surface)',
        textAlign: 'center',
      }}>
        <div className="page-container">
          <div ref={ctaRef.ref}>
            <motion.p
              initial={{ opacity: 0 }}
              animate={ctaRef.inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.4 }}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 10,
                fontWeight: 500, letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.28)', marginBottom: 18,
              }}
            >
              Free during beta
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              animate={ctaRef.inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.1rem, 4.2vw, 3.4rem)',
                fontWeight: 300, letterSpacing: '-0.04em',
                color: 'var(--t100)', lineHeight: 1.05, marginBottom: 22,
              }}
            >
              Stop losing ITC claims
              <br />
              to manual errors.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={ctaRef.inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.45, delay: 0.14 }}
              style={{
                fontSize: 14, color: 'rgba(255,255,255,0.42)',
                lineHeight: 1.7, marginBottom: 40,
              }}
            >
              Join Indian freelancers who never enter an expense manually.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={ctaRef.inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: 0.2 }}
            >
              <Link href="/auth/signup">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    background: '#f0b429',
                    border: 'none',
                    color: '#07070d',
                    fontFamily: 'var(--font-body)',
                    fontSize: 14, fontWeight: 700,
                    letterSpacing: '-0.01em',
                    padding: '14px 36px',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  Create free account →
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px 0' }}>
        <div className="page-container" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 14, fontWeight: 600, letterSpacing: '-0.03em',
          }}>
            Fin<span style={{ color: 'var(--signal)' }}>Sight</span>
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            fontWeight: 500, letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.18)',
          }}>
            Expense intelligence for Indian freelancers
          </span>
        </div>
      </footer>

    </div>
  )
}
