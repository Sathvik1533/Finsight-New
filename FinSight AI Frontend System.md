# FINSIGHT — FRONTEND SYSTEM DESIGN
## The Complete UI Generator Playbook
**Version:** 1.0.0
**Classification:** UI Generator Contract · Component Architecture · Backend Integration Map
**Consumes:** DESIGN_SYSTEM.md v1.0 · TECH_STACK.md v1.1 · PRD.md v1.0
**Intended Consumers:** v0.dev · shadcn/ui · Magic UI · Kiro · DevTools

---

## HOW TO USE THIS DOCUMENT

This document has five audiences. Read only your section.

| You are... | Your sections |
|---|---|
| **v0.dev operator** | §3 Page Blueprints → §6 v0 Prompt Scripts |
| **shadcn/ui integrator** | §7 Component Library Plan |
| **Magic UI animator** | §5 Motion System |
| **Kiro / backend integrator** | §8 Backend Integration Map |
| **DevTools validator** | §9 Quality Validation Gates |

Start at §1 if none of the above — it establishes the design identity that governs every decision downstream.

---

# §1 — DESIGN IDENTITY BRIEF

## The One Thing

FinSight is not a dashboard. It is an **intelligence system that reveals itself as it learns**. The UI must feel like it is actively building something — not displaying static data. Every visual metaphor should reinforce this: the meter fills, the cards unlock, the insights surface.

## Visual DNA

```
Foundation:    Deep indigo-slate (#0D0F1A) — not navy, not black, not charcoal
Accent:        Amber gold (#FFD166) — not green, not blue, not purple
Surface:       Glassmorphism panels — not flat cards, not solid fills
Typography:    Inter (UI) + JetBrains Mono (money) — dual-font identity
Motion:        Spring physics on reveals — not CSS ease, not linear
Identity mark: The Intelligence Meter — always visible, always animating to next level
```

## What FinSight Is NOT

```
NOT: A generic SaaS dashboard with purple gradients
NOT: A banking app with navy and white
NOT: A data table with a sidebar
NOT: A centered-boxed layout
NOT: A Notion-style clean minimal tool
```

## The Anti-Slop Manifesto for This Product

Every screen must have:
1. **One asymmetric element** — something that breaks the grid intentionally
2. **One depth layer** — glass on top of indigo on top of gradient substrate
3. **One amber moment** — the eye always has somewhere premium to land
4. **One living element** — something that moves or responds to data

---

# §2 — FULL UI ARCHITECTURE

## 2.1 Application Shell Model

```
ROOT LAYOUT
├── GlobalBackground          (fixed substrate — indigo gradient mesh)
├── AppShell
│   ├── Sidebar               (240px expanded / 64px collapsed / bottom nav mobile)
│   │   ├── LogoMark
│   │   ├── IntelligenceMeter (vertical, 140px tall, sidebar's identity piece)
│   │   ├── NavItems          (Dashboard · Receipts · Insights · Settings)
│   │   └── UploadCTA         (always amber, always bottom, always visible)
│   └── MainContent
│       ├── PageHeader        (64px, glassmorphic, sticky)
│       └── PageSlot          (renders per-route content)
└── ModalLayer                (Upload Modal, Confirmation dialogs)
```

## 2.2 Route Map and Rendering Strategy

| Route | Page Component | Rendering | Data Source |
|---|---|---|---|
| `/` | LandingPage | Static | None |
| `/auth` | AuthPage | Static | Supabase Auth |
| `/dashboard` | DashboardPage | SSR → Hydrate | `GET /api/dashboard/summary` |
| `/receipts` | ReceiptsPage | SSR → Hydrate | `GET /api/receipts` |
| `/receipts/[id]` | ReceiptDetailPage | SSR | `GET /api/receipts/[id]` |
| `/insights` | InsightsPage | SSR → Hydrate | `GET /api/insights` |
| `/settings` | SettingsPage | SSR | Supabase profile |

## 2.3 Global Background Substrate

The background is not flat. It is a fixed, non-scrolling atmospheric layer behind all content.

```
Composition:
- Base: #0D0F1A (full bleed)
- Layer 1: Radial gradient, top-left, rgba(255,209,102,0.04) — amber warmth at origin
- Layer 2: Radial gradient, bottom-right, rgba(123,158,224,0.06) — blue-info cool at terminal
- Layer 3: Noise texture overlay at 3% opacity — breaks the flat digital feel
- All layers: position: fixed, z-index: 0, pointer-events: none
```

This substrate is always visible through the glass cards. If this substrate is removed, the glassmorphism loses all meaning.

---

# §3 — PAGE BLUEPRINTS

Each blueprint specifies: layout grid, component zones, data bindings, motion triggers, and palette accent (from the controlled variation system).

---

## 3.1 DASHBOARD PAGE

**Palette accent:** Primary amber (#FFD166) — no secondary palette used on dashboard
**Layout:** Asymmetric 12-column grid. Sidebar occupies left. Content is NOT centered — it is left-weighted with a right rail.

### Layout Zones

```
┌─────────────────────────────────────────────────────────────────┐
│ ZONE A: PAGE HEADER (full width, sticky, 64px)                  │
│ "Good morning, Arjun" | Date | Upload Receipt [amber button]    │
├──────────────┬──────────────────────────────────────────────────┤
│              │ ZONE B: INTELLIGENCE STATUS BAR (full width, 56px)│
│              │ Horizontal IntelligenceMeter + Level label        │
│   SIDEBAR    ├────────────────────────────────────┬─────────────┤
│   240px      │ ZONE C: KPI STRIP (8 cols)         │ ZONE D:     │
│   collapsed  │ 4 metric cards in a row            │ HEALTH CARD │
│   64px       │ Level 2+: show data                │ 4 cols      │
│              │ Level 1: show teaser skeletons      │ Level 4+    │
│              ├────────────────────────────────────┤ only. Level │
│              │ ZONE E: CHART PAIR (8 cols)        │ 1-3: empty  │
│              │ SpendingDonut (left, 4 cols)        │ with locked │
│              │ WeeklyTrend   (right, 4 cols)       │ state       │
│              │ Level 3+ only                      │             │
│              ├────────────────────────────────────┴─────────────┤
│              │ ZONE F: TRANSACTION FEED (full width)            │
│              │ Most recent 8 transactions. Live feel.           │
└──────────────┴──────────────────────────────────────────────────┘
```

### Intelligence Level States (Dashboard)

**Level 1 (0–2 receipts):**
- Zone B: Meter at 0–15%, pulsing glow animation
- Zone C: All 4 KPI cards shown as shimmer skeletons with teaser labels ("Total Spend", "Top Category"...) — amber accent on skeleton edge
- Zone D: Locked state — padlock icon, "Upload 10 receipts to unlock your Health Score"
- Zone E: Hidden completely — replaced by EmptyState illustration
- Zone F: EmptyState — illustration + "Upload your first receipt"

**Level 2 (3–5 receipts):**
- Zone B: Meter at 40%, steady amber fill
- Zone C: All 4 KPI cards render with real data (unlockReveal animation, staggered)
- Zone D: Still locked, now shows progress (e.g., "7 more receipts")
- Zone E: Still hidden
- Zone F: Real transaction list renders

**Level 3 (6–9 receipts):**
- Zone B: Meter at 70%, brighter fill
- Zone C: Cards visible, now include Top Merchant
- Zone D: Still locked, shows "4 more receipts"
- Zone E: SpendingDonut + WeeklyTrend unlock (unlockReveal, spring physics)
- Zone F: Transaction list with anomaly flags enabled

**Level 4 (10+ receipts):**
- Zone B: Meter at 100%, full shimmer animation
- Zone C: All cards active
- Zone D: HealthScoreCard renders (hero unlock animation — most dramatic reveal in the app)
- Zone E: Full charts active
- Zone F: Anomaly flags, AI commentary inline

### Component Inventory (Dashboard)

| Component | Zone | Level Gate | Motion |
|---|---|---|---|
| `PageGreeting` | A | None | Fade in on load |
| `IntelligenceStatusBar` | B | None (always shown) | Spring fill on level change |
| `KPICard × 4` | C | Level 2 for data | cardReveal stagger 70ms |
| `KPICardSkeleton × 4` | C | Level 1 only | Shimmer loop |
| `HealthScoreCard` | D | Level 4 | unlockReveal spring |
| `HealthScoreLocked` | D | Level 1–3 | Static |
| `SpendingDonut` | E | Level 3 | chartBar spring |
| `WeeklyTrendChart` | E | Level 3 | Line draws left-to-right |
| `TransactionFeed` | F | Level 2 for data | List stagger 40ms |
| `EmptyState` | E+F | Level 1 | Fade in |

---

## 3.2 UPLOAD FLOW (MODAL — overlays any page)

**Palette accent:** Deep Forest & Champagne (#102C26, #F7E7CE) — used only inside the processing state to signal AI-mode
**Trigger:** "Upload Receipt" button in sidebar or header
**Container:** Centered modal (560px wide) on desktop, bottom sheet on mobile

### State Machine

```
IDLE ──[file dropped/selected]──► PREVIEW
PREVIEW ──[confirm]──────────────► PROCESSING
PREVIEW ──[cancel]───────────────► IDLE
PROCESSING ──[success]───────────► RESULTS
PROCESSING ──[failure]───────────► ERROR
PROCESSING ──[limit reached]─────► UPGRADE_PROMPT
RESULTS ──[confirm & save]───────► IDLE (+ dashboard refresh)
RESULTS ──[try again]────────────► IDLE
ERROR ──[retry]──────────────────► IDLE
UPGRADE_PROMPT ──[upgrade]───────► /settings#plan
UPGRADE_PROMPT ──[close]─────────► IDLE
```

### State Layouts

**IDLE state:**
```
┌──── UPLOAD MODAL ────────────────────────────────┐
│  FinSight · Upload Receipt                        │
│                                                   │
│  ┌── DROP ZONE (dashed amber border) ──────────┐  │
│  │                                             │  │
│  │        [Upload icon, 48px, muted]           │  │
│  │   Drop your receipt here                    │  │
│  │   or click to browse                        │  │
│  │                                             │  │
│  │   JPEG · PNG · PDF  ·  max 10MB             │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  [Cancel]                    [Browse Files →]     │
└───────────────────────────────────────────────────┘
```

**PROCESSING state (Deep Forest palette moment):**
```
┌──── PROCESSING ──────────────────────────────────┐
│                                                   │
│         [Amber orbital ring animation]            │
│              [Receipt icon center]                │
│                                                   │
│   ✓  Reading receipt image...                     │
│   ⟳  Identifying merchant and amount...          │
│   ○  Categorising transaction...                 │
│                                                   │
│   "FinSight AI is analysing your receipt"         │
│                                                   │
└───────────────────────────────────────────────────┘
```
- Background inside modal: rgba(16, 44, 38, 0.6) — Deep Forest tint
- Step checkmarks: champagne (#F7E7CE) when complete
- Orbital ring: amber (#FFD166), 3-second loop

**RESULTS state:**
```
┌──── RESULTS ──────────────────────────────────────┐
│  ┌── Receipt preview ──┐  ┌── Extracted data ───┐ │
│  │                     │  │  Merchant           │ │
│  │  [Receipt image     │  │  BATA INDIA LTD     │ │
│  │   or PDF icon]      │  │                     │ │
│  │                     │  │  Amount             │ │
│  │                     │  │  ₹ 2,499            │ │
│  │                     │  │                     │ │
│  │                     │  │  Date               │ │
│  │                     │  │  14 Jan 2025        │ │
│  │                     │  │                     │ │
│  │                     │  │  Category           │ │
│  │                     │  │  [Shopping & Retail]│ │
│  │                     │  │                     │ │
│  │                     │  │  Confidence         │ │
│  │                     │  │  ████████░ 89%      │ │
│  └─────────────────────┘  └─────────────────────┘ │
│                                                   │
│  [Try Again]                  [Confirm & Save →]  │
└───────────────────────────────────────────────────┘
```

**UPGRADE_PROMPT state:**
```
┌──── UPGRADE ─────────────────────────────────────┐
│                                                   │
│   [Lock icon, 32px, amber]                        │
│                                                   │
│   You've used all 20 free receipts this month     │
│                                                   │
│   Upgrade to Pro for unlimited uploads,           │
│   unlimited history, and advanced insights.       │
│                                                   │
│   ₹499/month · Cancel anytime                     │
│                                                   │
│   [Maybe Later]            [Upgrade to Pro →]     │
└───────────────────────────────────────────────────┘
```

---

## 3.3 RECEIPTS PAGE

**Palette accent:** Ivory & Donkey Brown (#FFF2E1, #A79277) — used on filter row to warm the data
**Layout:** Full-width with sticky filter bar + responsive table/card toggle

### Layout Zones

```
┌─────────────────────────────────────────────────────────────────┐
│ ZONE A: PAGE HEADER                                             │
│ "Your Receipts" | [count badge] | [Upload Receipt]              │
├─────────────────────────────────────────────────────────────────┤
│ ZONE B: FILTER BAR (sticky, glass, 56px)                        │
│ [Category ▼] [Date Range ▼] [Status ▼]      [Search receipts]  │
├─────────────────────────────────────────────────────────────────┤
│ ZONE C: RECEIPT TABLE (desktop) or CARD LIST (mobile)           │
│                                                                 │
│ Desktop table:                                                  │
│ Thumb | Merchant | Date | Category | Amount | Conf. | Status    │
│                                                                 │
│ Mobile cards:                                                   │
│ [Thumb] Merchant                    ₹ Amount                    │
│         14 Jan 2025  [Category]  ●confidence                    │
├─────────────────────────────────────────────────────────────────┤
│ ZONE D: PAGINATION                                              │
│ ← Previous    Page 1 of 4    Next →                            │
└─────────────────────────────────────────────────────────────────┘
```

### Asymmetric Design Element

The receipt thumbnail column is 52px wide and uses a rotated paper visual (subtle 1° tilt on hover, 150ms spring). This is the "one memorable thing" on this page — receipts feel physical.

### Component Inventory (Receipts)

| Component | Notes |
|---|---|
| `ReceiptTableRow` | Desktop — hover: left amber border appears |
| `ReceiptCard` | Mobile — full-width, glass-subtle |
| `FilterBar` | Sticky glass bar, 3 dropdowns + search |
| `CategoryFilterDropdown` | All 12 categories + "All" option |
| `DateRangeSelect` | "Last 30 days" / "Last 90 days" / "All time" |
| `ReceiptThumbnail` | 52×52px, rounded, tilt on hover |
| `EmptyFilterState` | "No receipts match your filters" + clear button |
| `PaginationControls` | Prev / Next / page indicator |

---

## 3.4 RECEIPT DETAIL PAGE

**Palette accent:** Mist Gray & Midnight Blue (#ECEFF1, #191970) — used in the confidence section for a cooler, analytical feel
**Layout:** Two-column asymmetric (60/40 split). Receipt image dominates left.

### Layout Zones

```
┌─────────────────────────────────────────────────────────────────┐
│ ZONE A: BREADCRUMB NAV                                          │
│ ← Your Receipts / BATA INDIA LTD                               │
├────────────────────────────────────┬────────────────────────────┤
│ ZONE B: RECEIPT IMAGE (60%)        │ ZONE C: DATA PANEL (40%)  │
│                                    │                            │
│ [Full-height image panel]          │ Merchant                   │
│ Glass border, amber glow on hover  │ BATA INDIA LTD             │
│                                    │ [h1, 30px]                │
│ PDF fallback: receipt icon + "PDF" │                            │
│ badge                              │ Amount                     │
│                                    │ ₹ 2,499                   │
│                                    │ [JetBrains Mono, 36px]    │
│                                    │                            │
│                                    │ Date  |  Category          │
│                                    │ 14 Jan   [Badge]           │
│                                    │                            │
│                                    │ ─────────────────          │
│                                    │ Confidence                 │
│                                    │ ████████░░ 89%             │
│                                    │                            │
│                                    │ AI Reasoning               │
│                                    │ "This receipt shows a      │
│                                    │  retail purchase at a      │
│                                    │  footwear store..."        │
│                                    │                            │
│                                    │ Line Items                 │
│                                    │ (table if available)       │
│                                    │                            │
│                                    │ ─────────────────          │
│                                    │ [Delete Receipt ×]         │
└────────────────────────────────────┴────────────────────────────┘
```

### Asymmetric Element

The receipt image panel has a faint amber inner-glow that pulses once on page load (300ms in, 600ms out). This signals the image is "live" data, not a static mockup.

---

## 3.5 INSIGHTS PAGE

**Palette accent:** Cherry Red & Butter Yellow (#FF4747, #F7E998) — used selectively for anomaly callouts only
**Minimum gate:** Level 3+ (6+ receipts). Below Level 3, redirect to `/dashboard?message=upload6`.
**Layout:** Masonry-adjacent. Not a simple stacked layout. Charts compete for visual weight.

### Layout Zones

```
┌─────────────────────────────────────────────────────────────────┐
│ ZONE A: PAGE HEADER                                             │
│ "Financial Insights" | [date range toggle] | [Refresh ↻]       │
├───────────────────────────────┬─────────────────────────────────┤
│ ZONE B: CATEGORY DONUT        │ ZONE C: SPENDING TREND          │
│ Large donut (320px) + legend  │ Area chart, weekly/monthly      │
│ (6 cols)                      │ toggle (6 cols)                 │
├────────────────────┬──────────┴─────────────────────────────────┤
│ ZONE D: TOP        │ ZONE E: AI INSIGHTS PANEL (Level 4+)       │
│ MERCHANTS          │                                            │
│ Ranked list        │  [Health Score arc]  Score: 78 GOOD        │
│ Position + name +  │                                            │
│ total + badge      │  "Your food spending has stabilized..."    │
│ (4 cols)           │  "Transport costs rose 18% this month..."  │
│                    │  "3 subscriptions detected: ₹1,240/mo"    │
│                    │  [Refresh Insights button]                 │
│                    │  Last updated: 2 hours ago                 │
│                    │ (8 cols)                                   │
├────────────────────┴────────────────────────────────────────────┤
│ ZONE F: CATEGORY BAR CHART (full width)                        │
│ Horizontal bars, sorted by total spend, all categories shown   │
└─────────────────────────────────────────────────────────────────┘
```

### Anomaly Callout (Cherry Red moment)

When a transaction is flagged as anomalous, it appears as an inline callout in the insights panel:
```
[⚠] Transport spend spike detected
    ₹4,200 on 12 Jan — 3× your average
    Cherry Red (#FF4747) background at 8% opacity
    Butter Yellow (#F7E998) icon
```

This is the only place Cherry Red appears in the entire app.

### Component Inventory (Insights)

| Component | Zone | Level Gate |
|---|---|---|
| `SpendingDonut` | B | Level 3 |
| `DonutLegend` | B | Level 3 |
| `WeeklyTrendChart` | C | Level 3 |
| `TrendToggle` | C | Level 3 |
| `TopMerchantList` | D | Level 3 |
| `MerchantRankRow` | D | Level 3 |
| `HealthScoreArc` | E | Level 4 |
| `InsightTextCard` | E | Level 4 |
| `AnomalyCallout` | E | Level 4 |
| `RefreshInsightsButton` | E | Level 4 |
| `CategoryBarChart` | F | Level 3 |
| `InsightsLockedState` | All zones | < Level 3 |

---

## 3.6 SETTINGS PAGE

**Palette accent:** Neon Coral & Space Black (#FF6044, #121313) — used only on the danger zone (Delete Account)
**Layout:** Single-column with section cards. Not a tabbed layout. Scrollable.

### Section Cards

```
CARD 1 — Profile
  Full name (editable input)
  Email (display, not editable)
  Currency preference (select: INR / USD / EUR)
  [Save Changes]

CARD 2 — Current Plan
  Free / Pro badge
  "X of 20 receipts used this month" (progress bar, amber fill)
  [Upgrade to Pro] if on Free tier

CARD 3 — Data Export
  "Export all your transaction data as CSV"
  [Export Data CSV]

CARD 4 — Danger Zone
  Neon Coral border (#FF6044 at 30%)
  Background: Space Black (#121313)
  "Delete Account" — red text
  "This is permanent and cannot be undone."
  [Delete My Account] — requires typing "DELETE" to confirm

FOOTER LINK — Sign Out (ghost button, muted text)
```

---

## 3.7 AUTH PAGE

**Palette accent:** None — pure brand identity. Amber on deep indigo only.
**Layout:** Split. Left panel is brand. Right panel is form. This is the exception to "no centered boxed layout" because auth is always an exception.

```
┌────────────────────────────┬────────────────────────────────────┐
│ LEFT PANEL (brand, 45%)    │ RIGHT PANEL (form, 55%)            │
│                            │                                    │
│ FinSight logo              │ [glass-card, 480px max-width]      │
│                            │                                    │
│ "Your finances.            │  Sign In  |  Create Account        │
│  Finally intelligent."     │  (tab toggle)                      │
│                            │                                    │
│ [Intelligence Meter        │  Email                             │
│  visual, decorative]       │  Password                          │
│                            │  [Sign In →] / [Create Account →] │
│ Three feature bullets:     │                                    │
│ · AI receipt scanning      │  ──── or ────                     │
│ · Smart categorisation     │  [G] Continue with Google          │
│ · Financial Health Score   │                                    │
│                            │  Fine print: terms + privacy       │
└────────────────────────────┴────────────────────────────────────┘
```

Mobile: Left panel collapses to top logo + tagline strip. Form takes full width.

---

# §4 — COMPONENT HIERARCHY

## 4.1 Atomic Components (Build These First — All Others Depend on Them)

These are the primitive components. Each must exist and be tested before any organism is built.

```
ATOMS
├── AmberBadge              — amber fill, dark text, rounded-badge
├── CategoryBadge           — color-mapped per TransactionCategory
├── ConfidenceDot           — 8px circle, green/amber/red, tooltip
├── StatusChip              — pending/processing/complete/failed chips
├── CurrencyAmount          — JetBrains Mono, tabular nums, ₹ at 85% size
├── DeltaIndicator          — ↑↓ arrow + % in success/danger color
├── GlassCard               — glass-card styling, accepts children
├── GlassCardElevated       — glass-card-elevated styling, amber border
├── SkeletonBlock           — shimmer rectangle, configurable dimensions
├── IconWrapper             — Lucide icon with size/stroke standardization
├── AmberButton             — primary button spec
├── SecondaryButton         — secondary button spec
├── GhostButton             — ghost button spec
├── DangerButton            — danger button spec
└── ProgressBar             — amber fill, dark track, configurable
```

## 4.2 Molecular Components (Compose Atoms)

```
MOLECULES
├── KPICard                 — GlassCard + IconWrapper + CurrencyAmount + DeltaIndicator
├── KPICardSkeleton         — GlassCard + 3× SkeletonBlock (teaser state)
├── TransactionRow          — IconWrapper + text + CategoryBadge + CurrencyAmount + ConfidenceDot
├── TransactionCard         — Mobile version of TransactionRow
├── ReceiptThumbnail        — 52px image + tilt hover + fallback icon
├── CategoryFilterDropdown  — shadcn Select + all 12 categories
├── DateRangeSelect         — shadcn Select + 3 preset ranges
├── MerchantRankRow         — rank number + merchant + total + count + CategoryBadge
├── InsightTextCard         — GlassCard + icon + insight string + meta text
├── AnomalyCallout          — Cherry Red bg + WarningTriangle + amount + context
├── ConfidenceBar           — ProgressBar + percentage label + Mist Gray palette
└── ProcessingStep          — icon + label + spinner/checkmark animation
```

## 4.3 Organism Components (Full UI Sections)

```
ORGANISMS
├── IntelligenceMeter       — THE identity component
│   ├── Props: receiptCount, variant (sidebar|dashboard)
│   ├── Sidebar variant: vertical bar 140×8px
│   ├── Dashboard variant: horizontal bar full-width × 6px
│   ├── Fill: amber gradient, spring animation
│   ├── Tip glow: box-shadow amber 40%
│   ├── Level 4 only: shimmer sweep keyframe
│   └── Label + sublabel below bar
│
├── HealthScoreCard         — Level 4 hero
│   ├── SVG arc 0–100, amber fill
│   ├── Score number center, JetBrains Mono
│   ├── Score band label (At Risk/Fair/Good/Excellent)
│   ├── 4× sub-score dot indicators
│   └── AI commentary italic text
│
├── UploadModal             — 6-state machine
│   ├── DropZone (idle state)
│   ├── ImagePreview (preview state)
│   ├── ProcessingView (processing state, Deep Forest palette)
│   ├── ResultsView (results state)
│   ├── UpgradPromptView (limit_reached state)
│   └── ErrorView (error state)
│
├── TransactionFeed         — Dashboard transaction list
│   ├── Section header + "View all →" link
│   ├── 8× TransactionRow (stagger animation)
│   └── EmptyState (Level 1)
│
├── SpendingDonut           — Tremor DonutChart wrapper
│   ├── Custom color mapping from chart palette
│   ├── Center label: total spend
│   └── Legend with amounts
│
├── WeeklyTrendChart        — Tremor AreaChart wrapper
│   ├── Amber fill, no stroke
│   ├── Subtle grid: base-700 dashed
│   └── Tooltip: week + total + top category
│
├── CategoryBarChart        — Tremor BarChart wrapper
│   ├── Horizontal layout
│   ├── Sorted by total DESC
│   └── Color-mapped per category
│
├── Sidebar                 — Full navigation panel
│   ├── LogoMark (full/monogram)
│   ├── IntelligenceMeter (sidebar variant)
│   ├── 4× NavItem
│   └── UploadCTA
│
└── PageHeader              — Sticky top bar
    ├── Page title (h1)
    ├── Upload Receipt button (amber, mobile)
    └── User avatar + sign out
```

## 4.4 Page Assemblies (Organisms → Pages)

```
PAGES
├── DashboardPage
│   ├── PageHeader
│   ├── IntelligenceMeter (dashboard variant)
│   ├── KPICard × 4 (or KPICardSkeleton × 4)
│   ├── HealthScoreCard (Level 4) or HealthScoreLocked
│   ├── SpendingDonut + WeeklyTrendChart (Level 3+)
│   └── TransactionFeed
│
├── ReceiptsPage
│   ├── PageHeader
│   ├── FilterBar
│   ├── ReceiptTableRow × N (desktop) or ReceiptCard × N (mobile)
│   └── PaginationControls
│
├── ReceiptDetailPage
│   ├── BreadcrumbNav
│   ├── ReceiptImagePanel (60%)
│   └── ReceiptDataPanel (40%)
│       ├── CurrencyAmount (hero)
│       ├── CategoryBadge (large)
│       ├── ConfidenceBar
│       ├── AiReasoningText
│       ├── LineItemsTable (if present)
│       └── DangerButton (delete)
│
├── InsightsPage
│   ├── PageHeader + RefreshInsightsButton
│   ├── SpendingDonut (Zone B)
│   ├── WeeklyTrendChart (Zone C)
│   ├── TopMerchantList (Zone D)
│   ├── HealthScoreArc + InsightTextCard × N (Zone E, Level 4)
│   └── CategoryBarChart (Zone F)
│
└── SettingsPage
    ├── ProfileCard
    ├── PlanCard
    ├── DataExportCard
    └── DangerZoneCard
```

---

# §5 — MOTION SYSTEM

## 5.1 Motion Philosophy

Motion in FinSight communicates intelligence status — not aesthetics. Every animation answers: "what just changed about what the system knows?"

**The three motion categories:**
```
1. INFORMATION MOTION   — data arriving, levels unlocking, processing completing
2. NAVIGATION MOTION    — page transitions, modal opens/closes
3. MICRO MOTION         — hover states, focus states, button presses
```

## 5.2 Animation Token Reference

```js
// Import from @/lib/utils/motion-tokens.ts

export const durations = {
  instant:   0.1,   // Micro: hover fill, focus ring
  fast:      0.15,  // UI response: button press
  default:   0.25,  // Standard: page element fade
  medium:    0.35,  // Data reveal: card entrance
  slow:      0.5,   // Content reveal: chart draw
  dramatic:  0.8,   // Intelligence unlock
}

export const easings = {
  out:         [0.0, 0.0, 0.2, 1.0],   // Standard deceleration
  in:          [0.4, 0.0, 1.0, 1.0],   // Acceleration on exit
  inOut:       [0.4, 0.0, 0.2, 1.0],   // Both
  spring:      { type: 'spring', stiffness: 400, damping: 30 },
  springGentle:{ type: 'spring', stiffness: 200, damping: 25 },
  springBounce:{ type: 'spring', stiffness: 500, damping: 20 },
}

export const variants = {
  cardReveal: {
    hidden:  { opacity: 0, y: 12, scale: 0.98 },
    visible: { opacity: 1, y: 0,  scale: 1,   transition: { duration: 0.4, ease: easings.out } },
  },
  unlockReveal: {
    hidden:  { opacity: 0, scale: 0.92, y: 20 },
    visible: { opacity: 1, scale: 1,    y: 0,  transition: easings.spring },
  },
  stepComplete: {
    hidden:  { scale: 0, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: easings.springBounce },
  },
  pageEnter: {
    hidden:  { opacity: 0, x: -8 },
    visible: { opacity: 1, x: 0,  transition: { duration: 0.25, ease: easings.out } },
  },
  fadeIn: {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
  },
  staggerContainer: {
    visible: {
      transition: { staggerChildren: 0.07, delayChildren: 0.1 }
    }
  }
}
```

## 5.3 Specific Animation Sequences

### Intelligence Level Unlock (most important sequence)

This fires when `useIntelligenceLevel(profile).level` increments.

```
Timeline:
  0ms    → IntelligenceMeter begins animating fill to new percentage
  0ms    → Gold flash: opacity(0→0.6→0) over 400ms at fill tip
  200ms  → New components begin rendering (initially hidden)
  300ms  → New components start unlockReveal animation (spring)
  300ms  → Stagger: each new card appears 70ms after previous
  800ms  → System complete — all new components visible
```

### Processing Pipeline Steps

```
Timeline (inside UploadModal PROCESSING state):
  0ms    → Step 1 label visible, spinner animation starts
  800ms  → Step 1 spinner → checkmark (stepComplete spring)
  800ms  → Step 2 label fades in (fadeIn 200ms)
  800ms  → Step 2 spinner starts
  1600ms → Step 2 spinner → checkmark
  1600ms → Step 3 label fades in
  1600ms → Step 3 spinner starts
  API resolves → Step 3 spinner → checkmark
  After all checks → modal transitions to RESULTS state (300ms)
```

Note: Steps 1–3 are simulated client-side timers that run in parallel with the actual API call. If the API resolves before step 3 completes, the remaining steps complete at normal speed before transitioning.

### Chart Draw Sequences

```
SpendingDonut:
  - Segments draw clockwise, 600ms, springGentle
  - Each segment has 50ms delay after previous
  - Center total fades in after segments complete (300ms delay)

WeeklyTrendChart:
  - Area fills from left to right using CSS clip-path animation
  - Duration: 700ms, ease-out
  - Tremor handles this internally — configure via 'showAnimation' prop

CategoryBarChart:
  - Bars grow from left (width 0 → full)
  - springGentle, stagger 50ms between bars
  - Tremor 'showAnimation' prop handles this
```

### Page Transition

```
Route change:
  - Outgoing: opacity(1→0), x(0→-8) over 150ms ease-in
  - Incoming: opacity(0→1), x(-8→0) over 250ms ease-out
  - Gap between out and in: 50ms
  - Use Next.js app router layout animation (AnimatePresence on page slot)
```

## 5.4 CSS-Only Animations (No JS Required)

These run via CSS keyframes for performance:

```css
/* Skeleton shimmer — applied to all SkeletonBlock components */
@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position:  200% 0; }
}
.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    var(--color-base-700) 25%,
    var(--color-base-600) 50%,
    var(--color-base-700) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

/* Intelligence Meter Level 4 shimmer */
@keyframes amber-shimmer {
  0%   { background-position: -100% 0; }
  100% { background-position:  200% 0; }
}
.intelligence-meter-level4 .meter-fill {
  background: linear-gradient(
    90deg,
    #E6B83A 0%,
    #FFD166 40%,
    #FFF0CC 50%,
    #FFD166 60%,
    #E6B83A 100%
  );
  background-size: 200% 100%;
  animation: amber-shimmer 2s ease-in-out infinite;
}

/* Processing orbital ring */
@keyframes orbital-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.orbital-ring {
  animation: orbital-spin 3s linear infinite;
}
```

---

# §6 — v0.dev PROMPT SCRIPTS

## How to Use These Prompts

Each prompt is designed for one v0.dev generation session. Rules:
- One prompt = one component or one page section
- Never prompt for "the whole dashboard" — always prompt for one zone
- Iterate: generate → inspect → patch prompt → regenerate
- Add context from previous successful generations to new prompts

## Credit Optimization Strategy

```
Priority order (generate these first — they unblock everything):
1. IntelligenceMeter component (identity piece — needed everywhere)
2. KPICard (needed in dashboard, used as skeleton reference)
3. GlassCard primitive (foundation for all other cards)
4. TransactionRow (used in Dashboard + Receipts)
5. UploadModal IDLE state (most complex UX)

Defer these (generate last — depend on above):
6. HealthScoreCard (needs GlassCard + arc SVG)
7. InsightTextCard (needs GlassCard)
8. Charts (use Tremor directly, not v0)
9. Full page assemblies (compose from already-generated components)
```

---

### PROMPT 01 — IntelligenceMeter Component

**Use for:** `src/components/dashboard/IntelligenceMeter.tsx`
**v0 credit cost:** Low (single component)

```
Design a React component called IntelligenceMeter for a fintech app called FinSight.

VISUAL SPEC:
- The component has two variants: "sidebar" (vertical) and "dashboard" (horizontal)
- Sidebar variant: 8px wide × 140px tall vertical bar
- Dashboard variant: full container width × 6px tall horizontal bar
- Track background: #252849
- Fill: amber gradient from #E6B83A to #FFD166, fills from bottom (sidebar) or left (dashboard)
- At the filled tip: box-shadow glow — 0 0 12px rgba(255,209,102,0.4)
- Fill percentage is computed from receiptCount prop using this logic:
  0 receipts = 0%, 1-2 = 15%, 3-5 = 40%, 6-9 = 70%, 10+ = 100%

LEVEL 4 SPECIAL STATE (receiptCount >= 10):
- Shimmer sweep animation on the fill — a lighter amber (#FFF0CC) sweeps left-to-right on a 2s loop
- This is CSS keyframe only, not JS

LABELS:
- Below the bar: current level label in 12px uppercase Inter, color #A8ADCC
- Below label: next target message in 11px Inter, color #6B71A0
- Level labels: 1="SYSTEM LEARNING", 2="PATTERNS FORMING", 3="ANALYSIS ACTIVE", 4="FULL INTELLIGENCE"

ANIMATION:
- Use Framer Motion to animate the fill percentage with spring physics when receiptCount changes
- stiffness: 200, damping: 25
- No other animations

PROPS:
interface IntelligenceMeterProps {
  receiptCount: number
  variant: 'sidebar' | 'dashboard'
}

TECH: React, TypeScript, Tailwind CSS, Framer Motion. No external libraries beyond these.
DARK THEME: All colors hardcoded to the dark palette above.
```

---

### PROMPT 02 — KPI Metric Card

**Use for:** `src/components/dashboard/KPICard.tsx`
**v0 credit cost:** Low

```
Design a React KPI metric card component for a dark-theme fintech SaaS called FinSight.

VISUAL SPEC:
- Background: rgba(28, 32, 64, 0.7) with backdrop-filter blur(12px)
- Border: 1px solid rgba(74, 78, 133, 0.4)
- Border radius: 16px
- Padding: 24px
- On hover: border-color transitions to rgba(184, 137, 26, 0.4) over 200ms

LAYOUT (top to bottom):
Row 1: [Icon 20px, icon color] .... [Label, 12px uppercase, #6B71A0, right aligned]
Row 2: [Large amount, 36px, JetBrains Mono, #F0F2FF, tabular-nums]
Row 3: [Delta indicator: ↑ or ↓ + percentage + "vs last month", 13px, success/danger color]

COLORS:
- Positive delta: #4ECCA3 with ↑
- Negative delta: #EF6D6D with ↓
- Currency symbol ₹ at 85% the size of the amount number

LOADING STATE:
- When loading=true, replace all content with 3 shimmer skeleton blocks
- Skeleton color: #252849, shimmer from #252849 to #343766 and back
- Block dimensions: 80px×12px (label), 120px×28px (amount), 100px×12px (delta)

ANIMATION:
- On mount: opacity 0→1, y 12→0, scale 0.98→1 over 400ms ease-out
- Framer Motion variants.cardReveal pattern

PROPS:
interface KPICardProps {
  label: string
  value: string
  delta?: { value: number; direction: 'up' | 'down'; label: string }
  icon: LucideIcon
  iconColor?: string
  loading?: boolean
}

TECH: React, TypeScript, Tailwind, Framer Motion, Lucide React.
```

---

### PROMPT 03 — Upload Modal (IDLE + PROCESSING states)

**Use for:** `src/components/upload/UploadModal.tsx` + `ProcessingState.tsx`
**v0 credit cost:** Medium (complex state machine)

```
Design a React upload modal component for a dark fintech app called FinSight.
This modal handles receipt image uploads with AI processing.

MODAL CONTAINER:
- Dark backdrop: rgba(13, 15, 26, 0.8) with backdrop-blur(8px)
- Modal card: rgba(28, 32, 64, 0.9) with backdrop-blur(20px)
- Border: 1px solid rgba(255, 209, 102, 0.2) — amber tint
- Border radius: 20px
- Width: 560px on desktop, full-width on mobile
- Padding: 32px

STATE 1 — IDLE (show this by default):
- Dashed border drop zone (2px dashed #343766, border-radius 12px)
- On drag-over: dashed border becomes #FFD166
- Center: Upload icon (Lucide Upload, 48px, #6B71A0)
- Heading: "Drop your receipt here" — 20px Inter 600 #F0F2FF
- Subtext: "or click to browse" — 14px #A8ADCC
- Bottom of drop zone: "JPEG · PNG · PDF  ·  max 10MB" — 11px #6B71A0
- Below drop zone: [Cancel] ghost button and [Browse Files →] primary amber button

STATE 2 — PROCESSING:
- Background shift: rgba(16, 44, 38, 0.6) — Deep Forest tint — overlays the card
- Center: document icon (32px) surrounded by an amber orbital ring (3s linear spin)
- The orbital ring is a 200px circle, 2px stroke, amber (#FFD166), dashed (only 25% of circumference is visible = a spinning arc)
- Below the orbital ring: 3 processing steps stacked
  Step layout: [icon 16px] [label text 14px] right-aligned: [spinner or checkmark]
  Step 1: "Reading receipt image..."
  Step 2: "Identifying merchant and amount..."
  Step 3: "Categorising transaction..."
- Incomplete step: spinner icon (Lucide Loader2 with spin animation)
- Complete step: checkmark icon (Lucide CheckCircle2, #4ECCA3) with spring scale animation (0→1)
- Active step text: #F0F2FF; pending step text: #6B71A0

PROPS:
interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  state: 'idle' | 'processing' | 'results' | 'error' | 'limit_reached'
  processingStep: number // 0-3, controls which step has checkmark
}

TECH: React, TypeScript, Tailwind, Framer Motion (for step animations), Lucide React.
```

---

### PROMPT 04 — Transaction Row

**Use for:** `src/components/dashboard/TransactionRow.tsx`
**v0 credit cost:** Low

```
Design a React transaction list row component for a dark fintech app called FinSight.

LAYOUT (single row, full width, 64px height):
[Receipt thumbnail 36×36px, border-radius 8px] 
[Merchant name 15px #F0F2FF bold] + [Date 12px #6B71A0 below merchant]
[Category badge — see below]
→ spacer →
[Amount ₹ XX,XXX JetBrains Mono 15px #F0F2FF]
[Confidence dot 8px circle]
[Anomaly warning icon — conditional]

CATEGORY BADGE:
- Background: category color at 15% opacity
- Text: category color at 100%
- Border: category color at 30% opacity
- Font: 11px uppercase Inter 500
- Border radius: 6px, padding: 2px 8px

CONFIDENCE DOT:
- 8px circle
- > 0.8: #4ECCA3
- 0.5–0.8: #FFD166
- < 0.5: #EF6D6D
- On hover: Radix Tooltip shows "89% confidence"

ANOMALY FLAG (conditional, showAnomalyFlag prop):
- Lucide AlertTriangle 14px in #F6B26B (warning)
- Only show if showAnomalyFlag is true

ROW STATES:
- Default: background transparent
- Hover: background rgba(37, 40, 73, 0.5), left border 2px solid #FFD166 appears
- Transition: 150ms ease
- Cursor: pointer

PROPS:
interface TransactionRowProps {
  transaction: {
    merchant: string | null
    transaction_date: string
    category: string
    amount: number
    currency: string
    confidence: number | null
  }
  showAnomalyFlag?: boolean
  onClick?: () => void
}

TECH: React, TypeScript, Tailwind, Lucide React.
```

---

### PROMPT 05 — Financial Health Score Card

**Use for:** `src/components/dashboard/HealthScoreCard.tsx`
**v0 credit cost:** Medium (SVG arc)

```
Design a React Financial Health Score card for a dark fintech SaaS called FinSight.
This card is the hero component — only shown when user has 10+ receipts.

CONTAINER:
- Background: rgba(28, 32, 64, 0.85) with backdrop-blur(20px)
- Border: 1px solid rgba(255, 209, 102, 0.2)
- Border radius: 16px, padding: 32px
- Full height of right panel (~380px)

SCORE ARC (top section):
- SVG arc, 160px × 160px viewBox
- Track arc: #252849, stroke-width 12px, stroke-linecap round
- Arc spans 220 degrees (from 160° to 380° clockwise, starting from bottom-left)
- Fill arc: amber #FFD166, same stroke settings
- Fill percentage = score/100 of the 220 degree arc
- On mount: fill arc animates from 0 to final value, 800ms springGentle
- Center of arc: score number in JetBrains Mono 36px bold #F0F2FF
- Below number: band label (AT RISK / FAIR / GOOD / EXCELLENT) 12px uppercase
- Band colors: AT RISK=#EF6D6D, FAIR=#F6B26B, GOOD=#7B9EE0, EXCELLENT=#4ECCA3

SUB-SCORES (below arc, 4 columns):
- Consistency | Diversification | Anomaly | Trend
- Each: label 11px #6B71A0 · 5-dot indicator · percentage 13px #A8ADCC
- Dot indicator: 5 dots, filled=#FFD166, empty=#252849, size 6px, gap 3px

AI COMMENTARY (bottom):
- 1px separator line (#252849)
- Italic text 13px #A8ADCC
- 2 lines max, truncate with ellipsis

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

TECH: React, TypeScript, Tailwind, Framer Motion for arc animation, SVG for arc rendering.
```

---

### PROMPT 06 — Dashboard Page (Level 2 State)

**Use for:** `src/app/(app)/dashboard/page.tsx` — Level 2 view
**v0 credit cost:** High (full page) — use ONLY after Prompts 01–05 are complete
**Pre-requisites:** IntelligenceMeter, KPICard, TransactionRow components already generated

```
Design a Level 2 dashboard page for a dark fintech SaaS called FinSight.
This is the state shown when the user has 3–5 receipts uploaded.

ASSUME these components exist and import them:
- IntelligenceMeter (props: receiptCount=4, variant="dashboard")
- KPICard (import from @/components/dashboard/KPICard)
- TransactionRow (import from @/components/dashboard/TransactionRow)

PAGE LAYOUT:
Background: #0D0F1A (full page, no card around entire content)
Content max-width: 1440px, padding: 0 32px

ZONE A — Intelligence Status Bar (full width, 56px):
- IntelligenceMeter variant="dashboard" receiving receiptCount=4
- Level label: "PATTERNS FORMING" — right of meter, 12px uppercase #A8ADCC
- "3 more receipts to unlock charts →" — 12px #6B71A0, right-aligned

ZONE B — KPI Strip (below status bar, 24px gap):
4 KPICards in a CSS grid (grid-cols-4, gap-6):
- Card 1: icon=DollarSign, label="TOTAL SPEND", value="₹28,420", delta=up 12.4%
- Card 2: icon=ShoppingBag, label="TOP CATEGORY", value="Shopping", no delta
- Card 3: icon=TrendingDown, label="AVG TRANSACTION", value="₹1,894", delta=down 3.1%
- Card 4: icon=Receipt, label="RECEIPTS", value="4", no delta (show this month as subtext)

ZONE C — Right panel teaser:
HealthScoreLocked card (4 columns): glass-card with padlock icon (Lucide Lock, 24px, #6B71A0)
Text: "Financial Health Score" 17px #A8ADCC
Subtext: "Upload 6 more receipts to unlock" 13px #6B71A0
Padlock: centered, top of card

ZONE D — Transaction Feed (full width):
Section header: "Recent Transactions" left, "View all receipts →" right (amber link)
6 TransactionRow components with sample data
No chart section exists in Level 2 — the charts area should be absent

TECH: React, TypeScript, Tailwind CSS (use exact hex colors, no arbitrary values unless necessary).
```

---

### PROMPT 07 — Auth Page

**Use for:** `src/app/(auth)/auth/page.tsx`
**v0 credit cost:** Medium

```
Design a sign-in/sign-up auth page for a dark fintech SaaS called FinSight.

LAYOUT: Two-column split on desktop (45% left, 55% right). Single column on mobile.

LEFT PANEL (brand panel, #13162A background):
- Top: FinSight logo — text logo, "Fin" in #F0F2FF 600 weight, "Sight" in #FFD166 600 weight, 28px
- Center (vertically): 
  - Tagline: "Your finances. Finally intelligent." — 30px Inter 700 #F0F2FF, max-width 280px
  - Spacing below: 32px
  - 3 feature bullets, each: [Lucide icon 16px #FFD166] [text 14px #A8ADCC]:
    · Receipt scanning with AI
    · Smart expense categorisation  
    · Financial Health Score
  - Spacing below: 48px
  - Decorative: a simplified IntelligenceMeter visual (just the bar, no labels, 180px wide horizontal, filled to 70%, amber gradient)

RIGHT PANEL (form panel, #0D0F1A background):
- Center content vertically and horizontally
- Glass card: rgba(28,32,64,0.7) backdrop-blur(12px) border rgba(74,78,133,0.4) radius 20px padding 40px
- Max width: 480px

FORM CONTENT:
- Heading: "Welcome back" (sign-in) / "Create your account" (sign-up)
- 18px Inter 600 #F0F2FF
- Below: tab toggle [Sign In] [Create Account] — inactive tab #6B71A0, active tab #FFD166 with bottom border
- Form fields: Email · Password (+ Confirm Password and Full Name on Create Account)
  - Input style: background #1C2040, border 1px solid #343766, text #F0F2FF, radius 10px, padding 12px 16px
  - On focus: border-color #FFD166 transition 150ms
  - Label: 12px uppercase #6B71A0 above each input
- Primary button: background #FFD166 text #0D0F1A full-width border-radius 10px padding 14px font-weight 600
  Text: "Sign In →" / "Create Account →"
- Divider: [──── or ────] #343766 horizontal rule with text centered
- Google button: secondary style, [Google icon] Continue with Google, full-width
- Footer: 11px #6B71A0 "By continuing, you agree to our Terms and Privacy Policy"

MOBILE: Left panel collapses to 80px strip showing only the logo. Form takes full width. No bullet points visible.

TECH: React, TypeScript, Tailwind, Lucide React.
```

---

# §7 — COMPONENT LIBRARY USAGE PLAN

## 7.1 shadcn/ui — What to Use

shadcn/ui provides structural primitives. Style them with FinSight tokens — never use shadcn defaults visually.

| shadcn Component | Used For | Styling Override |
|---|---|---|
| `Dialog` | UploadModal, ConfirmDialog | Dark glass background, amber border |
| `Select` | Category filter, Date range, Currency preference | Dark input style, amber focus ring |
| `Tooltip` | ConfidenceDot, icon tooltips | Dark bg (#1C2040), white text |
| `Progress` | ConfidenceBar, Plan usage bar | Amber fill, dark track (#252849) |
| `Badge` | StatusChip (pending/complete/failed) | Custom per-status color |
| `Separator` | Card section dividers | #252849, 1px |
| `Avatar` | User avatar in header | Ring: accent-600 |
| `Toast` | Success/error notifications | Dark glass, amber/danger accent |
| `AlertDialog` | Delete Receipt, Delete Account | Danger-900 background |
| `Sheet` | Mobile: Upload bottom sheet | Glass background |

**Do NOT use from shadcn:** Card (use GlassCard), Button (use custom buttons), Table (use custom TransactionRow).

## 7.2 Magic UI — What to Use

Magic UI provides pre-built animation components. Use selectively.

| Magic UI Component | Used For | Customization |
|---|---|---|
| `AnimatedNumber` | KPI card value changes (when new receipt adds to total) | Font: JetBrains Mono |
| `BlurFade` | Page section reveals | Blur from #0D0F1A, not white |
| `NumberTicker` | Health Score arc number counting up | Font: JetBrains Mono |
| `Meteors` | Auth page left panel — subtle particle effect | Amber (#FFD166) particles |
| `AnimatedGradientText` | "Full Intelligence" label at Level 4 | Amber gradient |
| `Confetti` | Level 4 unlock moment — one burst | Amber, gold, champagne colors |

**Do NOT use from Magic UI:** Anything with purple/violet gradients, any hero section components, any "SaaS landing page" patterns.

## 7.3 Tremor — Chart Components

Use Tremor directly. Do NOT generate charts via v0.

| Tremor Component | Page | Configuration |
|---|---|---|
| `DonutChart` | Dashboard Zone E, Insights Zone B | colors: chartColors array, legend below |
| `AreaChart` | Dashboard Zone E, Insights Zone C | color: amber, showAnimation: true |
| `BarChart` | Insights Zone F | layout: horizontal, colors: chartColors |
| `SparkAreaChart` | KPICard delta sparklines (optional V1.5) | 40px height, amber |

**Tremor chart color array** (use in this order):
```js
const chartColors = ['amber', 'emerald', 'blue', 'orange', 'purple', 'rose', 'cyan', 'slate']
```

---

# §8 — BACKEND INTEGRATION MAP

This section maps every UI component to its data source, loading state, error state, and mutation trigger.

## 8.1 Dashboard Page

| Component | Data Source | Hook | Loading State | Error State |
|---|---|---|---|---|
| `PageGreeting` | `useUser().profile.full_name` | `useUser` | "Good morning" (no name) | Same |
| `IntelligenceMeter` | `profile.total_receipts_uploaded` | `useUser` | Meter at 0 | Meter at 0 |
| `KPICard × 4` | `GET /api/dashboard/summary` | `useQuery(fetchDashboardSummary)` | `KPICardSkeleton` | Error badge |
| `HealthScoreCard` | `GET /api/insights` (latest) | `useQuery(fetchLatestInsights)` | Skeleton | Locked state |
| `TransactionFeed` | `GET /api/receipts?page=1` | `useQuery(fetchReceipts)` | Row skeletons | Empty state |

**Mutations on dashboard:**
- Upload completes → invalidate `['dashboard', 'summary']` and `['receipts']` queries
- Upload completes → refetch `useUser` profile (for receipt count + level)

## 8.2 Upload Modal

| Event | API Call | On Success | On Error |
|---|---|---|---|
| File dropped/selected | None (local) | Advance to PREVIEW | N/A |
| Confirm in PREVIEW | `POST /api/receipts/upload` | Advance to RESULTS | Advance to ERROR |
| 402 response | N/A | Advance to UPGRADE_PROMPT | N/A |
| Confirm & Save in RESULTS | None (already saved by API) | Close modal, invalidate queries | N/A |

**Query invalidation after upload success:**
```
queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
queryClient.invalidateQueries({ queryKey: ['receipts'] })
queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
```

## 8.3 Receipts Page

| Component | Data Source | Query Key | Params |
|---|---|---|---|
| `ReceiptTable` | `GET /api/receipts` | `['receipts', page, category, range]` | page, category, range |
| `FilterBar` | Local state only | N/A | Updates query params |
| `PaginationControls` | `total` from API response | N/A | Updates page param |

**On delete in ReceiptDetail:**
```
DELETE /api/receipts/[id]
→ invalidate ['receipts']
→ invalidate ['dashboard', 'summary']
→ router.push('/receipts')
```

## 8.4 Insights Page

| Component | Data Source | Query Key | Stale Time |
|---|---|---|---|
| All charts | `GET /api/receipts?range=30d` | `['receipts', 'insights-data', range]` | 60s |
| `InsightTextCard` | `GET /api/insights` | `['insights']` | 30 min |
| `HealthScoreCard` | `GET /api/insights` | `['insights']` | 30 min |
| Refresh button | `POST /api/insights` | Mutates then invalidates `['insights']` | N/A |

## 8.5 Settings Page

| Component | Data Source | Mutation |
|---|---|---|
| Profile form | `useUser().profile` | `PATCH /api/profiles` (V1.5 — for now use Supabase direct) |
| Plan section | `profile.subscription_tier` + `total_receipts_uploaded` | N/A (read only in V1) |
| CSV export | `GET /api/receipts` (all, no pagination) | Client-side Blob generation |
| Delete account | — | `supabase.auth.signOut()` + server action |

## 8.6 React Query Configuration

```typescript
// src/lib/query-client.ts

export const queryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,          // 60 seconds default
      gcTime:    5 * 60 * 1000,      // 5 minutes garbage collect
      retry: 1,                       // One retry on failure
      refetchOnWindowFocus: false,    // Don't spam API on tab switch
    },
    mutations: {
      onError: (error) => {
        // Show shadcn toast with error message
        toast({ title: "Something went wrong", description: error.message, variant: "destructive" })
      }
    }
  }
}
```

---

# §9 — QUALITY VALIDATION GATES

Before each stage is considered complete, validate against these gates.

## 9.1 Visual Validation Checklist

```
IDENTITY CHECK
□ Background is #0D0F1A (not black #000, not dark grey #1a1a1a)
□ Amber accent (#FFD166) is visible as the primary CTA on every page
□ JetBrains Mono is used for all monetary values
□ Glass cards are visible as distinct layers (not flat)
□ Intelligence Meter is visible in sidebar at all times

ANTI-SLOP CHECK
□ No purple gradients anywhere
□ No centered boxed layout on dashboard
□ No generic white-on-dark cards without glassmorphism
□ No system fonts (no Arial, no Roboto)
□ No sidebar-only nav on mobile (must be bottom nav)
□ No generic placeholder illustrations

TYPOGRAPHY CHECK
□ All amounts: JetBrains Mono, tabular-nums
□ ₹ symbol at 85% of amount font size
□ All labels: uppercase, letter-spacing 0.02em
□ Headings: Inter 700, negative letter-spacing
□ Chart labels: 11px Inter, #6B71A0

COLOR CHECK
□ Secondary palette used max once per page
□ Cherry Red (#FF4747) only in anomaly callouts
□ Neon Coral (#FF6044) only in Settings danger zone
□ Deep Forest (#102C26) only inside upload processing state
```

## 9.2 Motion Validation Checklist

```
MOTION CHECK
□ Intelligence level unlock triggers stagger of new cards (70ms between each)
□ Upload processing steps advance in sequence (not simultaneously)
□ Charts animate on first render (showAnimation: true on Tremor)
□ Page transitions are ≤ 250ms
□ No animations on idle elements (except Intelligence Meter Level 4 shimmer)
□ Skeleton shimmer is CSS-only (not JS interval)
```

## 9.3 Data Binding Validation

```
DATA CHECK
□ useIntelligenceLevel(profile) is used — not profile.intelligence_level directly
□ Empty states show when transaction/receipt arrays are empty (not broken UI)
□ Loading states show before data arrives (not blank page)
□ 402 response handled as upgrade prompt (not generic error)
□ Query invalidation fires after upload success
□ Dashboard summary returns 0s for new user (not 404)
```

## 9.4 Responsive Validation

```
RESPONSIVE CHECK
□ Sidebar: 240px desktop, 64px collapsed laptop, bottom nav mobile
□ KPI cards: 4-col desktop, 2×2 tablet, 1-col mobile
□ Upload modal: centered modal desktop, bottom sheet mobile
□ Receipt table: full table desktop, card list mobile
□ Charts: side-by-side desktop, stacked mobile
```

---

# §10 — CONTROLLED PALETTE USAGE MAP

Summary of where each secondary palette is permitted. Using a palette outside this map is a design violation.

| Palette | Hex Values | Permitted Usage | Quantity |
|---|---|---|---|
| **Primary (always)** | `#0D0F1A` `#FFD166` | Entire app — background and accent | Unlimited |
| **Deep Forest & Champagne** | `#102C26` `#F7E7CE` | Upload modal — PROCESSING state only | 1 instance |
| **Cherry Red & Butter Yellow** | `#FF4747` `#F7E998` | Anomaly callout cards in Insights | ≤ 3 per view |
| **Mist Gray & Midnight Blue** | `#ECEFF1` `#191970` | Confidence section in Receipt Detail | 1 instance |
| **Ivory & Donkey Brown** | `#FFF2E1` `#A79277` | Filter bar warm accent in Receipts | 1 instance |
| **Neon Coral & Space Black** | `#FF6044` `#121313` | Settings — Danger Zone card only | 1 instance |

**Rule:** If you find yourself reaching for a secondary palette outside this map, the answer is to use the primary palette instead. Secondary palettes are rationed, not decorative.

---
Decision Engine Layer

Inputs:
- categorized transactions
- business expense flags
- recurring patterns

Outputs:
- tax estimation
- subscription detection
- financial alerts

*End of FINSIGHT FRONTEND SYSTEM DESIGN v1.0*
*This document governs all UI generation decisions.*
*Deviations require explicit architectural approval.*
