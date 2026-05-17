"""Risk scoring router — 3 Groq-powered endpoints for contractor reliability."""
import httpx
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from db.supabase_client import supabase
from config import GROQ_API_KEY

router = APIRouter()

GROQ_BASE = "https://api.groq.com/openai/v1"
GROQ_MODEL = "llama-3.3-70b-versatile"
TIMEOUT = 10


async def _groq_json(system: str, user: str) -> dict:
    """Call Groq and return parsed JSON. Forces json_object mode."""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(
            f"{GROQ_BASE}/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": GROQ_MODEL,
                "response_format": {"type": "json_object"},
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            },
        )
        r.raise_for_status()
        return json.loads(r.json()["choices"][0]["message"]["content"])


async def _groq_text(system: str, user: str) -> str:
    """Call Groq and return plain text."""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(
            f"{GROQ_BASE}/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": GROQ_MODEL,
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            },
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()


def _days_inactive(last_update_iso: str) -> int:
    last = datetime.fromisoformat(last_update_iso.replace("Z", "+00:00"))
    return (datetime.now(timezone.utc) - last).days


@router.post("/score/{contractor_id}")
async def score_contractor(contractor_id: str, x_user_id: str = Header(...)):
    try:
        c = supabase.table("contractors").select("*").eq("id", contractor_id).eq("user_id", x_user_id).single().execute()
        if not c.data:
            raise HTTPException(status_code=404, detail="Contractor not found")
        contractor = c.data

        total_paid = contractor.get("total_paid") or 0
        days = _days_inactive(contractor["last_update"])

        result = await _groq_json(
            system="You are a payment risk analyst. Return ONLY valid JSON. No prose. No markdown.",
            user=f"""Contractor: {contractor['name']}, Role: {contractor.get('role', 'unknown')}
Total paid: ₹{total_paid:.2f}
Days inactive: {days}
Notes: {contractor.get('notes') or 'none'}

Return exactly: {{"score": 0-100, "reason": "max 12 words", "action": "pay|hold|investigate"}}
Score meaning: 0=fully reliable, 100=ghost risk/disappeared""",
        )

        supabase.table("contractors").update({
            "risk_score":  result.get("score", 0),
            "risk_reason": result.get("reason", ""),
            "risk_action": result.get("action", "pay"),
        }).eq("id", contractor_id).execute()

        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/brief/{contractor_id}")
async def audit_brief(contractor_id: str, x_user_id: str = Header(...)):
    try:
        c = supabase.table("contractors").select("*").eq("id", contractor_id).eq("user_id", x_user_id).single().execute()
        if not c.data:
            raise HTTPException(status_code=404, detail="Contractor not found")
        contractor = c.data

        receipts = supabase.table("transactions").select("amount,merchant,created_at").eq("contractor_id", contractor_id).execute()
        payments = receipts.data or []
        total_paid = sum(p.get("amount", 0) for p in payments)
        days = _days_inactive(contractor["last_update"])

        brief = await _groq_text(
            system="You are a senior financial auditor. Write exactly 3 sentences. Direct, factual, professional.",
            user=f"""Write an audit brief for: {contractor['name']} ({contractor.get('role', 'contractor')})
Total paid: ₹{total_paid:.2f} across {len(payments)} payments
Risk score: {contractor.get('risk_score', 0)}/100
Last active: {days} days ago
Notes: {contractor.get('notes') or 'none'}

3 sentences only. End with a clear recommendation (pay / hold / investigate).""",
        )

        return JSONResponse(content={"brief": brief})

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/brief/stream/{contractor_id}")
async def audit_brief_stream(contractor_id: str, x_user_id: str = Header(...)):
    """Streams the audit brief token-by-token — gives the live ChatGPT typewriter effect."""
    try:
        c = supabase.table("contractors").select("*").eq("id", contractor_id).eq("user_id", x_user_id).single().execute()
        if not c.data:
            raise HTTPException(status_code=404, detail="Contractor not found")
        contractor = c.data

        receipts = supabase.table("transactions").select("amount,merchant,created_at").eq("contractor_id", contractor_id).execute()
        payments = receipts.data or []
        total_paid = sum(p.get("amount", 0) for p in payments)
        days = _days_inactive(contractor["last_update"])

        payload = {
            "model": GROQ_MODEL,
            "stream": True,
            "messages": [
                {"role": "system", "content": "You are a senior financial auditor. Write exactly 3 sentences. Direct, factual, professional."},
                {"role": "user", "content": f"""Write an audit brief for: {contractor['name']} ({contractor.get('role', 'contractor')})
Total paid: ₹{total_paid:.2f} across {len(payments)} payments
Risk score: {contractor.get('risk_score', 0)}/100
Last active: {days} days ago
Notes: {contractor.get('notes') or 'none'}

3 sentences only. End with a clear recommendation (pay / hold / investigate)."""},
            ],
        }

        async def token_stream():
            async with httpx.AsyncClient(timeout=30) as client:
                async with client.stream(
                    "POST",
                    f"{GROQ_BASE}/chat/completions",
                    headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                    json=payload,
                ) as r:
                    async for line in r.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            obj = json.loads(data)
                            token = obj["choices"][0]["delta"].get("content", "")
                            if token:
                                yield token
                        except Exception:
                            pass

        return StreamingResponse(token_stream(), media_type="text/plain; charset=utf-8")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts")
async def ghost_alerts(x_user_id: str = Header(...)):
    try:
        # Contractors inactive 7+ days with risk score > 40
        res = supabase.table("contractors").select("*").eq("user_id", x_user_id).gt("risk_score", 40).execute()
        contractors = res.data or []

        alerts = []
        for contractor in contractors:
            days = _days_inactive(contractor["last_update"])
            if days < 7:
                continue

            receipts = supabase.table("transactions").select("amount").eq("contractor_id", contractor["id"]).execute()
            amount_at_risk = sum(p.get("amount", 0) for p in (receipts.data or []))

            alert_text = await _groq_text(
                system="Write one urgent factual sentence for a business owner. No filler. No emoji.",
                user=f"{contractor['name']} ({contractor.get('role', 'contractor')}) inactive {days} days. ₹{amount_at_risk:.2f} at risk. Score: {contractor['risk_score']}/100.",
            )

            alerts.append({
                "contractor_id":   contractor["id"],
                "contractor_name": contractor["name"],
                "alert_text":      alert_text,
                "amount_at_risk":  amount_at_risk,
                "days_inactive":   days,
            })

        return JSONResponse(content=alerts)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
