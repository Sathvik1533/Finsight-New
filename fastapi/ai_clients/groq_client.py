"""
Groq Categorization Client — Merchant Category Assignment + GST Tagging
Uses Llama 3.3 70B Versatile for fast, accurate categorization.

This module handles:
- Assigning categories from 12-item taxonomy
- GST expense head mapping for Indian tax compliance
- Using merchant history for personalization (Phase 3)
- Handling low confidence scenarios
- Fast inference (~250ms average)
"""

import httpx
import json
from typing import Dict, Optional, List
from config import GROQ_API_KEY


# Groq API Configuration
GROQ_API_BASE = "https://api.groq.com/openai/v1"
GROQ_MODEL = "llama-3.3-70b-versatile"
TIMEOUT_SECONDS = 5  # Groq is fast, 5s is generous


# The 12-Category Taxonomy (Fixed, Not User-Modifiable in V1)
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

# GST expense head mapping — maps each category to Indian GST classification
# Used for CA-ready expense reports and tax filing
GST_MAPPING = {
    "Food & Dining":           {"gst_head": "Food Services",             "gst_rate": "5%",  "itc_eligible": False},
    "Groceries":               {"gst_head": "Essential Goods",           "gst_rate": "0-5%","itc_eligible": False},
    "Transportation":          {"gst_head": "Transport Services",        "gst_rate": "5%",  "itc_eligible": False},
    "Shopping & Retail":       {"gst_head": "Goods & Merchandise",       "gst_rate": "12-18%","itc_eligible": True},
    "Entertainment & Leisure": {"gst_head": "Entertainment Services",    "gst_rate": "18%", "itc_eligible": False},
    "Health & Medical":        {"gst_head": "Healthcare Services",       "gst_rate": "0-5%","itc_eligible": False},
    "Travel & Accommodation":  {"gst_head": "Hospitality & Travel",      "gst_rate": "12-18%","itc_eligible": True},
    "Utilities & Bills":       {"gst_head": "Utility Services",          "gst_rate": "18%", "itc_eligible": True},
    "Software & Subscriptions":{"gst_head": "IT & Software Services",    "gst_rate": "18%", "itc_eligible": True},
    "Business & Professional": {"gst_head": "Professional Services",     "gst_rate": "18%", "itc_eligible": True},
    "Education":               {"gst_head": "Educational Services",      "gst_rate": "0%",  "itc_eligible": False},
    "Other":                   {"gst_head": "Miscellaneous",             "gst_rate": "18%", "itc_eligible": False},
}


class CategorizationException(Exception):
    """Base exception for categorization errors"""
    pass


class TimeoutException(CategorizationException):
    """Raised when Groq API takes too long"""
    pass


class ParsingException(CategorizationException):
    """Raised when response JSON is malformed"""
    pass


async def categorize_transaction(
    merchant: str,
    amount: Optional[float] = None,
    date: Optional[str] = None,
    merchant_history: Optional[List[Dict]] = None
) -> Dict[str, any]:
    """
    Categorize a transaction based on merchant name and context.
    
    Args:
        merchant: Merchant name from OCR (e.g., "Swiggy")
        amount: Transaction amount (optional, helps with context)
        date: Transaction date (optional, helps with context)
        merchant_history: User's past categorizations for this merchant (Phase 3)
    
    Returns:
        Dictionary with categorization result:
        {
            "category": str (one of the 12 allowed categories),
            "confidence": float (0.0 to 1.0),
            "reasoning": str (one sentence explanation),
            "subcategory": str or None (not used in V1)
        }
    
    Raises:
        TimeoutException: If API call exceeds 5 seconds
        ParsingException: If response JSON is invalid
    """
    
    # Step 1: Build the system prompt
    # This tells Groq what its job is and what rules to follow
    system_prompt = f"""You are a financial categorization expert for an Indian expense tracking app.

Your task: Assign ONE category from this exact list:
{chr(10).join(f'{i+1}. {cat}' for i, cat in enumerate(ALLOWED_CATEGORIES))}

Rules:
1. Return ONLY valid JSON with this structure:
   {{"category": "Food & Dining", "confidence": 0.95, "reasoning": "one sentence"}}
2. Category MUST be exactly one of the 12 options above (copy-paste, don't paraphrase)
3. Confidence is 0.0 to 1.0 (how sure you are)
4. Reasoning is ONE sentence explaining why
5. If unsure, use "Other" with lower confidence

Context about Indian merchants:
- Swiggy, Zomato, Uber Eats = Food & Dining
- Big Bazaar, Reliance Fresh, DMart = Groceries
- Uber, Ola, Rapido = Transportation
- Amazon, Flipkart, Myntra = Shopping & Retail
- BookMyShow, Netflix, Spotify = Entertainment & Leisure
- Apollo, Medplus, Practo = Health & Medical
- MakeMyTrip, Goibibo, OYO = Travel & Accommodation
- Airtel, Jio, BSNL, electricity bills = Utilities & Bills
- AWS, Google Cloud, GitHub, Notion = Software & Subscriptions
- Upwork, Fiverr, office supplies = Business & Professional
- Coursera, Udemy, BYJU'S, school fees = Education
"""

    # Step 2: Build the user message with transaction details
    user_message = f"Merchant: {merchant}"
    
    if amount is not None:
        user_message += f"\nAmount: ₹{amount:.2f}"
    
    if date is not None:
        user_message += f"\nDate: {date}"
    
    # Phase 3: Add merchant history context (not used in V1)
    if merchant_history and len(merchant_history) > 0:
        user_message += "\n\nUser's history with this merchant:"
        for entry in merchant_history[:3]:  # Top 3 most frequent
            user_message += f"\n- Previously categorized as: {entry['category']} ({entry['count']} times)"
    
    user_message += "\n\nReturn JSON with category, confidence, and reasoning."
    
    # Step 3: Build the API request payload
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": user_message
            }
        ],
        "temperature": 0.1,  # Near-deterministic (slight variation for edge cases)
        "max_tokens": 256,   # Enough for our JSON response
        "top_p": 1.0,
        "response_format": {"type": "json_object"}  # Forces JSON output
    }
    
    # Step 4: Send request to Groq API
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
        # Groq is usually fast (~250ms), timeout is rare
        # Retry once before failing
        raise TimeoutException(
            f"Groq API timeout after {TIMEOUT_SECONDS} seconds. "
            "Network issue or API overload."
        )
    except httpx.HTTPStatusError as e:
        raise CategorizationException(
            f"Groq API error: {e.response.status_code} - {e.response.text}"
        )
    
    # Step 5: Parse the API response
    try:
        response_data = response.json()
        
        # Extract the AI's message content
        # Response structure: {choices: [{message: {content: "..."}}]}
        content = response_data["choices"][0]["message"]["content"]
        
        # Parse the JSON string into a Python dictionary
        categorization_data = json.loads(content)
        
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        raise ParsingException(
            f"Failed to parse Groq response: {str(e)}. "
            f"Raw response: {response.text[:500]}"
        )
    
    # Step 6: Validate and normalize the result
    category = categorization_data.get("category", "Other")
    confidence = float(categorization_data.get("confidence", 0.0))
    reasoning = categorization_data.get("reasoning", "No reasoning provided")
    
    # Step 7: Enforce taxonomy - reject invalid categories
    if category not in ALLOWED_CATEGORIES:
        # Model invented a category not in our taxonomy
        # Log it for prompt improvement, then override to "Other"
        print(f"WARNING: Invalid category '{category}' returned for merchant '{merchant}'. Overriding to 'Other'.")
        category = "Other"
        confidence = 0.3  # Low confidence for overridden categories
    
    # Step 8: Apply confidence threshold
    if confidence < 0.50:
        # Model is unsure, default to "Other"
        category = "Other"
        # Keep the original confidence for debugging
    
    # Attach GST metadata for Indian tax compliance
    gst_info = GST_MAPPING.get(category, GST_MAPPING["Other"])

    result = {
        "category": category,
        "confidence": confidence,
        "reasoning": reasoning,
        "subcategory": None,
        "gst_head": gst_info["gst_head"],
        "gst_rate": gst_info["gst_rate"],
        "itc_eligible": gst_info["itc_eligible"],
    }

    return result


async def test_groq_connection() -> bool:
    """
    Test if Groq API is reachable and API key is valid.
    Used by the health check endpoint.
    
    Returns:
        True if API is accessible, False otherwise
    """
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(
                f"{GROQ_API_BASE}/models",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"}
            )
            return response.status_code == 200
    except Exception:
        return False
