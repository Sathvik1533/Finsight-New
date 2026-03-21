# FINSIGHT — AUTHORITY_TRAINING.md
## Gain Full Ownership of a Real Production System

```
Purpose:  Train you to own FinSight completely —
          not just follow instructions, but understand,
          debug, modify, and make decisions yourself
Audience: Beginner-to-intermediate developer
Style:    Practical, no jargon, real examples
Result:   You will think like a system builder
```

---

## What "Authority" Means in This Document

There are three kinds of authority you need to own a system:

**System Authority** — You understand what the system does, end to end.
When someone asks "what happens when a user uploads a receipt?", you can
trace every step without looking at code.

**Code Authority** — You can open any file, understand what it does,
change it confidently, and know what will break if you change something wrong.

**Decision Authority** — When someone says "should we use X or Y for this?",
you can give a reasoned answer based on what the system needs — not based
on what you've heard is popular.

Most developers have partial authority. They know their own file, their own
layer, their own task. Complete ownership means you understand the whole
machine, not just your one gear.

This document trains you for complete ownership.

---

## TABLE OF CONTENTS

1. [System Authority — The Full Picture](#1-system-authority)
2. [Code Authority — Practical Control](#2-code-authority)
3. [Debug Thinking — Tracing Problems Systematically](#3-debug-thinking)
4. [Decision Authority — Why the System Is Built This Way](#4-decision-authority)
5. [System Mental Model — How to Think Like a System Builder](#5-system-mental-model)

---

## 1. System Authority

*Understanding the system end-to-end, without looking at code.*

---

### 1.1 The Big Picture in One Sentence

FinSight is a system that takes a photograph of a receipt,
extracts financial data from it using AI, stores it in a
database, and builds intelligence about your spending behavior
over time.

Every feature — the dashboard, the health score, the subscription
detector, the tax estimator — is downstream of that one sentence.

---

### 1.2 The Four Layers

Before we trace the flow, understand the four layers every
request passes through. Each layer has one job. Breaking this
rule (layers doing each other's job) is how systems become unmaintainable.

```
┌──────────────────────────────────────────────────────────┐
│  LAYER 1: FRONTEND (Next.js)                             │
│  Job: Show things. Collect input. Nothing else.          │
│  Lives on: User's browser + Vercel's servers             │
│  Can do: Display data, handle clicks, make API calls     │
│  Cannot do: Store secrets, run AI, write to database     │
└──────────────────────────────────────────────────────────┘
              ↕ HTTPS requests
┌──────────────────────────────────────────────────────────┐
│  LAYER 2: BACKEND FOR FRONTEND — "BFF" (Next.js API)    │
│  Job: Be the trusted middleman. Validate. Gatekeep.      │
│  Lives on: Vercel's servers (server-side only)           │
│  Can do: Check sessions, enforce rules, call FastAPI     │
│  Cannot do: Run heavy computation, call AI directly      │
└──────────────────────────────────────────────────────────┘
              ↕ HTTPS + shared secret header
┌──────────────────────────────────────────────────────────┐
│  LAYER 3: AI ENGINE (FastAPI on Railway)                 │
│  Job: Do the AI work. Hold the AI keys.                  │
│  Lives on: Railway's servers (always running)            │
│  Can do: Call NVIDIA, Groq, Gemini, write to database   │
│  Cannot do: Handle browser sessions, serve HTML          │
└──────────────────────────────────────────────────────────┘
              ↕ SQL + REST
┌──────────────────────────────────────────────────────────┐
│  LAYER 4: DATABASE (Supabase)                            │
│  Job: Store everything. Remember everything.             │
│  Contains: PostgreSQL tables, receipt files, user auth   │
│  Can do: Store, retrieve, enforce access rules           │
│  Cannot do: Run AI, send emails, make API calls          │
└──────────────────────────────────────────────────────────┘
```

**The key insight:** Each layer only talks to the layers
immediately adjacent to it. The browser never talks to FastAPI
directly. FastAPI never talks to the browser directly.
This controlled flow is what makes the system secure and debuggable.

---

### 1.3 End-to-End Flow: One Upload, Every Step

Let's trace what happens when you photograph a receipt and
upload it. This is the most important flow in FinSight —
everything else is simpler.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: Browser sends the file
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You tap Upload. Your browser sends:
  Method: POST
  URL:    /api/receipts/upload
  Body:   the receipt image file
  Cookie: your session (proof of identity, automatic)

Nothing AI-related has happened yet. This is just a file
being sent to a server.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2: Next.js validates your identity
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The Next.js API route receives the request and immediately
asks Supabase: "Is this session cookie valid?"

Supabase confirms: "Yes, this is user ABC123."

The code extracts:
  userId = session.user.id  ← from the cookie
  (NEVER from the request body — that can be faked)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3: Next.js runs the gates
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before touching any AI or database, three checks run:

Gate 1 — Are you logged in?
  session exists? → pass
  no session?     → return 401, stop here

Gate 2 — Are you within your upload limit?
  free tier users: max 25 receipts
  read from DB: profiles.total_receipts_uploaded
  under limit? → pass
  over limit?  → return 402 (payment required), stop here

Gate 3 — Is this actually an image?
  check the actual bytes of the file (not the filename)
  .jpg pretending to be .php → detected and rejected
  valid image? → pass
  invalid?     → return 400, stop here

If ALL THREE pass: continue to step 4.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4: Store the file
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The image is uploaded to Supabase Storage.
Path: receipts/{userId}/{receiptId}.jpg

A "receipt" record is created in the database:
  status: 'pending'  ← not processed yet
  storage_path: 'receipts/ABC123/uuid.jpg'

This is a record that says "a file was uploaded and
is waiting to be processed."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5: Next.js calls FastAPI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next.js converts the image to base64 text (so it can
be sent inside a JSON body) and calls FastAPI:

  POST https://[railway-url]/analyze/receipt
  Header: X-Internal-Secret: [64-character secret]
  Body:   { image_base64: "...", userId: "ABC123", receiptId: "uuid" }

The X-Internal-Secret is like a password between
Next.js and FastAPI. Without it, FastAPI refuses
to do anything.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 6: FastAPI reads the receipt (NVIDIA NIM)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FastAPI checks the X-Internal-Secret. Valid? Continue.
Invalid? 401 immediately. No AI called.

FastAPI sends the image to NVIDIA NIM (a vision AI):

  Input:  the receipt image
  Output: { merchant: "Swiggy", amount: 340, date: "2024-11-15",
            confidence: 0.89 }

The confidence score (0.0 to 1.0) tells us how sure
the AI is about its reading.

  confidence < 0.30 → too uncertain → REJECT
    Receipt marked 'failed_ocr'
    User told: "We couldn't read this. Try again."
    Nothing more happens.

  confidence ≥ 0.30 → acceptable → CONTINUE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 7: FastAPI categorizes the transaction (Groq)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FastAPI sends the extracted data to Groq (a fast AI):

  Input:  { merchant: "Swiggy", amount: 340, date: "2024-11-15" }
          + your past merchant corrections (if any)
  Output: { category: "Food & Dining", confidence: 0.94 }

  confidence < 0.50 → not confident → category becomes "Other"
                       amber warning dot appears in UI
  confidence ≥ 0.50 → confident → use the category

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 8: FastAPI saves to database
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Three writes happen:

Write 1 → transactions table:
  { userId, receiptId, merchant: "Swiggy", amount: 340,
    category: "Food & Dining", confidence: 0.94 }

Write 2 → receipts table (update):
  status: 'complete'
  processed_at: [now]

Write 3 → profiles table (update):
  total_receipts_uploaded: +1
  intelligence_level: recalculated
  (if this was receipt #10, level jumps from 3 to 4)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 9: Decision Engine (background, you don't wait)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FastAPI schedules a background task.
You, the user, do NOT wait for this.

Background task runs:
- Computes tax estimates (Python math, not AI)
- Detects subscriptions (pattern matching, not AI)
- Checks budget alerts (comparison math, not AI)
- Asks Gemini to write one explanation sentence (AI)

Results saved to: decision_engine_outputs table

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 10: Response travels back, browser updates
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FastAPI → Next.js → Browser:
  { merchant: "Swiggy", amount: 340, category: "Food & Dining" }

Upload modal shows the result.

Browser automatically refreshes:
  - User profile (receipt count → Intelligence Meter)
  - Dashboard summary (new totals)
  - Receipt list (new receipt appears)

All three updates happen without the user doing anything.
```

---

### 1.4 Flow of the Other Major Screens

**Dashboard loads:**
```
Browser → GET /api/dashboard/summary
        → Next.js reads session → gets userId
        → Queries database: SUM(amount), COUNT(*), top category
          for this userId in last 30 days
        → Returns numbers to browser
        → Browser renders KPI cards, charts, transaction list
```

**Insights page:**
```
Browser → GET /api/insights
        → Next.js reads session → gets userId
        → Reads most recent row from 'insights' table for this user
          (already computed by FastAPI in background)
        → Returns pre-computed insights and health score
        → Browser renders charts and insight cards
        
If user clicks "Refresh Insights":
Browser → POST /api/insights
        → Next.js calls FastAPI /insights/generate
        → FastAPI runs Python pre-computation (all math)
        → FastAPI calls Gemini with the pre-computed numbers
        → Gemini writes the insight sentences
        → Results saved to 'insights' table
        → Returned to browser
```

---

### 1.5 Failure Cases: What Goes Wrong and What Happens

This is the part most tutorials skip. In a real system,
things go wrong constantly. Understanding the designed
failure behavior is as important as understanding the
happy path.

**OCR Fails (NVIDIA NIM can't read the image)**

```
Cause:    Image too dark, too blurry, or not a receipt at all
Symptom:  confidence score < 0.30

What happens:
  - FastAPI marks receipt.status = 'failed_ocr' in database
  - FastAPI returns HTTP 422 to Next.js
  - Next.js returns 422 to browser
  - Browser shows: "We couldn't read this receipt. Try again."
  - receipt count is NOT incremented (failed upload doesn't count)
  - Groq is NEVER called (nothing to categorize)
  - Database transaction table gets NO new row

Why this is a hard block (not a soft fail):
  A receipt with merchant "SW99Y" instead of "Swiggy" would
  corrupt the subscription detector, merchant history, and
  personalization features downstream. Bad data is worse than
  no data.
```

**Categorization Fails (Groq returns low confidence)**

```
Cause:    Merchant is ambiguous, unusual, or Groq API is down
Symptom:  confidence < 0.50 OR API error

What happens:
  - Category becomes "Other" automatically
  - Transaction is still saved with category = "Other"
  - Amber confidence dot appears in the UI
  - User can correct it manually on the receipt detail page
  - Correction is stored and used next time

Why this is a soft fail (not a block):
  The category is correctable. The amount, date, and merchant
  name are still accurate. The financial record is still valid.
  Only the label is wrong. Users can fix labels.
```

**Database Write Fails**

```
Cause:    Supabase is temporarily down or connection dropped
Symptom:  SQL error from Supabase client

What happens:
  - FastAPI returns HTTP 503 to Next.js
  - Next.js returns 503 to browser
  - Browser shows: "Something went wrong. Please try again."
  - NOTHING was saved (no partial state, no corrupt data)
  - The file in Supabase Storage still exists but will be
    cleaned up by a maintenance job

Why this is a hard block:
  Partial saves create orphaned records that are impossible
  to fix automatically. "Please try again" is better than
  "your receipt appears to have been uploaded but is missing
  its transaction data."
```

**Gemini Fails (during insight generation)**

```
Cause:    Gemini API timeout or error
Symptom:  API error or timeout after 15 seconds

What happens:
  - Python fallback kicks in automatically
  - Fallback builds insight text from pre-computed numbers
    (exact same numbers, less eloquent sentences)
  - User sees accurate data, slightly less polished writing
  - No error message. No empty state. The page still works.

Why this is silent:
  Insights are advisory. They don't affect financial records.
  A fallback insight that says "Your top category is Food & Dining
  at ₹4,200" is better than an error page.
```

---

## 2. Code Authority

*Understanding and owning the code, not just executing it.*

---

### 2.1 A Real Next.js API Route

This is the actual pattern every Next.js API route in
FinSight follows. Read it once. Understand every line.
Then you can write any API route from memory.

```typescript
// File: src/app/api/dashboard/summary/route.ts
// This serves: GET /api/dashboard/summary
// It is called by the Dashboard page when it loads

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {

  // ── STEP 1: Who is this person? ────────────────────────────
  // Create a Supabase client that reads the session cookie
  const supabase = createSupabaseServerClient()

  // Ask Supabase: "Is there a valid session in this request's cookie?"
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  // If there's no valid session: refuse immediately
  if (sessionError || !session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // The user's ID, verified by Supabase's JWT validation
  // This CANNOT be faked by the browser
  const userId = session.user.id

  // ── STEP 2: Get their data ──────────────────────────────────
  const { data: summary, error: dbError } = await supabase
    .from('transactions')           // which table
    .select(`
      amount,
      category,
      transaction_date
    `)
    .eq('user_id', userId)          // ONLY this user's rows
    .gte('transaction_date',        // only last 30 days
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0]
    )

  // If the database query failed: return an error
  if (dbError) {
    console.error('Dashboard summary query failed:', dbError)
    return NextResponse.json(
      { error: 'Database error' },
      { status: 500 }
    )
  }

  // ── STEP 3: Compute the summary ────────────────────────────
  // Python would be better for this, but for simple aggregation,
  // JavaScript is fine. More complex computation → move to FastAPI.

  const totalSpend = summary.reduce((sum, t) => sum + t.amount, 0)
  const transactionCount = summary.length

  // Find the category with the highest total
  const categoryTotals: Record<string, number> = {}
  for (const t of summary) {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount
  }
  const topCategory = Object.entries(categoryTotals)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'

  // ── STEP 4: Return the response ────────────────────────────
  return NextResponse.json({
    total_spend: totalSpend,
    transaction_count: transactionCount,
    top_category: topCategory,
  })
}
```

**What this code does:**
This route receives a request, confirms who the user is,
queries only that user's transactions from the last 30 days,
computes three numbers (total spend, count, top category),
and returns them as JSON.

**How to modify it:**
- Add a new field to the response? Add the computation above
  `return NextResponse.json(...)` and add the field to the
  return object.
- Change the date range? Change `30` in the calculation.
- Add a filter by category? Add `.eq('category', 'Food & Dining')`
  after the `.gte()` line.

**Common mistakes:**
```
MISTAKE 1: Reading userId from the request body
  WRONG:  const { userId } = await request.json()
  RIGHT:  const userId = session.user.id
  WHY:    Anyone can put any userId in a request body.
          The session cookie is cryptographically verified.

MISTAKE 2: Not checking for session before querying
  WRONG:  const userId = session?.user?.id
          const { data } = await supabase.from('transactions')...
  PROBLEM: If session is null, userId is undefined.
           The query runs with no user_id filter.
           Supabase RLS saves you, but you still got 0 results
           with no error — confusing to debug.
  RIGHT:  Check session exists, return 401 if not, THEN query.

MISTAKE 3: Returning database errors to the browser
  WRONG:  return NextResponse.json({ error: dbError.message })
  RIGHT:  console.error(dbError); return NextResponse.json({ error: 'Database error' })
  WHY:    Database error messages can reveal table structure,
          column names, and internal logic. Don't expose them.
```

---

### 2.2 A Real FastAPI Endpoint

This is the pattern every FastAPI endpoint in FinSight follows.

```python
# File: fastapi/main.py
# This serves: POST /analyze/receipt

from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import os

app = FastAPI()

# ── The shape of the incoming request ──────────────────────
class ReceiptRequest(BaseModel):
    image_base64: str    # the receipt image as text
    user_id: str         # verified by Next.js BFF
    receipt_id: str      # the receipt row ID in database

# ── The endpoint ────────────────────────────────────────────
@app.post("/analyze/receipt")
async def analyze_receipt(
    request: ReceiptRequest,
    background_tasks: BackgroundTasks
):
    # Note: X-Internal-Secret is validated by middleware
    # before this function is even called.
    # If the secret was wrong, we never reach this code.

    # ── STEP 1: Run OCR ─────────────────────────────────────
    try:
        ocr_result = await call_nvidia_nim(request.image_base64)
    except Exception as e:
        # NVIDIA API failed entirely
        await mark_receipt_failed(request.receipt_id, "OCR_API_ERROR")
        raise HTTPException(status_code=422, detail={
            "error_code": "OCR_API_UNAVAILABLE",
            "message": "Receipt processing is temporarily unavailable."
        })

    # Confidence too low: reject the receipt
    if ocr_result["confidence"] < 0.30:
        await mark_receipt_failed(request.receipt_id, "LOW_CONFIDENCE")
        raise HTTPException(status_code=422, detail={
            "error_code": "OCR_CONFIDENCE_TOO_LOW",
            "confidence": ocr_result["confidence"]
        })

    # ── STEP 2: Categorize ──────────────────────────────────
    try:
        category_result = await call_groq(
            merchant=ocr_result["merchant"],
            amount=ocr_result["amount"],
            user_id=request.user_id  # for merchant history lookup
        )
    except Exception:
        # Groq failed: use fallback category
        category_result = {
            "category": "Other",
            "confidence": 0.0,
            "used_fallback": True
        }

    # Low confidence: override to Other
    if category_result["confidence"] < 0.50:
        category_result["category"] = "Other"

    # ── STEP 3: Save to database ────────────────────────────
    await save_transaction_to_db(
        user_id=request.user_id,
        receipt_id=request.receipt_id,
        merchant=ocr_result["merchant"],
        amount=ocr_result["amount"],
        category=category_result["category"],
        confidence=category_result["confidence"]
    )

    # ── STEP 4: Fire background task (don't wait for it) ───
    background_tasks.add_task(
        run_decision_engine,
        user_id=request.user_id
    )
    # User gets their response NOW.
    # Decision Engine runs AFTER the response is sent.

    # ── STEP 5: Return result ───────────────────────────────
    return {
        "status": "complete",
        "extraction": {
            "merchant": ocr_result["merchant"],
            "amount": ocr_result["amount"],
            "date": ocr_result["date"],
            "confidence": ocr_result["confidence"]
        },
        "categorization": {
            "category": category_result["category"],
            "confidence": category_result["confidence"]
        }
    }
```

**What this code does:**
It receives a receipt image, runs OCR on it, categorizes
the result, saves everything to the database, schedules
a background analysis, and returns the result to the caller.

**How to modify it:**
- Add a new field to the response? Add it to the
  `return {}` dict at the bottom.
- Add a new processing step? Add it between steps 2 and 3.
- Change the confidence threshold? Change `0.30` or `0.50`.

**Common mistakes:**
```
MISTAKE 1: Blocking the response for the Decision Engine
  WRONG:  await run_decision_engine(request.user_id)
          return result  # user waits 4+ extra seconds
  RIGHT:  background_tasks.add_task(run_decision_engine, ...)
          return result  # user gets result immediately

MISTAKE 2: Letting Groq failure break the upload
  WRONG:  category = await call_groq(...)  # no try/except
          # if Groq is down, the whole upload fails
  RIGHT:  Use try/except. If Groq fails, default to "Other".
          The financial record still exists. Category is correctable.

MISTAKE 3: Letting AI compute numbers
  WRONG:  prompt = "Calculate the tax on these transactions: ..."
          tax = await call_gemini(prompt)  # might hallucinate
  RIGHT:  tax = sum(t["amount"] for t in business_transactions) * 0.30
          narrative = await call_gemini(f"Tax liability is ₹{tax}. Explain.")
          # Python computes, Gemini narrates
```

---

### 2.3 A Real Database Insert

This is how data gets saved. Every write in FinSight follows this pattern.

```python
# File: fastapi/db/transactions.py

from supabase import create_client
import os

# Service role key bypasses Row Level Security
# This is intentional: FastAPI writes on behalf of verified users
supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"]
)

async def save_transaction_to_db(
    user_id: str,
    receipt_id: str,
    merchant: str,
    amount: float,
    category: str,
    confidence: float
) -> dict:

    # ── Insert the transaction ──────────────────────────────
    transaction_data = {
        "user_id": user_id,          # who owns this
        "receipt_id": receipt_id,    # which receipt it came from
        "merchant": merchant,        # "Swiggy"
        "amount": amount,            # 340.0
        "currency": "INR",           # default
        "transaction_date": ...,     # extracted from OCR
        "category": category,        # "Food & Dining"
        "confidence": confidence,    # 0.94
        "categorization_model": "groq-llama-3.3-70b"
    }

    result = supabase.table("transactions").insert(transaction_data).execute()

    if not result.data:
        raise Exception("Transaction insert returned no data")

    # ── Update the receipt status ───────────────────────────
    supabase.table("receipts").update({
        "status": "complete",
        "processed_at": "now()"
    }).eq("id", receipt_id).execute()

    # ── Increment receipt count (updates intelligence level) ─
    supabase.rpc("increment_receipt_count", {
        "user_id_param": user_id
    }).execute()

    return result.data[0]
```

**What this code does:**
Creates a new row in the transactions table, marks the
receipt as complete, and increments the user's total
receipt count (which may upgrade their intelligence level).

**How to modify it:**
- Add a new field to save? Add a key to `transaction_data`.
- Save to a different table? Change `supabase.table("transactions")`.
- Add a conditional field? Add an `if` statement before the insert.

**Common mistakes:**
```
MISTAKE 1: Using the anon key for writes
  WRONG:  supabase = create_client(url, ANON_KEY)
          supabase.table("transactions").insert(...)
  PROBLEM: RLS will block this unless auth.uid() is set.
           The anon key only works with an active user session.
           FastAPI doesn't have user sessions — it has the service role.
  RIGHT:  Use SUPABASE_SERVICE_ROLE_KEY in FastAPI.

MISTAKE 2: Not handling the case where insert returns nothing
  WRONG:  result = supabase.table(...).insert(...).execute()
          return result.data[0]  # crashes if data is empty
  RIGHT:  Check result.data exists before accessing it.

MISTAKE 3: Forgetting to increment receipt count
  WRONG:  Just insert the transaction and return.
  PROBLEM: The Intelligence Meter never advances.
           The user stays at Level 1 forever.
  RIGHT:  Always call increment_receipt_count() after a
          successful transaction insert.
```

---

## 3. Debug Thinking

*How to find and fix problems systematically.*

---

### 3.1 The Golden Rule of Debugging

**Check the data first. Check the code second.**

When something is wrong in FinSight, 70% of the time the
problem is in the data (wrong value in the database, missing
row, incorrect status). 30% of the time it's in the code.

Developers who skip checking the data spend hours reading
code that is fine, looking for a bug that doesn't exist there.

---

### 3.2 The Debugging Trace

When something breaks, follow this path:

```
1. START AT THE ERROR MESSAGE
   What error did the browser console or terminal show?
   What HTTP status code did the API return?

2. IDENTIFY WHICH LAYER IT CAME FROM
   400/401/402/422 from /api/* → problem in Next.js BFF
   422/500 from FastAPI → problem in FastAPI or AI provider
   Database error → problem in data or RLS

3. CHECK THE DATABASE FIRST
   Open Supabase Table Editor
   Find the specific row that should exist
   Does it exist? Is the status correct?
   Are the values what you expect?

4. CHECK THE LOGS SECOND
   Railway logs → FastAPI errors and AI call results
   Vercel logs → Next.js API route errors
   Browser console → client-side errors

5. CHECK THE CODE LAST
   Once you know what data is wrong, find the code
   that writes that data and trace why it writes the wrong value.
```

---

### 3.3 Debugging Scenario 1: Upload Succeeds but Transaction Never Appears

**What the user sees:** Upload modal shows success. Dashboard doesn't show the new transaction.

```
STEP 1: Check the receipt status in Supabase

  Table: receipts
  Find the row for this upload
  What is the status?

  status = 'failed_ocr'?
    → OCR failed. NVIDIA NIM confidence was below 0.30.
    → The transaction was never created.
    → Check the processing_error column for details.
    → Check Railway logs for the NVIDIA NIM response.

  status = 'pending'?
    → FastAPI was never called OR FastAPI is still running.
    → Check Railway logs: did FastAPI receive the request?
    → Check if Railway service is running (health endpoint).

  status = 'complete'?
    → Transaction should exist. Check the transactions table.
    → Filter by user_id and receipt_id.
    → If it's there: problem is in the UI (cache not invalidated?).
    → If it's not there: the DB write failed silently.

STEP 2: Check Railway logs for the FastAPI call

  Look for the request to /analyze/receipt
  Look for the OCR result (confidence score)
  Look for any Python exceptions

STEP 3: Check browser console

  Did the /api/receipts/upload call succeed?
  What response status did it return?
  What was in the response body?
```

---

### 3.4 Debugging Scenario 2: Intelligence Meter Not Advancing

**What the user sees:** Uploaded 10 receipts but still shows Level 3 instead of Level 4.

```
STEP 1: Check the profiles table

  Find the user's profile row
  What is total_receipts_uploaded?
  What is intelligence_level?

  total_receipts_uploaded = 8?
    → Some uploads failed. Check receipts table.
    → Filter by user_id and status = 'failed_ocr'
    → Failed receipts don't increment the count.
    → Count of 'complete' receipts might be less than expected.

  total_receipts_uploaded = 10 but intelligence_level = 3?
    → The SQL function didn't update the level.
    → Try running the SQL function manually in Supabase:
      SELECT increment_receipt_count('user-id-here')
    → If level updates: the function works, but wasn't called.
    → Check FastAPI code: is increment_receipt_count() being called?

  total_receipts_uploaded = 10 and intelligence_level = 4?
    → Database is correct. Problem is in the UI.
    → Is React Query cache stale? Open DevTools Network tab.
    → Is the profile being refetched after upload?
    → Is getIntelligenceLevel() function returning the right value?

STEP 2: Add temporary logging

  In FastAPI, after the database write:
    print(f"Receipt count incremented. User: {user_id}")
  
  This confirms the function is being called.
  Remove the logging after debugging.
```

---

### 3.5 Debugging Scenario 3: Wrong Category on a Transaction

**What the user sees:** Swiggy receipt is categorized as "Transportation."

```
STEP 1: Check what Groq actually returned

  Find the receipt in the receipts table
  Check the gemini_response column (or groq_response if separate)
  What did Groq return?

  Did Groq return "Transportation" with high confidence?
    → The category prompt needs updating.
    → Swiggy is listed in the high-confidence merchant list
      in the prompt. Is it there?
    → Maybe "Swiggy" was extracted as "Swiggy Genie" (delivery
      service, not food) — which IS transportation.

  Did Groq return "Food & Dining" but DB shows "Transportation"?
    → The write logic is wrong. Check save_transaction_to_db().
    → Is the wrong field being used for category?

  Did Groq return low confidence and default to "Other"?
    → But the receipt shows "Transportation"?
    → There might be a previous correction for this merchant.
    → Check transactions WHERE merchant ILIKE '%swiggy%'
      AND is_manually_corrected = TRUE

STEP 2: Quick fix — correct the category

  In the UI: open receipt detail → change category → save
  
  This is exactly what manual correction is for.
  The correction will be used next time this merchant appears.

STEP 3: Long-term fix — improve the prompt

  If multiple receipts from the same common merchant are wrong,
  add that merchant to the high-confidence list in the
  categorization prompt.
  
  Never change the model. Change the prompt.
  Check PROMPT_STRATEGY.md for the prompt location and format.
```

---

## 4. Decision Authority

*Understanding why the system is built the way it is.*

---

### 4.1 Why FastAPI Instead of Node.js/Express?

**The question:** "Why not just write the backend in Node.js,
the same language as the frontend?"

**The honest answer:** Three reasons.

**Reason 1: Python owns AI tooling.**
Every major AI SDK (NVIDIA NIM, Groq, Gemini) has a Python
client first. The Python clients are maintained by the AI
companies themselves, are better documented, and get updates
faster than Node.js clients. AI development in Python is
faster and has fewer rough edges.

**Reason 2: Computation belongs in Python.**
The Decision Engine computes tax estimates, subscription
detection, budget forecasting, anomaly z-scores, and health
score sub-components. This is data science work. Numpy, Pandas,
and native Python list comprehensions handle these computations
naturally. The same work in JavaScript feels like swimming
upstream.

**Reason 3: The two services do different things.**
Next.js is optimized for HTTP request handling and web serving —
short-lived, stateless operations. FastAPI is optimized for
long-running AI calls, data processing, and Python computation —
persistent, stateful operations. They are better at different
things. Using both means using the right tool for each job.

**What you lose by splitting:**
More complexity. Two services to deploy, two logs to check,
two things to debug. That cost is real. The benefits outweigh it.

---

### 4.2 Why Supabase Instead of Firebase?

**The question:** "Both are Backend-as-a-Service. Why Supabase?"

**The fundamental difference:**
Supabase is built on PostgreSQL. Firebase is built on NoSQL.
This distinction has cascading consequences.

**Consequence 1: Aggregation.**
FinSight's entire analytics layer is SQL aggregations.
`GROUP BY category SUM(amount)` — trivial in PostgreSQL.
In Firebase (NoSQL), you read all documents and aggregate
in application code, or maintain denormalized counters.
This is dramatically more complex for the type of queries
FinSight runs constantly.

**Consequence 2: Row Level Security.**
PostgreSQL has RLS built in — database-level data isolation
that cannot be bypassed from application code. Firebase's
security rules are powerful but applied at the document level
and are harder to reason about for complex multi-table operations.

**Consequence 3: JOINs.**
The receipt detail page needs data from both the `receipts` table
and the `transactions` table. In PostgreSQL: one JOIN query.
In Firebase: two separate document reads + client-side merging.

**What Firebase does better:**
Real-time listeners are simpler in Firebase. FinSight uses
Supabase Realtime (which also works) but the Firebase developer
experience for real-time is marginally smoother.

**Why Supabase wins for FinSight:**
The product is fundamentally relational — transactions belong
to receipts belong to users, category breakdowns are aggregations
of transactions. PostgreSQL is the right database for this shape
of data. Supabase makes PostgreSQL easy.

---

### 4.3 Why Three AI Models Instead of One?

**The question:** "Why not just use Gemini for everything?
One model, one API key, simpler."

**The honest answer:** Because each stage has a different dominant
constraint, and one model cannot be optimal for all three constraints
simultaneously.

```
Stage 1 — OCR
  Dominant constraint: ACCURACY
  The receipt image must be read correctly. Errors here corrupt
  permanent financial records. You want the best available vision
  model. That is NVIDIA NIM's Llama 3.2 90B — purpose-built for
  visual document understanding.

Stage 2 — Categorization
  Dominant constraint: LATENCY + COST
  You are waiting synchronously for this result. Every 100ms
  matters. The task is classification — pick one of 12 categories.
  This does not require frontier reasoning. Groq's LPU hardware
  returns results in ~250ms at $0.00008 per call.
  Gemini takes ~800ms at $0.00035 per call.
  At 200,000 receipts/month: Groq = $16. Gemini = $70. Same result.

Stage 3 — Insights
  Dominant constraint: REASONING QUALITY
  Insight generation is open-ended reasoning across 50–100
  transactions. It needs a model that can hold context, find
  patterns, and express them clearly. This is what Gemini 2.0
  Flash is designed for.
```

**What you lose by using one model for everything:**
If you use Gemini for OCR: worse accuracy on degraded thermal
receipts. If you use Gemini for categorization: 3× slower and
4× more expensive for a classification task.

**The principle:**
Use the best tool for each specific task. Accept the complexity
that comes with multiple tools. The accuracy, speed, and cost
improvements are worth it.

---

### 4.4 Why "Python Computes, AI Narrates"?

**The question:** "Why not ask Gemini to compute the tax estimate?
It can do math."

**The hard truth about AI math:**

```
Test this yourself:
  Ask Gemini: "What is 17% of ₹84,340?"
  Answer might be: ₹14,337.80
  Correct answer:  ₹14,337.80  ✓

  Ask Gemini: "Here are 47 transactions. What is the total
  of the ones marked is_business_expense=true?"
  Answer might be: ₹31,240
  Real answer:     ₹31,417  ✗ (off by ₹177)
```

Language models are probabilistic text predictors, not
calculators. They get arithmetic right most of the time.
Not all of the time.

For personal insights ("Your food spend increased this month"),
being off by ₹177 might be acceptable. For tax liability
calculations that a user will file with their CA, being off by
any amount is a trust violation. Financial numbers must be exact.

**The rule that prevents this problem:**

```
If it can be computed with code: compute it with code.
  sum(), len(), sorted(), GROUP BY, SUM() in SQL — these are exact.

If it needs to be explained in natural language: use AI.
  Give the AI the exact number. Ask it to write a sentence.
  AI cannot hallucinate a number it was given.
```

---

## 5. System Mental Model

*How to think like a system builder.*

---

### 5.1 Three Ways of Seeing the Same System

Most developers see code. System builders see three things
at the same time:

**The Data Layer:** What data exists? Where is it stored?
What shape is it? Who owns it? How does it get created?
Changed? Deleted? A system builder can draw the database schema
from memory and explain what every table is for.

**The Flow Layer:** How does data move? What triggers what?
What is synchronous (the user waits)? What is asynchronous
(happens in the background)? A system builder can trace
any user action to every database write it causes.

**The Failure Layer:** What can go wrong? What should happen
when it does? Is the failure recoverable? A system builder
designs the failure behavior before writing the happy path.

Code authority comes from seeing all three simultaneously.

---

### 5.2 The Ownership Test

If you truly own a system, you can answer all of these
without looking at any documentation:

```
DATA QUESTIONS
□ If a user deletes their account, what tables are affected?
□ Why does total_receipts_uploaded never decrease?
□ What does the 'pending' status on a receipt mean?
□ Which column stores the OCR confidence score?

FLOW QUESTIONS
□ What triggers the Decision Engine to run?
□ Why is the user_id read from the cookie, not the request body?
□ What happens in the background after a successful upload?
□ Why does the Intelligence Meter advance without a page refresh?

FAILURE QUESTIONS
□ What HTTP status code does the user's browser get when OCR fails?
□ If Groq is down, does the upload fail or succeed?
□ If Gemini times out during insight generation, what does the user see?
□ What happens to a receipt stuck in 'pending' for 10 minutes?

DECISION QUESTIONS
□ Why does FastAPI run on Railway instead of Vercel?
□ Why is NVIDIA NIM used for OCR and not Gemini Vision?
□ Why does Python compute the tax estimate instead of Gemini?
□ Why are there three separate database writes after each upload?
```

If you hesitate on any of these, reread the relevant section
of this document. Then try again. The goal is to answer
all of them without hesitation.

---

### 5.3 How to Approach Any New Feature

When you need to build something new — a new page, a new API
route, a new background job — always start by asking five questions:

**Question 1: Where does the data come from?**
What table holds the data this feature needs? Does that data
exist yet, or does this feature also create it? If it creates
data: what table should it write to, and what columns does
it need?

**Question 2: Who calls this code?**
Is this triggered by the user? By a cron job? By another
API call? By a database trigger? Knowing what calls your
code tells you what authentication it needs and what
assumptions you can make about the inputs.

**Question 3: What security checks does it need?**
Any endpoint that reads user data: check session, extract
userId, filter all queries by userId.
Any endpoint with AI calls: those calls must be in FastAPI,
not Next.js.
Any feature that costs money (AI calls, heavy computation):
it needs rate limiting.

**Question 4: What can go wrong, and what should happen?**
Map every external call (AI API, database write, storage operation)
to a failure mode. Decide for each: is failure blocking or
recoverable? What does the user see?

**Question 5: Does this connect to the bigger pipeline?**
Is this feature reading data that the pipeline writes?
Is it writing data that other features read? Does it need
to fire after a certain intelligence level is reached?

Answer these five questions on paper before writing a line
of code. The code will almost write itself after that.

---

### 5.4 The Mindset Shifts That Separate System Builders

**From "How do I make this work?" to "How will this fail?"**

Junior developers ask: "How do I write this feature?"
System builders ask: "How will this break in production
at 2am with real users, and what should happen when it does?"

The failure handling is not defensive code added at the end.
It is the first thing you design.

**From "This code is correct" to "This data is correct"**

When debugging, stop reading code first. Check the database.
Is the data correct? If the data is wrong, trace back to
what wrote it. If the data is right, trace forward to what
reads it.

Code that is logically correct but receives wrong input will
produce wrong output. Data problems require data debugging,
not code debugging.

**From "This feature is done" to "This feature is proven"**

A feature is done when you have:
1. Uploaded a real receipt and confirmed the correct
   transaction appears in the database
2. Tested a failure case (bad image, wrong file type,
   expired session) and confirmed the correct error appears
3. Checked that no other feature broke because of what you changed

"I finished the code" is not "I finished the feature."

**From "My layer is working" to "The system is working"**

The best system builders feel uncomfortable owning just one
layer. They want to understand how their code connects to
every other piece. Not because they need to change every
piece — but because they need to know if their change breaks it.

In FinSight: if you change the structure of the `transactions`
table, you need to know that the dashboard summary query,
the receipt detail page, the subscription detector, the anomaly
detector, the insights generation, and the tax export all read
from that table. One schema change affects seven systems.

System builders know this before they make the change.

---

### 5.5 The Three Habits of Complete Code Authority

**Habit 1: Read before you write.**
Before writing a new API route, read three existing API routes.
Before writing a new database query, open the table in Supabase
and read the actual rows. Before calling an AI model, read the
prompt in `PROMPT_STRATEGY.md`. Reading builds pattern recognition
faster than any tutorial.

**Habit 2: Test the failure path first.**
Write your endpoint. Then, before testing the happy path,
test with no session (expect 401), test with a malformed
request (expect 400), test with a bad file (expect 422).
If the failures work correctly, the happy path is likely
to work too.

**Habit 3: Know where your data lives.**
After every feature you build, be able to answer:
"Which table did this write to? Which column? What was
the value? What does that value mean for the next step?"

Trace data forward through the system after you create it.
The receipt you just uploaded: which status did it get?
What triggered the status change? What changed in the
profile row? Did the Intelligence Meter number in the UI
change? Follow the data. Own the data.

---

### A Final Thought on Authority

Authority is not about knowing everything.
It is about knowing how to find what you don't know,
and being confident that you can figure out what you've
never seen before.

When you encounter something unfamiliar in FinSight, ask:
"Which layer does this belong to? What does this layer's
job? How does data flow through it?"

The answer to those three questions will orient you
to every file, every query, every API call in the system.

You now have the mental model. The code is just the
implementation of that model.

Build with authority.

---

*End of FinSight AUTHORITY_TRAINING.md v1.0.0*
*This document trains complete system ownership.*
*Return to any section when debugging, designing, or deciding.*
*The goal: answer every question in Section 5.2 without hesitation.*
