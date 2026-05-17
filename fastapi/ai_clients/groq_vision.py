"""
Groq Vision OCR Client — Receipt Text Extraction
Uses Llama 4 Scout (free, vision-capable) for reading receipt images.

Replaces NVIDIA NIM. Same output contract, one less API key.
"""

import httpx
import json
from typing import Dict
from config import GROQ_API_KEY

GROQ_API_BASE = "https://api.groq.com/openai/v1"
GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
TIMEOUT_SECONDS = 15


class OCRException(Exception):
    pass

class LowConfidenceException(OCRException):
    pass

class TimeoutException(OCRException):
    pass

class ParsingException(OCRException):
    pass


async def extract_receipt_data(
    image_base64: str,
    media_type: str = "image/jpeg"
) -> Dict[str, any]:
    """
    Extract structured data from a receipt image using Groq Vision.

    Returns:
        {
            "merchant": str or None,
            "amount": float or None,
            "date": str or None  (YYYY-MM-DD),
            "currency": str      (ISO 4217, default INR),
            "confidence": float  (0.0–1.0)
        }

    Raises:
        LowConfidenceException: confidence < 0.30
        TimeoutException:       API call > 15 s
        ParsingException:       malformed JSON response
    """

    extraction_prompt = """Extract these fields from the receipt image and return ONLY valid JSON:

{
  "merchant": "exact business name as printed",
  "amount": 123.45,
  "date": "YYYY-MM-DD",
  "currency": "INR",
  "confidence": 0.95
}

Rules:
- merchant: the business name (e.g. "Swiggy", "Big Bazaar", "Zomato")
- amount: total amount paid — numeric only, no ₹ symbol
- date: transaction date in YYYY-MM-DD format
- currency: ISO 4217 code (INR for ₹, USD for $)
- confidence: your confidence in the extraction (0.0 to 1.0)
- Use null for any field that is unclear or missing
- Return ONLY the JSON object, no markdown, no explanation"""

    payload = {
        "model": GROQ_VISION_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": extraction_prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{media_type};base64,{image_base64}"
                        }
                    }
                ]
            }
        ],
        "temperature": 0.0,
        "max_tokens": 512,
    }

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{GROQ_API_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json=payload
            )
            response.raise_for_status()

    except httpx.TimeoutException:
        raise TimeoutException(
            f"Groq Vision timeout after {TIMEOUT_SECONDS}s. "
            "Image may be too large or API is overloaded."
        )
    except httpx.HTTPStatusError as e:
        raise OCRException(
            f"Groq Vision API error: {e.response.status_code} — {e.response.text}"
        )

    try:
        response_data = response.json()
        content = response_data["choices"][0]["message"]["content"].strip()

        # Strip markdown code fences if model wraps output
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        extracted_data = json.loads(content)

    except (KeyError, IndexError, json.JSONDecodeError) as e:
        raise ParsingException(
            f"Failed to parse Groq Vision response: {e}. "
            f"Raw: {response.text[:500]}"
        )

    result = {
        "merchant":   extracted_data.get("merchant"),
        "amount":     extracted_data.get("amount"),
        "date":       extracted_data.get("date"),
        "currency":   extracted_data.get("currency", "INR"),
        "confidence": float(extracted_data.get("confidence", 0.0)),
    }

    if result["confidence"] < 0.30:
        raise LowConfidenceException(
            f"OCR confidence too low: {result['confidence']:.2f}. "
            "Retake the photo with better lighting."
        )

    if result["amount"] is not None:
        try:
            result["amount"] = float(result["amount"])
        except (ValueError, TypeError):
            result["amount"] = None

    return result


async def test_ocr_connection() -> bool:
    """Health-check: verify Groq API is reachable."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(
                f"{GROQ_API_BASE}/models",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"}
            )
            return r.status_code == 200
    except Exception:
        return False
