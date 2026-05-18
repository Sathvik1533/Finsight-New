'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AuditedUnderline } from '@/components/ui/AuditedUnderline'

/* ─── Nav ─────────────────────────────────────────────────────────────── */
function LandingNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      height: 60,
      background: 'var(--surface)',
      borderBottom: scrolled ? '1px solid var(--hair)' : '1px solid transparent',
      transition: 'border-color 200ms',
    }}>
      <div style={{
        height: '100%', maxWidth: 1280, margin: '0 auto', padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Brand */}
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500,
          letterSpacing: '-0.025em', lineHeight: 1, userSelect: 'none',
        }}>
          <span style={{ color: 'var(--t100)' }}>Fin</span>
          <span style={{ color: 'var(--accent)' }}>Sight</span>
        </span>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/auth/login" style={{
            fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 400,
            color: 'var(--t70)', textDecoration: 'none',
            padding: '6px 12px',
            transition: 'color 160ms',
          }}>
            Sign in
          </Link>
          <CTAButton href="/auth/signup" label="Get started" small />
        </div>
      </div>
    </header>
  )
}

/* ─── CTA button ──────────────────────────────────────────────────────── */
function CTAButton({ href, label, small = false }: { href: string; label: string; small?: boolean }) {
  const [hover, setHover] = useState(false)
  const [press, setPress] = useState(false)
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <button
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => { setHover(false); setPress(false) }}
        onMouseDown={() => setPress(true)}
        onMouseUp={() => setPress(false)}
        style={{
          background: press ? '#053a22' : hover ? 'var(--accent-hover)' : 'var(--accent)',
          color: '#fafaf6', border: 'none',
          borderRadius: small ? 6 : 8,
          padding: small ? '8px 16px' : '13px 28px',
          fontFamily: 'var(--font-body)',
          fontSize: small ? 13 : 14,
          fontWeight: 500,
          letterSpacing: small ? '0.02em' : '0.025em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          boxShadow: press
            ? 'inset 0 -1px 0 rgba(0,0,0,0.20)'
            : hover ? 'inset 0 1px 0 rgba(255,255,255,0.12)' : 'none',
          transition: 'background 180ms, box-shadow 180ms',
        }}
      >
        {label}
      </button>
    </Link>
  )
}

/* ─── Product proof card — shows the actual dashboard at a glance ─────── */
function ProductCard() {
  const rows = [
    { date: '17 May', merchant: 'AWS India',      amount: '₹11,800', gst: '₹1,800', status: 'eligible'  },
    { date: '16 May', merchant: 'Zepto',           amount: '₹842',    gst: '₹42',    status: 'ineligible'},
    { date: '15 May', merchant: 'Swiggy Business', amount: '₹1,240',  gst: '₹186',   status: 'pending'   },
    { date: '13 May', merchant: 'Adobe Creative',  amount: '₹4,992',  gst: '₹762',   status: 'eligible'  },
  ]
  const STATUS_COLOR: Record<string, string> = {
    eligible: 'var(--green)', ineligible: 'var(--amber)', pending: 'var(--accent)',
  }
  const STATUS_BG: Record<string, string> = {
    eligible: 'rgba(21,128,61,0.10)', ineligible: 'rgba(180,83,9,0.08)', pending: 'var(--accent-dim)',
  }
  const STATUS_LABEL: Record<string, string> = {
    eligible: 'ITC Eligible', ineligible: 'Not Eligible', pending: 'Pending',
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--hair-2)',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 4px 32px rgba(13,31,23,0.08), 0 1px 4px rgba(13,31,23,0.06)',
      maxWidth: 620,
      width: '100%',
    }}>
      {/* Card chrome */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--hair)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t40)',
        }}>
          FinSight · Receipts · May 2026
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {['var(--surface-3)', 'var(--surface-3)', 'var(--accent)'].map((c, i) => (
            <span key={i} style={{
              width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block',
            }} />
          ))}
        </div>
      </div>

      {/* ITC summary strip */}
      <div style={{
        padding: '16px 20px 14px',
        borderBottom: '1px solid var(--hair)',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
      }}>
        {[
          { label: 'GST Paid',      value: '₹18,340' },
          { label: 'ITC Claimable', value: '₹12,840', highlight: true },
          { label: 'Pending',       value: '₹186'    },
        ].map((s, i) => (
          <div key={s.label} style={{
            paddingLeft: i > 0 ? 20 : 0,
            borderLeft: i > 0 ? '1px solid var(--hair)' : 'none',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '0.10em', textTransform: 'uppercase',
              color: 'var(--t40)', marginBottom: 4,
            }}>
              {s.label}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 18,
              fontVariantNumeric: 'tabular-nums', fontWeight: 400,
              color: 'var(--t100)', letterSpacing: '-0.01em',
            }}>
              {s.value}
            </div>
            {s.highlight && <AuditedUnderline width={80} strokeWidth={1.8} delay={1.2} duration={0.55} />}
          </div>
        ))}
      </div>

      {/* Table header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '70px 1fr 90px 70px 110px',
        gap: '0 12px', padding: '8px 20px',
        borderBottom: '1px solid var(--hair)',
      }}>
        {['Date', 'Merchant', 'Amount', 'GST', 'ITC Status'].map(col => (
          <span key={col} style={{
            fontFamily: 'var(--font-mono)', fontSize: 9,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t40)',
          }}>
            {col}
          </span>
        ))}
      </div>

      {/* Rows */}
      {rows.map((r, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '70px 1fr 90px 70px 110px',
          gap: '0 12px', padding: '10px 20px',
          background: i % 2 === 1 ? 'var(--surface-2)' : 'transparent',
          borderBottom: i < rows.length - 1 ? '1px solid var(--hair)' : 'none',
          alignItems: 'center',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t40)' }}>{r.date}</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--t100)' }}>{r.merchant}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontVariantNumeric: 'tabular-nums', color: 'var(--t100)' }}>{r.amount}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontVariantNumeric: 'tabular-nums', color: 'var(--t70)' }}>{r.gst}</span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
            letterSpacing: '0.04em', padding: '2px 7px', borderRadius: 3,
            color: STATUS_COLOR[r.status], background: STATUS_BG[r.status],
            display: 'inline-block',
          }}>
            {STATUS_LABEL[r.status]}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ─── Value prop row ──────────────────────────────────────────────────── */
function ValueProp({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
        color: 'var(--t40)', letterSpacing: '0.10em',
        paddingTop: 3, flexShrink: 0,
      }}>
        {num}
      </span>
      <div>
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 500,
          color: 'var(--t100)', marginBottom: 6, letterSpacing: '-0.01em',
        }}>
          {title}
        </div>
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 14,
          color: 'var(--t60)', lineHeight: 1.65,
        }}>
          {body}
        </div>
      </div>
    </div>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <LandingNav />

      {/* ── HERO ───────────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 1280, margin: '0 auto', padding: '120px 32px 80px',
        display: 'grid', gridTemplateColumns: '5fr 7fr',
        gap: 64, alignItems: 'center',
      }}>
        {/* Left — headline + value props + CTA */}
        <div>
          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
            <span style={{
              width: 4, height: 4, borderRadius: '50%',
              background: 'var(--t40)', display: 'inline-block',
            }} />
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
              letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--t40)',
            }}>
              GST Intelligence · Indian Freelancers
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 400,
            color: 'var(--t100)', margin: '0 0 8px', letterSpacing: '-0.025em',
            lineHeight: 1.08,
          }}>
            Your receipts,<br />
            <span style={{ color: 'var(--accent)' }}>CA-ready.</span>
          </h1>

          {/* Sub */}
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 16,
            color: 'var(--t60)', margin: '18px 0 36px',
            lineHeight: 1.65, maxWidth: 380,
          }}>
            FinSight reads your GST receipts, decides what&apos;s ITC-eligible, and hands your CA
            a clean export — without you touching a spreadsheet.
          </p>

          {/* CTA row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 48 }}>
            {/* forest green mark #1 */}
            <CTAButton href="/auth/signup" label="Start free" />
            <Link href="/auth/login" style={{
              fontFamily: 'var(--font-body)', fontSize: 13,
              color: 'var(--t60)', textDecoration: 'none',
              letterSpacing: '0.01em',
              transition: 'color 160ms',
            }}>
              Sign in →
            </Link>
          </div>

          {/* 3 value props */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <ValueProp
              num="01"
              title="Upload once, know instantly"
              body="Snap or upload any paper receipt. FinSight extracts the vendor, amount, HSN code, and GST rate in seconds."
            />
            <ValueProp
              num="02"
              title="ITC eligibility, decided"
              body="Every receipt is mapped against CGST rules — telecom, cloud, software qualify. Groceries and fuel don't. No guessing."
            />
            <ValueProp
              num="03"
              title="CA export in one click"
              body="GSTR-2A-format PDF with GST head breakdown, TDS register, and quarter summary. Your CA signs off, you get back to work."
            />
          </div>
        </div>

        {/* Right — product proof card */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <ProductCard />
        </div>
      </section>

      {/* ── PULL QUOTE ─────────────────────────────────────────────── */}
      <section style={{
        borderTop: '1px solid var(--hair)',
        borderBottom: '1px solid var(--hair)',
        padding: '56px 32px',
        margin: '0 auto',
        maxWidth: '100%',
        background: 'var(--surface)',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <blockquote style={{
            fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400,
            color: 'var(--t100)', margin: 0, letterSpacing: '-0.015em',
            lineHeight: 1.45,
          }}>
            &ldquo;I used to spend three hours every quarter hunting receipts for my CA.
            Now I forward them to FinSight and it&apos;s done before lunch.&rdquo;
          </blockquote>
          <div style={{
            marginTop: 20, display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t40)',
            }}>
              Arjun Mehta · Freelance Developer · Bengaluru
            </span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────── */}
      <footer style={{
        maxWidth: 1280, margin: '0 auto', padding: '40px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500,
          letterSpacing: '-0.02em',
        }}>
          <span style={{ color: 'var(--t100)' }}>Fin</span>
          <span style={{ color: 'var(--accent)' }}>Sight</span>
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--t40)', letterSpacing: '0.08em',
        }}>
          © 2026 · BUILT FOR INDIAN FREELANCERS
        </span>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Privacy', 'Terms', 'Contact'].map(l => (
            <span key={l} style={{
              fontFamily: 'var(--font-body)', fontSize: 13,
              color: 'var(--t40)', cursor: 'pointer',
              transition: 'color 160ms',
            }}>
              {l}
            </span>
          ))}
        </div>
      </footer>
    </div>
  )
}