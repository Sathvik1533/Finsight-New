"""Contractors CRUD router — manages contractor records for risk scoring."""
from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from db.supabase_client import supabase

router = APIRouter()


class ContractorCreate(BaseModel):
    name: str
    role: Optional[str] = None
    contact: Optional[str] = None
    notes: Optional[str] = None


class ContractorUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    last_update: Optional[str] = None


@router.get("")
async def list_contractors(x_user_id: str = Header(...)):
    try:
        res = supabase.table("contractors").select("*").eq("user_id", x_user_id).order("created_at", desc=True).execute()
        return JSONResponse(content=res.data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_contractor(body: ContractorCreate, x_user_id: str = Header(...)):
    try:
        data = {"user_id": x_user_id, "name": body.name}
        if body.role:    data["role"] = body.role
        if body.contact: data["contact"] = body.contact
        if body.notes:   data["notes"] = body.notes
        res = supabase.table("contractors").insert(data).execute()
        return JSONResponse(content=res.data[0], status_code=201)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{contractor_id}")
async def get_contractor(contractor_id: str, x_user_id: str = Header(...)):
    try:
        c = supabase.table("contractors").select("*").eq("id", contractor_id).eq("user_id", x_user_id).single().execute()
        if not c.data:
            raise HTTPException(status_code=404, detail="Contractor not found")
        receipts = supabase.table("receipts").select("id,merchant,amount,transaction_date,status").eq("contractor_id", contractor_id).order("created_at", desc=True).execute()
        return JSONResponse(content={**c.data, "receipts": receipts.data or []})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{contractor_id}")
async def update_contractor(contractor_id: str, body: ContractorUpdate, x_user_id: str = Header(...)):
    try:
        updates = {k: v for k, v in body.model_dump().items() if v is not None}
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        res = supabase.table("contractors").update(updates).eq("id", contractor_id).eq("user_id", x_user_id).execute()
        return JSONResponse(content=res.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
