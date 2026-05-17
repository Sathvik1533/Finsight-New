"""
FinSight FastAPI — Main Application
Entry point for the AI backend service.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx

from config import ALLOWED_ORIGINS, GROQ_API_KEY, ENVIRONMENT
from models.ocr import OCRInput
from pipeline.orchestrator import process_receipt, PipelineException
from middleware import InternalSecretMiddleware
from routers import contractors, risk

app = FastAPI(
    title="FinSight AI Service",
    version="1.0.0",
    docs_url="/docs" if ENVIRONMENT == "development" else None,
    redoc_url=None,
)

# ── Middleware ────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Content-Type", "X-Internal-Secret", "X-User-Id"],
    max_age=3600,
)

# Validates X-Internal-Secret on every request (except /health).
# Without this, anyone could trigger the expensive AI pipeline.
app.add_middleware(InternalSecretMiddleware)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(contractors.router, prefix="/contractors", tags=["contractors"])
app.include_router(risk.router, prefix="/risk", tags=["risk"])

# ── Health Endpoint ───────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    """Health check endpoint for Railway deployment monitoring."""
    groq_ok = False
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            )
            groq_ok = response.status_code == 200
    except Exception:
        groq_ok = False

    return JSONResponse(
        content={
            "status": "ok" if groq_ok else "degraded",
            "environment": ENVIRONMENT,
            "models": {
                "groq_vision": groq_ok,
                "groq_categorization": groq_ok,
            },
        },
        status_code=200,
    )

# ── Receipt Analysis Endpoint ─────────────────────────────────────────────────
@app.post("/analyze/receipt")
async def analyze_receipt(data: OCRInput):
    """
    Process a receipt through the complete AI pipeline.
    
    Flow: OCR → Categorization → Database Write
    
    Returns extraction + categorization results.
    """
    try:
        result = await process_receipt(
            image_base64=data.image_base64,
            media_type=data.media_type,
            receipt_id=data.receipt_id,
            user_id=data.user_id
        )
        return JSONResponse(content=result, status_code=200)
        
    except PipelineException as e:
        msg = str(e)
        if "Low confidence" in msg:
            code = "OCR_CONFIDENCE_TOO_LOW"
        elif "Timeout" in msg:
            code = "AI_PROVIDER_TIMEOUT"
        elif "Database error" in msg:
            code = "DATABASE_WRITE_FAILED"
        else:
            code = "PIPELINE_FAILED"

        return JSONResponse(
            content={
                "error_code": code,
                "message": msg,
            },
            status_code=422,
        )
        
    except Exception as e:
        return JSONResponse(
            content={
                "error_code": "INTERNAL_ERROR",
                "message": f"Internal error: {str(e)}",
            },
            status_code=500,
        )
