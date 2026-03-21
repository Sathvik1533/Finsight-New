# KIRO INITIAL PROMPT — FINSIGHT FASTAPI BOOTSTRAP
## Task 00: Project Setup, Folder Structure, Supabase Connection, Health Endpoint

---

You are a senior Python backend engineer building FinSight — a Financial Intelligence System.

You will receive tasks one at a time. You build exactly what each task asks. You stop when the task ends. You do not build ahead, infer features, or add things that are not explicitly asked.

---

## SYSTEM CONTEXT

FinSight is a financial intelligence system, not an expense tracker. It converts receipt photographs into structured financial data and builds spending intelligence over time.

The system has three layers:

**Layer 1 — Next.js (generated separately, not your concern)**
A frontend application that shows the dashboard, receipts, and insights. You do not build or modify this layer.

**Layer 2 — FastAPI (your responsibility)**
A Python backend service running on Railway. This is where all AI calls happen. It receives requests from the Next.js BFF layer, runs the AI pipeline, writes results to Supabase, and returns structured responses. It holds all AI API keys. The browser never talks to FastAPI directly.

**Layer 3 — Supabase (PostgreSQL + Storage + Auth)**
The database, file storage, and authentication layer. FastAPI connects to it using a service role key that bypasses Row Level Security. Migrations (table creation, RLS policies) are run separately in the Supabase SQL Editor by the human — not by you.

---

## ARCHITECTURE YOU ARE AWARE OF (but do not build yet)

**AI Pipeline — future tasks will build this:**
- Stage 1: NVIDIA NIM Llama 3.2 90B Vision → extracts merchant, amount, date from receipt images
- Stage 2: Groq Llama 3.3 70B → categorizes transactions into 12 categories
- Stage 3: Gemini 2.0 Flash → generates financial insights and decision narratives

**These are future tasks. Do not implement any AI calls now.**

**Security model you must respect from day one:**
- All AI API keys (NVIDIA, Groq, Gemini) live only in FastAPI environment variables
- Never expose them in logs, responses, or config files
- The X-Internal-Secret header authenticates the Next.js BFF → FastAPI connection
- User IDs always come from the session token, never from request bodies

---

## EXECUTION RULES — READ THESE BEFORE WRITING A SINGLE LINE

```
RULE 1: BUILD ONLY WHAT THIS TASK ASKS
  This task is Task 00 — project setup.
  Do not implement OCR, categorization, insights, or any AI pipeline.
  Do not build the upload endpoint, the dashboard endpoint, or any business logic.
  Do not install LangChain, LangGraph, or any vector database library.

RULE 2: WAIT FOR THE NEXT TASK
  When this task is complete, STOP.
  Do not proceed to Task 01 or beyond.
  The human will give you the next task when ready.

RULE 3: DO NOT INFER MISSING FEATURES
  If something is not in this prompt, it does not exist yet.
  Do not add "placeholder" endpoints.
  Do not add "TODO" stubs for future features unless this task explicitly asks.

RULE 4: DO NOT OVERBUILD
  No database connection pooling configuration (Supabase handles this).
  No Redis setup (Phase 4 only).
  No Sentry integration (Phase 3 only).
  No background task queue (Phase 4 only).
  No Docker Compose (we use Railway — a Dockerfile is enough).

RULE 5: PRODUCTION MINDSET ON STRUCTURE, NOT ON FEATURES
  Write clean, readable Python.
  Follow the folder structure exactly.
  Use environment variables correctly.
  No hardcoded secrets. No hardcoded URLs. Ever.
```

---

## TASK 00 — FastAPI Bootstrap

### What you are building

A clean, runnable FastAPI service with:
1. The correct folder structure for the entire project
2. Environment variable loading from a `.env` file
3. A Supabase client connection (service role)
4. CORS middleware configured correctly
5. A `/health` endpoint that verifies the service is running
6. A Dockerfile for Railway deployment
7. A `railway.toml` for Railway configuration

Nothing else. No AI clients. No business routes. No upload logic.

---

### Folder Structure to Create

Create every file and folder listed. Files marked `[empty]` should exist but contain only a module docstring or a single comment. Files with content are specified below.

```
fastapi/
├── main.py                    ← FastAPI app, middleware, routes registered here
├── config.py                  ← All environment variable loading
├── middleware.py              ← X-Internal-Secret middleware (stub only in Task 00)
├── db/
│   ├── __init__.py            [empty]
│   └── supabase_client.py     ← Supabase service role client singleton
├── models/
│   ├── __init__.py            [empty]
│   ├── ocr.py                 [empty — filled in Task 06]
│   └── categorization.py      [empty — filled in Task 07]
├── ai_clients/
│   ├── __init__.py            [empty]
│   ├── nvidia_nim.py          [empty — filled in Task 06]
│   └── groq_client.py         [empty — filled in Task 07]
├── pipeline/
│   ├── __init__.py            [empty]
│   └── orchestrator.py        [empty — filled in Task 08]
├── prompts/
│   ├── __init__.py            [empty]
│   ├── ocr_v1.py              [empty — filled in Task 06]
│   └── categorization_v1.py   [empty — filled in Task 07]
├── requirements.txt
├── Dockerfile
├── .env                       ← NEVER committed to Git
└── .gitignore
```

---

### File Contents

#### `fastapi/requirements.txt`

```
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
```

Do not add any other packages. Do not add LangChain, Redis, Sentry, or any other library not listed here.

---

#### `fastapi/config.py`

```python
"""
FinSight FastAPI — Environment Configuration
All environment variables are loaded here. No hardcoded values anywhere else.
"""
from dotenv import load_dotenv
import os

load_dotenv()

# ── Supabase ──────────────────────────────────────────────────────────────────
SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# ── AI Provider Keys ─────────────────────────────────────────────────────────
# These keys are loaded here but clients are initialized in Task 06 and 07.
# They must NEVER appear in logs, responses, or any file other than this one.
NVIDIA_NIM_API_KEY: str = os.environ["NVIDIA_NIM_API_KEY"]
GROQ_API_KEY: str = os.environ["GROQ_API_KEY"]
GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")

# ── Service Security ──────────────────────────────────────────────────────────
FASTAPI_SECRET_KEY: str = os.environ["FASTAPI_SECRET_KEY"]
ALLOWED_ORIGINS: list[str] = os.environ.get(
    "ALLOWED_ORIGINS", "http://localhost:3000"
).split(",")

# ── Runtime ───────────────────────────────────────────────────────────────────
ENVIRONMENT: str = os.environ.get("ENVIRONMENT", "development")
```

---

#### `fastapi/db/supabase_client.py`

```python
"""
FinSight FastAPI — Supabase Service Role Client
Uses the service role key, which bypasses Row Level Security.
This is intentional: FastAPI writes on behalf of verified users.
The security comes from X-Internal-Secret middleware, not from RLS.
"""
import os
from supabase import create_client, Client

_client: Client | None = None


def get_supabase() -> Client:
    """
    Returns a singleton Supabase client using the service role key.
    Creates the client on first call, reuses on subsequent calls.
    Thread-safe for FastAPI's async context.
    """
    global _client
    if _client is None:
        _client = create_client(
            supabase_url=os.environ["SUPABASE_URL"],
            supabase_key=os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        )
    return _client
```

---

#### `fastapi/middleware.py`

```python
"""
FinSight FastAPI — Internal Secret Middleware
Validates the X-Internal-Secret header on every request.
This prevents unauthorized callers from triggering AI pipeline runs.

NOTE: Full implementation is active here.
The /health endpoint is excluded so Railway can check it without credentials.
"""
import secrets
import os
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

EXCLUDED_PATHS: set[str] = {"/health"}


class InternalSecretMiddleware(BaseHTTPMiddleware):
    """
    Validates X-Internal-Secret header on every non-excluded request.
    Uses secrets.compare_digest() to prevent timing attacks.
    A timing attack could allow an attacker to guess the secret
    character-by-character based on response time differences.
    compare_digest() takes constant time regardless of how much matches.
    """

    async def dispatch(self, request: Request, call_next):
        if request.url.path in EXCLUDED_PATHS:
            return await call_next(request)

        provided_secret = request.headers.get("X-Internal-Secret", "")
        expected_secret = os.environ["FASTAPI_SECRET_KEY"]

        # Both must be non-empty before comparison
        if not provided_secret or not secrets.compare_digest(
            provided_secret.encode("utf-8"),
            expected_secret.encode("utf-8"),
        ):
            raise HTTPException(status_code=401, detail="Unauthorized")

        return await call_next(request)
```

---

#### `fastapi/main.py`

```python
"""
FinSight FastAPI — Main Application
Entry point for the AI backend service.

Route registration:
  /health — public (no auth required)

Future routes (registered in later tasks):
  POST /analyze/receipt  — Task 09
  POST /insights/generate — V2 task
  POST /decision-engine/run — V3 task
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx

from config import ALLOWED_ORIGINS, NVIDIA_NIM_API_KEY, GROQ_API_KEY, ENVIRONMENT
from middleware import InternalSecretMiddleware

app = FastAPI(
    title="FinSight AI Service",
    version="1.0.0",
    docs_url="/docs" if ENVIRONMENT == "development" else None,
    redoc_url=None,
)

# ── Middleware ────────────────────────────────────────────────────────────────
# Order matters: CORS must be registered before InternalSecret
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Internal-Secret"],
    max_age=3600,
)
app.add_middleware(InternalSecretMiddleware)


# ── Health Endpoint ───────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    """
    Public endpoint. No auth required.
    Used by Railway for health monitoring and deployment verification.
    Checks that the service is running and that API keys are present.

    Returns 200 always — Railway should not restart the service
    just because an AI provider is temporarily degraded.
    Provider failures are handled per-request with fallbacks.
    """
    providers: dict[str, bool] = {}

    # Check NVIDIA NIM key presence and basic reachability
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(
                "https://integrate.api.nvidia.com/v1/models",
                headers={"Authorization": f"Bearer {NVIDIA_NIM_API_KEY}"},
            )
            # 200 = healthy, 401 = key format valid but endpoint requires auth
            # Both indicate the key is loaded and the service is reachable
            providers["nvidia"] = response.status_code in (200, 401)
    except Exception:
        providers["nvidia"] = False

    # Check Groq key presence and basic reachability
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            )
            providers["groq"] = response.status_code == 200
    except Exception:
        providers["groq"] = False

    # Gemini is checked lazily on first use — not on startup
    providers["gemini"] = True

    all_healthy = all(providers.values())

    return JSONResponse(
        content={
            "status": "ok" if all_healthy else "degraded",
            "environment": ENVIRONMENT,
            "models": providers,
        },
        status_code=200,  # Always 200 — degraded != down
    )
```

---

#### `fastapi/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies required by Pillow (image processing)
# and psycopg2 (Supabase uses PostgreSQL under the hood)
RUN apt-get update && apt-get install -y \
    libpq-dev \
    libjpeg-dev \
    libpng-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Single uvicorn worker in Phase 1–3.
# The pipeline is I/O-bound (waiting for NVIDIA NIM, Groq, Supabase).
# FastAPI's async event loop handles concurrent requests efficiently
# on a single worker. Multiple workers add RAM overhead without
# proportional throughput gain for I/O-bound work.
# Phase 4: scale by adding Railway instances, not workers per instance.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
```

---

#### `railway.toml` (place in repository root, not inside `fastapi/`)

```toml
[build]
dockerfilePath = "fastapi/Dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

---

#### `fastapi/.env` (template — human fills in real values, never committed)

```bash
# FinSight FastAPI — Environment Variables
# NEVER commit this file. It is in .gitignore.
# Copy this template, fill in real values, save as fastapi/.env

# Supabase
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI Providers
NVIDIA_NIM_API_KEY=nvapi-...
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...

# Service Security
FASTAPI_SECRET_KEY=generate-with-openssl-rand-hex-32
ALLOWED_ORIGINS=http://localhost:3000

# Runtime
ENVIRONMENT=development
```

---

#### `fastapi/.gitignore`

```
.env
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
*.egg-info/
dist/
build/
.pytest_cache/
.coverage
htmlcov/
.DS_Store
```

---

#### Empty module files (create each with this exact content)

`fastapi/db/__init__.py`, `fastapi/models/__init__.py`, `fastapi/ai_clients/__init__.py`, `fastapi/pipeline/__init__.py`, `fastapi/prompts/__init__.py`:

```python
# FinSight FastAPI — [folder name] module
```

`fastapi/models/ocr.py`:

```python
# FinSight FastAPI — OCR output Pydantic models
# Implemented in Task 06
```

`fastapi/models/categorization.py`:

```python
# FinSight FastAPI — Categorization output Pydantic models
# Implemented in Task 07
```

`fastapi/ai_clients/nvidia_nim.py`:

```python
# FinSight FastAPI — NVIDIA NIM OCR client
# Implemented in Task 06
```

`fastapi/ai_clients/groq_client.py`:

```python
# FinSight FastAPI — Groq categorization client
# Implemented in Task 07
```

`fastapi/pipeline/orchestrator.py`:

```python
# FinSight FastAPI — Pipeline orchestrator (OCR → Categorize → DB write)
# Implemented in Task 08
```

`fastapi/prompts/ocr_v1.py`:

```python
# FinSight FastAPI — NVIDIA NIM OCR extraction prompt (version 1)
# Implemented in Task 06
```

`fastapi/prompts/categorization_v1.py`:

```python
# FinSight FastAPI — Groq categorization system prompt (version 1)
# Implemented in Task 07
```

---

### Verification — How to confirm Task 00 is complete

After creating all files, run these commands from inside the `fastapi/` directory:

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Create .env from the template and fill in real values

# 3. Start the service
uvicorn main:app --reload

# 4. Health check (in a new terminal)
curl http://localhost:8000/health
```

**Expected response from /health:**
```json
{
  "status": "ok",
  "environment": "development",
  "models": {
    "nvidia": true,
    "groq": true,
    "gemini": true
  }
}
```

**Expected behavior for protected routes:**
```bash
# Without X-Internal-Secret header → 401
curl -X POST http://localhost:8000/analyze/receipt
# Response: {"detail":"Unauthorized"}

# /health with no header → 200 (excluded path)
curl http://localhost:8000/health
# Response: {"status":"ok",...}
```

**Verification checklist:**
```
□ uvicorn starts without import errors
□ GET /health returns 200 with models status
□ POST to any non-health route without X-Internal-Secret returns 401
□ No .env file appears in git status
□ All empty stub files exist in the correct folders
□ requirements.txt contains exactly the packages listed (no extras)
```

---

### STOP

Task 00 is complete when the verification checklist passes.

Do not proceed to Task 01.
Do not add any endpoints beyond /health.
Do not implement any AI client code.
Do not add any database migration logic.
Do not create any Next.js files.

Wait for the next task prompt.
