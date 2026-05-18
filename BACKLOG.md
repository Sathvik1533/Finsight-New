# FinSight Post-Ship Backlog

Every idea we've discussed for FinSight that does NOT belong in v1.0.
v1.0 = foundation + deploy. Everything below is a separate ship after the live URL exists.

**How to use this file:**
- When a new idea hits mid-build, drop it in the "Unsorted Brain-Dump" section at the bottom
- Do NOT build anything from this file until v1.0 is deployed
- Each idea becomes a separate version ship → separate commit → separate demo video → separate resume bullet

---

## v1.0 — Foundation (CURRENT SPRINT, ship this week)

Everything below is OUT OF SCOPE for v1.0:

- ✅ Top nav with Geist + Forest Ink palette + two-tone wordmark
- ✅ Dashboard with hero figure + Live Ledger Feed + spending trend
- ✅ Receipts page with filter pills + 8 demo rows
- ✅ Reports page with two charts + GST breakdown table
- ✅ Contractors page with 3 cards + risk badges
- ✅ Budgets page with monthly limit progress bars
- ✅ AI Assistant page with text-only Groq streaming + voice-mode v2 hook (disabled pill)
- ✅ Landing page with editorial receipt card hero
- ✅ Auth pages (login + signup)
- ✅ Basic skeleton loaders (grey shimmer rectangles — "not broken-looking")
- ✅ Basic empty states (icon + sentence + CTA)
- ✅ Basic upload flow (file → spinner → result, no animation)
- ✅ Deploy: Vercel (frontend) + Railway (FastAPI backend)
- ✅ Demo video v1 recorded
- ✅ RESUME.md updated with live URL
- ✅ Git history cleaned + v1.0 tag

---

## v1.1 — Voice Mode

**What:** Bidirectional voice on the AI Assistant. Mic button replaces the "Voice mode — coming soon" disabled pill.
**Why post-v1.0:** Deepgram STT + TTS = ~6 hours of work + microphone permission UX + audio playback edge cases. Would block v1.0 ship.
**Stack:** Deepgram STT (speech-to-text streaming) + Deepgram TTS (natural Indian English voice) + WebSocket audio pipe.
**Target:** <300ms latency for natural conversation feel.
**Resume bullet:** "Extended FinSight with bidirectional voice — Deepgram STT + TTS streaming, sub-300ms round-trip for conversational tax queries."
**Demo angle:** User says "How much ITC can I claim?" → AI speaks back the breakdown. 30-second video.

---

## v1.2 — Live Intelligence WebSocket

**What:** Real-time ticker on dashboard pushes insights as receipts process in the background.
**Why post-v1.0:** Requires FastAPI WebSocket server + Next.js client + reconnection logic + offline handling.
**Stack:** FastAPI WebSockets → Next.js useEffect subscription → Live Ledger Feed updates without page reload.
**Resume bullet:** "Implemented WebSocket-based live intelligence — backend pushes processed receipt insights as they happen, reducing perceived latency 4x vs polling."
**Demo angle:** Upload a receipt in one tab → see it appear in the Live Ledger Feed in another tab within milliseconds.

---

## v1.3 — God-Level Upload Experience (4-Beat ReceiptReveal)

**What:** The signature interaction that makes FinSight memorable. 4 sequential animation beats when a receipt is uploaded.
**Why post-v1.0:** Animation timing is taste-sensitive. Would burn 2-3 review cycles in v1.0.
**Beats:**
1. **Beat 1 (0–0.8s):** Vermillion scanline sweeps the uploaded image top-to-bottom (1px line, 8% opacity trail). Eyebrow "● EXTRACTING".
2. **Beat 2 (0.8–1.8s):** 5 field rows materialize with 0.15s stagger + typewriter effect:
   `MERCHANT → "Airtel Business"`
   `AMOUNT → "₹2,124.00"` (Geist Mono)
   `DATE → "18 May 2026"`
   `GST NO → "29AABCA1234B1Z5"`
   `HSN → "998414"`
3. **Beat 3 (1.8–2.6s):** Classification appears: `GST HEAD → "Telecom Services"` + `RATE → "18%"` + caption "matched against 18,000 historical entries".
4. **Beat 4 (2.6–3.4s):** Number ₹2,124 scales 1 → 1.08 → 1, AuditedUnderline draws beneath it, "ITC eligible — ₹382 claimable" appears in forest green, confidence pill "98.4% confident" surfaces.
**Resume bullet:** "Designed signature 4-beat receipt-reveal animation — scan, extract, classify, verify — making AI's verification work visible to the user in 3.4 seconds."
**Demo angle:** This IS the 30-second hero demo for the entire product.

---

## v1.4 — God-Level UI Polish Pass

**What:** Replace v1.0's "not broken" UX with polished, animated, personality-rich UX everywhere.
**Why post-v1.0:** Each polish element needs review iteration. Bundle them into one pass.
**Includes:**
- **Skeleton loaders:** Content-aware sizing (the skeleton matches the shape of what loads), shimmer sweep animation, staggered reveal as data arrives.
- **Empty states with personality:** Illustrated character + witty Indian-fintech-specific copy:
  - No receipts → "Your CA is waiting. Upload your first receipt."
  - No contractors → "Add your first contractor to start tracking TDS."
  - No budgets → "Set your first monthly limit — you'll thank yourself later."
- **Page transitions:** Slide + fade between routes (Framer Motion AnimatePresence with route key).
- **Staggered reveal choreography:** When dashboard loads, hero number animates first, then stat tiles, then ledger feed, then chart — all with measured timing.
- **Hover micro-interactions:** Every card lifts 1px on hover, every link has an underline animation, every button has a press depth.
- **Number count-up animations** on all hero figures (AnimatedNumber component).
- **AuditedUnderline draw timing tuned** to feel like a human pen, not a CSS transition.
**Resume bullet:** "Polished FinSight v1.4 across all 9 pages with content-aware skeletons, staggered reveal choreography, and personality-driven empty states — increasing user dwell time by [measure post-deploy]."
**Demo angle:** Side-by-side v1.0 vs v1.4 video showing how the same product feels alive after polish.

---

## v1.5 — Progressive Intelligence (Background OCR + Self-Learning)

**What:** Receipt processing moves off the main thread; the categorization model improves from user corrections.
**Why post-v1.0:** Web Workers + ML model training pipeline = significant complexity, not core to v1.0.
**Includes:**
- **Background OCR via Web Workers:** Upload doesn't block the UI; user can keep working while AI processes.
- **Auto-categorization learning loop:** When user corrects a GST head (e.g. changes "Software" to "SaaS Tools"), the correction is stored, the model fine-tunes weekly, future receipts from the same merchant default to the corrected category.
- **Predictive ITC scoring:** Before user marks eligibility, AI predicts with confidence score. User only confirms or overrides.
**Resume bullet:** "Implemented progressive intelligence layer — background OCR via Web Workers (non-blocking UI), self-improving categorization model that learns from user corrections, predictive ITC scoring with confidence intervals."
**Demo angle:** Upload 3 receipts in a row → notice the UI never freezes. Watch the third receipt auto-categorize correctly because the AI learned from the first two.

---

## v1.6 — Multi-User / CA Collaboration

**What:** Invite your CA via email; they get a filtered read-only view of your ledger; they can approve or flag entries.
**Why post-v1.0:** Multi-tenancy adds auth complexity + RLS policy redesign + invite email infrastructure.
**Includes:**
- **Magic-link invites:** Founder sends an email; CA clicks → instant access to a filtered view.
- **Role-based access:** CA sees only the ledger, not the auth/settings.
- **Approval workflow:** CA can mark entries as "approved", "flagged for clarification", or "needs receipt".
- **Notification thread:** Comments per entry; founder gets a feed of CA notes.
**Resume bullet:** "Built multi-tenant collaboration layer for FinSight — magic-link invites, role-based access via Supabase RLS, real-time approval workflow between founder and CA."
**Demo angle:** Two browser windows — founder uploads receipt, CA sees it appear in their queue, approves it, founder sees the green checkmark land.

---

## v2.0 — SaaS Pricing Tier

**What:** Turn FinSight from portfolio project into a real product with paid tiers.
**Why post-v1.6:** Needs auth + payments + multi-tenancy mature first.
**Includes:**
- **Free tier:** 10 receipts/month, text AI only, no CA invite.
- **Pro tier (₹499/mo):** Unlimited receipts, voice AI, CA invite, priority support.
- **Razorpay integration:** Subscription management, GST-compliant invoicing.
- **Landing page CTA shifts:** From "Start free" to "Start 14-day trial".
**Resume bullet:** "Shipped FinSight v2.0 with Razorpay-powered SaaS pricing — free + pro tiers, GST-compliant subscription invoicing, [N] paying users in first month."
**Demo angle:** This is the "real product" moment. Recorded onboarding flow from signup → first receipt → paywall → Razorpay checkout → unlocked features.

---

## Unsorted Brain-Dump (drop new ideas here as they hit, format them later)

_(Add new ideas below this line. One bullet per idea. Don't filter — just capture.)_

- 

---

## How to add new ideas mid-build

When a new idea hits in the middle of a v1.0 build session:

1. Open this file (BACKLOG.md)
2. Scroll to "Unsorted Brain-Dump" above
3. Add one bullet describing the idea
4. Close the file
5. Get back to whatever you were doing

**DO NOT:**
- Discuss the idea with right side Claude mid-build
- Add it to v1.0 scope
- Try to fit it into the current sprint
- Lose it by not writing it down

The whole point: capture the idea so it survives, then keep shipping v1.0.
