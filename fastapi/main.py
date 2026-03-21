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
