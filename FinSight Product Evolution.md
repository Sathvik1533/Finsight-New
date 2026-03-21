# FINSIGHT — PRODUCT_EVOLUTION.md
## Continuous Product Evolution System

```
Version:        1.0.0
Classification: Internal — Product Strategy
Status:         Active — Living Document
Consumes:       PRD_v2.md · TECH_STACK.md v2.0 · AI_STACK.md v1.0 · PROMPT_STRATEGY.md v1.0
Governs:        All new feature ideas, prioritization, and integration strategy
Authors:        FinSight Product & Growth
Last Updated:   2024
```

---

## DOCUMENT AUTHORITY

This document is FinSight's living idea system. Every feature concept — regardless of
source — enters this document before it enters the PRD, design, or engineering backlog.
Ideas that skip this document do not get built. This is not bureaucracy. It is how
FinSight stays coherent as the team, user base, and market evolve.

Product evolution is a discipline, not a brainstorm.

---

## TABLE OF CONTENTS

1. [Introduction — Why Structure Beats Intuition](#1-introduction)
2. [Idea Log — 14 High-Signal Ideas](#2-idea-log)
3. [Idea Categories](#3-idea-categories)
4. [Integration Strategy](#4-integration-strategy)
5. [Prioritization Framework](#5-prioritization-framework)
6. [Product Evolution Pipeline](#6-product-evolution-pipeline)
7. [Evolution Rules](#7-evolution-rules)

---

## 1. Introduction

### 1.1 The Problem with Unstructured Feature Ideas

Every product that has failed to scale has left a trail of
features that were good ideas in isolation but incoherent
in aggregate. A fintech dashboard that added social sharing.
An expense tracker that added invoice generation. A budgeting
tool that added crypto tracking. Each decision made local
sense. Together, they diluted the product's identity until
users could not articulate what it was for.

FinSight has a precise identity: a Financial Decision Engine
that learns how you spend and surfaces what it means. Every
feature must serve that identity, or it does not belong here.

The risk is not that FinSight runs out of ideas. The risk is
that FinSight builds the wrong ideas — features that are
satisfying to ship but do not compound the core value. A
recurring-expense calendar is a useful feature. An AI
financial advisor that knows your merchant history is a
transformative one. The difference between a product that
reaches 10,000 users and one that reaches 100,000 users is
almost never the number of features. It is which features
were chosen and when.

### 1.2 What This Document Does

This document does three things:

**Captures ideas before they become decisions.** An idea
logged here is not a commitment. It is a candidate. The log
is not the backlog. Ideas sit here, get evaluated, get
validated with users, and graduate to the PRD only when the
evidence supports them.

**Applies a consistent evaluation lens.** Every idea is
assessed against the same criteria: does it deepen the
Decision Engine, retain users longer, unlock revenue, or
improve the core UX? If it does none of these clearly, it
does not move forward regardless of how elegant it is.

**Prevents architecture violations.** Ideas that require
breaking the deterministic-first pipeline, introducing a
new AI dependency without justification, or adding client-
side state where server-side state should live are flagged
here — not discovered mid-sprint.

### 1.3 The Core Evolution Constraint

Before any idea is evaluated, it must pass one test:

> **Does this make FinSight a better Financial Decision
> Engine, or does it make it a more feature-rich expense
> tracker?**

These are not the same thing. A better Financial Decision
Engine has more intelligence, better observations, clearer
recommendations, and deeper integration with the user's
actual financial behavior. A more feature-rich expense
tracker has more ways to enter data, more export formats,
more chart types, and more notification channels.

FinSight is building the former. Ideas that belong to the
latter category are logged, marked accordingly, and not
prioritized until the core intelligence system is saturating
its current market.

---

## 2. Idea Log

---

### IDEA-001 — Smart Receipt Batch Upload

```
Status:   Validated
Priority: High
Phase:    V2
Impact:   UX · Retention · Decision Engine (data volume)
Segment:  Freelancers · Solo Business Operators
```

#### Description

Users currently upload receipts one at a time. Freelancers
and solo business operators generate 40–80 receipts per
month and need a way to clear their backlog efficiently —
particularly in Q4 when tax preparation drives a surge of
historical uploads. Batch upload processes multiple receipt
images simultaneously through the OCR pipeline, with a
consolidated results view showing all extractions and their
confidence scores before final confirmation.

#### Features

- Drag-and-drop zone accepts up to 20 images simultaneously
- Each image queued and processed in parallel (up to 3
  concurrent NVIDIA NIM calls to respect rate limits)
- Consolidated results table: merchant, amount, date,
  category, confidence per receipt
- Inline correction within the table before batch confirm
- Progress indicator: "Processing 4 of 12..."
- Low-confidence results (< 0.75) highlighted in amber
  for user review before confirmation
- Batch failure handling: failed items flagged individually,
  successful items still saveable

#### Why It Matters

The single-upload flow creates a cognitive overhead tax
that is proportional to receipt volume. A freelancer with
20 receipts from last month faces 20 upload interactions.
The friction scales linearly. Batch upload breaks this
linearity and removes the primary behavioral barrier for
the segment that generates the most data — and therefore
the highest long-term value per user.

More data per user means better insights faster. The
Decision Engine's subscription detector, leakage signals,
and tax estimation all improve with transaction volume.
Batch upload is not a convenience feature — it is a data
acquisition accelerator.

#### Implementation Notes

- **FastAPI change required:** `/analyze/receipt` endpoint
  needs a batch variant `/analyze/receipts/batch` that
  accepts an array of base64 images and runs them via
  `asyncio.gather()` with a concurrency limit of 3
- **Queue awareness:** At Phase 4, batch jobs are enqueued
  as a batch group — the user sees "Batch processing:
  7 of 12 complete" via Supabase Realtime
- **Receipt count increment:** `increment_receipt_count`
  called once per confirmed item, not once per batch
- **No schema changes required:** Existing tables handle
  batch-created rows identically to single-receipt rows
- **Vercel timeout risk:** Batch confirmation submits
  individual receipt save requests in parallel from
  the client — does not attempt to save 20 receipts
  in a single Vercel API route call

---

### IDEA-002 — Tax Export Report (CA-Ready PDF)

```
Status:   Validated
Priority: High
Phase:    V2
Impact:   Revenue · Decision Engine · Retention
Segment:  Freelancers · Solo Business Operators
```

#### Description

Every March, freelancers and solo operators reconstruct
their expense records manually for their CA. FinSight
has this data structured and categorized already. A
CA-ready PDF export generates a formatted expense report
filtered to business-flagged transactions, organized by
category with totals, GST-eligible flags, and a summary
matching common CA reporting formats used in India. This
is the highest-ROI output FinSight can produce for the
freelancer segment — it converts a 4–6 hour annual task
into a one-click export.

#### Features

- Filter by: date range, business-only, category, custom
- Report sections: Executive Summary, Category Breakdown,
  Transaction Detail, GST-eligible subtotals
- Totals page: gross business spend, estimated deductible
  amount, estimated tax liability (30% bracket assumption,
  with explicit disclaimer)
- Merchant names shown as extracted (no AI normalization
  that could introduce errors on a legal document)
- Confidence score shown per transaction (CA can review
  low-confidence items)
- PDF format: A4, professional layout, FinSight branding
- CSV parallel export for CA tools that import spreadsheets
- Date range presets: FY (April–March), calendar year,
  custom range

#### Why It Matters

The freelancer segment's willingness to pay is directly
tied to quantifiable value. "FinSight saves me ₹8,000 in
tax deductions I would have missed" is a concrete ROI
calculation a user can make. This feature makes that
calculation visible. It is also a natural Pro plan gate —
CA-ready export is a professional tool for professional
users, not a free tier feature.

This feature also extends FinSight's identity from
"spending awareness" to "financial documentation" — a
meaningfully larger value category.

#### Implementation Notes

- **PDF generation:** Python `reportlab` or `weasyprint`
  in FastAPI — not client-side. Receipt data is sensitive;
  PDF generation should not expose it to browser APIs
- **New FastAPI endpoint:** `POST /reports/tax-export`
  with parameters `{ user_id, date_range, filters }`
- **New Next.js route:** `GET /api/reports/tax` streams
  the PDF binary back to the browser with proper headers
- **GST eligibility flag:** New boolean column
  `transactions.is_gst_eligible` — set by user (Phase 2
  manual correction flow), not AI-inferred
- **Pro gate:** Export available to Pro and Business tiers
  only — enforced server-side in the API route
- **Disclaimer mandate:** PDF footer must include:
  "This report is generated from receipt data uploaded
  to FinSight and is not a certified financial statement.
  Verify all figures with a qualified CA before filing."

---

### IDEA-003 — Subscription Audit Dashboard

```
Status:   Validated
Priority: High
Phase:    V2 (detection) → V3 (dashboard)
Impact:   Retention · Decision Engine · Revenue
Segment:  Salaried Professionals
```

#### Description

The subscription detector (Phase 3) identifies recurring
charges algorithmically. The Subscription Audit Dashboard
surfaces these as a first-class management interface rather
than a buried insight. It shows every detected subscription,
its monthly cost, its last charge date, the total amount
paid year-to-date, and a calculated "conscious vs. forgotten"
classification based on charge recency and user engagement
signals. The goal is to make the user feel the cost of
their subscriptions in a way that a bank statement never
does — ₹18,400/year across 7 subscriptions is a number
that motivates action.

#### Features

- Dedicated `/subscriptions` page with its own nav entry
- Cards per subscription: merchant, logo, monthly amount,
  frequency, YTD total, last charge date, status indicator
- Status indicators: Active, Possibly Forgotten (no
  receipts uploaded from this merchant in 45+ days),
  Cancelled (no recent charges)
- Sort options: highest monthly cost, most recently charged,
  alphabetical
- Subscription total summary: "₹18,400/year across 7
  subscriptions"
- "Mark as reviewed" action — user acknowledges they
  consciously keep this subscription
- Export: subscription list as CSV

#### Why It Matters

"Possibly Forgotten" subscriptions are the highest-value
insight FinSight can surface for salaried professionals.
The PRD identifies ₹8,000–₹15,000/month in unaccounted
spend as typical for this segment. Subscription leakage
is a primary driver of that gap. Making subscriptions
feel viscerally expensive (YTD total, not monthly) is a
behavioral design choice that increases the likelihood of
action — and deepens trust in FinSight's Decision Engine.

#### Implementation Notes

- **Page addition:** New `/subscriptions` route; navigation
  entry added to sidebar (visible at Level 3+)
- **Data source:** `transactions.is_subscription = true`
  (set by Phase 3 subscription detector SQL function)
- **"Possibly Forgotten" logic:** Last charge date >
  45 days from today AND `is_active = true` —
  computed in SQL, not AI
- **No new DB tables required:** Subscription metadata
  derived entirely from existing `transactions` table
  via a materialized view `mv_user_subscriptions`
- **Pro gate:** Basic list is free. "Mark as reviewed" and
  CSV export are Pro features

---

### IDEA-004 — Monthly Spending Digest Email

```
Status:   Proposed
Priority: High
Phase:    V2
Impact:   Retention · Decision Engine
Segment:  All users
```

#### Description

A monthly email delivered on the 1st of each month
summarizing the prior month's spending. Not a generic
newsletter — a personalized data report generated from
the user's actual transaction history. The email contains
the month's total spend, top category, one highlighted
anomaly (if any), and the Financial Health Score delta
(up or down from last month). A single CTA: "See your
full breakdown →" links directly to the Insights page.

#### Features

- Sent automatically on 1st of month to all active users
- Personalized: exact numbers from that user's data
- Subject line includes their actual data: "Your October:
  ₹24,300 across 31 transactions"
- Content: total spend, top category with amount,
  month-over-month delta, one standout insight,
  Health Score (if Level 4)
- Unsubscribe link (required) — preference stored in
  `profiles.email_digest_enabled`
- Plain text fallback for email clients that block HTML
- Sent only if user uploaded ≥ 3 receipts that month
  (no empty digests)

#### Why It Matters

The monthly digest is a re-engagement mechanism that
requires no user action to work. A user who uploaded 8
receipts and then went quiet receives a digest that shows
them real numbers from their own behavior. That is more
compelling than any push notification. Email digests
from similar products (Notion, Linear, Splitwise) are
consistently the highest-engagement communication
channel for data-centric tools.

The digest also extends FinSight's presence beyond the
app. Most users do not open a finance app daily. The
digest creates a monthly touchpoint that keeps FinSight
salient during the gaps.

#### Implementation Notes

- **Email provider:** Resend (developer-first, excellent
  React Email integration) — not SendGrid or Mailchimp
- **Template:** React Email component — server-rendered
  to HTML string, sent via Resend API
- **Trigger:** Supabase cron job (via `pg_cron`) fires
  on 1st of month at 9am IST for all users with
  `email_digest_enabled = true` AND `total_receipts_uploaded > 0`
- **Data generation:** Same computation as dashboard
  summary — reads from `mv_user_category_totals`
  materialized view (no new Gemini calls for digest)
- **FastAPI not required:** Digest data is deterministic
  SQL aggregation — Next.js API route handles it
- **New column:** `profiles.email_digest_enabled BOOLEAN
  DEFAULT TRUE` — opt-out, not opt-in

---

### IDEA-005 — Category Correction + Feedback Loop

```
Status:   Validated
Priority: High
Phase:    V2
Impact:   Decision Engine · UX · Retention
Segment:  All users
```

#### Description

When Groq's categorization is wrong, users currently have
no way to correct it in V1. Phase 2 adds inline category
correction on the receipt detail page. The correction is
stored as `is_manually_corrected = true` with the new
category. More importantly, every correction becomes
training signal — the corrected merchant→category mapping
is injected into future categorization prompts for that
user as context, improving accuracy progressively. This
closes the "system waking up" loop: the more the user
corrects, the less the user needs to correct.

#### Features

- Category dropdown on receipt detail page (all 12
  categories available)
- Correction saved immediately via `PATCH /api/receipts/[id]`
- Visual confirmation: category chip updates in-place
- Correction feeds into `merchant_history` context for
  future Groq calls involving the same or similar merchant
- Correction count visible in Settings: "You've improved
  FinSight's accuracy 12 times" — gamification signal
- Bulk correction on receipts list: select multiple
  → change category for all

#### Why It Matters

Every product that uses AI for classification faces the
same problem: the model is good but not perfect, and
users who experience miscategorization and cannot correct
it will churn. The correction flow is not just a UX
feature — it is a data quality mechanism. A user who
corrects "AWS → Business & Professional" once never
sees that error again. After 20 corrections, the user's
personal context is essentially a custom taxonomy for
their merchant universe.

This also creates a defensible moat: a competitor cannot
replicate 3 years of a user's correction history. The
longer a user uses FinSight, the more personalized and
accurate it becomes — and the higher the switching cost.

#### Implementation Notes

- **`PATCH /api/receipts/[id]`:** Already in the route
  map (Phase 2). Updates `transactions.category` and
  sets `is_manually_corrected = true`
- **Merchant history injection:** `get_merchant_history()`
  function in FastAPI queries `transactions` for the
  user's corrections, ranked by frequency. Passed to
  Groq prompt as `merchant_history` array (already
  defined in PROMPT_STRATEGY.md §3.3)
- **No new DB table:** Merchant history derived from
  `transactions` where `is_manually_corrected = true`
- **Accuracy metric:** Track `categorization_accuracy_rate`
  in `ai_audit_log` as (non-corrected / total) per user
  over time — shows improvement curve

---

### IDEA-006 — Receipt Search with Natural Language

```
Status:   Proposed
Priority: Medium
Phase:    V3
Impact:   UX · Retention
Segment:  All users (power users primarily)
```

#### Description

A search interface that accepts natural language queries
about past receipts and transactions. "Show me all Swiggy
orders over ₹500 last month" is converted to a structured
SQL query by Gemini, executed deterministically, and
returned as a filtered results list. The AI handles the
interpretation layer; the database handles the retrieval.
No embedding infrastructure required in Phase V3 — the
query is SQL, not vector similarity.

#### Features

- Search bar on Receipts page (replaces or extends the
  existing filter bar)
- Natural language input: "Zomato in October", "all
  business expenses over ₹2,000", "fuel receipts 2024"
- Gemini converts query to structured filters:
  `{ category, merchant, date_range, min_amount, max_amount }`
- Results returned as standard receipt list — no new
  UI component required
- Query history: last 5 searches saved locally (not
  server-side) for quick re-use
- Fallback: if Gemini cannot parse the query, show the
  standard filter UI with a "Try using filters instead" message

#### Why It Matters

Power users with 200+ receipts cannot efficiently navigate
a paginated list to find a specific transaction. The current
filter bar requires them to know the category, date range,
and merchant in advance. Natural language search matches
how users think about their transactions ("that restaurant
near the office last quarter") not how databases think
about them ("category=Food & Dining, date_range=Q3,
merchant ILIKE '%restaurant%'").

This feature requires no new infrastructure (no vector DB,
no embedding pipeline) — it is Gemini as a query parser
with deterministic SQL execution.

#### Implementation Notes

- **New FastAPI endpoint:** `POST /search/parse-query`
  accepts `{ query: string, user_id }`, returns
  `{ filters: { category, merchant, date_range,
  min_amount, max_amount } }`
- **Gemini prompt:** Strictly structured — Gemini returns
  JSON filter object only. Temperature: 0.0. This is a
  translation task, not a reasoning task.
- **SQL execution:** Filters applied server-side in
  Next.js BFF — same query structure as existing
  `GET /api/receipts?category=&range=` with additional
  params
- **No schema changes required**
- **Phase V3 gate:** Requires sufficient receipt volume
  per user to be useful (Level 3+, minimum 50
  transactions). Search visible at Level 3+.
- **NOT a Phase V2 feature:** Phase V2 needs the
  correction feedback loop and digest first. Search
  is for users who have enough data to search.

---

### IDEA-007 — Spending Forecast & Budget Risk Alert

```
Status:   Validated
Priority: High
Phase:    V3
Impact:   Decision Engine · Retention
Segment:  Salaried Professionals · Freelancers
```

#### Description

On any day in a given month with at least 10 days of data,
FinSight projects the month's final spend based on current
run rate. `projected = (current_spend / elapsed_days) ×
days_in_month`. Displayed as a range (±15% confidence
interval) with a visual indicator on the dashboard. When
any category is running 35%+ above its trailing 3-month
average with more than 10 days remaining in the month,
a Budget Risk Alert fires. No budgets need to be set — the
trailing average is the implicit baseline. This solves
the YNAB problem: FinSight does not ask users to predict
their spending before they understand it.

#### Features

- Projected monthly total on Dashboard: "You're on track
  for ₹34,000 this month (±15%)"
- Per-category risk indicators: cherry red dot on any
  category running significantly above baseline
- Budget Risk Alert: amber banner on Dashboard when
  one or more categories exceed threshold
- Alert dismissible for 48 hours (not permanent — the
  risk is real and should resurface)
- Month-over-month comparison: "Food spend is 40% higher
  than your Oct average of ₹6,200"
- Forecast visible at Level 3+ (requires trend data from
  multiple months)

#### Why It Matters

The gap between knowing you overspend and knowing you are
currently overspending is the difference between an annual
reflection and a mid-course correction. Spending forecasts
give users the second. For a salaried professional with
a predictable income and unpredictable spending, a mid-
month alert that food delivery is tracking ₹4,000 over
baseline is actionable in a way that a month-end report
never is.

This feature directly instantiates FinSight's positioning
as a Decision Engine, not a tracker. Trackers show what
happened. Decision Engines show what is happening and
where it leads.

#### Implementation Notes

- **Computation:** Entirely Python + SQL — no AI required
  for the projection math or threshold check
- **Gemini role:** Generates the one-line alert narrative
  only (e.g., "Food delivery is tracking 38% above your
  October average"). Numbers computed first in Python.
- **DB function:** `compute_monthly_forecast(user_id)`
  returns `{ projected_total, days_elapsed, days_remaining,
  category_alerts: [{ category, current, baseline,
  pct_over }] }`
- **UI change:** New `ForecastBanner` component on
  Dashboard Zone C. Conditionally rendered when forecast
  data available and ≥ 1 category alert active.
- **Intelligence gate:** Level 3+ (requires data from
  at least 2 prior months for baseline calculation)

---

### IDEA-008 — Merchant Intelligence Cards

```
Status:   Proposed
Priority: Medium
Phase:    V3
Impact:   UX · Decision Engine
Segment:  All users (especially salaried professionals)
```

#### Description

When a user clicks on a merchant name anywhere in FinSight,
a side panel (or modal on mobile) opens showing everything
FinSight knows about their relationship with that merchant.
Total spend, transaction count, average order value,
frequency pattern, first and last visit, anomalous orders
highlighted. This is not fetched from an external database —
it is computed purely from the user's own transaction history.
The Merchant Intelligence Card transforms a one-dimensional
data point (a transaction row) into a relationship summary.

#### Features

- Trigger: click/tap on any merchant name in transaction
  list, receipt detail, or insights
- Card content:
  - Total spend (all time + last 30 days)
  - Transaction count + average order value
  - Frequency: "You visit roughly every 8 days"
  - First transaction date + most recent date
  - Category (with correction option inline)
  - Anomalous orders highlighted with amount and date
  - Spending trend: sparkline of monthly spend at this
    merchant over the past 6 months
- "Mark as subscription" action if pattern qualifies

#### Why It Matters

Individual transactions are opaque. Patterns across
transactions from the same merchant are revealing. A user
who has spent ₹84,000 at Swiggy over 18 months has a
quantified relationship with that merchant that they have
never seen expressed. The Merchant Intelligence Card makes
invisible spending patterns visible at the merchant level,
complementing the category-level analysis on the Insights
page.

This also deepens retention: users who discover these
merchant-level insights are engaging with FinSight at a
depth that is very hard to replicate with a simpler product.

#### Implementation Notes

- **No new data model:** All merchant intelligence
  computed from existing `transactions` table via
  parameterized SQL query: `SELECT ... FROM transactions
  WHERE user_id = $1 AND merchant ILIKE $2`
- **New API route:** `GET /api/merchants/[merchant_slug]`
  returns aggregated merchant stats
- **Side panel component:** `MerchantIntelligencePanel`
  — slides in from the right on desktop, bottom sheet
  on mobile. Uses shadcn Sheet component.
- **Sparkline:** Tremor SparkAreaChart at 40px height —
  monthly totals for the merchant, last 6 months
- **Performance:** Merchant query must be indexed.
  Existing `idx_transactions_user_category` covers
  user_id; add `idx_transactions_user_merchant` for
  this feature.

---

### IDEA-009 — WhatsApp / Telegram Quick Upload

```
Status:   Proposed
Priority: Medium
Phase:    V3
Impact:   UX · Retention · Data Volume
Segment:  All users (India-first behavior)
```

#### Description

Users can send a receipt photo to a FinSight WhatsApp or
Telegram bot number and it is automatically processed
through the full pipeline — OCR, categorization, Decision
Engine update. No app required. The bot responds with the
extracted data and asks for a one-tap confirmation.
This is not a chatbot feature — it is a zero-friction
input channel that meets users where they already are.
In India, WhatsApp is the primary communication layer.
The user who photographs a receipt and immediately sends
it to FinSight via WhatsApp has zero upload friction.

#### Features

- WhatsApp Business API integration (or Telegram Bot
  API as lower-cost alternative)
- User sends image → bot responds: "Got it! ₹340 at
  McDonald's on 14 Nov. Is this right? Reply Y to save."
- User replies "Y" → transaction saved to their account
- Bot replies with current monthly total as confirmation:
  "Saved! Your Food & Dining total this month: ₹4,230"
- Account linking: one-time setup via a link in FinSight
  Settings → "Connect WhatsApp" → QR code or phone
  verification
- Supports: single image, multi-image (batch send)
- Unsupported formats return: "Please send a clear photo
  of a receipt"

#### Why It Matters

The primary drop-off in receipt-upload products is
friction at the moment of receipt creation. A user who
takes a photo after paying at a restaurant and then has
to: open FinSight → navigate to upload → select photo →
confirm — will eventually stop doing it. A user who
takes a photo and sends it to their WhatsApp will not.
In India, WhatsApp has 500M+ users and is the
instinctive communication channel for forwarding
images. This feature meets users where the behavior
already exists.

#### Implementation Notes

- **WhatsApp Business API:** Meta's Cloud API — requires
  business verification. Alternatively: Twilio WhatsApp
  sandbox for V3, official Meta integration for V4.
- **New webhook service:** Lightweight Express or FastAPI
  endpoint receives WhatsApp webhooks → validates sender
  → triggers receipt pipeline for linked user
- **Account linking table:** `user_whatsapp_links
  (user_id, phone_number, verified_at)` — new table
- **Session management:** Bot interactions are stateful
  per-conversation (pending confirmation stored in Redis
  with 10-minute TTL) — requires Redis for Phase 3
  anyway (queue)
- **Telegram as fallback:** Telegram Bot API is free,
  no business verification required, good for Phase 3
  validation before Meta API investment

---

### IDEA-010 — Financial Calendar View

```
Status:   Proposed
Priority: Low
Phase:    V3
Impact:   UX · Decision Engine
Segment:  Freelancers · Salaried Professionals
```

#### Description

A calendar view of transactions where each day shows
the total spend and a color intensity proportional to
spend relative to that user's daily average. High-spend
days are dark amber; low-spend days are pale. Subscription
charges appear as recurring events. This is not a new
data model — it is a temporal lens on existing transaction
data that reveals patterns invisible in a list view.
The visual grammar of a heatmap calendar (GitHub-style
contribution graph for spending) communicates behavioral
patterns in seconds.

#### Features

- Calendar heatmap: monthly view, one square per day,
  color intensity = daily spend relative to user's
  rolling average
- Click any day: side panel shows transactions for
  that day
- Subscription events: recurring charges shown as
  persistent markers on their expected billing dates
- Navigation: previous/next month
- Legend: shows what each color intensity represents
  (e.g., "2× your daily average")
- Weekend vs. weekday comparison: subtle visual
  differentiation (the PRD notes that weekend spend
  spikes are a key behavioral insight)

#### Why It Matters

List views make individual transactions easy to find.
Calendar views make spending patterns easy to see.
The question "why did I spend so much last month"
is answered by a heatmap in 3 seconds and by a
transaction list in 3 minutes. The calendar view adds
a behavioral intelligence layer to the data without
requiring any new data collection.

#### Implementation Notes

- **No new API routes:** Calendar data is derived from
  existing `GET /api/receipts?range=30d` with daily
  aggregation computed client-side
- **New route:** `/calendar` — or add as a tab on the
  Insights page
- **Heatmap component:** D3.js calendar heatmap — custom
  built to match FinSight's design system (amber
  intensity palette, not generic green)
- **Subscription event overlay:** Requires subscription
  data from Phase 3 subscription detector

---

### IDEA-011 — Income Awareness Layer (Freelancer Mode)

```
Status:   Proposed
Priority: High
Phase:    V3
Impact:   Decision Engine · Revenue · Retention
Segment:  Freelancers
```

#### Description

FinSight currently has zero visibility into income —
it can only see outflows. For salaried professionals,
this is acceptable: income is predictable and consistent.
For freelancers, it is a fundamental blind spot. A
freelancer who earned ₹80,000 in October and spent
₹35,000 has a very different financial picture than one
who earned ₹35,000 and spent the same. Income Awareness
is not bank integration — it is a lightweight income log
where users manually enter their monthly income (or mark
specific transactions as income events) so FinSight can
calculate effective savings rate and spending-as-percentage-
of-income metrics.

#### Features

- "Freelancer Mode" toggle in Settings (activates the
  income layer UI)
- Monthly income entry: simple number input at the
  start of each month ("What did you earn in November?")
- Optional: mark any transaction as an "income event"
  (invoice payment received) — these show as green in
  the calendar view
- New KPI card: "Spending Rate: 42% of income"
- Updated Health Score in Freelancer Mode: income-
  adjusted savings rate replaces Trend sub-score (the
  existing trend sub-score is less meaningful for
  irregular incomes)
- Tax estimation upgraded: "Based on ₹1,80,000 income
  this quarter, estimated tax: ₹54,000 — ₹12,400
  claimable from business expenses"

#### Why It Matters

Without income data, FinSight cannot tell a freelancer
whether their spending is sustainable. ₹50,000/month
in spend is fine on ₹2,00,000 income and catastrophic
on ₹40,000 income. The product's Decision Engine is
fundamentally limited for the freelancer segment without
this context. This feature does not require bank integration
— it requires users to enter one number per month. The
UX is designed around the minimum viable data requirement.

#### Implementation Notes

- **New table:** `income_events (id, user_id, amount,
  period_label, type: 'monthly_estimate' | 'transaction',
  created_at)`
- **No AI change:** Income data is passed to the
  Gemini narrative prompt as context when present.
  Tax estimation formula in Python updated to reference
  income when available.
- **PRD constraint:** FinSight does not give financial
  advice. Income Awareness surfaces observations only —
  "Your spending is 58% of your stated income" is
  an observation. "You need to cut spending" is advice.
  The distinction must be maintained.
- **Freelancer Mode gate:** Pro tier only — income
  tracking is a professional feature that justifies
  the upgrade

---

### IDEA-012 — Referral-Based Receipt Unlock Program

```
Status:   Proposed
Priority: Medium
Phase:    V2
Impact:   Growth · Revenue
Segment:  All users
```

#### Description

Free tier users are capped at 25 receipts. Rather than
a hard paywall, a referral program lets free users earn
additional receipt capacity: each successful referral
(defined as a referred user who uploads ≥ 3 receipts)
unlocks +10 receipt slots for the referrer, up to a
maximum of +50 (i.e., up to 75 receipts free). This is
not a discount on Pro — it is a structured expansion of
the free tier for users who actively grow the product.
The referral mechanic is tied to the receipt limit,
not the feature set — referred users get full access
to features at their intelligence level.

#### Features

- Referral link generated in Settings → "Earn more
  receipts"
- Sharing options: WhatsApp, email, copy link
- Dashboard: "You've referred 2 people. +20 receipt
  slots unlocked."
- Referral credit is immediate after referred user's
  3rd upload (server-side verified, not self-reported)
- Referred user gets: standard free tier (25 receipts)
  — no special treatment that inflates cost
- Cap: max +50 slots from referrals (75 total free)
- Pro upgrade is still the path to unlimited — referrals
  delay the paywall, they do not replace it

#### Why It Matters

The receipt limit is the primary conversion trigger for
FinSight's free-to-Pro funnel. A user who hits 25 receipts
has demonstrated value from the product. Referrals let
motivated free users extend their runway while bringing
in new users who are pre-qualified (they heard about
FinSight from someone who values it). This is the
Dropbox model applied to receipt capacity — a mechanic
that simultaneously drives growth and delays churn
among engaged free users who are not yet ready to pay.

#### Implementation Notes

- **New columns:** `profiles.referred_by UUID`,
  `profiles.referral_code VARCHAR(12)`,
  `profiles.bonus_receipt_slots INTEGER DEFAULT 0`
- **Free tier limit computation:**
  `effective_limit = 25 + bonus_receipt_slots`
- **Referral code:** 8-character alphanumeric, generated
  at account creation via PostgreSQL `gen_random_bytes`
- **Credit trigger:** Supabase trigger on
  `total_receipts_uploaded = 3` for a referred user
  → increment referrer's `bonus_receipt_slots += 10`
- **Fraud prevention:** Same phone/email cannot be used
  for multiple referral accounts — email verification
  required before first upload

---

### IDEA-013 — AI Spending Coach (Conversational)

```
Status:   Future
Priority: Low (Phase 4+)
Phase:    V4
Impact:   Decision Engine · Retention · Revenue
Segment:  All users (premium segment)
```

#### Description

A conversational interface where users can ask natural
language questions about their financial history and
receive responses grounded entirely in their own data.
"Why did my health score drop in October?" → the system
routes to the anomaly detector, trend analyzer, and
insight generator agents, synthesizes a response, and
explains in plain language. "How much did I spend on
food delivery in Q3?" → structured SQL query + natural
language response. This is not a chatbot — it is a
queryable financial memory with language access.

#### Features

- Dedicated chat interface in `/advisor` route
- Multi-turn conversation with context retention (last
  10 turns)
- Question types supported:
  - Data retrieval: "What was my biggest expense last month?"
  - Pattern explanation: "Why is my health score going down?"
  - Comparison: "Am I spending more on food than usual?"
  - Projection: "At this rate, how much will I spend by year end?"
- All answers cite specific numbers from user's data
- Disclaimer on every response (scope limitation)
- Premium tier feature (not available on Pro standard — requires
  new tier or add-on)

#### Why It Matters

The Financial Decision Engine's current output model is
push-based: FinSight decides what insights to surface.
Conversational AI makes the engine pull-based: users can
query it with the specific question they have right now.
This transforms FinSight from a report generator into
a financial co-pilot. Users who have 18 months of data
in FinSight have a genuinely valuable financial memory
they cannot access via any current UI. The Advisor
unlocks it.

#### Implementation Notes

- **Why Phase 4+ only:** Requires LangGraph multi-agent
  architecture (see AI_STACK.md §7.3), conversation
  state management, and 18+ months of transaction
  history per user to be genuinely valuable. The
  infrastructure, data volume, and user maturity
  requirements make this a Phase 4+ feature. Building
  it earlier would produce a conversational interface
  with insufficient data to answer interesting questions.
- **Architecture:** LangGraph orchestrates: Router Agent
  → (Anomaly Agent | Trend Agent | Insight Agent) →
  Synthesis Agent → Response. Gemini 2.0 Flash for
  all agents.
- **Data sensitivity:** Conversation logs stored in
  Supabase with user_id ownership. RLS enforced. Never
  sent to third-party analytics.

---

### IDEA-014 — Business Workspace (Team Mode)

```
Status:   Future
Priority: High (Phase 4)
Phase:    V4
Impact:   Revenue · Decision Engine
Segment:  Solo Business Operators · Small Teams
```

#### Description

A shared workspace where multiple team members upload
receipts under a single organization account. The
organization owner sees aggregate views across all
members, can assign expense categories to team members,
and generates consolidated reports for accounting. Each
member has their own upload flow and individual view;
the owner has an additional aggregate layer. This is
the Phase 4 Business tier — the highest-value segment
in the PRD (solo business operators have the highest
willingness to pay and the highest upload volume).

#### Features

- Organization creation: owner creates org, invites
  members via email
- Member upload: identical to individual flow — members
  upload to a shared receipt bucket
- Transaction attribution: each transaction attributed
  to the uploading member
- Owner view: aggregate dashboard showing total org
  spend, per-member spend, category breakdown across
  all members
- Project/client tagging: transactions can be tagged
  with a custom project name (for client expense
  reporting)
- Consolidated export: CA-ready PDF for the entire
  organization (builds on IDEA-002)
- Billing: per-seat pricing for the Business tier

#### Why It Matters

A 3-person consulting firm submits expenses that need
to be reconciled, categorized, and reported. Currently
this happens in email threads and shared Google Sheets.
FinSight's receipt intelligence, applied at the team
level, solves a real operational problem that the firm
currently spends 2–4 hours per month managing. The
willingness to pay for this is materially higher than
for individual Pro plans — business expenses are tax-
deductible and the time savings are directly quantifiable.

#### Implementation Notes

- **Schema additions:** `organizations` table,
  `organization_members` junction table
- **RLS extension:** All existing policies extended
  with organization membership check — a complex
  migration that requires careful testing
- **New intelligence layer:** Organization-level
  intelligence level (aggregate receipt count across
  all members) — separate from individual levels
- **Phase 4 gate:** The team feature requires mature
  infrastructure (async queue, rate limiting, proper
  error handling) that Phase 1–3 establish. Building
  multi-user RLS on an unstable foundation is a
  security risk. This is a Phase 4 feature by design.
- **Pricing:** ₹499/member/month (Business tier)
  vs. ₹299/month (Pro individual)

---

## 3. Idea Categories

### 3.1 Core UX Enhancements

Ideas that reduce friction, improve clarity, or make
existing features feel more complete. These do not extend
FinSight's intelligence capabilities but ensure the
existing capabilities are fully accessible.

| ID       | Name                            | Phase |
|----------|---------------------------------|-------|
| IDEA-001 | Smart Receipt Batch Upload      | V2    |
| IDEA-005 | Category Correction + Feedback  | V2    |
| IDEA-008 | Merchant Intelligence Cards     | V3    |
| IDEA-010 | Financial Calendar View         | V3    |

**Principle for this category:** UX enhancements are
prioritized by how many users encounter the friction they
solve. Batch upload solves friction for every user with
> 5 receipts. Calendar view solves friction for users
who have enough data to benefit from temporal analysis
(Level 3+). Prioritize in that order.

### 3.2 Decision Intelligence Features

Ideas that extend what FinSight's Decision Engine knows,
computes, or surfaces. These directly advance FinSight's
identity as a Financial Decision Engine.

| ID       | Name                            | Phase |
|----------|---------------------------------|-------|
| IDEA-002 | Tax Export Report               | V2    |
| IDEA-003 | Subscription Audit Dashboard    | V2→V3 |
| IDEA-006 | Natural Language Receipt Search | V3    |
| IDEA-007 | Spending Forecast & Budget Risk | V3    |
| IDEA-011 | Income Awareness (Freelancer)   | V3    |
| IDEA-013 | AI Spending Coach               | V4    |

**Principle for this category:** Every idea in this
category must deepen the Decision Engine — not add a
new visualization type. The question is always: does
this help users make a better financial decision than
they would without it?

### 3.3 Growth & Retention Mechanisms

Ideas that keep users engaged longer or bring new users
into the product. These have no intelligence value in
isolation but compound the value of the intelligence
features by ensuring users stay long enough to experience
them.

| ID       | Name                            | Phase |
|----------|---------------------------------|-------|
| IDEA-004 | Monthly Spending Digest Email   | V2    |
| IDEA-009 | WhatsApp / Telegram Upload      | V3    |
| IDEA-012 | Referral Receipt Unlock Program | V2    |

**Principle for this category:** Retention features that
create data (IDEA-009, IDEA-012) are prioritized over
retention features that merely communicate data (IDEA-004).
More data means better intelligence. Better intelligence
means better retention. The retention flywheel starts with
data volume.

### 3.4 Monetization Features

Ideas that create or unlock revenue — either by justifying
the Pro tier, creating new tiers, or increasing per-user
lifetime value.

| ID       | Name                                | Phase | Tier       |
|----------|-------------------------------------|-------|------------|
| IDEA-002 | Tax Export Report (Pro gate)        | V2    | Pro        |
| IDEA-003 | Subscription Audit (Pro features)   | V3    | Pro        |
| IDEA-011 | Income Awareness / Freelancer Mode  | V3    | Pro        |
| IDEA-012 | Referral Receipt Unlock             | V2    | Free→Pro   |
| IDEA-014 | Business Workspace / Team Mode      | V4    | Business   |

**Pro tier value proposition (post-V2):**
Unlimited uploads + Tax export + Subscription audit CSV +
Freelancer mode + Budget risk alerts + Merchant intelligence

**Business tier value proposition (post-V4):**
Everything in Pro + Team workspace + Consolidated reporting
+ Project/client tagging + Per-seat pricing

### 3.5 Future AI / Agent Features

Ideas that require AI infrastructure beyond the current
NVIDIA NIM + Groq + Gemini pipeline — specifically
LangGraph, vector databases, or autonomous agents.

| ID       | Name                       | Phase | AI Requirement           |
|----------|----------------------------|-------|--------------------------|
| IDEA-006 | Natural Language Search    | V3    | Gemini as SQL parser     |
| IDEA-013 | AI Spending Coach          | V4    | LangGraph multi-agent    |

**Principle for this category:** These features are not
blocked by product maturity — they are blocked by data
maturity. A conversational spending coach is only
valuable when the user has 12+ months of transaction
history to draw on. Building IDEA-013 for a user with
15 receipts is building a feature with nothing to say.

---

## 4. Integration Strategy

### 4.1 The Gate: Idea → PRD

An idea in the Idea Log is not a PRD item. The gate
between the two has three criteria, all required:

```
GATE CRITERION 1: Evidence
  Has this idea been validated with at least 3 users who
  represent the target segment? Validation can be:
  - Direct user interview ("Would you use this?")
  - Behavioral signal (users requesting this feature via
    support or in-app feedback)
  - Competitive evidence (competitor with this feature
    has higher retention in a credible source)
  "I think users would want this" is not evidence.

GATE CRITERION 2: Architecture fitness
  Has the Engineering Lead confirmed that this idea can
  be implemented without:
  - Breaking the deterministic-first pipeline?
  - Introducing a new AI provider without a documented
    fallback strategy?
  - Adding a new DB table that requires RLS policy changes
    on existing tables?
  - Violating the no-financial-advice constraint?
  If any of these are triggered, the idea requires
  explicit architectural review before PRD entry.

GATE CRITERION 3: Phase alignment
  Is the phase assignment in this Idea Log consistent
  with the current development phase?
  A V3 idea cannot enter the PRD during V2 development
  unless it is a direct prerequisite for a V2 feature.
  Phase creep is how products ship half-complete features.
```

### 4.2 From PRD Entry to Implementation

Once an idea passes the gate and enters the PRD:

```
STEP 1: PRD Section Addition
  New section added to PRD_v2.md with full feature spec:
  - Exact behavior definition
  - Acceptance criteria (testable, not aspirational)
  - Failure scenarios
  - Edge cases
  - Integration points with existing features

STEP 2: Design Update (if UI change)
  UI_GENERATOR_SPEC.md updated with:
  - New component specifications
  - New route added to route map
  - Animation and state specifications
  - Intelligence level gate (if applicable)

STEP 3: Tech Stack Review
  TECH_STACK.md reviewed for:
  - New dependencies (requires justification)
  - New API routes (added to route map)
  - New DB columns or tables (migration file created)
  - AI_STACK.md updated if AI behavior changes

STEP 4: PROMPT_STRATEGY.md Update
  If the feature changes any AI interaction:
  - New or modified prompt added
  - Temperature and token budget specified
  - Fallback strategy defined
  - Schema validation added

STEP 5: Implementation and Ship
  Feature built against the updated spec documents.
  Acceptance criteria from PRD are the definition of done.
```

### 4.3 No-Breaking-Changes Protocol

FinSight's production constraints that no feature may violate:

```
PIPELINE INTEGRITY
  The OCR → Categorization → DB write → Decision Engine
  sequence cannot be interrupted by new features. Any
  feature that runs "during" the pipeline (e.g., real-time
  analysis during upload) must use FastAPI BackgroundTasks
  or the async queue — never synchronous pipeline injection.

DATABASE SAFETY
  New columns added with DEFAULT values — never NOT NULL
  without a default on existing tables.
  New tables do not alter existing RLS policies without
  explicit security review.
  Migrations are numbered, idempotent, and tested on
  staging before production.

AI SAFETY
  No new AI model added without:
  - A documented fallback strategy in AI_STACK.md
  - A Pydantic output schema
  - A drift test suite
  - An entry in ai_audit_log for monitoring

INTELLIGENCE LEVEL IMMUTABILITY
  Intelligence levels never decrease. No feature may
  decrement `total_receipts_uploaded` or `intelligence_level`.
  Features that modify receipt counts (e.g., bulk delete)
  must update the transaction record but not the profile counter.

NO FINANCIAL ADVICE
  Every feature that surfaces a number must be accompanied
  by a scope disclaimer if the number could be interpreted
  as financial guidance. The phrase "FinSight estimates
  based on your uploaded data" must appear near any
  tax, savings, or projection figures.
```

---

## 5. Prioritization Framework

### 5.1 The Evaluation Criteria

Every idea is scored across four dimensions, each 1–5:

```
IMPACT DIMENSIONS (score 1–5 each)

Decision Engine Depth (DED)
  Does this make FinSight's intelligence meaningfully better?
  1 = No effect on intelligence
  5 = Directly extends what the Decision Engine can compute
      or surface for users

User Retention Effect (URE)
  Does this make users more likely to keep using FinSight?
  1 = Cosmetic improvement
  5 = Creates a daily/weekly habit or prevents churn directly

Revenue Contribution (RC)
  Does this contribute to conversion, ARPU, or new revenue?
  1 = No revenue effect
  5 = Creates new revenue category or directly drives
      free-to-Pro conversion

Segment Fit (SF)
  Does this serve the primary segments (freelancers + salaried)?
  1 = Serves a non-target segment
  5 = Solves a top-3 pain point for a primary segment

EFFORT DIMENSION (score 1–5)

Implementation Effort (IE)
  1 = < 1 week, no schema changes, no new dependencies
  5 = > 6 weeks, new AI infrastructure, RLS changes,
      new external service integration

PRIORITY SCORE = (DED + URE + RC + SF) / IE
Higher score = higher priority
```

### 5.2 Scored Idea Log

| ID       | DED | URE | RC  | SF  | Sum | IE  | Score |
|----------|-----|-----|-----|-----|-----|-----|-------|
| IDEA-005 |  5  |  5  |  3  |  5  |  18 |  2  | **9.0** |
| IDEA-002 |  4  |  4  |  5  |  5  |  18 |  3  | **6.0** |
| IDEA-004 |  2  |  5  |  3  |  5  |  15 |  2  | **7.5** |
| IDEA-001 |  3  |  4  |  3  |  5  |  15 |  2  | **7.5** |
| IDEA-007 |  5  |  4  |  4  |  4  |  17 |  3  | **5.7** |
| IDEA-003 |  4  |  4  |  4  |  4  |  16 |  3  | **5.3** |
| IDEA-012 |  2  |  3  |  5  |  4  |  14 |  2  | **7.0** |
| IDEA-011 |  5  |  4  |  4  |  5  |  18 |  4  | **4.5** |
| IDEA-008 |  3  |  4  |  2  |  4  |  13 |  3  | **4.3** |
| IDEA-006 |  3  |  3  |  2  |  3  |  11 |  3  | **3.7** |
| IDEA-009 |  3  |  5  |  3  |  4  |  15 |  4  | **3.8** |
| IDEA-010 |  2  |  3  |  1  |  3  |   9 |  2  | **4.5** |
| IDEA-014 |  4  |  3  |  5  |  4  |  16 |  5  | **3.2** |
| IDEA-013 |  5  |  5  |  5  |  5  |  20 |  5  | **4.0** |

### 5.3 Version Assignment

```
V1 — SHIPPED (current pipeline, Phase 1)
  Receipt upload + OCR + Categorization + Dashboard +
  Intelligence Meter + Insights + Health Score

V2 — HIGH PRIORITY (Phase 2 development)
  Sequence based on priority score:

  1. IDEA-005: Category Correction + Feedback Loop    (9.0)
     Foundation for personalization. Enables everything else.
  2. IDEA-004: Monthly Digest Email                   (7.5)
     Lowest effort, high retention impact. Ship early.
  3. IDEA-001: Smart Receipt Batch Upload             (7.5)
     Removes #1 friction for the highest-value users.
  4. IDEA-012: Referral Receipt Unlock                (7.0)
     Growth mechanic with zero engineering dependency
     on AI features.
  5. IDEA-002: Tax Export Report                      (6.0)
     Highest-value feature for the freelancer segment.
     The Pro conversion driver.
  6. IDEA-003: Subscription Audit (detection only)    (5.3)
     Detection logic ships in V2. Dashboard ships in V3.

V3 — MEDIUM PRIORITY (Phase 3 development)
  Sequence based on priority score + dependency order:

  1. IDEA-007: Spending Forecast + Budget Risk        (5.7)
     First "future-facing" Decision Engine feature.
  2. IDEA-003: Subscription Audit Dashboard           (—)
     Dashboard for V2 detection data.
  3. IDEA-011: Income Awareness / Freelancer Mode     (4.5)
     Completes the freelancer Decision Engine story.
  4. IDEA-010: Financial Calendar View               (4.5)
     Visual intelligence layer; low effort.
  5. IDEA-009: WhatsApp / Telegram Upload            (3.8)
     Input channel expansion — validates after core
     intelligence features are mature.
  6. IDEA-008: Merchant Intelligence Cards           (4.3)
     Deepens retention for power users with large
     transaction history.
  7. IDEA-006: Natural Language Search               (3.7)
     Search is only valuable with enough data.
     Gate to Level 3+ users.

V4 — FUTURE (Phase 4 development)
  1. IDEA-014: Business Workspace / Team Mode
     Highest potential revenue. Requires infrastructure
     maturity from Phase 1–3.
  2. IDEA-013: AI Spending Coach
     Highest product ambition. Requires data maturity
     (18+ months per user) and LangGraph infrastructure.
```

### 5.4 The Impact-Effort Matrix

```
                    EFFORT
              Low (1-2)      Medium (3)      High (4-5)
         ┌──────────────┬───────────────┬────────────────┐
         │ IDEA-005     │ IDEA-007      │                │
High     │ IDEA-004     │ IDEA-002      │ IDEA-011       │
Impact   │ IDEA-001     │ IDEA-003      │ IDEA-009       │
(15-20)  │ IDEA-012     │               │ IDEA-013*      │
         ├──────────────┼───────────────┼────────────────┤
         │              │ IDEA-008      │                │
Medium   │ IDEA-010     │ IDEA-006      │ IDEA-014*      │
Impact   │              │               │                │
(9-14)   │              │               │                │
         └──────────────┴───────────────┴────────────────┘
*IDEA-013 and IDEA-014 are High Impact but constrained to V4
 by infrastructure and data maturity requirements,
 not by effort alone.

BUILD NOW:  Top-left quadrant (High Impact, Low Effort)
PLAN NEXT:  Top-middle (High Impact, Medium Effort)
SCHEDULE:   Top-right after infrastructure is ready
DEPRIORITIZE: Bottom rows until core intelligence is saturating
```

---

## 6. Product Evolution Pipeline

### 6.1 The Pipeline Stages

```
STAGE 1 — IDEA CAPTURE
─────────────────────────────────────────────────────────────
Trigger:  Any team member, user feedback, competitor
          observation, or founder intuition
Action:   Log in this document using the IDEA-[XXX] format
          within 48 hours of conceiving the idea
Tools:    This document (primary) + Notion inbox (staging)
Output:   Logged idea with Status: Proposed
Rule:     No idea is discussed in engineering until it is
          logged here. Verbal ideas that skip the log do
          not get built.

STAGE 2 — VALIDATION
─────────────────────────────────────────────────────────────
Trigger:  Idea has been in Proposed state for ≥ 1 week
Action:   1. Identify the target segment for the idea
          2. Talk to 3 users from that segment
             (in-app survey, direct interview, or support thread)
          3. Check competitor implementations if applicable
          4. Score the idea using the 5-dimension framework
          5. Assign or revise Phase assignment
Output:   Status updated to Validated or marked for deprioritization
Timeline: 2 weeks from logging
Rule:     "I think users want this" is not validation.
          At least 2 of 3 users must confirm the pain point exists.

STAGE 3 — PROTOTYPE
─────────────────────────────────────────────────────────────
Trigger:  Validated idea enters current-phase development scope
Action:   1. Create a functional prototype (not a mockup)
             — Minimum: a working API endpoint + raw UI
          2. Test with 3–5 users from the target segment
          3. Measure: does the feature change the behavior
             we intended to change?
          4. Validate that the implementation does not
             violate the no-breaking-changes protocol
Output:   Prototype validated or sent back to Idea Log for revision
Timeline: 1–2 sprints (2–4 weeks)
Rule:     A mockup is not a prototype. The prototype must
          handle real data from real users.

STAGE 4 — INTEGRATE
─────────────────────────────────────────────────────────────
Trigger:  Prototype validates core hypothesis
Action:   1. Update PRD_v2.md with full feature spec
          2. Update UI_GENERATOR_SPEC.md with component specs
          3. Update TECH_STACK.md and AI_STACK.md if required
          4. Update PROMPT_STRATEGY.md if AI behavior changes
          5. Update INFRA.md if new services or env vars
          6. Write DB migration file
          7. Add acceptance criteria and test cases
Output:   All governing documents updated. Feature enters
          engineering backlog.
Timeline: 1 week for documentation, then engineering sprint
Rule:     Feature cannot enter engineering sprint until ALL
          governing documents are updated. Code is the last step.

STAGE 5 — SHIP
─────────────────────────────────────────────────────────────
Trigger:  Implementation complete, acceptance criteria met
Action:   1. Deploy to staging, verify with production data
          2. Run pre-deploy secret audit (INFRA.md Appendix A)
          3. Deploy to production via standard CI/CD pipeline
          4. Monitor ai_audit_log for anomalies (24h post-deploy)
          5. Monitor error rates and fallback rates
          6. Update this document: mark idea as Shipped
          7. Add to changelog
Output:   Feature live in production. Metrics baseline established.
Timeline: 1–2 days deployment + 48h monitoring
Rule:     No feature ships without 24h of staging validation
          with production-equivalent data.
```

### 6.2 Pipeline State Tracking

```
CURRENT PIPELINE STATE (as of document creation)

IN STAGING (Prototype):       none
IN INTEGRATION:               none
IN BACKLOG (Validated):       IDEA-005, IDEA-004, IDEA-001,
                              IDEA-002, IDEA-012
PROPOSED (Needs validation):  IDEA-003, IDEA-006, IDEA-007,
                              IDEA-008, IDEA-009, IDEA-010,
                              IDEA-011
FUTURE (Phase 4):             IDEA-013, IDEA-014
SHIPPED:                      V1 core pipeline
```

### 6.3 Feedback Sources

```
USER FEEDBACK CHANNELS (ranked by signal quality)

1. DIRECT INTERVIEWS (highest signal)
   Target: 30-minute call with a user who has uploaded
   ≥ 10 receipts and uses FinSight weekly
   Frequency: 2 per month minimum (1 freelancer, 1
   salaried professional)
   Focus: "What did you expect FinSight to do that it
   didn't?" not "What features do you want?"

2. IN-APP FEEDBACK WIDGET
   Placement: Insights page, after Health Score loads
   Prompt: "Was this insight useful?" (thumbs up/down) +
   optional text field
   Signal: Negative feedback on specific insights
   indicates insight quality issues before they become
   churn signals

3. SUPPORT THREADS
   Every support message is a feature request in disguise.
   "How do I..." = we have a discoverability problem.
   "Why doesn't it..." = we have a gap in the product.
   All support threads tagged in linear with: bug |
   feature-request | onboarding | insight-quality

4. CHURN ANALYSIS (Phase 2+)
   When a Pro user cancels: one-question exit survey.
   "What was the main reason you cancelled?"
   Options: Too expensive | Not enough value | Missing
   feature | Found alternative | Other (text)
   Churn analysis reviewed monthly.

5. COMPETITIVE MONITORING
   Walnut, Money Manager, YNAB, Plaid-connected apps
   reviewed quarterly for new features.
   Signal: a feature that 3+ competitors have shipped
   that FinSight lacks is a gap worth evaluating —
   not automatically shipping.
```

---

## 7. Evolution Rules

### 7.1 The Inviolable Rules

These rules cannot be overridden by business pressure,
founder enthusiasm, or user demand volume. They protect
FinSight's architectural and product integrity.

```
RULE 1 — DECISION ENGINE FIRST
  Every new feature must make FinSight a better Financial
  Decision Engine or it does not ship. "Nice to have" is
  not a product category. Every feature must move at least
  one of: intelligence depth, retention, or revenue.
  If it moves none, it is not FinSight.

RULE 2 — DETERMINISTIC BEFORE AI
  No feature adds an AI call where a deterministic
  computation is possible. If a number can be computed
  with Python and SQL, it is computed that way. AI is
  called to interpret, narrate, or classify — never to
  compute. Violating this rule creates hallucination
  surface on financial data, which is a trust violation.

RULE 3 — NO FINANCIAL ADVICE
  FinSight presents observations. Users make decisions.
  Features that tell users what to do with their money
  are not built. Features that show users what their
  money is doing are. The difference is the difference
  between "Your food spend is 38% of total — your highest
  category" (observation) and "You should reduce food
  spending" (advice). Every insight, recommendation, and
  alert must pass this test before shipping.

RULE 4 — NO RANDOM FEATURE ADDITION
  A feature that is not in this Idea Log, has not been
  validated, and has not been integrated into the
  governing documents does not get built in a sprint.
  An engineer who begins implementing an idea they had
  in the shower is building the wrong product. The
  Idea Log exists to capture the shower idea without
  wasting the sprint on it.

RULE 5 — ARCHITECTURE STABILITY
  The PRD's six non-negotiable product constraints are
  not relaxed to ship a feature faster:
  1. End-to-end pipeline with real data
  2. Intelligence level does not decrease
  3. No financial advice
  4. Data isolation via RLS
  5. Free tier limit enforced server-side
  6. OCR below 0.30 confidence rejected
  A feature that requires violating any of these is
  redesigned, not the constraint relaxed.

RULE 6 — PHASE DISCIPLINE
  A V3 feature is not shipped in V2 because it seems
  quick. Phase assignments exist because features built
  before their prerequisite infrastructure is stable
  create technical debt that is paid in V3. The phase
  assignment is the minimum viable infrastructure
  maturity for the feature to work correctly at scale.

RULE 7 — EVERY IDEA HAS AN OWNER
  An idea without an owner is an idea that does not get
  validated. When an idea enters the log, it is assigned
  to a team member responsible for driving it through
  the validation stage within 2 weeks. If no owner is
  assigned within 48 hours of logging, the idea is
  deprioritized automatically.
```

### 7.2 The Product Identity Test

Before any feature is shipped, ask:

> *"If I told a new user that FinSight does [this feature],
> does it make them more likely to describe FinSight as
> a Financial Decision Engine — or as an expense tracker
> with more features?"*

If the answer is "expense tracker with more features":
the feature either needs to be redesigned to emphasize
its decision-support value, or it is not ready to ship.

Features that make FinSight feel more like a Financial
Decision Engine:
- Tax Export Report (concrete financial output)
- Spending Forecast (future-facing intelligence)
- Subscription Audit Dashboard (identifies waste)
- Income Awareness (closes the income-expense loop)
- AI Spending Coach (conversational decision support)

Features that make FinSight feel like a feature-rich
expense tracker and need careful framing:
- Calendar View (a visualization, not a decision)
- Natural Language Search (a navigation tool)
- WhatsApp Upload (a data input channel)

The second category is not excluded — but it must be
marketed and positioned as enabling the Decision Engine,
not as the product's value proposition itself.

---

## APPENDIX A — Idea Submission Template

Use this template when logging a new idea:

```markdown
### IDEA-[XXX] — [Feature Name]

```
Status:   Proposed
Priority: [High / Medium / Low]
Phase:    [V2 / V3 / V4]
Impact:   [UX / Retention / Revenue / Decision Engine]
Segment:  [Freelancers / Salaried Professionals / Both / Business]
Owner:    [Name — assigned within 48h]
Logged:   [Date]
```

#### Description
[2–4 sentences. What does this feature do? Who is it for?
What problem does it solve? No fluff.]

#### Features
- [Specific, shippable feature bullet]
- [Specific, shippable feature bullet]

#### Why It Matters
[Real-world value — what changes in the user's life or
financial behavior because of this feature? Cite data
or user quotes if available.]

#### Implementation Notes
[Architecture fit, schema changes, new dependencies,
AI implications, or phase prerequisites.]
```

---

## APPENDIX B — Idea Status Definitions

| Status        | Meaning                                              |
|---------------|------------------------------------------------------|
| `Proposed`    | Logged, not yet validated. Awaiting owner assignment.|
| `Validated`   | Evidence gathered. Ready for phase assignment.       |
| `In Backlog`  | Validated, phase-assigned, not in active sprint.     |
| `In Progress` | Engineering sprint underway.                         |
| `In Staging`  | Implementation complete, under review.               |
| `Shipped`     | Live in production.                                  |
| `Deprioritized` | Validated but scored too low or out of phase.      |
| `Rejected`    | Violates product identity or architecture rules.     |

## 8. Metrics Tracking (Post-Ship)

For every shipped idea, track:

- adoption rate (% users using feature)
- retention impact (7-day / 30-day)
- revenue impact (conversion to Pro)
- AI accuracy impact (if applicable)

Store in:
product_metrics table

Purpose:
- validate feature success
- guide future prioritization
---

*End of FinSight PRODUCT_EVOLUTION.md v1.0.0*
*This document governs all new feature concepts for FinSight.*
*Product authority: PRD_v2.md · Architecture: TECH_STACK.md v2.0*
*AI decisions: AI_STACK.md v1.0 · Prompts: PROMPT_STRATEGY.md v1.0*
*This is a living document — update it when ideas are validated,*
*shipped, or deprecated. A stale evolution document is no document.*
