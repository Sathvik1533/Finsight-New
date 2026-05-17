"""
Supabase Database Client — Transaction and Receipt Management
Handles all database writes for the AI pipeline.
"""

from supabase import create_client, Client
from typing import Dict, Optional
from datetime import datetime, timezone
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

class DatabaseException(Exception):
    """Base exception for database errors"""
    pass

async def write_transaction(
    user_id: str,
    receipt_id: str,
    merchant: Optional[str],
    amount: float,
    currency: str,
    transaction_date: str,
    category: str,
    confidence: float,
    categorization_model: str = "groq-llama-3.3-70b",
    gst_head: Optional[str] = None,
    gst_rate: Optional[str] = None,
    itc_eligible: bool = False,
) -> Dict:
    """Write a transaction to the database, including GST metadata."""
    try:
        transaction_data = {
            "user_id": user_id,
            "receipt_id": receipt_id,
            "merchant": merchant,
            "amount": amount,
            "currency": currency,
            "transaction_date": transaction_date,
            "category": category,
            "confidence": confidence,
            "categorization_model": categorization_model,
            "gst_head": gst_head,
            "gst_rate": gst_rate,
            "itc_eligible": itc_eligible,
            "is_business_expense": False,
            "is_manually_corrected": False,
            "is_anomalous": False,
            "is_subscription": False,
        }
        
        response = supabase.table("transactions").insert(transaction_data).execute()
        
        if not response.data or len(response.data) == 0:
            raise DatabaseException("Transaction insert returned no data")
        
        return response.data[0]
        
    except Exception as e:
        raise DatabaseException(f"Failed to write transaction: {str(e)}")

async def update_receipt_status(
    receipt_id: str,
    status: str,
    ocr_confidence: Optional[float] = None,
    ai_model_used: Optional[str] = None,
    gemini_response: Optional[Dict] = None,
    processing_error: Optional[str] = None
) -> Dict:
    """Update receipt status after processing."""
    try:
        update_data = {
            "status": status,
            "processed_at": datetime.now(timezone.utc).isoformat(),
        }
        
        if ocr_confidence is not None:
            update_data["ocr_confidence"] = ocr_confidence
        
        if ai_model_used is not None:
            update_data["ai_model_used"] = ai_model_used
        
        if gemini_response is not None:
            update_data["gemini_response"] = gemini_response
        
        if processing_error is not None:
            update_data["processing_error"] = processing_error
        
        response = supabase.table("receipts").update(update_data).eq("id", receipt_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise DatabaseException("Receipt update returned no data")
        
        return response.data[0]
        
    except Exception as e:
        raise DatabaseException(f"Failed to update receipt: {str(e)}")

async def increment_user_receipt_count(user_id: str) -> int:
    """Increment user's receipt count and recalculate intelligence level."""
    try:
        response = supabase.rpc("increment_receipt_count", {"user_id_param": user_id}).execute()
        
        if response.data is None:
            raise DatabaseException("increment_receipt_count returned None")
        
        return response.data
        
    except Exception as e:
        raise DatabaseException(f"Failed to increment receipt count: {str(e)}")
