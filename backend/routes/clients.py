#routes: /clients
from fastapi import APIRouter, Depends, HTTPException
from services.database_manager import SupabaseManager
from typing import List
from schemas.client import ClientOut

router = APIRouter()

# Inyección del servicio
async def get_manager():
    return SupabaseManager()

@router.get("/", response_model=List[ClientOut])
async def list_clients(
    page: int = 1,
    size: int = 50,
    manager: SupabaseManager = Depends(get_manager)
):
    try:
        data = await manager.get_clients_page(page, size)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/count")
async def total_count(
    manager: SupabaseManager = Depends(get_manager)
):
    try:
        count = await manager.get_total_count()
        return {"total": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))