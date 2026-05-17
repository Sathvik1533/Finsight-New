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
# All AI (OCR + categorization + risk) runs through Groq — one key, two models.
# NEVER log, expose, or hardcode these values.
GROQ_API_KEY: str = os.environ["GROQ_API_KEY"]

# ── Service Security ──────────────────────────────────────────────────────────
FASTAPI_SECRET_KEY: str = os.environ["FASTAPI_SECRET_KEY"]
ALLOWED_ORIGINS: list[str] = os.environ.get(
    "ALLOWED_ORIGINS", "http://localhost:3000"
).split(",")

# ── Runtime ───────────────────────────────────────────────────────────────────
ENVIRONMENT: str = os.environ.get("ENVIRONMENT", "development")
