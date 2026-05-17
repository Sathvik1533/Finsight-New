# FinSight — Vision, Identity & Build Protocol
# Read this FIRST before touching any file. Every session.

---

## What FinSight Actually Is

AI-powered GST expense intelligence for Indian freelancers and SMBs.
Receipt photo → OCR → GST categorisation → ITC claim surfacing → CA-ready PDF export.

**The real problem it solves:**
90% of Indian freelancers track expenses in Excel or don't track at all.
They miss ITC claims worth thousands every quarter.
Their CA asks for organised records they don't have.
FinSight fixes all three — automatically, from a photo.

**NOT:** A generic expense tracker. NOT: A dark SaaS template. NOT: A Vercel/Linear clone.

---

## The Feeling FinSight Must Give (Non-Negotiable)

Every screen must deliver all four simultaneously:

1. **Confidence** — "This tool has my finances handled." Calm, precise, authoritative.
2. **Relief** — "Finally, someone built this for me." Speaks to Indian freelancer pain directly.
3. **Ambition** — "I want to be the kind of person who uses this." Premium, aspirational.
4. **Delight** — Something unexpected that makes you smile. An animation, a witty line, a clever micro-interaction.

If a screen doesn't hit at least 3 of 4 — it's not done.

---

## Color System (Researched from Binance, Revolut, Jupiter, Fi, Razorpay, Zerodha)

```css
:root {
  /* Canvas — warm-ink, tiny violet undertone like Jupiter #111214 */
  --bg:           #09090f;
  --surface:      #111118;
  --surface-2:    #18181f;
  --surface-3:    #1f1f2a;
  --sidebar-bg:   #0c0c13;

  /* Gold — the entire brand identity. Money. ITC. CA-ready. */
  --gold:         #f0b429;
  --gold-dim:     rgba(240,180,41,0.12);
  --gold-hair:    rgba(240,180,41,0.20);
  --gold-text:    #fcd34d;

  /* Green — ITC eligible, money coming back */
  --green:        #16a34a;
  --green-dim:    rgba(22,163,74,0.10);
  --green-text:   #4ade80;

  /* Red — errors, ITC ineligible */
  --red:          #dc2626;
  --red-dim:      rgba(220,38,38,0.08);

  /* Amber — GST pending, partial ITC, CA review needed */
  --amber:        #d97706;
  --amber-dim:    rgba(217,119,6,0.10);

  /* Text — warm white (Revolut philosophy, never sterile #fff on dark) */
  --t100:         #f0f2f5;
  --t70:          rgba(240,242,245,0.70);
  --t40:          rgba(240,242,245,0.40);
  --t20:          rgba(240,242,245,0.20);

  /* Borders — hairline dark */
  --hair:         rgba(255,255,255,0.07);
  --hair-2:       rgba(255,255,255,0.12);

  /* Typography */
  --font-display: 'Sora', system-ui, sans-serif;
  --font-body:    'Inter', system-ui, sans-serif;
  --font-mono:    'JetBrains Mono', monospace;
}
```

**Why this palette:**
- `#09090f` — Not cold black, not blue-black. Tiny violet undertone = premium Indian fintech (Jupiter uses this)
- `#f0b429` — Gold = money everywhere. Indian CAs use gold on premium documents.
- `#16a34a` — Deep professional green. Every ITC eligible receipt = "money coming back"
- `#d97706` — Amber for partial/pending. Unique to Indian tax context.
- `#f0f2f5` — Warm white text. Pure #fff on violet-tinted dark = slight clash. Warmth = premium ledger.

---

## Full Page Structure

### Public Pages
- `/` — Landing page
- `/auth/signup` — Signup  
- `/auth/login` — Login

### Authenticated Pages (all wrapped in sidebar layout)
- `/dashboard` — Overview: stats + cash flow + recent receipts
- `/receipts` — Full list with filters + upload
- `/receipts/[id]` — Single receipt: image + fields + GST breakdown
- `/contractors` — List + risk scores + add
- `/reports` — CA PDF export + GST summary + ITC totals
- `/budgets` — Monthly limits per category + progress bars + alerts

---

## Sidebar Layout (Persistent on All Authenticated Pages)

File: `src/app/(dashboard)/layout.tsx`

- Width: 220px, fixed, full height
- Background: `var(--sidebar-bg)` #0c0c13
- Right border: `1px solid var(--hair)`
- Logo top: "Fin" white + "Sight" gold, font-size 16px, weight 600
- Nav links: Overview · Receipts · Contractors · Reports · Budgets
- Default link: color `var(--t40)`, padding 10px 16px, border-radius 6px
- Active link: background `var(--gold-dim)`, color `var(--gold)`, left border `2px solid var(--gold)`
- Bottom: user email in `var(--t40)` + Sign out
- Main content: `background: var(--bg)`, remaining width, scrollable

---

## UX Rules (Every Page, No Exceptions)

- **Empty states:** Not grey text. Show an icon + specific message + a CTA button
- **Loading:** Skeleton pulse animation. Never a spinner.
- **Errors:** Human-readable message + Retry button. Never raw error text.
- **Animations:** Framer Motion on every page mount (opacity 0→1, y 16→0, 0.5s ease)
- **Numbers:** Indian format — ₹1,24,000 not ₹124,000
- **Dates:** Indian format — 17 May 2026
- **Every button click:** Immediate visual feedback (loading state or success)

---

## God-Level UX Features (Build Order)

### Now (before deploy):
1. **Progressive disclosure** — Show basic info first, reveal details on hover/click. Receipt cards show merchant + amount → hover reveals GST head + ITC status
2. **Data-driven empty states** — Empty dashboard says "Upload your first receipt to see your GST summary" with upload button inline. Not "No data yet."

### After backend runs end-to-end:
3. **Intelligent insights** — After 3+ receipts, show: "You spent ₹12,400 on Food this month — 34% over your average." Real pattern detection.
4. **Micro-celebrations** — First receipt processed: confetti burst + "₹X in ITC found!" toast. Makes the product feel alive.
5. **Receipt streak** — "5 receipts uploaded this week 🔥" in dashboard header. Gamification for a financial tool.

---

## Receipt Card Design (The Core Visual Unit)

Every receipt in any list view shows:
- Merchant name (prominent, `var(--t100)`, font-weight 500)
- Amount (right-aligned, `var(--font-mono)`, gold if ITC eligible)
- Date (small, `var(--t40)`)
- GST head tag (pill badge, amber background, amber text)
- ITC status badge: "eligible" in green or "not eligible" in dim white

On hover: card lifts (transform: translateY(-1px)), border brightens to `var(--hair-2)`

---

## The Hero Demo Card (Landing Page)

The receipt card on the landing page cycles through 3 real Indian receipts:
- Swiggy Business — ₹1,247 — Food & Beverage — 5% — not eligible
- Airtel Postpaid — ₹699 — Telecom — 18% — ₹107 claimable
- Amazon Business — ₹3,499 — Office Supplies — 18% — ₹530 claimable

Cycle every 6 seconds. Fields appear one by one. Gold scanning line sweeps. Green ITC badge appears last.

---

## Design Repos (Read These Before Building UI)

These are cloned locally. Read them, don't just acknowledge them:
- `/Users/k.sathvik/claude-global-repos/awesome-design-md/README.md`
- `/Users/k.sathvik/claude-global-repos/ui-ux-pro-max-skill/README.md`

---

## Build Protocol

1. Read this file completely
2. Read the design repos
3. Build one page/component at a time
4. Screenshot after each
5. Wait for approval before next page
6. Never build everything at once

---

## Known Issues to Fix

- `contractors` page: "Failed to load contractors" — FastAPI backend not running
- FastAPI must run from `~/Desktop/finsight-backend-local` (not iCloud path)
- Run: `cd ~/Desktop/finsight-backend-local && uvicorn main:app --reload --port 8000`
- Supabase project: `kozpikxdqddslrttazio` (confirm email is OFF in Auth → Providers)

---

## Resume Impact (Update After Each Feature Ships)

Project entry: `https://github.com/Sathvik1533/Finsight-New`

Bullets to add when deployed:
- Real measured latency (replace estimates)
- Live URL
- End-to-end pipeline working proof
