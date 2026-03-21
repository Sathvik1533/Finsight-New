# FINSIGHT — WORKFLOW.md
## System Flows & Execution Sequences
```
Version:        1.0.0
Classification: Internal — Engineering Reference
Consumes:       TECH_STACK_v2.md · PRD_v2.md · STAGE_GUIDE.md v1.1
Audience:       Backend engineers · Frontend engineers · Integration engineers
```

---

## READING GUIDE

Each workflow is broken into **execution layers** (Browser → Next.js BFF → FastAPI → External Service → DB) and presented as sequential numbered steps with arrows showing data movement. Timing estimates are included where they matter for UX decisions. Error paths are branched inline — not separated into a different section.

**Arrow notation:**
```
→   Data moves to the next step
⇢   Data moves to an external service (AI provider, Supabase)
✗   Step fails — follow the ERROR branch
↩   Data returns from a previous layer
⊙   Step is non-blocking (fire-and-forget)
⟳   Step is async (client polls or subscribes for result)
```

---

# WORKFLOW 1 — RECEIPT UPLOAD (SYNCHRONOUS PIPELINE)

## 1.1 Overview

This is the most critical workflow in the system. It is synchronous end-to-end: the browser waits for the complete result before transitioning the upload modal from PROCESSING to RESULTS. The pipeline spans three execution environments and three AI providers.

**Total expected duration:**
- p50: 3–6 seconds
- p95: 8–12 seconds
- Hard timeout: 12 seconds on FastAPI side; 60 seconds on Vercel BFF

---

## 1.2 Full Upload Flow

```
BROWSER
  │
  [1] User selects or drops a receipt file in the UploadModal
  │   File is held in local state — not yet sent anywhere
  │
  [2] User clicks "Confirm" in the PREVIEW state
  │   → useUpload.uploadReceipt(file) is called
  │   → setState('uploading')
  │   → processingStep timer starts: step 1 at 0ms, step 2 at 800ms, step 3 at 1600ms
  │   → FormData is constructed: formData.append('receipt', file)
  │
  [3] fetch('POST /api/receipts/upload', { body: formData }) fires
  │   → Upload modal transitions to PROCESSING state
  │   → Orbital ring animation starts (CSS)
  │   → Processing step indicators begin advancing
  │
  ─────────────────────────────────────────────────────────────────
  NEXT.JS BFF  [Vercel serverless]
  ─────────────────────────────────────────────────────────────────
  │
  [4] Session extraction
  │   → supabase.auth.getSession() reads httpOnly cookie
  │   → Extracts session.user.id → userId
  │   ✗ No session → return 401 { error: 'Unauthorized' } → browser shows error state
  │
  [5] Free tier gate check
  │   ⇢ SELECT subscription_tier, total_receipts_uploaded FROM profiles WHERE id = userId
  │   → If subscription_tier = 'free' AND total_receipts_uploaded >= 20:
  │       return 402 { error: 'Free tier limit reached', code: 'LIMIT_REACHED' }
  │       → browser transitions modal to UPGRADE_PROMPT state (not ERROR)
  │
  [6] File validation (server-side — client MIME type is ignored)
  │   → MIME type check: file.type must be in ['image/jpeg','image/png','image/webp','application/pdf']
  │   ✗ Invalid MIME → return 400 { error: 'Invalid file type' }
  │   → File size check: file.size ≤ 10 * 1024 * 1024 (10MB)
  │   ✗ Too large → return 400 { error: 'File too large — max 10MB' }
  │
  [7] Generate IDs server-side
  │   → receiptId = crypto.randomUUID()  [Next.js generates — not the DB]
  │   → timestamp = Date.now()
  │   → storagePath = `${userId}/${receiptId}/${timestamp}.jpg`
  │
  [8] Upload file buffer to Supabase Storage
  │   ⇢ supabase.storage.from('receipts').upload(storagePath, fileBuffer, { contentType: file.type })
  │   ✗ Storage error → return 500 { error: 'Storage upload failed' }
  │       → No receipt record created. User prompted to retry.
  │
  [9] Create receipt record in database
  │   ⇢ INSERT INTO receipts (id, user_id, storage_path, status)
  │       VALUES (receiptId, userId, storagePath, 'pending')
  │   → Receipt is now in 'pending' state
  │
  [10] Encode file buffer to base64
  │    → imageBase64 = Buffer.from(fileBuffer).toString('base64')
  │    → The base64 string is NOT stored permanently — only used for this request
  │
  [11] POST to FastAPI AI service
  │    ⇢ fetch(`${FASTAPI_INTERNAL_URL}/analyze/receipt`, {
  │         method: 'POST',
  │         headers: {
  │           'Content-Type': 'application/json',
  │           'X-Internal-Secret': FASTAPI_SECRET_KEY  ← server-only env var
  │         },
  │         body: JSON.stringify({ image_base64, user_id: userId, receipt_id: receiptId })
  │       })
  │    → BFF now awaits FastAPI response (synchronous wait, up to 60s Vercel limit)
  │
  ─────────────────────────────────────────────────────────────────
  FASTAPI SERVICE  [Railway persistent container]
  ─────────────────────────────────────────────────────────────────
  │
  [12] Internal secret validation
  │    → Compare X-Internal-Secret header against FASTAPI_SECRET_KEY env var
  │    ✗ Mismatch → return 401 immediately. No processing occurs.
  │
  [13] Pydantic request validation
  │    → Validate image_base64 is valid base64 encoding
  │    → Validate user_id and receipt_id are valid UUID format
  │    ✗ Validation fails → return 422 with Pydantic error detail
  │
  [14] Mark receipt as processing
  │    ⇢ UPDATE receipts SET status='processing' WHERE id = receipt_id
  │    → This is a write checkpoint: if the service crashes after this,
  │      a recovery job can find receipts stuck in 'processing' for > 5 minutes
  │
  [15] Image decoding
  │    → base64.b64decode(image_base64) → bytes
  │    → Image.open(io.BytesIO(image_bytes)) → PIL Image object
  │    → If file is PDF: extract first page as PNG using Pillow
  │    ✗ Decode error → mark receipt 'failed', return 500
  │
  ── STAGE 1: OCR EXTRACTION ──────────────────────────────────────
  │
  [16] Call NVIDIA NIM Llama 3.2 90B Vision
  │    ⇢ nim_client.chat.completions.create(
  │         model="meta/llama-3.2-90b-vision-instruct",
  │         messages=[{ role:"user", content:[{image_url}, {text: OCR_PROMPT}] }],
  │         temperature=0.0,
  │         response_format={"type":"json_object"},
  │         timeout=12.0
  │       )
  │    → Expected latency: 1,500–3,500ms
  │    ✗ Timeout (>12s) → mark receipt 'failed', return 504 "AI provider timeout"
  │    ✗ API error → mark receipt 'failed', return 500
  │
  [17] Parse OCR response
  │    → Strip markdown code fences if present (Gemini-compatible fence stripping)
  │    → json.loads(response.choices[0].message.content) → extraction dict
  │    ✗ JSON parse error → mark receipt 'failed', log raw response, return 500
  │
  [18] Confidence threshold check
  │    → extraction['raw_confidence'] < 0.30 ?
  │    ✗ YES → raise ValueError("Receipt image quality too low for extraction")
  │              → mark receipt 'failed', processing_error = str(e)
  │              → return 422 { detail: "Receipt image quality too low" }
  │              → browser shows ERROR state with "try a clearer photo" message
  │    → NO → proceed to categorization
  │
  ── STAGE 2: CATEGORIZATION ──────────────────────────────────────
  │
  [19] Fetch user merchant context (Phase 2+)
  │    ⇢ SELECT DISTINCT merchant, category FROM transactions
  │        WHERE user_id = user_id AND is_manually_corrected = TRUE
  │        ORDER BY COUNT(*) DESC LIMIT 5
  │    → user_context = { "Swiggy": "Food & Dining", ... }
  │    → Empty dict for new users (no additional prompt tokens for empty context)
  │
  [20] Call Groq Llama 3.3 70B
  │    ⇢ groq_client.chat.completions.create(
  │         model="llama-3.3-70b-versatile",
  │         messages=[
  │           { role:"system", content: CATEGORIZATION_SYSTEM_PROMPT + context_block },
  │           { role:"user",   content: f"Transaction data: {json.dumps(extraction)}" }
  │         ],
  │         temperature=0.0,
  │         response_format={"type":"json_object"},
  │         timeout=5.0
  │       )
  │    → Expected latency: 200–400ms
  │    ✗ Timeout (>5s) → mark receipt 'failed', return 504
  │    ✗ API error → mark receipt 'failed', return 500
  │
  [21] Apply confidence threshold
  │    → categorization['confidence'] < 0.50 ?
  │    → YES → override: categorization['category'] = 'Other'
  │             (store actual confidence value — do not modify it)
  │    → NO → use model-assigned category
  │
  ── STAGE 3: PERSISTENCE ─────────────────────────────────────────
  │
  [22] Resolve transaction_date
  │    → extraction.get('date') is not None → use extracted date
  │    → extraction.get('date') is None     → use CURRENT_DATE (server-side SQL)
  │    → NEVER use Python datetime.now() for fallback date — SQL CURRENT_DATE is timezone-safe
  │
  [23] Insert transaction row
  │    ⇢ INSERT INTO transactions (
  │         user_id, receipt_id, merchant, amount, currency,
  │         transaction_date, category, subcategory, confidence,
  │         categorization_model, is_business_expense
  │       ) VALUES (...)
  │    → amount defaults to 0.00 if extraction['total_amount'] is None
  │    → categorization_model = 'groq-llama-3.3-70b'
  │    ✗ Insert error → mark receipt 'failed', return 500
  │       (transaction was not created — no orphaned data)
  │
  [24] Update receipt row to complete
  │    ⇢ UPDATE receipts SET
  │         status='complete',
  │         processed_at = datetime.now(timezone.utc).isoformat(),  ← NOT the string "now()"
  │         raw_ocr_text = extraction.get('merchant', ''),
  │         ai_model_used = 'nvidia-llama-3.2-90b',
  │         ocr_confidence = extraction.get('raw_confidence'),
  │         gemini_response = {
  │           extraction:        extraction_dict,
  │           categorization:    categorization_dict,
  │           processing_time_ms: int((time.time() - start_time) * 1000)
  │         }
  │       WHERE id = receipt_id
  │
  [25] Increment receipt count + recalculate intelligence level
  │    ⇢ SELECT increment_receipt_count(user_id)
  │    → This SQL function atomically:
  │         SET total_receipts_uploaded = total_receipts_uploaded + 1
  │         SET intelligence_level = CASE
  │           WHEN total_receipts_uploaded + 1 >= 10 THEN 4
  │           WHEN total_receipts_uploaded + 1 >= 6  THEN 3
  │           WHEN total_receipts_uploaded + 1 >= 3  THEN 2
  │           ELSE 1 END
  │
  ── STAGE 4: DECISION ENGINE (NON-BLOCKING) ──────────────────────
  │
  [26] Fire background task ⊙
  │    → asyncio.create_task(run_decision_engine(user_id))
  │    → This task runs AFTER the response is returned — it does NOT block
  │    → See Workflow 3 for the full Decision Engine flow
  │
  ── RESPONSE ─────────────────────────────────────────────────────
  │
  [27] Return result to Next.js BFF
  │    ↩ {
  │         status:             "success",
  │         extraction:         { merchant, total_amount, currency, date, ... },
  │         categorization:     { category, confidence, reasoning, is_business_expense },
  │         processing_time_ms: number
  │       }
  │
  ─────────────────────────────────────────────────────────────────
  NEXT.JS BFF  [resumed after FastAPI await]
  ─────────────────────────────────────────────────────────────────
  │
  [28] Pass FastAPI response to browser
  │    ↩ return NextResponse.json({ success: true, receipt_id, ...fastApiResult })
  │
  ─────────────────────────────────────────────────────────────────
  BROWSER  [resumed after fetch() resolves]
  ─────────────────────────────────────────────────────────────────
  │
  [29] useUpload hook receives response
  │    → data = await response.json()
  │    → setState('complete')
  │    → setResult(data)
  │    → Upload modal transitions from PROCESSING to RESULTS state
  │
  [30] React Query cache invalidation (sequential)
  │    → queryClient.invalidateQueries(['user', 'profile'])
  │       → triggers background refetch of profile
  │    → queryClient.invalidateQueries(['dashboard', 'summary'])
  │    → queryClient.invalidateQueries(['receipts'])
  │
  [31] Profile refetch completes
  │    → New profile.total_receipts_uploaded arrives
  │    → useIntelligenceLevel(profile) recomputes:
  │         previousLevel = getIntelligenceLevel(oldCount)
  │         newLevel      = getIntelligenceLevel(newCount)
  │
  [32] Intelligence level unlock check
  │    → newLevel > previousLevel ?
  │    → YES → Trigger unlock animation sequence:
  │               T+0ms:   IntelligenceMeter fills to new percentage (spring animation)
  │               T+0ms:   Gold flash at fill tip (opacity 0→0.6→0, 400ms)
  │               T+300ms: New components enter viewport at hidden state
  │               T+400ms: First component: unlockReveal (spring stiffness:400 damping:30)
  │               T+470ms: Second component (+70ms stagger)
  │               T+540ms: Third component (+70ms stagger)
  │               T+900ms: If Level 4 → Magic UI Confetti fires once (amber palette)
  │    → NO → Dashboard re-renders with updated data, no animation
  │
  [33] User sees RESULTS state in modal
  │    → Merchant, amount, date, category badge, confidence bar displayed
  │    → "Confirm & Save" button (primary amber) — data is ALREADY saved; this just closes modal
  │    → "Try Again" button (ghost) — resets modal to IDLE state
  │
  [END] Upload workflow complete
```

---

## 1.3 Upload Flow Timing Breakdown

```
Step 1–3:   < 100ms   User interaction + fetch initiation
Step 4–10:  100–500ms Session check + file validation + storage upload
Step 11:    ---        BFF awaits FastAPI (this blocks for steps 12–27)
Step 12–15: < 100ms   FastAPI validation + image decode
Step 16–18: 1500–3500ms NVIDIA NIM OCR (dominant bottleneck)
Step 19:    20–50ms   Groq context fetch from DB
Step 20–21: 200–400ms Groq categorization
Step 22–25: 50–150ms  All Supabase writes
Step 26:    < 1ms     Background task spawn (non-blocking)
Step 27–28: < 10ms    Response construction + return
Step 29–33: < 500ms   Browser state updates + cache invalidation

TOTAL CRITICAL PATH: ~2,000–4,500ms (p50) | ~6,000–8,000ms (p95)
```

---

# WORKFLOW 2 — INSIGHTS GENERATION

## 2.1 Overview

Insights generation is **event-driven**, not continuous. It is never triggered automatically on every upload. It is triggered by:
- User explicitly clicking "Refresh Insights" on the Insights page
- User reaching a new intelligence level for the first time (maximum 3 times per user lifetime)
- Background scheduler: daily, Pro users only (Phase 4)

The insight generation call to Gemini is **synchronous from the API perspective** (the HTTP request waits for Gemini), but from the user's perspective it is initiated by a button click and shows a loading state — not triggered in the upload flow's critical path.

---

## 2.2 User-Triggered Insights Flow

```
BROWSER
  │
  [1] User clicks "Refresh Insights" button on /insights page
  │   → React Query mutation fires: useMutation(() => refreshInsights())
  │   → Button enters loading state (spinner, disabled)
  │
  [2] fetch('POST /api/insights') fires
  │
  ─────────────────────────────────────────────────────────────────
  NEXT.JS BFF
  ─────────────────────────────────────────────────────────────────
  │
  [3] Session validation
  │   → Extract userId from session cookie
  │   ✗ No session → 401
  │
  [4] Fetch transaction corpus
  │   ⇢ SELECT * FROM transactions
  │       WHERE user_id = userId
  │         AND transaction_date >= NOW() - INTERVAL '30 days'
  │       ORDER BY transaction_date DESC
  │   → transactions = array of transaction objects
  │   → If len(transactions) < 3: return early with empty insight set (no Gemini call)
  │
  [5] Fetch user profile for segment inference
  │   ⇢ SELECT intelligence_level, subscription_tier FROM profiles WHERE id = userId
  │
  [6] POST to FastAPI insights endpoint
  │   ⇢ fetch(`${FASTAPI_INTERNAL_URL}/insights/generate`, {
  │        headers: { 'X-Internal-Secret': FASTAPI_SECRET_KEY },
  │        body: JSON.stringify({ user_id: userId, transactions, time_range: '30d' })
  │      })
  │
  ─────────────────────────────────────────────────────────────────
  FASTAPI SERVICE
  ─────────────────────────────────────────────────────────────────
  │
  [7] Secret validation
  │   ✗ Invalid secret → 401
  │
  [8] Minimum data check
  │   → len(transactions) < 3 ?
  │   → YES → return { insights: [], health_score: null, score_breakdown: null }
  │              without calling Gemini. No cost incurred.
  │
  [9] Compute behavioral patterns (Python — no AI call)
  │   → compute_spending_velocity(transactions)     → { current_7d, previous_7d, change_pct }
  │   → compute_category_concentration(transactions) → { top_category, concentration_pct }
  │   → compute_merchant_frequency(transactions)    → [ {merchant, count, total} × 3 ]
  │   → compute_day_of_week_distribution(transactions) → { Mon:₹X, Tue:₹Y, ... }
  │   → compute_weekend_vs_weekday_ratio(transactions) → float
  │   → patterns = all above combined into one dict
  │   → These are passed to Gemini as pre-computed signals, not derived by AI
  │
  [10] Compute Health Score sub-scores deterministically (Python — no AI call)
  │    → consistency_score    = compute_consistency(transactions)   [0–100]
  │    → diversification_score = compute_diversification(transactions) [0–100]
  │    → trend_score          = compute_trend(transactions)         [0–100]
  │    → NOTE: anomaly sub-score is AI-assisted (step 12) — the only sub-score not deterministic
  │
  [11] Cap transaction corpus for token budget
  │    → if len(transactions) > 100:
  │         recent_70   = transactions[:70]    ← most recent
  │         random_30   = random.sample(transactions[70:], 30)  ← historical
  │         transactions = recent_70 + random_30
  │    → This bounds Gemini input cost regardless of user transaction count
  │
  [12] Call Gemini 2.0 Flash for insights + anomaly sub-score
  │    ⇢ gemini_model.generate_content(
  │         INSIGHT_GENERATION_PROMPT.format(
  │           time_range=time_range,
  │           transaction_count=len(transactions),
  │           transactions=json.dumps(transactions, indent=2),
  │           patterns=json.dumps(patterns, indent=2)
  │         ),
  │         generation_config={temperature: 0.3, max_output_tokens: 1024}
  │       )
  │    → Expected latency: 1,000–3,000ms
  │    ✗ Timeout → return 504; user sees "Couldn't refresh insights" toast; retry button remains
  │    ✗ API error → return 500; same user-facing behavior
  │
  [13] Strip code fences from Gemini response
  │    → if raw.startswith("```"): strip fence lines
  │    → json.loads(raw.strip())
  │    ✗ JSON parse error → return 500; log raw response for debugging
  │
  [14] Compute final Health Score
  │    → anomaly_score  = result.get('anomaly_score', 50)  ← from Gemini
  │    → health_score   = round(
  │         consistency_score    * 0.30 +
  │         diversification_score * 0.25 +
  │         anomaly_score        * 0.25 +
  │         trend_score          * 0.20
  │       )
  │    → Clamp to [0, 100]: health_score = max(0, min(100, health_score))
  │
  [15] Persist insight set to database
  │    ⇢ INSERT INTO insights (
  │         user_id, time_range, insight_texts, health_score,
  │         score_breakdown, recommendations, transaction_count, generation_model
  │       ) VALUES (
  │         userId, '30d', result['insights'], health_score,
  │         { consistency, diversification, anomaly, trend },
  │         result.get('recommendations', []),
  │         len(transactions),
  │         'gemini-2.0-flash'
  │       )
  │
  [16] Return result to Next.js BFF
  │    ↩ { insights: string[], health_score: int, score_breakdown: {…}, recommendations: string[] }
  │
  ─────────────────────────────────────────────────────────────────
  NEXT.JS BFF  [resumed]
  ─────────────────────────────────────────────────────────────────
  │
  [17] Pass result to browser
  │    ↩ return NextResponse.json(fastApiResult)
  │
  ─────────────────────────────────────────────────────────────────
  BROWSER  [resumed]
  ─────────────────────────────────────────────────────────────────
  │
  [18] Mutation onSuccess fires
  │    → queryClient.invalidateQueries(['insights'])
  │    → Insights page re-fetches: GET /api/insights → returns new row from DB
  │    → InsightTextCards re-render with new insight strings
  │    → HealthScoreCard arc animates from previous score to new score
  │    → "Last updated just now" timestamp updates
  │    → Refresh button exits loading state
  │
  [END] Insights workflow complete
```

---

## 2.3 Insights Flow — Intelligence Level Unlock Trigger

When a user crosses an intelligence level threshold after an upload, insights are triggered differently:

```
FASTAPI  [after step 25 of Upload Workflow]
  │
  [A] increment_receipt_count() returns new intelligence_level
  │
  [B] new_level > previous_level ?
  │   → NO → skip
  │   → YES → spawn background task: generate_insights_on_level_up(user_id, new_level)
  │
  [C] Background task: generate_insights_on_level_up ⊙
  │   → Same pipeline as steps 8–15 above
  │   → Does NOT notify the browser directly
  │   → Browser discovers new insights on next query cache invalidation
  │
BROWSER  [after Upload Workflow step 30]
  │
  [D] queryClient.invalidateQueries(['insights']) fires
  │   → GET /api/insights returns the new insight row just written in step C
  │   → InsightTextCards appear for the first time (Level 4 users)
```

---

# WORKFLOW 3 — DECISION ENGINE

## 3.1 Overview

The Decision Engine is **entirely non-blocking**. It runs as a background task after every upload for users with `intelligence_level >= 3`. The user never waits for it. Results are stored in the database and read on the next page load or cache invalidation.

All computations are **deterministic Python** (tax estimation, subscription detection, budget leakage). Gemini is called only for the human-readable narrative — the numbers come from Python, not from AI.

---

## 3.2 Decision Engine Execution Flow

```
FASTAPI  [background task, started at Upload Workflow step 26]
  │
  ─────────────────────────────────────────────────────────────────
  GATE CHECKS (abort if not met — no output written)
  ─────────────────────────────────────────────────────────────────
  │
  [1] Check intelligence level
  │   ⇢ SELECT intelligence_level FROM profiles WHERE id = user_id
  │   → intelligence_level < 3 → return (abort silently)
  │   → intelligence_level >= 3 → proceed
  │
  [2] Check minimum data threshold
  │   ⇢ SELECT COUNT(*) FROM transactions
  │       WHERE user_id = user_id
  │         AND transaction_date >= NOW() - INTERVAL '90 days'
  │   → count < 5 → return (abort silently)
  │   → count >= 5 → proceed
  │
  ─────────────────────────────────────────────────────────────────
  DATA FETCH
  ─────────────────────────────────────────────────────────────────
  │
  [3] Fetch full 90-day transaction corpus
  │   ⇢ SELECT * FROM transactions
  │       WHERE user_id = user_id
  │         AND transaction_date >= NOW() - INTERVAL '90 days'
  │       ORDER BY transaction_date ASC
  │   → transactions = list of dicts (includes is_business_expense flag)
  │
  ─────────────────────────────────────────────────────────────────
  MODULE 1: TAX ESTIMATION
  ─────────────────────────────────────────────────────────────────
  │
  [4] Filter to business expenses
  │   → biz_txns = [t for t in transactions if t['is_business_expense'] == True]
  │   → If len(biz_txns) == 0: tax_output = null outputs + guidance message. Skip to step 8.
  │
  [5] Compute business spend by category
  │   → software_total      = SUM(amount) WHERE category = 'Software & Subscriptions'
  │   → dining_total        = SUM(amount) WHERE category = 'Food & Dining'
  │   → travel_total        = SUM(amount) WHERE category = 'Travel & Accommodation'
  │   → professional_total  = SUM(amount) WHERE category = 'Business & Professional'
  │
  [6] Apply deductibility ratios (ITR Section 37 basis)
  │   → deductible = (software_total × 1.0)   ← fully deductible
  │               + (dining_total × 0.5)      ← 50% deductibility
  │               + (travel_total × 1.0)      ← fully deductible
  │               + (professional_total × 1.0) ← fully deductible
  │
  [7] Compute tax saving estimate
  │   → tax_saved = deductible × 0.30   ← 30% tax bracket (upper bound assumption)
  │   → tax_output = {
  │        estimated_deductible_total:       deductible,
  │        tax_liability_reduction_estimate: tax_saved,
  │        business_expense_breakdown:       { software, dining_50pct, travel, professional },
  │        computation_basis:               "ITR Section 37 — Business expenditure",
  │        disclaimer:                      "Estimates only. Consult a CA.",
  │        data_period:                     "FY2024-25 Apr–Mar"
  │      }
  │
  ─────────────────────────────────────────────────────────────────
  MODULE 2: SUBSCRIPTION DETECTION
  ─────────────────────────────────────────────────────────────────
  │
  [8] Group transactions by merchant
  │   → merchant_groups = defaultdict(list)
  │   → For each transaction: merchant_groups[merchant].append({ date, amount, id })
  │
  [9] For each merchant with ≥ 2 occurrences:
  │   │
  │   [9a] Sort occurrences by date ascending
  │   │
  │   [9b] Check date regularity (within ±3 days of same day-of-month)
  │   │    → days_of_month = [occurrence.date.day for occurrence in occurrences]
  │   │    → day_range = max(days_of_month) - min(days_of_month)
  │   │    → day_range > 6 → NOT a subscription → skip this merchant
  │   │
  │   [9c] Check amount consistency (within 10% of mean)
  │   │    → avg_amount = mean([o.amount for o in occurrences])
  │   │    → max_deviation = max(abs(a - avg_amount) / avg_amount for a in amounts)
  │   │    → max_deviation > 0.10 → NOT a subscription → skip this merchant
  │   │
  │   [9d] Flag as subscription
  │        → subscriptions.append({
  │               merchant:     merchant_name,
  │               amount:       round(avg_amount, 2),
  │               frequency:    'monthly',
  │               occurrences:  len(occurrences),
  │               last_date:    str(occurrences[-1].date),
  │               annual_cost:  round(avg_amount * 12, 2)
  │             })
  │        → UPDATE transactions SET is_subscription = TRUE
  │            WHERE id IN [occurrence.id for occurrence in occurrences]
  │
  ─────────────────────────────────────────────────────────────────
  MODULE 3: BUDGET LEAKAGE DETECTION
  ─────────────────────────────────────────────────────────────────
  │
  [10] For each category with ≥ 5 transactions in history:
  │    │
  │    [10a] Compute trailing 3-month baseline
  │    │     → For each of the past 3 complete calendar months:
  │    │          monthly_spend[month] = SUM(amount) WHERE category = cat AND month = m
  │    │     → baseline = mean(monthly_spend.values())
  │    │
  │    [10b] Compute current month pace
  │    │     → spend_so_far   = SUM(amount) WHERE category = cat AND month = current_month
  │    │     → days_elapsed   = today.day
  │    │     → days_in_month  = calendar.monthrange(year, month)[1]
  │    │     → current_pace   = (spend_so_far / days_elapsed) × days_in_month
  │    │
  │    [10c] Check leakage conditions
  │    │     → current_pace > baseline × 1.35 ?   ← 35% above baseline threshold
  │    │     → days_remaining > 10 ?               ← enough time to act on it
  │    │     → BOTH true → flag as leakage
  │    │     → severity = 'HIGH' if delta_pct > 60% else 'MODERATE'
  │    │
  │    [10d] Append to leakage signals
  │          → leakage_signals.append({
  │                 category:          category_name,
  │                 current_month_pace: current_pace,
  │                 trailing_baseline: baseline,
  │                 delta_pct:         round(((current_pace - baseline) / baseline) × 100, 1),
  │                 severity:          severity,
  │                 days_remaining:    days_remaining
  │               })
  │
  ─────────────────────────────────────────────────────────────────
  NARRATIVE GENERATION (Gemini — narrative only, not numbers)
  ─────────────────────────────────────────────────────────────────
  │
  [11] Infer user segment
  │    → biz_expense_ratio = len(biz_txns) / len(transactions)
  │    → segment = 'freelancer' if biz_expense_ratio > 0.30 else 'professional'
  │
  [12] Call Gemini 2.0 Flash for narrative
  │    ⇢ gemini_model.generate_content(
  │         DECISION_NARRATIVE_PROMPT.format(
  │           segment=segment,
  │           tax_output=json.dumps(tax_output),
  │           subscriptions=json.dumps(subscriptions),
  │           leakage_signals=json.dumps(leakage_signals)
  │         ),
  │         generation_config={temperature: 0.2, max_output_tokens: 200}
  │       )
  │    → Prompt instructs: < 100 words, start with most significant finding,
  │                         reference specific amounts, include CA disclaimer
  │    → Expected latency: 500–1,500ms
  │    ✗ Gemini error → narrative = "Analysis complete. See details below."
  │       (fallback: non-AI fallback text. Numbers are still accurate.)
  │
  ─────────────────────────────────────────────────────────────────
  PERSISTENCE
  ─────────────────────────────────────────────────────────────────
  │
  [13] Archive previous output
  │    ⇢ SELECT archive_decision_engine_output(user_id)
  │    → This SQL function sets is_current = FALSE on all previous rows for this user
  │    → Only one row per user is ever is_current = TRUE
  │
  [14] Insert new output row
  │    ⇢ INSERT INTO decision_engine_outputs (
  │         user_id, computed_at, time_range,
  │         estimated_tax_liability, tax_deductible_total, tax_computation_basis,
  │         detected_subscriptions, subscription_monthly_total,
  │         leakage_signals, high_risk_categories,
  │         decision_narrative, is_current
  │       ) VALUES ( ..., TRUE )
  │
  ─────────────────────────────────────────────────────────────────
  UI DELIVERY  [next page load or scheduled refetch]
  ─────────────────────────────────────────────────────────────────
  │
  [15] Browser reads Decision Engine output
  │    → User navigates to /insights or /dashboard
  │    → GET /api/decision-engine/output
  │    ⇢ SELECT * FROM decision_engine_outputs
  │        WHERE user_id = userId AND is_current = TRUE
  │        LIMIT 1
  │    → Returns the row just written in step 14
  │
  [16] DecisionPanel renders
  │    → decision_narrative displayed at top
  │    → TaxEstimateCard   rendered if estimated_tax_liability > 0
  │    → SubscriptionDetectedCard rendered if detected_subscriptions.length > 0
  │    → LeakageAlertCard  rendered if leakage_signals.length > 0
  │    → "Last computed X hours ago" timestamp from computed_at field
  │
  [END] Decision Engine workflow complete
```

---

# WORKFLOW 4 — AUTHENTICATION

## 4.1 Auth Workflow — Email Signup

```
BROWSER
  │
  [1] User visits /auth (or is redirected from a protected route)
  │   → Static page (SSG) — serves instantly from CDN
  │
  [2] User fills sign-up form: fullName, email, password, confirmPassword
  │   → React Hook Form validates locally via Zod schema:
  │         email:           z.string().email()
  │         password:        z.string().min(8)
  │         confirmPassword: matches password via .refine()
  │         fullName:        z.string().min(2)
  │   ✗ Validation fails → field-level error messages shown inline. No API call.
  │
  [3] User clicks "Create Account →"
  │   → supabase.auth.signUp({
  │        email,
  │        password,
  │        options: { data: { full_name: fullName } }
  │      })
  │   → Button enters loading state (spinner, disabled)
  │
  ─────────────────────────────────────────────────────────────────
  SUPABASE AUTH  [external service]
  ─────────────────────────────────────────────────────────────────
  │
  [4] Supabase creates user in auth.users table
  │   → Sends verification email to the provided address
  │   → raw_user_meta_data = { full_name: fullName } is stored
  │
  [5] handle_new_user() trigger fires
  │   → Auto-creates a row in public.profiles:
  │        id                      = auth.users.id
  │        full_name               = raw_user_meta_data->>'full_name'
  │        currency_preference     = 'INR'
  │        intelligence_level      = 1
  │        total_receipts_uploaded = 0
  │        subscription_tier       = 'free'
  │
  ─────────────────────────────────────────────────────────────────
  BROWSER  [resumed]
  ─────────────────────────────────────────────────────────────────
  │
  [6] supabase.auth.signUp() returns
  │   → Shows "Check your email to verify your account" message
  │
  [7] User clicks verification link in email
  │   → Supabase redirects to: https://app.finsight.com/api/auth/callback?code=XXXXX
  │
  ─────────────────────────────────────────────────────────────────
  NEXT.JS — /api/auth/callback  [GET route]
  ─────────────────────────────────────────────────────────────────
  │
  [8] Extract code from URL params
  │   → const code = searchParams.get('code')
  │   ✗ No code → redirect to /auth?error=auth_callback_failed
  │
  [9] Exchange code for session
  │   ⇢ supabase.auth.exchangeCodeForSession(code)
  │   → Supabase creates a session JWT
  │   → JWT is stored in an httpOnly cookie (set by @supabase/ssr)
  │   ✗ Exchange fails → redirect to /auth?error=auth_callback_failed
  │
  [10] Redirect to dashboard
  │    → return NextResponse.redirect(`${origin}/dashboard`)
  │
  ─────────────────────────────────────────────────────────────────
  NEXT.JS — /dashboard  [SSR route, protected]
  ─────────────────────────────────────────────────────────────────
  │
  [11] Middleware runs before the route handler
  │    → src/middleware.ts intercepts the /dashboard request
  │    → Reads httpOnly cookie → calls supabase.auth.getSession()
  │    → Session exists → allow request to pass through
  │
  [12] Dashboard SSR data fetch
  │    → Server component fetches: profile + recent transactions + latest insights
  │    → Page renders with Level 1 state (empty state, Intelligence Meter at 0%)
  │
  [END] Signup and first login complete
```

---

## 4.2 Auth Workflow — Google OAuth

```
BROWSER
  │
  [1] User clicks "Continue with Google"
  │   → supabase.auth.signInWithOAuth({
  │        provider: 'google',
  │        options: { redirectTo: `${APP_URL}/api/auth/callback` }
  │      })
  │
  [2] Browser redirects to Google OAuth consent screen
  │   → User approves FinSight's OAuth scopes (email, profile)
  │
  [3] Google redirects to Supabase OAuth endpoint
  │   → Supabase exchanges Google token for Supabase session
  │   → If first-time user: handle_new_user() trigger fires (same as email flow step 5)
  │   → Supabase redirects to: https://app.finsight.com/api/auth/callback?code=XXXXX
  │
  [4] Steps 8–12 from Email flow above execute identically
  │
  [END] Google OAuth complete. No email verification step required.
```

---

## 4.3 Auth Workflow — Session Validation on Protected Routes

Every request to a protected route passes through this flow before reaching the page handler.

```
BROWSER  [navigates to /dashboard, /receipts, /insights, or /settings]
  │
  [1] HTTP request sent with cookies (httpOnly session cookie included automatically)
  │
  ─────────────────────────────────────────────────────────────────
  NEXT.JS MIDDLEWARE  [src/middleware.ts — runs on EVERY request]
  ─────────────────────────────────────────────────────────────────
  │
  [2] Extract route pathname
  │   → const pathname = request.nextUrl.pathname
  │
  [3] Check if route is protected
  │   → PROTECTED = ['/dashboard', '/receipts', '/insights', '/settings']
  │   → isProtected = PROTECTED.some(r => pathname.startsWith(r))
  │
  [4] Read session from httpOnly cookie
  │   → createServerClient with full cookie read/set/remove handlers
  │   → supabase.auth.getSession()
  │
  [5] Route decision
  │   → isProtected AND no session → redirect to /auth (301)
  │   → pathname === '/auth' AND session exists → redirect to /dashboard (301)
  │   → Otherwise → allow request through, return response
  │
  ─────────────────────────────────────────────────────────────────
  NEXT.JS — Route Handler  [only reached if middleware allows]
  ─────────────────────────────────────────────────────────────────
  │
  [6] Server Component data fetching
  │   → Server component independently validates session again:
  │        const { data: { session } } = await supabase.auth.getSession()
  │        if (!session) redirect('/auth')   ← Double-check: middleware + layout
  │   → This is defense in depth — middleware is the first gate, layout is the second
  │
  [7] Page renders with user-specific data
  │
  [END] Route protection flow complete
```

---

## 4.4 Auth Workflow — API Route Session Validation

Every Next.js API route (BFF layer) uses this pattern:

```
BROWSER  [calls any protected API route]
  │
  [1] fetch('/api/receipts/upload', { method: 'POST', body: formData })
  │   → Request includes cookies automatically (same-origin)
  │
  ─────────────────────────────────────────────────────────────────
  NEXT.JS API ROUTE
  ─────────────────────────────────────────────────────────────────
  │
  [2] import { createClient } from '@/lib/supabase/server'
  │   → const supabase = createClient()
  │   → const { data: { session } } = await supabase.auth.getSession()
  │
  [3] Session check
  │   → !session → return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  │   → session exists → const userId = session.user.id
  │
  [4] userId is the ONLY source of the user's identity
  │   → NEVER: const userId = req.body.userId  ← forbidden
  │   → NEVER: const userId = req.query.userId ← forbidden
  │   → All database queries filter by this userId
  │
  [END] API route auth pattern complete
```

---

## 4.5 Auth Workflow — Sign Out

```
BROWSER
  │
  [1] User clicks "Sign Out" button (Settings page or Header)
  │
  [2] supabase.auth.signOut() called
  │   → Supabase clears the session JWT from the httpOnly cookie
  │   → Client-side session state is nullified
  │
  [3] React Query cache is cleared
  │   → queryClient.clear()
  │   → All cached user data removed from memory
  │
  [4] Browser redirects to /auth
  │   → router.push('/auth')
  │   → Middleware confirms no session exists → allows /auth access
  │
  [END] Sign out complete
```

---

# WORKFLOW 5 — FULL SYSTEM DATA FLOW DIAGRAM

```
╔══════════════════════════════════════════════════════════════════╗
║                        BROWSER                                   ║
║                                                                  ║
║  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  ┌─────────┐ ║
║  │ Upload      │  │ Dashboard   │  │  Insights  │  │Decision │ ║
║  │ Modal       │  │ (Level 1–4) │  │  Page      │  │ Panel   │ ║
║  │ useUpload   │  │ useIntel-   │  │  Charts    │  │ DE data │ ║
║  │ hook        │  │ ligence     │  │  Gemini    │  │         │ ║
║  │             │  │ Level()     │  │  Insights  │  │         │ ║
║  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘  └────┬────┘ ║
║         │                │               │               │      ║
╚═════════╪════════════════╪═══════════════╪═══════════════╪══════╝
          │                │               │               │
          │ POST formData  │ React Query   │ React Query   │ React
          │                │ invalidation  │ fetch         │ Query
          ▼                ▼               ▼               ▼
╔══════════════════════════════════════════════════════════════════╗
║                    NEXT.JS BFF  (Vercel)                         ║
║                                                                  ║
║  POST /api/receipts/upload   GET /api/dashboard/summary          ║
║  GET  /api/receipts          GET /api/receipts/[id]              ║
║  GET  /api/insights          POST /api/insights                  ║
║  PATCH/DELETE /api/receipts/[id]                                 ║
║  GET  /api/decision-engine/output                                ║
║                                                                  ║
║  ┌─ Session validation (httpOnly cookie read)                    ║
║  ├─ User ID from session.user.id ONLY                            ║
║  ├─ Free tier gate check                                         ║
║  └─ Supabase Storage upload (receipts only)                      ║
╚═════════╪════════════════╪═══════════════╪═══════════════╪══════╝
          │                │               │               │
          │ POST (base64   │ Supabase anon │ POST          │ GET
          │ + X-Secret)    │ key + session │ X-Secret      │ X-Secret
          ▼                ▼               ▼               ▼
╔══════════════════════════════════════════════════════════════════╗
║                  PYTHON FASTAPI  (Railway)                       ║
║                                                                  ║
║  POST /analyze/receipt                                           ║
║  ├── NVIDIA NIM: Llama 3.2 90B Vision  [OCR]                    ║
║  ├── Groq:       Llama 3.3 70B         [Categorization]         ║
║  ├── Supabase:   INSERT transactions   [Persistence]            ║
║  └── Background: run_decision_engine() [Non-blocking]           ║
║                                                                  ║
║  POST /insights/generate                                         ║
║  ├── Python:     Pattern computation   [Deterministic]          ║
║  ├── Gemini 2.0: Insight generation    [AI reasoning]           ║
║  └── Supabase:   INSERT insights       [Persistence]            ║
║                                                                  ║
║  POST /decision-engine/run  [background, non-blocking]           ║
║  ├── Python:     Tax estimation        [Deterministic]          ║
║  ├── Python:     Subscription detect   [Deterministic]          ║
║  ├── Python:     Leakage detection     [Deterministic]          ║
║  ├── Gemini 2.0: Decision narrative    [AI narrative only]      ║
║  └── Supabase:   INSERT DE outputs     [Persistence]            ║
╚═════════╪═══════════════╪════════╪═════════════╪════════════════╝
          │               │        │             │
          │               │        │             │
          ▼               ▼        ▼             ▼
╔══════════════════════════════════════════════════════════════════╗
║                    EXTERNAL SERVICES                             ║
║                                                                  ║
║  ┌────────────────┐  ┌──────────────┐  ┌─────────────────────┐  ║
║  │  NVIDIA NIM    │  │    GROQ      │  │  GOOGLE GEMINI      │  ║
║  │  Llama 3.2 90B │  │  Llama 3.3  │  │  2.0 Flash          │  ║
║  │  Vision        │  │  70B        │  │                     │  ║
║  │  OCR + extract │  │  Categorize │  │  Insights + DE      │  ║
║  │  ~1.5–3.5s     │  │  ~0.2–0.4s  │  │  narrative          │  ║
║  └────────────────┘  └──────────────┘  └─────────────────────┘  ║
╚══════════════════════════════════════════════════════════════════╝
          │               │        │             │
          │               │        │             │
          ▼               ▼        ▼             ▼
╔══════════════════════════════════════════════════════════════════╗
║              SUPABASE  (PostgreSQL + Storage)  ap-south-1        ║
║                                                                  ║
║  TABLES (all with RLS — user can only access their own rows)     ║
║  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────────┐  ║
║  │ profiles │  │ receipts │  │transactions│  │   insights   │  ║
║  │ intelli- │  │ pending  │  │ category   │  │ health_score │  ║
║  │ gence_   │  │ complete │  │ confidence │  │ insight_texts│  ║
║  │ level    │  │ failed   │  │ is_anomalous│ │              │  ║
║  └──────────┘  └──────────┘  └────────────┘  └──────────────┘  ║
║                                                                  ║
║  ┌─────────────────────────────────┐  ┌────────────────────────┐ ║
║  │   decision_engine_outputs       │  │    STORAGE BUCKET      │ ║
║  │   tax_estimate | subscriptions  │  │    receipts (private)  │ ║
║  │   leakage | narrative           │  │    path: uid/rid/ts.jpg│ ║
║  │   is_current = TRUE (one/user) │  │    1-hour signed URLs  │ ║
║  └─────────────────────────────────┘  └────────────────────────┘ ║
╚══════════════════════════════════════════════════════════════════╝
```

---

# WORKFLOW 6 — ERROR HANDLING FLOWS

## 6.1 OCR Confidence Failure

```
FASTAPI  [at Upload Workflow step 18]
  │
  [1] NVIDIA NIM returns extraction with raw_confidence = 0.22
  │   → 0.22 < 0.30 threshold
  │
  [2] raise ValueError("Receipt image quality too low for extraction")
  │
  [3] except ValueError as e:
  │   ⇢ UPDATE receipts SET status='failed', processing_error='Receipt image quality too low'
  │     WHERE id = receipt_id
  │   → raise HTTPException(status_code=422, detail=str(e))
  │
  [4] FastAPI returns 422 to Next.js BFF
  │
  [5] Next.js BFF returns 422 to browser:
  │   { error: "Receipt image quality too low for extraction", code: "PROCESSING_FAILED" }
  │
  [6] Browser — useUpload hook:
  │   → response.status === 422 → throw new Error(data.error)
  │   → setState('error')
  │   → setError("Receipt image quality too low for extraction")
  │
  [7] Upload modal renders ERROR state
  │   → NOT a generic "Something went wrong" message
  │   → Shows: "We couldn't read this receipt clearly."
  │   → Sub-text: "Try again with better lighting or a less faded receipt."
  │   → "Try Again" ghost button → resets modal to IDLE state
  │   → receipt row remains in DB with status='failed' for debugging
  │
  [END] OCR failure handled. No transaction created. Receipt marked failed.
```

---

## 6.2 AI Provider Timeout

```
FASTAPI  [during any AI provider call]
  │
  [1] httpx.TimeoutException raised (timeout exceeded for NVIDIA / Groq / Gemini)
  │
  [2] except httpx.TimeoutException:
  │   ⇢ UPDATE receipts SET status='failed', processing_error='AI provider timeout'
  │     WHERE id = receipt_id
  │   → raise HTTPException(status_code=504, detail="AI processing timed out — please retry")
  │
  [3] Browser receives 504
  │   → setState('error')
  │   → setError("AI processing timed out — please retry")
  │
  [4] Upload modal renders ERROR state
  │   → Message: "Processing took too long. Please try again."
  │   → "Try Again" button visible
  │   → The receipt in 'failed' status can be cleaned up by a background job
  │
  [END] Timeout handled gracefully. User can retry.
```

---

## 6.3 Categorization Confidence Below Threshold (Non-Fatal)

```
FASTAPI  [at Upload Workflow step 21]
  │
  [1] Groq returns categorization.confidence = 0.38
  │   → 0.38 < 0.50 threshold
  │
  [2] This is NOT an error — it is a soft degradation
  │   → categorization['category'] = 'Other'   ← override
  │   → categorization['confidence'] = 0.38    ← original confidence preserved
  │   → Pipeline continues normally through steps 22–27
  │
  [3] Transaction is created with category='Other', confidence=0.38
  │
  [4] Browser receives the result
  │   → RESULTS state shows category as "Other" with CategoryBadge
  │   → ConfidenceDot renders red (< 0.50) — user notices the low confidence
  │   → User can correct the category manually (Phase 2) from the receipt detail page
  │
  [END] Low categorization confidence handled as soft degradation. No error state.
```

---

## 6.4 Storage Upload Failure

```
NEXT.JS BFF  [at Upload Workflow step 8]
  │
  [1] Supabase Storage .upload() returns an error
  │   → storageError is truthy
  │
  [2] return NextResponse.json(
  │     { error: 'Storage upload failed' },
  │     { status: 500 }
  │   )
  │   → No receipt record was created (step 9 was not reached)
  │   → No orphaned data in the database
  │
  [3] Browser — useUpload hook:
  │   → setState('error')
  │   → setError("Storage upload failed")
  │
  [4] Upload modal renders ERROR state
  │   → Message: "Couldn't save your receipt. Please try again."
  │   → Technical cause (storage error) is not shown to user
  │
  [END] Storage failure handled. No partial data written.
```

---

## 6.5 Free Tier Limit Reached

```
NEXT.JS BFF  [at Upload Workflow step 5]
  │
  [1] profile.subscription_tier === 'free'
  │   AND profile.total_receipts_uploaded >= 20
  │
  [2] return NextResponse.json({
  │     error: 'Free tier limit reached',
  │     code: 'LIMIT_REACHED',
  │     limit: 20,
  │     upgrade_url: '/settings#plan'
  │   }, { status: 402 })
  │   → No storage write. No receipt record. Nothing processed.
  │
  [3] Browser — useUpload hook:
  │   → response.status === 402 AND data.code === 'LIMIT_REACHED'
  │   → setState('limit_reached')   ← NOT 'error'
  │
  [4] Upload modal renders UPGRADE_PROMPT state (not ERROR state)
  │   → Lock icon (Lucide LockKeyhole, amber)
  │   → "You've used all 20 free receipts this month"
  │   → "Upgrade to Pro for unlimited uploads, full history, and advanced insights."
  │   → "₹499 / month · Cancel anytime"
  │   → [Maybe Later] ghost button + [Upgrade to Pro →] amber primary button
  │   → Amber primary navigates to /settings#plan
  │
  [END] Free tier limit handled as a product moment, not a technical error.
```

---

## 6.6 Decision Engine Failure (Non-Fatal — Background)

```
FASTAPI  [in background task run_decision_engine()]
  │
  [1] Any exception occurs (Gemini timeout, DB write fails, Python computation error)
  │
  [2] Background task has its own try/except:
  │   → Log the error with user_id and exception details
  │   → Do NOT raise the exception (this would crash the background task silently)
  │   → Do NOT mark the receipt as failed (upload already completed successfully)
  │   → Do NOT write a partial decision_engine_outputs row
  │
  [3] The failure is silent to the user
  │   → User's upload completed successfully
  │   → Decision Engine panel simply shows the previous output (or empty state)
  │   → No error message in the UI
  │
  [4] The background task will retry on the next upload
  │   → Every upload for an intelligence_level >= 3 user triggers the engine
  │   → A one-time failure self-resolves on the next upload
  │
  [END] Background task failures are isolated and non-fatal to the upload workflow.
```

---

## 6.7 Insights Page — Insufficient Data

```
FASTAPI  [in POST /insights/generate, step 8]
  │
  [1] len(transactions) < 3
  │   → return {
  │        insights:       [],
  │        health_score:   null,
  │        score_breakdown: null
  │      }
  │   → Gemini is NOT called. No cost incurred.
  │
  [2] Next.js BFF receives empty result
  │   → Persists an insights row with empty insight_texts and null health_score
  │   → Returns empty result to browser
  │
  [3] Browser
  │   → InsightTextCard list renders empty (no cards)
  │   → HealthScoreCard renders with placeholder: "Upload more receipts to generate your Health Score"
  │   → This state should be unreachable in normal UX because the Insights page
  │     requires Level 3 (6+ receipts) — but it is handled defensively
  │
  [END] Insufficient data handled without error state.
```

---

# WORKFLOW 7 — ASYNC VS. SYNCHRONOUS FLOW CLASSIFICATION

## 7.1 Synchronous Flows (User Waits for Response)

These flows block the UI. The user sees a loading state until they complete.

```
┌────────────────────────────────────────────────────────────────┐
│  FLOW                          WHY SYNCHRONOUS                  │
├────────────────────────────────────────────────────────────────┤
│ Receipt upload pipeline        User needs the extraction result │
│ (Upload WF steps 1–33)         to confirm the upload is correct │
├────────────────────────────────────────────────────────────────┤
│ User-triggered insight         User clicked "Refresh Insights"  │
│ generation                     and is waiting for new insights  │
├────────────────────────────────────────────────────────────────┤
│ Auth callback                  Session must exist before        │
│ (Auth WF steps 8–12)           routing to dashboard            │
├────────────────────────────────────────────────────────────────┤
│ Dashboard SSR data fetch       First paint must show real data  │
│                                (not a blank skeleton screen)    │
├────────────────────────────────────────────────────────────────┤
│ Route middleware session check Can't render a page before       │
│                                knowing if user is authenticated │
└────────────────────────────────────────────────────────────────┘
```

## 7.2 Asynchronous Flows (Fire-and-Forget)

These flows run after their triggering event. The user does not wait.

```
┌────────────────────────────────────────────────────────────────┐
│  FLOW                          TRIGGER                RESULT    │
├────────────────────────────────────────────────────────────────┤
│ Decision Engine execution      After every upload for │ Written │
│ (run_decision_engine)          intelligence_level ≥ 3 │ to DB   │
├────────────────────────────────────────────────────────────────┤
│ Intelligence-level-triggered   After upload crosses   │ Written │
│ insight generation             a level threshold      │ to DB   │
├────────────────────────────────────────────────────────────────┤
│ Anomaly flag computation       After transaction row  │ Updated │
│ (Phase 2)                      is inserted            │ in DB   │
├────────────────────────────────────────────────────────────────┤
│ is_subscription flag update    After DE subscription  │ Updated │
│                                detector runs          │ in DB   │
├────────────────────────────────────────────────────────────────┤
│ Monthly email digest           pg_cron on 1st of      │ Email   │
│ (Phase 2)                      each month             │ sent    │
├────────────────────────────────────────────────────────────────┤
│ Materialized view refresh      Every 6 hours via      │ View    │
│ (Phase 4)                      pg_cron scheduler      │ updated │
├────────────────────────────────────────────────────────────────┤
│ Processing queue worker        BullMQ worker picks    │ Receipt │
│ (Phase 4 async queue)          up job from Redis      │complete │
└────────────────────────────────────────────────────────────────┘
```

## 7.3 Phase 4 — Upload Flow in Async Queue Mode

When the processing queue is active (Phase 4), the upload workflow transforms from synchronous to async:

```
SYNCHRONOUS (Phase 1–3):
  Browser → BFF → FastAPI [WAIT 3–8s] → Response → UI update

ASYNC QUEUE (Phase 4):
  Browser → BFF
              │
              [1] Store file to Supabase Storage
              [2] Insert receipt row (status='pending')
              [3] Enqueue job to Redis via BullMQ
              [4] Return immediately: { receipt_id, status: 'queued' }
              │
  Browser ← { receipt_id, status: 'queued' }   ← ~200ms total
  │
  [5] Browser subscribes to Supabase Realtime:
  │       supabase.channel('receipt-status')
  │         .on('postgres_changes', {
  │              event: 'UPDATE', schema: 'public', table: 'receipts',
  │              filter: `id=eq.${receiptId}`
  │            }, (payload) => handleStatusChange(payload))
  │         .subscribe()
  │
  [6] Upload modal shows PROCESSING state with queue position indicator
  │   → "Processing — 1 of 3 in queue"
  │
  [7] BullMQ worker picks up job from Redis queue
  │   → Runs full pipeline (steps 12–26 from Upload Workflow 1.2)
  │
  [8] FastAPI updates receipts.status = 'complete'
  │
  [9] Supabase Realtime fires payload to browser
  │   → payload.new.status === 'complete'
  │   → handleStatusChange fetches full result from GET /api/receipts/[id]
  │
  [10] Upload modal transitions to RESULTS state
  │    → Steps 30–33 from Upload Workflow 1.2 execute normally
  │
  TOTAL USER-PERCEIVED WAIT: ~200ms to "queued" state; 3–8s to results (same as synchronous)
  ADVANTAGE: Server never overloads during concurrent upload bursts
```

---

## 7.4 React Query Invalidation — Timing and Sequence

The invalidation sequence after an upload is not random. It is ordered to prevent stale renders.

```
UPLOAD COMPLETES (step 29 of Upload Workflow)
  │
  [T+0ms]   queryClient.invalidateQueries(['user', 'profile'])
  │          → Triggers background refetch of profile
  │          → This must come FIRST — intelligence level is derived from profile
  │
  [T+0ms]   queryClient.invalidateQueries(['dashboard', 'summary'])
  │          → KPI cards will refetch once invalidated
  │
  [T+0ms]   queryClient.invalidateQueries(['receipts'])
  │          → Receipt list will include the new receipt
  │
  [T+~200ms] Profile refetch resolves (network round-trip)
  │          → useIntelligenceLevel(profile) runs with new total_receipts_uploaded
  │          → Level change detected or not
  │
  [T+~200ms] Dashboard summary refetch resolves
  │          → KPI cards re-render with new totals
  │          → If level changed: new components render with unlockReveal animation
  │
  CATEGORY CORRECTION (PATCH /api/receipts/[id]):
  → invalidate ['receipts', id]         ← single receipt detail updates
  → invalidate ['dashboard', 'summary'] ← category distribution changes
  → invalidate ['insights']             ← category-level insights may change
  → DO NOT invalidate ['user', 'profile'] ← receipt count unchanged
  
  RECEIPT DELETION (DELETE /api/receipts/[id]):
  → invalidate ['user', 'profile']      ← display count changes (level doesn't decrease)
  → invalidate ['dashboard', 'summary'] ← totals change
  → invalidate ['receipts']             ← list loses deleted item
  → router.push('/receipts')            ← navigate back to list
```

---

# WORKFLOW 8 — DELETE RECEIPT

```
BROWSER  [/receipts/[id] detail page]
  │
  [1] User clicks "Delete Receipt" button
  │   → shadcn AlertDialog opens
  │   → "Are you sure? This action cannot be undone."
  │
  [2] User confirms deletion
  │   → deleteReceipt(id) from src/lib/api/receipts.ts
  │   → fetch('DELETE /api/receipts/[id]')
  │
  ─────────────────────────────────────────────────────────────────
  NEXT.JS BFF
  ─────────────────────────────────────────────────────────────────
  │
  [3] Session validation → extract userId
  │
  [4] Fetch receipt to verify ownership + get storage_path
  │   ⇢ SELECT id, storage_path FROM receipts
  │       WHERE id = receipt_id AND user_id = userId
  │   ✗ Not found (wrong user or doesn't exist) → 404
  │
  [5] Delete from Supabase Storage FIRST
  │   ⇢ supabase.storage.from('receipts').remove([receipt.storage_path])
  │   → Storage object deleted
  │   ✗ Storage deletion fails → return 500 (do not proceed to DB deletion)
  │     Why this order? If DB deletion happened first and storage failed,
  │     we'd have an orphaned storage object with no receipt record pointing to it.
  │     Storage-first means a failed storage delete leaves a consistent DB state.
  │
  [6] Delete transaction row
  │   ⇢ DELETE FROM transactions WHERE receipt_id = receipt_id
  │   → (CASCADE on receipt deletion would handle this, but explicit is safer)
  │
  [7] Delete receipt row
  │   ⇢ DELETE FROM receipts WHERE id = receipt_id AND user_id = userId
  │   → RLS enforces: userId must match — a user cannot delete another user's receipt
  │
  [8] Return 204 No Content
  │
  ─────────────────────────────────────────────────────────────────
  BROWSER
  ─────────────────────────────────────────────────────────────────
  │
  [9] Mutation onSuccess:
  │   → queryClient.invalidateQueries(['receipts'])
  │   → queryClient.invalidateQueries(['dashboard', 'summary'])
  │   → queryClient.invalidateQueries(['user', 'profile'])
  │   → router.push('/receipts')  ← navigate back to list
  │   → Toast: "Receipt deleted"
  │
  [END] Delete workflow complete. All 3 records removed (storage + transaction + receipt).
```

---

# QUICK REFERENCE — HTTP STATUS CODES

```
STATUS   CODE              TRIGGER                      UI BEHAVIOR
─────────────────────────────────────────────────────────────────────
200      OK                Successful request           Render data
204      No Content        Successful deletion          Navigate back
400      Bad Request       Invalid file type/size       Show specific error
401      Unauthorized      No valid session             Redirect to /auth
402      Payment Required  Free tier limit reached      Show UPGRADE_PROMPT state
404      Not Found         Receipt not found/not owned  Show 404 page
422      Unprocessable     OCR confidence < 0.30        Show "try clearer photo" message
429      Too Many Requests Rate limit exceeded (Ph 4)   Show "try again in X min" message
500      Server Error      Unexpected pipeline failure  Show generic retry message
504      Gateway Timeout   AI provider timeout          Show "processing timed out" message
```

---

# QUICK REFERENCE — ENVIRONMENT VARIABLE FLOW

```
BROWSER
  → Reads: NEXT_PUBLIC_SUPABASE_URL
  → Reads: NEXT_PUBLIC_SUPABASE_ANON_KEY
  → Reads: NEXT_PUBLIC_APP_URL
  → Reads: NOTHING ELSE (no API keys, no service role key, ever)

NEXT.JS BFF (Vercel server-side)
  → Reads: NEXT_PUBLIC_SUPABASE_URL (same as browser)
  → Reads: NEXT_PUBLIC_SUPABASE_ANON_KEY (same as browser)
  → Reads: SUPABASE_SERVICE_ROLE_KEY (server only — never NEXT_PUBLIC_)
  → Reads: FASTAPI_INTERNAL_URL (Railway URL)
  → Reads: FASTAPI_SECRET_KEY (shared secret)
  → NEVER reads: NVIDIA_NIM_API_KEY / GROQ_API_KEY / GEMINI_API_KEY

FASTAPI (Railway server-side)
  → Reads: NVIDIA_NIM_API_KEY
  → Reads: GROQ_API_KEY
  → Reads: GEMINI_API_KEY
  → Reads: SUPABASE_URL (copy of NEXT_PUBLIC_SUPABASE_URL value)
  → Reads: SUPABASE_SERVICE_ROLE_KEY (its own copy)
  → Reads: FASTAPI_SECRET_KEY (must match Next.js copy exactly)
  → Reads: ALLOWED_ORIGINS (CORS — set to production Vercel URL before launch)
```

---

*End of FINSIGHT WORKFLOW.md v1.0.0*
*All flows align with TECH_STACK_v2.md.*
*Error handling contracts align with TASKS.md §6.*
*UI state transitions align with UI_GENERATOR_SPEC.md §4.*
