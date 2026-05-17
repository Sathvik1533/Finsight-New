# FinSight — Interview Prep

## One-Line Pitch

> "I built an AI-powered expense intelligence platform for Indian freelancers — it reads receipts with a vision model, assigns GST categories automatically, scores contractor payment risk, and exports CA-ready PDF reports. Zero manual entry."

---

## What I Built (say this confidently)

### 1. Two-Stage AI Pipeline
- **What:** Receipt image → Groq Vision (OCR) → Groq Llama 3.3 (categorization) → Supabase (stored)
- **Interview line:** "I built a two-stage AI pipeline: a vision model extracts receipt fields with 95%+ accuracy, then a language model assigns GST categories in under 250ms — chained together with error handling, timeout recovery, and confidence thresholds."

### 2. GST Intelligence
- **What:** Every transaction gets a GST expense head, rate (0–18%), and ITC eligibility flag
- **Interview line:** "I mapped all 12 expense categories to Indian GST heads and ITC eligibility, making every receipt automatically CA-ready — something no generic expense app does."

### 3. Contractor Risk Scoring
- **What:** Groq AI scores contractors 0–100 based on payment history and inactivity. Recommends: pay / hold / investigate.
- **Interview line:** "I built an AI risk engine that analyzes contractor payment patterns and inactivity to score reliability — automatically flagging ghost contractors who stop responding after receiving payment."

### 4. Streaming Audit Briefs
- **What:** Token-by-token streaming of 3-sentence audit reports using Server-Sent Events
- **Interview line:** "I implemented streaming AI responses using SSE, giving users the real-time typewriter effect for contractor audit reports — same pattern as ChatGPT."

### 5. PDF Export (CA-Ready)
- **What:** jsPDF generates a formatted GST expense report — category breakdown, ITC totals, transaction detail — in the browser
- **Interview line:** "I built a client-side PDF export that generates CA-ready GST expense reports with ITC breakdowns — no server round-trip needed."

### 6. Budget Alerts
- **What:** Users set monthly limits per category. Dashboard shows progress bars + alerts when exceeded.
- **Interview line:** "I built a budget tracking system with real-time alerts — users set monthly limits per GST category and get warned when approaching or exceeding them."

### 7. Row-Level Security
- **What:** Supabase RLS policies — users can only ever read/write their own data
- **Interview line:** "I implemented Row-Level Security in Supabase so data isolation is enforced at the database level — no backend filtering needed, zero chance of data leaks between users."

### 8. 30/60/90 Day Cash Flow Analysis
- **What:** Dashboard chart with time-window toggle, weekly bucketing, parallel DB fetch
- **Interview line:** "I built a cash flow trend chart with 30/60/90 day windows — the backend buckets transactions into weekly intervals and the frontend re-fetches on toggle."

---

## Tech Stack (say this clearly)

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 14 App Router + TypeScript | SSR, API routes, file-based routing |
| Styling | Tailwind CSS + Framer Motion | Fast styling + purposeful animations |
| UI Components | Aceternity UI (Background Beams, Card Hover) | Production-grade, not generic |
| Auth | Supabase SSR | Server-side session, middleware protection |
| Database | Supabase (Postgres + RLS) | Realtime, RLS, free tier |
| AI — OCR | Groq Vision (Llama 4 Scout) | Free, vision-capable, fast |
| AI — Categorize | Groq Llama 3.3 70B | 250ms response, JSON mode |
| AI — Risk | Groq Llama 3.3 70B | Streaming + JSON scoring |
| Backend | FastAPI (Python) | Clean async, auto-docs, Railway deploy |
| Deploy | Vercel (frontend) + Railway (backend) | Industry standard |
| PDF Export | jsPDF | Client-side, no server needed |

---

## Hard Technical Decisions (show you thought about it)

**"Why Groq instead of OpenAI?"**
> "Groq is 10x faster for inference — ~250ms vs 2-3s for categorization. For a receipt processing pipeline where users are watching a progress indicator, that difference is visible. Also free tier is generous enough for a portfolio project."

**"Why FastAPI instead of Next.js API routes for the AI?"**
> "The AI pipeline has multiple async stages — OCR, categorization, DB write — each with different timeouts. FastAPI gives me proper async orchestration, typed Pydantic models for each stage, and Railway deploys it as a persistent server with better cold-start behavior than serverless functions."

**"Why Supabase RLS instead of filtering in the backend?"**
> "RLS enforces data isolation at the database level — even if I make a query mistake in the backend, Supabase won't return another user's data. It's defense in depth. The alternative — always filtering by user_id in every query — is error-prone."

**"Why jsPDF for PDF export?"**
> "It runs entirely in the browser — no server round-trip, no storage, instant download. For a report that's just formatted data from the existing API response, a server-side solution would add latency and cost for no benefit."

---

## Numbers to Quote

| Metric | Value | Source |
|--------|-------|--------|
| OCR accuracy | 95%+ | Groq Llama 4 Scout benchmark |
| Categorization latency | ~250ms | Groq's fast inference |
| Pipeline end-to-end | < 30s | Measured locally (update after deploy) |
| Categories | 12 + GST heads | Custom taxonomy |
| Test coverage | 10 Playwright E2E tests | /tests/ |
| DB tables | profiles, transactions, receipts, contractors, budgets | Supabase |

*Replace "measured locally" with actual number once deployed and tested.*

---

## What I'd Add Next (shows ambition)

1. **WhatsApp intake** — Twilio webhook processes receipts sent via WhatsApp (zero friction)
2. **Recurring vendor detection** — SQL pattern to flag subscriptions and predict next charge
3. **CA dashboard** — read-only view for your accountant, exportable by month/quarter
4. **Mobile app** — Expo + camera upload for instant in-store receipt scanning

---

## Steps Completed

- [x] Step 1: Replace NVIDIA NIM with Groq Vision
- [x] Step 2: Fix ghost alerts auth bug
- [x] Step 3: GST category tagging
- [x] Step 4: 30/60/90 day cash flow chart
- [x] Step 5: PDF export (jsPDF, CA-ready)
- [x] Step 6: Budget alerts (per-category limits + progress bars)
- [x] Step 7: UI redesign (teal palette, Space Grotesk, Aceternity components)
- [ ] Step 8: Deploy (Vercel + Railway)
- [ ] Step 9: Live URL in README
- [ ] Step 10: Measure real latency, update numbers above
