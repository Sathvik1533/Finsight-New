"""
Categorization Data Models — Pydantic schemas for category assignment
Defines the structure of categorization input/output for type safety.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict


# The 12-Category Taxonomy (must match groq_client.py)
ALLOWED_CATEGORIES = [
    "Food & Dining",
    "Groceries",
    "Transportation",
    "Shopping & Retail",
    "Entertainment & Leisure",
    "Health & Medical",
    "Travel & Accommodation",
    "Utilities & Bills",
    "Software & Subscriptions",
    "Business & Professional",
    "Education",
    "Other"
]


class CategorizationInput(BaseModel):
    """
    Input data for categorization.
    Sent from orchestrator to Groq client.
    """
    merchant: str = Field(
        ...,
        description="Merchant name from OCR extraction",
        min_length=1,
        max_length=200
    )
    amount: Optional[float] = Field(
        None,
        description="Transaction amount (helps with context)",
        ge=0.0
    )
    date: Optional[str] = Field(
        None,
        description="Transaction date in YYYY-MM-DD format",
        pattern=r"^\d{4}-\d{2}-\d{2}$"
    )
    merchant_history: Optional[List[Dict]] = Field(
        None,
        description="User's past categorizations for this merchant (Phase 3)"
    )


class CategorizationOutput(BaseModel):
    """
    Output data from categorization.
    Returned by Groq client — includes GST mapping for Indian tax compliance.
    """
    category: str = Field(
        ...,
        description="Assigned category from 12-item taxonomy",
        pattern=f"^({'|'.join(ALLOWED_CATEGORIES)})$"
    )
    confidence: float = Field(
        ...,
        description="Categorization confidence score (0.0 to 1.0)",
        ge=0.0,
        le=1.0
    )
    reasoning: str = Field(
        ...,
        description="One sentence explanation for the category choice",
        max_length=500
    )
    subcategory: Optional[str] = Field(None, max_length=100)
    gst_head: str = Field(..., description="Indian GST expense head")
    gst_rate: str = Field(..., description="Applicable GST rate (e.g. '18%')")
    itc_eligible: bool = Field(..., description="Whether Input Tax Credit can be claimed")

    class Config:
        json_schema_extra = {
            "example": {
                "category": "Food & Dining",
                "confidence": 0.95,
                "reasoning": "Swiggy is a food delivery platform",
                "subcategory": None,
                "gst_head": "Food Services",
                "gst_rate": "5%",
                "itc_eligible": False,
            }
        }
