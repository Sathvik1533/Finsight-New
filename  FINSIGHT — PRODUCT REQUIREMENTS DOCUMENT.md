# FINSIGHT — PRODUCT REQUIREMENTS DOCUMENT
## Financial Intelligence System — Production Grade
```
Version:        2.0.0
Classification: Internal — Product Architecture
Status:         Active — Implementation Ready
Supersedes:     PRD.md v1.0.0
Authors:        FinSight Product & Engineering
Scale Target:   10,000+ concurrent users
```

---

## DOCUMENT SCOPE

This document governs product decisions for FinSight across all four development phases. It is the authoritative reference for feature scope, system behavior, acceptance criteria, and success measurement. Decisions not traceable to this document require explicit product approval before implementation.

This PRD governs behavior. Architecture decisions live in TECH_STACK.md. UI decisions live in UI_GENERATOR_SPEC.md. Implementation sequencing lives in STAGE_GUIDE.md.

---

# SECTION 1 — PRODUCT VISION

## 1.1 The Actual Problem

The failure mode of personal finance is not mathematical — it is behavioral. People know they are spending too much. They do not know where, by how much, or why the pattern persists. They cannot see it.

The existing tool landscape makes this problem worse through three mechanisms:

**Mechanism 1 — The tagging tax.** Every tool that requires manual categorization is a tool that demands behavioral change as a prerequisite to delivering value. YNAB asks users to budget before they understand their spending. Mint asks users to tag transactions they have already forgotten about. The cognitive load of the tool exceeds the cognitive load of not tracking at all. Users rationally quit within two weeks. This is not a discipline problem — it is a product design problem.

**Mechanism 2 — The bank dependency trap.** Tools that require bank API integration (Plaid, Yodlee, Finvu) work until they do not. Bank API coverage in India is incomplete, unstable, and subject to RBI regulatory shifts. Users who connect their accounts and then lose that connection lose all automated tracking simultaneously. The fragility of the integration transfers to the fragility of the habit.

**Mechanism 3 — The static output problem.** Tools that display spending data without interpretation leave the last mile to the user. A pie chart of category percentages is not an insight — it is a visualization. The user still has to decide what it means. Tools that do not close this interpretation gap are data displays, not intelligence systems.

FinSight addresses none of these through incremental improvement. It addresses them through architectural replacement.

## 1.2 Why Current Solutions Fail Structurally

| Competitor | Core Failure | Why It Cannot Be Fixed Incrementally |
|---|---|---|
| YNAB | Demands behavioral change before delivering value | The entire product philosophy is behavior-first, not insight-first |
| Mint | Bank sync dependency, static pie charts | Insight generation is not in the product — it was never designed for it |
| Walnut | Requires SMS access, limited categorization | Data source is constrained — no vision AI, no receipt-level granularity |
| Money Manager | Manual entry burden | Manual entry is the product — removing it is a different product |
| Khatabook | Designed for merchants, not individuals | Wrong user model entirely |

The critical observation: no existing tool treats the user's financial behavior as **a dataset that improves with volume**. Every existing tool starts with the same capability on day 1 as it has on day 100. There is no flywheel. There is no compounding value. There is no reason to keep using it.

FinSight's core architectural bet is that **value compounds with data volume**, and that the UI must communicate this compounding visibly so users feel the return on their investment of time and receipts.

## 1.3 FinSight's Intelligence-Based Approach

FinSight is not an expense tracker. The distinction is not semantic — it is architectural.

An expense tracker stores what you spend. A financial intelligence system **learns how you spend** and generates insights that are impossible to generate with less data.

FinSight's architecture is built around three ideas that have no equivalent in the tracker category:

**Intelligence accumulation.** The system becomes measurably more capable as data volume increases. This is not a marketing claim — it is a verifiable system property. At 2 receipts, the system can tell you what you bought. At 10 receipts, the system can tell you what your spending behavior looks like, where it deviates from your own baseline, and where it is heading. These are qualitatively different outputs, not quantitatively more of the same output.

**Progressive disclosure.** The UI communicates the system's intelligence level explicitly through the Intelligence Meter — a first-class UI element that advances as data accumulates. Users see the meter advance. They know what unlocks at the next level. This creates an explicit progression mechanic that makes continued engagement feel like leveling up rather than maintenance.

**Behavior as the data source.** FinSight treats the pattern of a user's spending — timing, merchant relationships, category distribution, seasonal variance — as the primary insight substrate, not just the amount and category of individual transactions. This is the difference between knowing you spent ₹8,400 on food last month and knowing that your food spend spikes 40% on weekends and that Swiggy accounts for 60% of that spike at a cost of ₹280/order.

## SECTION X — DECISION INTELLIGENCE LAYER

FinSight does not stop at financial awareness. It evolves into a **financial decision system**.

The limitation of traditional finance tools is not data collection — it is decision paralysis. Users are shown what happened, but not what to do next.

FinSight closes this gap by introducing a Decision Intelligence Layer.

---

### Freelancer Problem

Freelancers do not need another expense tracker. They need to answer:

"How much tax do I owe right now based on my actual expenses?"

FinSight solves this by:

- Identifying business expenses automatically
- Tracking deductible categories over time
- Estimating real-time tax liability
- Highlighting tax-saving opportunities

The system transforms raw receipts into **actionable tax insights**.

---

### Salaried Problem

Salaried users do not lack income — they lack visibility into waste.

FinSight identifies:

- Recurring subscriptions (Netflix, SaaS, apps)
- Forgotten or inactive payments
- Spending patterns that indicate leakage

The system answers:

"Where am I losing money without realizing it?"

---

### Core System Shift

FinSight evolves from:

"Here is your spending data"

To:

"Here is what you should fix, save, or plan for"

---

### Key Decision Outputs

- Real-time tax estimation (freelancers)
- Subscription detection and alerts
- Budget leakage identification
- Actionable financial recommendations

---

### Product Definition Upgrade

FinSight is not an expense tracker.

It is a **Financial Decision Engine powered by behavioral data and AI interpretation.**

## 1.4 Target Users

### Primary Segment — Independent Freelancers

**Profile:** 25–38, income ₹60,000–₹2,50,000/month, irregular, project-based.

**Financial reality:** They are simultaneously their own employer and employee. They incur business expenses that are deductible but only if they can document them. At tax time — typically March in India — they are sorting through 11 months of unorganized receipts to reconstruct expense records for their CA. This process takes 4–6 hours, is error-prone, and consistently results in under-claiming deductions.

**Relationship to FinSight:** High-volume uploaders. Motivated by the concrete downstream value of organized receipt records. Business vs. personal classification is a first-class feature for this segment, not an edge case.

**Willingness to pay:** High, because the value is quantifiable — deductions they can claim vs. deductions they miss.

### Primary Segment — Salaried Professionals

**Profile:** 28–42, income ₹1,00,000–₹3,00,000/month, stable, urban.

**Financial reality:** They earn well and save inconsistently. The gap between income and savings is not visible to them because spending is diffuse — food delivery, subscriptions, impulse retail, cab rides — no single category is large enough to feel like a problem. The aggregate, however, is significant. A typical person in this segment has ₹8,000–₹15,000/month in spending they could not account for within 24 hours of it occurring.

**Relationship to FinSight:** Moderate upload volume, high engagement with insights. The Anomaly Detection and Health Score features are the primary value drivers for this segment — they want to be told when something is wrong, not asked to find it themselves.

**Willingness to pay:** Moderate. Price sensitivity exists; value must be demonstrated before conversion to Pro.

### Secondary Segment — Solo Business Operators

**Profile:** 30–50, operates a 1–5 person service business, 40–80 receipts/month.

**Financial reality:** They need clean expense records for accounting purposes. They currently use a shared spreadsheet, a folder of scanned receipts, or nothing. Their primary need is digitization and organization, not behavioral insight. The insights are a bonus.

**Relationship to FinSight:** High-volume uploaders. CSV export is a critical feature. Business expense classification is essential.

**Willingness to pay:** Highest — they can justify it as a business expense.

### Non-Target Users (Explicitly Out of Scope for V1–V2)

- Households managing joint finances (requires shared workspace — V3)
- Users without smartphones (mobile upload is a critical path)
- Users who want budgeting/goal-setting tools (FinSight tracks behavior; it does not prescribe behavior in V1)
- Corporate finance teams (different product category entirely)

## 1.5 Core Product Philosophy

**The system should feel like it is waking up.**

Every design and engineering decision must be evaluated against this criterion. A system that wakes up has states. It has early stages where it knows little and late stages where it knows a great deal. The transition between these states must be visible, meaningful, and rewarding.

This has concrete implications:

A system that is waking up does not show empty charts. It shows the Intelligence Meter and explains what will appear when more data arrives.

A system that is waking up does not generate vague insights. It generates specific, data-derived statements with amounts, percentages, and dates.

A system that is waking up remembers. Returning users see continuity — their spending history, their intelligence level, their established patterns. There is no reset, no starting over.

A system that is waking up gets better at its job. The categorization model in V1 uses Gemini with a fixed prompt. In V2, manual corrections feed back into per-user context. In V3, per-user context improves category confidence scores. The system's accuracy improves with use — and the user can see that improvement in the confidence scores.

---

# SECTION 2 — CORE SYSTEM PIPELINE

## 2.1 Pipeline Overview

```
RECEIPT IMAGE (user input)
        │
        ▼
INGESTION LAYER
  Validate → Store → Create receipt record
        │
        ▼
OCR EXTRACTION (Gemini Vision)
  Image → Structured JSON
        │
        ▼
SEMANTIC ENRICHMENT (Gemini Text)
  Structured JSON → Category + Confidence + Business flag
        │
        ▼
PERSISTENCE LAYER
  Write transaction → Update receipt status → Increment profile counters
        │
        ▼
INTELLIGENCE ENGINE
  Re-evaluate user intelligence level
  If level changed → trigger unlock sequence
        │
        ▼
INSIGHT GENERATION (triggered, not continuous)
  Transaction corpus → Gemini insight pass → Persist insight set
        │
        ▼
UI STATE UPDATE
  Invalidate client cache → Re-render dashboard
```

## 2.2 Stage 1 — Ingestion

**Input:** Multipart form upload containing receipt image file. Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.

**Processing logic:**
- Session validation: user ID extracted from Supabase JWT — never from request body.
- Free tier gate: if `profile.subscription_tier = 'free'` and `profile.total_receipts_uploaded >= 20`, reject with HTTP 402 and `code: 'LIMIT_REACHED'`. This check happens before any storage write.
- File validation: MIME type checked against allowlist. Size validated against 10MB ceiling. Both checks use server-side values, not client-reported values.
- Storage: file written to Supabase Storage bucket `receipts` at path `{user_id}/{receipt_id}/{timestamp}.{ext}`. Bucket is private. Signed URLs with 1-hour expiry are generated server-side on demand.
- Receipt record creation: row inserted into `public.receipts` with `status='pending'`. The receipt ID is a UUID generated by Next.js at upload time — not by the database — so it can be referenced in the FastAPI call body.
- Base64 encoding: file buffer converted to base64 in the Next.js BFF before forwarding to FastAPI. The base64 string is not stored permanently.

**Output:** Receipt record in database with `status='pending'`. Base64 image string forwarded to OCR stage.

**Failure scenarios:**
- File exceeds 10MB: reject at validation, no storage write, 400 response.
- Storage write fails: no receipt record created, 500 response, user prompted to retry.
- Free tier limit exceeded: receipt record not created, 402 response, upgrade prompt shown.
- Session expired mid-upload: 401 response. User must re-authenticate.

## 2.3 Stage 2 — OCR Extraction

**Input:** Base64-encoded image string. Receipt UUID. User ID.

**Processing logic:** Gemini 2.0 Flash with vision input. Single API call. Structured output enforced via prompt — model instructed to return JSON only with no markdown wrapping. Response stripped of code fences before `json.loads()` to handle model non-compliance.

**Confidence threshold:** `raw_confidence` field in extraction output represents model's self-assessed extraction quality. If `raw_confidence < 0.30`, the extraction is considered unusable. Receipt status is set to `failed` with `processing_error = "Receipt image quality insufficient"`. HTTP 422 returned to client. No transaction created. User is shown a specific error message (not a generic one) prompting re-upload with a clearer photo.

**Fields extracted:**
- `merchant`: Exact merchant name as printed on receipt. Null if unreadable.
- `total_amount`: Numeric only — no currency symbol. The final total paid (after tax, after discounts). Null if ambiguous or absent.
- `currency`: ISO 4217 code inferred from visual context (₹ symbol, "INR" text, country of origin). Defaults to `"INR"` if unresolvable.
- `date`: ISO 8601 date string (`YYYY-MM-DD`). Null if absent. The system uses today's date as fallback only when explicitly set by downstream logic — it does not auto-fill from inference.
- `line_items`: Array of `{name, quantity, price}` objects. Only populated when individual items are clearly legible. Often null.
- `payment_method`: `"cash"`, `"card"`, `"upi"`, or `"other"`. Null if not shown.
- `receipt_type`: `"restaurant"`, `"retail"`, `"fuel"`, `"grocery"`, `"medical"`, `"transport"`, `"other"`. This is the model's raw receipt classification before the categorization pass.
- `raw_confidence`: Float 0.0–1.0.

**Output:** Extraction JSON stored in `receipts.gemini_response.extraction`. Passed to categorization stage.

**Failure scenarios:**
- `raw_confidence < 0.30`: receipt fails, 422 returned, specific user message.
- Gemini API timeout (12s limit): receipt set to `failed`, 500 returned, user prompted to retry.
- Malformed JSON response from Gemini: JSON parsing fails, receipt set to `failed`, error logged with raw model output for debugging.
- Image is clearly not a receipt (e.g., a landscape photo): `raw_confidence` will typically be below threshold; if not, categorization pass confidence will fail.

## 2.4 Stage 3 — Semantic Enrichment (Categorization)

**Input:** Extraction JSON from Stage 2.

**Processing logic:** Second Gemini 2.0 Flash call, text-only this time. Prompt provides extraction JSON and the 12-category taxonomy. Model must select exactly one category, assign confidence, provide one-sentence reasoning, and classify as business or personal.

**Category taxonomy (exhaustive, system-defined, not user-modifiable in V1):**
1. Food & Dining
2. Groceries
3. Transportation
4. Shopping & Retail
5. Entertainment & Leisure
6. Health & Medical
7. Travel & Accommodation
8. Utilities & Bills
9. Software & Subscriptions
10. Business & Professional
11. Education
12. Other

**Confidence handling:** If `categorization.confidence < 0.50`, category is set to `"Other"` regardless of what the model selected. This prevents low-confidence guesses from polluting analytics. The `confidence` value stored is the raw model confidence, not the thresholded value — so manual correction flows can display the actual score.

**Business/personal classification:** `is_business_expense` is set based on the model's assessment. High-signal indicators: merchant is a software subscription service, receipt type is "restaurant" with an amount above ₹2,000 (likely client entertainment), merchant name matches known B2B SaaS products. This flag is user-correctable in V1.5.

**Output:**
```
category:            string (one of the 12 taxonomy values)
confidence:          float 0.0–1.0 (raw model score)
reasoning:           string (one sentence, stored in gemini_response for debugging)
subcategory:         string or null (freeform, not from taxonomy)
is_business_expense: boolean
```

**Failure scenarios:**
- Model returns a category not in the 12-item taxonomy: fallback to `"Other"`, flag for logging.
- Model confidence < 0.50: override to `"Other"`, store actual confidence.
- Gemini API timeout: receipt fails, error logged.

## 2.5 Stage 4 — Persistence

**Input:** Extraction JSON + Categorization JSON + Receipt ID + User ID.

**Processing logic:**

**Transaction write:** New row in `public.transactions`. All fields populated from extraction and categorization outputs. `transaction_date` uses the extracted date if available; uses `CURRENT_DATE` in PostgreSQL (server-side, not Python `datetime.now()`) as fallback. This ensures consistency regardless of the FastAPI server's timezone.

**Receipt update:** `public.receipts` row updated: `status='complete'`, `processed_at=datetime.now(timezone.utc).isoformat()` (Python datetime — never the string `"now()"`), `raw_ocr_text=extraction.merchant`, `gemini_response={extraction, categorization, processing_time_ms}`.

**Profile counter update:** `increment_receipt_count(user_id)` SQL function called via Supabase RPC. This function atomically increments `total_receipts_uploaded` and recalculates `intelligence_level` in the same database transaction using a CASE expression. The atomicity ensures the level update cannot diverge from the count.

**Writes are ordered:** Transaction write → Receipt update → Profile counter. If the transaction write fails, the receipt is marked failed and no counter increment occurs. If the receipt update fails after a successful transaction write, the transaction row exists but the receipt status is incorrect — this is recoverable via an admin repair script and is preferable to losing the transaction data.

**All FastAPI writes use the Supabase service role key**, which bypasses RLS. This is intentional: FastAPI is a trusted internal service. The service role key is never accessible from Next.js or any client-side code.

**Output:** Transaction row in database. Receipt marked complete. Profile counters updated.

**Failure scenarios:**
- Transaction insert fails (constraint violation, e.g., `amount` null when column is NOT NULL): receipt marked failed. Root cause: extraction produced null `total_amount`. Handled by defaulting amount to 0.00 with a flag — not rejecting the transaction.
- Profile counter update fails: transaction and receipt are complete, but `total_receipts_uploaded` is stale. Correctable by a background consistency job in V2.

## 2.6 Stage 5 — Intelligence Engine

**Input:** Updated `total_receipts_uploaded` from profile.

**Processing logic:** The intelligence level is deterministic, not probabilistic. It is computed from `total_receipts_uploaded` using a fixed CASE expression:

```
0–2 receipts:  Level 1 — Bootstrap
3–5 receipts:  Level 2 — Pattern Emergence
6–9 receipts:  Level 3 — Visual Intelligence
10+ receipts:  Level 4 — Full Intelligence
```

This computation happens inside the `increment_receipt_count` SQL function — at the database level, not in application code. The application reads the result; it does not compute it. This ensures consistency across clients.

**Level change detection:** The Next.js client, after upload completion, compares the previous `total_receipts_uploaded` (from pre-upload profile state) with the new value (from post-upload profile refetch). If `getIntelligenceLevel(newCount) > getIntelligenceLevel(oldCount)`, the level unlock animation sequence is triggered. The UI derives intelligence level from the count — never from `profile.intelligence_level` directly — to ensure the UI always reflects the ground truth of the count even during eventual consistency windows.

**Output:** Updated intelligence level in database. Level change signal available to the UI.

## 2.7 Stage 6 — Insight Generation

**Trigger conditions:** Insight generation is not continuous. It is event-driven:
- User reaches a new intelligence level for the first time.
- User explicitly clicks "Refresh Insights" on the Insights page.
- (V2) Nightly background job for users with Level 4+ data.

**Input:** All `public.transactions` rows for the user within the selected time range (30d or 90d). Minimum threshold: 3 transactions. Fewer than 3 returns empty insight array without calling Gemini.

**Processing logic:** Single Gemini 2.0 Flash call. Input is the full transaction corpus as a JSON array. Prompt instructs the model to generate:
- 3–5 insight strings, each under 20 words, each beginning with a specific data point (amount, percentage, or count — not a vague observation).
- An integer Financial Health Score 0–100.
- A score breakdown object with four sub-scores.

**Health Score computation is AI-assisted, not purely algorithmic.** The Gemini prompt provides the weighting formula (consistency 30%, diversification 25%, anomaly 25%, trend 20%) and the transaction data. The model computes the score based on these inputs. This is validated in V2 with a deterministic parallel computation to catch model drift.

**Output:** `public.insights` row with `insight_texts`, `health_score`, `score_breakdown`, `transaction_count`. Previous insight rows are retained — the UI always reads the most recent.

**Failure scenarios:**
- Fewer than 3 transactions: return empty result, do not call Gemini.
- Gemini returns health score outside 0–100: clamp to range, log anomaly.
- Gemini API timeout: do not persist, surface "Couldn't refresh insights" toast, retry button remains available.

## 2.8 Stage 7 — UI State

**Input:** Completed pipeline, updated database state.

**Client-side flow:**
1. Upload completes → Next.js BFF returns `{success: true, receipt_id, extraction, categorization}`.
2. Client (useUpload hook) receives success → invalidates React Query cache for `['user','profile']`, `['dashboard','summary']`, `['receipts']`.
3. Profile refetch returns new `total_receipts_uploaded`.
4. `useIntelligenceLevel(profile)` returns new level.
5. If level increased: unlock animation sequence fires (see UI_GENERATOR_SPEC.md §6.4).
6. Dashboard re-renders with new data.

**What does not happen:** No WebSocket, no server-sent event, no polling. The entire update flow is client-initiated after upload completion. This is sufficient for V1.

---

# SECTION 3 — PHASED PRODUCT DEVELOPMENT

## 3.1 PHASE 1 — Functional Core

**Duration:** 6–8 weeks from architecture sign-off.

**Definition of done:** A real user can sign up, upload a real receipt, see it correctly processed, and view their transaction on a dashboard. Nothing is mocked. Nothing is stubbed. The pipeline is end-to-end and live.

### Scope

**Authentication system:** Email + password with verification. Google OAuth. Profile auto-creation via database trigger. Session management via Supabase Auth with httpOnly cookies. Middleware-enforced route protection.

**Receipt upload pipeline:** Complete 7-stage pipeline as specified in Section 2. FastAPI service deployed on Railway. Gemini API integrated. All edge cases handled (low confidence, timeout, free tier limit).

**Transaction storage:** All four database tables live with complete RLS policies. Data written by FastAPI via service role key. Read by Next.js via anon key + session.

**Progressive Intelligence Dashboard:** All four intelligence levels implemented and gated correctly. Intelligence Meter component renders in sidebar and dashboard. Level unlock animation fires when threshold crossed. Empty states are motivational, not apologetic.

**Free tier enforcement:** 20-receipt monthly cap. 402 response triggers upgrade prompt, not error state.

**Settings page:** Profile editing. Plan display. CSV export. Account deletion with confirmation.

### Phase 1 Acceptance Criteria

- OCR success rate on clear receipts: ≥ 90%.
- AI categorization accuracy on high-confidence results: ≥ 85%.
- Upload-to-result time (p95): ≤ 12 seconds.
- All four intelligence levels render correctly with correct gating.
- Free tier limit enforced at API route level before any processing.
- No secrets accessible in browser bundle (verified by pre-deploy grep).
- RLS verified on all tables: no cross-user data access possible.

### Phase 1 Explicitly Excluded

- Manual category correction (V1.5)
- Receipt search and filter (V1.5)
- Email notifications (V1.5)
- Spending anomaly notifications (V1.5)
- Mobile PWA (V2)
- Bank import (V2)

---

## 3.2 PHASE 2 — Intelligence System

**Duration:** 4–6 weeks post-Phase 1 launch. Begins after 200+ active users have reached Level 2.

**Gate:** Phase 2 begins only after Phase 1 has real usage data. Building intelligence features on synthetic data produces a product that works in demos but fails in production.

### Scope

**Manual category correction:** Users can correct the AI-assigned category on any transaction. Corrections set `is_manually_corrected = true` and update the `category` field. In Phase 2, corrections are stored but not fed back into the model (that is Phase 3). The correction rate per category is tracked — categories with correction rates above 20% are flagged for prompt engineering review.

**Receipt search and filter:** Full-text search on `merchant` field. Category filter. Date range filter. These are database-level operations with indexes — no vector search in V1-V2.

**Pattern detection — implemented as SQL queries, not ML:**

*Spending velocity:* Total spend in the current 7-day window vs. the previous 7-day window. A 30%+ increase in velocity across total spend is a signal worth surfacing.

*Category concentration:* The percentage of total spend attributable to the top category. High concentration (>50% in one category) is noted in insights.

*Merchant frequency:* The top 3 merchants by transaction count over 30 days. Repeat-purchase merchants are signals for potential subscription detection.

*Day-of-week distribution:* Total spend by day of week. Normalized by number of occurrences in the period. Weekend vs. weekday spend ratio computed.

These patterns are computed on demand at insight generation time — not maintained as materialized views in V1. They become materialized view candidates in Phase 4 when query performance becomes a concern.

**Improved categorization via prompt context:** The categorization prompt is augmented with the user's top 5 merchants and their historically confirmed categories. This allows the model to correctly categorize a recurring Swiggy order based on prior Swiggy categorizations rather than re-evaluating from first principles.

**Basic anomaly detection:** A transaction is anomalous if its amount exceeds 2.5 standard deviations from the user's mean spend in that category, computed over the previous 30 days. Requires a minimum of 5 transactions in the category before flagging begins (cold start protection). Anomalous transactions are marked `is_anomalous = true` in the transactions table (new column added in Phase 2 migration).

**Spending trend direction:** Week-over-week total spend direction computed from the last 4 weeks. A rolling 4-week window prevents single outlier weeks from dominating the trend signal.

**Email digest:** Monthly email sent to Pro users (and previewed to Free users) summarizing: total spend, top category, most visited merchant, Health Score change, one AI insight. Sent via Resend or Postmark — not a custom SMTP stack.

### Phase 2 Acceptance Criteria

- Manual corrections captured and stored correctly for ≥ 99% of correction events.
- Anomaly detection firing rate: 5–15% of transactions for Level 4 users (if firing on fewer than 5%, threshold may be too loose; more than 20% suggests false positive inflation).
- Email digest delivery rate: ≥ 95%.
- Search results returning within 500ms at p95 for users with ≤ 500 transactions.

---

## 3.3 PHASE 3 — Advanced Intelligence

**Duration:** 8–12 weeks post-Phase 2. Begins after Phase 2 has been live for 60+ days and manual correction data is available.

**Gate:** Phase 3's personalization features depend on per-user behavioral data. They cannot be built meaningfully without it.

### Scope

**Personalized categorization model:** Manual corrections from Phase 2 are used to build per-user merchant→category mappings. When a merchant is in the user's correction history, the correction is used as a prior in the categorization prompt: "For this user, [merchant] has historically been classified as [category]." This is not fine-tuning — it is prompt-level context injection. It improves accuracy for known merchants to near-100%.

**Behavioral insight generation upgrade:** The insight generation prompt is expanded to include behavioral pattern signals as structured inputs (velocity, concentration, anomaly count, day-of-week distribution) rather than deriving these from the raw transaction array. This reduces Gemini's computational burden and improves insight specificity.

**Predictive analysis — monthly spend forecast:** Linear extrapolation of the current month's spend based on elapsed days. `projected = (current_spend / elapsed_days) × days_in_month`. Adjusted for known seasonal patterns if the user has 3+ months of history. Displayed as a range (±15% confidence interval) rather than a point estimate.

**Budget risk prediction:** Per-category projection compared against the user's trailing average for that category. A category that is running 40%+ above its trailing average with more than 15 days remaining in the month is flagged as a budget risk. No budget targets need to be set — the trailing average is the implicit budget. This avoids the YNAB problem of requiring users to set budgets before they understand their spending.

**Subscription detection (heuristic, not ML):** Transactions from the same merchant occurring on similar calendar dates (within ±3 days) in consecutive months, with amounts within 10% of each other, are classified as subscriptions. Minimum 2 occurrences required before flagging. Subscription total surfaced as a monthly fixed-cost metric.

**Financial Health Score v2:** Switches from fully AI-computed to hybrid. A deterministic algorithm computes consistency, diversification, and trend sub-scores. The anomaly sub-score remains AI-assisted because it requires qualitative judgment about the nature of spikes. The deterministic sub-scores are computed server-side in Python; the AI sub-score is fetched from Gemini. This reduces cost per insight generation by ~40%.

**AI-generated action recommendations:** Based on the insight set and score breakdown, Gemini generates 1–3 action recommendations. These are directional, not prescriptive. Examples: "Consider reviewing your Software & Subscriptions category — you're spending 35% more than last month." Not: "Cancel your Notion subscription." The product does not make specific decisions for users.

### Phase 3 Acceptance Criteria

- Personalized categorization accuracy for known merchants: ≥ 95%.
- Budget risk prediction: precision ≥ 70% (flagged categories that the user actually overruns).
- Subscription detection false positive rate: ≤ 10%.
- Health Score v2 deterministic sub-score computation: < 100ms at p95.

---

## 3.4 PHASE 4 — Production Scale

**Duration:** Ongoing. Begins when user base exceeds 1,000 active users.

**Gate:** Scale infrastructure is expensive to maintain. It should be built when the scale problem is real, not anticipated.

### Scope

**Database optimization:**

*Materialized views for analytics:* `mv_user_category_totals` (user + category + period + total_spend), `mv_user_merchant_frequency` (user + merchant + count + period). These are refreshed on a schedule (every 6 hours in V1, near-real-time in V2 via Postgres logical replication triggers). Dashboard summary queries read from these views instead of scanning the transactions table.

*Connection pooling:* PgBouncer enabled via Supabase's built-in pooler. Transaction-mode pooling for API routes (stateless), session-mode pooling for admin operations. Max connections per Supabase instance managed to avoid PostgreSQL connection saturation.

*Partitioning:* `public.transactions` partitioned by `(user_id, transaction_date)` using range partitioning. At 10,000 users with an average of 30 transactions/month, the table reaches 3.6M rows/year. Partitioning becomes necessary at ~5M rows.

**FastAPI service scaling:**

*Horizontal scaling:* FastAPI service scaled to multiple Railway instances behind a load balancer. Gemini API rate limits (1,000 RPM on paid tier) become the constraint before Railway instance count does. Rate limiting logic moves to a Redis-based token bucket at the application layer.

*Async processing for insights:* Insight generation moves from synchronous (blocking the request) to asynchronous (return immediately, process in background, notify client via React Query polling or Supabase Realtime subscription). This prevents insight generation from blocking the UI for 3–8 seconds.

*Queue for burst uploads:* A BullMQ queue (Redis-backed) absorbs upload bursts. At 10,000 users, peak upload times (evening, weekend) could spike to 500+ concurrent processing requests. The queue limits Gemini API calls to a sustainable rate without losing requests.

**Security hardening:**

*Rate limiting at the edge:* Vercel Edge Functions enforce rate limits before requests reach Next.js API routes. Free tier: 5 uploads/hour. Pro tier: 60 uploads/hour. Limits enforced by IP + user ID composite key.

*Secret rotation:* `FASTAPI_SECRET_KEY` and `GOOGLE_AI_API_KEY` rotation procedure documented and tested. Railway environment variable update does not require redeployment for FastAPI (environment variable update + graceful restart).

*Audit logging:* All write operations (upload, delete, category correction) logged to an append-only audit table with timestamp, user ID, action, and result. Used for dispute resolution and abuse investigation.

*GDPR compliance:* Account deletion purges all user data within 24 hours. Purge job is idempotent — can be retried safely. Purge confirmation email sent. Data export available on demand via the Settings page CSV export.

**Multi-user system:**

*Team workspace (Phase 4 / Business tier):* One organization account contains multiple member accounts. Members can upload and view transactions. The organization owner sees aggregate views. RLS policies extended: members access transactions in their organization, not just their own user ID. Implementation: `organizations` table + `organization_members` junction table. All existing RLS policies are AND-conditions with an organization membership check.

*Shared receipt upload:* Organization members upload to a shared receipt bucket. Transactions are attributed to the uploading member but visible to the organization owner.

### Phase 4 Acceptance Criteria

- API response time p95: ≤ 500ms for dashboard summary queries.
- Receipt processing time p95: ≤ 12 seconds end-to-end (consistent with Phase 1 — scale does not degrade this).
- Gemini API rate limit headroom: no more than 70% of available RPM consumed at peak.
- Queue depth (during burst): drains to 0 within 10 minutes of peak.
- Account deletion: all user data removed within 24 hours, confirmed by post-deletion query.

---

# SECTION 4 — FEATURE BREAKDOWN

## 4.1 Receipt Upload

**Description:** The primary input method. A user provides a receipt image or PDF. The system processes it through the full pipeline. This is the only data entry point in V1.

**Input:** Image file (JPEG, PNG, WebP) or PDF. Max 10MB. Uploaded via multipart form.

**Output:** Transaction record in database. Updated Intelligence Meter. Potential level unlock.

**Backend logic:**

1. MIME type validation — server-side. Client-reported MIME is ignored.
2. File size check — before any storage operation.
3. Free tier gate — check `profiles.total_receipts_uploaded` against plan limit.
4. Upload to Supabase Storage at `{user_id}/{uuid}/{timestamp}.{ext}`.
5. Create `receipts` row with `status='pending'`.
6. Forward base64 to FastAPI for pipeline stages 2–4.
7. On FastAPI success: return extraction + categorization to client.
8. Client invalidates query cache, re-renders dashboard.

**Edge cases:**
- PDF upload: FastAPI uses Pillow to convert the first page to a PNG before Gemini Vision call. Multi-page PDFs: only the first page is processed in V1.
- Duplicate upload: same receipt uploaded twice produces two transaction records. No deduplication in V1. Flagged for V2 (hash-based duplicate detection).
- Partial upload (connection lost mid-transfer): storage upload either completes or fails atomically at Supabase. If it fails, no receipt record is created and the user is prompted to retry.
- File is not a receipt (selfie, document, etc.): OCR extraction will produce low `raw_confidence`. Rejected at the 0.30 threshold with specific messaging.

**UI impact:** Upload modal with 6 distinct states (idle, preview, processing, results, upgrade\_prompt, error). Processing state shows animated pipeline steps. Results state shows extracted data before user confirmation.

---

## 4.2 OCR Processing

**Description:** Converts a receipt image into structured JSON using Gemini Vision. This is Stage 2 of the pipeline.

**Input:** Base64-encoded image. Receipt UUID.

**Output:** Structured extraction JSON stored in `receipts.gemini_response.extraction`. Passed to categorization.

**Backend logic:**

The Gemini prompt explicitly instructs the model to return null for uncertain fields rather than guessing. This is critical: a guessed merchant name or date that goes uncorrected pollutes the user's historical data permanently. Conservative extraction (more nulls) is preferable to aggressive extraction (more errors).

Currency inference: the model is instructed to infer currency from visual signals (₹ symbol, "Rs.", "INR" text, country signals in merchant name, address). Default to "INR" only when no signals are available.

Date parsing: if the receipt shows a date in DD/MM/YYYY format, the model converts to ISO 8601. If ambiguous (01/02/2025 could be 1 Feb or 2 Jan), the model returns the most culturally appropriate interpretation for Indian receipts (DD first) and flags with lower confidence.

**Edge cases:**
- Handwritten receipts: accuracy drops significantly. `raw_confidence` will reflect this.
- Thermal paper fading: older receipts where text has partially disappeared. Low `raw_confidence`. User is shown specific message about receipt condition.
- Receipt is in a regional language (Tamil, Bengali, etc.): Gemini 2.0 Flash handles multilingual input. Merchant names may be transliterated or translated. Accuracy lower than English-language receipts.
- Amount shows multiple totals (subtotal, tax, grand total): model is instructed to extract the grand total — the final amount paid.

**UI impact:** None directly visible. Processing state shows "Reading receipt image..." as the active step.

---

## 4.3 Transaction Engine

**Description:** Manages the normalized financial record derived from a receipt. The canonical unit of financial data in FinSight.

**Input:** Extraction JSON + Categorization JSON + Receipt UUID + User ID.

**Output:** `public.transactions` row. The source of truth for all analytics.

**Backend logic:**

Transaction records are immutable from the pipeline's perspective — the pipeline creates them, it does not update them. User corrections (Phase 2) create an audit trail by updating the `category` field and setting `is_manually_corrected = true`. The original AI-assigned category is preserved in `receipts.gemini_response.categorization`.

`transaction_date` fallback: if extraction returns null for `date`, the fallback is the database server's current date at the time the transaction row is inserted. This is a server-side value, not a client-provided one, to ensure consistency.

`amount = 0`: if extraction returns null for `total_amount`, the transaction is still created with `amount = 0.00`. The user is shown a flag in the receipt detail view indicating the amount could not be extracted. Zero-amount transactions are excluded from aggregate calculations in the dashboard summary query.

**Edge cases:**
- Very large amounts (₹10,00,000+): valid for business users. The `NUMERIC(12, 2)` column accommodates up to ₹9,999,999,999.99.
- Negative amounts (refunds, credits): the pipeline does not explicitly handle refund receipts in V1. Refund receipts produce positive amounts. V2 adds refund detection.
- Foreign currency: transaction stored with the currency code extracted by the model. Dashboard summaries are computed in the user's `currency_preference`. Currency conversion is not performed in V1 — foreign currency amounts are excluded from totals with a UI flag.

**UI impact:** Each transaction appears as a row in the Transaction Feed (dashboard) and in the Receipts page table. Category badge, confidence dot, and anomaly flag are derived from transaction fields.

---

## 4.4 Categorization System

**Description:** Maps a transaction to one of 12 system-defined categories with a confidence score.

**Input:** Extraction JSON from OCR stage.

**Output:** Category assignment with confidence score stored in `transactions.category` and `transactions.confidence`.

**Backend logic:**

The 12-category taxonomy is fixed in V1. Users cannot create custom categories. This constraint is intentional: a fixed taxonomy enables cross-user analytics in future phases and ensures category distribution charts are comparable across the user base. Custom categories are a V3 feature.

Prompt engineering for accuracy: the categorization prompt includes both the extraction JSON and a small set of hard-coded merchant→category mappings for high-volume Indian merchants (Swiggy, Zomato, Ola, Uber, BigBasket, Amazon). These mappings act as few-shot examples and anchor the model's categorization for common cases.

Confidence thresholding: below 0.50 → category = "Other". Between 0.50 and 0.75 → category assigned but flagged with amber ConfidenceDot in UI. Above 0.75 → high confidence, green ConfidenceDot.

**Edge cases:**
- Ambiguous merchant (e.g., "DMart" could be Food & Dining or Groceries): categorization prompt includes receipt type from extraction to disambiguate. DMart as `receipt_type = "grocery"` → Groceries.
- Business expense detection for common personal merchants: Uber Eats ordered at 11pm is likely personal; Uber Eats ordered at 1pm on a weekday for 4+ people may be business. The model uses amount, time (if available), and item count as signals. `is_business_expense` should be treated as a suggestion, not a determination.
- New merchant not in training data: the model categorizes based on the extracted merchant name semantics and receipt type. May have lower confidence. User correction captures the ground truth.

**UI impact:** CategoryBadge component uses the category string directly. Confidence dot uses the confidence float. Manual correction UI (Phase 2) allows category override with a dropdown of all 12 options.

---

## 4.5 Intelligence Meter

**Description:** FinSight's primary retention mechanic and identity component. A visual representation of the system's intelligence level that advances as receipt data accumulates.

**Input:** `profile.total_receipts_uploaded` (the count, not the level).

**Output:** A visual progress bar with level label, sub-label, and conditional animations.

**Backend logic:**

The intelligence level computation is deterministic and happens in the database via the `increment_receipt_count` SQL function. The function updates both `total_receipts_uploaded` and `intelligence_level` atomically. The UI derives the level from the count using `getIntelligenceLevel(count)` — a pure function — rather than reading `profile.intelligence_level`. This prevents UI-database divergence during the brief window between database write and cache invalidation.

**Level thresholds:**
```
0–2   → Level 1 "System Learning"
3–5   → Level 2 "Patterns Forming"
6–9   → Level 3 "Analysis Active"
10+   → Level 4 "Full Intelligence"
```

Thresholds are not configurable per-user. They are system constants. Adjusting them requires a deployment.

**Edge cases:**
- User deletes a receipt: `total_receipts_uploaded` does not decrement on deletion. Once a level is earned, it is not revoked. This is intentional — decrementing on deletion would penalize users for maintaining data hygiene.
- User deletes all receipts: Intelligence Meter remains at the earned level. Transaction history is gone, but the level persists.
- Free tier user hits 20-receipt limit: the meter can reach whatever level 20 receipts earns (Level 4), but further uploads are blocked until the next billing period or upgrade.

**UI impact:** Rendered in Sidebar (vertical variant) and Dashboard (horizontal variant). Level 1: amber pulse animation. Level 4: amber shimmer animation. Level change triggers the unlock animation sequence. Both variants are always rendered — they never disappear.

---

## 4.6 Insights Engine

**Description:** Generates natural-language financial insights from the transaction corpus. Produces the Financial Health Score and AI commentary.

**Input:** All transactions for the user in the selected time range (default 30 days). Minimum 3 transactions required.

**Output:** `public.insights` row with insight strings, health score, and score breakdown.

**Backend logic:**

Insight quality requirements enforced in the prompt:
- Each insight must begin with a specific data point (amount, percentage, count, date). "Your food spend increased" is rejected. "Food spending increased 18% from ₹6,200 to ₹7,316 over the past 30 days" is the target.
- Insights must be self-contained. The user reading an insight should not need to open another screen to understand it.
- Each insight must be under 20 words. Enforced by prompt instruction, not by post-processing truncation.

Health Score sub-score definitions:

*Consistency (30%):* Measures regularity of upload behavior. High consistency means the user uploads frequently and consistently, creating a reliable data stream. Formula: `(uploads_in_period / expected_uploads) * 100` where `expected_uploads` is computed from the user's established cadence. Score degrades if the cadence drops by more than 50% in the current period.

*Diversification (25%):* Measures spending spread. A healthy profile has spend distributed across several categories. Formula: inverse of the Herfindahl-Hirschman Index applied to category spend percentages. A user spending 80% in one category scores lower than a user spending 25% across four categories.

*Anomaly (25%):* Frequency and magnitude of spending anomalies. High anomaly frequency (>20% of transactions flagged) or high anomaly magnitude (average anomaly 5× baseline) produces a lower sub-score.

*Trend (20%):* Week-over-week spending direction over the past 4 weeks. A sustained upward trend with no apparent income event reduces the score. A stable or downward trend improves it.

**Edge cases:**
- User has all transactions in one category: diversification sub-score is 0. This is correct behavior — monoculture spending is genuinely not diverse.
- User uploads all 10 receipts in one day: consistency sub-score reflects this as a single upload session, not sustained engagement. Score correctly rewards consistent weekly uploads over burst uploads.
- Negative health score inputs (negative amounts from refunds in V2): excluded from score calculation with documented handling.

**UI impact:** Insight strings displayed in `InsightTextCard` components on the dashboard (Level 4) and Insights page. Health Score displayed as an SVG arc in `HealthScoreCard`. Sub-scores displayed as 5-dot indicators. AI commentary is the Gemini-generated one-sentence interpretation of the overall score.

---

## 4.7 Financial Health Score

**Description:** A composite 0–100 score representing the overall quality and health of the user's financial behavior as observable through their FinSight data.

**Input:** Transaction corpus (30d) + computed sub-scores.

**Output:** Integer 0–100. Score band. AI commentary (one sentence). Four sub-scores.

**Backend logic:**

Score band definitions:
```
80–100:  EXCELLENT — spending behavior is consistent, diverse, and stable
60–79:   GOOD      — minor concerns but overall healthy pattern
40–59:   FAIR      — notable issues in one or more sub-dimensions
0–39:    AT RISK   — significant behavioral concern visible in the data
```

The score is computed each time insights are generated. It is not stored as a real-time value — it is a snapshot tied to the `insights` row. Historical score trends are visible because previous `insights` rows are retained.

**Important constraint:** FinSight does not know the user's income, savings rate, net worth, or financial obligations. The Health Score reflects the quality of their spending behavior as observable from receipts only. It is not a credit score, a debt health indicator, or a wealth assessment. This must be communicated clearly in the UI (tooltip on the score explains the scope).

**Edge cases:**
- User with 10 receipts, all in one day: consistency sub-score will be low, but the score is not meaningless — it reflects the other three dimensions.
- User whose spending is perfectly stable (same amount, same categories, every week): high consistency, high diversification, low anomaly, flat trend. Score likely 75–85. Correct.
- First-time score (exactly 10 receipts): score is computed. It may not be representative yet. UI copy acknowledges this: "Your Health Score will improve in accuracy as you add more receipts."

**UI impact:** SVG arc rendered in `HealthScoreCard`. The arc animates from 0 to final value on first render (800ms spring). Score number uses Magic UI NumberTicker for counting animation. Band label color matches the score band semantic color. Sub-score dots fill left-to-right from the filled state.

---

## 4.8 Anomaly Detection

**Description:** Identifies individual transactions that deviate significantly from the user's established spending baseline in that category.

**Input:** Per-user, per-category transaction history. The anomalous transaction itself.

**Output:** `transactions.is_anomalous` boolean flag. UI flag on the transaction row.

**Backend logic (Phase 2):**

Statistical method: Z-score based on rolling 30-day mean and standard deviation per category per user. Threshold: Z-score > 2.5 (approximately 1.24% of transactions under a normal distribution would be flagged).

Minimum data requirement: 5 transactions in the category within the past 30 days. Below this threshold, no flagging occurs. This prevents single-transaction "anomalies" in a category the user has barely used.

Computation timing: anomaly detection runs at the time of transaction write — not in batch. After each new transaction is inserted, a Supabase database function checks the Z-score for that category and sets `is_anomalous = true` if the threshold is exceeded. This approach avoids a separate batch job and ensures anomaly flags appear immediately.

False positive management: a high-value one-time purchase (new laptop, medical procedure) will be flagged as anomalous. This is correct behavior — it is anomalous. The UI presents anomaly flags as "unusual" not "problematic." The interpretation is left to the user.

**Edge cases:**
- User starts spending in a new category: the 5-transaction minimum means no flagging for the first 5 transactions regardless of amount. This is correct — there is no baseline to compare against.
- Category becomes the new normal: if the user consistently makes large purchases in a category for 30 days, the mean and standard deviation adjust. What was previously anomalous becomes normal. The detection is adaptive, not static.
- Single very large transaction followed by normal purchases: the large transaction moves the mean and standard deviation, making the subsequent normal purchases appear low by comparison. This is a known limitation of Z-score methods and is acceptable in V1.

**UI impact:** Lucide `AlertTriangle` icon (warning-400 color) appears on the transaction row. On the Insights page, anomalous transactions surface in a dedicated callout using the Cherry Red & Butter Yellow secondary palette.

---

# SECTION 5 — USER JOURNEY

## 5.1 First-Time User Flow

**Arrival:** User lands on the FinSight landing page. The page communicates three things in order: what FinSight does (receipt → insight), that it learns with use (progressive intelligence), and that it is free to start.

**Signup:** Email signup or Google OAuth. For email signup: email verification required before first login. Google OAuth redirects immediately to dashboard.

**Onboarding (3 screens, cannot be skipped — shown once):**

Screen 1: "Upload a receipt → FinSight reads it." Shows the upload modal in preview state with a sample receipt image. The AI extraction animation plays automatically. This is not a tutorial — it is a demo of what will happen to their real receipts.

Screen 2: "The more you upload, the smarter FinSight gets." Shows the Intelligence Meter at 0%, then animates to Level 2 at ~40%, then to Level 4 at 100%. Shows the features that unlock at each level. This communicates the progression mechanic before they have experienced it.

Screen 3: "Upload your first receipt to begin." Full-screen upload CTA. The Intelligence Meter is at 0% in the sidebar behind the onboarding overlay. This creates an immediate visual representation of their starting state.

**First upload:** User uploads their first receipt. The full processing animation plays (orbital ring, three processing steps, step checkmarks). Results screen shows extracted data. User confirms. Meter advances to 15% (Level 1 with 1 receipt). Dashboard updates.

**First dashboard view:** Level 1 state. Meter at 15%. Transaction appears in Transaction Feed. KPI cards are skeleton loaders with teaser labels. Empty state for charts. Copy explains what will unlock with more receipts. User is given immediate value (their receipt is processed, stored, accessible) with a clear path to more value.

## 5.2 Upload Experience

The upload experience is the core interaction of FinSight. It must feel effortless and fast.

**Trigger:** "Upload Receipt" button in sidebar (desktop) or bottom nav (mobile). The button is always amber, always visible, always accessible regardless of the current page or intelligence level.

**Drop zone → Preview:** User drops or selects a file. Image renders in preview area. Confirm button is available. User should not need to crop or rotate in V1 — the AI handles tilted receipts.

**Preview → Processing:** User clicks Confirm. Modal transitions to Processing state. The three-step animation begins. The orbital amber ring spins. This animation plays regardless of how fast the actual API responds — it runs for a minimum of 1.6 seconds (the duration of three 800ms steps) before transitioning to Results, even if the API returns faster. This prevents jarring instant transitions that make the AI feel less intelligent than it is.

**Processing → Results:** Extracted data displays. Merchant, amount, date, category, confidence bar. If the user spots an error in the extracted data, they cannot correct it on this screen in V1 — they confirm and correct via the receipt detail page (Phase 2 adds inline correction). The "Confirm & Save" button is primary, amber. "Try Again" is ghost text.

**Results → Confirmation:** User clicks Confirm & Save. Receipt is already in the database at this point (it was saved in the pipeline). The modal closes. Dashboard updates. If this upload triggered a level unlock, the unlock animation fires.

## 5.3 Returning User Experience

**Login:** Returns to the dashboard in its current intelligence level state. The last session's data is exactly as they left it — no re-loading, no re-prompting, no re-onboarding.

**What the system communicates to a returning user:**

The Intelligence Meter shows their current level. Sub-label shows how many more receipts until the next level (or "All capabilities active" at Level 4). This answers the returning user's implicit question: "Where am I in the progression?"

If the user has not uploaded in 7+ days: a nudge appears in the dashboard header (not a modal, not a blocking overlay) — "It's been 7 days since your last upload. Upload a receipt to keep your insights current." This is dismissible and does not reappear for 3 days after dismissal.

Recent transactions appear in the Transaction Feed immediately — no loading state if data is cached. The dashboard feels instant because React Query's stale-while-revalidate behavior shows cached data while refreshing in the background.

## 5.4 Intelligence Progression Journey (Level 1 → Level 4)

The progression from Level 1 to Level 4 is the core retention mechanic. The experience at each level must feel qualitatively different — not just quantitatively more data.

**Level 1 — The seed is planted.** The user has 0–2 receipts. The system shows their receipt data but makes no aggregated claims. The Intelligence Meter is at 0–15%, pulsing amber. The copy is honest: "FinSight is learning from your receipts." Individual receipts are accessible. No trends, no scores. The user is shown exactly what will unlock at Level 2. The value at this level is: receipt digitization and searchability. This is genuinely useful even in isolation.

**Level 2 — The system speaks for the first time.** At receipt 3, the KPI cards unlock. Total spend. Top category. Average transaction. These are not charts — they are text. But they are the first time the system has synthesized data across multiple receipts into a statement. The copy says "Patterns are forming." The Intelligence Meter is at 40%. The unlock animation is the first moment the system feels alive. Users who reach Level 2 are significantly more likely to continue uploading than users who stall at Level 1.

**Level 3 — The system shows, not just tells.** At receipt 6, the charts unlock. The donut chart and area chart are the first visual intelligence outputs. The user can see their spending distribution. They can see whether their spending is trending up or down. Top merchants appear. This is where FinSight starts to feel like a distinct product rather than a receipt organizer with formatting. The Intelligence Meter is at 70%.

**Level 4 — The system becomes a co-pilot.** At receipt 10, the Financial Health Score appears. This is the hero moment of the product. The score arc animates from 0 to the user's actual score. The band (GOOD, EXCELLENT, etc.) appears. Anomaly flags appear on transaction rows. AI commentary appears. The Intelligence Meter reaches 100% with the amber shimmer animation. The meter's "FULL INTELLIGENCE" label becomes true. From this point, the system improves in quality (not capability) as more data accumulates.

## 5.5 Emotional Experience Design

The emotional arc of FinSight's user experience is a progression from curiosity to trust to reliance.

**Curiosity (upload 1–2):** "What does it actually do with my receipt?" The processing animation answers this. The results screen answers this. The user is surprised by how much the system extracted. They feel informed without having done any work. This is the hook.

**Validation (upload 3–5):** "It actually got my categories right." The categorization results are generally accurate. Users begin to see their spending categorized correctly without intervention. Trust forms. The Level 2 unlock animation is celebratory — the system has earned a small moment of celebration.

**Revelation (upload 6–9):** "I didn't realize I spent that much on food delivery." The charts at Level 3 make patterns visible that were invisible before. This is the moment most users articulate: "I knew I was spending too much on X, but seeing it in a chart made it real." The system has transformed from a tool to a mirror.

**Dependence (upload 10+):** "I check FinSight before the end of the month to see how I'm doing." The Health Score gives users a single number they can track over time. Monthly score improvement becomes a goal. The system has become a habit — not because it was gamified, but because it provides information the user genuinely wants.

---

# SECTION 6 — SUCCESS METRICS

## 6.1 Phase 1 Success Metrics

### Acquisition
- Weekly new signups: baseline week 1, target 20% week-over-week growth through week 8.
- Signup → first upload rate within 24 hours: target ≥ 60%. Below 40% indicates onboarding failure.
- Landing page → signup conversion: target ≥ 15%.

### Activation
- Time from signup to first receipt analyzed: target median ≤ 15 minutes.
- First receipt OCR success rate (raw_confidence ≥ 0.30): target ≥ 90%. Below 85% indicates image quality guidance is insufficient.
- First receipt categorization accuracy (user-assessed via correction rate): target ≤ 15% correction rate.

### Technical
- Receipt processing time p50: ≤ 6 seconds. p95: ≤ 12 seconds.
- API uptime: ≥ 99.5% (measured as successful requests / total requests).
- FastAPI error rate (5xx responses): ≤ 1% of processing requests.

### Intelligence Level Progression
- % of activated users reaching Level 2 within first session: target ≥ 40%.
- % of activated users reaching Level 2 within first week: target ≥ 60%.
- Level 2 → Level 3 completion rate: target ≥ 50%.
- Level 3 → Level 4 completion rate: target ≥ 40%.

These rates compound. A product achieving 60% Level 2, 50% Level 3, 40% Level 4 will have 12% of activated users reach Level 4. That 12% is the highest-retention, highest-value cohort in the product.

## 6.2 Phase 2 Success Metrics

### Engagement Depth
- Weekly Active Uploads per Level 4 user: target ≥ 4 uploads/week. Level 4 users who upload fewer than 1/week are at churn risk.
- Dashboard sessions per week per Level 3+ user: target ≥ 2.5.
- Manual category correction rate: target ≤ 10%. Below this means the AI is accurate. Above 20% means the categorization model needs prompt engineering.

### Data Quality
- Anomaly detection precision (correctly flagged transactions that user confirms as unusual): target ≥ 70%.
- Anomaly detection recall (anomalous transactions the user would have flagged that the system detected): target ≥ 60%.

These targets acknowledge that ground truth is hard to establish without user feedback. Phase 2 adds an "Is this anomaly correct?" micro-survey on anomaly callouts.

### Email Digest
- Digest email open rate: target ≥ 35%.
- Digest email click-through to dashboard: target ≥ 15%.

## 6.3 Phase 3 Success Metrics

### Intelligence Accuracy
- Personalized categorization accuracy for known merchants: target ≥ 95%.
- Subscription detection precision: target ≥ 90%. False positives (non-subscriptions flagged as subscriptions) are worse than false negatives here.
- Budget risk prediction precision: target ≥ 70%.

### Recommendation Quality
- User-initiated action after seeing a recommendation: target ≥ 20% of recommendation views result in the user navigating to the related category in Insights. This is a proxy for recommendation relevance.

### Monetization
- Free-to-Pro conversion rate: target ≥ 8% within 30 days of activation.
- Pro plan monthly churn: target ≤ 4%.

## 6.4 Phase 4 Success Metrics

### Scale Performance
- API p95 response time under 5,000 concurrent users: ≤ 500ms for dashboard reads.
- Receipt processing queue drain time after burst (500 concurrent submissions): ≤ 10 minutes.
- Database query time for dashboard summary at 10M rows: ≤ 200ms (after materialized view optimization).

### Security
- Security incidents (unauthorized data access): 0.
- Account deletion SLA (data purged within 24 hours): 100% compliance.
- FASTAPI_SECRET_KEY rotation: 100% success rate with zero downtime.

---

# SECTION 7 — RISKS AND LIMITATIONS

## 7.1 OCR Accuracy Risks

**Risk:** Gemini Vision produces inaccurate extraction for certain receipt types, creating incorrect transaction data that propagates into analytics.

**Manifestation scenarios:**

*Thermal paper receipts:* The most common receipt type in Indian retail. Thermal printing fades over time and in heat. A 3-month-old Ola receipt may be completely unreadable. `raw_confidence` will typically be below the 0.30 threshold, preventing bad data from entering the system. But marginal cases (confidence 0.35, partially faded) may produce incorrect amounts.

*Handwritten receipts:* Prevalent in small businesses, local vendors, medical practitioners. Accuracy drops significantly for handwriting. The extraction produces a best-effort result with lower confidence. In V1, there is no separate handling for handwritten receipts — they go through the same pipeline with typically lower confidence scores.

*Receipts in regional scripts:* Gemini 2.0 Flash has multilingual capability, but accuracy for Tamil, Bengali, Kannada scripts in receipt context is lower than for English or Hindi. Merchant names may be transliterated incorrectly. Amounts (which use numerals) are typically unaffected.

**Mitigation:** The 0.30 confidence threshold rejects the worst cases. The UI surfaces `raw_confidence` as a visual cue (ConfidenceDot). Manual correction (Phase 2) allows users to fix incorrect extractions. No extraction error is permanent.

**Limitation acknowledgment:** FinSight will never achieve 100% OCR accuracy. The 90% target for clear receipts is realistic. Users with high proportions of handwritten, faded, or regional-language receipts will experience lower accuracy. This limitation is disclosed in the product.

## 7.2 Data Inconsistency Risks

**Risk:** Duplicate transactions, incorrect dates, or currency mismatches corrupt the user's financial data.

**Duplicate transactions:** The most common path is a user uploading the same receipt twice. In V1, no deduplication exists. Two transaction records are created. The user's total spend calculation is doubled for that transaction. Detection: two transactions from the same merchant on the same date with the same amount within 24 hours. Deduplication (Phase 2) will flag these for user review — not automatic deletion, because the user may have genuinely made two purchases.

**Incorrect date fallback:** When a receipt has no readable date, the system uses today's date. If the user is uploading a 3-month-old receipt, the transaction is dated to today and appears in the current month's analytics rather than the historical month. In V1, the user can correct the date via the receipt detail page. The system does not warn the user that a date fallback occurred — this is a V2 improvement.

**Currency mismatch:** If the model incorrectly identifies a currency (e.g., misreading a local currency symbol as INR), the transaction amount will be in the wrong currency with no conversion. For INR-primary users making occasional foreign purchases, this will inflate the total spend metric. In V1, foreign currency transactions are excluded from aggregate totals with a UI flag.

## 7.3 Categorization Errors

**Risk:** Transactions are assigned to incorrect categories, corrupting the category distribution analytics.

**High-error categories:** The taxonomy's hardest categories to distinguish are Food & Dining vs. Groceries (both are food-related), Shopping & Retail vs. Business & Professional (business purchases at retail stores), and Transportation vs. Travel & Accommodation (Uber trips vs. inter-city bus tickets).

**Impact of errors:** A transaction miscategorized from Groceries to Food & Dining shifts 2% from one slice to another in the donut chart. At low transaction volumes (Level 1–2), a single miscategorization moves the chart significantly. At Level 4, the law of large numbers dampens the impact.

**Mitigation strategy:** Below 0.75 confidence, the amber ConfidenceDot signals to the user that they should verify the category. Manual correction (Phase 2) closes the loop. The correction is stored and used as context in future categorization calls for the same merchant.

**Model drift:** Gemini's categorization behavior may change between model versions. When Google updates the underlying model, categorization patterns may shift. Mitigation: the prompt specifies the taxonomy explicitly and includes hard-coded examples. The categorization accuracy metric (tracked in Phase 2) would detect drift within one billing period.

## 7.4 Cold Start Problem

**Risk:** At Level 1 (0–2 receipts), the product provides insufficient value to motivate continued use. Users who experience Level 1 as their final state are lost.

**The cold start gap:** The Level 1 → Level 2 transition requires 3 receipts. For a user who uploads weekly, this takes 3 weeks. For a user who uploads in bursts, they may upload 5 receipts on day 1. The onboarding experience must motivate users to upload at least 3 receipts in their first session — or return to upload 2 more in their second session.

**Mitigation approaches:**

*Visible teaser state:* Level 1 KPI cards are skeleton loaders with real labels but no data. This communicates what will appear rather than showing a blank space. Users can see what they are 2 receipts away from.

*Explicit next-step communication:* The Intelligence Meter sub-label at Level 1 says exactly what unlocks at the next level and exactly how many receipts are required. Ambiguity kills motivation.

*Immediate individual-receipt value:* Even at Level 1, each processed receipt is accessible, searchable, and categorized. The receipt is no longer a paper artifact — it is a digital record. This is immediate value regardless of the intelligence level.

*First session upload nudge:* The onboarding completion screen shows the upload modal immediately. Users who upload during onboarding are significantly more likely to continue.

**Limitation:** Some users will upload one receipt, decide the product is not for them, and leave. This is acceptable. The product is not for everyone. The cold start mitigation targets users who would benefit from FinSight but abandon before experiencing the value.

## 7.5 Scaling Challenges

**Risk:** At 10,000+ users, the synchronous receipt processing architecture produces unacceptable latency, queue buildup, and Gemini API rate limit violations.

**Gemini API rate limits:** The paid tier supports 1,000 RPM. At 10,000 users each uploading 1 receipt at peak time (estimated 500 concurrent users in the peak hour), the API call volume is 1,000+ per minute (2 calls per receipt). This approaches the rate limit ceiling.

**Mitigation (Phase 4):** BullMQ queue absorbs burst uploads. The queue worker processes receipts at a rate below the Gemini rate limit. Users see a "Processing (1 of 3 in queue)" status rather than a spinner. This is a UX change — processing is no longer instant — but it is preferable to rate limit errors.

**Database connection saturation:** Supabase PostgreSQL supports a fixed number of connections per plan. At 10,000 users with concurrent activity, the connection count can exceed the limit without PgBouncer. Mitigation: PgBouncer enabled by default on Supabase. Connection limits set in the application layer.

**FastAPI single point of failure:** A single Railway instance fails silently if the process crashes. Railway's auto-restart recovers it, but receipts in processing during the crash are left in `status='processing'` permanently. Mitigation (Phase 4): a background health job marks receipts that have been in `processing` for more than 5 minutes as `failed` so users can retry.

## 7.6 Misleading Insights Risk

**Risk:** Gemini generates insight strings that are factually incorrect, statistically misleading, or misinterpreted by users as financial advice.

**Factually incorrect insights:** If Gemini hallucinates a number not present in the transaction data, the insight will be wrong. Mitigation: the insight prompt explicitly instructs the model to use only the provided transaction data and to cite specific amounts and percentages. Post-processing validates that numbers cited in insights actually appear in the transaction data.

**Statistical misleading:** At low data volumes, patterns are not statistically significant. "Your food spending increased 40%" based on 2 transactions compared to 1 is technically accurate but not meaningful. Mitigation: insights are gated to Level 4 (10+ receipts) by default. Insights at lower levels are simpler, factual statements ("Your top category this month is Food & Dining with ₹4,200 spent") rather than trend claims.

**Misinterpretation as advice:** Users may interpret a Financial Health Score of 45 ("FAIR") as a signal that they have a financial problem requiring professional intervention. FinSight's Health Score reflects the quality of spending behavior as visible in the product's data — not the user's overall financial health. A user saving 40% of income and spending lavishly on food would score poorly on diversification and trend metrics, yet be financially healthy overall. Mitigation: the Health Score UI includes a tooltip explaining its scope. The score bands use neutral language (GOOD, FAIR, AT RISK) rather than alarming language (EXCELLENT, POOR, CRITICAL).

**The fundamental limitation:** FinSight cannot see income, savings, investments, debt, or obligations. The insights it generates are observations about spending behavior through the lens of the data the user has provided. This scope limitation is communicated in the product, but some users will interpret the insights more broadly. This is a risk inherent to any partial-information intelligence system.

---

# APPENDIX — ALIGNMENT VERIFICATION

## Intelligence-Based UI Alignment

| PRD Requirement | Implementation |
|---|---|
| System feels like it is learning | Intelligence Meter advances; Level labels communicate system state; unlock animation fires on level change |
| Progressive unlocking | Capabilities gated by `total_receipts_uploaded` via deterministic `getIntelligenceLevel()` function |
| Data-driven experience evolution | Each intelligence level exposes qualitatively different capabilities, not just more data |
| System is "waking up" | Level 1: learning. Level 2: forming. Level 3: active. Level 4: full intelligence. States are communicated explicitly |

## Phase-to-Outcome Mapping

| Phase | Core Outcome | User Value |
|---|---|---|
| Phase 1 | End-to-end pipeline live | "My receipts are organized and categorized automatically" |
| Phase 2 | Pattern detection and anomaly detection | "I can see when something is wrong with my spending" |
| Phase 3 | Predictive intelligence and personalization | "FinSight knows my patterns and tells me where I'm heading" |
| Phase 4 | Scale and team features | "My team uses it and I see the aggregate" |

## Non-Negotiable Product Constraints

These constraints cannot be removed from any phase without explicit product approval:

1. The pipeline must be end-to-end with real data. No mocked OCR results, no hardcoded categories.
2. Intelligence level cannot decrease. Once earned, it persists regardless of receipt deletion.
3. No financial advice. FinSight presents observations; users make decisions.
4. Data isolation via RLS. No user can access another user's data.
5. The free tier limit must be enforced server-side. Client-side enforcement is not acceptable.
6. OCR results below 0.30 confidence must be rejected. No silent degraded quality.

---

*End of FinSight Product Requirements Document v2.0.0*
*This document supersedes PRD.md v1.0.0 for all product decisions.*
*Architecture decisions: TECH_STACK.md v1.1*
*UI decisions: UI_GENERATOR_SPEC.md v2.0*
*Implementation sequencing: STAGE_GUIDE.md v1.1*
