import type { Metadata } from 'next'
import { Sora, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

// Display / headings — Sora. Geometric, precise, unique in fintech.
const sora = Sora({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

// Body / UI text — Inter. Best legibility at 13–14px.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
  display: 'swap',
})

// Numbers / mono — JetBrains Mono. Premium for financial data.
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'FinSight — AI Expense Intelligence for India',
  description:
    'Upload a receipt. FinSight reads it, assigns GST categories, scores contractor risk, and exports CA-ready reports. Zero manual entry.',
  keywords: ['GST', 'expense tracking', 'India', 'AI', 'freelancer', 'receipt scanner'],
}

import { Toaster } from 'sonner'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable} ${mono.variable}`}>
      <body className="font-body bg-[#05090f] text-[#f2f4f7] min-h-screen antialiased">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--surface-2)',
              border: '1px solid var(--hair-2)',
              color: 'var(--t100)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
            },
          }}
        />
      </body>
    </html>
  )
}
