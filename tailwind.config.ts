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
        display: ['var(--font-display)', 'system-ui', 'sans-serif'], // Sora
        body:    ['var(--font-body)', 'system-ui', 'sans-serif'],    // Inter
        mono:    ['var(--font-mono)', 'monospace'],                   // JetBrains Mono
      },

      // ── Color tokens ─────────────────────────────────────────────────
      colors: {
        fs: {
          // Backgrounds
          bg:       '#05090f',
          surface:  '#0c1219',
          surfaceH: '#121a24',

          // Signal (the one true accent)
          signal:   '#00c896',

          // Text hierarchy
          t100: '#f2f4f7',
          t60:  '#8d99a8',
          t30:  '#4a5568',
          t10:  '#1e2a35',

          // Semantic
          amber: '#e8a020',
          red:   '#e03e3e',
          sky:   '#38bdf8',
        },
      },

      // ── Letter spacing ────────────────────────────────────────────────
      letterSpacing: {
        display: '-0.04em',
        heading: '-0.035em',
        tight:   '-0.02em',
        normal:  '-0.01em',
        label:   '0.12em',
      },

      // ── Line height ───────────────────────────────────────────────────
      lineHeight: {
        display: '0.92',
        heading: '1.0',
        snug:    '1.2',
        body:    '1.6',
      },

      // ── Border radius — 6px only ──────────────────────────────────────
      borderRadius: {
        DEFAULT: '6px',
        sm:      '4px',
        none:    '0px',
      },

      // ── Spacing — 8px base ────────────────────────────────────────────
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
        signal: '0 0 24px rgba(0, 200, 150, 0.15)',
        card:   '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(242,244,247,0.07)',
      },
    },
  },
  plugins: [],
}

export default config
