# FINSIGHT — UI GENERATOR SPECIFICATION
## Frontend System Design for AI UI Tools
```
Classification:  Internal — Frontend Architecture Contract
Version:         2.0.0
Supersedes:      FRONTEND_SYSTEM.md v1.0.0
Consumes:        PRD.md v1.0 · TECH_STACK.md v1.1 · DESIGN_SYSTEM.md v1.0
Generator Targets: v0.dev · shadcn/ui · Magic UI
Integration Target: Kiro · Next.js 14 App Router · Supabase
Scale Target:    5,000–10,000 MAU
```

---

## DOCUMENT CONTRACT

This document governs every UI generation decision for FinSight. It is non-negotiable. Any UI that cannot be traced back to a rule in this document is not FinSight UI — it is slop.

**Read order by role:**

| Role | Mandatory sections |
|---|---|
| v0.dev operator | §1 → §4 → §5 → §7 |
| Component builder | §3 → §5 → §6 |
| Motion engineer | §6 |
| Backend integrator | §9 |
| QA / validator | §10 |

---

# §1 — PRODUCT IDENTITY SYSTEM

## 1.1 The Core Metaphor

FinSight is not a dashboard. It is an **intelligence engine that becomes more powerful the more data it processes.** The UI must embody this at every level — not just the intelligence meter component, but the entire experience of using it should feel like you're watching a system wake up and learn.

The design metaphor is a **telescope being focused.** At first, the image is blurry (Level 1). As you feed more data, the lens resolves (Level 2). Eventually you can see things you couldn't see before (Levels 3 and 4). This metaphor governs tone, copy, motion behavior, and progressive disclosure.

## 1.2 Visual DNA — The Exact Rules

```
BACKGROUND LAYER:   #0D0F1A — deep indigo-slate (NOT black, NOT navy, NOT #1a1a1a)
SURFACE LAYER:      glassmorphism over gradient substrate — never flat cards
ACCENT LAYER:       #FFD166 amber-gold — the only warm color in a cool system
MONEY TYPEFACE:     JetBrains Mono — monospace for ALL financial figures
UI TYPEFACE:        Inter — variable weight — NO EXCEPTIONS
CHART SYSTEM:       Tremor — themed to amber — no custom chart library
MOTION ENGINE:      Framer Motion — spring physics — no CSS ease on reveals
```

## 1.3 What Makes This FinSight (Not Generic SaaS)

Every screen must contain exactly these four elements. If one is absent, the screen fails identity review.

```
RULE 1 — AMBER ANCHOR
  One element per screen must use #FFD166 as its primary color.
  This is usually the primary CTA. Never the logo. Never decorative.

RULE 2 — DEPTH STACK
  Background (#0D0F1A) → substrate gradient → glass card → content
  Four visible layers minimum. If a screen looks flat, add a layer.

RULE 3 — ASYMMETRIC BREAK
  One element on every page must break the grid: an oversized number,
  a full-bleed image panel, an offset heading, a card that spans differently.
  Symmetric layouts feel like templates. FinSight doesn't use templates.

RULE 4 — ONE LIVING ELEMENT
  One element on the screen must be animated when not being interacted with.
  On Dashboard: the Intelligence Meter (Level 4 shimmer or Level 1 pulse).
  On Upload: the orbital processing ring.
  On Auth: the left panel particle effect.
  On Receipts/Insights/Settings: the Intelligence Meter in the sidebar.
```

## 1.4 Anti-Identity List (Hard Prohibitions)

These patterns are banned. No exceptions. No "just this once."

```
BANNED PATTERNS:
  × Purple, violet, or indigo ACCENT colors (backgrounds only permitted)
  × Centered boxed layouts for authenticated pages
  × 3-column equal-weight card grids ("dashboard templates")
  × Default shadcn/ui styling (always override — see §8)
  × System fonts (Arial, Helvetica, Roboto, San Francisco as primary)
  × Empty page states that just say "No data" — always motivational
  × Loading spinners — skeleton screens only
  × Toast notifications in purple or default colors
  × Charts without titles and unit labels
  × Pie charts (donuts only — for category data)

BANNED COLORS:
  × #8B5CF6 (violet)
  × #6366F1 (indigo as accent)
  × #3B82F6 (plain blue as primary)
  × Any gradient from purple → blue → pink
  × Any "frosted glass" that obscures text legibility
```

---

# §2 — DESIGN SYSTEM TOKENS

## 2.1 Color System (Complete Reference)

All UI must reference these tokens. Never hardcode hex unless it is one of these values.

```
── BASE BACKGROUNDS ──────────────────────────────────────
base-950:    #0D0F1A    Page background — deepest layer
base-900:    #13162A    Primary surface — sidebar, main panels
base-800:    #1C2040    Elevated surface — card background
base-700:    #252849    Dividers, borders, track backgrounds
base-600:    #343766    Subtle borders
base-500:    #4A4E85    Muted fills, input backgrounds

── TEXT HIERARCHY ────────────────────────────────────────
text-primary:    #F0F2FF    Body — near white with blue cast
text-secondary:  #A8ADCC    Descriptions, meta, labels
text-muted:      #6B71A0    Captions, disabled labels
text-disabled:   #3D4170    Non-interactive text

── AMBER ACCENT (BRAND) ──────────────────────────────────
accent-200:  #FFF0CC    Background tint (alerts, unlock states)
accent-300:  #FFE099    Hover state
accent-400:  #FFD166    PRIMARY — CTAs, active states, highlights
accent-500:  #E6B83A    Pressed state
accent-600:  #B8891A    Deep border accent

── SEMANTIC ──────────────────────────────────────────────
success-400: #4ECCA3    Positive: trends up, confirmed, health
success-900: #0F2E24    Success card backgrounds
warning-400: #F6B26B    Budget warnings, caution
warning-900: #2E1D0A    Warning card backgrounds
danger-400:  #EF6D6D    Anomalies, errors, overspend
danger-900:  #2E0F0F    Error card backgrounds
info-400:    #7B9EE0    Neutral trends, informational

── CHART SEQUENCE ────────────────────────────────────────
chart-1:   #FFD166    Primary data series (amber)
chart-2:   #4ECCA3    Secondary (seafoam)
chart-3:   #7B9EE0    Tertiary (periwinkle)
chart-4:   #F6B26B    Quaternary (apricot)
chart-5:   #C084FC    Fifth (soft violet — chart context ONLY)
chart-6:   #EF6D6D    Sixth (coral)
chart-7:   #60CDCD    Seventh (teal)
chart-8:   #9CA3AF    Eighth (neutral — overflow/Other)
```

## 2.2 Controlled Palette Registry (Secondary Palettes)

Secondary palettes are permits, not suggestions. Each has exactly one use.

| Palette Name | Colors | Permitted Context | Max Instances Per View |
|---|---|---|---|
| Deep Forest & Champagne | `#102C26` / `#F7E7CE` | Upload modal — PROCESSING state interior only | 1 |
| Cherry Red & Butter Yellow | `#FF4747` / `#F7E998` | Anomaly callout cards in Insights page | ≤ 3 |
| Mist Gray & Midnight Blue | `#ECEFF1` / `#191970` | Confidence breakdown section in Receipt Detail | 1 |
| Ivory & Donkey Brown | `#FFF2E1` / `#A79277` | Filter bar accent stripe in Receipts page | 1 |
| Neon Coral & Space Black | `#FF6044` / `#121313` | Settings danger zone card ONLY | 1 |

**Using a secondary palette outside its permitted context is a design violation.**

## 2.3 Glass Surface System

Three glass levels. Use the right one for the right depth.

```css
/* LEVEL 1 — Standard Glass (KPI cards, list items) */
background:      rgba(28, 32, 64, 0.70)
backdrop-filter: blur(12px)
border:          1px solid rgba(74, 78, 133, 0.40)
border-radius:   16px

/* LEVEL 2 — Elevated Glass (hero metrics, HealthScoreCard) */
background:      rgba(28, 32, 64, 0.85)
backdrop-filter: blur(20px)
border:          1px solid rgba(255, 209, 102, 0.20)   /* amber tint */
border-radius:   16px
box-shadow:      0 8px 32px rgba(0,0,0,0.40),
                 0 0 0 1px rgba(255,209,102,0.08)

/* LEVEL 3 — Subtle Glass (table rows, sidebar items) */
background:      rgba(19, 22, 42, 0.50)
border:          1px solid rgba(52, 55, 102, 0.30)
border-radius:   10px
```

## 2.4 Typography System

```
DISPLAY (hero metrics, unlock numbers):
  font-family:    Inter
  font-size:      clamp(40px, 5vw, 64px)
  font-weight:    700
  letter-spacing: -0.03em
  line-height:    1.05

HEADING H1:
  font-size: 30px  / weight: 700 / letter-spacing: -0.02em

HEADING H2:
  font-size: 24px  / weight: 600 / letter-spacing: -0.015em

HEADING H3:
  font-size: 20px  / weight: 600 / letter-spacing: -0.01em

BODY DEFAULT:
  font-size: 14px  / weight: 400 / line-height: 1.6

LABEL (all uppercase context labels):
  font-size: 12px  / weight: 500 / letter-spacing: 0.06em / UPPERCASE

CAPTION:
  font-size: 11px  / weight: 400

AMOUNT XL (hero financials):
  font-family: JetBrains Mono
  font-size:   36px / weight: 700
  font-variant-numeric: tabular-nums
  letter-spacing: -0.02em

AMOUNT LG:
  font-family: JetBrains Mono
  font-size:   24px / weight: 600
  font-variant-numeric: tabular-nums

AMOUNT DEFAULT:
  font-family: JetBrains Mono
  font-size:   16px / weight: 500
  font-variant-numeric: tabular-nums

AMOUNT SM:
  font-family: JetBrains Mono
  font-size:   13px / weight: 400
  font-variant-numeric: tabular-nums
```

**Rules:**
- ₹ currency symbol renders at 85% the size of the adjacent amount
- Negative amounts: `danger-400`
- Positive deltas: `success-400`
- Confidence percentages use Inter, not Mono (they are context scores, not money)

## 2.5 Spacing Scale

```
space-1:   4px    micro: icon padding, inline gaps
space-2:   8px    tight: badge padding
space-3:   12px   component internal: small
space-4:   16px   component internal: default
space-5:   20px   component internal: comfortable
space-6:   24px   card padding default
space-8:   32px   card padding generous / tight section gap
space-10:  40px   section gap default
space-12:  48px   section gap comfortable
space-16:  64px   major section separation
```

## 2.6 Global Background Substrate

This is applied to the root layout and never scrolls. It is what gives the glass cards their depth. Without it, glassmorphism is meaningless.

```
Layer 1 (base):       #0D0F1A — full bleed, position: fixed, z-index: 0
Layer 2 (warm glow):  radial-gradient — origin top-left, rgba(255,209,102,0.04) at 0%, transparent at 60%
Layer 3 (cool glow):  radial-gradient — origin bottom-right, rgba(123,158,224,0.06) at 0%, transparent at 60%
Layer 4 (texture):    SVG noise at 3% opacity — breaks digital flatness
All layers:           pointer-events: none, user-select: none
```

---

# §3 — UI ARCHITECTURE

## 3.1 Application Shell

```
ROOT LAYOUT  (src/app/layout.tsx)
├── GlobalSubstrate             fixed bg — indigo + gradient layers + noise texture
├── QueryClientProvider         TanStack Query
└── AppShell  (src/app/(app)/layout.tsx)
    ├── Sidebar                 240px expanded | 64px collapsed | bottom-nav mobile
    │   ├── LogoMark            full text / icon monogram (collapsed)
    │   ├── IntelligenceMeter   variant="sidebar" — always rendered
    │   ├── NavItem × 4         Dashboard · Receipts · Insights · Settings
    │   └── UploadCTA           amber button — always visible — always bottom
    └── MainColumn
        ├── PageHeader          64px sticky — glass — page title + user controls
        └── PageSlot            <AnimatePresence> wraps every route
```

## 3.2 Route Architecture

| Route | Layout Group | Rendering | Initial Data |
|---|---|---|---|
| `/` | (public) | Static | None |
| `/auth` | (auth) | Static | Supabase Auth |
| `/dashboard` | (app) | SSR + hydrate | `GET /api/dashboard/summary` |
| `/receipts` | (app) | SSR + hydrate | `GET /api/receipts?page=1` |
| `/receipts/[id]` | (app) | SSR | `GET /api/receipts/[id]` |
| `/insights` | (app) | SSR + hydrate | `GET /api/insights` |
| `/settings` | (app) | SSR | Supabase profile |

## 3.3 Layout Grid System

```
Desktop  (1280px+):   12-col, 24px gap, 32px horizontal padding
Laptop   (1024–1279): 12-col, 20px gap, 24px horizontal padding
Tablet   (768–1023):  8-col,  16px gap, 20px horizontal padding
Mobile   (<768px):    4-col,  12px gap, 16px horizontal padding
Sidebar deducted from available width (240px desktop / 0px mobile)
```

## 3.4 Responsive Behavior Table

| Element | Desktop | Tablet | Mobile |
|---|---|---|---|
| Sidebar | Collapsible (240px / 64px) | Hidden — hamburger drawer | Bottom nav (4 icons) |
| KPI cards | 4-column row | 2×2 grid | Full-width stack |
| Dashboard chart pair | Side-by-side (6+6 cols) | Stacked | Full width each |
| Transaction list | Full table | Simplified rows | Card list |
| Upload modal | Centered 560px | Full-width modal | Bottom sheet |
| Health Score panel | Right rail (4 cols) | Full-width card | Full-width card |
| Receipt detail | 60/40 split | Stacked | Stacked |

---

# §4 — PAGE BLUEPRINTS

Each blueprint defines: layout grid zones, component assignments, intelligence level gates, secondary palette permit, and the asymmetric break element.

---

## 4.1 DASHBOARD — The Core Product Screen

```
SECONDARY PALETTE:   None — primary amber only
ASYMMETRIC BREAK:    The Intelligence Status Bar bleeds left of the KPI grid column gutter
```

### Zone Map

```
┌─────────────────────────────────────────────────────────┐
│ ZONE A  PageHeader 64px sticky                          │
│ "Good morning [Name]"  [date badge]  [Upload Receipt ▲] │
├──────────────────────────────────────────────────────────┤
│ ZONE B  Intelligence Status Bar  56px  full-width       │
│ ─────────────────────────────■  PATTERNS FORMING        │
│ [horizontal IntelligenceMeter]    3 more receipts to    │
│ Thin amber glow at fill edge      unlock visual trends → │
├───────────────────────────────────┬──────────────────────┤
│ ZONE C  KPI Strip  8 cols         │ ZONE D  Right Rail   │
│                                   │ 4 cols               │
│ L1: 4 skeleton cards shimmer      │ L1-3: HealthLocked   │
│ L2: 4 KPICard components          │ "Upload X more"      │
│     (staggered unlock animation)  │                      │
│ L3: same + TopMerchant card       │ L4: HealthScoreCard  │
│ L4: same + anomaly badges         │ (hero unlock moment) │
├───────────────────────────────────┤                      │
│ ZONE E  Chart Pair  8 cols        │                      │
│                                   │                      │
│ L1-2: Hidden entirely             │                      │
│ L3+:  SpendingDonut (left 4)      │                      │
│       WeeklyTrend  (right 4)      │                      │
│       (unlockReveal spring)       │                      │
├───────────────────────────────────┴──────────────────────┤
│ ZONE F  Transaction Feed  full width                     │
│ L1: EmptyState illustration + Upload CTA                 │
│ L2+: TransactionRow × 8, staggered entrance             │
│ Header: "Recent Transactions" left + "View all →" right  │
└──────────────────────────────────────────────────────────┘
```

### Intelligence Level → Visual State Map

| Zone | L1 (0–2) | L2 (3–5) | L3 (6–9) | L4 (10+) |
|---|---|---|---|---|
| B (meter) | 0–15% pulse glow | 40% steady | 70% bright | 100% shimmer |
| C (KPIs) | 4 skeletons + teaser labels | Real data, cardReveal | Real data | Real + anomaly badges |
| D (right rail) | Locked — padlock | "X more" progress | "X more" progress | HealthScoreCard |
| E (charts) | Absent | Absent | Unlock sequence fires | Charts + anomaly layer |
| F (transactions) | EmptyState | Real rows | Real rows + flags | Real rows + anomaly flags |

### Level Unlock Animation Trigger

```
TRIGGER: profile.total_receipts_uploaded crosses 3, 6, or 10

SEQUENCE:
  T+0ms    → IntelligenceMeter fill animates to new percentage (800ms spring)
  T+0ms    → Gold flash: opacity pulse at fill tip (0→0.6→0, 400ms)
  T+300ms  → New components enter viewport (initially hidden, y=20, scale=0.92)
  T+400ms  → First new component: unlockReveal (spring stiffness:400 damping:30)
  T+470ms  → Second new component (70ms stagger)
  T+540ms  → Third (70ms stagger)
  T+800ms  → All new components settled — sequence complete
  T+900ms  → If Level 4: Magic UI Confetti fires once (amber/gold/champagne palette)
```

---

## 4.2 UPLOAD MODAL — The AI Processing Moment

```
SECONDARY PALETTE:   Deep Forest & Champagne — PROCESSING state only
ASYMMETRIC BREAK:    The orbital ring is deliberately off-center (20px left of modal center)
```

### State Machine

```
IDLE ────────────────────────────────────────────────────────┐
  [file selected]                                             │
  ▼                                                           │
PREVIEW ──[user cancels]──────────────────────────────────────┤
  [user confirms]                                             │
  ▼                                                           │
PROCESSING ──[402 returned]──────► UPGRADE_PROMPT ──[close]──┤
  [success]    [failure]                                      │
  ▼            ▼                                              │
RESULTS      ERROR ──[retry]──────────────────────────────────┘
  [confirm & save]
  ▼
IDLE (+ query invalidation + level check)
```

### State Visual Specs

**IDLE**
```
Drop zone:      dashed 2px #343766, border-radius 12px, padding 40px
Drag-over:      border becomes #FFD166 (150ms ease)
Icon:           Lucide Upload 48px #6B71A0 center
Heading:        "Drop your receipt here" 20px Inter 600 #F0F2FF
Sub:            "or click to browse" 14px #A8ADCC
Footer:         "JPEG · PNG · PDF  ·  max 10MB" 11px #6B71A0
Buttons:        [Cancel] ghost + [Browse Files →] amber primary
```

**PROCESSING — Deep Forest moment**
```
Modal interior:   rgba(16, 44, 38, 0.6) — Deep Forest (#102C26) tint over glass
Orbital ring:     200px diameter, 2px stroke, #FFD166 dashed arc (25% circumference)
                  CSS animation: orbital-spin 3s linear infinite
Ring center:      Lucide FileText 28px #F7E7CE (Champagne — the only use of this color)
Steps 1–3:        stacked below ring, each 44px height

Step anatomy:
  [Lucide icon 16px]  [Label text 14px]  ............  [Spinner | Checkmark]

Step states:
  Pending:    icon #6B71A0, label #6B71A0, spinner: Loader2 spin CSS
  Active:     icon #FFD166, label #F0F2FF, spinner: Loader2 spin CSS
  Complete:   icon #4ECCA3, label #A8ADCC, checkmark: CheckCircle2 #4ECCA3
              Checkmark entrance: scale(0→1) + opacity(0→1) spring stiffness:500 damping:20

Step sequence:
  processingStep 1:  "Reading receipt image..."         (fires at T+0)
  processingStep 2:  "Identifying merchant and amount..." (fires at T+800ms via setTimeout)
  processingStep 3:  "Categorising transaction..."       (fires at T+1600ms via setTimeout)
```

**RESULTS**
```
Layout:         two columns inside modal, 50/50
Left:           receipt image (or Lucide Receipt icon if PDF) — centered, max-h 280px
Right:          data fields stacked
  Merchant:     label "MERCHANT" 11px uppercase #6B71A0 / value 18px Inter 600 #F0F2FF
  Amount:       label "AMOUNT" 11px uppercase / value ₹ XX,XXX JetBrains Mono 24px
  Date:         label "DATE" / value 14px #F0F2FF
  Category:     label "CATEGORY" / CategoryBadge large variant
  Confidence:   label "AI CONFIDENCE" / ProgressBar amber fill + "89%" right label
Footer:         [Try Again] ghost + [Confirm & Save →] amber primary
```

**UPGRADE_PROMPT**
```
Icon:           Lucide LockKeyhole 32px #FFD166 center
Heading:        "You've used all 20 free receipts this month" 20px 600 #F0F2FF
Body:           "Upgrade to Pro for unlimited uploads, full history, and advanced insights."
                14px #A8ADCC max-width 360px center
Pricing line:   "₹499 / month · Cancel anytime" 13px #FFD166
Buttons:        [Maybe Later] ghost + [Upgrade to Pro →] amber primary
```

---

## 4.3 RECEIPTS PAGE — Full History

```
SECONDARY PALETTE:   Ivory & Donkey Brown — filter bar accent stripe only
ASYMMETRIC BREAK:    Receipt thumbnail rotates 1° on hover (physical receipt feel)
```

### Zone Map

```
┌────────────────────────────────────────────────────────────────┐
│ ZONE A  PageHeader                                             │
│ "Your Receipts" + count badge (#FFD166 bg dark text)          │
│                                [Upload Receipt ▲]              │
├────────────────────────────────────────────────────────────────┤
│ ZONE B  FilterBar  56px sticky  glass-subtle                   │
│ Left accent stripe:  3px solid #A79277 (Donkey Brown)          │
│ [All Categories ▼]  [Last 30 days ▼]  [All Statuses ▼]        │
│                                    [🔍 Search receipts...]     │
├────────────────────────────────────────────────────────────────┤
│ ZONE C  Content Area                                           │
│                                                                │
│ DESKTOP TABLE:                                                 │
│ Thumb (52px) | Merchant | Date | Category | Amount | Conf | ⋯ │
│ Row hover: left border 2px #FFD166 appears, bg lightens       │
│                                                                │
│ MOBILE CARDS:                                                  │
│ [Thumb 48px] Merchant                             ₹ Amount    │
│              14 Jan 2025   [Category badge]  ● conf dot       │
│                                                                │
│ EMPTY (filters active, no results):                           │
│ "No receipts match your filters" + [Clear Filters] link       │
├────────────────────────────────────────────────────────────────┤
│ ZONE D  Pagination                                             │
│ ← Previous   Page 1 of 4   Next →                            │
└────────────────────────────────────────────────────────────────┘
```

---

## 4.4 RECEIPT DETAIL — Single Record

```
SECONDARY PALETTE:   Mist Gray & Midnight Blue — confidence breakdown section only
ASYMMETRIC BREAK:    Receipt image panel dominates at 60% — the data panel feels secondary
```

### Zone Map

```
┌────────────────────────────────────────────────────────────────┐
│ ZONE A  Breadcrumb                                             │
│ ← Your Receipts  /  BATA INDIA LTD                            │
├──────────────────────────────────┬─────────────────────────────┤
│ ZONE B  Receipt Image (60%)      │ ZONE C  Data Panel (40%)   │
│                                  │                             │
│ Signed image, max-height 520px   │ Merchant                   │
│ Glass card — Level 2 glass       │ BATA INDIA LTD             │
│ Amber inner glow on load:        │ H1, 30px, Inter 700        │
│   0→0.4→0 opacity 300ms pulse    │                             │
│                                  │ Amount                     │
│ PDF fallback:                    │ ₹ 2,499                   │
│   Lucide FileText 64px #6B71A0   │ JetBrains Mono 36px        │
│   + "PDF Receipt" caption        │                             │
│                                  │ Date          Category     │
│                                  │ 14 Jan 2025   [Badge]      │
│                                  │                             │
│                                  │ ── Confidence Section ──── │
│                                  │ Palette: Mist Gray tint    │
│                                  │ bg: rgba(236,239,241,0.04) │
│                                  │ ██████████░ 89%             │
│                                  │ "High confidence" 12px     │
│                                  │                             │
│                                  │ ── AI Reasoning ─────────  │
│                                  │ "This receipt appears to   │
│                                  │  be a retail footwear..."  │
│                                  │ 13px italic #A8ADCC        │
│                                  │                             │
│                                  │ Line Items (if present):   │
│                                  │ compact table, 13px        │
│                                  │                             │
│                                  │ ─────────────────────────  │
│                                  │ [Delete Receipt ×]  danger │
└──────────────────────────────────┴─────────────────────────────┘
```

---

## 4.5 INSIGHTS PAGE — Full Analysis View

```
SECONDARY PALETTE:   Cherry Red & Butter Yellow — anomaly callouts only
ASYMMETRIC BREAK:    Zone B donut is 320px × 320px — larger than its container suggests
LEVEL GATE:          Requires profile.intelligence_level >= 3 (server-side redirect if < 3)
```

### Zone Map

```
┌────────────────────────────────────────────────────────────────┐
│ ZONE A  PageHeader                                             │
│ "Financial Insights"  [Last 30d ▼]  [Last 90d ▼]  [↻ Refresh] │
├──────────────────────────────┬─────────────────────────────────┤
│ ZONE B  Category Donut       │ ZONE C  Spending Trend         │
│ 6 columns                    │ 6 columns                      │
│                              │                                │
│ Tremor DonutChart 320px      │ Tremor AreaChart               │
│ Center label: total spend    │ [Weekly] [Monthly] toggle      │
│ Legend below, amounts right  │ Amber fill, no stroke          │
│                              │ X: dates, Y: ₹ spend           │
│                              │                                │
├──────────────────────────────┴─────────────────────────────────┤
│ ZONE D  Top Merchants (4 cols)     │ ZONE E  AI Panel (8 cols) │
│                                    │ LEVEL 4+ ONLY             │
│ Section title: "Top Merchants"     │                           │
│ 1. Swiggy          ₹8,420  [Badge] │ [HealthScoreArc 120px]   │
│ 2. Bata India      ₹2,499  [Badge] │ Score: 74  GOOD           │
│ 3. Uber            ₹1,840  [Badge] │                           │
│ 4. Amazon          ₹1,320  [Badge] │ "Your food spending       │
│ 5. More...                         │ has stabilized but        │
│                                    │ transport is rising 18%." │
│                                    │                           │
│                                    │ [Anomaly callout block]:  │
│                                    │ Cherry Red background 8%  │
│                                    │ ⚠ ₹4,200 transport spike  │
│                                    │ 3× your average (12 Jan)  │
│                                    │                           │
│                                    │ "Last updated 2 hours ago"│
│                                    │ [↻ Refresh Insights]      │
├────────────────────────────────────┴───────────────────────────┤
│ ZONE F  Category Bar Chart  full width                        │
│ Tremor BarChart, horizontal, sorted total DESC                │
│ 12 categories, color-mapped, labeled with ₹ amounts           │
└────────────────────────────────────────────────────────────────┘
```

---

## 4.6 SETTINGS PAGE — User Control Center

```
SECONDARY PALETTE:   Neon Coral & Space Black — Danger Zone card ONLY
ASYMMETRIC BREAK:    Plan card has a full-width amber progress bar that bleeds to card edge
```

### Section Cards (stacked, single column, max-width 680px, centered in content area)

```
CARD 1 — PROFILE
  Input: Full name (editable)
  Display: Email (read-only, slightly muted)
  Select: Currency (INR / USD / EUR) — using shadcn Select
  Button: [Save Changes] amber primary, right-aligned

CARD 2 — CURRENT PLAN
  Badge: FREE TIER or PRO badge (amber-outlined if free, amber-filled if pro)
  Progress: "12 of 20 receipts used this month"
    — ProgressBar, amber fill, bleeds to card edges (no horizontal padding on bar)
    — This is the asymmetric break on this page
  CTA (free tier only): [Upgrade to Pro — ₹499/month →] amber button

CARD 3 — DATA EXPORT
  Body: "Export all your transaction data as a CSV file."
  Button: [Export Data (CSV)] secondary button, Lucide Download icon

CARD 4 — DANGER ZONE
  Background:   #121313 (Space Black)
  Border:       1px solid rgba(255,96,68,0.30) (Neon Coral)
  Label:        "DANGER ZONE" 11px uppercase #FF6044
  Heading:      "Delete Account" 17px #F0F2FF
  Body:         "This action is permanent and cannot be undone. All your receipts and data will be deleted."
  Button:       [Delete My Account] — background transparent, text #FF6044, border rgba(255,96,68,0.4)
  Confirm:      Requires user to type "DELETE" in an input before button activates

FOOTER:
  [Sign Out] ghost button, #A8ADCC text, full-width, bottom of page
```

---

## 4.7 AUTH PAGE — Entry Point

```
SECONDARY PALETTE:   None — pure brand identity
ASYMMETRIC BREAK:    Left panel tagline is set at an aggressive -0.03em letter spacing at 42px
                     — it reads as designed, not generated
```

### Zone Map

```
DESKTOP (two-column):
┌────────────────────────────┬────────────────────────────────┐
│ LEFT PANEL (45%)           │ RIGHT PANEL (55%)              │
│ background: #13162A        │ background: #0D0F1A            │
│                            │                                │
│ Logo: "Fin" #F0F2FF        │ [Glass card: Level 1 glass]    │
│       "Sight" #FFD166      │  max-width 480px, centered     │
│       Inter 700 28px       │                                │
│                            │  "Welcome back" / H2           │
│ Tagline (42px -0.03em):    │  [Sign In] [Create Account]    │
│ "Your finances.            │   tab toggle — active = amber  │
│  Finally intelligent."     │   underline                    │
│                            │                                │
│ [decorative IntelMeter     │  [Email label + input]         │
│  180px horizontal, 70%     │  [Password label + input]      │
│  filled, amber gradient]   │  + Confirm Password (sign-up)  │
│                            │  + Full Name (sign-up)         │
│ Feature bullets (14px):    │                                │
│ · Gemini Vision OCR        │  [Sign In →] amber full-width  │
│ · AI categorisation        │                                │
│ · Financial Health Score   │  ──── or ────                 │
│                            │  [G] Continue with Google      │
│ [Meteors bg effect]        │                                │
│ amber particles, subtle    │  Privacy / Terms 11px #6B71A0  │
└────────────────────────────┴────────────────────────────────┘

MOBILE:
  Left panel → 80px strip (logo only, horizontal)
  Right panel → full width, form vertically centered
```

---

# §5 — COMPONENT HIERARCHY

## 5.1 Atoms — Primitive Elements

Every atom is self-contained. No atom imports another component.

| Atom | Description | Key Tokens |
|---|---|---|
| `AmberButton` | Primary CTA — amber bg, dark text, 10px radius | accent-400, base-950 |
| `SecondaryButton` | Bordered, transparent | base-600 border, text-primary |
| `GhostButton` | No border, muted text | text-secondary hover text-primary |
| `DangerButton` | Coral border, coral text | danger-400, danger-900 on hover |
| `GlassCard` | Level 1 glass surface | See §2.3 Level 1 |
| `GlassCardElevated` | Level 2 glass surface | See §2.3 Level 2 |
| `GlassSubtle` | Level 3 glass surface | See §2.3 Level 3 |
| `CurrencyAmount` | JetBrains Mono wrapper with ₹ at 85% | font-mono, tabular-nums |
| `CategoryBadge` | Color-mapped to TransactionCategory | 12 color mappings |
| `ConfidenceDot` | 8px circle — green/amber/red | success/accent/danger-400 |
| `StatusChip` | pending/processing/complete/failed | Semantic colors |
| `DeltaIndicator` | ↑↓ arrow + value + label | success/danger-400 |
| `ProgressBar` | Amber fill, base-700 track | accent-400, base-700 |
| `SkeletonBlock` | Shimmer rectangle — CSS only | base-700 → base-600 shimmer |
| `IconWrapper` | Lucide standardized sizing | 4 sizes: 20/18/16/14px |
| `LevelBadge` | Level 1–4 pill indicator | Amber gradient |
| `AmberBadge` | Count/status badge with amber bg | accent-400, base-950 |

## 5.2 Molecules — Composed Elements

Molecules combine 2–4 atoms into a functional UI unit.

| Molecule | Atoms Used | Function |
|---|---|---|
| `KPICard` | GlassCard + IconWrapper + CurrencyAmount + DeltaIndicator | Single metric tile |
| `KPICardSkeleton` | GlassCard + SkeletonBlock × 3 | Loading state for KPICard |
| `TransactionRow` | IconWrapper + CategoryBadge + CurrencyAmount + ConfidenceDot | Single transaction item |
| `TransactionCard` | GlassSubtle + TransactionRow (mobile layout) | Mobile transaction view |
| `ReceiptThumbnail` | img + GlassSubtle + 1° tilt animation | 52px receipt preview |
| `ProcessingStep` | IconWrapper + text + (Spinner or Checkmark) | Upload pipeline step |
| `InsightTextCard` | GlassCard + IconWrapper + text + meta | Single AI insight display |
| `AnomalyCallout` | GlassCard + AlertTriangle + CurrencyAmount | Cherry Red anomaly block |
| `MerchantRankRow` | rank number + text + CurrencyAmount + CategoryBadge | Insights merchant list item |
| `ConfidenceBar` | ProgressBar + percentage label | Confidence visualization |
| `CategoryFilterDropdown` | shadcn Select + CategoryBadge × 12 | Filter control |
| `DateRangeSelect` | shadcn Select + 3 presets | Date filter control |
| `PaginationControls` | SecondaryButton × 2 + page indicator | Page navigation |
| `PlanProgressBar` | ProgressBar + usage text + limit | Receipts used this month |

## 5.3 Organisms — Full UI Sections

Organisms are complete, independently functional UI blocks.

### `IntelligenceMeter` — The Identity Component

```
Props:
  receiptCount: number   — drives ALL visual behavior
  variant:      'sidebar' | 'dashboard'

Sidebar variant:
  Dimensions:   8px wide × 140px tall
  Orientation:  vertical — fills from bottom to top

Dashboard variant:
  Dimensions:   full container width × 6px tall
  Orientation:  horizontal — fills left to right

Fill calculation (from receiptCount, not from profile.intelligence_level):
  0 receipts:   0%
  1–2 receipts: 15%
  3–5 receipts: 40%
  6–9 receipts: 70%
  10+ receipts: 100%

Fill color:
  gradient: #E6B83A (accent-500) → #FFD166 (accent-400)

Fill tip:
  box-shadow: 0 0 12px rgba(255, 209, 102, 0.4)

Level 4 only (receiptCount >= 10):
  CSS keyframe amber-shimmer: lighter sweep (#FFF0CC) at 2s loop
  No JS — pure CSS animation

Framer Motion:
  animate={{ scaleY or scaleX }}
  transition: spring stiffness:200 damping:25
  triggers on receiptCount change only

Labels (below bar):
  Level label:  12px uppercase #A8ADCC  ("PATTERNS FORMING" etc.)
  Sub-label:    11px #6B71A0  ("3 more receipts to unlock visual trends")

Level label map:
  1 → "SYSTEM LEARNING"
  2 → "PATTERNS FORMING"
  3 → "ANALYSIS ACTIVE"
  4 → "FULL INTELLIGENCE"
```

### `HealthScoreCard` — Level 4 Hero

```
Visibility gate: profile.total_receipts_uploaded >= 10

Container: Level 2 elevated glass, full height right rail

SVG Arc:
  ViewBox:        200 × 200
  Arc span:       220 degrees (starts 160°, ends 380° clockwise)
  Track stroke:   #252849, stroke-width 12, stroke-linecap round
  Fill stroke:    #FFD166, same settings
  Fill amount:    (score / 100) × 220 degrees
  Mount animation: fill arc from 0 → final, 800ms springGentle

Center of arc:
  Score number:   JetBrains Mono 36px bold #F0F2FF (Magic UI NumberTicker)
  Band label:     12px uppercase, color per band

Score bands:
  0–39   "AT RISK"     → danger-400 (#EF6D6D)
  40–59  "FAIR"        → warning-400 (#F6B26B)
  60–79  "GOOD"        → info-400 (#7B9EE0)
  80–100 "EXCELLENT"   → success-400 (#4ECCA3)

Sub-scores (4 columns below arc):
  Consistency | Diversification | Anomaly | Trend
  Each:
    - Label: 11px #6B71A0
    - 5-dot indicator: filled=#FFD166, empty=#252849, 6px each, 3px gap
    - Percentage: 13px JetBrains Mono #A8ADCC

AI Commentary:
  1px divider: #252849
  Text: 13px italic #A8ADCC, 2-line max
```

### `UploadModal` — 6-State Machine

```
See §4.2 for complete state visual specs.

Additional organism-level specs:

Container:
  Position: fixed, full-screen backdrop
  Backdrop: rgba(13,15,26,0.8) backdrop-blur(8px)
  Card: Level 2 elevated glass, 560px wide (desktop), full-width (mobile)
  Padding: 32px
  Enter animation: opacity(0→1) + scale(0.96→1) spring stiffness:400 damping:30
  Exit animation:  opacity(1→0) + scale(1→0.96) duration 200ms ease-in

Hook: useUpload()
  States: 'idle' | 'uploading' | 'processing' | 'complete' | 'error' | 'limit_reached'
  State drives which view renders inside the modal
```

### `Sidebar` — Navigation Shell

```
Width:          240px expanded, 64px collapsed
Collapse:       CSS transition 200ms ease — user-triggered via toggle
Mobile:         Not rendered — replaced by BottomNav

Background:     #13162A (base-900)
Right border:   1px solid #252849 (base-700)

Sections (top → bottom):
  1. LogoSection:   Full logo (expanded) / "FS" monogram (collapsed)
  2. IntelligenceMeter: variant="sidebar", positioned 20px below logo
  3. NavItems × 4:  Dashboard · Receipts · Insights · Settings
  4. UploadCTA:     Pinned to bottom, full amber button (expanded)
                    Amber circle icon-only button (collapsed)

NavItem states:
  Default: bg transparent, text #A8ADCC
  Hover:   bg rgba(37,40,73,0.5), text #F0F2FF, 150ms ease
  Active:  bg #1C2040 (base-800), text #FFD166,
           left border: 2px solid #FFD166
  Icon:    Lucide 20px stroke-1.75

Insights item locked state:
  When profile.intelligence_level < 3:
  Icon: Lucide Lock 20px overlaid at 50% opacity
  Text: #3D4170 (text-disabled)
  Tooltip on hover: "Upload 6 receipts to unlock Insights"
```

### `TransactionFeed` — Dashboard Transaction Section

```
Section header:   "Recent Transactions" H3 left  +  "View all →" amber link right
Transaction count: most recent 8 rows
Row component:    TransactionRow
Empty state:      EmptyState organism (Level 1)

List container:   Framer Motion staggerContainer variant
  staggerChildren: 0.04s  (40ms between rows — tighter than cards)
  delayChildren:   0.1s

Row entrance:     cardReveal variant (opacity + y + scale)
Scroll:           not scrollable — "View all →" navigates to /receipts

Anomaly flag:
  When transaction.is_anomalous (Level 4+ context):
  AlertTriangle 14px #F6B26B (warning-400) appended to row
```

### `SpendingDonut` — Category Distribution

```
Wraps Tremor DonutChart
Props:
  data:     Array<{ category: TransactionCategory, total: number }>
  centerLabel: string (formatted total spend)

Colors:   chartColors array in chart-sequence order
Animation: Tremor showAnimation prop — true always

Center:
  Total label: 11px uppercase #6B71A0 "TOTAL SPEND"
  Amount:      CurrencyAmount 20px JetBrains Mono #F0F2FF

Legend:
  Position: below chart
  Each item: [color dot 8px] [category name 13px] [₹ amount right]

Tooltip:
  Background: #1C2040 glass
  Content:    category + ₹ amount + % of total
```

### `WeeklyTrendChart` — Spending Over Time

```
Wraps Tremor AreaChart
Props:
  data:      Array<{ week: string, total: number }>
  period:    'weekly' | 'monthly'

Fill color:  #FFD166 at 20% opacity (area fill)
Line color:  #FFD166 (stroke)
No stroke:   fill only — cleaner look
Grid:        base-700 dashed, 1px — visible but not dominant
X-axis:      dates, 11px #6B71A0
Y-axis:      ₹ amounts, 11px #6B71A0, abbreviated (₹12k not ₹12,000)
showAnimation: true

Toggle control:  "Weekly / Monthly" — above chart, right-aligned
  Style: two ghost-like pills, active = amber text + base-800 bg
```

### `PageHeader` — Sticky Navigation Bar

```
Height:       64px
Position:     sticky top-0 z-50
Background:   rgba(13,15,26,0.8) (base-950/80) backdrop-blur(12px)
Border:       1px solid rgba(37,40,73,0.6) (base-700/60) bottom only

Left:         Page title — H2 #F0F2FF — dynamically set per route
Right:        [User Avatar 32px] [Name 14px #A8ADCC] [Sign Out ghost]
Mobile only:  [Upload Receipt ▲] amber button (replaces sidebar upload CTA)
```

## 5.4 Page Assemblies

Pages compose organisms. No business logic in pages — pages pass data to organisms.

```
DashboardPage
  SSR data → client props:
    profile, transactions[0..7], latestInsight
  Organisms:
    PageHeader
    IntelligenceMeter (variant="dashboard")
    KPICard × 4 (or KPICardSkeleton if loading)
    HealthScoreCard (gate: level 4) or HealthScoreLocked
    SpendingDonut + WeeklyTrendChart (gate: level 3)
    TransactionFeed

ReceiptsPage
  SSR data → client props:
    receipts (paginated), total, page
  Organisms:
    PageHeader
    FilterBar
    ReceiptTable (desktop) or ReceiptCardList (mobile)
    PaginationControls

ReceiptDetailPage
  SSR data (no hydration needed):
    receipt, transaction, signedUrl
  Organisms:
    BreadcrumbNav
    ReceiptImagePanel
    ReceiptDataPanel

InsightsPage
  SSR data → client props:
    transactions (30d), latestInsight
  Gate: redirect if level < 3
  Organisms:
    PageHeader + DateRangePicker + RefreshButton
    SpendingDonut + WeeklyTrendChart
    TopMerchantList + AIInsightsPanel (gate: level 4)
    CategoryBarChart

SettingsPage
  SSR data:
    profile
  Organisms:
    ProfileCard
    PlanCard
    DataExportCard
    DangerZoneCard
    SignOutFooter
```

---

# §6 — MOTION SYSTEM

## 6.1 Motion Philosophy

**Motion communicates system state. It is never cosmetic.**

Every animation answers: "What just changed about what FinSight knows?" Idle animations exist only on the Intelligence Meter (it represents a live, breathing system). All other motion is reactive.

**The three motion categories and their rules:**

```
CATEGORY 1 — INFORMATION MOTION
  Triggered by: data arriving, levels unlocking, processing completing
  Feel:         spring physics — feels earned, organic
  Examples:     Level unlock stagger, HealthScoreCard arc, upload step checkmarks

CATEGORY 2 — NAVIGATION MOTION
  Triggered by: route changes, modal open/close, panel reveals
  Feel:         ease-out — content decelerates to rest
  Examples:     Page transition, modal entrance, sidebar collapse

CATEGORY 3 — MICRO MOTION
  Triggered by: hover, focus, button press, row selection
  Feel:         instant to fast — response confirms input
  Examples:     Button hover translateY, row hover border appear, focus ring
```

## 6.2 Complete Token Library

```typescript
// src/lib/motion-tokens.ts — import this in every animated component

export const duration = {
  instant:   0.10,  // micro: hover fills, focus rings
  fast:      0.15,  // UI response: button press
  default:   0.25,  // navigation: page element fade
  medium:    0.35,  // data arrival: card entrance
  slow:      0.50,  // content reveal: first render
  dramatic:  0.80,  // intelligence unlock
}

export const ease = {
  out:          [0.00, 0.00, 0.20, 1.00] as const,  // decelerate to rest
  in:           [0.40, 0.00, 1.00, 1.00] as const,  // accelerate on exit
  inOut:        [0.40, 0.00, 0.20, 1.00] as const,
  spring:       { type: 'spring', stiffness: 400, damping: 30 }  as const,
  springGentle: { type: 'spring', stiffness: 200, damping: 25 }  as const,
  springBounce: { type: 'spring', stiffness: 500, damping: 20 }  as const,
}

export const variants = {

  // Standard card/content entrance (most common)
  cardReveal: {
    hidden:  { opacity: 0, y: 12, scale: 0.98 },
    visible: {
      opacity: 1, y: 0, scale: 1,
      transition: { duration: duration.slow, ease: ease.out }
    },
  },

  // Intelligence level unlock (premium — spring, not ease)
  unlockReveal: {
    hidden:  { opacity: 0, scale: 0.92, y: 20 },
    visible: {
      opacity: 1, scale: 1, y: 0,
      transition: ease.spring
    },
  },

  // Upload processing step checkmark
  stepComplete: {
    hidden:  { scale: 0, opacity: 0 },
    visible: {
      scale: 1, opacity: 1,
      transition: ease.springBounce
    },
  },

  // Page entrance
  pageEnter: {
    hidden:  { opacity: 0, x: -8 },
    visible: {
      opacity: 1, x: 0,
      transition: { duration: duration.default, ease: ease.out }
    },
  },

  // Simple fade (tooltips, overlays, non-positioned content)
  fadeIn: {
    hidden:  { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: duration.default }
    },
  },

  // Chart bar growth (used in CategoryBarChart)
  barGrow: {
    hidden:  { scaleX: 0, originX: 0 },
    visible: {
      scaleX: 1,
      transition: ease.springGentle
    },
  },

  // Modal entrance
  modalEnter: {
    hidden:  { opacity: 0, scale: 0.96, y: 8 },
    visible: {
      opacity: 1, scale: 1, y: 0,
      transition: ease.spring
    },
  },

  // Modal exit
  modalExit: {
    visible: { opacity: 1, scale: 1, y: 0 },
    hidden:  {
      opacity: 0, scale: 0.96,
      transition: { duration: duration.fast, ease: ease.in }
    },
  },

}

// Stagger containers — wrap lists with these
export const stagger = {
  cards: {
    visible: {
      transition: { staggerChildren: 0.07, delayChildren: 0.10 }
    }
  },
  rows: {
    visible: {
      transition: { staggerChildren: 0.04, delayChildren: 0.08 }
    }
  },
  steps: {
    visible: {
      transition: { staggerChildren: 0.00, delayChildren: 0.00 }
      // Steps are NOT staggered — they are driven by setTimeout in useUpload
    }
  },
}
```

## 6.3 CSS-Only Animations (No JavaScript)

These run in `globals.css`. They are performance-critical — never replace with JS.

```css
/* Skeleton shimmer — SkeletonBlock component */
@keyframes skeleton-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
.skeleton-block {
  background: linear-gradient(
    90deg,
    #252849 25%,
    #343766 50%,
    #252849 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: inherit;
}

/* Intelligence Meter Level 4 shimmer */
@keyframes amber-shimmer {
  0%   { background-position: -100% 0; }
  100% { background-position:  200% 0; }
}
.meter-fill-level4 {
  background: linear-gradient(
    90deg,
    #E6B83A 0%,
    #FFD166 35%,
    #FFF0CC 50%,
    #FFD166 65%,
    #E6B83A 100%
  );
  background-size: 200% 100%;
  animation: amber-shimmer 2.2s ease-in-out infinite;
}

/* Intelligence Meter Level 1 glow pulse */
@keyframes meter-pulse {
  0%, 100% { box-shadow: 0 0 8px  rgba(255,209,102,0.3); }
  50%       { box-shadow: 0 0 16px rgba(255,209,102,0.6); }
}
.meter-fill-level1 {
  animation: meter-pulse 2s ease-in-out infinite;
}

/* Upload processing orbital ring */
@keyframes orbital-spin {
  from { transform: rotate(0deg);   }
  to   { transform: rotate(360deg); }
}
.orbital-ring {
  animation: orbital-spin 3s linear infinite;
}
```

## 6.4 Critical Sequence: Intelligence Level Unlock

This is the most important animation sequence in the product. It happens at most 3 times per user lifetime (crossing 3, 6, and 10 receipt thresholds).

```
DETECTION:
  After upload completes:
    previousLevel = getIntelligenceLevel(profile.total_receipts_uploaded)
    Refetch profile → newCount = profile.total_receipts_uploaded + 1
    newLevel = getIntelligenceLevel(newCount)
    if (newLevel > previousLevel) → trigger unlock sequence

TIMELINE:
  T+  0ms  IntelligenceMeter fill animates to new percentage
             Framer Motion spring stiffness:200 damping:25
  T+  0ms  Gold flash at fill tip:
             pseudo-element opacity(0 → 0.6 → 0) over 400ms
  T+200ms  New components enter DOM, initially at hidden variant state
  T+400ms  First new component: unlockReveal (spring stiffness:400 damping:30)
  T+470ms  Second new component (+70ms stagger)
  T+540ms  Third new component (+70ms stagger)
  T+610ms  Fourth if present (+70ms stagger)
  T+800ms  Sequence settled
  T+900ms  If this was Level 4 unlock:
             Magic UI Confetti fires once
             colors: ['#FFD166', '#E6B83A', '#F7E7CE', '#FFF0CC']
             count: 60
             spread: 70
             No loop — fires exactly once
```

---

# §7 — v0.dev GENERATION STRATEGY

## 7.1 Credit Optimization Architecture

Never prompt v0.dev for full pages. Always prompt for the smallest coherent unit. Full pages are assembled from generated components — not generated as monoliths.

```
TIER 1 — Generate these first (unblock everything)
  Priority 1: IntelligenceMeter      (identity piece — used on every screen)
  Priority 2: KPICard                (used 4× on dashboard, referenced by skeleton)
  Priority 3: GlassCard primitive    (base for all surfaces)
  Priority 4: TransactionRow         (used on dashboard + receipts + receipt detail)
  Priority 5: CategoryBadge          (used in transaction rows, filters, detail)

TIER 2 — Generate after Tier 1 complete
  Priority 6: UploadModal IDLE state
  Priority 7: UploadModal PROCESSING state (Deep Forest palette)
  Priority 8: UploadModal RESULTS state
  Priority 9: HealthScoreCard
  Priority 10: FilterBar

TIER 3 — Assemble from Tier 1 + 2 (low v0 credit needed)
  Priority 11: Dashboard Level 2 layout
  Priority 12: Dashboard Level 4 layout
  Priority 13: Receipts page
  Priority 14: Receipt Detail page
  Priority 15: Auth page
  Priority 16: Settings page

NEVER GENERATE VIA v0:
  × Charts (use Tremor directly — v0 will invent fake chart code)
  × Data tables with real pagination (too stateful — build manually)
  × Auth flow logic (security concern — use Supabase hooks directly)
  × Full page assemblies on first attempt (too many opinions)
```

## 7.2 Prompt Engineering Rules

Apply these to every v0 prompt:

```
RULE 1 — Start with constraints, not descriptions
  BAD:   "Design a card that shows financial metrics"
  GOOD:  "Dark theme card. Background: rgba(28,32,64,0.7) backdrop-blur(12px).
          Border: 1px solid rgba(74,78,133,0.4). Border-radius: 16px. Padding: 24px."

RULE 2 — Specify exact hex codes, never color names
  BAD:   "amber accent color"
  GOOD:  "#FFD166"

RULE 3 — Include TypeScript interface for every component
  Always end the prompt with:
  "PROPS INTERFACE: interface ComponentName { ... }"

RULE 4 — Name anti-patterns explicitly
  Always include:
  "DO NOT use: purple gradients, Roboto, centered boxed layout,
   generic card styles, any shadcn default styling"

RULE 5 — Specify interaction states
  Every prompt must include hover, active, focus, and disabled states

RULE 6 — State which libraries are available
  Always include:
  "Available: React, TypeScript, Tailwind CSS, Framer Motion, Lucide React"
  "NOT available: any CSS framework other than Tailwind"
```

## 7.3 Prompt Scripts

---

### PROMPT-01 — IntelligenceMeter

```
A React component called IntelligenceMeter for a dark fintech app.

CONTAINER:
  Two variants. "sidebar": 8px wide × 140px tall, vertical.
  "dashboard": full-width × 6px tall, horizontal.
  Both have a track (background #252849) and a fill.

FILL:
  gradient: #E6B83A (left/bottom) → #FFD166 (right/top)
  Fill tip glow: box-shadow: 0 0 12px rgba(255,209,102,0.4)
  Framer Motion: animate={{ scaleX }} (dashboard) or {{ scaleY }} (sidebar)
  transition: spring stiffness:200 damping:25
  originX or originY: 0 (fills from edge, not center)

FILL PERCENTAGE from receiptCount prop:
  0 → 0%  |  1-2 → 15%  |  3-5 → 40%  |  6-9 → 70%  |  10+ → 100%

LEVEL 4 STATE (receiptCount >= 10):
  Add CSS class "meter-fill-level4" to fill element.
  This class has an amber shimmer keyframe animation (CSS only, not JS).
  The shimmer keyframe is:
    @keyframes amber-shimmer {
      0%   { background-position: -100% 0; }
      100% { background-position:  200% 0; }
    }
  Applied with background-size: 200% 100%, animation: amber-shimmer 2.2s ease-in-out infinite.

LEVEL 1 STATE (receiptCount <= 2):
  Add CSS class "meter-pulse" — subtle amber glow pulse, no shimmer.

LABELS below bar:
  Level label: 12px Inter uppercase tracking-widest, color #A8ADCC
    1="SYSTEM LEARNING" 2="PATTERNS FORMING" 3="ANALYSIS ACTIVE" 4="FULL INTELLIGENCE"
  Sub-label: 11px Inter #6B71A0
    1="Upload 3 receipts to unlock summaries"
    2="Upload 6 receipts to unlock charts"
    3="Upload 10 receipts to unlock Health Score"
    4="All intelligence capabilities active"

PROPS:
interface IntelligenceMeterProps {
  receiptCount: number
  variant: 'sidebar' | 'dashboard'
  className?: string
}

DO NOT: purple, Roboto, generic progress bar, tailwind bg-amber-400.
TECH: React, TypeScript, Tailwind (use arbitrary values like [#FFD166]), Framer Motion.
```

---

### PROMPT-02 — KPICard

```
A glass metric card for a dark-theme fintech dashboard. No generic styling.

GLASS SURFACE:
  background: rgba(28,32,64,0.7)
  backdrop-filter: blur(12px)
  border: 1px solid rgba(74,78,133,0.4)
  border-radius: 16px
  padding: 24px

HOVER STATE:
  border-color: rgba(184,137,26,0.4) — amber tint appears
  transition: border-color 200ms ease

LAYOUT (top → bottom):
  Row 1: [Lucide icon 20px, iconColor prop] ............ [label 12px uppercase #6B71A0]
  Row 2: [₹ amount, JetBrains Mono 36px #F0F2FF, tabular-nums]
          ₹ symbol at font-size: 0.85em relative to amount
  Row 3: [delta arrow + percentage + "vs last month", 13px]
          direction="up" → #4ECCA3 with "↑"
          direction="down" → #EF6D6D with "↓"

LOADING STATE (loading=true):
  Replace all three rows with shimmer blocks:
    Row 1: 80px × 12px skeleton
    Row 2: 120px × 28px skeleton
    Row 3: 100px × 12px skeleton
  Skeleton: background animated shimmer from #252849 to #343766 CSS keyframe

MOUNT ANIMATION (Framer Motion):
  hidden:  { opacity: 0, y: 12, scale: 0.98 }
  visible: { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.4, ease: [0,0,0.2,1] } }

PROPS:
interface KPICardProps {
  label: string
  value: string
  delta?: { value: number; direction: 'up' | 'down'; label: string }
  icon: LucideIcon
  iconColor?: string
  loading?: boolean
}

DO NOT: colored card backgrounds, gradient fills, boxShadow glow effects on hover.
TECH: React TypeScript Tailwind Framer-Motion Lucide-React.
```

---

### PROMPT-03 — UploadModal (IDLE + PROCESSING states)

```
Upload receipt modal for a dark fintech AI app. Two states in one component.

MODAL SHELL:
  Backdrop: rgba(13,15,26,0.8) backdrop-filter:blur(8px) fixed full-screen z-50
  Card:     background rgba(28,32,64,0.85) backdrop-filter blur(20px)
            border 1px solid rgba(255,209,102,0.2)  — amber tint
            border-radius 20px  padding 32px  width 560px (desktop) 100% (mobile)
  Enter:    Framer Motion: opacity(0→1) + scale(0.96→1) spring stiffness:400 damping:30

STATE="idle":
  Drop zone:  dashed 2px #343766 border-radius 12px padding 40px
  Drag-over:  dashed border → #FFD166 (150ms ease)
  Center:     Lucide Upload icon 48px color #6B71A0
  Text:       "Drop your receipt here" 20px Inter 600 #F0F2FF
              "or click to browse" 14px #A8ADCC below
  Footer:     "JPEG · PNG · PDF  ·  max 10MB" 11px #6B71A0
  Buttons:    [Cancel] ghost + [Browse Files →] amber primary side by side

STATE="processing":
  Modal interior overlaid with rgba(16,44,38,0.6) — Deep Forest tint
  Center:     200px circle — 2px dashed stroke, color #FFD166
              Only 25% of circumference visible (dashed-array trick)
              CSS animation: orbital-spin 3s linear infinite
              Inside circle center: Lucide FileText 28px color #F7E7CE (Champagne)
  Steps:      3 stacked rows below orbital (not inside circle)
  Step row:   [icon 16px] [label 14px] flex-1 spacer [spinner or checkmark]
  Pending:    icon #6B71A0, label #6B71A0, Lucide Loader2 spin CSS
  Active:     icon #FFD166, label #F0F2FF, Lucide Loader2 spin CSS
  Complete:   icon #4ECCA3, label #A8ADCC, Lucide CheckCircle2 #4ECCA3
              Checkmark entrance: scale(0→1) spring stiffness:500 damping:20
  Step labels: "Reading receipt image..." | "Identifying merchant..." | "Categorising..."
  processingStep prop (0,1,2,3) controls which step is active/complete

PROPS:
interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  state: 'idle' | 'processing' | 'results' | 'error' | 'limit_reached'
  processingStep: number
}

DO NOT: white backgrounds, light mode anything, circular spinners for idle.
TECH: React TypeScript Tailwind Framer-Motion Lucide-React.
```

---

### PROMPT-04 — TransactionRow

```
A single transaction row for a dark fintech app. Used in dashboard and receipts.

ROW:
  Width: full container
  Height: 64px (min)
  Display: flex, align-items center, gap 12px
  Default: transparent background
  Hover:   background rgba(37,40,73,0.5), left border 2px solid #FFD166 appears
  Transition: all 150ms ease
  Cursor: pointer

ELEMENTS left to right:
1. Receipt thumbnail:
   52×52px, border-radius 8px, object-fit cover
   Glass-subtle: background rgba(19,22,42,0.5) border rgba(52,55,102,0.3)
   On hover: transform rotate(1deg) scale(1.03) transition 150ms spring

2. Middle block (flex-1):
   Merchant: 15px Inter 500 #F0F2FF, truncate
   Date:     12px Inter #6B71A0, below merchant, 4px gap

3. CategoryBadge:
   background: categoryColor at 15% opacity
   text:       categoryColor at 100%
   border:     categoryColor at 30% opacity
   font:       11px uppercase Inter 500
   border-radius: 6px, padding: 2px 8px

4. Amount (right-aligned):
   JetBrains Mono 15px #F0F2FF font-variant-numeric:tabular-nums
   ₹ at font-size:0.85em

5. ConfidenceDot:
   8px circle, no border
   >0.8: #4ECCA3  |  0.5–0.8: #FFD166  |  <0.5: #EF6D6D
   Radix Tooltip on hover: "89% confidence" dark bg

6. AnomalyFlag (conditional):
   Lucide AlertTriangle 14px #F6B26B
   Only when showAnomalyFlag=true

CATEGORY COLOR MAP (use these exact hex values):
  "Food & Dining":          #FFD166
  "Groceries":              #4ECCA3
  "Transportation":         #7B9EE0
  "Shopping & Retail":      #F6B26B
  "Entertainment & Leisure":#C084FC
  "Health & Medical":       #EF6D6D
  "Travel & Accommodation": #60CDCD
  "Utilities & Bills":      #F6B26B
  "Software & Subscriptions":#7B9EE0
  "Business & Professional": #4ECCA3
  "Education":              #FFD166
  "Other":                  #9CA3AF

MOUNT ANIMATION:
  hidden: { opacity:0, y:8 }  visible: { opacity:1, y:0, transition:{duration:0.25} }

PROPS:
interface TransactionRowProps {
  merchant: string | null
  transaction_date: string
  category: string
  amount: number
  currency: string
  confidence: number | null
  showAnomalyFlag?: boolean
  thumbnailUrl?: string
  onClick?: () => void
}

TECH: React TypeScript Tailwind Framer-Motion Lucide-React.
```

---

### PROMPT-05 — HealthScoreCard

```
A Financial Health Score card for a dark fintech app. Hero component.

CONTAINER:
  Level 2 elevated glass:
    background: rgba(28,32,64,0.85) backdrop-filter:blur(20px)
    border: 1px solid rgba(255,209,102,0.2)
    border-radius: 16px  padding: 32px
  Full width of parent container

SVG ARC (rendered in JSX as inline SVG):
  viewBox: "0 0 200 200"
  Center: 100,100  Radius: 80
  Arc spans 220 degrees — starts at 160° and sweeps clockwise to 380°
  Track arc: stroke #252849 strokeWidth 12 strokeLinecap "round" fill "none"
  Fill arc:  stroke #FFD166 strokeWidth 12 strokeLinecap "round" fill "none"
  Fill strokeDasharray computed from score:
    circumference = 2 × Math.PI × 80
    arc_length = (220/360) × circumference
    filled = (score/100) × arc_length
    strokeDasharray: \`\${filled} \${circumference}\`
  Framer Motion on fill arc: animate={{ strokeDashoffset }}
    transition: spring stiffness:100 damping:20
    On mount: animate from 0 to filled value

CENTER LABELS (inside SVG via foreignObject or below arc):
  Score number:  JetBrains Mono 36px bold #F0F2FF
  Band label:    12px uppercase
    0-39 "AT RISK" #EF6D6D  |  40-59 "FAIR" #F6B26B
    60-79 "GOOD" #7B9EE0   |  80-100 "EXCELLENT" #4ECCA3

SUB-SCORES (4 columns below arc):
  Each column: label 11px uppercase #6B71A0 → 5-dot row → percentage
  Dot: 6px circle, filled=#FFD166, empty=#252849, gap 3px
  Dot count filled = Math.round((subscoreValue / 100) * 5)
  Percentage: 13px JetBrains Mono #A8ADCC

AI COMMENTARY:
  Separator: 1px #252849 full-width
  Text: 13px italic Inter #A8ADCC  max 2 lines  margin-top 16px

PROPS:
interface HealthScoreCardProps {
  score: number
  breakdown: {
    consistency: number
    diversification: number
    anomaly: number
    trend: number
  }
  commentary: string
}

DO NOT: use a library for the arc — render it as inline SVG in JSX.
TECH: React TypeScript Tailwind Framer-Motion.
```

---

### PROMPT-06 — Auth Page

```
Sign-in/sign-up page for a dark fintech SaaS. Split layout. Premium feel.

PAGE LAYOUT: flex row (desktop), flex col (mobile)

LEFT PANEL (45% desktop, hidden mobile):
  background: #13162A  height: 100vh  padding: 48px
  flex column, justify: space-between

  Top: Logo — "Fin" Inter 700 28px #F0F2FF + "Sight" #FFD166 side by side
  Middle:
    Tagline: "Your finances." line break "Finally intelligent."
      Inter 700  42px  #F0F2FF  letter-spacing: -0.03em  line-height: 1.1
    Gap: 32px
    Feature list (14px Inter #A8ADCC, gap 12px):
      [Lucide ScanLine 16px #FFD166]  Receipt scanning with Gemini Vision
      [Lucide Tags 16px #FFD166]      Smart expense categorisation
      [Lucide TrendingUp 16px #FFD166] Financial Health Score
    Gap: 40px
    Decorative IntelligenceMeter: horizontal, 200px wide, 70% filled, no labels
  Bottom:
    "© 2025 FinSight" 11px #3D4170

RIGHT PANEL (55% desktop, 100% mobile):
  background: #0D0F1A  height: 100vh
  flex column, align: center, justify: center  padding: 40px

  Glass form card:
    background rgba(28,32,64,0.7) backdrop-blur(12px)
    border 1px solid rgba(74,78,133,0.4)  border-radius 20px  padding 40px
    width 100%  max-width 480px

  Card contents:
    Heading: "Welcome back" (sign-in) / "Create account" (sign-up)
      Inter 24px 600 #F0F2FF

    Tab toggle: [Sign In]  [Create Account]
      Inactive: 14px #6B71A0  Active: 14px #FFD166 + 2px bottom border #FFD166
      transition: 150ms ease

    Form fields (show/hide based on active tab):
      Label: 12px uppercase #6B71A0 above each input, 8px gap
      Input:  bg #1C2040  border 1px solid #343766  text #F0F2FF
              border-radius 10px  padding 12px 16px  14px
              On focus: border-color #FFD166 transition 150ms
              Placeholder: #6B71A0

      Sign-in: Email + Password
      Sign-up: Full Name + Email + Password + Confirm Password

    Primary button:
      bg #FFD166  color #0D0F1A  font-weight 600  full-width
      border-radius 10px  padding 14px  14px
      hover: bg #FFE099 translateY(-1px)  transition 150ms

    Divider: "──── or ────" 12px #6B71A0

    Google button: secondary style  full-width
      border 1px solid #343766  bg transparent  text #F0F2FF
      [Lucide (use Chrome/Google equivalent)]  "Continue with Google"

    Footer: "By continuing you agree to our Terms and Privacy Policy"
      11px #6B71A0 text-center margin-top 16px

MOBILE: Left panel collapses to 72px horizontal strip: just the logo. Form full width.

TECH: React TypeScript Tailwind Lucide-React.
DO NOT: center-box the whole page, light backgrounds, purple anything.
```

---

# §8 — COMPONENT LIBRARY USAGE

## 8.1 shadcn/ui — Permitted Components

Use these structural primitives. Always override visual defaults with FinSight tokens.

| shadcn Component | FinSight Usage | Mandatory Style Override |
|---|---|---|
| `Dialog` | UploadModal container, ConfirmDialog | Dark glass, amber border, blur backdrop |
| `AlertDialog` | Delete Receipt, Delete Account confirm | danger-900 bg, danger-400 border |
| `Select` | CategoryFilter, DateRange, Currency pref | bg base-800, amber focus ring, dark text |
| `Tooltip` | ConfidenceDot, locked nav item, truncated merchant | bg #1C2040, text #F0F2FF, 200ms delay |
| `Progress` | ConfidenceBar, PlanUsageBar | amber fill, base-700 track |
| `Badge` | StatusChip | Custom: pending=#4A4E85, complete=#0F2E24+#4ECCA3, failed=#2E0F0F+#EF6D6D |
| `Separator` | Card section dividers | #252849, 1px solid |
| `Avatar` | User avatar in header | Ring: accent-600 |
| `Toast` | Upload success, errors | bg base-800 glass, amber/danger border |
| `Sheet` | Mobile upload (bottom sheet) | bg base-900, no rounded top |
| `Tabs` | Auth page sign-in/sign-up | Custom underline style, amber active |

**Do NOT use from shadcn:**
```
× Card        — use GlassCard organism instead
× Button      — use AmberButton/SecondaryButton atoms instead
× Table       — use TransactionRow organism instead
× Input       — style manually for full design control
× Label       — style manually
× Switch      — has light-mode bias, replace with custom
```

## 8.2 Magic UI — Permitted Components

Use selectively. Each has exactly one approved use.

| Magic UI Component | Approved Usage | Configuration |
|---|---|---|
| `AnimatedNumber` | KPI card value changes when new data arrives | JetBrains Mono, #F0F2FF |
| `NumberTicker` | HealthScoreCard center score counting up on mount | JetBrains Mono, 36px |
| `BlurFade` | Page section reveals on first load | blur from #0D0F1A (not white) |
| `Meteors` | Auth page left panel — subtle particle background | amber #FFD166 particles, 30% opacity, low count |
| `AnimatedGradientText` | "FULL INTELLIGENCE" Level 4 label only | amber → champagne gradient |
| `Confetti` | Level 4 unlock moment | colors: ['#FFD166','#E6B83A','#F7E7CE'], count 60, fires once |

**Do NOT use from Magic UI:**
```
× Any hero section component
× Any SaaS landing page pattern
× Anything with default purple/violet
× Bento grid components
× Animated beam or connection-line effects
× "Shine" button effects (use amber hover only)
```

## 8.3 Tremor — Chart Components

Use Tremor directly. Do NOT generate charts via v0.

| Tremor Component | Page | Key Props |
|---|---|---|
| `DonutChart` | Dashboard Zone E, Insights Zone B | `colors={chartColors}` `showAnimation={true}` |
| `AreaChart` | Dashboard Zone E, Insights Zone C | `colors={['amber']}` `showAnimation={true}` |
| `BarChart` | Insights Zone F | `layout="horizontal"` `colors={chartColors}` `showAnimation={true}` |
| `SparkAreaChart` | Optional V1.5 KPI sparklines | `colors={['amber']}` h=40px |

**Tremor theme tokens** (already defined in TECH_STACK.md §6 — do not redefine):
```js
// tremor.brand.DEFAULT = #FFD166
// tremor.background.DEFAULT = #13162A
// tremor.border.DEFAULT = #343766
// tremor.content.DEFAULT = #A8ADCC
```

**chartColors array** (pass to every Tremor chart):
```js
const chartColors = ['amber', 'emerald', 'blue', 'orange', 'purple', 'rose', 'cyan', 'slate']
```

---

# §9 — BACKEND INTEGRATION MAP

## 9.1 Data Fetch Architecture

All data fetching uses TanStack Query (React Query). No `useState` + `useEffect` for async data.

```typescript
// Query key convention:
['dashboard', 'summary']                    // dashboard summary
['receipts', page, category, range]         // receipts list
['receipts', id]                            // single receipt
['insights']                                // latest insight set
['user', 'profile']                         // user profile + receipt count
```

## 9.2 Component → API Map

| Component | Query | API Route | Stale Time |
|---|---|---|---|
| `IntelligenceMeter` | `useUser().profile` | Supabase direct | 0 (realtime after upload) |
| `KPICard × 4` | `useDashboardSummary` | `GET /api/dashboard/summary` | 60s |
| `KPICardSkeleton` | — | Shows while useDashboardSummary is loading | — |
| `HealthScoreCard` | `useLatestInsights` | `GET /api/insights` | 30min |
| `TransactionFeed` | `useReceipts({page:1})` | `GET /api/receipts` | 60s |
| `SpendingDonut` | `useDashboardSummary` | `GET /api/dashboard/summary` | 60s |
| `WeeklyTrendChart` | `useDashboardSummary` | `GET /api/dashboard/summary` | 60s |
| `FilterBar + ReceiptTable` | `useReceipts({page,cat,range})` | `GET /api/receipts` | 60s |
| `ReceiptDetail` | `useReceiptById(id)` | `GET /api/receipts/[id]` | 5min |
| `InsightsPage charts` | `useReceipts({range})` | `GET /api/receipts` | 60s |
| `InsightTextCard` | `useLatestInsights` | `GET /api/insights` | 30min |
| `ProfileCard` | `useUser().profile` | Supabase direct | 0 |
| `PlanCard` | `useUser().profile` | Supabase direct | 0 |

## 9.3 Mutation Map

| Trigger | Mutation | Invalidates |
|---|---|---|
| Upload modal RESULTS → Confirm | Built into upload flow | `['dashboard','summary']` `['receipts']` `['user','profile']` |
| Category correction (PATCH) | `PATCH /api/receipts/[id]` | `['receipts', id]` `['receipts']` `['dashboard','summary']` |
| Delete receipt | `DELETE /api/receipts/[id]` | `['receipts']` `['dashboard','summary']` |
| Refresh Insights | `POST /api/insights` | `['insights']` |
| Save profile | `supabase.from('profiles').update(...)` | `['user','profile']` |

## 9.4 Loading States Per Component

| Component | Loading Behavior |
|---|---|
| `KPICard` | Shows `KPICardSkeleton` — same dimensions, shimmer |
| `HealthScoreCard` | Shows `HealthScoreLocked` if loading (conservative — don't flash skeleton in a hero) |
| `TransactionFeed` | Shows 4 `TransactionRow` skeletons (shimmer with same row dimensions) |
| `SpendingDonut` | Shows `SkeletonBlock` circle 200px diameter |
| `WeeklyTrendChart` | Shows `SkeletonBlock` full width × 180px |
| `ReceiptTable` | Shows 8 row skeletons |
| Page header areas | Never skeleton — always render synchronously from SSR |

## 9.5 Error States

| Scenario | Error UI |
|---|---|
| `GET /api/dashboard/summary` fails | "Unable to load metrics" — small inline error in Zone C, amber retry link |
| `GET /api/receipts` fails | "Couldn't load receipts" — EmptyState variant with retry CTA |
| `POST /api/receipts/upload` → network error | Upload modal ERROR state — "Upload failed. Check your connection." |
| `POST /api/receipts/upload` → 422 (low quality) | Upload modal ERROR state — "Receipt unclear. Try a well-lit photo." |
| `POST /api/receipts/upload` → 402 (limit) | Upload modal UPGRADE_PROMPT state — NOT an error state |
| `POST /api/insights` fails | "Couldn't generate insights" toast — refresh button remains active |

## 9.6 React Query Global Config

```typescript
// src/lib/query-client.ts
export const queryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime:          60_000,        // 60 seconds
      gcTime:             5 * 60_000,    // 5 minutes
      retry:              1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error: Error) => {
        toast({
          title:       "Something went wrong",
          description: error.message,
          variant:     "destructive",
          // Override: bg #1C2040, border 1px solid #EF6D6D, text #F0F2FF
        })
      }
    }
  }
}
```

## 9.7 Profile Refresh After Upload

The Intelligence Meter and all level-gated components depend on `profile.total_receipts_uploaded`. After any upload success, the profile must be refreshed immediately.

```typescript
// In useUpload hook — after successful upload:
await queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
await queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
await queryClient.invalidateQueries({ queryKey: ['receipts'] })

// THEN check for level change (not before):
const newProfile = queryClient.getQueryData(['user', 'profile'])
const previousLevel = getIntelligenceLevel(previousReceiptCount)
const newLevel      = getIntelligenceLevel(newProfile.total_receipts_uploaded)
if (newLevel > previousLevel) {
  triggerLevelUnlockAnimation(previousLevel, newLevel)
}
```

---

# §10 — VALIDATION SYSTEM

## 10.1 Identity Validation (Run Before Any Stage Completion)

```
AMBER ANCHOR CHECK
  □ At least one element per page uses #FFD166 as primary fill
  □ Primary CTA is amber on every page
  □ Logo contains amber on the word "Sight"
  □ Active navigation item uses amber (#FFD166) left border + text color

DEPTH STACK CHECK
  □ Background is #0D0F1A (not #000000, not #111111, not #1a1a1a)
  □ Global gradient substrate is present and visible through glass cards
  □ At least one glass card is visible per page (glassmorphism must be apparent)
  □ Glass cards have visible blur effect (backdrop-filter applied)

ASYMMETRIC BREAK CHECK
  □ Dashboard: Intelligence Status Bar bleeds beyond KPI card column gutter
  □ Receipts: thumbnail has 1° tilt on hover
  □ Receipt Detail: image panel occupies 60%, creating unequal split
  □ Insights: donut chart overflows its grid column slightly (320px in 6-col)
  □ Auth: tagline uses aggressive -0.03em letter spacing at large size

LIVING ELEMENT CHECK
  □ Sidebar IntelligenceMeter is always rendered and CSS-animated (Level 1 pulse or Level 4 shimmer)
  □ Upload modal PROCESSING state has orbital ring spinning
  □ Skeleton blocks have shimmer animation
```

## 10.2 Anti-Slop Validation

```
FONT CHECK
  □ NO Arial, Helvetica, Roboto, San Francisco as primary
  □ Inter is loaded via next/font — no CDN link
  □ JetBrains Mono is loaded via next/font — no CDN link
  □ All monetary values use font-family: 'JetBrains Mono', not Inter
  □ ₹ symbol renders at 0.85em relative to adjacent amount

COLOR CHECK
  □ No purple or violet as accent color — #8B5CF6 and #6366F1 are banned as accents
  □ Cherry Red (#FF4747) appears ONLY in anomaly callouts on Insights page
  □ Neon Coral (#FF6044) appears ONLY in Settings Danger Zone
  □ Deep Forest (#102C26) appears ONLY inside Upload modal PROCESSING state
  □ Mist Gray (#ECEFF1) appears ONLY in confidence section of Receipt Detail
  □ Ivory (#FFF2E1) appears ONLY in filter bar on Receipts page

LAYOUT CHECK
  □ Dashboard is NOT a centered boxed layout
  □ Dashboard does NOT have 3 equal-weight columns
  □ Settings page is single column — NOT a tabbed interface
  □ Charts are Tremor — NOT recharts, NOT chart.js, NOT d3 custom
```

## 10.3 Motion Validation

```
ANIMATION CHECK
  □ Cards use cardReveal variant — NOT plain opacity fade
  □ Intelligence level unlock uses unlockReveal (spring) — NOT CSS transition
  □ Processing step checkmarks use springBounce — NOT ease-in-out
  □ Intelligence Meter fill uses Framer Motion spring — NOT CSS transition
  □ Page transitions are ≤ 250ms
  □ No animations on idle elements EXCEPT IntelligenceMeter and upload orbital ring
  □ Skeleton shimmer is CSS @keyframes — NOT JavaScript setInterval
  □ Level 4 amber shimmer is CSS @keyframes — NOT JavaScript
```

## 10.4 Data Binding Validation

```
INTELLIGENCE LEVEL CHECK
  □ All UI components call useIntelligenceLevel(profile) — NOT profile.intelligence_level directly
  □ Insights page server redirect checks profile.intelligence_level (server-side gating)
  □ Dashboard correctly renders EmptyState at Level 1 — NOT a broken/empty page
  □ HealthScoreCard is completely absent at Levels 1–3 — NOT hidden, NOT skeleton

LOADING STATE CHECK
  □ Every data-bearing component has an explicit loading state
  □ No component renders blank/null while loading — always skeleton
  □ No loading spinners (Loader2 spinning only in upload modal steps)

ERROR STATE CHECK
  □ 402 upload response triggers UPGRADE_PROMPT — NOT ERROR state
  □ Network errors show actionable messages — NOT "Something went wrong" alone
  □ Failed queries show retry affordance — NOT silent failure

QUERY INVALIDATION CHECK
  □ Upload success invalidates: ['user','profile'], ['dashboard','summary'], ['receipts']
  □ Delete success invalidates: ['receipts'], ['dashboard','summary']
  □ Profile save invalidates: ['user','profile']
```

## 10.5 Responsive Validation

```
BREAKPOINT CHECK
  □ Mobile (<768px): sidebar NOT visible — BottomNav renders instead
  □ Mobile: upload modal is bottom sheet — NOT centered modal
  □ Mobile: KPI cards stack full-width — NOT side by side
  □ Mobile: receipt table becomes card list — NOT overflowing table
  □ Tablet (768–1023): KPI cards are 2×2 grid — NOT 4-column row
  □ Desktop (1024+): sidebar visible, collapsible

TOUCH CHECK
  □ All interactive elements: minimum 44×44px touch target
  □ ConfidenceDot tooltip works on tap (not just hover) on mobile
  □ Row hover states have equivalent tap states on mobile
```



---

*End of FINSIGHT UI GENERATOR SPECIFICATION v2.0.0*
*This document supersedes FRONTEND_SYSTEM.md v1.0.0.*
*All UI generation work must reference this document.*
*No deviation without recorded architectural decision.*
