from fastapi import APIRouter, Query
from typing import Optional
import pandas as pd
import numpy as np
from services.database_manager import SupabaseManager
from services.database_module import DataProcessor
from services.data_utils import sanitize_dataframe

router = APIRouter(prefix="/table-data", tags=["Table Data"])
db = SupabaseManager()

@router.get("/metrics")
async def get_table_metrics():
    data = await db.get_clients_page(page=1, size=50)
    return {
        "total": len(data),
        "preview": data[:5]  # solo muestra los primeros 5 registros
    }

@router.get("/charts")
async def get_table_chart_data():
    data = await db.get_clients_page(page=1, size=50)
    counts = {}
    for cliente in data:
        estilo = cliente.get("estilo", "Desconocido")
        counts[estilo] = counts.get(estilo, 0) + 1

    return {
        "estilo": counts
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
        "tipo_cliente": tipo_cliente
    }
    
    try:
        # Obtener datos paginados con filtros básicos aplicados en la base de datos
        result = await db.get_clients_paginated(page, size, db_filtros)
        
        # Procesar datos con DataProcessor (enriquecimiento + filtros locales)
        if result["data"]:
            # Convertir a DataFrame y enriquecer
            df = DataProcessor.transform_data(result["data"])
            
            # Aplicar filtros locales más complejos si existen
            if any(v for v in local_filtros.values() if v):
                df = DataProcessor.filter_data(df, local_filtros)
                
                # Si después del filtrado local quedaron muy pocos registros,
                # podríamos necesitar obtener más páginas, pero por simplicidad
                # mantenemos el comportamiento actual
        else:
            df = pd.DataFrame()
        
        # Sanitizar y preparar respuesta
        records = sanitize_dataframe(df) if not df.empty else []
        
        # Calcular estadísticas útiles
        client_counts = DataProcessor.get_client_counts(df)
        
        return {
            "total": result["total"],
            "data": records,
            "page": page,
            "size": size,
            "total_pages": (result["total"] + size - 1) // size,
            "current_page_count": len(records),
            "client_stats": client_counts
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

