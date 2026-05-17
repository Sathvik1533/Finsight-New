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
