"""
OCR Data Models — Pydantic schemas for receipt extraction
Defines the structure of OCR input/output for type safety and validation.
"""

from pydantic import BaseModel, Field
from typing import Optional


class OCRInput(BaseModel):
    """
    Input data for OCR extraction.
    Sent from Next.js BFF to FastAPI.
    """
    image_base64: str = Field(
        ...,
        description="Base64-encoded receipt image",
        min_length=100  # Sanity check: real images are much larger
    )
    media_type: str = Field(
        default="image/jpeg",
        description="MIME type of the image",
        pattern="^(image/jpeg|image/png|image/webp|application/pdf)$"
    )
    receipt_id: str = Field(
        ...,
        description="UUID of the receipt record in database"
    )
    user_id: str = Field(
        ...,
        description="UUID of the user who uploaded the receipt"
    )


class OCROutput(BaseModel):
    """
    Output data from OCR extraction.
    Returned by NVIDIA NIM client.
    """
    merchant: Optional[str] = Field(
        None,
        description="Merchant name as printed on receipt",
        max_length=200
    )
    amount: Optional[float] = Field(
        None,
        description="Total amount paid (numeric only)",
        ge=0.0  # Must be non-negative
    )
    date: Optional[str] = Field(
        None,
        description="Transaction date in YYYY-MM-DD format",
        pattern=r"^\d{4}-\d{2}-\d{2}$"
    )
    currency: str = Field(
        default="INR",
        description="ISO 4217 currency code",
        min_length=3,
        max_length=3
    )
    confidence: float = Field(
        ...,
        description="OCR confidence score (0.0 to 1.0)",
        ge=0.0,
        le=1.0
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "merchant": "Swiggy",
                "amount": 450.00,
                "date": "2024-01-12",
                "currency": "INR",
                "confidence": 0.92
            }
        }
