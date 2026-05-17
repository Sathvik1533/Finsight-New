'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Receipt, Users, BarChart3, PiggyBank, LogOut, Upload,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

const NAV = [
  { label: 'Overview',    href: '/dashboard',     icon: LayoutDashboard },
  { label: 'Receipts',    href: '/receipts',       icon: Receipt },
  { label: 'Contractors', href: '/contractors',    icon: Users },
  { label: 'Reports',     href: '/reports',        icon: BarChart3 },
  { label: 'Budgets',     href: '/budgets',        icon: PiggyBank },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '')
    })
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/auth/login')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--hair)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Logo */}
        <div style={{ padding: '22px 20px 24px' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 16, fontWeight: 600,
              letterSpacing: '-0.035em',
              color: 'var(--t100)',
            }}>
              Fin<span style={{ color: 'var(--gold)' }}>Sight</span>
            </span>
          </Link>
        </div>

        {/* Upload CTA */}
        <div style={{ padding: '0 12px 20px' }}>
          <Link href="/receipts" style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--gold)', color: '#09090f',
              borderRadius: 7, padding: '9px 14px',
              fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700,
              letterSpacing: '-0.01em', cursor: 'pointer',
            }}>
              <Upload size={13} strokeWidth={2.5} />
              Upload Receipt
            </div>
          </Link>
        </div>

        {/* Section label */}
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--t20)', padding: '0 20px 10px',
        }}>
          Menu
        </p>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '9px 12px',
                  borderRadius: 7,
                  borderLeft: active ? '2px solid var(--gold)' : '2px solid transparent',
                  background: active ? 'var(--gold-dim)' : 'transparent',
                  color: active ? 'var(--gold)' : 'var(--t40)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  letterSpacing: '-0.01em',
                  textDecoration: 'none',
                  transition: 'background 150ms, color 150ms, border-color 150ms',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    const el = e.currentTarget as HTMLAnchorElement
                    el.style.background = 'rgba(255,255,255,0.04)'
                    el.style.color = 'var(--t70)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    const el = e.currentTarget as HTMLAnchorElement
                    el.style.background = 'transparent'
                    el.style.color = 'var(--t40)'
                  }
                }}
              >
                <Icon size={14} strokeWidth={1.6} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom — email + sign out */}
        <div style={{
          padding: '14px 10px',
          borderTop: '1px solid var(--hair)',
        }}>
          {email && (
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--t30)', letterSpacing: '-0.01em',
              padding: '0 12px', marginBottom: 6,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {email}
            </p>
          )}
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              width: '100%', padding: '9px 12px', borderRadius: 7,
              background: 'transparent', border: 'none',
              color: 'var(--t30)', fontFamily: 'var(--font-body)',
              fontSize: 13, cursor: 'pointer', textAlign: 'left',
              transition: 'color 150ms, background 150ms',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.color = 'var(--red)'
              el.style.background = 'rgba(220,38,38,0.06)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.color = 'var(--t30)'
              el.style.background = 'transparent'
            }}
          >
            <LogOut size={14} strokeWidth={1.6} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{ minHeight: '100%' }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  )
}
