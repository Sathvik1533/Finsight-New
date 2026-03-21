# FINSIGHT — CODEBASE_SIMULATION.md
## Real-World Scenario Training: Own the System by Solving It

```
Purpose:  Build genuine system ownership through simulated real-world problems
Audience: Developer building FinSight while learning
Method:   Scenarios → Your reasoning → Guided solution → Lesson
Style:    Think first. Then check. Build the habit of systematic thinking.
```

---

## How to Use This Document

This is not a reading exercise. It is a thinking exercise.

For every scenario:
1. **Stop when you see the 🤔 THINK prompt**
2. **Write your answer down** — even just notes, not full sentences
3. **Then read the guided solution**
4. **Compare your reasoning to the solution**

If your reasoning was close: you understand that part of the system.
If you were off: that section is where your mental model has a gap.
Return to AUTHORITY_TRAINING.md or BUILDER_AWARENESS.md for that topic.

The goal is not to get every answer right on first try. The goal is
to build the habit of systematic thinking so that when a real problem
hits at 2am, you have a reliable process — not panic.

---

## Part 1 — How to Think Like a Developer

Before the scenarios, here is the thinking framework you will
use throughout this document. Memorize it. Apply it to every problem.

### The Five-Question Debug Protocol

When something is wrong, ask these five questions in order.
Do not skip ahead. Do not go to question 3 before answering question 1.

```
QUESTION 1: What exactly is the symptom?
  Not "it's broken" — be precise.
  "The upload modal says success but the transaction never appears in the list."
  "The dashboard shows ₹0 for total spend even though receipts exist."
  "The user gets a 401 but they're clearly logged in."

QUESTION 2: Which layer is producing this symptom?
  Browser/UI symptom → start in React components or Next.js route
  API error code → start in Next.js API routes or FastAPI
  Wrong/missing data → start in the database
  AI output is wrong → start in the prompt or Pydantic validation

QUESTION 3: What does the data look like right now?
  Check Supabase Table Editor BEFORE reading code.
  Find the specific row. What is its status? Its values?
  "The receipts row exists with status='complete' but no transactions row."
  Now you know where the break is.

QUESTION 4: What should have happened that didn't?
  Trace the expected flow step by step.
  "After OCR and categorization, FastAPI should INSERT a transactions row
   and UPDATE the receipts status. The UPDATE happened. The INSERT didn't."
  Now you have a hypothesis.

QUESTION 5: What is the minimal change to fix it?
  Fix the specific thing that broke. Don't refactor.
  Don't improve while debugging. Fix, confirm it works, then improve.
```

### The Two Debugging Anti-Patterns to Avoid

**Anti-Pattern 1: Reading code before checking data**
Most bugs leave evidence in the database. Check the database first.
Reading code when the bug is in the data wastes hours.

**Anti-Pattern 2: Changing multiple things at once**
You change the prompt, the validation, and the API route together.
Then it works. But you don't know which change fixed it.
Next time a similar bug occurs, you have no knowledge to apply.
Change one thing. Observe the result. Then change the next thing.

---

## Part 2 — Scenario Set

---

### SCENARIO 01 — BUG
**"User uploads a receipt. The upload modal shows success.
But the new transaction never appears in the dashboard."**

---

🤔 **THINK FIRST:**
- Where will you check first?
- What are the possible places this could have gone wrong?
- What specific things in the database will you look at?

*(Write your answer. Then continue.)*

---

**GUIDED SOLUTION:**

**Step 1: Check the receipts table in Supabase.**

Find the specific receipt row for this upload.
Read the `status` column.

```
status = 'failed_ocr'
  → NVIDIA NIM could not read the image confidently
  → Confidence was below 0.30
  → FastAPI returned 422 to Next.js
  → Next.js returned 422 to browser
  → BUT the upload modal might have shown success anyway
     if the frontend wasn't checking the 422 properly

  Check: src/app/api/receipts/upload/route.ts
  Is it handling the 422 response from FastAPI?
  Does it differentiate between "upload to storage succeeded"
  and "pipeline processing succeeded"?

status = 'pending'
  → The receipt row was created but FastAPI was never called
  → OR FastAPI is still running (very long OCR call)
  → Check Railway logs: did /analyze/receipt receive the request?
  → Is the Railway service running? Call GET /health

status = 'complete'
  → Receipt processed successfully
  → Check: does a transactions row exist for this receipt?
  → Filter: SELECT * FROM transactions WHERE receipt_id = '[id]'
  → If transactions row exists but dashboard doesn't show it:
     cache invalidation issue (React Query not refetching)
  → If transactions row does NOT exist:
     the INSERT failed silently — check FastAPI logs
```

**Step 2: Check the browser console.**
What HTTP status did `/api/receipts/upload` return?
`200` with no error? Check the response body.
`422`? The pipeline failed — which step?

**Step 3: Check Railway logs.**
Did FastAPI log anything for this receipt_id?
Did the OCR call succeed? What was the confidence score?
Did the categorization call succeed?
Did the database INSERT execute?

**Root cause (most common):**
The receipt was stored in Supabase Storage (so the user
sees a visual confirmation) but the pipeline failed somewhere
between Next.js calling FastAPI and FastAPI writing the
transaction. The `status` column tells you exactly where.

**The lesson:**
The `receipts.status` column is a pipeline state machine.
Every stage has a status. When something is missing, the
status tells you which stage never completed. Always check
the status column first.

---

### SCENARIO 02 — BUG
**"A user is logged in and can see their dashboard.
But every time they try to upload a receipt, they get 401."**

---

🤔 **THINK FIRST:**
- What does 401 mean in this system?
- Which part of the code returns 401 on uploads?
- Why would a logged-in user get 401?

*(Write your answer. Then continue.)*

---

**GUIDED SOLUTION:**

401 means "you are not authenticated." In FinSight, every
API route starts by calling `supabase.auth.getSession()`.
If the session is missing or invalid, 401 is returned immediately.

**The user can see their dashboard — so why is the session invalid for uploads?**

This is the key insight. The dashboard is showing cached data.
React Query's stale-while-revalidate pattern means the dashboard
can render from cache even after the session expires.

**Check: when did the user last log in?**
Supabase sessions expire after 1 hour by default. The refresh
token extends this automatically — but only if the user is
actively making requests that trigger the refresh.

**The actual problem scenarios:**

```
Scenario A: The user opened the app, left it idle for 2 hours,
             then tried to upload. The session expired.
  Fix: The browser should auto-refresh the session.
       Check: is the Supabase client configured with
       `persistSession: true` and `autoRefreshToken: true`?
       These are default in @supabase/ssr — verify they're set.

Scenario B: The user's cookies were cleared mid-session.
  Fix: They need to log in again. This is expected behavior.
  Communicate it: show a clear "Please log in again" message,
  not a generic error.

Scenario C: The upload API route is not using the server-side
             Supabase client — it's using the browser client.
  This would mean the session cookie is not being read correctly.
  Fix: Ensure createSupabaseServerClient() is used in API routes,
       not createClient() (the browser version).
```

**Check in code:**
```typescript
// src/app/api/receipts/upload/route.ts
// This line should use the SERVER client
const supabase = createSupabaseServerClient()  // ← correct
// NOT:
const supabase = createClient(url, anonKey)    // ← wrong for API routes
```

**The lesson:**
The dashboard looking fine does not mean the session is fine.
The dashboard reads from React Query cache. Upload routes
read from cookies on every request. These are independent.
Always test authentication by making a write request, not
by checking if a read page renders.

---

### SCENARIO 03 — BUG
**"The Intelligence Meter is stuck at Level 2 even though
the user has uploaded 12 receipts."**

---

🤔 **THINK FIRST:**
- What determines the intelligence level?
- What database column should you check first?
- What could cause the count to be wrong?

*(Write your answer. Then continue.)*

---

**GUIDED SOLUTION:**

The intelligence level is determined by `total_receipts_uploaded`
in the `profiles` table. The level is calculated from this count —
Level 4 requires count ≥ 10.

**Step 1: Check the profiles table.**

```sql
SELECT total_receipts_uploaded, intelligence_level
FROM profiles
WHERE id = '[user_id]'
```

**Possible findings:**

```
total_receipts_uploaded = 4, intelligence_level = 2
  → Only 4 counted, despite 12 uploads
  → Check: how many receipts have status = 'complete'?
  SELECT COUNT(*) FROM receipts
  WHERE user_id = '[user_id]'
  AND status = 'complete'

  If complete count = 4: 8 uploads failed silently
  Check receipts WHERE status = 'failed_ocr' or status = 'pending'
  The count only increments on successful processing.

total_receipts_uploaded = 12, intelligence_level = 2
  → Count is correct but level not updated
  → The SQL function increment_receipt_count() calculates level:
    WHEN total >= 10 THEN 4
    WHEN total >= 6  THEN 3
    WHEN total >= 3  THEN 2
    ELSE 1
  → But intelligence_level shows 2 when it should show 4
  → Was the function recently modified? Check the SQL function definition.
  → Did you apply the migration that updated the level thresholds?

total_receipts_uploaded = 12, intelligence_level = 4 (in DB)
  → Database is correct. Problem is in the UI.
  → The frontend might be reading intelligence_level from the DB
    instead of computing it from total_receipts_uploaded.
  → Check: src/hooks/useIntelligenceLevel.ts
    The hook should use getIntelligenceLevel(profile.total_receipts_uploaded)
    NOT profile.intelligence_level
```

**The lesson:**
There are two sources of truth fighting each other: the computed
level in the DB and the count used to compute it. The UI should
always derive the level from the count, not read the pre-computed
level. This way, if the DB level is ever wrong, the UI is still right.

---

### SCENARIO 04 — FEATURE CHANGE
**"The product manager wants to show category percentages
on the dashboard. 'Food & Dining: 38%' instead of just the amount."**

---

🤔 **THINK FIRST:**
- Is this a frontend change or a backend change?
- Where does the category breakdown data currently come from?
- What math is needed, and where should it run?

*(Write your answer. Then continue.)*

---

**GUIDED SOLUTION:**

**Is this frontend or backend?**
Both, but the math belongs in the backend. The frontend
should receive percentages ready to display — not raw amounts
that it has to calculate percentages from.

**Where is the current data?**
The dashboard summary endpoint already returns category data.
Check what it currently returns:

```typescript
// Current response from GET /api/dashboard/summary
{
  total_spend: 24300,
  transaction_count: 31,
  top_category: "Food & Dining",
  // category_breakdown NOT currently included
}
```

**What needs to change:**

**Backend change — `/api/dashboard/summary` route:**
```typescript
// Add to the database query: group by category
const categoryQuery = await supabase
  .from('transactions')
  .select('category, amount')
  .eq('user_id', userId)
  .gte('transaction_date', thirtyDaysAgo)

// Compute category totals and percentages
const categoryTotals: Record<string, number> = {}
for (const t of categoryQuery.data) {
  categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount
}

const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0)

const categoryBreakdown = Object.entries(categoryTotals).map(([category, amount]) => ({
  category,
  amount,
  percentage: Math.round((amount / total) * 100)  // e.g., 38
})).sort((a, b) => b.amount - a.amount)

// Add to response
return NextResponse.json({
  ...existingData,
  category_breakdown: categoryBreakdown
})
```

**Frontend change — Dashboard component:**
```typescript
// Read the new field from the API response
const { data } = useQuery({ queryKey: ['dashboard', 'summary'], ... })

// Display it
{data.category_breakdown.map(({ category, percentage, amount }) => (
  <div key={category}>
    <span>{category}</span>
    <span>{percentage}%</span>  // ← new
    <span>₹{amount}</span>
  </div>
))}
```

**What NOT to do:**
Do not compute percentages in the React component from raw totals.
The backend should own aggregation. The frontend should own display.
If you compute in the frontend, every client does the same calculation.
If you compute in the backend, it happens once.

**The lesson:**
When adding a new data point to the UI, ask: "Does this data
need to be computed, or is it already in the database?"
Aggregation (SUM, GROUP BY, percentages) belongs in the backend.
Formatting (color, size, layout) belongs in the frontend.

---

### SCENARIO 05 — FEATURE CHANGE
**"We want to add a 'mark as business expense' toggle
on each transaction. Freelancers need this for tax tracking."**

---

🤔 **THINK FIRST:**
- What database column handles this? (hint: it already exists)
- What API endpoint needs to be created or modified?
- What happens to the tax estimate when this changes?

*(Write your answer. Then continue.)*

---

**GUIDED SOLUTION:**

**The column already exists.**
`transactions.is_business_expense BOOLEAN DEFAULT FALSE`

The schema was designed with freelancers in mind. The column
exists. The Decision Engine's tax module already uses it:
`SUM(amount) WHERE is_business_expense = TRUE`.

You don't need a schema migration. You need:
1. A way to toggle it in the UI
2. An API route to update it in the database
3. A trigger to recalculate the tax estimate

**API route:**
```typescript
// PATCH /api/receipts/[id]/business-flag
// (Or: extend the existing PATCH /api/receipts/[id])

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { is_business_expense } = await request.json()
  const userId = session.user.id

  // Update ONLY if user owns this receipt (double-check beyond RLS)
  const { error } = await supabase
    .from('transactions')
    .update({ is_business_expense })
    .eq('receipt_id', params.id)
    .eq('user_id', userId)  // extra safety

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  return NextResponse.json({ success: true })
}
```

**Frontend:**
```typescript
// On the ReceiptDetailPage, add a toggle
<Toggle
  checked={transaction.is_business_expense}
  onChange={(value) => {
    // Optimistic update: update UI immediately
    setTransaction({ ...transaction, is_business_expense: value })
    // Then persist to API
    fetch(`/api/receipts/${receiptId}/business-flag`, {
      method: 'PATCH',
      body: JSON.stringify({ is_business_expense: value })
    })
    // After success: invalidate the decision engine output cache
    queryClient.invalidateQueries({ queryKey: ['decision-engine'] })
  }}
/>
```

**What happens to the tax estimate?**
The Decision Engine reads `is_business_expense` from the
transactions table. When you toggle a transaction, invalidating
the `decision-engine` query cache triggers a refetch. The
Decision Engine recomputes the tax estimate with the updated flag.

**The lesson:**
Features that seem new often already have their data layer built.
Check the database schema before assuming you need to design storage.
The `is_business_expense` column was built in anticipation of this
exact feature. When you find a column that says "this was planned,"
you're building the feature it was planned for.

---

### SCENARIO 06 — FAILURE CASE
**"NVIDIA NIM is returning errors intermittently.
Some uploads succeed, some fail randomly.
No pattern — same image sometimes works, sometimes doesn't."**

---

🤔 **THINK FIRST:**
- Is this a client problem or a provider problem?
- What existing mechanism handles this?
- What would you add if it wasn't already there?

*(Write your answer. Then continue.)*

---

**GUIDED SOLUTION:**

**First: distinguish intermittent from consistent.**
If the SAME image sometimes succeeds and sometimes fails,
the problem is not the image quality. It's the API provider's
infrastructure or your network call.

**Check Railway logs for the pattern:**
```
- Are all failures happening at the same time of day?
  → API rate limiting (NVIDIA NIM has request limits)
  → Check ai_audit_log: response_time_ms on failing calls

- Are failures always after a certain duration?
  → Timeout: the Railway → NIM call is taking too long
  → Default timeout in FastAPI: 12 seconds for NIM
  → Reduce image size before sending (large images = slow)

- Are failures always accompanied by a specific error code?
  → 429: rate limited. Slow down.
  → 503: NVIDIA's service is temporarily overloaded
  → 500: NVIDIA internal error
```

**The existing retry logic:**
```python
# This is already in the codebase (AI_STACK.md §4.2)
@retry(
    stop=stop_after_attempt(2),           # Try twice
    wait=wait_exponential(min=1, max=4),  # Wait 1s then up to 4s
    retry=retry_if_exception_type(
        (httpx.TimeoutException, httpx.ConnectError)
    )
)
async def call_nvidia_ocr_with_retry(image_base64: str) -> dict:
    return await call_nvidia_ocr(image_base64)
```

**If this isn't enough:**
For 429 (rate limited), add a specific check:
```python
if response.status_code == 429:
    retry_after = int(response.headers.get("Retry-After", 5))
    await asyncio.sleep(retry_after)
    return await call_nvidia_ocr(image_base64)  # one more attempt
```

**What if retries still fail?**
The receipt is marked `failed_ocr`. The user gets a clear
error message. They can retry manually. This is not a product
failure — it is a graceful degradation. The user's data is
intact. The file is stored. They just need to try again.

**What you should NOT do:**
Do not retry indefinitely. Two attempts is enough. More retries
mean the user waits longer during an outage, and you burn more
API costs on calls that probably won't succeed if two already failed.

**The lesson:**
Intermittent failures in AI providers are normal. They are not
your code's fault. Design for them from day one. Two retries with
exponential backoff handles 95% of transient failures. For the
remaining 5%: graceful failure + user retry is the correct answer.

---

### SCENARIO 07 — FAILURE CASE
**"The Gemini API is down. Users are reporting that the
Insights page shows nothing — completely blank."**

---

🤔 **THINK FIRST:**
- Should the Insights page ever show nothing?
- What fallback should exist for this situation?
- Is "Gemini is down" a user-visible problem or a silent one?

*(Write your answer. Then continue.)*

---

**GUIDED SOLUTION:**

**The Insights page should never show nothing.**

This is a design principle, not a preference. Insights are
advisory — they help users understand their data. If Gemini
is unavailable, deterministic Python can still produce
accurate (if less eloquent) insights from pre-computed data.

**Why is the page blank?**
The code is not handling the Gemini failure correctly.
It is probably doing this:
```typescript
// WRONG: Error propagates to UI
const insights = await generateInsights(transactions)  // throws on Gemini failure
setInsights(insights)  // never reached
// Component renders with no data → blank page
```

**It should do this:**
```python
# FastAPI insight generation with fallback
async def generate_insights(transactions: list, computed_patterns: dict):
    try:
        response = await call_gemini_insights(computed_patterns)
        validated = InsightsOutput(**response)
        return validated.dict()
    except Exception as e:
        # Log the failure internally
        logger.log_pipeline_event("gemini_fallback", reason=str(e))
        # Return deterministic fallback — accurate, just less elegant
        return get_insights_fallback(computed_patterns, "₹")
```

**The fallback function** (from PROMPT_STRATEGY.md §8.3)
builds insight text from pre-computed Python data:
```python
def get_insights_fallback(computed_patterns: dict, symbol: str) -> dict:
    top = max(computed_patterns["category_breakdown"],
              key=computed_patterns["category_breakdown"].get)
    return {
        "insights": [{
            "title": "Top Spending Category",
            "body": f"Your highest category is {top}.",
            "data_point": f"{symbol}{computed_patterns['category_breakdown'][top]:,.0f}"
        }],
        "recommendations": [...],
        "anomaly_score": 0.0,
        "summary": f"You have {computed_patterns['transaction_count']} transactions.",
        "_fallback": True
    }
```

**The user experience during Gemini outage:**
The Insights page loads. It shows accurate numbers from
their data. The sentences are simpler. The user never
sees "Error" or "Loading..." indefinitely.

**Monitoring the outage:**
The `_fallback: True` flag is logged to `ai_audit_log`.
When the fallback rate for Gemini spikes above 3%, an
alert fires. You know Gemini is down without users reporting it.

**The lesson:**
Every external AI service will have outages. "Gemini is
down" is not an edge case — it is a scheduled event.
Design the product so that any single AI provider being
unavailable does not show an error state. Use fallbacks.
The user should never see the difference.

---

### SCENARIO 08 — ARCHITECTURE DECISION
**"We're getting reports that uploads are slow during peak
evening hours. Should we add Redis caching right now?"**

---

🤔 **THINK FIRST:**
- What exactly is slow? Upload processing? Dashboard loading?
- What problem does Redis actually solve?
- What is the actual bottleneck you need to measure first?

*(Write your answer. Then continue.)*

---

**GUIDED SOLUTION:**

**Step 1: Diagnose before prescribing.**

"Uploads are slow" is a symptom. Redis is a solution.
But Redis is not the solution to every performance problem.
Applying it before diagnosing is adding complexity
to a problem you haven't measured.

**What is actually slow?**

Check `ai_audit_log`:
```sql
SELECT stage, AVG(response_time_ms), MAX(response_time_ms)
FROM ai_audit_log
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY stage
```

This tells you which stage is slow:
```
OCR:              avg 2200ms → normal range (NIM is slow, this is expected)
OCR:              avg 6800ms → NIM is hitting rate limits or overloaded
Categorization:   avg 800ms  → abnormal (Groq should be ~250ms)
Database writes:  avg 900ms  → Supabase has connection issues
```

**When Redis helps:**

```
Redis solves: repeated reads of the same data
  Dashboard loading 500ms because it queries transactions every time?
  → Cache the dashboard summary in Redis for 60s
  → First request: 500ms (compute + cache)
  → Next 10 requests in 60s: 2ms (serve from cache)

Redis solves: queue overflow during burst uploads
  50 users uploading simultaneously, NIM rate limits triggering?
  → Redis-backed BullMQ queue absorbs the burst
  → Workers process at a controlled rate
  → Users see "queued" instead of errors
```

**When Redis does NOT help:**

```
Redis does NOT solve: OCR being slow
  NIM takes 1.5–3.5 seconds per call. That is the model's processing time.
  Redis cannot cache mid-pipeline AI results.
  The user still waits for the OCR to complete.

Redis does NOT solve: slow database at low volume
  At Phase 1–2 (< 500 users), Supabase query times should be
  under 100ms. If queries are slow at this scale, the problem
  is missing indexes or unoptimized queries — not cache.
  Add Redis before fixing indexes → you cache slow queries
  and still have slow queries behind the cache.
```

**The current situation (Phase 1–2):**
Unless you have 500+ concurrent users and measurable queue depth,
Redis adds operational complexity (new service, new failure surface,
new cost) without solving a real problem.

**The right answer now:**
1. Measure: which stage is slow in ai_audit_log?
2. Fix the actual bottleneck (wrong index? too many DB queries? image too large?)
3. If uploads still fail under load → then add the queue
4. If dashboard is slow at scale → then add Redis caching

**The lesson:**
Redis is not a general performance improvement. It is a
solution to specific problems: repeated reads of stable data
and burst queue management. Adding it before you have those
problems adds complexity. Add infrastructure when the problem
is measurable, not when performance feels slow.

---

### SCENARIO 09 — ARCHITECTURE DECISION
**"A team member suggests switching from Supabase to
PlanetScale (MySQL) because it has better scaling at 1M+ rows."**

---

🤔 **THINK FIRST:**
- What specific features of Supabase are load-bearing for FinSight?
- What would you lose by switching?
- At what point would switching be worth considering?

*(Write your answer. Then continue.)*

---

**GUIDED SOLUTION:**

**Evaluate what Supabase provides that is not just "a database":**

```
1. Row Level Security (RLS)
   FinSight's entire security model depends on RLS.
   Every table has policies. The service role bypasses them.
   The anon key is safe to expose because RLS prevents misuse.

   PlanetScale (MySQL): No native RLS.
   You would need to implement data isolation in application code.
   Every API route would need explicit WHERE user_id = userId filters.
   Missing one query = data breach. RLS makes this impossible.

2. Supabase Storage
   Receipt images are stored in Supabase Storage.
   Signed URLs are generated by Supabase. Path-based RLS is applied.
   PlanetScale has no file storage. You would need AWS S3 separately.

3. Supabase Auth
   Session management, JWT validation, Google OAuth, httpOnly cookies.
   PlanetScale has no auth. You would need Auth0, NextAuth, or custom auth.

4. pg_trgm (trigram extension)
   Used for merchant similarity search in Phase 3.
   MySQL has FULLTEXT search but not trigram similarity.
   Would need Elasticsearch or Algolia for the same functionality.

5. PostgreSQL functions (SQL triggers, increment_receipt_count())
   The intelligence level calculation happens in a PostgreSQL function.
   The anomaly detection trigger fires on INSERT.
   MySQL stored procedures exist but syntax differs; migration is non-trivial.
```

**The actual scaling concern:**

At 1M+ rows in the transactions table, PostgreSQL absolutely handles it.
Supabase Pro plan supports hundreds of millions of rows.
The actual performance concern at 1M rows is query optimization:
proper indexes, materialized views, connection pooling.
These are already in the architecture (INFRA.md §5.1).

**When would switching be worth considering:**

Only if two conditions are both true:
1. Supabase Pro cannot serve the query load (measurable: p95 > 500ms)
2. You have exhausted PostgreSQL optimization (indexes, materialized views,
   read replicas, connection pooling via PgBouncer)

If both are true, the migration path is to self-hosted PostgreSQL on
Railway or AWS RDS — not to MySQL. You keep the PostgreSQL ecosystem
(RLS, pg_trgm, functions, triggers) and gain infrastructure control.

**The lesson:**
Database migration is one of the most expensive engineering projects
a product can undertake. Every migration proposal should be evaluated
against: "What specific measurable problem does this solve?" and
"Have we exhausted optimization options on the current stack?"
Switching databases for theoretical future scale is premature.
Optimize first. Migrate only when optimization is exhausted.

---

### SCENARIO 10 — BUG
**"Categorization worked perfectly for the first 50 receipts.
Then the same merchant — Uber — started being categorized as
'Travel & Accommodation' instead of 'Transportation'."**

---

🤔 **THINK FIRST:**
- What changed between receipt 50 and now?
- Is this a model problem or a data problem?
- Where would you look to understand what happened?

*(Write your answer. Then continue.)*

---

**GUIDED SOLUTION:**

**The timing clue: it worked, then stopped working.**

This means something changed. The model didn't change.
Groq's model is pinned to `llama-3.3-70b-versatile`.
The prompt hasn't been touched.

**What changed between receipt 50 and now?**

The merchant history. That's the input that changes as users
upload more receipts. And in Phase 2, when users can correct
categories, a correction is added to the history.

**Step 1: Check if this user corrected Uber before.**
```sql
SELECT merchant, category, is_manually_corrected
FROM transactions
WHERE user_id = '[user_id]'
AND merchant ILIKE '%uber%'
ORDER BY created_at DESC
```

**Likely finding:**
```
merchant       | category                   | is_manually_corrected
───────────────┼────────────────────────────┼──────────────────────
Uber           | Transportation             | false  ← normal receipts
Uber Intercity | Travel & Accommodation     | true   ← user corrected this one
```

The user took an Uber intercity trip, which was correctly
categorized as "Travel & Accommodation." They corrected it
(perhaps they wanted it as Transportation for consistency).

Now the merchant history includes: "Uber → Travel & Accommodation (corrected by user)."

When the next regular Uber trip is uploaded, the categorization
prompt includes this history. Groq sees a human correction and
trusts it more than its own judgment. The regular Uber ride
gets categorized as "Travel & Accommodation."

**The root cause:**
The merchant history injection is not distinguishing between
"Uber (short trip)" and "Uber Intercity (long trip)." It is
treating all Uber transactions as the corrected category.

**Fix Option 1 (immediate):** User corrects the next Uber
transaction back to Transportation. The correction history
now has both categories. Groq will see the ambiguity and
use its own judgment (which is usually correct for regular Uber).

**Fix Option 2 (robust, longer term):**
The merchant history query should weight more recent corrections
more heavily than older ones, and should track whether a pattern
is consistent or mixed. If Uber has 10 "Transportation" results
and 1 "Travel & Accommodation" result, the prompt should reflect
the majority pattern.

**The lesson:**
Features that improve accuracy (merchant history) can also
introduce new failure modes. The correction feedback loop can
amplify one human error across all future transactions from
the same merchant. When building personalization, consider
what happens when the personalization data is wrong.

---

### SCENARIO 11 — FEATURE CHANGE
**"We want to show users their year-to-date spending total
prominently on the dashboard. Currently we only show 30-day totals."**

---

🤔 **THINK FIRST:**
- Is this purely a backend change, frontend change, or both?
- What SQL query gives you year-to-date spending?
- What performance consideration is there at scale?

*(Write your answer. Then continue.)*

---

**GUIDED SOLUTION:**

**Backend change — update the dashboard summary query:**

```typescript
// Compute year start date
const now = new Date()
const yearStart = new Date(now.getFullYear(), 0, 1)  // January 1st
  .toISOString().split('T')[0]

// Add a second query for YTD
const { data: ytdData } = await supabase
  .from('transactions')
  .select('amount')
  .eq('user_id', userId)
  .gte('transaction_date', yearStart)

const ytdTotal = ytdData?.reduce((sum, t) => sum + t.amount, 0) || 0

// Add to response
return NextResponse.json({
  ...thirtyDayData,
  ytd_total: ytdTotal,
  ytd_year: now.getFullYear()
})
```

**Frontend change — add the new KPI card:**

```typescript
<KPICard
  label={`${data.ytd_year} Total`}
  value={formatCurrency(data.ytd_total)}
  sublabel="Year to date"
/>
```

**Performance consideration:**

At Phase 1–2 with a few thousand transactions, this query
runs in milliseconds. At Phase 4 with millions of transactions
and thousands of concurrent users loading dashboards, this
becomes expensive.

The solution is already in the architecture: materialized views.

```sql
-- Phase 4: pre-compute YTD totals
CREATE MATERIALIZED VIEW mv_user_ytd_totals AS
SELECT
  user_id,
  EXTRACT(YEAR FROM transaction_date) AS year,
  SUM(amount) AS ytd_total
FROM transactions
GROUP BY user_id, EXTRACT(YEAR FROM transaction_date);

-- Refresh after each upload
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_ytd_totals;
```

**Build the simple version now.** Add the materialized view
in Phase 4 when the query volume justifies it. Premature
optimization is building complex infrastructure for a problem
you don't have yet.

**The lesson:**
When adding new aggregate data to the API, build the simple
query first. Note where the performance cliff is (usually
when concurrent users × transaction count becomes large).
Plan the optimization but don't implement it until the problem
is real. Ship the feature. Optimize when the metrics tell you to.

---

### SCENARIO 12 — FAILURE CASE
**"The FastAPI service on Railway keeps restarting every
few hours. The /health endpoint shows 200 for a while,
then Railway restarts it. No clear error in the logs."**

---

🤔 **THINK FIRST:**
- What would cause Railway to restart a service?
- What does the /health endpoint check?
- What might cause healthy-looking logs followed by a crash?

*(Write your answer. Then continue.)*

---

**GUIDED SOLUTION:**

**Railway restarts a service when:**
1. The `/health` endpoint returns non-200 for 3 consecutive checks
2. The process crashes (unhandled exception)
3. Memory limit is exceeded

**Since logs look healthy before restart, option 3 is most likely.**

**Check Railway's resource metrics:**
In the Railway dashboard, check the memory usage graph.
Is it growing slowly over time (memory leak) and then
spiking at restart time?

```
Memory pattern:
  Start: 200MB
  After 1 hour: 380MB
  After 2 hours: 580MB  ← approaching the 512MB limit
  After 3 hours: RESTART (out of memory)
```

**What causes memory growth in FastAPI?**

Most common cause: the PIL Image library holding image data.

```python
# Memory leak pattern:
async def prepare_image(image_bytes: bytes):
    img = Image.open(io.BytesIO(image_bytes))
    # ... processing ...
    return processed_bytes
    # img object is never explicitly closed
    # Python's garbage collector should handle this
    # but under load with many concurrent requests, GC can fall behind
```

**Fix:**
```python
async def prepare_image(image_bytes: bytes):
    with Image.open(io.BytesIO(image_bytes)) as img:
        # ... processing ...
        return processed_bytes
    # Context manager ensures image is closed after processing
```

**Other cause: the global Supabase client holding connections.**

Check if the `supabase` client is being created per request
instead of once globally:

```python
# BAD: new client every request (accumulates connections)
async def save_to_db(data: dict):
    supabase = create_client(url, key)  # ← creates new connection pool each time
    return supabase.table("...").insert(data).execute()

# GOOD: reuse the global client
supabase = create_client(url, key)  # ← module-level, created once

async def save_to_db(data: dict):
    return supabase.table("...").insert(data).execute()  # ← reuses connection
```

**Immediate fix if memory is the issue:**
Increase Railway's memory allocation to 1GB.
This buys time while you find and fix the actual leak.

**Long-term fix:**
Profile the memory usage with a tool like `memory_profiler`.
Find which objects are not being released. Add explicit cleanup.

**The lesson:**
Intermittent restarts are almost always resource exhaustion,
not logic errors. Check memory and CPU metrics before reading code.
The resource graphs tell you when the problem occurs, which
narrows down what code is running at that time.

---

### SCENARIO 13 — BUG
**"A user says their Financial Health Score dropped from 78
to 23 overnight. They didn't upload anything new."**

---

🤔 **THINK FIRST:**
- The Health Score is computed — what inputs could have changed?
- Did the user's data change? Or did the computation change?
- Where does the Health Score come from?

*(Write your answer. Then continue.)*

---

**GUIDED SOLUTION:**

**A 78-to-23 drop without new uploads is alarming. Something changed
in the inputs or the computation.**

**Step 1: Check if this is a display bug or a data bug.**

```sql
-- Find the most recent two insight rows for this user
SELECT health_score, generated_at, score_breakdown
FROM insights
WHERE user_id = '[user_id]'
ORDER BY generated_at DESC
LIMIT 3
```

```
Result:
generated_at           | health_score | score_breakdown
───────────────────────┼──────────────┼────────────────────────────────────
2024-11-15 09:32:00    | 23           | {...}
2024-11-14 22:15:00    | 78           | {...}  ← last night before the drop
2024-11-14 10:00:00    | 75           | {...}
```

The database confirms the score changed. This is not a display bug.
The insights were regenerated between 22:15 and 09:32.

**Step 2: What triggered insight regeneration at 9:32am?**
Was there a background scheduler that re-runs insights daily?
Check: was an upload made that we missed? Check receipts table.

```sql
SELECT uploaded_at, status FROM receipts
WHERE user_id = '[user_id]'
AND uploaded_at > '2024-11-14 22:00:00'
ORDER BY uploaded_at DESC
```

**Step 3: Compare the score_breakdown columns.**
The score has four sub-components: consistency, diversification,
anomaly, trend. Which one changed dramatically?

```
Before: { consistency: 85, diversification: 70, anomaly: 80, trend: 75 }
After:  { consistency: 85, diversification: 65, anomaly: 5,  trend: 15 }
```

Anomaly sub-score dropped from 80 to 5. Trend dropped from 75 to 15.

**Step 4: What changed in the anomaly and trend calculations?**

The anomaly sub-score uses `anomaly_score` from the Gemini response.
The trend sub-score looks at week-over-week spending direction.

```
Possible cause 1: The 30-day window rolled over, including a
  high-spend period that wasn't previously in the window.
  E.g., November 15 now includes November 15 of last year... wait,
  that's not how it works. The window is the last 30 calendar days.
  But if October included a one-time large purchase (laptop, medical),
  that just entered the 30-day window. Multiple anomalies = low score.

Possible cause 2: The Gemini insights fallback ran instead of real Gemini.
  Fallback sets anomaly_score = 0.0 by default.
  But 0.0 anomaly would mean NO anomalies — the score should be HIGH, not low.
  Check: was _fallback=True in the insights row?
```

**Most likely cause based on 78→23 magnitude:**
A batch of old high-spend transactions entered the 30-day
calculation window that weren't there before. The anomaly
detector flagged several of them.

**Fix:** Explain to the user that the score reflects the last
30 days of data. If October had unusual high spending that
is now in the calculation window, the score will reflect that.
The score is not a permanent judgment — it is a rolling 30-day snapshot.

**The lesson:**
Large sudden changes in computed values almost always mean
the calculation window changed — not that the calculation broke.
Time-windowed features need user communication: "This score
reflects your last 30 days of activity." Without that context,
a legitimate window change looks like a bug.

---

## Part 3 — System Tracing Practice

*Build the habit of following any request through the system.*

---

### 3.1 The Tracing Exercise

Pick any of these user actions and trace every step, every
file, every database operation. Do it without looking at code.
Then verify against the codebase.

**Action 1:** User clicks "Delete Receipt" on a specific receipt.
- What API route is called?
- What happens first — delete from Storage or delete from DB?
- Does the receipt count decrease?
- What cache entries are invalidated?

**Action 2:** User opens the Insights page for the first time.
- What API route is called?
- Does FastAPI get involved?
- What is returned if insights were never generated?
- What triggers insight generation?

**Action 3:** User corrects "Other" to "Food & Dining" on a transaction.
- What API route is called?
- What DB column is updated?
- Will the next Swiggy receipt auto-categorize as Food & Dining?
- How does the correction reach the categorization model?

---

### 3.2 The "What Could Go Wrong" Exercise

For each action above, name three things that could go wrong
and what the user would see:

```
Action: Delete Receipt

Could go wrong 1: Storage delete succeeds, DB delete fails
  User sees: Receipt appears deleted (no longer in list)
  But: Orphaned file in Storage, no DB record to clean it up
  Real consequence: Minor storage cost, receipt truly gone

Could go wrong 2: Session expires between selecting and confirming
  User sees: 401 error on confirmation
  Fix: Clear error message "Your session expired. Please log in."

Could go wrong 3: Receipt_id in the URL is wrong (stale cache)
  User sees: 404 "Receipt not found"
  Fix: Invalidate the receipts list cache after deletion so
       this stale ID is never accessible
```

Practice this for every feature you build. Name the failures
before you code the happy path.

---

## Part 4 — Confidence Building

*How to know when you understand the system.*

---

### 4.1 The Confidence Indicators

You know you understand FinSight when you can do these things
without hesitation. Use them as self-checks:

**Indicator 1: You can explain the upload flow to someone else
in plain English without looking at anything.**
Not with technical terms. With plain English.
"When you upload a receipt, your browser sends the file to
Next.js. Next.js checks that you're logged in and within your
limit. It stores the image and asks FastAPI to process it.
FastAPI reads the text with AI, assigns a category, and saves
the financial record. You see the result in about 3 seconds."

If you can say this comfortably: you have System Authority.

**Indicator 2: You can open any of these files and know
what it does before reading the function names:**
- `src/app/api/receipts/upload/route.ts`
- `fastapi/pipeline/orchestrator.py`
- `fastapi/ai_clients/groq_client.py`

If you can navigate these files without confusion: you have Code Authority.

**Indicator 3: When someone proposes using MongoDB instead of
Supabase, you can give three concrete reasons why that would
require rebuilding the security model, not just swapping databases.**

If you can argue this clearly: you have Decision Authority.

---

### 4.2 The Ownership Progression

```
WEEK 1: You can follow the upload flow with the documentation in front of you.

WEEK 2: You can follow the upload flow from memory,
         and check the database to verify it happened.

WEEK 3: When something breaks, you identify the layer within 2 minutes.
         You check the right table, read the right column,
         and have a hypothesis before opening any code.

WEEK 4: You can modify the dashboard summary API route,
         add a new field, and know exactly what the frontend needs
         to change to display it.

MONTH 2: You can propose a new feature, identify which files
          need to change, and estimate the work accurately.

MONTH 3: You have full ownership. You make architectural decisions
          with confidence. You know what the system can and cannot do.
          You can debug any problem in the system.
```

---

### 4.3 The Anti-Confidence Traps

These patterns signal that you don't fully own the system yet.
Recognize them. Work against them.

**"The code does something — I'm not sure what but it works."**
This is the most dangerous state. Code that "works somehow"
is code you cannot debug when it breaks. Understand every
line you are responsible for.

**"I'll just copy this pattern from another route."**
Pattern recognition is good. But always understand why the
pattern exists before copying it. Copying `const userId = session.user.id`
without knowing why you can't use `request.body.user_id` means
you'll write the wrong version someday.

**"The database handles that automatically."**
Sometimes true. But "automatically" usually means "a trigger or
function does it." Know what that trigger does. Know when it fires.
Know what happens if it doesn't fire.

**"I can fix this later."**
When debugging: fix the right thing now, not the symptoms.
When building: the "fix it later" items accumulate into a codebase
nobody understands. Make the code clear as you write it.

---

### 4.4 Your First Ownership Check

Before you write your first line of code in FinSight,
answer these questions on paper. Not in your head — on paper.

```
1. Where does user identity come from in a Next.js API route?
   Answer: _______________________________________________

2. Why does FastAPI run on Railway instead of Vercel?
   Answer: _______________________________________________

3. If a receipt's status is 'pending' after 10 minutes,
   what probably went wrong?
   Answer: _______________________________________________

4. Why is the free tier limit checked in the Next.js API route
   rather than in the frontend React component?
   Answer: _______________________________________________

5. If Groq returns confidence: 0.3 for a categorization,
   what does the transaction record in the database look like?
   Answer: _______________________________________________

6. What does 'total_receipts_uploaded' increment to after
   an upload where OCR confidence was 0.2?
   Answer: _______________________________________________

7. Which table would you check first if a user says their
   dashboard shows no data after 15 successful uploads?
   Answer: _______________________________________________
```

**Answers:**
1. `session.user.id` from the httpOnly cookie via `supabase.auth.getSession()`
2. Vercel functions timeout at 60s; FastAPI needs no timeout for AI pipeline
3. FastAPI was never called, or FastAPI started but hasn't finished
4. Client-side enforcement can be bypassed; server-side cannot
5. `category = 'Other'`, `confidence = 0.3` — still saved, amber dot in UI
6. It does NOT increment — failed OCR receipts don't count
7. The `receipts` table — check `status` for each receipt

---

*End of FinSight CODEBASE_SIMULATION.md v1.0.0*

*Every scenario in this document is based on real failure modes*
*from real production systems. The bugs are real. The fixes are real.*
*The debugging process is what professionals actually do.*

*Work through the scenarios twice: once on your own, once with an AI assistant.*
*On your second pass, explain your reasoning out loud. If you can explain it,*
*you own it.*
