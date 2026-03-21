# FINSIGHT — V1_EXECUTION_TASKS.md
## Project Orchestration: Build V1 Step-by-Step

```
Role:       Project Orchestrator + Build Guide
Purpose:    Zero-confusion execution from empty folder to working pipeline
Audience:   You (builder) · Kiro (AI coder) · Claude (mentor)
Philosophy: One task. Verify. Next task. Never skip. Never combine.
```

---

👉 **Let's start building FinSight V1 step-by-step.**

---

## HOW THIS DOCUMENT WORKS

**You (the builder)** — Read the Context for each task. Understand what
you're building and why. Give Kiro only the prompt and docs listed.
After Kiro delivers: run the verification check before moving on.

**Kiro (the coder)** — You receive one prompt at a time. Each prompt
is completely self-contained. Do not build ahead. Do not add features
not in the prompt. Stop when the prompt ends.

**Claude (the mentor)** — If something breaks or a decision is unclear,
describe the exact symptom and which task number you're on. Claude will
diagnose without changing the plan.

---

## THE V1 GOAL (in plain English)

V1 is done when this works with real data — no mocks, no hardcoding:
> You photograph a receipt → upload it → FinSight reads the text,
> assigns a category, saves it → you see it on your dashboard.

That's it. Everything in this document exists to make that one thing work.

---

## PHASE MAP — V1 IN CONTEXT

```
V1 (THIS DOC)   Core Pipeline: Upload → OCR → Categorize → DB → Dashboard
V2 (LATER)      Product Layer: Insights, corrections, email digest, referrals
V3 (LATER)      Decision Engine: Subscriptions, forecast, budget alerts, tax
V4 (LATER)      Scaling: Async queue, Redis, materialized views
V5 (LATER)      Advanced AI: Spending Coach, vector search, team workspace
```

Do not think about V2–V5 while building V1.
They depend on V1 working. V1 does not depend on them.

---

## PROJECT FOLDER STRUCTURE

Set this up before Task 1. Every path in every prompt assumes this structure.

```
finsight/                              ← root git repository
│
├── src/                               ← Next.js app (Vercel)
│   ├── app/
│   │   ├── (auth)/auth/page.tsx       ← login + signup
│   │   ├── (dashboard)/dashboard/
│   │   │   └── page.tsx               ← main dashboard
│   │   ├── api/
│   │   │   ├── auth/callback/route.ts ← OAuth handler
│   │   │   ├── receipts/upload/route.ts
│   │   │   └── dashboard/summary/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx                   ← redirect to /dashboard
│   ├── components/
│   │   ├── ui/                        ← shadcn copied here
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── dashboard/
│   │   │   ├── KPICard.tsx
│   │   │   ├── IntelligenceMeter.tsx
│   │   │   └── TransactionFeed.tsx
│   │   └── upload/
│   │       └── UploadModal.tsx
│   ├── hooks/
│   │   ├── useUser.ts
│   │   └── useIntelligenceLevel.ts
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              ← browser Supabase client
│   │   │   └── server.ts              ← server Supabase client
│   │   └── utils.ts
│   └── types/api.ts                   ← shared API response types
│
├── fastapi/                           ← Python AI service (Railway)
│   ├── main.py                        ← FastAPI app + all routes
│   ├── config.py                      ← env var loading
│   ├── models/
│   │   ├── ocr.py                     ← OCROutput Pydantic model
│   │   └── categorization.py          ← CategorizationOutput model
│   ├── ai_clients/
│   │   ├── nvidia_nim.py              ← NVIDIA NIM OCR client
│   │   └── groq_client.py             ← Groq categorization client
│   ├── pipeline/
│   │   └── orchestrator.py            ← the full pipeline logic
│   ├── db/
│   │   └── supabase_client.py         ← service role DB client
│   ├── prompts/
│   │   ├── ocr_v1.py
│   │   └── categorization_v1.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env                           ← NEVER committed to Git
│
├── supabase/
│   └── migrations/                    ← SQL files run in Supabase SQL Editor
│       ├── 001_profiles.sql
│       ├── 002_receipts.sql
│       ├── 003_transactions.sql
│       ├── 004_insights_and_decisions.sql
│       ├── 005_rls_policies.sql
│       └── 006_indexes.sql
│
├── .github/workflows/ci.yml           ← secret scan CI job
├── scripts/pre-deploy-audit.sh
├── .gitignore
├── .env.local                         ← NEVER committed to Git
├── railway.toml
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## ENVIRONMENT VARIABLES

Create these two files before any code runs. **Never commit either to Git.**

```bash
# .env.local  (Next.js — your laptop + Vercel dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
FASTAPI_INTERNAL_URL=http://localhost:8000
FASTAPI_SECRET_KEY=any-string-for-local-dev-change-in-production
```

```bash
# fastapi/.env  (Python — your laptop + Railway dashboard)
NVIDIA_NIM_API_KEY=nvapi-...
GROQ_API_KEY=gsk_...
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
FASTAPI_SECRET_KEY=any-string-for-local-dev-change-in-production
ALLOWED_ORIGINS=http://localhost:3000
ENVIRONMENT=development
```

Your `.gitignore` must include:
```
.env
.env.local
.env.production
fastapi/.env
node_modules/
__pycache__/
.next/
```

---

## GIT STRATEGY

```
Branches:
  main        → always working, never broken
  develop     → integration branch
  feat/task-N → one branch per task

Workflow per task:
  git checkout develop
  git checkout -b feat/task-07-fastapi-skeleton
  [work + verify]
  git add .
  git commit -m "feat: FastAPI skeleton with health endpoint"
  git checkout develop
  git merge feat/task-07-fastapi-skeleton

Rule: Never commit to main directly.
Rule: Each task gets its own branch.
Rule: Only merge after the verification check passes.
```

---

## TASK DEPENDENCY MAP

```
Tasks 01–02 (Supabase setup) ─────────────────────────────────────────────┐
Tasks 03–06 (Next.js + Auth) ──────────────────────────────────────────────┤
Tasks 07–08 (FastAPI skeleton) ─────────────────────────────────────────────┤
                                                                            ▼
Tasks 09–14 (AI pipeline: OCR + Categorize + DB + Endpoint) ───────────────┤
                                                                            ▼
Task 15 (Next.js upload BFF) ──────────────────────────────────────────────┤
                                                                            ▼
Tasks 16–21 (Frontend: Upload Modal + Dashboard) ──────────────────────────┤
                                                                            ▼
Tasks 22–24 (Integration test + Deploy) ───────────────────────────────────┘
```

---

## TASK 00 — PROJECT BOOTSTRAP (FIRST THING KIRO DOES)

**Owner:** Kiro
**Time:** 45 minutes
**Depends on:** Your API keys being ready in the env files

### Context
This is the bootstrap task. Kiro creates the entire empty skeleton — all
folders, all blank files, all config. No logic. No AI. No DB. Just scaffolding.
After this task, `npm run dev` works and `python main.py` starts without errors.

### Docs to Give Kiro
- Nothing. This task needs no docs. Just the prompt below.

### Docs NOT to Give Kiro
All of them. This is structure only.

---

### 🤖 KIRO PROMPT — TASK 00: PROJECT BOOTSTRAP

```
You are setting up the FinSight project from scratch.
This is a bootstrap task — create folders and base files only.
No AI logic. No database queries. No advanced features.

PART 1: NEXT.JS SETUP

Run these commands:
  npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir
  (say NO to: import alias customization)

Then install these packages:
  npm install @supabase/supabase-js @supabase/ssr
  npm install @tanstack/react-query @tanstack/react-query-devtools
  npm install framer-motion
  npm install lucide-react
  npm install class-variance-authority clsx tailwind-merge
  npm install react-hook-form @hookform/resolvers zod

Initialize shadcn/ui:
  npx shadcn@latest init
  (choose: New York style, zinc base color, CSS variables: yes)

Add these shadcn components:
  npx shadcn@latest add button input label dialog toast badge
  npx shadcn@latest add tooltip progress select sheet tabs

PART 2: CREATE THESE FILES WITH THEIR EXACT CONTENT

FILE: tailwind.config.ts
(extend the default config to add FinSight colors)

Add inside the `extend` block:
  colors: {
    brand: {
      bg: '#0D0F1A',
      amber: '#FFD166',
      surface: 'rgba(255,255,255,0.04)',
    }
  },
  fontFamily: {
    sans: ['Inter', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },

FILE: src/lib/supabase/client.ts
(browser Supabase client for use in React components)

  'use client'
  import { createBrowserClient } from '@supabase/ssr'

  export function createClient() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

FILE: src/lib/supabase/server.ts
(server-side Supabase client for use in API routes and Server Components)

  import { createServerClient } from '@supabase/ssr'
  import { cookies } from 'next/headers'

  export function createSupabaseServerClient() {
    const cookieStore = cookies()
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
  }

FILE: src/lib/utils.ts
  import { type ClassValue, clsx } from 'clsx'
  import { twMerge } from 'tailwind-merge'

  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
  }

FILE: src/types/api.ts
(empty interfaces — filled in later per task)

  export interface DashboardSummary {
    total_spend: number
    transaction_count: number
    top_category: string
    top_category_amount: number
    intelligence_level: number
    total_receipts_uploaded: number
  }

  export interface UploadResult {
    status: string
    extraction: {
      merchant: string | null
      amount: number | null
      currency: string | null
      date: string | null
      confidence: number
    }
    categorization: {
      category: string
      confidence: number
    }
  }

FILE: src/hooks/useUser.ts
  'use client'
  import { createClient } from '@/lib/supabase/client'
  import { useEffect, useState } from 'react'

  export function useUser() {
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const supabase = createClient()

    useEffect(() => {
      supabase.auth.getUser().then(({ data }) => setUser(data.user))
    }, [])

    return { user, profile }
  }

FILE: src/hooks/useIntelligenceLevel.ts
  export function getIntelligenceLevel(totalReceipts: number): number {
    if (totalReceipts >= 10) return 4
    if (totalReceipts >= 6)  return 3
    if (totalReceipts >= 3)  return 2
    return 1
  }

  export function useIntelligenceLevel(totalReceipts: number) {
    return getIntelligenceLevel(totalReceipts)
  }

FILE: src/app/layout.tsx
  import type { Metadata } from 'next'
  import { Inter } from 'next/font/google'
  import './globals.css'

  const inter = Inter({ subsets: ['latin'] })

  export const metadata: Metadata = {
    title: 'FinSight — Financial Decision Engine',
    description: 'AI-powered financial intelligence',
  }

  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="en">
        <body className={`${inter.className} bg-[#0D0F1A] text-white min-h-screen`}>
          {children}
        </body>
      </html>
    )
  }

FILE: src/app/page.tsx
  import { redirect } from 'next/navigation'
  export default function HomePage() {
    redirect('/dashboard')
  }

FILE: src/app/(auth)/auth/page.tsx
  export default function AuthPage() {
    return (
      <div className="min-h-screen bg-[#0D0F1A] flex items-center justify-center">
        <p className="text-white">Auth Page — Coming in Task 05</p>
      </div>
    )
  }

FILE: src/app/(dashboard)/dashboard/page.tsx
  export default function DashboardPage() {
    return (
      <div className="min-h-screen bg-[#0D0F1A] p-8">
        <p className="text-white text-2xl">Dashboard — Coming in Task 19</p>
      </div>
    )
  }

FILE: src/app/api/auth/callback/route.ts
  export async function GET() {
    return new Response('Auth callback — Coming in Task 06', { status: 200 })
  }

FILE: src/app/api/receipts/upload/route.ts
  export async function POST() {
    return new Response('Upload route — Coming in Task 15', { status: 200 })
  }

FILE: src/app/api/dashboard/summary/route.ts
  export async function GET() {
    return new Response('Dashboard summary — Coming in Task 17', { status: 200 })
  }

PART 3: FASTAPI SETUP

Create the fastapi/ directory with this structure:

FILE: fastapi/requirements.txt
  fastapi==0.111.0
  uvicorn==0.29.0
  python-dotenv==1.0.1
  pydantic==2.7.0
  httpx==0.27.0
  supabase==2.4.2
  Pillow==10.3.0
  openai==1.30.0
  groq==0.9.0
  google-generativeai==0.7.0
  tenacity==8.3.0
  python-multipart==0.0.9

FILE: fastapi/config.py
  from dotenv import load_dotenv
  import os

  load_dotenv()

  NVIDIA_NIM_API_KEY = os.environ["NVIDIA_NIM_API_KEY"]
  GROQ_API_KEY       = os.environ["GROQ_API_KEY"]
  SUPABASE_URL       = os.environ["SUPABASE_URL"]
  SUPABASE_KEY       = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
  FASTAPI_SECRET_KEY = os.environ["FASTAPI_SECRET_KEY"]
  ALLOWED_ORIGINS    = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
  ENVIRONMENT        = os.environ.get("ENVIRONMENT", "development")

FILE: fastapi/main.py
  from fastapi import FastAPI
  from fastapi.middleware.cors import CORSMiddleware
  from config import ALLOWED_ORIGINS

  app = FastAPI(title="FinSight AI Service", version="1.0.0")

  app.add_middleware(
      CORSMiddleware,
      allow_origins=ALLOWED_ORIGINS,
      allow_credentials=False,
      allow_methods=["POST", "GET"],
      allow_headers=["Content-Type", "X-Internal-Secret"],
      max_age=3600,
  )

  @app.get("/health")
  async def health():
      return {"status": "ok", "message": "FinSight AI service is running"}

FILE: fastapi/models/ocr.py      (empty file, filled in Task 09)
FILE: fastapi/models/categorization.py  (empty file, filled in Task 11)
FILE: fastapi/ai_clients/nvidia_nim.py  (empty file, filled in Task 09)
FILE: fastapi/ai_clients/groq_client.py (empty file, filled in Task 11)
FILE: fastapi/pipeline/orchestrator.py  (empty file, filled in Task 13)
FILE: fastapi/db/supabase_client.py     (empty file, filled in Task 13)
FILE: fastapi/prompts/ocr_v1.py         (empty file, filled in Task 09)
FILE: fastapi/prompts/categorization_v1.py (empty file, filled in Task 11)

FILE: fastapi/Dockerfile
  FROM python:3.11-slim
  WORKDIR /app
  RUN apt-get update && apt-get install -y libpq-dev libjpeg-dev libpng-dev gcc && rm -rf /var/lib/apt/lists/*
  COPY requirements.txt .
  RUN pip install --no-cache-dir -r requirements.txt
  COPY . .
  CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

FILE: railway.toml
  [build]
  dockerfilePath = "fastapi/Dockerfile"

  [deploy]
  healthcheckPath = "/health"
  healthcheckTimeout = 30
  restartPolicyType = "on_failure"
  restartPolicyMaxRetries = 3

PART 4: CI AND SCRIPTS

FILE: .github/workflows/ci.yml
  name: FinSight CI
  on:
    push:
      branches: [main, develop]
    pull_request:
      branches: [main]
  jobs:
    secret-scan:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - name: Scan for exposed secrets
          run: |
            if grep -rn "nvapi-\|gsk_\|AIza\|service_role" --include="*.ts" --include="*.tsx" src/; then
              echo "SECRET FOUND IN FRONTEND — BLOCKED"
              exit 1
            fi
            echo "Secret scan passed"
    type-check:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: '20' }
        - run: npm ci && npx tsc --noEmit

STOP HERE. This is everything for Task 00.
Output the complete file tree when done.
```

---

### ✅ VERIFY TASK 00 BEFORE PROCEEDING

```
□ npm run dev compiles without TypeScript errors
□ Browser shows /dashboard page (with placeholder text)
□ Browser shows /auth page (with placeholder text)
□ cd fastapi && pip install -r requirements.txt runs cleanly
□ cd fastapi && uvicorn main:app --reload starts without errors
□ GET http://localhost:8000/health returns {"status":"ok",...}
□ .gitignore contains .env.local and fastapi/.env
□ No .env files visible in git status
```

---

## TASK 01 — Supabase Project Setup

**Owner:** You (manual — Kiro cannot do this)
**Time:** 1–2 hours
**Depends on:** Nothing

### Context
Supabase is your database, auth, and file storage. This is all manual
configuration in the Supabase dashboard. Every API key used in every
task comes from here.

### Steps (in order)

1. Go to supabase.com → New project
2. **Region: ap-south-1 (Mumbai). CANNOT be changed after creation.**
3. Settings → API → copy three values into your env files:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (NEVER prefix with NEXT_PUBLIC_)
4. Authentication → URL Configuration:
   - Site URL: `http://localhost:3000`
   - Add to Redirect URLs: `http://localhost:3000/api/auth/callback`
5. Authentication → Providers → Enable Google
   (needs a Google Cloud OAuth 2.0 client ID and secret)
6. Storage → Create bucket named `receipts` → Access: **Private**
7. Upgrade to Supabase Pro ($25/month) — required for PgBouncer + PITR

### No Kiro prompt. This is manual only.

### ✅ VERIFY TASK 01
```
□ Project created in ap-south-1 (check: Settings → General → Region)
□ All 3 keys copied to .env.local and fastapi/.env
□ receipts bucket exists and shows "Private" in Storage tab
□ Redirect URL set in Auth settings
□ Pro plan active (Settings → Billing)
```

---

## TASK 02 — Database Schema + RLS

**Owner:** You (manual SQL in Supabase SQL Editor)
**Time:** 1 hour
**Depends on:** Task 01

### Context
You're creating the 5 tables that are FinSight's permanent data layer.
Getting RLS right here is critical — it ensures users can only see their own data.
Save each SQL block as a file in `supabase/migrations/` as you run it.

### Docs to Reference (you only — not Kiro)
- `TECH_STACK.md` → Section 4.2 (Schema Design), Section 4.4 (RLS Policies)

### Run in Supabase SQL Editor (in this exact order)

**`001_profiles.sql`:**
```sql
CREATE TABLE public.profiles (
  id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name               TEXT,
  currency_preference     VARCHAR(3)  DEFAULT 'INR',
  intelligence_level      INTEGER     DEFAULT 1,
  total_receipts_uploaded INTEGER     DEFAULT 0,
  subscription_tier       VARCHAR(10) DEFAULT 'free',
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

**`002_receipts.sql`:**
```sql
CREATE TABLE public.receipts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path     TEXT        NOT NULL,
  status           VARCHAR(20) DEFAULT 'pending',
  processing_error TEXT,
  uploaded_at      TIMESTAMPTZ DEFAULT NOW(),
  processed_at     TIMESTAMPTZ,
  ocr_confidence   NUMERIC(4,3),
  ai_model_used    VARCHAR(30),
  gemini_response  JSONB
);
```

**`003_transactions.sql`:**
```sql
CREATE TABLE public.transactions (
  id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID           NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receipt_id            UUID           REFERENCES public.receipts(id) ON DELETE SET NULL,
  merchant              TEXT,
  amount                NUMERIC(12, 2) NOT NULL,
  currency              VARCHAR(3)     DEFAULT 'INR',
  transaction_date      DATE           NOT NULL,
  category              VARCHAR(50)    NOT NULL,
  confidence            NUMERIC(4, 3),
  categorization_model  VARCHAR(30),
  is_business_expense   BOOLEAN        DEFAULT FALSE,
  is_manually_corrected BOOLEAN        DEFAULT FALSE,
  is_anomalous          BOOLEAN        DEFAULT FALSE,
  is_subscription       BOOLEAN        DEFAULT FALSE,
  user_note             TEXT,
  created_at            TIMESTAMPTZ    DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION increment_receipt_count(user_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET
    total_receipts_uploaded = total_receipts_uploaded + 1,
    intelligence_level = CASE
      WHEN total_receipts_uploaded + 1 >= 10 THEN 4
      WHEN total_receipts_uploaded + 1 >= 6  THEN 3
      WHEN total_receipts_uploaded + 1 >= 3  THEN 2
      ELSE 1
    END,
    updated_at = NOW()
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**`004_insights_and_decisions.sql`:**
```sql
CREATE TABLE public.insights (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  generated_at      TIMESTAMPTZ DEFAULT NOW(),
  time_range        VARCHAR(10) DEFAULT '30d',
  insight_texts     JSONB       NOT NULL,
  health_score      INTEGER,
  score_breakdown   JSONB,
  recommendations   JSONB,
  transaction_count INTEGER,
  generation_model  VARCHAR(30)
);

CREATE TABLE public.decision_engine_outputs (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  computed_at              TIMESTAMPTZ DEFAULT NOW(),
  estimated_tax_liability  NUMERIC(12, 2),
  detected_subscriptions   JSONB,
  leakage_signals          JSONB,
  decision_narrative       TEXT,
  is_current               BOOLEAN DEFAULT TRUE
);
```

**`005_rls_policies.sql`:**
```sql
ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_engine_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_own" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "receipts_own" ON public.receipts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_own" ON public.transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "insights_read_own" ON public.insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "decisions_read_own" ON public.decision_engine_outputs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "storage_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "storage_read_own" ON storage.objects
  FOR SELECT USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "storage_delete_own" ON storage.objects
  FOR DELETE USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**`006_indexes.sql`:**
```sql
CREATE INDEX CONCURRENTLY idx_transactions_user_date     ON transactions(user_id, transaction_date DESC);
CREATE INDEX CONCURRENTLY idx_transactions_user_category ON transactions(user_id, category);
CREATE INDEX CONCURRENTLY idx_receipts_user_status       ON receipts(user_id, status);
CREATE INDEX CONCURRENTLY idx_receipts_user_uploaded     ON receipts(user_id, uploaded_at DESC);
```

### ✅ VERIFY TASK 02
```
□ 5 tables visible in Supabase Table Editor
□ RLS shows "Enabled" on all 5 tables
□ Run in SQL Editor → should return 0 rows with no error:
    SET LOCAL role authenticated;
    SELECT * FROM transactions;
□ increment_receipt_count function visible in Database → Functions
□ All 4 indexes visible in Database → Indexes
□ Storage policies visible in Storage → Policies
```

---

## TASK 03 — Authentication Page

**Owner:** Kiro
**Time:** 1 hour
**Depends on:** Task 00

### Docs to Give Kiro
Extract and give only these sections:
- `UI Generator Spec` → §1 (Design Identity Brief — colors and fonts only)

### Docs NOT to Give Kiro
Everything else. No TECH_STACK, no AI_STACK, no SECURITY.

---

### 🤖 KIRO PROMPT — TASK 03: AUTH PAGE

```
Build the authentication page for FinSight.

FILE: src/app/(auth)/auth/page.tsx
Replace the placeholder with this full implementation.

DESIGN: Background #0D0F1A, accent color #FFD166 (amber), Inter font.

DEPENDENCIES YOU HAVE:
- createClient from '@/lib/supabase/client'
- shadcn: Button, Input, Label, Tabs, TabsList, TabsTrigger, TabsContent
- react-hook-form with zod validation
- next/navigation useRouter

THE PAGE HAS TWO SECTIONS:

SECTION 1 — Header:
  - "FinSight" text in amber (#FFD166), large, centered
  - Subtitle: "Your Financial Decision Engine" in muted white

SECTION 2 — Auth card (centered, max-w-md, glassmorphism):
  - Background: rgba(255,255,255,0.04) with border rgba(255,255,255,0.08)
  - Rounded-xl, padding 32px

  TWO TABS using shadcn Tabs: "Sign In" | "Sign Up"

  SIGN IN TAB:
    Form fields:
      - Email (type="email", required)
      - Password (type="password", required, min 6)
    Buttons:
      - "Sign In" button (full width, amber background #FFD166, black text)
      - "Continue with Google" button (full width, outlined, white text)
    On sign in submit:
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) show error message
      else router.push('/dashboard')
    On Google click:
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/api/auth/callback` }
      })

  SIGN UP TAB:
    Form fields:
      - Full Name (required)
      - Email (type="email", required)
      - Password (type="password", required, min 8)
    Button:
      - "Create Account" button (full width, amber background)
    On submit:
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName } }
      })
      if (error) show error message
      else show success: "Check your email to confirm your account"

    After success message: show "Continue with Google" button too

VALIDATION (using zod):
  Sign in: email must be valid email, password min 6 chars
  Sign up: name required, email valid, password min 8 chars

ERROR DISPLAY: Show error text in red below the form, not in an alert box.

USE 'use client' directive at top.
USE createClient() from '@/lib/supabase/client'.

OUTPUT: Complete auth page file.
STOP. Do not touch any other files.
```

---

### ✅ VERIFY TASK 03
```
□ Page renders at localhost:3000/auth
□ Both tabs work (Sign In / Sign Up)
□ Form validation shows errors for invalid inputs
□ No TypeScript errors (npx tsc --noEmit)
□ Sign up form shows "check your email" message on success
```

---

## TASK 04 — Auth Callback Route

**Owner:** You
**Time:** 20 minutes
**Depends on:** Tasks 01, 03

### Context
When Google OAuth completes, Google redirects to this route with `?code=`.
This route exchanges the code for a session and sets the auth cookies.
This must be written by you because it uses the server-side Supabase client.

### File to Write

`src/app/api/auth/callback/route.ts`:

```typescript
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }
  return NextResponse.redirect(`${origin}/auth?error=oauth_failed`)
}
```

### ✅ VERIFY TASK 04
```
□ Google OAuth button in /auth takes you to Google's login page
□ After Google login: redirected to /dashboard (placeholder is fine)
□ Email signup → "check your email" message appears
□ No TypeScript errors
```

---

## TASK 05 — X-Internal-Secret Middleware (FastAPI)

**Owner:** You
**Time:** 30 minutes
**Depends on:** Task 00

### Context
FastAPI lives on the public internet. Anyone can hit it.
The X-Internal-Secret header is the only way FastAPI knows the request
came from Next.js and not from a random attacker trying to trigger
expensive AI calls. This middleware runs before every route.

### File to Write

`fastapi/middleware.py`:

```python
import os
import secrets
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

FASTAPI_SECRET_KEY = os.environ["FASTAPI_SECRET_KEY"]
EXCLUDED_PATHS = {"/health"}

class InternalSecretMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in EXCLUDED_PATHS:
            return await call_next(request)

        provided = request.headers.get("X-Internal-Secret", "")
        if not secrets.compare_digest(
            provided.encode("utf-8"),
            FASTAPI_SECRET_KEY.encode("utf-8")
        ):
            raise HTTPException(status_code=401, detail="Unauthorized")

        return await call_next(request)
```

Add to `fastapi/main.py` (add these lines after the CORSMiddleware):
```python
from middleware import InternalSecretMiddleware
app.add_middleware(InternalSecretMiddleware)
```

### ✅ VERIFY TASK 05
```
□ GET http://localhost:8000/health still returns 200 (excluded path)
□ POST http://localhost:8000/any-route WITHOUT the header returns 401
□ POST http://localhost:8000/any-route WITH correct header passes through
    (test with: curl -X POST http://localhost:8000/test -H "X-Internal-Secret: your-secret")
```

---

## TASK 06 — NVIDIA NIM OCR Client

**Owner:** You
**Time:** 1 hour
**Depends on:** Task 05

### Context
This is the function that reads a receipt image and extracts the financial data.
It sends the base64 image to NVIDIA NIM's Llama 3.2 90B Vision model.
The prompt tells the model exactly what to extract and what format to return.

### Docs to Reference
- `TECH_STACK.md` → Section 6.1 (OCR Layer — NVIDIA NIM) — the exact code is there
- `PROMPT_STRATEGY.md` → Section 2.2 (OCR Prompt)

### Files to Write

`fastapi/prompts/ocr_v1.py`:
```python
OCR_EXTRACTION_PROMPT = """
Analyze this receipt image. Extract structured data and return ONLY a valid JSON object.
No explanation. No markdown. No code blocks.

Required fields (return null for fields you cannot determine with confidence):
{
  "merchant": "exact name as printed on receipt — null if unreadable",
  "total_amount": "final amount paid as number only, no currency symbol — null if absent or ambiguous",
  "currency": "ISO 4217 code inferred from symbols — default INR",
  "date": "YYYY-MM-DD format — null if absent or unreadable",
  "raw_confidence": "float 0.0-1.0 — your confidence in extraction accuracy"
}

Rules:
- Return null for uncertain fields rather than guessing
- total_amount is the GRAND TOTAL (after tax, after discounts)
- For Indian receipts with DD/MM/YYYY dates, convert to YYYY-MM-DD
- raw_confidence below 0.30 indicates the receipt should not be processed
"""
```

`fastapi/models/ocr.py`:
```python
from pydantic import BaseModel, validator, Field
from typing import Optional, Literal
import re

class OCROutput(BaseModel):
    merchant:       Optional[str]   = None
    total_amount:   Optional[float] = None
    currency:       Optional[Literal["INR","USD","EUR","GBP","SGD","AED","OTHER"]] = None
    date:           Optional[str]   = None
    raw_confidence: float           = Field(ge=0.0, le=1.0)

    @validator("total_amount")
    def amount_not_negative(cls, v):
        if v is not None and v < 0:
            raise ValueError("Amount cannot be negative")
        return v

    @validator("date")
    def date_is_iso(cls, v):
        if v is not None and not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
            raise ValueError("Date must be YYYY-MM-DD")
        return v
```

`fastapi/ai_clients/nvidia_nim.py`:
```python
import json, os
from openai import AsyncOpenAI
from prompts.ocr_v1 import OCR_EXTRACTION_PROMPT
from models.ocr import OCROutput

nim_client = AsyncOpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.environ["NVIDIA_NIM_API_KEY"],
)

async def extract_receipt(image_base64: str) -> OCROutput:
    response = await nim_client.chat.completions.create(
        model="meta/llama-3.2-90b-vision-instruct",
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": { "url": f"data:image/jpeg;base64,{image_base64}" }
                },
                { "type": "text", "text": OCR_EXTRACTION_PROMPT }
            ]
        }],
        temperature=0.0,
        max_tokens=512,
        response_format={"type": "json_object"},
        timeout=12.0,
    )
    raw = json.loads(response.choices[0].message.content)
    # Rename total_amount → amount for consistency
    if "total_amount" in raw:
        raw["amount"] = raw.pop("total_amount")
    return OCROutput(**raw)
```

### ✅ VERIFY TASK 06
```
Test manually from the fastapi/ directory:
  python -c "
  import asyncio, base64
  from ai_clients.nvidia_nim import extract_receipt

  # Use any receipt photo you have
  with open('test_receipt.jpg', 'rb') as f:
      b64 = base64.b64encode(f.read()).decode()

  result = asyncio.run(extract_receipt(b64))
  print(result)
  "

□ Returns an OCROutput object with merchant, amount, date, confidence
□ confidence > 0.30 for a clear receipt photo
□ confidence < 0.30 for a very blurry or non-receipt image
□ No Python exceptions
```

---

## TASK 07 — Groq Categorization Client

**Owner:** You
**Time:** 45 minutes
**Depends on:** Task 05

### Context
After OCR extracts the merchant name and amount, Groq decides which of
12 categories this transaction belongs to. It runs in ~250ms — fast
because the user is waiting for the result.

### Docs to Reference
- `TECH_STACK.md` → Section 6.2 (Categorization Layer — Groq)
- `PROMPT_STRATEGY.md` → Section 3.3 (Categorization Prompt)

### Files to Write

`fastapi/prompts/categorization_v1.py`:
```python
VALID_CATEGORIES = [
    "Food & Dining", "Groceries", "Transportation", "Shopping & Retail",
    "Entertainment & Leisure", "Health & Medical", "Travel & Accommodation",
    "Utilities & Bills", "Software & Subscriptions", "Business & Professional",
    "Education", "Other"
]

CATEGORIZATION_SYSTEM_PROMPT = f"""
You are a financial transaction categorizer for Indian users.
Classify the transaction into exactly one category.

Valid categories: {', '.join(VALID_CATEGORIES)}

High-confidence merchant mappings:
- Swiggy, Zomato, EatSure → Food & Dining
- BigBasket, Blinkit, Zepto, DMart → Groceries
- Ola, Uber, Rapido, Metro, IRCTC → Transportation
- Amazon, Flipkart, Myntra → Shopping & Retail
- BookMyShow, PVR, INOX → Entertainment & Leisure
- Practo, PharmEasy, Apollo → Health & Medical
- Netflix, Spotify, Adobe, Notion → Software & Subscriptions
- MakeMyTrip, GoIbibo, OYO → Travel & Accommodation

Return ONLY this JSON structure:
{{
  "category": "exact name from valid categories list",
  "confidence": 0.0-1.0,
  "reasoning": "one sentence maximum"
}}
"""
```

`fastapi/models/categorization.py`:
```python
from pydantic import BaseModel, Field
from typing import Literal

ALLOWED_CATEGORIES = [
    "Food & Dining", "Groceries", "Transportation", "Shopping & Retail",
    "Entertainment & Leisure", "Health & Medical", "Travel & Accommodation",
    "Utilities & Bills", "Software & Subscriptions", "Business & Professional",
    "Education", "Other"
]

class CategorizationOutput(BaseModel):
    category:  Literal[
        "Food & Dining", "Groceries", "Transportation", "Shopping & Retail",
        "Entertainment & Leisure", "Health & Medical", "Travel & Accommodation",
        "Utilities & Bills", "Software & Subscriptions", "Business & Professional",
        "Education", "Other"
    ]
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning:  str   = Field(max_length=200)
```

`fastapi/ai_clients/groq_client.py`:
```python
import json, os
from groq import AsyncGroq
from prompts.categorization_v1 import CATEGORIZATION_SYSTEM_PROMPT
from models.categorization import CategorizationOutput

groq_client = AsyncGroq(api_key=os.environ["GROQ_API_KEY"])

async def categorize_transaction(merchant: str, amount: float) -> CategorizationOutput:
    payload = {"merchant": merchant, "amount": amount}

    response = await groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": CATEGORIZATION_SYSTEM_PROMPT},
            {"role": "user",   "content": f"Transaction: {json.dumps(payload)}"}
        ],
        temperature=0.1,
        max_tokens=128,
        response_format={"type": "json_object"},
        timeout=5.0,
    )
    raw = json.loads(response.choices[0].message.content)
    return CategorizationOutput(**raw)
```

### ✅ VERIFY TASK 07
```
python -c "
import asyncio
from ai_clients.groq_client import categorize_transaction

result = asyncio.run(categorize_transaction('Swiggy', 340.0))
print(result)
"
□ Returns category 'Food & Dining'
□ confidence > 0.80
□ Runs in under 1 second
```

---

## TASK 08 — Pipeline Orchestrator + DB Write

**Owner:** You
**Time:** 1 hour
**Depends on:** Tasks 02, 06, 07

### Context
The orchestrator is the function that chains everything together:
OCR → check confidence → categorize → write to DB.
This is the heart of the V1 pipeline.

### Files to Write

`fastapi/db/supabase_client.py`:
```python
import os
from supabase import create_client, Client

_client: Client = None

def get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        )
    return _client
```

`fastapi/pipeline/orchestrator.py`:
```python
import base64
from datetime import datetime
from fastapi import HTTPException
from ai_clients.nvidia_nim import extract_receipt
from ai_clients.groq_client import categorize_transaction
from models.ocr import OCROutput
from models.categorization import CategorizationOutput
from db.supabase_client import get_client

OCR_CONFIDENCE_THRESHOLD = 0.30
CAT_CONFIDENCE_THRESHOLD = 0.50

async def run_pipeline(
    image_base64: str,
    user_id: str,
    receipt_id: str
) -> dict:
    db = get_client()

    # ── STAGE 1: OCR ──────────────────────────────────────────
    try:
        ocr: OCROutput = await extract_receipt(image_base64)
    except Exception as e:
        db.table("receipts").update(
            {"status": "failed_ocr", "processing_error": "OCR API error"}
        ).eq("id", receipt_id).execute()
        raise HTTPException(status_code=422, detail={
            "error_code": "OCR_API_UNAVAILABLE",
            "message": "Receipt processing failed. Please try again."
        })

    if ocr.raw_confidence < OCR_CONFIDENCE_THRESHOLD:
        db.table("receipts").update(
            {"status": "failed_ocr",
             "processing_error": f"Low confidence: {ocr.raw_confidence}",
             "ocr_confidence": float(ocr.raw_confidence)}
        ).eq("id", receipt_id).execute()
        raise HTTPException(status_code=422, detail={
            "error_code": "OCR_CONFIDENCE_TOO_LOW",
            "confidence": ocr.raw_confidence,
            "message": "Receipt image is unclear. Please take a clearer photo."
        })

    # ── STAGE 2: CATEGORIZATION ───────────────────────────────
    try:
        cat: CategorizationOutput = await categorize_transaction(
            merchant=ocr.merchant or "Unknown",
            amount=ocr.total_amount or 0
        )
        if cat.confidence < CAT_CONFIDENCE_THRESHOLD:
            cat.category = "Other"
    except Exception:
        cat = CategorizationOutput(
            category="Other",
            confidence=0.0,
            reasoning="categorization_fallback"
        )

    # ── STAGE 3: DATABASE WRITE ───────────────────────────────
    transaction_date = ocr.date or datetime.utcnow().strftime("%Y-%m-%d")

    db.table("transactions").insert({
        "user_id":              user_id,
        "receipt_id":           receipt_id,
        "merchant":             ocr.merchant,
        "amount":               float(ocr.total_amount or 0),
        "currency":             ocr.currency or "INR",
        "transaction_date":     transaction_date,
        "category":             cat.category,
        "confidence":           float(cat.confidence),
        "categorization_model": "groq-llama-3.3-70b",
    }).execute()

    db.table("receipts").update({
        "status":         "complete",
        "processed_at":   datetime.utcnow().isoformat(),
        "ocr_confidence": float(ocr.raw_confidence),
        "ai_model_used":  "nvidia-llama-3.2-90b-vision",
    }).eq("id", receipt_id).execute()

    db.rpc("increment_receipt_count", {"user_id_param": user_id}).execute()

    return {
        "status": "complete",
        "extraction": {
            "merchant":   ocr.merchant,
            "amount":     ocr.total_amount,
            "currency":   ocr.currency,
            "date":       ocr.date,
            "confidence": ocr.raw_confidence
        },
        "categorization": {
            "category":   cat.category,
            "confidence": cat.confidence
        }
    }
```

### ✅ VERIFY TASK 08
```
python -c "
import asyncio, base64
from pipeline.orchestrator import run_pipeline

with open('test_receipt.jpg', 'rb') as f:
    b64 = base64.b64encode(f.read()).decode()

result = asyncio.run(run_pipeline(b64, 'test-user-id', 'test-receipt-id'))
print(result)
"
□ Returns status='complete' with extraction and categorization data
□ Check Supabase: a row exists in transactions table
□ Check Supabase: receipts row shows status='complete'
```

---

## TASK 09 — FastAPI /analyze/receipt Endpoint

**Owner:** You
**Time:** 30 minutes
**Depends on:** Tasks 05, 08

### Context
This is the HTTP endpoint that receives the request from Next.js,
validates it, and calls the pipeline orchestrator.

### Add to `fastapi/main.py`:

```python
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel, validator
import re
from pipeline.orchestrator import run_pipeline

# Add these imports at the top of main.py alongside existing imports

class ReceiptRequest(BaseModel):
    image_base64: str
    user_id:      str
    receipt_id:   str

    @validator("user_id", "receipt_id")
    def must_be_uuid(cls, v):
        if not re.match(
            r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
            v, re.IGNORECASE
        ):
            raise ValueError("Must be a valid UUID")
        return v

@app.post("/analyze/receipt")
async def analyze_receipt(request: ReceiptRequest):
    # Middleware already validated X-Internal-Secret
    result = await run_pipeline(
        image_base64=request.image_base64,
        user_id=request.user_id,
        receipt_id=request.receipt_id
    )
    return result
```

### ✅ VERIFY TASK 09
```
Test with curl:
  IMAGE_B64=$(base64 -i test_receipt.jpg)
  curl -X POST http://localhost:8000/analyze/receipt \
    -H "Content-Type: application/json" \
    -H "X-Internal-Secret: your-local-secret" \
    -d "{\"image_base64\":\"$IMAGE_B64\",\"user_id\":\"00000000-0000-0000-0000-000000000001\",\"receipt_id\":\"00000000-0000-0000-0000-000000000002\"}"

□ Returns JSON with status, extraction, categorization
□ Supabase transactions table has a new row
□ Without X-Internal-Secret header → 401
□ With invalid UUID → 422 from Pydantic
```

---

## TASK 10 — Next.js Upload BFF Route

**Owner:** You
**Time:** 45 minutes
**Depends on:** Tasks 01, 09

### Context
This is the Next.js API route that the browser calls when uploading a receipt.
It validates the session, enforces the free tier limit, stores the image in
Supabase Storage, then calls FastAPI. The user's ID always comes from the
session cookie — never from the request body.

### File to Write

`src/app/api/receipts/upload/route.ts`:

```typescript
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_MIME_TYPES = new Set(['image/jpeg','image/png','image/webp','application/pdf'])
const MAX_SIZE_BYTES = 10 * 1024 * 1024  // 10MB
const FREE_TIER_LIMIT = 25

export async function POST(request: NextRequest) {
  // ── 1. Session check ──────────────────────────────────────────
  const supabase = createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id  // ← ONLY source of user identity

  // ── 2. Free tier gate ─────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_receipts_uploaded, subscription_tier')
    .eq('id', userId)
    .single()

  if (profile?.subscription_tier === 'free' &&
      (profile?.total_receipts_uploaded || 0) >= FREE_TIER_LIMIT) {
    return NextResponse.json({ error: 'LIMIT_REACHED' }, { status: 402 })
  }

  // ── 3. File validation ────────────────────────────────────────
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ error: 'FILE_TOO_LARGE' }, { status: 400 })
  if (!ALLOWED_MIME_TYPES.has(file.type)) return NextResponse.json({ error: 'INVALID_FILE_TYPE' }, { status: 400 })

  // ── 4. Upload to Supabase Storage ────────────────────────────
  const receiptId = crypto.randomUUID()
  const ext = file.name.split('.').pop() || 'jpg'
  const storagePath = `${userId}/${receiptId}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: storageError } = await supabase.storage
    .from('receipts')
    .upload(storagePath, buffer, { contentType: file.type })

  if (storageError) {
    return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
  }

  // ── 5. Create receipts row ────────────────────────────────────
  await supabase.from('receipts').insert({
    id: receiptId,
    user_id: userId,
    storage_path: storagePath,
    status: 'pending'
  })

  // ── 6. Call FastAPI ───────────────────────────────────────────
  const imageBase64 = buffer.toString('base64')

  const fastapiResponse = await fetch(
    `${process.env.FASTAPI_INTERNAL_URL}/analyze/receipt`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': process.env.FASTAPI_SECRET_KEY!
      },
      body: JSON.stringify({
        image_base64: imageBase64,
        user_id: userId,
        receipt_id: receiptId
      }),
      signal: AbortSignal.timeout(60000)  // 60s timeout (Vercel Pro)
    }
  )

  if (!fastapiResponse.ok) {
    const err = await fastapiResponse.json().catch(() => ({}))
    return NextResponse.json(err, { status: fastapiResponse.status })
  }

  const result = await fastapiResponse.json()
  return NextResponse.json(result)
}
```

### ✅ VERIFY TASK 10
```
Test with curl (while both Next.js dev and FastAPI are running):
  curl -X POST http://localhost:3000/api/receipts/upload \
    -H "Cookie: [paste your session cookie from browser devtools]" \
    -F "file=@test_receipt.jpg"

□ Returns JSON with status='complete', extraction, categorization
□ Without session cookie → 401
□ Supabase transactions table has new row
□ TypeScript: no errors (npx tsc --noEmit)
```

---

## TASK 11 — Dashboard Summary API Route

**Owner:** You
**Time:** 30 minutes
**Depends on:** Task 02

### Context
The dashboard calls this endpoint to get all the numbers it needs to render.
This is a simple SQL aggregation — no AI, no FastAPI call.

### File to Write

`src/app/api/dashboard/summary/route.ts`:

```typescript
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  // Fetch profile for intelligence level
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_receipts_uploaded, intelligence_level')
    .eq('id', userId)
    .single()

  // Fetch transactions (last 30 days)
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, category')
    .eq('user_id', userId)
    .gte('transaction_date', thirtyDaysAgo)

  if (!transactions) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // Compute aggregates in JavaScript
  const totalSpend = transactions.reduce((sum, t) => sum + (t.amount || 0), 0)
  const transactionCount = transactions.length

  const categoryTotals: Record<string, number> = {}
  for (const t of transactions) {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount
  }

  const topCategory = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'None'
  const topCategoryAmount = categoryTotals[topCategory] || 0

  return NextResponse.json({
    total_spend: totalSpend,
    transaction_count: transactionCount,
    top_category: topCategory,
    top_category_amount: topCategoryAmount,
    category_breakdown: Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalSpend > 0 ? Math.round((amount / totalSpend) * 100) : 0
    })).sort((a, b) => b.amount - a.amount),
    total_receipts_uploaded: profile?.total_receipts_uploaded || 0,
    intelligence_level: profile?.intelligence_level || 1
  })
}
```

### ✅ VERIFY TASK 11
```
curl http://localhost:3000/api/dashboard/summary \
  -H "Cookie: [session cookie]"

□ Returns JSON with all fields listed above
□ total_spend matches sum of your test transactions
□ intelligence_level reflects real receipt count
□ TypeScript: no errors
```

---

## TASK 12 — AppShell + Sidebar

**Owner:** Kiro
**Time:** 1 hour
**Depends on:** Task 00

### Docs to Give Kiro
Extract and give only:
- `UI Generator Spec` → §2.1 (Application Shell Model) + design identity colors/fonts

### Docs NOT to Give Kiro
AI_STACK, SECURITY, INFRA, SCALABILITY, and all V2+ sections.

---

### 🤖 KIRO PROMPT — TASK 12: APPSHELL + SIDEBAR

```
Build the AppShell and Sidebar for FinSight.

DESIGN RULES:
- Background: #0D0F1A (not black, not navy — exactly this hex)
- Accent: #FFD166 (amber gold)
- Glass surfaces: rgba(255,255,255,0.04) with border rgba(255,255,255,0.08)
- Font: Inter for UI text, JetBrains Mono for money values

FILE 1: src/components/layout/AppShell.tsx
'use client'

This is the wrapper component for all authenticated pages.
Structure:
- Fixed sidebar (left) — 240px desktop, collapses to 64px on tablet
- Main content area (right) — fills remaining width
- Background: the #0D0F1A base color

Props: { children: React.ReactNode }

FILE 2: src/components/layout/Sidebar.tsx
'use client'

This is the sidebar component used inside AppShell.
Structure (top to bottom):
1. Logo area — "FinSight" text in amber (#FFD166), large, 24px
2. Navigation links (middle, flex-col):
   - Dashboard (LayoutDashboard icon from lucide-react) → links to /dashboard
   - Receipts (Receipt icon) → links to /receipts (placeholder for now)
   - Insights (BarChart icon) → links to /insights (placeholder for now)
   - Settings (Settings icon) → links to /settings (placeholder for now)
   - Active link: amber background at 10% opacity, amber text
   - Inactive: muted white text, hover: white text
3. Upload button (bottom, always visible):
   - Full width inside sidebar
   - Text: "Upload Receipt"
   - Background: #FFD166 (amber)
   - Text: black
   - Icon: Upload from lucide-react
   - onClick: for now just console.log("upload clicked") — modal comes later

Use next/link for navigation.
Use usePathname() from next/navigation to detect active route.

MOBILE: On screens smaller than 768px, the sidebar becomes a bottom navigation bar
(fixed bottom, full width, show only icons, 4 items).

OUTPUT: Both files. STOP. Do not modify any other file.
```

---

### ✅ VERIFY TASK 12
```
□ Sidebar renders on /dashboard with navigation links
□ Active link is highlighted in amber
□ Upload button is visible and amber-colored
□ Mobile view shows bottom nav (use browser devtools responsive mode)
□ No TypeScript errors
```

---

## TASK 13 — Upload Modal Component

**Owner:** Kiro
**Time:** 2 hours
**Depends on:** Tasks 10, 12

### Docs to Give Kiro
Extract and give only:
- `UI Generator Spec` → §3.2 (Upload Flow section, including state machine and all state layouts)

### Docs NOT to Give Kiro
Everything else.

---

### 🤖 KIRO PROMPT — TASK 13: UPLOAD MODAL

```
Build the UploadModal component for FinSight.

FILE: src/components/upload/UploadModal.tsx
'use client'

This modal overlays any page and handles the receipt upload flow.
It has FIVE states: IDLE, PREVIEW, PROCESSING, RESULTS, ERROR.

PROPS:
  isOpen: boolean
  onClose: () => void
  onSuccess: (result: any) => void  ← called when upload completes

TRIGGER: The Upload button in the sidebar opens this modal.
Use shadcn Dialog component as the container.
Width: 560px on desktop, bottom sheet behavior on mobile (use shadcn Sheet for mobile).

STATE 1 — IDLE:
  - Drop zone with dashed amber border (#FFD166 at 40% opacity)
  - Icon: Upload (32px, muted white) from lucide-react
  - Text: "Drop your receipt here" (large), "or click to browse" (small, muted)
  - Sub-text: "JPEG · PNG · PDF · max 10MB" (very small, very muted)
  - Buttons: [Cancel] [Browse Files →] (amber button)
  - Drag-and-drop: accept jpeg, png, pdf, max 10MB
  - On file selected → transition to PREVIEW state

STATE 2 — PREVIEW:
  - Show the selected image (use URL.createObjectURL)
  - If PDF: show a PDF icon instead of image preview
  - Show file name and size below the preview
  - Buttons: [← Back] [Confirm & Upload →] (amber button)
  - On confirm → transition to PROCESSING and call the upload API

STATE 3 — PROCESSING:
  - Background tint: rgba(16,44,38,0.6) — deep forest green inside the modal
  - Center: spinning amber ring animation (CSS animation, not Framer Motion yet)
  - Three step indicators (vertical list):
    Step 1: "Reading receipt image..." (show check ✓ after 1 second)
    Step 2: "Identifying merchant and amount..." (show check ✓ after 2 seconds)
    Step 3: "Categorising transaction..." (show spinner while API is running)
  - Text below: "FinSight AI is analysing your receipt" (italic, muted)
  - These timing animations are cosmetic — they play regardless of actual API speed
  - The modal stays in PROCESSING until the API returns (success or error)

STATE 4 — RESULTS:
  Show two columns:
  Left column: Receipt image preview (the file the user uploaded)
  Right column: Extracted data:
    - "Merchant" label + merchant value (or "Unknown")
    - "Amount" label + ₹ amount value in JetBrains Mono font
    - "Date" label + date value (or "Not detected")
    - "Category" label + category badge (amber background, black text)
    - "Confidence" label + progress bar showing confidence percentage
  Confidence bar: filled amber, gray background, shows percentage number

  Buttons: [Try Again] [Confirm & Save →] (amber button)
  On "Confirm & Save": close modal, call onSuccess(result), do NOT make another API call
  (data is already saved by the API — this is just confirming the user saw the results)
  On "Try Again": go back to IDLE state

STATE 5 — ERROR:
  - Show appropriate message based on error type:
    - OCR_CONFIDENCE_TOO_LOW: "We couldn't read this receipt. Please take a clearer photo."
    - LIMIT_REACHED: "You've reached your free upload limit. Upgrade to continue."
    - Generic: "Something went wrong. Please try again."
  - Show error icon (AlertCircle from lucide-react, red)
  - Button: [Try Again] → back to IDLE

UPLOAD LOGIC (inside the component):
  When user confirms in PREVIEW state:
    const formData = new FormData()
    formData.append('file', selectedFile)
    const response = await fetch('/api/receipts/upload', {
      method: 'POST',
      body: formData
    })
    if (response.ok) {
      const result = await response.json()
      setResult(result)
      setState('RESULTS')
    } else {
      const err = await response.json()
      setErrorCode(err.error_code || 'UNKNOWN')
      setState('ERROR')
    }

INTEGRATION: The Sidebar's Upload button calls onOpen from a state variable.
For now, in the Dashboard page, add:
  const [uploadOpen, setUploadOpen] = useState(false)
  Pass setUploadOpen(true) to the sidebar and UploadModal to wire them together.

OUTPUT: UploadModal.tsx component only.
STOP. Do not modify Sidebar or Dashboard yet.
```

---

### ✅ VERIFY TASK 13
```
□ Modal opens when Upload button is clicked
□ File drag-and-drop works on IDLE state
□ PREVIEW shows the selected image correctly
□ PROCESSING shows the animation with step indicators
□ RESULTS shows extracted merchant, amount, category, confidence
□ ERROR state shows appropriate message
□ "Confirm & Save" calls onSuccess and closes modal
□ No TypeScript errors
```

---

## TASK 14 — Dashboard Page + KPI Cards + Transaction Feed

**Owner:** Kiro
**Time:** 2 hours
**Depends on:** Tasks 11, 12, 13

### Docs to Give Kiro
Extract and give only:
- `UI Generator Spec` → §3.1 (Dashboard Page — Layout Zones + Intelligence Level States + Component Inventory)
- `UI Generator Spec` → §8.1 (Backend Integration Map — Dashboard section only)

### Docs NOT to Give Kiro
Everything else.

---

### 🤖 KIRO PROMPT — TASK 14: DASHBOARD PAGE

```
Build the full Dashboard page for FinSight.

You have these pieces already built:
- AppShell and Sidebar (src/components/layout/)
- UploadModal (src/components/upload/UploadModal.tsx)
- API route at GET /api/dashboard/summary (returns: total_spend, transaction_count,
  top_category, top_category_amount, category_breakdown, total_receipts_uploaded, intelligence_level)

FILE 1: src/components/dashboard/IntelligenceMeter.tsx
'use client'

A horizontal progress bar that shows the user's intelligence level.
Props: { totalReceipts: number }

Logic:
  - Level 1 (0-2 receipts): 15% filled, pulsing amber glow animation
  - Level 2 (3-5 receipts): 40% filled
  - Level 3 (6-9 receipts): 70% filled
  - Level 4 (10+ receipts): 100% filled, shimmer animation

Visual:
  - Container: full width, height 8px, rounded, background rgba(255,255,255,0.1)
  - Fill: amber (#FFD166) gradient
  - Label above: "Intelligence Level N" on left, "Full Intelligence" or "N more receipts" on right
  - Framer Motion: animate the fill width with spring physics

FILE 2: src/components/dashboard/KPICard.tsx
A single metric card. Glass surface style.
Props: { label: string, value: string, sublabel?: string, isLoading?: boolean }

Visual:
  - Background: rgba(255,255,255,0.04), border: rgba(255,255,255,0.08), rounded-xl
  - Label: uppercase, small, muted (#6B71A0)
  - Value: large (24px), Inter bold
  - Money values: JetBrains Mono font
  - Loading state: shimmer skeleton animation (CSS only)

FILE 3: src/components/dashboard/TransactionFeed.tsx
'use client'
Shows the last 8 transactions. Fetches them separately.
Props: { userId?: string }

Use a useEffect to fetch from /api/receipts endpoint.
(Create GET /api/receipts route as part of this task — see below)

Each transaction row shows:
  - Merchant name (bold)
  - Amount (amber, JetBrains Mono)
  - Category badge (small, muted background)
  - Date (small, muted right side)

Empty state: "Upload your first receipt to see transactions here"

FILE 4: src/app/(dashboard)/dashboard/page.tsx
Replace the placeholder with the full dashboard.

This is a SERVER COMPONENT (no 'use client').
Fetch data server-side from /api/dashboard/summary.

Structure:
  Wrap in AppShell
  Inside:
    - UploadModal (client component — needs 'use client' wrapper or separate client component)
    - Page header: "Good morning, [name]" with today's date and "Upload Receipt" button
    - IntelligenceMeter (full width)
    - KPI cards row (4 cards):
        Card 1: Total Spend — ₹{total_spend} formatted
        Card 2: Transactions — {transaction_count} this month
        Card 3: Top Category — {top_category}
        Card 4: Top Amount — ₹{top_category_amount}
    - Intelligence level states:
        Level 1: All 4 KPI cards show LOADING skeleton
        Level 2+: KPI cards show real data
    - TransactionFeed below the KPI row

ALSO CREATE: src/app/api/receipts/route.ts
GET /api/receipts
Returns last 20 receipts with their transaction data.
  const supabase = createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json([], { status: 401 })
  const { data } = await supabase
    .from('receipts')
    .select('id, uploaded_at, status, transactions(merchant, amount, category, confidence)')
    .eq('user_id', session.user.id)
    .eq('status', 'complete')
    .order('uploaded_at', { ascending: false })
    .limit(20)
  return NextResponse.json(data || [])

WIRING the Upload button:
Create src/components/dashboard/DashboardClient.tsx ('use client')
This handles the upload modal open/close state and the "Confirm & Save" callback.
The callback should trigger router.refresh() to re-fetch the dashboard data.

OUTPUT: All files listed above.
STOP. Do not add Insights page, Settings, or any V2 features.
```

---

### ✅ VERIFY TASK 14
```
□ Dashboard renders with AppShell + Sidebar visible
□ Intelligence Meter shows correct level for your test user
□ With 0 receipts: KPI cards show loading skeletons
□ After uploading receipts: KPI cards show real numbers
□ Transaction feed shows uploaded receipts
□ "Upload Receipt" button opens the UploadModal
□ After upload + confirm: dashboard auto-refreshes with new data
□ No TypeScript errors
```

---

## TASK 15 — Full End-to-End Integration Test

**Owner:** You
**Time:** 1 hour
**Depends on:** All tasks 00–14

### Context
This is not a task to build anything new. This is a verification run of the
complete V1 pipeline with real data. You are the tester.

### Test Script (run manually, in this exact order)

```
TEST 1: Complete upload flow
  □ Log in at localhost:3000/auth
  □ Click "Upload Receipt"
  □ Drop a real receipt photo (grocery, restaurant, or retail)
  □ Confirm in preview
  □ Watch PROCESSING state — all 3 steps should complete
  □ RESULTS state shows: merchant name, amount, category, confidence bar
  □ Click "Confirm & Save"
  □ Dashboard refreshes and shows the transaction in the feed
  □ KPI cards update with new totals

TEST 2: OCR failure
  □ Upload a selfie or completely blurry image
  □ Should reach RESULTS or ERROR with low confidence message
  □ Receipt count should NOT increment

TEST 3: Intelligence level progression
  □ Upload receipts until you reach 3 total
  □ Intelligence Meter should advance to Level 2 (40%)
  □ KPI cards should show real data instead of skeletons
  □ Upload until you reach 10 total
  □ Intelligence Meter should reach Level 4 (100%)

TEST 4: Database verification
  Open Supabase Table Editor after each upload:
  □ receipts table: new row with status='complete'
  □ transactions table: new row with merchant, amount, category
  □ profiles table: total_receipts_uploaded is correct

TEST 5: Security check
  □ Run: grep -r "nvapi-\|gsk_\|service_role" --include="*.ts" src/
  □ Expected: ZERO RESULTS
  □ Check .gitignore includes .env.local and fastapi/.env
  □ Run git status — no .env files should appear as tracked
```

### V1 Done Criteria — ALL of these must be true:
```
□ Real receipt photographed → transaction in Supabase in under 5 seconds
□ Category assigned correctly for a Swiggy / Zomato / Uber receipt
□ Intelligence Meter advances when receipts are uploaded
□ KPI cards show real numbers at Level 2+
□ Transaction feed is populated with uploaded receipts
□ Secret audit passes (zero AI keys in frontend code)
□ FastAPI health endpoint returns all-green
□ No console errors in browser during any flow
```

---

## TASK 16 — Deploy FastAPI to Railway

**Owner:** You
**Time:** 1 hour
**Depends on:** Task 15 (V1 integration test passes locally)

### Context
Deploy the FastAPI service so it runs on Railway's infrastructure, not your laptop.
After this task, Next.js in production calls Railway's URL instead of localhost:8000.

### Steps

1. Go to railway.app → New Project → Deploy from GitHub
2. Point to your repo, select the `fastapi/` directory as the service
3. Railway reads `railway.toml` for the Dockerfile path
4. In Railway service → Variables, add ALL the vars from `fastapi/.env`:
   - `NVIDIA_NIM_API_KEY`
   - `GROQ_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `FASTAPI_SECRET_KEY` (use a real 64-char secret: `openssl rand -hex 32`)
   - `ALLOWED_ORIGINS=https://your-project.vercel.app`
   - `ENVIRONMENT=production`
5. Deploy. Wait for health check to pass.
6. Copy the Railway service URL (e.g., `https://finsight-api.up.railway.app`)

### ✅ VERIFY TASK 16
```
□ GET https://[railway-url]/health → {"status":"ok"}
□ Railway logs show no errors
□ All three model providers show true in the health response
□ ALLOWED_ORIGINS is set to Vercel URL (not localhost)
```

---

## TASK 17 — Deploy Next.js to Vercel + Final Test

**Owner:** You
**Time:** 30 minutes
**Depends on:** Task 16

### Steps

1. Go to vercel.com → New Project → Import from GitHub
2. Framework preset: Next.js (auto-detected)
3. In Environment Variables, add ALL vars from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` → set to your Vercel URL
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `FASTAPI_INTERNAL_URL` → set to your Railway URL
   - `FASTAPI_SECRET_KEY` → SAME value as Railway
4. **Upgrade Vercel to Pro plan** — the upload pipeline takes 2–5 seconds.
   Hobby plan times out at 10 seconds and will cause random failures.
5. Update Supabase Auth → Site URL and Redirect URLs to Vercel domain

### ✅ VERIFY TASK 17 — FINAL V1 PRODUCTION TEST
```
□ Site loads at https://your-project.vercel.app
□ Google OAuth login works in production
□ Upload a real receipt in production → transaction appears in dashboard
□ Intelligence Meter advances in production
□ Secret scan passes: no AI keys in frontend bundle
□ Vercel function logs show no timeout errors
□ Railway logs show pipeline completing successfully
```

---

## FAILURE PREVENTION GUIDE

### The Top 10 Mistakes to Avoid

```
MISTAKE 1: Combining tasks
  Wrong: "Kiro, build the full upload system including the modal, API route,
          FastAPI endpoint, and dashboard."
  Right: One task at a time. Task 10 (BFF route) first.
         Verify it. Then Task 13 (modal).

MISTAKE 2: Giving Kiro all docs at once
  Wrong: Paste all 10 docs into Kiro's context.
  Right: Each task specifies exactly which doc sections to give.
         More docs = more confusion = more hallucination.

MISTAKE 3: Skipping verification checks
  If Task 09 is not verified, Task 10 will fail in a confusing way.
  Every task has a verification check. Run it. Every time.

MISTAKE 4: Building V2 features in V1
  Wrong: "Let's also add the insights page and tax export while we're here."
  Right: Those are V2 features. They require V1's data to be stable.
         The feature doesn't work without 30 days of clean transaction data.

MISTAKE 5: Using the wrong Supabase client
  Wrong: Using createClient() (browser) in an API route.
  Right: API routes and Server Components use createSupabaseServerClient().
         Browser components use createClient().
         Wrong client = session not read correctly = silent 401s.

MISTAKE 6: Reading user_id from the request body
  Wrong: const userId = (await request.json()).user_id
  Right: const userId = session.user.id
         Always. No exceptions.

MISTAKE 7: Forgetting ALLOWED_ORIGINS in Railway
  If Railway's ALLOWED_ORIGINS is still 'localhost:3000' in production,
  every browser upload will fail with a CORS error.
  Set it to your Vercel URL before first production deploy.

MISTAKE 8: Not upgrading Vercel to Pro
  The upload pipeline takes 2–5 seconds at p50 and up to 8 seconds at p95.
  Vercel Hobby times out at 10 seconds. You will see random upload failures.
  Upgrade to Pro ($20/month) before inviting any users.

MISTAKE 9: Committing .env files
  One git commit with API keys in it = those keys are compromised forever.
  Git history is public even if you delete the file later.
  Use: git rm --cached .env.local BEFORE your first commit.

MISTAKE 10: Building Redis/queues/microservices in V1
  You have 0 users. You do not need a queue.
  Synchronous processing with async/await handles everything up to 500 users.
  Build the queue when you have 2,000+ users and measurable latency.
  Not today.
```

### Overengineering Traps

```
TRAP: "We should use LangChain to orchestrate the AI calls"
FIX:  Three Python functions in sequence. No framework needed.

TRAP: "We need proper error handling with retries and circuit breakers"
FIX:  V1 needs basic try/except and a clear error message. Retries in V3.

TRAP: "The dashboard should have real-time updates via WebSocket"
FIX:  React Query refetch on window focus + after upload. Done.

TRAP: "We should containerize everything with Docker Compose locally"
FIX:  npm run dev + uvicorn main:app --reload. Two terminal windows. Done.

TRAP: "We need a proper testing suite before shipping"
FIX:  The verification checks in each task ARE your test suite for V1.
      Automated tests come in V2 after the architecture stabilizes.
```

---

## DOCUMENT DISTRIBUTION MASTER TABLE

| Task | Give Kiro These Docs (Specific Sections) | Never Give These |
|------|------------------------------------------|-----------------|
| 00 | Nothing | Everything |
| 01 | (Manual) | — |
| 02 | TECH_STACK §4.2, §4.4 (you only) | — |
| 03 | UI Spec §1 (colors/fonts only) | SECURITY, AI_STACK, INFRA |
| 04 | (You write) | — |
| 05 | (You write) | — |
| 06 | TECH_STACK §6.1, PROMPT_STRATEGY §2.2 | Everything else |
| 07 | TECH_STACK §6.2, PROMPT_STRATEGY §3.3 | Everything else |
| 08 | (You write) | — |
| 09 | (You write) | — |
| 10 | (You write) | — |
| 11 | (You write) | — |
| 12 | UI Spec §2.1 (shell model + colors) | Everything else |
| 13 | UI Spec §3.2 (upload flow only) | Everything else |
| 14 | UI Spec §3.1 (dashboard), §8.1 (backend map, dashboard only) | Everything else |
| 15–17 | (Manual testing + deploy) | — |

**Why such strict doc isolation?**
Kiro's quality degrades when given too much context. A 5,000-token prompt
focused on one component produces better code than a 50,000-token prompt
containing the entire system. Give Kiro a scalpel, not a firehose.

---

*End of FinSight V1_EXECUTION_TASKS.md v1.0.0*

*V1 is done when a real receipt becomes a dashboard transaction.*
*V2 begins the moment V1's integration test passes in production.*
*Do not skip ahead. The foundation determines everything above it.*
