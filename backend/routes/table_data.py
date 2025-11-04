from fastapi import APIRouter, Query
from typing import Optional, Literal
from datetime import datetime
import pandas as pd
import numpy as np
from services.database_manager import SupabaseManager
from services.database_module import DataProcessor
from services.data_utils import sanitize_dataframe

router = APIRouter(prefix="/table-data", tags=["Table Data"])
db = SupabaseManager()

@router.get("/metrics") # Endpoint para validar // no se usa en ningún gráfico hasta el momento
async def get_table_metrics():
    data = await db.get_clients_page(page=1, size=50)
    return {
        "total": len(data),
        "preview": data[:5]  # solo muestra los primeros 5 registros
    }

def _filter_current_month(df: pd.DataFrame, date_col: str = "primera_interaccion") -> pd.DataFrame:
    if df.empty or date_col not in df.columns:
        return df
    now = datetime.utcnow()
    start = datetime(now.year, now.month, 1)
    # primer día del mes siguiente
    if now.month == 12:
        end = datetime(now.year + 1, 1, 1)
    else:
        end = datetime(now.year, now.month + 1, 1)
    mask = (df[date_col] >= start) & (df[date_col] < end)
    return df.loc[mask].copy()

def _dist(df: pd.DataFrame, col: str) -> dict:
    if df.empty:
        return {}
    s = df[col].fillna("null") if col in df.columns else pd.Series(dtype=object)
    # pasar a str para evitar claves no serializables
    s = s.astype(str).replace({"": "null"})
    return s.value_counts().to_dict()

@router.get("/charts")
async def get_table_chart_data(
    scope: Literal["total", "mes_actual"] = Query("total", description="total | mes_actual")
):
    # 1) Traer datos (todos) y derivar (seguimiento/calificación requieren derivación)
    raw = await db.get_all_clients()
    df = DataProcessor.transform_data(raw) if raw else pd.DataFrame()

    # 2) Filtrar mes si aplica
    df_scope = _filter_current_month(df) if scope == "mes_actual" else df

    estilo_counts         = _dist(df_scope, "estilo")
    seguimiento_counts  = _dist(df_scope, "seguimiento")     # Agendado / Seguimiento / No Cliente (derivado)
    calificacion_counts = _dist(df_scope, "calificacion")    # 1..5 (derivado por DataProcessor)
    categoria_counts    = _dist(df_scope, "categoria")

    return {
        "scope": scope,                # opcional; quítalo si no lo quieres
        "estilo": estilo_counts,           
        "seguimiento": seguimiento_counts,
        "calificacion": calificacion_counts,
        "categoria": categoria_counts,
    }

@router.get("/clients")
async def get_clients(
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(20, ge=1, le=50, description="Registros por página (máx. 50)"),
    telefono: Optional[str] = Query(None),
    nombre: Optional[str] = Query(None),
    estilo: Optional[str] = Query(None),
    presupuesto: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    # Filtros adicionales que ya tienes en DataProcessor
    mes: Optional[str] = Query(None),
    año: Optional[str] = Query(None),
    tipo_cliente: Optional[str] = Query(None),
    seguimiento: Optional[str] = Query(None, description="Agendado | Seguimiento | No Cliente"),
    calificacion: Optional[str] = Query(None, description="Ej: '1: Cliente Frío'"),
    calificacion_nivel: Optional[int] = Query(None, description="0..5"),
):
    # Preparar filtros para la base de datos
    db_filtros = {
        "telefono": telefono,
        "nombre": nombre,
        "estilo": estilo,
        "presupuesto": presupuesto,
        "categoria": categoria,
        "fecha_desde": fecha_desde,
        "fecha_hasta": fecha_hasta
    }
    
    # Filtros para el procesamiento local (más complejos)
    local_filtros = {
        "mes": mes,
        "año": año,
        "tipo_cliente": tipo_cliente,
        "seguimiento": seguimiento,
        "calificacion": calificacion,
        "calificacion_nivel": calificacion_nivel,
    }
    
    try:

        # Detecta si hay filtros DERIVADOS (no existen en BD) -> paginar después
        has_calificacion = (calificacion not in (None, "")) or (calificacion_nivel is not None)
        has_seguimiento_derivado = seguimiento in {"Agendado", "Seguimiento", "No Cliente"}
        has_local_heavy = has_calificacion or has_seguimiento_derivado

        if not has_local_heavy:
            # Camino rápido: pagina en BD
            result = await db.get_clients_paginated(page, size, db_filtros)
            df = DataProcessor.transform_data(result["data"]) if result["data"] else pd.DataFrame()
            # Filtros locales livianos
            if any(v for v in local_filtros.values() if v not in (None, "")):
                df = DataProcessor.filter_data(df, local_filtros)

            records = sanitize_dataframe(df) if not df.empty else []
            return {
                "total": result["total"],
                "data": records,
                "page": page,
                "size": size,
                "total_pages": (result["total"] + size - 1) // size,
                "current_page_count": len(records),
                "client_stats": DataProcessor.get_client_counts(df),
            }
        else:
        # Camino para calificación (y otros derivados): traer todo -> derivar -> filtrar -> paginar en memoria
            raw = await db.get_all_clients_allpages()
            df = DataProcessor.transform_data(raw) if raw else pd.DataFrame()

        if any(v for v in local_filtros.values() if v not in (None, "")):
            df = DataProcessor.filter_data(df, local_filtros)

        total_filtered = len(df)
        start, end = (page - 1) * size, (page - 1) * size + size
        page_df = df.iloc[start:end].copy() if total_filtered else pd.DataFrame()
        records = sanitize_dataframe(page_df) if not page_df.empty else []

        return {
            "total": total_filtered,  # << total coherente con el filtrado
            "data": records,
            "page": page,
            "size": size,
            "total_pages": (total_filtered + size - 1) // size,
            "current_page_count": len(records),
            "client_stats": DataProcessor.get_client_counts(page_df),
        }

        
    except Exception as e:
        print(f"Error en get_clients: {str(e)}")
        return {
            "total": 0,
            "data": [],
            "page": page,
            "size": size,
            "total_pages": 0,
            "current_page_count": 0,
            "client_stats": {"total": 0, "con_cita": 0, "sin_cita": 0},
            "error": "Error al obtener datos"
        }

