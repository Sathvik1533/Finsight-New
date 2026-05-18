'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useRef, useState } from 'react'
import { AuditedUnderline } from '@/components/ui/AuditedUnderline'

/* ─────────────────────────────────────────────────────────────────────
   Seeded demo conversation — rendered immediately on page load so
   the assistant feels populated, not empty. Once the user sends a real
   message, the live Groq stream takes over and appends to this thread.
   ──────────────────────────────────────────────────────────────────── */

type SeedMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  time: string
  underline?: boolean   // mark exactly ONE message for AuditedUnderline
}

const SEED_MESSAGES: SeedMessage[] = [
  {
    id: 'seed-1',
    role: 'user',
    text: 'How much GST did I pay this quarter?',
    time: '15:42',
  },
  {
    id: 'seed-2',
    role: 'assistant',
    text: 'Based on your 47 receipts from April–June 2026, you paid ₹18,340 in GST. Of that, ₹12,840 is eligible for ITC (Input Tax Credit) claim. The remaining ₹5,500 is from B2C transactions where ITC cannot be claimed.',
    time: '15:42',
    underline: true,
  },
  {
    id: 'seed-3',
    role: 'user',
    text: 'Which vendor has the highest ITC value?',
    time: '15:43',
  },
  {
    id: 'seed-4',
    role: 'assistant',
    text: 'Airtel Business leads with ₹3,240 in claimable ITC across 8 invoices. All are 18% GST rate telecom services under HSN 998414. Next is AWS India at ₹2,180.',
    time: '15:43',
  },
]

/* Referenced receipts shown in the right context panel */
const REFERENCED = [
  { merchant: 'Airtel Business', amount: 2124, date: '18 May' },
  { merchant: 'AWS India',       amount: 1840, date: '14 May' },
  { merchant: 'Zepto',           amount:  380, date: '12 May' },
]

const GST_PILLS = [
  { name: 'Telecom Services', rate: '18%' },
  { name: 'Cloud Computing',  rate: '18%' },
]

const SUGGESTED = [
  'How much ITC can I claim this quarter?',
  'Show contractors with TDS pending',
  'What did I spend most on last month?',
  'Generate a CA-ready summary',
]

/* ─── Utilities ──────────────────────────────────────────────────────── */

function inr(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function nowTime() {
  const d = new Date()
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

/* ─── Eyebrow with the ● dot (always muted, per the dot-as-punctuation rule) */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      color: 'var(--t40)',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: 'var(--t40)',
        flexShrink: 0, marginTop: 1,
      }} />
      <span>{children}</span>
    </p>
  )
}

/* ─── Send arrow glyph (monoline SVG, not an emoji) ──────────────────── */
function SendGlyph() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M 2 8 L 13 8 M 9 4 L 13 8 L 9 12"
        stroke="#ffffff"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ─── Voice-mode glyph (microphone monoline) ─────────────────────────── */
function MicGlyph() {
  return (
    <svg width={12} height={12} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M 8 2 C 6.9 2 6 2.9 6 4 L 6 8 C 6 9.1 6.9 10 8 10 C 9.1 10 10 9.1 10 8 L 10 4 C 10 2.9 9.1 2 8 2 Z M 4 8 C 4 10.2 5.8 12 8 12 C 10.2 12 12 10.2 12 8 M 8 12 L 8 14 M 6 14 L 10 14"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ─── FinSight mark — small two-tone serif/sans glyph used as AI avatar */
function FinSightMark() {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      fontFamily: 'var(--font-display)',
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: '-0.03em',
      lineHeight: 1,
    }}>
      <span style={{ color: 'var(--t100)' }}>F</span>
      <span style={{ color: 'var(--accent)' }}>S</span>
    </span>
  )
}

/* ─── Blinking cursor used during streaming ──────────────────────────── */
function StreamingCursor() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 2,
        height: '1em',
        background: 'var(--accent)',
        marginLeft: 2,
        verticalAlign: 'text-bottom',
        animation: 'fs-blink 1s steps(2, start) infinite',
      }}
    />
  )
}

/* ─────────────────────────────────────────────────────────────────────
   The page
   ──────────────────────────────────────────────────────────────────── */

export default function AssistantPage() {
  const [input, setInput] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/assistant' }),
  })

  // Auto-scroll to bottom when a new message arrives or content streams in
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, status])

  const isStreaming = status === 'streaming' || status === 'submitted'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return
    sendMessage({ text: trimmed })
    setInput('')
  }

  function handleSuggested(q: string) {
    if (isStreaming) return
    sendMessage({ text: q })
  }

  return (
    <div style={{
      maxWidth: 1280,
      margin: '0 auto',
      padding: '40px 32px 32px',
      fontFamily: 'var(--font-body)',
      color: 'var(--t100)',
      minHeight: 'calc(100vh - 60px)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Page eyebrow + title */}
      <div style={{ marginBottom: 28 }}>
        <Eyebrow>AI Assistant · Groq Llama-3.3-70B</Eyebrow>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 32,
          fontWeight: 400,
          letterSpacing: '-0.025em',
          lineHeight: 1.1,
          color: 'var(--t100)',
          marginTop: 12,
        }}>
          Ask your ledger.
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          fontWeight: 400,
          color: 'var(--t70)',
          marginTop: 8,
          maxWidth: 540,
          lineHeight: 1.5,
        }}>
          Trained on your receipts. Knows your GST history.
        </p>
      </div>

      {/* Main split — 60/40 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 6fr) minmax(0, 4fr)',
        gap: 32,
        flex: 1,
        minHeight: 0,
      }}>

        {/* ════════ LEFT — chat thread ═══════════════════════════════════ */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            paddingRight: 12,
            paddingBottom: 8,
          }}>

            {/* Seeded conversation */}
            {SEED_MESSAGES.map((m) => (
              <MessageBubble
                key={m.id}
                role={m.role}
                text={m.text}
                time={m.time}
                underline={m.underline}
              />
            ))}

            {/* Live messages from Groq stream */}
            {messages.map((m) => {
              const text = m.parts
                .filter((p) => p.type === 'text')
                .map((p) => ('text' in p ? p.text : ''))
                .join('')
              if (!text) return null
              return (
                <MessageBubble
                  key={m.id}
                  role={m.role === 'user' ? 'user' : 'assistant'}
                  text={text}
                  time={nowTime()}
                  streaming={m.role === 'assistant' && status === 'streaming' && m.id === messages[messages.length - 1]?.id}
                />
              )
            })}

            {/* Submitted-but-not-yet-streaming state */}
            {status === 'submitted' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 0',
              }}>
                <FinSightMark />
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--t40)',
                  letterSpacing: '0.05em',
                }}>
                  Reading your ledger
                </span>
                <StreamingCursor />
              </div>
            )}

            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 14px',
                background: 'var(--error-bg)',
                border: '1px solid rgba(163,56,46,0.20)',
                borderRadius: 10,
                color: 'var(--error)',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                marginTop: 8,
              }}>
                <span aria-hidden="true">⚠</span>
                <span>Assistant unavailable. Check your GROQ_API_KEY in .env.local.</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input bar — pinned bottom */}
          <form
            onSubmit={handleSubmit}
            style={{
              borderTop: '1px solid var(--hair)',
              paddingTop: 16,
              marginTop: 12,
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'var(--surface)',
              border: `1px solid ${inputFocused ? 'var(--accent)' : 'var(--hair-2)'}`,
              borderRadius: 12,
              padding: '6px 6px 6px 14px',
              transition: 'border-color 180ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Ask about your GST, ITC claims, or receipt history…"
                disabled={isStreaming}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  color: 'var(--t100)',
                  padding: '10px 0',
                  letterSpacing: '0.005em',
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                aria-label="Send"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  background: input.trim() && !isStreaming ? 'var(--accent)' : 'var(--surface-2)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: input.trim() && !isStreaming ? 'pointer' : 'not-allowed',
                  transition: 'background 180ms cubic-bezier(0.22, 1, 0.36, 1)',
                  flexShrink: 0,
                }}
              >
                <SendGlyph />
              </button>
            </div>

            {/* Voice-mode pill (disabled — v1.1 hook) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <VoiceModePill />
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--t40)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}>
                Press ↵ to send
              </span>
            </div>
          </form>

          {/* Suggested questions row */}
          {messages.length === 0 && (
            <div style={{ marginTop: 18 }}>
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--t40)',
                marginBottom: 10,
              }}>
                Suggested
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SUGGESTED.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSuggested(q)}
                    disabled={isStreaming}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--hair-2)',
                      borderRadius: 999,
                      padding: '7px 14px',
                      fontFamily: 'var(--font-body)',
                      fontSize: 12,
                      color: 'var(--t70)',
                      cursor: 'pointer',
                      transition: 'border-color 180ms, color 180ms',
                    }}
                    onMouseEnter={e => {
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--t40)'
                      ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--t100)'
                    }}
                    onMouseLeave={e => {
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--hair-2)'
                      ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--t70)'
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ════════ RIGHT — context panel ════════════════════════════════ */}
        <aside style={{
          paddingLeft: 28,
          borderLeft: '1px solid var(--hair)',
        }}>

          <div style={{ marginBottom: 28 }}>
            <Eyebrow>Context</Eyebrow>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'var(--t60)',
              marginTop: 10,
              lineHeight: 1.5,
            }}>
              FinSight cites every claim. Numbers below come from receipts the assistant referenced in this conversation.
            </p>
          </div>

          {/* Referenced receipts */}
          <div style={{
            paddingTop: 18,
            paddingBottom: 18,
            borderTop: '1px solid var(--hair)',
          }}>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--t40)',
              marginBottom: 14,
            }}>
              Referenced receipts
            </p>
            {REFERENCED.map((r, i) => (
              <div key={r.merchant} style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--hair)',
              }}>
                <span style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  fontWeight: 400,
                  color: 'var(--t100)',
                }}>
                  {r.merchant}
                </span>
                <span style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 10,
                }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--t40)',
                    letterSpacing: '0.04em',
                  }}>
                    {r.date}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    fontWeight: 400,
                    color: 'var(--t100)',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.01em',
                  }}>
                    {inr(r.amount)}
                  </span>
                </span>
              </div>
            ))}
          </div>

          {/* GST heads discussed */}
          <div style={{
            paddingTop: 18,
            borderTop: '1px solid var(--hair)',
          }}>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--t40)',
              marginBottom: 14,
            }}>
              GST heads discussed
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {GST_PILLS.map((p) => (
                <span key={p.name} style={{
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: 6,
                  background: 'var(--surface)',
                  border: '1px solid var(--hair-2)',
                  borderRadius: 999,
                  padding: '5px 11px',
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  color: 'var(--t70)',
                }}>
                  <span>{p.name}</span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--t40)',
                    fontSize: 11,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {p.rate}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Provider footer — establishes the LLM credibility */}
          <div style={{
            marginTop: 32,
            paddingTop: 16,
            borderTop: '1px solid var(--hair)',
          }}>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--t40)',
              letterSpacing: '0.08em',
              lineHeight: 1.6,
            }}>
              MODEL: Llama-3.3-70B Versatile via Groq<br />
              TEMPERATURE: 0.3 · CONTEXT: 47 receipts
            </p>
          </div>

        </aside>
      </div>

      {/* Cursor blink keyframe (scoped via name; could also live in globals) */}
      <style>{`
        @keyframes fs-blink {
          to { opacity: 0; }
        }
      `}</style>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────
   Message bubble — handles both user (right-aligned, accent-dim) and
   assistant (left-aligned, surface) variants. Renders AuditedUnderline
   beneath the ₹18,340 in the seeded AI response.
   ──────────────────────────────────────────────────────────────────── */
function MessageBubble({ role, text, time, underline, streaming }: {
  role: 'user' | 'assistant'
  text: string
  time: string
  underline?: boolean
  streaming?: boolean
}) {
  const isUser = role === 'user'

  // For the underline message: split text around ₹18,340 so we can wrap that span
  let rendered: React.ReactNode = text
  if (underline) {
    const marker = '₹18,340'
    const idx = text.indexOf(marker)
    if (idx >= 0) {
      rendered = (
        <>
          {text.slice(0, idx)}
          <span style={{ display: 'inline-block', position: 'relative' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {marker}
            </span>
            <span style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '100%',
              marginTop: -2,
              pointerEvents: 'none',
            }}>
              <AuditedUnderline width={92} strokeWidth={2} delay={0.4} duration={0.7} />
            </span>
          </span>
          {text.slice(idx + marker.length)}
        </>
      )
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 18,
    }}>
      <div style={{
        maxWidth: '78%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
      }}>
        {/* AI message gets a tiny FS mark prefix */}
        {!isUser && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 6,
          }}>
            <FinSightMark />
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--t40)',
            }}>
              FinSight
            </span>
          </div>
        )}

        <div style={{
          background: isUser ? 'var(--accent-dim)' : 'var(--surface)',
          border: isUser ? 'none' : '1px solid var(--hair)',
          borderRadius: 12,
          padding: '12px 16px',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          fontWeight: 400,
          color: 'var(--t100)',
          lineHeight: 1.6,
          letterSpacing: '0.005em',
          whiteSpace: 'pre-wrap',
        }}>
          {rendered}
          {streaming && <StreamingCursor />}
        </div>

        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--t40)',
          letterSpacing: '0.05em',
          marginTop: 4,
        }}>
          {time}
        </span>
      </div>
    </div>
  )
}

/* ─── Voice mode pill — disabled, v1.1 hook ──────────────────────────── */
function VoiceModePill() {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'var(--surface-2)',
        border: '1px solid var(--hair)',
        borderRadius: 999,
        padding: '5px 11px',
        color: 'var(--t40)',
        fontFamily: 'var(--font-body)',
        fontSize: 11,
        fontWeight: 500,
        cursor: 'help',
        userSelect: 'none',
      }}>
        <MicGlyph />
        <span>Voice mode — coming soon</span>
      </div>

      {hover && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 10px)',
          left: 0,
          background: 'var(--t100)',
          color: 'var(--bg)',
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          fontWeight: 400,
          lineHeight: 1.5,
          padding: '8px 12px',
          borderRadius: 8,
          whiteSpace: 'normal',
          letterSpacing: '0.005em',
          pointerEvents: 'none',
          maxWidth: 280,
        } as React.CSSProperties}>
          Voice mode launches in v1.1. Want early access? Drop your email.
        </div>
      )}
    </div>
  )
}
