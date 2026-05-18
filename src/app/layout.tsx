import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'FinSight — AI Expense Intelligence for India',
  description:
    'Upload a receipt. FinSight reads it, assigns GST categories, scores contractor risk, and exports CA-ready reports. Zero manual entry.',
  keywords: ['GST', 'expense tracking', 'India', 'AI', 'freelancer', 'receipt scanner'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body style={{ background: 'var(--bg)', color: 'var(--t100)', minHeight: '100vh' }}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--surface)',
              border: '1px solid var(--hair-2)',
              color: 'var(--t100)',
              fontFamily: 'var(--font-geist-sans)',
              fontSize: 13,
              boxShadow: '0 4px 16px rgba(13,31,23,0.10)',
            },
          }}
        />
      </body>
    </html>
  )
}
