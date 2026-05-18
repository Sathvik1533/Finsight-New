'use client'

export default function DashboardPagePlaceholder() {
  return (
    <div style={{
      maxWidth: 1280,
      margin: '0 auto',
      padding: '80px 32px',
      fontFamily: 'var(--font-body)',
    }}>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--t40)',
      }}>
        Phase 2 stub
      </p>
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 32,
        fontWeight: 600,
        letterSpacing: '-0.025em',
        color: 'var(--t100)',
        marginTop: 8,
      }}>
        Dashboard placeholder
      </h1>
      <p style={{
        fontSize: 14,
        color: 'var(--t70)',
        lineHeight: 1.6,
        marginTop: 12,
        maxWidth: 520,
      }}>
        Phase 3 will replace this with the full editorial dashboard
        (hero figure + Live Ledger Feed + Spending Trend + Top GST Heads).
        This page exists only so the nav renders in context for Phase 2 review.
      </p>
    </div>
  )
}
