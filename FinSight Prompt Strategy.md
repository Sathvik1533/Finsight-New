# FINSIGHT — PROMPT_STRATEGY.md
## AI Prompt Engineering & Model Governance System

```
Version:        1.0.0
Classification: Internal — AI Engineering
Status:         Active — Implementation Ready
Consumes:       PRD_v2.md · TECH_STACK.md v2.0 · UI_GENERATOR_SPEC.md v2.0
Governs:        All AI model interactions across the FinSight pipeline
Authors:        FinSight AI Systems Architecture
```

---

## DOCUMENT AUTHORITY

This document governs every prompt, model parameter, and AI interaction in FinSight.
No prompt may be modified, model swapped, or temperature adjusted without a documented
justification traceable to this document. Every design decision here has a reason.
If the reason no longer applies, the decision should be revisited.

---

## TABLE OF CONTENTS

1. [Prompt Design Principles](#1-prompt-design-principles)
2. [OCR Extraction Prompt — NVIDIA Llama 3.2 Vision](#2-ocr-extraction-prompt)
3. [Categorization Prompt — Groq Llama 3.3](#3-categorization-prompt)
4. [Insights Prompt — Gemini 2.0 Flash](#4-insights-prompt)
5. [Decision Engine Narrative Prompt — Gemini](#5-decision-engine-narrative-prompt)
6. [Output Formats — Canonical JSON Schemas](#6-output-formats)
7. [Temperature & Model Settings](#7-temperature--model-settings)
8. [Fallback Strategies](#8-fallback-strategies)
9. [Hallucination Prevention](#9-hallucination-prevention)
10. [Future Extensions](#10-future-extensions)

---

## 1. PROMPT DESIGN PRINCIPLES

### 1.1 The Core Philosophy: Deterministic-First

FinSight's AI pipeline operates under a strict division of labor:

```
DETERMINISTIC LAYER (Python + SQL)
  → All numerical computation
  → All tax calculations (30% bracket, business-flagged transactions only)
  → All subscription detection (same merchant ± 3 days, same amount ± 10%)
  → All budget leakage comparisons (35%+ above 3-month baseline)
  → All intelligence level gating (receipt count thresholds)
  → All schema validation and output enforcement

AI LANGUAGE LAYER (NVIDIA NIM + Groq + Gemini)
  → Visual interpretation (OCR field extraction from images)
  → Semantic classification (category assignment from merchant context)
  → Pattern narration (explaining pre-computed trends in natural language)
  → Anomaly explanation (describing what a pre-computed anomaly means)
```

**Rule:** AI models never compute numbers. AI models interpret, classify, or narrate.
If a value can be computed deterministically, it must be. AI is called only for what
computation cannot do.

### 1.2 Strict JSON Contract

Every AI call in FinSight must return valid, parseable JSON. No exceptions.

- No preamble ("Here is the result:...")
- No postamble ("Let me know if you need...")
- No markdown formatting (no ```json fences)
- No explanatory text outside the JSON structure
- No additional fields beyond the schema
- No omitted required fields

**Enforcement:** All AI responses pass through a Pydantic model validator before
any data is written to Supabase. A response that fails validation triggers the
fallback strategy for that stage — it is never silently accepted.

### 1.3 Minimal Temperature Policy

Temperature controls creativity. FinSight needs accuracy, not creativity.

| Stage           | Temperature | Rationale                                          |
|-----------------|-------------|-----------------------------------------------------|
| OCR Extraction  | 0.0         | Zero tolerance for invented text                   |
| Categorization  | 0.0 – 0.2   | Classification task; low variance acceptable       |
| Insights        | 0.3         | Pattern narration; slight expressiveness acceptable |
| Narrative       | 0.2         | Explanation task; minimal creative latitude        |

**Rule:** Temperature is never increased to "improve output quality." If an output
is inadequate at the target temperature, the prompt is the problem — fix the prompt.

### 1.4 Prompt Structure Standard

All prompts in FinSight follow this five-part structure:

```
[ROLE]         — What the model is in this context
[TASK]         — The specific, bounded task to perform
[CONSTRAINTS]  — Hard rules the model must never violate
[INPUT]        — The data the model is given (only this data may be used)
[OUTPUT]       — The exact JSON schema the model must return
```

No prompt section may be omitted. The OUTPUT section always contains the exact schema
with field names, types, and allowed values enumerated.

### 1.5 Anti-Hallucination Anchoring

Every prompt that involves data must include the following instruction verbatim,
adapted to its context:

```
You are given [INPUT_DESCRIPTION]. You must only use the data provided.
Do not infer, estimate, or generate any values not present in the input.
If a field cannot be determined from the input, set it to null.
Never invent merchant names, amounts, dates, or categories.
```

This instruction must appear in every prompt that processes user financial data.

---

## 2. OCR Extraction Prompt

**Model:** NVIDIA NIM — Llama 3.2 90B Vision Instruct
**Stage:** Pipeline Stage 1 — Receipt Image → Structured Fields
**Trigger:** On every receipt image upload, before categorization
**Latency target:** ≤ 4 seconds (user sees processing animation)

### 2.1 Model Selection Rationale

NVIDIA NIM's Llama 3.2 90B Vision is selected for OCR because:
- 90B parameter vision model purpose-trained on visual document understanding
- Superior performance on thermal paper, degraded text, and cluttered receipt layouts
- Structured output reliability on extraction tasks exceeds general frontier models
- Acceptable latency (≤ 4s) within the upload animation window

### 2.2 The Prompt

```python
SYSTEM_PROMPT_OCR = """
[ROLE]
You are a financial document OCR extraction engine. Your function is to
read receipt images and extract structured data fields. You are not an
assistant. You do not explain. You only extract and return JSON.

[TASK]
Extract the following fields from the receipt image provided:
- merchant: The name of the business or vendor on the receipt
- amount: The final total amount paid (the largest monetary value, after tax)
- currency: The currency code (INR, USD, EUR, GBP, SGD, AED, or OTHER)
- date: The transaction date in ISO 8601 format (YYYY-MM-DD)
- confidence: Your confidence in the overall extraction (0.0 to 1.0)

[CONSTRAINTS]
1. Never guess or estimate any field value. If uncertain, use null.
2. Never fabricate a merchant name. If unreadable, use null.
3. Amount must be a numeric value only — no currency symbols, no commas.
4. Date must be YYYY-MM-DD format. If only month/year visible, use null.
5. If the image is not a receipt (e.g., screenshot, ID card, blank page),
   set all fields to null and set confidence to 0.0.
6. If text is partially obscured or degraded, extract what is clearly
   readable and lower the confidence score proportionally.
7. Do not return any text outside the JSON object.
8. Do not add fields not listed in the OUTPUT schema.

[INPUT]
The attached image is a receipt photograph submitted by a user.
Extract only what is visually present in this image.
Do not use prior knowledge about merchants or common receipt formats
to fill in fields that are not visible.

[OUTPUT]
Return exactly this JSON structure. All fields are required.
Null is the correct value for any field that cannot be determined.

{
  "merchant": string | null,
  "amount": number | null,
  "currency": "INR" | "USD" | "EUR" | "GBP" | "SGD" | "AED" | "OTHER" | null,
  "date": string | null,
  "confidence": number
}
"""
```

### 2.3 Confidence Score Semantics

| Confidence Range | Meaning                              | System Action                        |
|------------------|--------------------------------------|--------------------------------------|
| 0.80 – 1.00      | High confidence, clean extraction    | Proceed to categorization            |
| 0.50 – 0.79      | Moderate confidence, minor ambiguity | Proceed; flag with amber ConfidenceDot in UI |
| 0.30 – 0.49      | Low confidence, significant issues   | Proceed; flag prominently; prompt user review |
| 0.00 – 0.29      | Extraction failure                   | **Reject.** Trigger OCR fallback.    |

**Hard rule from PRD_v2.md §7 Non-Negotiable Constraint #6:**
OCR results below 0.30 confidence must be rejected. No silent degraded quality.

### 2.4 API Call Configuration

```python
import requests

def call_ocr(image_base64: str, media_type: str) -> dict:
    response = requests.post(
        url="https://integrate.api.nvidia.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {NVIDIA_NIM_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": "meta/llama-3.2-90b-vision-instruct",
            "messages": [
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT_OCR
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{media_type};base64,{image_base64}"
                            }
                        },
                        {
                            "type": "text",
                            "text": "Extract the receipt fields and return only JSON."
                        }
                    ]
                }
            ],
            "temperature": 0.0,
            "max_tokens": 256,
            "top_p": 1.0,
            "stream": False
        },
        timeout=10
    )
    return response.json()
```

---

## 3. Categorization Prompt

**Model:** Groq — Llama 3.3 70B Versatile
**Stage:** Pipeline Stage 2 — Extracted Fields → Category Assignment
**Trigger:** After OCR passes confidence threshold (≥ 0.30)
**Latency target:** ≤ 500ms (Groq LPU hardware, sub-300ms typical)

### 3.1 Model Selection Rationale

Groq's Llama 3.3 70B is selected for categorization because:
- LPU hardware delivers sub-300ms inference on 70B parameter models
- Categorization is a classification task — frontier reasoning is unnecessary
- Structured output support with explicit JSON mode
- ~45% cost reduction vs. Gemini for this stage at scale

### 3.2 Allowed Category Taxonomy

The following 12 categories are the **only** valid outputs. No other category
may be returned. This list is embedded verbatim in every categorization prompt.

```python
ALLOWED_CATEGORIES = [
    "Food & Dining",          # Restaurants, cafes, food delivery (Swiggy, Zomato)
    "Groceries",              # Supermarkets, kiranas, BigBasket, Blinkit
    "Transportation",         # Uber, Ola, auto, fuel, metro, bus
    "Shopping & Retail",      # Amazon, Flipkart, clothing, electronics
    "Entertainment",          # Movies, events, gaming, OTT platforms
    "Health & Wellness",      # Pharmacy, doctor, gym, Cult.fit
    "Travel & Accommodation", # Hotels, flights, trains, inter-city buses
    "Utilities & Bills",      # Electricity, internet, mobile recharge
    "Subscriptions",          # Netflix, Spotify, SaaS tools, recurring charges
    "Business & Professional", # Co-working, software, professional services
    "Education",              # Courses, books, tuition, certifications
    "Other"                   # Use only when no category above applies
]
```

**Disambiguation rules for high-error category pairs:**

| Scenario                              | Correct Category          |
|---------------------------------------|---------------------------|
| Swiggy, Zomato, restaurant receipt    | Food & Dining             |
| BigBasket, DMart, kirana store        | Groceries                 |
| Uber within city                      | Transportation            |
| Uber intercity / outstation           | Travel & Accommodation    |
| Amazon product purchase               | Shopping & Retail         |
| Amazon Web Services invoice           | Business & Professional   |
| Netflix, Spotify monthly charge       | Subscriptions             |
| Netflix hardware purchase             | Shopping & Retail         |
| Gym membership (monthly)             | Subscriptions             |
| Gym one-time visit / day pass         | Health & Wellness         |

### 3.3 The Prompt

```python
SYSTEM_PROMPT_CATEGORIZATION = """
[ROLE]
You are a financial transaction categorization engine. Your function is to
assign exactly one category to a transaction based on merchant name and context.
You are not an assistant. You do not explain. You only classify and return JSON.

[TASK]
Assign the single most appropriate category to the transaction described in the input.
Use merchant_history to improve accuracy when the merchant appears previously categorized.

[CONSTRAINTS]
1. You must select ONLY from the allowed_categories list provided in the input.
2. Never return a category not in the allowed_categories list.
3. If genuinely ambiguous, return "Other" — never invent a new category.
4. merchant_history takes precedence over inference. If the merchant has been
   categorized before by this user, use that category unless merchant_name
   strongly indicates a different context.
5. confidence must reflect your certainty, not optimism. A score of 0.9+
   requires that you have no meaningful alternative interpretation.
6. Do not return any text outside the JSON object.
7. The "reasoning" field must be one sentence maximum. It exists for
   debugging only — it is never shown to the user.

[DISAMBIGUATION RULES]
- Food delivery apps (Swiggy, Zomato, Dunzo) → "Food & Dining", not "Groceries"
- Grocery delivery apps (BigBasket, Blinkit, Zepto) → "Groceries", not "Food & Dining"
- Ride-hailing within a single city → "Transportation"
- Ride-hailing with intercity or outstation context → "Travel & Accommodation"
- Recurring same-amount charges → consider "Subscriptions" over other categories
- AWS, GCP, Azure, Vercel, GitHub → "Business & Professional"

[INPUT FORMAT]
You will receive:
{
  "merchant_name": string,
  "amount": number,
  "currency": string,
  "date": string,
  "allowed_categories": [...],
  "merchant_history": [
    { "merchant": string, "category": string, "count": number }
  ]
}

The merchant_history array contains this user's past categorizations for
similar merchants. Use it to improve consistency.

[OUTPUT]
Return exactly this JSON structure. All fields are required.

{
  "category": string,
  "confidence": number,
  "reasoning": string
}
"""
```

### 3.4 API Call Configuration

```python
from groq import Groq
import json

groq_client = Groq(api_key=GROQ_API_KEY)

def call_categorization(
    merchant: str,
    amount: float,
    currency: str,
    date: str,
    merchant_history: list[dict]
) -> dict:

    input_payload = {
        "merchant_name": merchant,
        "amount": amount,
        "currency": currency,
        "date": date,
        "allowed_categories": ALLOWED_CATEGORIES,
        "merchant_history": merchant_history
    }

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_CATEGORIZATION},
            {"role": "user", "content": json.dumps(input_payload)}
        ],
        temperature=0.1,
        max_tokens=128,
        response_format={"type": "json_object"}
    )

    return json.loads(response.choices[0].message.content)
```

### 3.5 Merchant History Query

Before calling categorization, retrieve the user's merchant history from Supabase:

```python
def get_merchant_history(user_id: str, merchant_name: str) -> list[dict]:
    """
    Returns up to 5 most frequent categorizations for merchants
    with names similar to the provided merchant_name.
    Uses pg_trgm similarity for fuzzy matching.
    """
    result = supabase.rpc("get_merchant_history", {
        "p_user_id": user_id,
        "p_merchant": merchant_name,
        "p_limit": 5
    }).execute()

    return result.data or []
```

---

## 4. Insights Prompt

**Model:** Gemini 2.0 Flash
**Stage:** Pipeline Stage 3 — Transaction Corpus → Insights + Anomaly Score
**Trigger:** After intelligence_level reaches Level 4 (10+ receipts), or on
             explicit user refresh on Insights page
**Latency target:** ≤ 8 seconds (async — does not block upload flow)

### 4.1 Pre-Computation Contract

**Critical:** Before calling Gemini for insights, the Python Decision Engine must
pre-compute all numerical values. Gemini narrates; Python computes.

```python
# These values are computed by Python BEFORE the Gemini call.
# Gemini receives these as facts — it does not compute them.
computed_patterns = {
    "total_spend": float,                    # Sum of all transaction amounts
    "period_days": int,                      # Number of days covered
    "category_breakdown": {                  # Category → total spend
        "Food & Dining": float,
        "Groceries": float,
        # ... all categories with non-zero spend
    },
    "top_merchant": str,                     # Merchant with highest total spend
    "top_merchant_spend": float,             # Amount spent at top merchant
    "top_merchant_transaction_count": int,   # Number of transactions at top merchant
    "avg_transaction_value": float,          # Mean transaction amount
    "weekend_vs_weekday_ratio": float,       # Ratio of weekend to weekday spend
    "largest_single_transaction": float,     # Highest single transaction
    "largest_transaction_merchant": str,     # Merchant of highest transaction
    "transaction_count": int,                # Total number of transactions
    "anomalous_transactions": [              # Pre-flagged anomalies (Python-detected)
        {
            "merchant": str,
            "amount": float,
            "date": str,
            "deviation_pct": float           # % deviation from user's baseline
        }
    ]
}
```

### 4.2 The Prompt

```python
SYSTEM_PROMPT_INSIGHTS = """
[ROLE]
You are a financial pattern analysis engine. Your function is to interpret
pre-computed spending patterns and generate structured insights. You do not
compute numbers. You interpret the numbers given to you.

[TASK]
Given a set of pre-computed spending patterns for a user's transaction history,
generate 3 to 5 insights, 2 to 3 actionable recommendations, and an anomaly
score. All insights must be grounded in the provided data only.

[CONSTRAINTS]
1. NEVER use any number, amount, percentage, or merchant name that is not
   present in the input data. This is an absolute rule — no exceptions.
2. NEVER extrapolate, estimate, or project future values unless a trend
   calculation is explicitly provided in the computed_patterns.
3. Insights must cite specific values from the input (e.g., "₹4,200 on
   Food & Dining" — not "a significant amount on Food & Dining").
4. Do not provide financial advice. State observations, not prescriptions.
   Instead of "You should reduce food spending," say "Food & Dining accounts
   for 38% of total spend over this period."
5. anomaly_score must be a float from 0.0 (no anomalies) to 1.0 (severe
   anomalies). Base it on the deviation_pct values in anomalous_transactions.
   If anomalous_transactions is empty, anomaly_score must be 0.0.
6. Do not return any text outside the JSON object.
7. If computed_patterns contains fewer than 5 transactions, limit insights
   to factual statements only — no trend claims.

[DATA SCOPE DECLARATION]
FinSight can only see spending data the user has uploaded. It cannot see
income, savings, investments, debt, or obligations. All insights are
observations about the uploaded transaction data only.

[INPUT FORMAT]
You will receive:
{
  "computed_patterns": { ... },  // Pre-computed by Python — treat as facts
  "currency_symbol": string,     // "₹", "$", "€", etc.
  "period_label": string         // e.g., "last 30 days", "October 2024"
}

[OUTPUT]
Return exactly this JSON structure. All fields are required.
insights must have 3–5 items. recommendations must have 2–3 items.

{
  "insights": [
    {
      "title": string,
      "body": string,
      "category": string | null,
      "data_point": string
    }
  ],
  "recommendations": [
    {
      "title": string,
      "body": string,
      "priority": "high" | "medium" | "low"
    }
  ],
  "anomaly_score": number,
  "summary": string
}
"""
```

### 4.3 Field Definitions

| Field                       | Type             | Description                                             |
|-----------------------------|------------------|---------------------------------------------------------|
| `insights[].title`          | string           | Short headline (max 8 words)                            |
| `insights[].body`           | string           | 1–2 sentences citing specific data from input           |
| `insights[].category`       | string \| null   | Related category from taxonomy, or null if cross-category |
| `insights[].data_point`     | string           | The specific number cited (e.g., "₹4,200", "38%")      |
| `recommendations[].title`   | string           | Short headline (max 8 words)                            |
| `recommendations[].body`    | string           | 1–2 sentences. Observation-framed, not prescriptive.    |
| `recommendations[].priority`| enum             | high / medium / low                                     |
| `anomaly_score`             | float 0.0–1.0    | 0.0 = no anomalies, 1.0 = severe anomalies              |
| `summary`                   | string           | 2–3 sentence overall summary. No invented numbers.      |

### 4.4 API Call Configuration

```python
import google.generativeai as genai
import json

genai.configure(api_key=GEMINI_API_KEY)

def call_insights(computed_patterns: dict, currency_symbol: str, period_label: str) -> dict:
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash-exp",
        generation_config=genai.GenerationConfig(
            temperature=0.3,
            max_output_tokens=1024,
            response_mime_type="application/json"
        ),
        system_instruction=SYSTEM_PROMPT_INSIGHTS
    )

    user_input = json.dumps({
        "computed_patterns": computed_patterns,
        "currency_symbol": currency_symbol,
        "period_label": period_label
    })

    response = model.generate_content(user_input)
    return json.loads(response.text)
```

---

## 5. Decision Engine Narrative Prompt

**Model:** Gemini 2.0 Flash
**Stage:** Pipeline Stage 4 — Decision Engine Output → User-Facing Narrative
**Trigger:** After intelligence_level >= 3, runs asynchronously after upload.
             Also triggered on Insights page manual refresh.
**Latency target:** Async — result stored in DB; surfaced on next page load

### 5.1 What the Decision Engine Computes (Python, not AI)

The Python Decision Engine produces the following outputs before calling Gemini.
Gemini receives these as facts and generates a human-readable explanation only.

```python
decision_engine_output = {

    # TAX ESTIMATION (freelancers)
    "tax_output": {
        "business_expense_total": float,     # Sum of business-flagged transactions
        "estimated_tax_liability": float,    # business_expense_total * 0.30
        "business_transaction_count": int,
        "top_business_categories": list[str]
    },

    # SUBSCRIPTION DETECTION (salaried professionals)
    "subscriptions": [
        {
            "merchant": str,
            "amount": float,
            "frequency": "monthly" | "weekly" | "annual",
            "last_charge_date": str,         # ISO 8601
            "total_charged_ytd": float,
            "is_active": bool
        }
    ],

    # BUDGET LEAKAGE SIGNALS (all users)
    "leakage_signals": [
        {
            "category": str,
            "current_month_spend": float,
            "three_month_baseline": float,
            "deviation_pct": float,          # How much above baseline
            "days_remaining_in_month": int
        }
    ],

    # HEALTH SCORE (Level 4 only)
    "health_score": {
        "score": int,                        # 0–100
        "band": "GOOD" | "FAIR" | "AT RISK",
        "factors": dict                      # Individual score components
    }
}
```

### 5.2 The Prompt

```python
SYSTEM_PROMPT_NARRATIVE = """
[ROLE]
You are a financial clarity writer for FinSight, a financial intelligence
system. Your function is to explain a pre-computed financial analysis in
plain, clear language that a non-expert can act on. You do not compute.
You explain computations already done for you.

[TASK]
Given pre-computed Decision Engine outputs, write a single narrative paragraph
that explains the most important finding to the user. The narrative should feel
like a brief, helpful report — not a list of bullet points.

[CONSTRAINTS]
1. Maximum 100 words. Count carefully.
2. Prioritize the highest-impact finding:
   - If leakage_signals contains a category > 50% above baseline: lead with that.
   - Else if subscriptions total > ₹2,000/month: lead with subscriptions.
   - Else if tax_output.estimated_tax_liability > 0: lead with tax.
   - Else: summarize the health score finding.
3. Use only numbers from the provided input. Never invent or round creatively.
4. Write in second person ("Your food spending..."), not third person.
5. End every narrative with this exact disclaimer on a new line:
   "Note: This reflects only transactions uploaded to FinSight, not your
   complete financial picture."
6. Do not use bullet points, numbered lists, or headers.
7. Do not provide investment, tax, or legal advice. State observations only.
8. Do not return any text outside the JSON object.

[TONE]
Clear. Factual. Briefly empathetic. Not alarming. Not cheerful.
The user is intelligent. Do not over-explain.

[INPUT FORMAT]
{
  "tax_output": { ... },
  "subscriptions": [ ... ],
  "leakage_signals": [ ... ],
  "health_score": { ... },
  "currency_symbol": string,
  "user_first_name": string
}

[OUTPUT]
Return exactly this JSON structure. All fields are required.

{
  "narrative": string,
  "primary_finding": "leakage" | "subscriptions" | "tax" | "health",
  "word_count": number
}
"""
```

### 5.3 Priority Selection Logic

The prioritization in the prompt mirrors a Python pre-check:

```python
def determine_primary_finding(decision_output: dict) -> str:
    """
    Mirrors the prioritization logic in the narrative prompt.
    Used to validate that Gemini's primary_finding matches
    what the deterministic layer would select.
    """
    leakage = decision_output.get("leakage_signals", [])
    subs = decision_output.get("subscriptions", [])
    tax = decision_output.get("tax_output", {})

    if any(s["deviation_pct"] > 50 for s in leakage):
        return "leakage"

    sub_total = sum(s["amount"] for s in subs if s["is_active"])
    if sub_total > 2000:
        return "subscriptions"

    if tax.get("estimated_tax_liability", 0) > 0:
        return "tax"

    return "health"
```

**Validation rule:** After receiving Gemini's response, compare `primary_finding`
to `determine_primary_finding()`. A mismatch is logged as a hallucination signal
and triggers the fallback narrative.

---

## 6. Output Formats — Canonical JSON Schemas

These schemas are the authoritative contracts. Pydantic models in FastAPI enforce
these schemas on every AI response before data is written to Supabase.

### 6.1 OCR Output Schema

```python
from pydantic import BaseModel, Field, validator
from typing import Optional, Literal

class OCROutput(BaseModel):
    merchant: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[Literal[
        "INR", "USD", "EUR", "GBP", "SGD", "AED", "OTHER"
    ]] = None
    date: Optional[str] = None          # YYYY-MM-DD or null
    confidence: float = Field(ge=0.0, le=1.0)

    @validator("date")
    def validate_date_format(cls, v):
        if v is not None:
            import re
            if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
                raise ValueError("date must be YYYY-MM-DD")
        return v

    @validator("amount")
    def validate_positive_amount(cls, v):
        if v is not None and v < 0:
            raise ValueError("amount must be non-negative")
        return v
```

### 6.2 Categorization Output Schema

```python
class CategorizationOutput(BaseModel):
    category: Literal[
        "Food & Dining",
        "Groceries",
        "Transportation",
        "Shopping & Retail",
        "Entertainment",
        "Health & Wellness",
        "Travel & Accommodation",
        "Utilities & Bills",
        "Subscriptions",
        "Business & Professional",
        "Education",
        "Other"
    ]
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str = Field(max_length=200)
```

### 6.3 Insights Output Schema

```python
from typing import List

class InsightItem(BaseModel):
    title: str = Field(max_length=80)
    body: str = Field(max_length=400)
    category: Optional[str] = None
    data_point: str = Field(max_length=50)

class RecommendationItem(BaseModel):
    title: str = Field(max_length=80)
    body: str = Field(max_length=400)
    priority: Literal["high", "medium", "low"]

class InsightsOutput(BaseModel):
    insights: List[InsightItem] = Field(min_items=3, max_items=5)
    recommendations: List[RecommendationItem] = Field(min_items=2, max_items=3)
    anomaly_score: float = Field(ge=0.0, le=1.0)
    summary: str = Field(max_length=600)
```

### 6.4 Decision Narrative Output Schema

```python
class NarrativeOutput(BaseModel):
    narrative: str = Field(max_length=800)
    primary_finding: Literal["leakage", "subscriptions", "tax", "health"]
    word_count: int = Field(ge=1, le=120)  # 100 + 20 word buffer for disclaimer

    @validator("narrative")
    def must_contain_disclaimer(cls, v):
        disclaimer = "reflects only transactions uploaded to FinSight"
        if disclaimer not in v:
            raise ValueError("Narrative must contain the required disclaimer")
        return v
```

---

## 7. Temperature & Model Settings

### 7.1 Complete Settings Matrix

| Stage               | Model                             | Temperature | max_tokens | top_p | JSON Mode |
|---------------------|-----------------------------------|-------------|------------|-------|-----------|
| OCR Extraction      | NVIDIA NIM Llama 3.2 90B Vision   | 0.0         | 256        | 1.0   | Enforced via prompt |
| Categorization      | Groq Llama 3.3 70B Versatile      | 0.1         | 128        | 1.0   | `response_format: json_object` |
| Insights            | Gemini 2.0 Flash                  | 0.3         | 1024       | —     | `response_mime_type: application/json` |
| Decision Narrative  | Gemini 2.0 Flash                  | 0.2         | 512        | —     | `response_mime_type: application/json` |

### 7.2 Token Budget Rationale

| Stage              | Token Budget | Rationale                                                |
|--------------------|--------------|-----------------------------------------------------------|
| OCR                | 256          | 5 fields, JSON overhead — 256 is generous                |
| Categorization     | 128          | 3 fields — category enum, float, one sentence            |
| Insights           | 1024         | 3–5 insights + 2–3 recommendations + summary             |
| Narrative          | 512          | 100 word narrative + JSON overhead                       |

**Rule:** Never increase token budgets without a documented reason. Excessive tokens
increase cost and provide space for models to add unrequested content.

### 7.3 Model Version Pinning

```python
# Pin exact model versions. Never use "latest" aliases in production.
# When a model version is updated, run accuracy regression tests before
# updating this file.

MODEL_OCR          = "meta/llama-3.2-90b-vision-instruct"
MODEL_CATEGORIZE   = "llama-3.3-70b-versatile"
MODEL_INSIGHTS     = "gemini-2.0-flash-exp"
MODEL_NARRATIVE    = "gemini-2.0-flash-exp"
```

---

## 8. Fallback Strategies

### 8.1 OCR Failure Fallback

**Trigger conditions:**
- Confidence < 0.30 (hard rejection threshold from PRD §7)
- Response fails `OCROutput` Pydantic validation
- NVIDIA NIM API returns non-200 status
- Request timeout (> 10 seconds)

```python
OCR_FALLBACK_RESPONSE = {
    "merchant": None,
    "amount": None,
    "currency": None,
    "date": None,
    "confidence": 0.0,
    "_fallback": True,
    "_fallback_reason": "ocr_extraction_failed"
}

# User-facing message stored in receipts table
OCR_FAILURE_USER_MESSAGE = (
    "We couldn't read this receipt clearly. "
    "Please try uploading a clearer photo, or enter the details manually."
)

# Receipt status in Supabase
# status = "failed_ocr"
# Do NOT set status = "processing" — this receipt must not silently disappear.
```

**Recovery flow:**
1. Set `receipts.status = "failed_ocr"` in Supabase
2. Return 422 to Next.js BFF with `error_code: "OCR_CONFIDENCE_TOO_LOW"`
3. UI advances Upload Modal to ERROR state (not generic error — specific message)
4. User can retry with a better photo or skip

### 8.2 Categorization Low-Confidence Fallback

**Trigger conditions:**
- Returned `confidence` < 0.50
- Category not in `ALLOWED_CATEGORIES`
- Response fails `CategorizationOutput` Pydantic validation
- Groq API error or timeout (> 3 seconds)

```python
def get_categorization_fallback(merchant: str) -> dict:
    """
    Returns a fallback categorization. Never returns an error to the user
    — categorization failure is recoverable (user can correct manually in Phase 2).
    """
    return {
        "category": "Other",
        "confidence": 0.0,
        "_fallback": True,
        "_fallback_reason": "categorization_low_confidence_or_api_error"
    }

# Confidence threshold for ConfidenceDot display in UI:
# confidence < 0.75 → amber ConfidenceDot shown on transaction card
# confidence = 0.0 (fallback) → amber ConfidenceDot shown + "Review suggested" label
```

**Retry logic:** Before falling back to "Other", retry once with temperature=0.0
and explicit disambiguation instruction for the specific merchant pair. If second
attempt also fails threshold, accept "Other" and flag for user review.

### 8.3 Gemini Insights Failure Fallback

**Trigger conditions:**
- Gemini API returns non-200 status
- Response fails `InsightsOutput` Pydantic validation
- Request timeout (> 12 seconds)
- `anomaly_score` field not within [0.0, 1.0]
- Required disclaimer absent from narrative

```python
def get_insights_fallback(computed_patterns: dict, currency_symbol: str) -> dict:
    """
    Constructs a deterministic fallback insights response from pre-computed
    data without calling any AI model. No hallucination risk.
    """
    top_category = max(
        computed_patterns["category_breakdown"],
        key=computed_patterns["category_breakdown"].get
    )
    top_amount = computed_patterns["category_breakdown"][top_category]

    return {
        "insights": [
            {
                "title": f"Top Spending Category",
                "body": (
                    f"Your highest spending category is {top_category} at "
                    f"{currency_symbol}{top_amount:,.0f} for this period."
                ),
                "category": top_category,
                "data_point": f"{currency_symbol}{top_amount:,.0f}"
            },
            {
                "title": "Total Spend Overview",
                "body": (
                    f"Total spending across {computed_patterns['transaction_count']} "
                    f"transactions is {currency_symbol}"
                    f"{computed_patterns['total_spend']:,.0f}."
                ),
                "category": None,
                "data_point": f"{currency_symbol}{computed_patterns['total_spend']:,.0f}"
            },
            {
                "title": "Average Transaction Value",
                "body": (
                    f"Your average transaction is "
                    f"{currency_symbol}{computed_patterns['avg_transaction_value']:,.0f}."
                ),
                "category": None,
                "data_point": f"{currency_symbol}{computed_patterns['avg_transaction_value']:,.0f}"
            }
        ],
        "recommendations": [
            {
                "title": "Review Your Spending",
                "body": (
                    f"Upload more receipts to unlock detailed pattern analysis "
                    f"and personalized recommendations."
                ),
                "priority": "medium"
            },
            {
                "title": "Check Top Category",
                "body": (
                    f"Review your {top_category} transactions to see if any "
                    f"charges are unexpected."
                ),
                "priority": "low"
            }
        ],
        "anomaly_score": (
            min(1.0, len(computed_patterns.get("anomalous_transactions", [])) * 0.2)
        ),
        "summary": (
            f"You have {computed_patterns['transaction_count']} transactions totalling "
            f"{currency_symbol}{computed_patterns['total_spend']:,.0f}. "
            f"Your top category is {top_category}."
        ),
        "_fallback": True,
        "_fallback_reason": "gemini_insights_api_failure"
    }
```

### 8.4 Decision Narrative Failure Fallback

**Trigger conditions:**
- Gemini API error or timeout
- `primary_finding` mismatch with deterministic check
- Word count > 120
- Required disclaimer absent

```python
def get_narrative_fallback(decision_output: dict, currency_symbol: str) -> dict:
    """
    Generates a minimal deterministic narrative without AI.
    """
    primary = determine_primary_finding(decision_output)
    disclaimer = (
        "\n\nNote: This reflects only transactions uploaded to FinSight, "
        "not your complete financial picture."
    )

    narratives = {
        "leakage": (
            "One or more spending categories are running significantly above "
            "your recent baseline. Review your top categories to identify where "
            "spend has increased."
        ),
        "subscriptions": (
            f"Your active subscriptions total "
            f"{currency_symbol}"
            f"{sum(s['amount'] for s in decision_output['subscriptions'] if s['is_active']):,.0f} "
            "per month. Review the list to identify any you no longer use."
        ),
        "tax": (
            f"Your business expenses total "
            f"{currency_symbol}"
            f"{decision_output['tax_output']['business_expense_total']:,.0f}, "
            "which may be eligible for deductions. Consult your CA for guidance."
        ),
        "health": (
            f"Your Financial Health Score is "
            f"{decision_output['health_score']['score']} "
            f"({decision_output['health_score']['band']}). "
            "Upload more receipts to improve analysis accuracy."
        )
    }

    narrative_text = narratives.get(primary, narratives["health"]) + disclaimer

    return {
        "narrative": narrative_text,
        "primary_finding": primary,
        "word_count": len(narrative_text.split()),
        "_fallback": True,
        "_fallback_reason": "gemini_narrative_api_failure"
    }
```

---

## 9. Hallucination Prevention

### 9.1 The Three-Layer Defense

```
LAYER 1 — PROMPT CONSTRAINTS (prevent generation)
  Explicit instructions in every prompt prohibiting invented data.
  Data-scope declarations that enumerate what the model may and may not use.
  Anchoring instructions: "Only use values present in the input."

LAYER 2 — SCHEMA VALIDATION (detect and reject)
  Pydantic models enforce field types, ranges, and allowed values.
  Custom validators check domain-specific rules (date format, disclaimer presence).
  Primary finding cross-check (Narrative vs. Python deterministic check).
  Any validation failure triggers the fallback — never silent acceptance.

LAYER 3 — POST-RESPONSE AUDITING (log and monitor)
  All _fallback=True responses are logged to a separate audit table.
  Fallback rate per stage is tracked as a health metric.
  Number citation audit: every number in insights.body and narrative
  is checked against computed_patterns values ± 1% rounding tolerance.
```

### 9.2 Number Citation Audit (Insights Stage)

```python
import re

def audit_number_citations(
    insights_response: dict,
    computed_patterns: dict
) -> list[dict]:
    """
    Extracts all numbers from insight bodies and checks each against
    the computed_patterns. Returns a list of violations.
    Used for monitoring, not blocking (blocking would be too aggressive).
    """
    all_values = set()
    for v in computed_patterns["category_breakdown"].values():
        all_values.add(round(v, 0))
    all_values.add(round(computed_patterns["total_spend"], 0))
    all_values.add(round(computed_patterns["avg_transaction_value"], 0))
    all_values.add(round(computed_patterns["top_merchant_spend"], 0))

    violations = []
    for insight in insights_response.get("insights", []):
        numbers_in_body = re.findall(r"[\d,]+\.?\d*", insight["body"])
        for num_str in numbers_in_body:
            num = float(num_str.replace(",", ""))
            if num > 100:  # Skip percentages and small counts
                if not any(abs(num - v) / max(v, 1) < 0.02 for v in all_values):
                    violations.append({
                        "insight_title": insight["title"],
                        "suspicious_number": num,
                        "known_values": list(all_values)
                    })

    return violations
```

### 9.3 Banned Phrases

The following phrases in any AI response trigger an immediate fallback —
they indicate the model is operating outside its constraints:

```python
BANNED_PHRASES = [
    "I cannot determine",        # Model should return null, not explain
    "I don't have access",       # Model should use input only
    "based on my training",      # Model is hallucinating prior knowledge
    "typically speaking",        # Model is generalizing, not using input data
    "generally",                 # Same
    "usually",                   # Same
    "in my experience",          # Model is not an experience-having entity here
    "you might want to consider", # Advisory — not permitted
    "you should",                # Prescriptive — not permitted
    "I recommend",               # Model is not a recommender in narrative stage
    "as an AI",                  # Model should not break the fourth wall
]

def contains_banned_phrase(response_text: str) -> bool:
    response_lower = response_text.lower()
    return any(phrase.lower() in response_lower for phrase in BANNED_PHRASES)
```

### 9.4 Schema Drift Detection

When a model update may have changed categorization behavior:

```python
CATEGORY_DRIFT_TEST_CASES = [
    # Format: (merchant, expected_category)
    ("Swiggy", "Food & Dining"),
    ("BigBasket", "Groceries"),
    ("Uber", "Transportation"),
    ("Netflix", "Subscriptions"),
    ("AWS", "Business & Professional"),
    ("Apollo Pharmacy", "Health & Wellness"),
    ("IRCTC", "Travel & Accommodation"),
    ("BESCOM", "Utilities & Bills"),
    ("Udemy", "Education"),
    ("PVR Cinemas", "Entertainment"),
]

def run_category_drift_test() -> dict:
    """
    Run after any Groq model version update.
    All test cases must pass before deploying new model version.
    """
    failures = []
    for merchant, expected in CATEGORY_DRIFT_TEST_CASES:
        result = call_categorization(
            merchant=merchant, amount=500.0,
            currency="INR", date="2024-10-15",
            merchant_history=[]
        )
        if result["category"] != expected:
            failures.append({
                "merchant": merchant,
                "expected": expected,
                "got": result["category"],
                "confidence": result["confidence"]
            })

    return {
        "passed": len(CATEGORY_DRIFT_TEST_CASES) - len(failures),
        "failed": len(failures),
        "failures": failures,
        "pass_rate": (len(CATEGORY_DRIFT_TEST_CASES) - len(failures)) /
                     len(CATEGORY_DRIFT_TEST_CASES)
    }
```

---

## 10. Future Extensions

### 10.1 Prompt Versioning

**Implementation:** Each prompt is versioned with a semantic version string.
The active version is stored in the FastAPI configuration and logged with every
AI call to Supabase's `ai_call_log` table.

```python
PROMPT_VERSIONS = {
    "ocr":         "1.0.0",
    "categorize":  "1.0.0",
    "insights":    "1.0.0",
    "narrative":   "1.0.0"
}

# Every AI call logs:
# - prompt_version
# - model_used
# - temperature
# - input_token_count
# - output_token_count
# - confidence (where applicable)
# - _fallback flag
# - response_time_ms
```

**Version bump policy:**
- Patch (1.0.x): Wording changes that don't affect output schema
- Minor (1.x.0): New fields added to output (backward-compatible)
- Major (x.0.0): Schema changes, model changes, or constraint changes

### 10.2 A/B Testing Framework

```python
# Prompt variant routing — implemented in Phase 3
import hashlib

def get_prompt_variant(user_id: str, stage: str) -> str:
    """
    Deterministic variant assignment based on user_id hash.
    Same user always gets same variant within an experiment window.
    """
    experiment_config = get_active_experiment(stage)
    if not experiment_config:
        return "control"

    hash_val = int(hashlib.md5(f"{user_id}:{stage}".encode()).hexdigest(), 16)
    bucket = hash_val % 100  # 0–99

    if bucket < experiment_config["treatment_pct"]:
        return "treatment"
    return "control"

# Metrics tracked per variant:
# - categorization accuracy (vs. user corrections in Phase 2)
# - fallback rate
# - insight engagement (did user click through?)
# - narrative word_count distribution
```

### 10.3 LangChain Integration (Phase 4 — Conversational Advisor)

**Entry condition:** When the product introduces a conversational financial advisor
interface where users can ask natural language questions about their spending.

**Architecture (Phase 4 only — do not implement earlier):**

```python
# Phase 4 addition — LangChain for multi-turn advisor
# NOT for the current linear pipeline (Stages 1–4)

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.memory import ConversationBufferWindowMemory
from langchain.chains import ConversationChain

ADVISOR_SYSTEM_PROMPT = """
You are FinSight's financial advisor interface. You have access to the user's
transaction history and computed patterns provided as context. Answer questions
about the user's spending clearly and factually. Never invent data not in the
provided context. Always end responses with the FinSight scope disclaimer.

Context: {context}
"""

# Memory window: last 10 turns only — prevents context window bloat
# Context injection: computed_patterns passed at conversation start
# Scope: This is Phase 4 and requires explicit product approval before implementation
```

### 10.4 Prompt Registry (Phase 3)

```
Planned structure for centralized prompt management:

prompts/
├── registry.yaml           # Active versions and experiment assignments
├── ocr/
│   ├── v1.0.0.txt         # Archived prompt
│   └── v1.1.0.txt         # Current prompt
├── categorize/
│   ├── v1.0.0.txt
│   └── v1.0.1.txt
├── insights/
│   └── v1.0.0.txt
└── narrative/
    └── v1.0.0.txt
```

---

## APPENDIX A — Prompt Checklist (Pre-Deploy)

Before deploying any prompt change to production, verify:

```
STRUCTURAL CHECKS
□ Prompt contains all five sections: ROLE, TASK, CONSTRAINTS, INPUT, OUTPUT
□ OUTPUT section contains the exact JSON schema with field types
□ All required fields are enumerated
□ Allowed enum values are explicitly listed

HALLUCINATION CHECKS
□ Anti-hallucination anchor instruction is present
□ Data scope declaration is present (what model may and may not use)
□ "only use provided data" instruction appears in CONSTRAINTS
□ Advisory/prescriptive language is prohibited in CONSTRAINTS

OPERATIONAL CHECKS
□ Temperature setting matches the approved value for this stage
□ max_tokens is within the approved budget for this stage
□ Model version is pinned (no "latest" aliases)
□ JSON mode is enabled via API parameter (not just prompt instruction)
□ Prompt version bumped in PROMPT_VERSIONS registry

TESTING CHECKS
□ All drift test cases pass at the new prompt version
□ Fallback triggers tested (empty input, malformed input, null fields)
□ Pydantic schema validation tested against expected outputs
□ Banned phrases scan run against 20 sample outputs
```

---

## APPENDIX B — Error Code Reference

| Error Code                   | Stage          | Meaning                              | User Experience              |
|------------------------------|----------------|--------------------------------------|------------------------------|
| `OCR_CONFIDENCE_TOO_LOW`     | OCR            | Confidence < 0.30                    | Upload ERROR state, retry prompt |
| `OCR_API_TIMEOUT`            | OCR            | NVIDIA NIM > 10s                     | Upload ERROR state           |
| `OCR_VALIDATION_FAILED`      | OCR            | Pydantic schema mismatch             | Upload ERROR state           |
| `CATEGORY_FALLBACK_USED`     | Categorization | Confidence < 0.50 or API failure     | Amber dot shown on transaction |
| `CATEGORY_INVALID_VALUE`     | Categorization | Category not in taxonomy             | Fallback to "Other" silently |
| `INSIGHTS_API_FAILURE`       | Insights       | Gemini error or timeout              | Deterministic fallback shown |
| `INSIGHTS_VALIDATION_FAILED` | Insights       | Schema mismatch                      | Deterministic fallback shown |
| `NARRATIVE_MISMATCH`         | Narrative      | primary_finding mismatch             | Deterministic fallback shown |
| `NARRATIVE_NO_DISCLAIMER`    | Narrative      | Disclaimer absent from text          | Deterministic fallback shown |
| `BANNED_PHRASE_DETECTED`     | Any            | Hallucination signal phrase found    | Fallback for that stage      |

---

*End of FinSight PROMPT_STRATEGY.md v1.0.0*
*This document governs all AI prompt engineering decisions in FinSight.*
*Deviations require explicit AI Systems Architecture approval.*
*Architecture authority: TECH_STACK.md v2.0 · Product authority: PRD_v2.md*
