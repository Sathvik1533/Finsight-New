# FINSIGHT — INFRA.md
## Infrastructure Architecture, Deployment & Operations

```
Version:        1.0.0
Classification: Internal — DevOps & Cloud Architecture
Status:         Active — Production Contract
Consumes:       TECH_STACK.md v2.0 · PRD_v2.md · AI_STACK.md v1.0
Governs:        All deployment, networking, secrets, scaling, and operations
Scale Target:   10,000+ concurrent users
Stack:          Vercel (Next.js) + Railway (FastAPI) + Supabase (Postgres + Storage)
Region Primary: ap-south-1 (Mumbai) — India-first user base
```

---

## DOCUMENT AUTHORITY

This document governs every infrastructure decision in FinSight. No service may be added,
replaced, or re-configured without a justification traceable here. All cost estimates,
scaling thresholds, and deployment procedures are binding. If a number has changed since
this document was written, update the document — do not deviate silently.

---

## TABLE OF CONTENTS

1. [Deployment Architecture](#1-deployment-architecture)
2. [Environment Variables — Complete Registry](#2-environment-variables)
3. [Secret Management](#3-secret-management)
4. [Network Flow & Security Boundaries](#4-network-flow--security-boundaries)
5. [Scaling Strategy](#5-scaling-strategy)
6. [Logging & Monitoring](#6-logging--monitoring)
7. [CI/CD Pipeline](#7-cicd-pipeline)
8. [Failover Strategy](#8-failover-strategy)
9. [Cost Estimation](#9-cost-estimation)
10. [Future Infrastructure](#10-future-infrastructure)

---

## 1. Deployment Architecture

### 1.1 The Three-Tier Production Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│                         INTERNET                                       │
│                      (user's browser)                                  │
└──────────────────────────────┬─────────────────────────────────────────┘
                               │  HTTPS only — no HTTP
                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│  TIER 1 — VERCEL (Frontend + BFF)                                      │
│  ┌──────────────────────────┐  ┌───────────────────────────────────┐   │
│  │  Next.js App             │  │  Next.js API Routes (BFF)         │   │
│  │  - Static pages (SSG)    │  │  - Session validation             │   │
│  │  - SSR pages             │  │  - File ingestion + MIME check    │   │
│  │  - React client          │  │  - Supabase Storage upload        │   │
│  │                          │  │  - Forwards to FastAPI            │   │
│  │  Region: Global CDN edge │  │  - Stripe webhook handler         │   │
│  │  Timeout: 10s (hobby)    │  │  Timeout: 60s (Pro plan)         │   │
│  │            60s (Pro)     │  │                                   │   │
│  └──────────────────────────┘  └───────────────────────────────────┘   │
│                                        │                               │
│  Domain: finsight.vercel.app           │  Internal HTTP               │
│  (custom domain Phase 2+)             │  X-Internal-Secret header     │
└────────────────────────────────────────┼───────────────────────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│  TIER 2 — RAILWAY (AI Service)                                         │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Python FastAPI — uvicorn — persistent container               │    │
│  │                                                                │    │
│  │  POST /analyze/receipt   → NVIDIA NIM + Groq + Supabase write  │    │
│  │  POST /insights/generate → Gemini + Python + Supabase write    │    │
│  │  POST /decision-engine/run → Python + Gemini + Supabase write  │    │
│  │  GET  /health            → Provider connectivity check         │    │
│  │                                                                │    │
│  │  Memory: 1GB | Python 3.11 | No execution timeout             │    │
│  │  Region: us-east (default) — upgrade to ap-south Phase 3      │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                          │               │               │             │
└──────────────────────────┼───────────────┼───────────────┼─────────────┘
                           │               │               │
              ┌────────────▼──┐  ┌─────────▼───┐  ┌───────▼──────┐
              │  NVIDIA NIM   │  │    Groq      │  │   Gemini     │
              │  (OCR)        │  │  (Category)  │  │  (Insights)  │
              │  External API │  │  External API│  │  External API│
              └───────────────┘  └─────────────┘  └──────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────────────────┐
│  TIER 3 — SUPABASE (Data Layer)                                        │
│  ┌──────────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │  PostgreSQL 15       │  │  Storage         │  │  Auth           │  │
│  │  - profiles          │  │  - receipts/     │  │  - Email+pass   │  │
│  │  - receipts          │  │    {user_id}/    │  │  - Google OAuth │  │
│  │  - transactions      │  │    {receipt_id}  │  │  - JWT sessions │  │
│  │  - insights          │  │  - Private bucket│  │  - httpOnly     │  │
│  │  - decision_engine_  │  │  - Signed URLs   │  │    cookies      │  │
│  │    outputs           │  │    (1hr expiry)  │  │                 │  │
│  │  - ai_audit_log      │  │                  │  │                 │  │
│  │                      │  │                  │  │                 │  │
│  │  RLS: enforced on    │  │  RLS: bucket     │  │  SMTP: custom   │  │
│  │  all tables          │  │  policies active │  │  (not default)  │  │
│  │  PgBouncer: on       │  │                  │  │                 │  │
│  │  Region: ap-south-1  │  │  Region: ap-     │  │                 │  │
│  └──────────────────────┘  │  south-1         │  └─────────────────┘  │
│                             └──────────────────┘                       │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Why This Topology — Not Alternatives

**Why Vercel for Next.js (not self-hosted):**
Vercel provides automatic preview deployments on every PR — each PR gets its own
URL with a staging environment. This costs zero additional money on the Hobby plan.
Self-hosting Next.js on Railway or EC2 requires a separate staging environment,
SSL certificate management, and custom deployment scripts. The operational overhead
exceeds the cost difference at FinSight's phase.

**Why Railway for FastAPI (not AWS Lambda / Cloud Functions):**
The synchronous upload pipeline runs NVIDIA NIM OCR (1.5–3.5s) + Groq categorization
(200–400ms) sequentially. Total: 2–4 seconds minimum. AWS Lambda has a 15-minute timeout
but cold start latency of 500ms–2s on Python containers with ML dependencies.
More importantly: Vercel's serverless functions have a 10-second limit on Hobby and 60
seconds on Pro — FastAPI cannot be hosted on Vercel. Railway's persistent container
starts once, stays warm, and has no execution time limit.

**Why Supabase (not PlanetScale / Neon / raw RDS):**
Supabase bundles PostgreSQL + Row Level Security + Storage + Auth + Realtime in one
platform. Using raw RDS requires separate auth (Auth0/Cognito), separate storage (S3),
separate connection pooling (RDS Proxy), and custom implementation of every feature
Supabase provides. At Phase 1–3, the bundled approach is correct. The exit path
to raw Postgres exists if Supabase pricing becomes prohibitive at Phase 4+ scale.

### 1.3 Service Responsibilities Matrix

| Responsibility              | Owner          | Notes                                    |
|-----------------------------|----------------|------------------------------------------|
| Static asset serving        | Vercel CDN     | Global edge, automatic                  |
| SSR / SSG rendering         | Vercel         | Next.js App Router                      |
| Session management          | Supabase Auth  | httpOnly cookie, JWT                    |
| File upload (browser→store) | Vercel BFF     | MIME check → Supabase Storage            |
| AI pipeline orchestration   | FastAPI/Railway| Only service with AI API keys           |
| OCR extraction              | NVIDIA NIM     | External API, called by FastAPI         |
| Transaction categorization  | Groq           | External API, called by FastAPI         |
| Insight generation          | Gemini         | External API, called by FastAPI         |
| Transaction storage         | Supabase       | Written by FastAPI (service role)       |
| Receipt image storage       | Supabase       | Written by Next.js BFF (service role)   |
| Realtime status updates     | Supabase       | Phase 4 async queue feedback            |
| Background jobs             | FastAPI        | FastAPI BackgroundTasks (Phase 1–3)     |

---

## 2. Environment Variables — Complete Registry

### 2.1 Next.js — Vercel Environment Variables

Set in Vercel Dashboard → Project Settings → Environment Variables.
Never committed to the repository. Never in `.env` files in version control.

```bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# NEXT_PUBLIC_* — safe to expose in the browser bundle
# Absolute maximum: 3 NEXT_PUBLIC_ variables. No exceptions.
# These values are visible to any user who inspects JS bundles.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
# Supabase project URL. Safe: all data access still enforced by RLS.
# Location: Supabase Dashboard → Settings → API → Project URL

NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Supabase anon key. Safe: RLS prevents any unauthorized data access.
# This key is rate-limited. Even if exposed, cannot bypass RLS.
# Location: Supabase Dashboard → Settings → API → anon public key

NEXT_PUBLIC_APP_URL=https://finsight.vercel.app
# Own production URL. Used for redirect URLs and absolute links.
# Update to custom domain when acquired (Phase 2+).

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SERVER-ONLY — API Routes only. NEVER use NEXT_PUBLIC_ prefix.
# If any of these appear in browser-accessible code: deploy blocked.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Bypasses RLS — supreme database access. Never expose.
# Used in: /api/receipts/upload (storage write + receipt row create)
# Location: Supabase Dashboard → Settings → API → service_role key

FASTAPI_INTERNAL_URL=https://finsight-api.up.railway.app
# Railway service public URL. Rotated when Railway service is recreated.
# Used in: every BFF route that calls FastAPI

FASTAPI_SECRET_KEY=<64-char random hex string>
# Shared secret between Next.js BFF and FastAPI.
# Sent as X-Internal-Secret header on every BFF → FastAPI call.
# Must match FASTAPI_SECRET_KEY in Railway exactly.
# Generate: openssl rand -hex 32

STRIPE_SECRET_KEY=sk_live_...
# Stripe secret key. Phase 2+ only.
# Used in: /api/webhooks/stripe (signature verification)

STRIPE_WEBHOOK_SECRET=whsec_...
# Stripe webhook signing secret. Phase 2+ only.
# Used in: /api/webhooks/stripe (Stripe-Signature header validation)
```

**Vercel environment scoping:**

| Variable                     | Production | Preview | Development |
|------------------------------|------------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL`   | Prod URL   | Staging URL | Local URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Prod key | Staging key | Local key |
| `NEXT_PUBLIC_APP_URL`        | prod domain | preview URL | localhost:3000 |
| `SUPABASE_SERVICE_ROLE_KEY`  | Prod key   | Staging key | Local key |
| `FASTAPI_INTERNAL_URL`       | Prod Railway | Prod Railway | localhost:8000 |
| `FASTAPI_SECRET_KEY`         | Prod secret | Prod secret | any string |

**Preview deployments** use a separate Supabase project (`finsight-staging`).
They point to production Railway — preview deploys do not get their own FastAPI instance.
This is acceptable: preview deployments test UI/BFF logic, not AI pipeline behavior.

### 2.2 FastAPI — Railway Environment Variables

Set in Railway Dashboard → Service → Variables. Never in `Dockerfile` or code.

```bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AI PROVIDER KEYS — FastAPI only. Absolute rule.
# These keys NEVER appear in any Next.js file, ever.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NVIDIA_NIM_API_KEY=nvapi-...
# NVIDIA NIM API key for Llama 3.2 90B Vision.
# Location: build.nvidia.com → API Keys
# Rotation: quarterly or on compromise

GROQ_API_KEY=gsk_...
# Groq API key for Llama 3.3 70B Versatile.
# Location: console.groq.com → API Keys
# Rotation: quarterly or on compromise

GEMINI_API_KEY=AIza...
# Google AI Studio / Vertex AI API key for Gemini 2.0 Flash.
# Location: aistudio.google.com → API Keys
# Rotation: quarterly or on compromise

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SUPABASE — FastAPI's own copy
# Same values as Vercel, but independent variables.
# FastAPI writes via service role — bypasses RLS intentionally.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
# Same value as NEXT_PUBLIC_SUPABASE_URL

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Same value as Next.js SUPABASE_SERVICE_ROLE_KEY.
# Separate variable — FastAPI owns its copy independently.

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SERVICE SECURITY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FASTAPI_SECRET_KEY=<64-char random hex string>
# Must match FASTAPI_SECRET_KEY in Vercel exactly.
# FastAPI rejects any request missing this header.
# All FastAPI endpoints (except /health) require X-Internal-Secret.

ALLOWED_ORIGINS=https://finsight.vercel.app
# CORS whitelist. In production: only the Vercel production URL.
# CRITICAL: Must be set before first production deploy.
# Default of localhost:3000 blocks all production browser uploads.
# Multiple origins: comma-separated string.

ENVIRONMENT=production
# Used in FastAPI to switch log verbosity and error detail.
# Values: development | staging | production

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PHASE 4 ADDITIONS (not needed until async queue is implemented)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REDIS_URL=redis://default:<password>@<host>:6379
# Redis connection string for BullMQ queue.
# Provider: Upstash Redis (serverless, pay-per-request).
# Only add when async queue is implemented in Phase 4.

SENTRY_DSN=https://...@sentry.io/...
# Sentry error tracking DSN.
# Phase 3+ for production error monitoring.
```

### 2.3 Local Development Variables

```bash
# fastapi/.env (gitignored — never committed)
NVIDIA_NIM_API_KEY=nvapi-...
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
FASTAPI_SECRET_KEY=dev-secret-not-for-production
ALLOWED_ORIGINS=http://localhost:3000
ENVIRONMENT=development

# .env.local (gitignored — never committed)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=eyJ...
FASTAPI_INTERNAL_URL=http://localhost:8000
FASTAPI_SECRET_KEY=dev-secret-not-for-production
```

---

## 3. Secret Management

### 3.1 The Absolute Rules

These rules are not guidelines. Violation of any single rule is a production security incident.

```
RULE 1: No AI API key ever appears in any Next.js file.
  Enforced by: GitHub Actions secret-scan CI job (blocks merge on detection).
  Keys in scope: NVIDIA_NIM_API_KEY, GROQ_API_KEY, GEMINI_API_KEY.
  Scan command:
    grep -r "nvapi-\|gsk_\|AIza\|NVIDIA_NIM\|GROQ_API\|GEMINI_API" \
      --include="*.ts" --include="*.tsx" src/
  Expected output: ZERO RESULTS. Any result blocks the deploy.

RULE 2: SUPABASE_SERVICE_ROLE_KEY is never NEXT_PUBLIC_.
  The service role key bypasses all RLS. Browser exposure = full database access
  for any user. This variable must never have the NEXT_PUBLIC_ prefix anywhere.

RULE 3: User ID always comes from the server-side session.
  session.user.id is extracted from the httpOnly Supabase cookie via @supabase/ssr.
  req.body.user_id is never used. The client cannot forge a user ID.

RULE 4: FastAPI validates X-Internal-Secret on every request.
  No AI API call can be triggered without this header. The header is set only
  by Next.js API routes. It cannot be set by a browser request (same-origin
  policy does not help here; the check is in FastAPI middleware).

RULE 5: No .env files are committed to version control. Ever.
  .gitignore must include: .env, .env.local, .env.production, fastapi/.env
```

### 3.2 Secret Storage by Service

| Secret                        | Storage Location      | Access              | Visible in Code? |
|-------------------------------|-----------------------|---------------------|------------------|
| `NVIDIA_NIM_API_KEY`          | Railway Variables     | FastAPI only        | Never            |
| `GROQ_API_KEY`                | Railway Variables     | FastAPI only        | Never            |
| `GEMINI_API_KEY`              | Railway Variables     | FastAPI only        | Never            |
| `SUPABASE_SERVICE_ROLE_KEY`   | Vercel + Railway Vars | BFF + FastAPI       | Never            |
| `FASTAPI_SECRET_KEY`          | Vercel + Railway Vars | BFF + FastAPI       | Never            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Vercel Variables     | Browser (safe)      | In JS bundle     |
| `STRIPE_SECRET_KEY`           | Vercel Variables      | BFF webhook handler | Never            |

### 3.3 Secret Rotation Strategy

```
QUARTERLY ROTATION (scheduled — no incident required)
  Target: NVIDIA_NIM_API_KEY, GROQ_API_KEY, GEMINI_API_KEY
  Process:
    1. Generate new key in provider dashboard (do NOT delete old key yet)
    2. Update Railway variable — Railway hot-reloads env vars without restart
    3. Verify /health endpoint returns all providers healthy
    4. Delete old key from provider dashboard
    5. Update rotation log in this document (date + rotated by)
  Zero-downtime: Railway applies new env vars on next request, not on restart.
  Estimated downtime: 0ms (env var hot-reload).

IMMEDIATE ROTATION (on suspected compromise)
  Process:
    1. Invalidate compromised key in provider dashboard immediately (< 5 minutes)
    2. Generate replacement key
    3. Update Railway/Vercel variable
    4. Verify /health endpoint
    5. Audit ai_audit_log for unusual call patterns in past 24 hours
    6. If AI API keys: check provider billing for unexpected usage spikes
  RTO (Recovery Time Objective): < 15 minutes from detection to restored service.

SUPABASE_SERVICE_ROLE_KEY ROTATION
  Process: Supabase does not support key rotation without generating a new project.
  Mitigation: Restrict service role to minimum-required operations via PostgREST
              configuration. Review usage quarterly.
  If compromised: reset via Supabase dashboard → Settings → API → regenerate.
  Note: All active sessions remain valid (they use JWT, not the service role key).

FASTAPI_SECRET_KEY ROTATION
  Must be rotated in both Vercel AND Railway simultaneously.
  If rotated out of sync: all BFF→FastAPI calls fail until both are updated.
  Process: Update Railway first → verify /health → update Vercel → verify uploads.
  Zero-downtime window: under 60 seconds if both updates are done back-to-back.
```

### 3.4 Pre-Deployment Secret Audit

Run before every production deployment:

```bash
#!/bin/bash
# scripts/pre-deploy-audit.sh

echo "Running pre-deployment secret audit..."

# 1. Scan Next.js source for AI keys
if grep -r "nvapi-\|gsk_\|AIza\|NVIDIA_NIM_API_KEY\|GROQ_API_KEY\|GEMINI_API_KEY\|service_role" \
    --include="*.ts" --include="*.tsx" src/; then
    echo "❌ BLOCKED: Secret found in frontend source code"
    exit 1
fi

# 2. Confirm no .env files staged for commit
if git diff --cached --name-only | grep -E "\.env|\.env\.local|\.env\.production"; then
    echo "❌ BLOCKED: .env file staged for commit"
    exit 1
fi

# 3. Check NEXT_PUBLIC_ variable count (max 3)
PUBLIC_COUNT=$(grep -r "NEXT_PUBLIC_" --include="*.ts" --include="*.tsx" src/ | \
    grep -v "SUPABASE_URL\|SUPABASE_ANON_KEY\|APP_URL" | wc -l)
if [ "$PUBLIC_COUNT" -gt "0" ]; then
    echo "⚠️  WARNING: Unrecognized NEXT_PUBLIC_ variable in source code"
fi

echo "✅ Secret audit passed — safe to deploy"
```

---

## 4. Network Flow & Security Boundaries

### 4.1 Complete Request Flow — Receipt Upload

This is the most complex network path in FinSight. Every hop is documented.

```
BROWSER (user's device)
  │
  │  POST https://finsight.vercel.app/api/receipts/upload
  │  Headers: Cookie: sb-access-token=<JWT>
  │  Body: FormData { file: <image> }
  │  Protocol: HTTPS/TLS 1.3
  │  Auth: Supabase session cookie (httpOnly, SameSite=Strict)
  │
  ▼
VERCEL EDGE NETWORK
  │  TLS termination at edge
  │  Request forwarded to nearest Vercel region function
  │
  ▼
NEXT.JS API ROUTE — /api/receipts/upload
  │  [1] createServerClient() → extract session from httpOnly cookie
  │  [2] session.user.id → verified user ID (cannot be forged)
  │  [3] Check profiles.total_receipts_uploaded against tier limit
  │       Free: ≤ 25 | Pro: unlimited
  │       If exceeded: return 402 { error_code: "LIMIT_REACHED" }
  │  [4] Validate MIME type server-side (ignore client-reported type)
  │       Allowed: image/jpeg, image/png, image/webp, application/pdf
  │       Reject: everything else → 400
  │  [5] Validate file size: ≤ 10MB
  │       Reject if over: 400 { error_code: "FILE_TOO_LARGE" }
  │  [6] Upload to Supabase Storage
  │       Path: receipts/{user_id}/{uuid}.{ext}
  │       Auth: SUPABASE_SERVICE_ROLE_KEY (server-side only)
  │  [7] INSERT receipts row (status='pending')
  │  [8] Encode file buffer to base64
  │  [9] POST to FastAPI
  │
  │  POST https://finsight-api.up.railway.app/analyze/receipt
  │  Headers: X-Internal-Secret: <FASTAPI_SECRET_KEY>
  │           Content-Type: application/json
  │  Body: { image_base64, user_id, receipt_id }
  │  Protocol: HTTPS (Railway provides TLS)
  │  Network: Public internet (Vercel → Railway via HTTPS)
  │  Note: This call is NOT on a private VPC — acceptable at Phase 1–3
  │        The X-Internal-Secret is the authentication mechanism.
  │
  ▼
FASTAPI SERVICE — Railway
  │  [10] Middleware: validate X-Internal-Secret header → 401 if missing/wrong
  │  [11] Decode base64 image → PIL Image object
  │
  │  POST https://integrate.api.nvidia.com/v1/chat/completions
  │  Headers: Authorization: Bearer <NVIDIA_NIM_API_KEY>
  │  Body: { model, messages (including image), temperature: 0.0 }
  │  Timeout: 12 seconds
  │  [12] Parse OCR JSON response → Pydantic validation
  │  [13] confidence < 0.30 → UPDATE receipt status='failed_ocr' → raise 422
  │
  │  POST https://api.groq.com/openai/v1/chat/completions
  │  Headers: Authorization: Bearer <GROQ_API_KEY>
  │  Body: { model, messages, response_format: json_object, temperature: 0.1 }
  │  Timeout: 5 seconds
  │  [14] Parse categorization JSON → Pydantic validation
  │  [15] confidence < 0.50 → override to "Other"
  │
  │  Supabase REST API (ap-south-1)
  │  Headers: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
  │  [16] INSERT transactions row
  │  [17] UPDATE receipts row (status='complete')
  │  [18] RPC increment_receipt_count(user_id)
  │
  │  [19] FastAPI BackgroundTasks: run_decision_engine(user_id) [fire-and-forget]
  │  [20] Return { status, extraction, categorization, processing_time_ms }
  │
  ▼
NEXT.JS BFF (resumed after await)
  │  [21] Return FastAPI response body to browser
  │  HTTP 200 with JSON payload
  │
  ▼
BROWSER
  [22] TanStack Query receives response
  [23] Upload Modal advances to RESULTS state
  [24] Invalidate queries: user/profile, dashboard/summary, receipts
```

### 4.2 Security Boundary Map

```
BOUNDARY 1 — Public Internet → Vercel
  Protection: HTTPS/TLS 1.3, Vercel DDoS mitigation
  What passes: Authenticated HTTP requests only
  Auth: Supabase session JWT in httpOnly cookie

BOUNDARY 2 — Vercel BFF → FastAPI
  Protection: X-Internal-Secret shared header (min 32 chars, random)
  What passes: Internal API calls only (not user-initiated directly)
  Exposure risk: Secret transmitted over HTTPS — safe in transit
  Limitation: Not on private network — Phase 4 option: Railway private networking

BOUNDARY 3 — FastAPI → AI Providers
  Protection: Bearer token per provider (HTTPS)
  What passes: Image data + prompts
  Data sensitivity: Receipt images (PII). Consider: GDPR compliance for EU users.
  Retention: NVIDIA/Groq/Gemini may log requests per their data policies.

BOUNDARY 4 — FastAPI → Supabase
  Protection: SUPABASE_SERVICE_ROLE_KEY (HTTPS to ap-south-1)
  What passes: All transaction and receipt writes
  RLS bypass: Intentional — FastAPI writes on behalf of verified users
  User isolation enforced: user_id always included in every write

BOUNDARY 5 — Browser → Supabase (direct, for auth + Realtime)
  Protection: SUPABASE_ANON_KEY + RLS on all tables
  What passes: Auth flows + Realtime subscriptions (Phase 4)
  Data access: Only user's own rows (RLS policy: auth.uid() = user_id)
```

### 4.3 CORS Configuration

```python
# fastapi/main.py
from fastapi.middleware.cors import CORSMiddleware
import os

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ["ALLOWED_ORIGINS"].split(","),
    # Production: ["https://finsight.vercel.app"]
    # Development: ["http://localhost:3000"]
    allow_credentials=False,   # FastAPI does not use cookies — no need
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "X-Internal-Secret"],
    max_age=3600               # Preflight cache: 1 hour
)
```

**Why `allow_credentials=False` on FastAPI:**
FastAPI does not receive or set cookies. All auth is in Next.js BFF via Supabase's
httpOnly cookie. FastAPI only authenticates via X-Internal-Secret. Setting
`allow_credentials=True` without a purpose is a security anti-pattern.

---

## 5. Scaling Strategy

### 5.1 Phase-by-Phase Scaling Map

```
PHASE 1 — 0–500 users / ~2,000 receipts/month
─────────────────────────────────────────────────────────────────────────
Vercel:     Hobby plan ($0) — 100GB bandwidth, unlimited serverless functions
Railway:    Starter plan (~$5/month) — 512MB RAM, shared CPU
Supabase:   Free tier → Pro ($25/month) at ~100 MAU or when PITR needed
Bottleneck: None — system is over-provisioned at this scale
Action:     Monitor /health endpoint; no scaling action needed

PHASE 2 — 500–2,000 users / ~20,000 receipts/month
─────────────────────────────────────────────────────────────────────────
Vercel:     Upgrade to Pro ($20/month) — 60s timeout (required for upload flow)
            Hobby has 10s timeout — insufficient for OCR + categorization + DB write
Railway:    Pro plan (~$20/month) — 1GB RAM, dedicated CPU
            Memory requirement: Pillow + PIL for image processing spikes to 800MB
Supabase:   Pro ($25/month) — required for PgBouncer + PITR + custom SMTP
Bottleneck: Vercel 10s timeout if still on Hobby plan
Action:     Upgrade Vercel to Pro before reaching 500 users

PHASE 3 — 2,000–5,000 users / ~75,000 receipts/month
─────────────────────────────────────────────────────────────────────────
Vercel:     Pro plan — sufficient. Add custom domain.
Railway:    Scale to 2GB RAM — memory pressure from concurrent image processing
            Consider: add second Railway service as staging environment
Supabase:   Pro plan — add composite DB indexes. Enable materialized views.
            Monitor: connection count via PgBouncer metrics
Bottleneck: Gemini rate limits during IST peak hours (9am–11am, 8pm–11pm)
Action:     Implement Gemini call rate limiter in FastAPI (token bucket algorithm)
            Stagger background insight generation: Phase 3 background scheduler

PHASE 4 — 5,000–10,000 users / ~200,000 receipts/month
─────────────────────────────────────────────────────────────────────────
Vercel:     Pro plan — Vercel auto-scales serverless functions automatically.
            No action needed on the frontend/BFF layer.
Railway:    Scale to 3 workers (3× Railway service instances)
            Each worker handles one pipeline independently
            Load balancer: Railway built-in (round-robin across instances)
            Memory per instance: 2GB
Supabase:   Team plan ($599/month) OR self-managed Postgres on Railway
            Add read replica for analytics queries (dashboard, insights)
            Materialized view refresh: on every upload via trigger
Redis:      Upstash Redis ($0–$20/month) for BullMQ queue
            See Section 10 for async queue architecture
AI APIs:    Upgrade all to paid tiers (already done at Phase 2 for Groq)
            NVIDIA NIM: paid tier for higher RPM ceiling
            Gemini: Vertex AI for enterprise rate limits
Bottleneck: Supabase connection count (100 connections on Pro)
Action:     Migrate to PgBouncer transaction mode (already default on Supabase Pro)
            Consider: Supabase Team plan for 200 connections
```

### 5.2 Vercel Auto-Scaling Behavior

Vercel serverless functions scale to zero and scale up automatically on demand.
There is nothing to configure. The relevant limits by plan:

| Limit                    | Hobby       | Pro              | Notes                              |
|--------------------------|-------------|------------------|------------------------------------|
| Serverless timeout       | 10 seconds  | 60 seconds       | **Must upgrade to Pro for uploads** |
| Bandwidth                | 100GB/month | 1TB/month        | Sufficient through Phase 3         |
| Serverless function size | 50MB        | 250MB            | No issue — BFF is lightweight      |
| Build time               | 45 min/day  | 6,000 min/month  | No issue                           |
| Team members             | 1           | unlimited        | Upgrade when team grows            |
| Preview deployments      | unlimited   | unlimited        | Core workflow feature              |

**Critical upgrade trigger:** Upgrade to Pro before the first production upload.
The Hobby 10-second timeout is shorter than the p95 pipeline duration (8 seconds).
In practice, any slow NVIDIA NIM response + Groq + DB write will timeout on Hobby.

### 5.3 Railway Scaling Configuration

```dockerfile
# fastapi/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for Pillow (image processing)
RUN apt-get update && apt-get install -y \
    libpq-dev \
    libjpeg-dev \
    libpng-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Single worker in Phase 1-3 (pipeline is I/O bound — async handles concurrency)
# Phase 4: scale to 3 Railway instances, not 3 workers per instance
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", \
     "--workers", "1", "--loop", "asyncio"]
```

```toml
# railway.toml (project root)
[build]
dockerfilePath = "fastapi/Dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

**Why `--workers 1` not `--workers 4`:**
The pipeline is I/O-bound: it waits for NVIDIA NIM (1.5–3.5s), Groq (200–400ms),
and Supabase (50–150ms). FastAPI's async/await handles concurrent requests on a single
worker efficiently — while one request waits for NVIDIA NIM, another request's Groq
call can proceed. Multiple workers add memory overhead (each Python worker is a full
process, ~200MB overhead each) without proportional throughput gain for I/O-bound work.
Phase 4 horizontal scaling uses multiple Railway instances, not multiple workers per
instance — this gives independent health checks and cleaner failure isolation.

### 5.4 Supabase Connection Limits

```
SUPABASE CONNECTION LIMITS BY PLAN
Free:    60 direct connections (not enough for production)
Pro:     120 direct connections (sufficient for Phase 1–3 with PgBouncer)
Team:    200 direct connections

FINSIGHT CONNECTION USAGE
Next.js BFF:  Serverless functions — each invocation uses 1 connection.
              Peak: ~50 concurrent uploads = ~50 connections.
FastAPI:      Persistent process — maintains connection pool.
              Uses: supabase-py client (1 connection per active request).
              Peak: 10 concurrent pipeline runs = ~10 connections.
Total peak:   ~60 connections — fits Pro plan with PgBouncer.

PGBOUNCER MODE: Transaction (Supabase default for REST API)
  Each query uses a connection for its duration then returns it to pool.
  Effective multiplier: 1 physical connection handles ~10 logical connections.
  With 120 physical connections: handles ~1,200 concurrent logical connections.
  This is sufficient for Phase 4.
```

---

## 6. Logging & Monitoring

### 6.1 Logging Architecture

```
LOG SOURCES                   FORMAT           DESTINATION
────────────────────────────────────────────────────────────────────────
Vercel serverless functions   Structured JSON   Vercel Dashboard Logs
  - HTTP request logs                           + Logtail (Phase 3)
  - BFF errors
  - Auth events

Railway FastAPI service       Structured JSON   Railway Dashboard Logs
  - Pipeline execution logs                     + Logtail (Phase 3)
  - AI provider call timing
  - Fallback events

Supabase PostgREST            SQL audit log     Supabase Dashboard
  - All database queries                        (7-day retention on Pro)
  - RLS policy rejections

ai_audit_log table            PostgreSQL         Supabase (permanent)
  - All AI model calls                          Queryable forever
  - Confidence scores
  - Fallback flags
  - Token counts
  - Response times
```

### 6.2 FastAPI Structured Logging

```python
# fastapi/logging_config.py
import logging
import json
import time
from fastapi import Request

class StructuredLogger:
    def __init__(self):
        self.logger = logging.getLogger("finsight")
        handler = logging.StreamHandler()
        handler.setFormatter(self._json_formatter())
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)

    def _json_formatter(self):
        class JsonFormatter(logging.Formatter):
            def format(self, record):
                return json.dumps({
                    "timestamp": self.formatTime(record),
                    "level": record.levelname,
                    "message": record.getMessage(),
                    "service": "finsight-fastapi",
                    **getattr(record, "extra", {})
                })
        return JsonFormatter()

    def log_pipeline_event(self, event: str, **kwargs):
        """Log a pipeline execution event with structured fields."""
        self.logger.info(event, extra={
            "extra": {
                "event_type": "pipeline",
                **kwargs
            }
        })

logger = StructuredLogger()

# Usage in pipeline:
logger.log_pipeline_event(
    "ocr_complete",
    user_id=user_id,
    receipt_id=receipt_id,
    model="nvidia-llama-3.2-90b-vision",
    confidence=0.87,
    duration_ms=2340,
    used_fallback=False
)

logger.log_pipeline_event(
    "categorization_complete",
    user_id=user_id,
    receipt_id=receipt_id,
    model="groq-llama-3.3-70b",
    category="Food & Dining",
    confidence=0.94,
    duration_ms=260,
    used_fallback=False
)

logger.log_pipeline_event(
    "pipeline_complete",
    user_id=user_id,
    receipt_id=receipt_id,
    total_duration_ms=2840,
    stages_completed=["ocr", "categorize", "db_write"],
    decision_engine_triggered=True
)
```

### 6.3 Error Tracking — Sentry (Phase 3)

```python
# fastapi/main.py (Phase 3 addition)
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
import os

if os.getenv("ENVIRONMENT") == "production":
    sentry_sdk.init(
        dsn=os.environ["SENTRY_DSN"],
        integrations=[FastApiIntegration()],
        traces_sample_rate=0.1,   # 10% of requests traced
        profiles_sample_rate=0.1,
        environment="production",
        # Do NOT send receipt image data to Sentry
        before_send=lambda event, hint: scrub_pii(event)
    )

def scrub_pii(event: dict) -> dict:
    """Remove any image data or PII before sending to Sentry."""
    if "request" in event and "data" in event.get("request", {}):
        data = event["request"]["data"]
        if "image_base64" in data:
            data["image_base64"] = "[REDACTED - receipt image]"
    return event
```

```typescript
// src/lib/sentry.ts (Phase 3 addition — Next.js)
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  // Never log file contents or user PII in error events
  beforeSend(event) {
    if (event.request?.data) {
      delete event.request.data   // Remove request bodies (may contain file data)
    }
    return event
  }
})
```

### 6.4 Uptime Monitoring

```yaml
# Phase 2: Simple uptime check via Better Uptime or UptimeRobot (free tier)
# Monitor these endpoints:

- name: "FinSight Frontend"
  url: "https://finsight.vercel.app"
  method: GET
  check_interval: 60s
  alert_after: 2 failures

- name: "FastAPI Health"
  url: "https://finsight-api.up.railway.app/health"
  method: GET
  expected_response: '{"status":"ok"}'
  check_interval: 60s
  alert_after: 2 failures
  # This also verifies all 3 AI provider connections are healthy

- name: "Supabase Auth"
  url: "https://xxxxxxxxxxxx.supabase.co/auth/v1/health"
  method: GET
  check_interval: 300s
  alert_after: 1 failure
```

### 6.5 Key Metrics to Monitor

```
PIPELINE HEALTH (from ai_audit_log table)
─────────────────────────────────────────────────────────────────
Query: SELECT stage, AVG(response_time_ms), COUNT(*),
              SUM(CASE WHEN used_fallback THEN 1 ELSE 0 END)::float / COUNT(*) AS fallback_rate
       FROM ai_audit_log
       WHERE created_at > NOW() - INTERVAL '1 hour'
       GROUP BY stage;

Alert thresholds:
  ocr fallback_rate     > 5%   → investigate NIM availability or prompt
  category fallback_rate > 10%  → investigate Groq availability or taxonomy
  gemini fallback_rate   > 3%   → investigate Gemini availability
  ocr avg response_time  > 5000ms → NIM is slower than expected

BUSINESS HEALTH (from Supabase tables)
─────────────────────────────────────────────────────────────────
  uploads per hour            → traffic baseline
  failed_ocr per hour         → receipt quality issues
  new signups per day         → growth rate
  intelligence level 4 count  → engaged user count
```

---

## 7. CI/CD Pipeline

### 7.1 Repository Structure

```
finsight/
├── src/                        # Next.js application
│   ├── app/                    # App Router pages and API routes
│   ├── components/             # UI components
│   └── lib/                    # Utilities, hooks, clients
├── fastapi/                    # Python FastAPI service
│   ├── main.py                 # FastAPI app + routes
│   ├── pipeline/               # OCR, categorization, insights modules
│   ├── decision_engine/        # Tax, subscriptions, leakage modules
│   ├── Dockerfile              # Railway deployment container
│   └── requirements.txt
├── supabase/                   # Database migrations
│   └── migrations/             # Numbered SQL migration files
├── scripts/
│   └── pre-deploy-audit.sh     # Secret scan script
├── .github/
│   └── workflows/
│       ├── ci.yml              # Lint + typecheck + secret scan
│       └── deploy-fastapi.yml  # Railway deployment trigger
├── .gitignore                  # Must include: .env*, fastapi/.env
└── railway.toml                # Railway deployment config
```

### 7.2 GitHub Actions — Complete CI Workflow

```yaml
# .github/workflows/ci.yml
name: FinSight CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:

  # ─────────────────────────────────────────────────────────
  # JOB 1: Secret exposure scan — BLOCKS MERGE IF ANY SECRET FOUND
  # This runs first. If it fails, no other jobs matter.
  # ─────────────────────────────────────────────────────────
  secret-scan:
    name: Secret Exposure Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Scan Next.js source for AI keys
        run: |
          echo "Scanning for exposed secrets in src/..."
          if grep -rn \
            "nvapi-\|gsk_\|AIza\|NVIDIA_NIM_API_KEY\|GROQ_API_KEY\|GEMINI_API_KEY\|service_role" \
            --include="*.ts" --include="*.tsx" \
            src/; then
            echo ""
            echo "::error::BLOCKED: Secret or secret reference found in frontend source."
            echo "::error::AI API keys must never appear in any Next.js file."
            echo "::error::Fix this before merging."
            exit 1
          fi
          echo "✅ No secrets found in frontend source."

      - name: Check for committed .env files
        run: |
          if find . -name ".env" -o -name ".env.local" -o -name ".env.production" \
            | grep -v node_modules | grep -v ".gitignore"; then
            echo "::error::BLOCKED: .env file found in repository."
            exit 1
          fi
          echo "✅ No .env files committed."

  # ─────────────────────────────────────────────────────────
  # JOB 2: Next.js type check + lint
  # ─────────────────────────────────────────────────────────
  nextjs-checks:
    name: Next.js Type Check + Lint
    runs-on: ubuntu-latest
    needs: secret-scan
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci

      - name: TypeScript compile check
        run: npx tsc --noEmit
        # Fails the build on any type error.
        # This catches bugs that would only appear at runtime.

      - name: ESLint
        run: npx eslint src/ --max-warnings 0
        # --max-warnings 0: treat all warnings as errors in CI.
        # This prevents warning accumulation over time.

  # ─────────────────────────────────────────────────────────
  # JOB 3: FastAPI Python checks
  # ─────────────────────────────────────────────────────────
  fastapi-checks:
    name: FastAPI Lint + Type Check
    runs-on: ubuntu-latest
    needs: secret-scan
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"

      - run: pip install ruff mypy pydantic fastapi

      - name: Ruff lint (Python)
        run: cd fastapi && ruff check .
        # Ruff is 10-100x faster than flake8.
        # Configured via fastapi/pyproject.toml or ruff.toml.

      - name: Mypy type check
        run: cd fastapi && mypy main.py --ignore-missing-imports
        # Type checks FastAPI routes and pipeline modules.
        # Catches Pydantic model mismatches at CI time.

  # ─────────────────────────────────────────────────────────
  # JOB 4: Database migration validation (on main branch only)
  # ─────────────────────────────────────────────────────────
  migration-check:
    name: Migration File Validation
    runs-on: ubuntu-latest
    needs: secret-scan
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Verify migration files are numbered and sequential
        run: |
          cd supabase/migrations
          # Check that migration files are sequential (no gaps)
          files=$(ls -1 *.sql 2>/dev/null | sort)
          prev_num=0
          for file in $files; do
            num=$(echo $file | grep -oP '^\d+')
            if [ "$((num - prev_num))" -ne "1" ] && [ "$prev_num" -ne "0" ]; then
              echo "::error::Gap in migration sequence at $file"
              exit 1
            fi
            prev_num=$num
          done
          echo "✅ Migration sequence is valid."
```

### 7.3 Vercel Deployment Flow

```
AUTOMATIC DEPLOYMENTS

Branch push to main:
  GitHub → Vercel webhook → production build → deploy to finsight.vercel.app
  Duration: ~2 minutes (Next.js build + static generation)
  Rollback: Vercel Dashboard → Deployments → select previous → Promote

Branch push to develop or feat/*:
  GitHub → Vercel webhook → preview build → deploy to finsight-git-<branch>.vercel.app
  Duration: ~2 minutes
  Uses: staging Supabase project (finsight-staging)
  Purpose: UI review, QA testing, PM sign-off before merge to main

PR opened/updated:
  Same as branch preview — Vercel posts preview URL as PR comment automatically

MANUAL DEPLOYMENT (emergency hotfix)
  vercel --prod --force   # Deploy current local build to production
  Use only when GitHub Actions is unavailable
```

### 7.4 Railway Deployment Flow

```yaml
# .github/workflows/deploy-fastapi.yml
name: Deploy FastAPI to Railway

on:
  push:
    branches: [main]
    paths:
      - "fastapi/**"          # Only deploy when FastAPI code changes
      - ".github/workflows/deploy-fastapi.yml"

jobs:
  deploy:
    name: Deploy to Railway
    runs-on: ubuntu-latest
    needs: []                 # Deploy independently — does not wait for Next.js checks

    steps:
      - uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy to Railway
        run: railway up --service finsight-api --detach
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        # --detach: triggers deploy and returns immediately (don't wait for build)
        # Railway builds and deploys asynchronously
        # Railway health check (GET /health) verifies successful deployment

      - name: Wait for Railway health check
        run: |
          sleep 30    # Wait for Railway to start the new container
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
            https://finsight-api.up.railway.app/health)
          if [ "$STATUS" != "200" ]; then
            echo "::error::Railway health check failed after deployment. Status: $STATUS"
            exit 1
          fi
          echo "✅ Railway deployment healthy."
```

**Railway deployment behavior:**
Railway performs a rolling deployment by default — the old container keeps serving
traffic while the new container builds. Once the new container passes its health check
(3 consecutive `GET /health` → 200), Railway routes traffic to the new container and
terminates the old one. Zero-downtime deploys out of the box.

### 7.5 Supabase Migration Flow

Database migrations are managed manually (not automated in CI). This is intentional:
database changes are irreversible and require human review.

```bash
# Migration workflow

# 1. Create migration file
touch supabase/migrations/004_add_anomaly_flag.sql

# 2. Write idempotent SQL
# Always use IF NOT EXISTS, CREATE OR REPLACE, DO $$ BEGIN ... END $$
# Never write destructive migrations without an explicit rollback file

# 3. Review locally against staging Supabase project
supabase db push --db-url $STAGING_DATABASE_URL

# 4. Verify in staging UI — check that data looks correct

# 5. Apply to production (manual step — never automated)
supabase db push --db-url $PRODUCTION_DATABASE_URL

# 6. Commit the migration file to main
git add supabase/migrations/004_add_anomaly_flag.sql
git commit -m "feat: add is_anomalous flag to transactions"
```

**Why migrations are not automated:**
An automated migration that runs on every deploy is dangerous for a production database
with real user data. A bad migration applied automatically at 3am during a routine deploy
is a data incident. The correct process is: migration reviewed by a human → applied to
staging → verified → applied to production by a human who is watching the deployment.

---

## 8. Failover Strategy

### 8.1 Failure Classification

```
TIER 1 — USER-VISIBLE FAILURE (requires immediate response)
  - Upload pipeline fails (user sees error)
  - Auth flow fails (user cannot log in)
  - Dashboard fails to load (user sees blank page or error)
  RTO target: < 30 minutes
  Notification: Uptime monitor alert → engineer on-call

TIER 2 — DEGRADED EXPERIENCE (user can continue with reduced functionality)
  - Insights generation fails (fallback text shown)
  - Decision Engine fails (panel hidden or shows stale data)
  - One AI provider down (fallback category or error state)
  RTO target: < 4 hours (non-blocking for user's core workflow)
  Notification: ai_audit_log fallback_rate spike → daily review

TIER 3 — BACKGROUND FAILURE (invisible to user)
  - Decision Engine background job fails silently
  - ai_audit_log write fails
  - Supabase Realtime disconnects
  RTO target: Next deploy cycle
  Notification: Error log review
```

### 8.2 AI Provider Failure Fallbacks

```python
# fastapi/pipeline/orchestrator.py

async def run_pipeline_with_fallbacks(
    image_base64: str,
    user_id: str,
    receipt_id: str
) -> dict:
    """
    Full pipeline with per-stage fallback logic.
    Only OCR failure is blocking — all others degrade gracefully.
    """

    # ── STAGE 1: OCR ──────────────────────────────────────────────────────
    try:
        ocr_result = await call_nvidia_ocr_with_retry(image_base64)
        ocr_validated = OCROutput(**ocr_result)

        if ocr_validated.confidence < 0.30:
            # Hard rejection — cannot proceed with unreliable data
            await mark_receipt_failed(receipt_id, "OCR_CONFIDENCE_TOO_LOW")
            raise HTTPException(status_code=422, detail={
                "error_code": "OCR_CONFIDENCE_TOO_LOW",
                "confidence": ocr_validated.confidence
            })

    except (httpx.TimeoutException, httpx.ConnectError, NVIDIAAPIError) as e:
        # Network/API failure — also blocking (cannot categorize without extraction)
        await mark_receipt_failed(receipt_id, f"OCR_API_ERROR: {type(e).__name__}")
        raise HTTPException(status_code=422, detail={
            "error_code": "OCR_API_UNAVAILABLE",
            "user_message": "Receipt processing is temporarily unavailable. Please try again."
        })

    # ── STAGE 2: CATEGORIZATION ───────────────────────────────────────────
    # Failures here are NOT blocking — default to "Other"
    try:
        merchant_history = await get_merchant_history(user_id, ocr_validated.merchant)
        cat_result = await call_groq_categorize_with_retry({...})
        cat_validated = CategorizationOutput(**cat_result)

        if cat_validated.confidence < 0.50:
            cat_validated.category = "Other"

    except Exception as e:
        # Any categorization failure: silent fallback to "Other"
        logger.log_pipeline_event(
            "categorization_fallback",
            reason=str(e),
            user_id=user_id,
            receipt_id=receipt_id
        )
        cat_validated = CategorizationOutput(
            category="Other",
            confidence=0.0,
            reasoning="api_failure_fallback"
        )
        # Log to ai_audit_log with used_fallback=True — monitored for rate spikes

    # ── STAGE 3: DB WRITE ─────────────────────────────────────────────────
    # DB write failure IS blocking — data must be persisted
    try:
        await write_transaction_to_db(...)
    except SupabaseError as e:
        # Cannot silently drop data. Return error to user.
        raise HTTPException(status_code=503, detail={
            "error_code": "DATABASE_WRITE_FAILED",
            "user_message": "We received your receipt but had trouble saving it. Please try again."
        })

    return {"status": "complete", ...}
```

### 8.3 Supabase Downtime Handling

Supabase SLA on Pro plan: 99.9% uptime = ~8.7 hours downtime/year.
Supabase SLA on Team plan: 99.99% uptime = ~52 minutes downtime/year.

**During Supabase downtime:**

| Affected Feature            | User Impact                | Mitigation                              |
|-----------------------------|----------------------------|-----------------------------------------|
| Auth / Login                | Cannot log in              | None — auth requires Supabase           |
| Upload pipeline             | Uploads fail at DB write   | User sees error, can retry after recovery|
| Dashboard load              | Data not available         | TanStack Query stale cache shows last data|
| Insights page               | Cannot refresh             | Cached data shown (30 min stale time)   |
| Receipt list                | Cannot paginate            | First page from cache                   |

**Stale cache benefit:** TanStack Query's stale-while-revalidate behavior means users
who have already loaded data see their last-fetched data during a Supabase outage.
The dashboard does not go blank — it shows cached data with a subtle staleness indicator.
This is the primary user-experience mitigation for short Supabase outages (< 5 minutes).

**Recovery procedure:**
1. Supabase status page: status.supabase.com — verify it's a Supabase incident
2. If confirmed Supabase outage: post status update to users (Phase 3 — status page)
3. No FinSight action needed — system recovers automatically when Supabase recovers
4. Failed uploads during the outage: user must re-upload (receipts in `pending` status
   for > 10 minutes are marked `failed_pipeline` by a background health job)

### 8.4 Railway Service Crash Recovery

Railway auto-restarts the FastAPI container if it crashes (configured in `railway.toml`).
Cold start time: ~10–15 seconds (Python + dependencies loading).

**During Railway cold start (10–15 seconds):**
- Vercel BFF calls to FastAPI timeout (configured: 12 second timeout on upload route)
- User sees upload error state
- Retry is safe: Supabase storage upload already succeeded; only FastAPI needs to retry

**Health check failure (3 consecutive failures → Railway restarts container):**
```python
# fastapi/main.py
@app.get("/health")
async def health_check():
    """
    Checks all three AI provider connections.
    Railway restarts the service if this returns non-200 for 3 consecutive checks.
    """
    providers = {}

    # NVIDIA NIM: lightweight connectivity check
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get("https://integrate.api.nvidia.com/v1/models")
            providers["nvidia"] = resp.status_code == 200
    except Exception:
        providers["nvidia"] = False

    # Groq: list models endpoint
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"}
            )
            providers["groq"] = resp.status_code == 200
    except Exception:
        providers["groq"] = False

    # Gemini: model info endpoint
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(
                f"https://generativelanguage.googleapis.com/v1beta/models?"
                f"key={GEMINI_API_KEY}"
            )
            providers["gemini"] = resp.status_code == 200
    except Exception:
        providers["gemini"] = False

    # Return 503 only if ALL providers are down (unlikely — different providers)
    # Individual provider failures are handled by fallback logic, not restarts
    all_healthy = all(providers.values())

    return JSONResponse(
        content={"status": "ok" if all_healthy else "degraded", "models": providers},
        status_code=200 if all_healthy else 200   # Always 200 — Railway should not restart
    )                                               # on single provider failure
```

**Important:** The `/health` endpoint returns HTTP 200 even when individual providers
are degraded. Railway should only restart the container for infrastructure failures
(out of memory, Python process crash), not for third-party API unavailability.
Provider-level failures are handled by fallback logic in the pipeline.

### 8.5 Retry Strategy Summary

```
REQUEST TYPE              RETRIES    BACKOFF           GIVE UP ACTION
──────────────────────────────────────────────────────────────────────────────────
NVIDIA NIM (OCR)          2          1s, 4s            Fail upload (blocking)
Groq (categorization)     3          0.5s, 1s, 3s      Default to "Other" (recoverable)
Gemini (insights)         3          2s, 4s, 10s       Deterministic fallback (recoverable)
Gemini (narrative)        3          2s, 4s, 10s       Deterministic fallback (recoverable)
Supabase (writes)         2          0.5s, 2s          Fail upload with 503 (blocking)
Supabase (reads)          3          0.3s, 1s, 3s      Return cached data or empty state
BFF → FastAPI             1          0s                Return error to user immediately
```

---

## 9. Cost Estimation

### 9.1 Phase 1 Cost — 0–500 Users

```
SERVICE              PLAN                 COST/MONTH    NOTES
────────────────────────────────────────────────────────────────────────────
Vercel               Hobby                $0            Sufficient for Phase 1
                                                        (10s timeout is the only risk)
Railway              Starter              $5            512MB RAM — sufficient for Phase 1
Supabase             Pro                  $25           Required for PITR + PgBouncer + SMTP
                                                        Free tier insufficient for production
GitHub               Free                 $0            Private repos, Actions minutes included
Domain (optional)    Namecheap/GoDaddy    ~$1/month     $12/year, add at Phase 2

INFRASTRUCTURE TOTAL:                    ~$31/month

AI COSTS (2,000 receipts/month):
NVIDIA NIM OCR       $0.00042/receipt     $0.84
Groq categorization  $0.00008/receipt     $0.16
Gemini insights      $0.00025/call        $0.50 (~200 insight generations)
Gemini narrative     $0.00015/call        $0.15 (~100 narrative generations)

AI TOTAL:                                ~$1.65/month

PHASE 1 TOTAL:                           ~$33/month
```

### 9.2 Phase 2 Cost — 500–2,000 Users

```
SERVICE              PLAN                 COST/MONTH    NOTES
────────────────────────────────────────────────────────────────────────────
Vercel               Pro                  $20           Required: 60s timeout for uploads
Railway              Pro                  $20           1GB RAM, dedicated CPU
Supabase             Pro                  $25           Same plan — scale within limits
Sentry               Free tier            $0            Up to 5K errors/month included
Logtail              Free tier            $0            1GB logs included
Custom domain        (already acquired)   $1

INFRASTRUCTURE TOTAL:                    ~$66/month

AI COSTS (20,000 receipts/month):
NVIDIA NIM OCR       $0.00042/receipt     $8.40
Groq categorization  $0.00008/receipt     $1.60
Gemini insights      $0.00025/call        $5.00 (~2,000 insight generations)
Gemini narrative     $0.00015/call        $3.00 (~2,000 narrative generations)

AI TOTAL:                                ~$18/month

PHASE 2 TOTAL:                           ~$84/month
Revenue at 500 Pro users × $12/month = $6,000/month MRR
Cost/revenue ratio: 1.4% — healthy
```

### 9.3 Phase 3–4 Cost — 2,000–10,000 Users

```
SERVICE              PLAN                 COST/MONTH    NOTES
────────────────────────────────────────────────────────────────────────────
Vercel               Pro                  $20           Auto-scales, no action needed
Railway              Pro × 3 instances    $60           3 workers for Phase 4 load
Supabase             Team                 $599          Required at 5,000+ users:
                                                        higher connection limits,
                                                        better SLA (99.99%)
Redis (Upstash)      Pay-per-use          $20           BullMQ queue for Phase 4
Sentry               Team ($26/month)     $26           Higher error volume
Logtail              Starter ($19/month)  $19           Structured log retention

INFRASTRUCTURE TOTAL:                    ~$744/month

AI COSTS (200,000 receipts/month — 10,000 users × 20 receipts):
NVIDIA NIM OCR       $0.00042/receipt     $84
Groq categorization  $0.00008/receipt     $16
Gemini insights      amortized            $50 (~200,000 insight generations/month)
Gemini narrative     amortized            $30

AI TOTAL:                                ~$180/month

PHASE 4 TOTAL:                           ~$924/month
Revenue at 2,000 Pro users × $12/month = $24,000/month MRR
Cost/revenue ratio: 3.8% — healthy
```

### 9.4 Cost Scaling Curve

```
Users     Receipts/mo   Infra/mo   AI/mo    Total/mo   Revenue/mo (est.)
────────────────────────────────────────────────────────────────────────────────
100       2,000         $31        $2        $33        $600
500       10,000        $66        $9        $75        $3,000
1,000     20,000        $66        $18       $84        $6,000
2,000     40,000        $66        $36       $102       $12,000
5,000     100,000       $744       $90       $834       $30,000
10,000    200,000       $744       $180      $924       $60,000

Note: Revenue assumes 50% conversion to Pro ($12/month) for 2,000+ user phases.
      Earlier phases assume lower conversion (10–20%).
      Supabase Team plan upgrade is the largest cost jump ($25 → $599).
      Schedule this upgrade at 3,000 users, not 5,000 — headroom is important.
```

### 9.5 Cost Guardrails

```python
# Mechanisms that prevent runaway AI costs

# 1. Free tier receipt limit enforced server-side
FREE_TIER_RECEIPT_LIMIT = 25
# Check: profiles.total_receipts_uploaded >= limit before upload
# 402 response if exceeded — prevents unlimited free-tier AI calls

# 2. Insight generation rate limited
INSIGHT_GENERATION_COOLDOWN_HOURS = 24
# No user can trigger more than 1 insight generation per 24 hours
# Prevents a user repeatedly clicking "Refresh Insights"

# 3. Transaction corpus cap
INSIGHT_TRANSACTION_CAP = 100
# Insight generation never sends > 100 transactions to Gemini
# Prevents token cost explosion for power users with 500+ transactions

# 4. Decision Engine only runs at Level 3+
DECISION_ENGINE_MIN_LEVEL = 3
# Background task checks intelligence_level >= 3 before running
# Saves Gemini narrative cost for users who haven't uploaded enough data

# 5. Monthly budget alert (Phase 3 — manual setup)
# NVIDIA NIM, Groq, Google Cloud: all support spend alerts via dashboard
# Set alert at 80% of monthly budget to catch unexpected spikes
```

---

## 10. Future Infrastructure

### 10.1 Redis + BullMQ — Async Upload Queue (Phase 4)

**Entry condition:** When synchronous upload processing creates measurable user-visible
latency degradation. Specific trigger: p95 upload pipeline time > 10 seconds for more
than 5% of uploads over any 1-hour window.

**Why not before Phase 4:**
The async queue changes the upload UX from "wait for result" to "queued, check back."
This is a worse user experience than synchronous processing when the pipeline is fast.
The queue exists to handle burst load — not to make every upload asynchronous.

```
PHASE 4 QUEUE ARCHITECTURE

Redis Provider: Upstash Redis (serverless, pay-per-request)
  - $0 at low volume, ~$20/month at Phase 4 queue depth
  - No Redis server to manage — Upstash handles scaling
  - Connection: REDIS_URL=redis://default:<password>@<host>.upstash.io:6379

Queue: BullMQ (npm package — used in Next.js BFF)
  - Job added to queue in: POST /api/receipts/upload
  - Job consumed by: FastAPI worker process (via Node.js bridge OR Python rq)
  
Implementation decision at Phase 4:
  Option A: BullMQ in a separate Next.js worker process (Node.js native)
  Option B: Python RQ (Redis Queue) consumed by FastAPI worker
  Recommendation: Option B — keeps the AI pipeline entirely in Python FastAPI,
                  avoids Node.js→Python worker coordination overhead.

PHASE 4 UPLOAD FLOW WITH QUEUE:
  Browser → POST /api/receipts/upload
    → Returns { receipt_id, status: "queued", queue_position: N } immediately
    → Browser subscribes to Supabase Realtime on receipts.status for receipt_id

  Python RQ worker (separate Railway service instance)
    → Dequeues job
    → Runs full pipeline (OCR → Categorize → Write)
    → Updates receipts.status to 'complete'

  Supabase Realtime → Browser
    → status changes to 'complete' → fetch results → update UI

WORKER CONFIG:
  Workers: 3 Railway instances (each runs 1 RQ worker)
  Concurrency: 1 job per worker (I/O-bound — no benefit from parallelism per worker)
  Throughput: ~9 receipts/minute (3 workers × ~3 receipts/minute each)
  Queue depth alert: > 50 jobs in queue → scale to 5 workers
```

### 10.2 Private Networking — Vercel → Railway (Phase 4)

Currently, Vercel BFF calls FastAPI over the public internet (HTTPS). The
X-Internal-Secret header is the authentication mechanism. For Phase 4:

```
PHASE 4 OPTION: Vercel Edge Config → Railway Private Service

Railway private networking: Railway Private Networking (beta as of 2024)
  - Services in the same Railway project can communicate via private IPs
  - Next.js cannot use Railway's private network (Vercel ≠ Railway)
  - Vercel → Railway will remain public internet + X-Internal-Secret

ALTERNATIVE PHASE 4 OPTION: Migrate FastAPI to Vercel
  - Vercel supports Python serverless functions (via vercel.json config)
  - FastAPI can run as a Vercel serverless function
  - This eliminates the Vercel → Railway network hop entirely
  - Limitation: Vercel serverless functions have 250MB memory limit
  - Risk: Pillow (image processing) + ML dependencies may exceed 250MB
  - Decision: Evaluate at Phase 4 when Railway costs become significant

CURRENT DECISION (Phase 1–3):
  Public internet + X-Internal-Secret is secure and sufficient.
  The secret is 64 hex characters, transmitted over HTTPS.
  An attacker who intercepts the secret gains nothing without also having
  the Supabase service role key (different secret, different transmission path).
  Private networking is a latency optimization, not a security requirement,
  at this architecture's scale.
```

### 10.3 CDN for Receipt Images (Phase 3)

```
CURRENT (Phase 1–2):
  Receipt images served via Supabase Storage signed URLs (1-hour expiry).
  Generated server-side in GET /api/receipts/[id].
  No CDN — every image request hits Supabase Storage directly.

PHASE 3 OPTION: CloudFlare R2 + CloudFlare CDN
  - Upload images to R2 (S3-compatible, $0.015/GB storage, $0 egress)
  - Serve via CloudFlare CDN (cached at edge, < 50ms delivery globally)
  - Thumbnail generation: CloudFlare Images ($5/month for 100K images)
  - Migration: change storage_path format, update signed URL generation

WHY NOT YET:
  Supabase Storage serves receipt images from ap-south-1 (Mumbai).
  For Indian users (primary audience), this is fast enough.
  The Supabase Storage transform API handles thumbnail resizing server-side.
  CloudFlare R2 adds operational complexity (second storage system) without
  meaningful benefit until user base becomes geographically distributed.

ENTRY CONDITION: When > 20% of users are outside India, or when Supabase
  Storage egress costs exceed $50/month.
```

### 10.4 Database Read Replica (Phase 4)

```sql
-- Phase 4: Supabase read replica for analytics workloads
-- Supabase Team plan includes 1 read replica in a different region.

USE CASE:
  Analytics queries (dashboard aggregations, insights generation input)
  are read-heavy and can run slightly stale (1–5 second lag is acceptable).
  Moving these to a read replica reduces load on the primary.

ROUTING:
  Writes (INSERT, UPDATE, DELETE): primary (ap-south-1)
  Dashboard summary: read replica
  Insights transaction fetch: read replica
  Receipt list: read replica (paginated, no real-time requirement)
  Auth: primary (sessions must be current)
  Decision Engine writes: primary

IMPLEMENTATION IN SUPABASE-PY:
  # Two clients — one for reads, one for writes
  supabase_primary = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  supabase_replica = create_client(SUPABASE_REPLICA_URL, SUPABASE_SERVICE_ROLE_KEY)
```

---

## APPENDIX A — Pre-Launch Checklist

```
VERCEL CONFIGURATION
□ NEXT_PUBLIC_APP_URL set to production domain (not vercel.app subdomain)
□ SUPABASE_SERVICE_ROLE_KEY set in Vercel (server-only, never NEXT_PUBLIC_)
□ FASTAPI_INTERNAL_URL points to production Railway service URL
□ FASTAPI_SECRET_KEY set — matches Railway exactly
□ Vercel plan upgraded to Pro (60s timeout required)
□ Preview deployment environment points to staging Supabase project

RAILWAY CONFIGURATION
□ ALLOWED_ORIGINS set to production Vercel URL (NOT localhost:3000)
□ All AI API keys set: NVIDIA_NIM_API_KEY, GROQ_API_KEY, GEMINI_API_KEY
□ FASTAPI_SECRET_KEY matches Vercel exactly
□ ENVIRONMENT=production
□ Memory allocation: 1GB minimum
□ Health check configured: GET /health, timeout 30s

SUPABASE CONFIGURATION
□ Region: ap-south-1 — verify before creating project (cannot change after)
□ Auth Site URL: set to production domain
□ Auth Redirect URLs: include production domain
□ SMTP: custom SMTP configured (not Supabase default)
□ PITR: enabled (Pro plan required)
□ RLS: enabled on all 5 tables — verify with test queries
□ Storage bucket: receipts — private (not public)
□ Storage bucket policies: user can only read/write own receipts

SECURITY
□ Secret scan passes: grep finds zero results in src/
□ No .env files in repository (check with: find . -name ".env" | grep -v node_modules)
□ Pre-deploy-audit.sh runs clean
□ GitHub Actions CI passes all jobs on main branch

DNS & DOMAIN (Phase 2+)
□ Custom domain added to Vercel project
□ DNS A record points to Vercel edge
□ HTTPS certificate auto-provisioned by Vercel
□ NEXT_PUBLIC_APP_URL updated to custom domain
□ ALLOWED_ORIGINS in Railway updated to custom domain
□ Supabase Auth redirect URLs updated to custom domain

MONITORING
□ Uptime monitor configured for /health endpoint
□ Uptime monitor configured for frontend URL
□ Railway health check active
□ Supabase dashboard bookmarked — check logs within 24h of launch
```

## APPENDIX B — Incident Response

```
P0 — FULL OUTAGE (all users affected, uploads/auth broken)
  1. Check Railway health endpoint: GET /health
  2. Check Supabase status: status.supabase.com
  3. Check Vercel status: vercel-status.com
  4. Check AI provider status: status.nvidia.com / groq.com/status / status.cloud.google.com
  5. Identify failed layer → deploy fix or wait for provider recovery
  6. Railway service restart: railway restart --service finsight-api
  Estimated resolution: 15–60 minutes

P1 — PARTIAL OUTAGE (uploads failing, dashboard works)
  1. Check FastAPI /health response body — which provider failed?
  2. If single AI provider: fallback logic should handle gracefully
  3. If Railway is down: check Railway dashboard → restart if needed
  4. If all AI providers degraded: post status to users
  Estimated resolution: 30 minutes – 4 hours

P2 — DEGRADED (insights/narrative unavailable, uploads work)
  1. Check ai_audit_log fallback_rate for gemini stage
  2. If Gemini API down: deterministic fallback is serving users
  3. No immediate action needed — monitor for recovery
  4. Inform users only if degradation > 24 hours
  Estimated resolution: Depends on Gemini SLA

DATA INCIDENT (suspected data exposure or corruption)
  1. Immediately: rotate all AI API keys and FASTAPI_SECRET_KEY
  2. Check ai_audit_log for unusual call patterns
  3. Check Supabase audit log for unusual query patterns
  4. Assess scope: which tables, which users, what data
  5. Notify affected users per GDPR/IT Act requirements
  6. Document incident in post-mortem

  ## Observability Dashboard (Phase 3+)

- Central dashboard (Grafana / Logtail / Supabase queries)

Track:
- Upload success rate
- OCR failure rate
- Category fallback %
- Avg pipeline latency
- Active users per day

Purpose:
- detect system degradation early
- product decisions based on real usage
```

---

*End of FinSight INFRA.md v1.0.0*
*This document governs all infrastructure decisions for FinSight.*
*Deployment decisions: TECH_STACK.md v2.0 · AI decisions: AI_STACK.md v1.0*
*Prompt decisions: PROMPT_STRATEGY.md v1.0*
*Infrastructure decisions documented here are binding.*
*Deviations require explicit DevOps Architecture approval.*
