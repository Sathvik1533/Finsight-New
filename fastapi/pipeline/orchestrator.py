"""
Pipeline Orchestrator — Chains OCR → Categorization → Database
This is the main pipeline that processes receipts end-to-end.
"""

from typing import Dict
from ai_clients.groq_vision import extract_receipt_data, LowConfidenceException, TimeoutException as OCRTimeoutException
from ai_clients.groq_client import categorize_transaction, TimeoutException as CategorizationTimeoutException
from db.supabase_client import write_transaction, update_receipt_status, increment_user_receipt_count, DatabaseException
from datetime import date

class PipelineException(Exception):
    """Base exception for pipeline errors"""
    pass

async def process_receipt(
    image_base64: str,
    media_type: str,
    receipt_id: str,
    user_id: str
) -> Dict:
    """
    Process a receipt through the complete AI pipeline.
    
    Flow:
    1. OCR Extraction (NVIDIA NIM)
    2. Categorization (Groq)
    3. Database Write (Supabase)
    4. Update Receipt Status
    5. Increment User Count
    
    Args:
        image_base64: Base64-encoded receipt image
        media_type: MIME type (image/jpeg, image/png, application/pdf)
        receipt_id: UUID of the receipt record
        user_id: UUID of the user
    
    Returns:
        Dictionary with processing results:
        {
            "status": "success",
            "extraction": {...},
            "categorization": {...},
            "transaction_id": "...",
            "new_intelligence_level": 2
        }
    
    Raises:
        PipelineException: If any stage fails
    """
    
    extraction_result = None
    categorization_result = None
    
    try:
        # Mark as processing early so users can debug stuck/failed receipts.
        await update_receipt_status(
            receipt_id=receipt_id,
            status="processing",
        )

        # ═══════════════════════════════════════════════════════════
        # STAGE 1: OCR EXTRACTION
        # ═══════════════════════════════════════════════════════════
        extraction_result = await extract_receipt_data(image_base64, media_type)
        
        # Check if we got usable data
        if extraction_result["confidence"] < 0.30:
            raise LowConfidenceException(
                f"OCR confidence too low: {extraction_result['confidence']:.2f}"
            )
        
        # ═══════════════════════════════════════════════════════════
        # STAGE 2: CATEGORIZATION
        # ═══════════════════════════════════════════════════════════
        categorization_result = await categorize_transaction(
            merchant=extraction_result.get("merchant") or "Unknown",
            amount=extraction_result.get("amount"),
            date=extraction_result.get("date")
        )
        
        # ═══════════════════════════════════════════════════════════
        # STAGE 3: DATABASE WRITE
        # ═══════════════════════════════════════════════════════════
        
        # Use extracted date or fallback to today
        transaction_date = extraction_result.get("date") or date.today().isoformat()
        
        # Write transaction
        transaction = await write_transaction(
            user_id=user_id,
            receipt_id=receipt_id,
            merchant=extraction_result.get("merchant"),
            amount=extraction_result.get("amount") or 0.0,
            currency=extraction_result.get("currency", "INR"),
            transaction_date=transaction_date,
            category=categorization_result["category"],
            confidence=categorization_result["confidence"],
            categorization_model="groq-llama-3.3-70b",
            gst_head=categorization_result.get("gst_head"),
            gst_rate=categorization_result.get("gst_rate"),
            itc_eligible=categorization_result.get("itc_eligible", False),
        )
        
        # ═══════════════════════════════════════════════════════════
        # STAGE 4: UPDATE RECEIPT STATUS
        # ═══════════════════════════════════════════════════════════
        await update_receipt_status(
            receipt_id=receipt_id,
            status="complete",
            ocr_confidence=extraction_result["confidence"],
            ai_model_used="groq-llama-4-scout-17b",
            gemini_response={
                "extraction": extraction_result,
                "categorization": categorization_result
            }
        )
        
        # ═══════════════════════════════════════════════════════════
        # STAGE 5: INCREMENT USER RECEIPT COUNT
        # ═══════════════════════════════════════════════════════════
        new_intelligence_level = await increment_user_receipt_count(user_id)
        
        # ═══════════════════════════════════════════════════════════
        # RETURN SUCCESS RESULT
        # ═══════════════════════════════════════════════════════════
        return {
            "status": "success",
            "extraction": extraction_result,
            "categorization": categorization_result,
            "transaction_id": transaction["id"],
            "new_intelligence_level": new_intelligence_level
        }
        
    except LowConfidenceException as e:
        # OCR confidence too low - reject receipt
        await update_receipt_status(
            receipt_id=receipt_id,
            status="failed",
            processing_error=str(e)
        )
        raise PipelineException(f"Low confidence: {str(e)}")
        
    except (OCRTimeoutException, CategorizationTimeoutException) as e:
        # Timeout - mark as failed
        await update_receipt_status(
            receipt_id=receipt_id,
            status="failed",
            processing_error=f"Timeout: {str(e)}"
        )
        raise PipelineException(f"Timeout: {str(e)}")
        
    except DatabaseException as e:
        # Database write failed - mark receipt as failed
        await update_receipt_status(
            receipt_id=receipt_id,
            status="failed",
            processing_error=f"Database error: {str(e)}"
        )
        raise PipelineException(f"Database error: {str(e)}")
        
    except Exception as e:
        # Unexpected error - mark as failed
        await update_receipt_status(
            receipt_id=receipt_id,
            status="failed",
            processing_error=f"Unexpected error: {str(e)}"
        )
        raise PipelineException(f"Unexpected error: {str(e)}")
