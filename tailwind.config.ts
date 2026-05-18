import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ── Fonts ─────────────────────────────────────────────────────────
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body:    ['Geist', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
      },

      // ── Color tokens ─────────────────────────────────────────────────
      colors: {
        fs: {
          bg:        '#f5f3ef',
          surface:   '#ffffff',
          surface2:  '#eeece8',
          surface3:  '#e8e5e0',
          accent:    '#1a6b4a',
          accentHov: '#165a3d',
          t100:      '#141210',
          t70:       'rgba(20,18,16,0.70)',
          t40:       'rgba(20,18,16,0.40)',
          t20:       'rgba(20,18,16,0.15)',
          green:     '#16a34a',
          red:       '#dc2626',
          amber:     '#b45309',
        },
      },

      // ── Letter spacing ────────────────────────────────────────────────
      letterSpacing: {
        display: '-0.04em',
        heading: '-0.03em',
        tight:   '-0.02em',
        normal:  '-0.01em',
        label:   '0.10em',
      },

      // ── Line height ───────────────────────────────────────────────────
      lineHeight: {
        display: '0.96',
        heading: '1.05',
        snug:    '1.2',
        body:    '1.6',
      },

      // ── Border radius ─────────────────────────────────────────────────
      borderRadius: {
        DEFAULT: '8px',
        sm:      '4px',
        md:      '10px',
        lg:      '12px',
        xl:      '16px',
        none:    '0px',
      },

      // ── Spacing — 4px base ────────────────────────────────────────────
      spacing: {
        'px':  '1px',
        '0':   '0px',
        '1':   '4px',
        '2':   '8px',
        '3':   '12px',
        '4':   '16px',
        '5':   '20px',
        '6':   '24px',
        '8':   '32px',
        '10':  '40px',
        '12':  '48px',
        '14':  '56px',
        '16':  '64px',
        '20':  '80px',
        '24':  '96px',
        '32':  '128px',
      },

      // ── Box shadow ────────────────────────────────────────────────────
      boxShadow: {
        card:   '0 1px 4px rgba(20,18,16,0.06), 0 0 0 1px rgba(20,18,16,0.06)',
        accent: '0 0 0 3px rgba(26,107,74,0.15)',
      },
    },
  },
  plugins: [],
}

export default config
