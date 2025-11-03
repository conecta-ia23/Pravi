# routes/cotizaciones.py
from fastapi import APIRouter, Depends, Query
from config import SUPABASE_KEY, SUPABASE_URL
from services.cotizacion_dashboard import CotizacionDashboard 
from services.cotizacion_manager import CotizacionesManager

router = APIRouter(prefix="/cotizaciones", tags=["cotizaciones"])

def get_cotiz_manager() -> CotizacionesManager:
    return CotizacionesManager()

def get_cotiz_dashboard() -> CotizacionDashboard:
    return CotizacionDashboard()

#Route de Test Unitario
@router.get("/test/last5")
async def test_last5_raw(dash: CotizacionesManager = Depends(get_cotiz_manager)):
    data = await dash.last5_raw()
    return data

@router.get("/list_cotizaciones")
async def list_cotizaciones(
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=200),
    q: str | None = None,
    sort_key: str = "fecha_hora",
    sort_dir: str = "desc",
    mgr: CotizacionesManager = Depends(get_cotiz_manager),
):
    return await mgr.list_paginated(page=page, size=page_size, q=q, sort_key=sort_key, sort_dir=sort_dir)

@router.get("/summary")
async def metrics_summary(mgr: CotizacionDashboard = Depends(get_cotiz_dashboard)):
    return await mgr.summary()

@router.get("/series-monthly")
async def cotizaciones_series_monthly(
    tz: str = Query("America/Lima"),
    mgr: CotizacionDashboard = Depends(get_cotiz_dashboard),
):
    """
    mode=business -> agrupa por fecha_hora (fecha de la cotización)
    mode=ingreso  -> agrupa por coalesce(fecha_hora, created_at)
    tz            -> zona horaria para definir el mes (ej: America/Lima)
    """
    return await mgr.series_monthly(tz=tz)

@router.get("/top-estilo")
async def metrics_top_estilo(limit: int = 5, mgr: CotizacionDashboard = Depends(get_cotiz_dashboard)):
    return await mgr.top_estilo(limit=limit)

@router.get("/top-distrito")
async def metrics_top_distrito(limit: int = 5, mgr: CotizacionDashboard = Depends(get_cotiz_dashboard)):
    return await mgr.top_distrito(limit=limit)

@router.get("/histogram")
async def histogram(
    bin: int = Query(5, ge=1, le=1000),
    clip: int = Query(1, description="1=recorta p1–p99; 0=no recorte"),
    limit: int = Query(5000, ge=100, le=200000),
    mgr: CotizacionDashboard = Depends(get_cotiz_dashboard),
):
    return await mgr.histogram(bin=bin, clip=bool(clip), limit=limit)
