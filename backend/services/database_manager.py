import os
import json
import time
import asyncio
from typing import List, Dict, Any, Optional, Callable, cast
from concurrent.futures import ThreadPoolExecutor
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY
import logging

class SupabaseManager:
    """
    Conexión a Supabase y métodos async puros:
      - get_total_count
      - get_clients_page
      - get_client_by_phone
      - transform_data
    No mantiene estado ni timers.
    """
    def __init__(self, url: Optional[str] = None, key: Optional[str] = None):
        supabase_url = url if url is not None else SUPABASE_URL
        supabase_key = key if key is not None else SUPABASE_KEY
        if supabase_url is None or supabase_key is None:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be provided and not None.")
        self.client: Client = create_client(supabase_url, supabase_key)

    async def get_total_count(self, table: str = "clients_pravi") -> int:
        resp = await asyncio.to_thread(
            lambda: self.client.table(table).select("id", count="exact").execute()
        )
        return len(resp.data) or 0

    async def get_clients_page(
        self, page: int = 1, size: int = 50,
        table: str = "clients_pravi"
    ) -> List[Dict[str, Any]]:
        start, end = (page-1)*size, page*size-1
        resp = await asyncio.to_thread(
            lambda: self.client.table(table)
                              .select("*")
                              .order("ultima_interaccion", desc=True)
                              .range(start, end)
                              .execute()
        )
        return self.transform_data(resp.data or [])

    async def get_client_by_phone(
        self, phone: str,
        table: str = "clients_pravi",
        phone_col: str = "telefono"
    ) -> Optional[Dict[str, Any]]:
        resp = await asyncio.to_thread(
            lambda: self.client.table(table)
                              .select("*")
                              .eq(phone_col, phone)
                              .execute()
        )
        return (resp.data or [None])[0]

    async def get_all_clients(self, table: str = "clients_pravi") -> List[Dict[str, Any]]:
        resp = await asyncio.to_thread(
            lambda: self.client.table(table)
                              .select("*")
                              .execute()
        )
        return resp.data or []

    #MODIFICAR PARA QUE USE FILTROS DE PRAVI
    async def get_clients_by_estile(self, estilo: str, table: str = "clients_pravi") -> List[Dict[str, Any]]:
        resp = await asyncio.to_thread(
            lambda: self.client.table(table)
                              .select("*")
                              .eq("estilo", estilo)
                              .execute()
        )
        return resp.data or []

    # Nueva función para paginación con filtros
    async def get_clients_paginated(
        self, 
        page: int = 1, 
        size: int = 20,
        filtros: Dict[str, Optional[str]] = None,
        table: str = "clients_pravi"
    ) -> Dict[str, Any]:
        """
        Obtiene clientes paginados con filtros aplicados en la base de datos
        """
        filtros = filtros or {}
        
        # Construir consulta base con count
        query = self.client.table(table).select("*", count="exact")
        
        # Aplicar filtros en la consulta
        query = self._apply_filters_to_query(query, filtros)
        
        # Aplicar ordenamiento y paginación
        start, end = (page-1)*size, page*size-1
        query = query.order("ultima_interaccion", desc=True).range(start, end)
        
        # Ejecutar consulta
        resp = await asyncio.to_thread(lambda: query.execute())
        
        return {
            "data": self.transform_data(resp.data or []),
            "total": resp.count or 0
        }
    
    # Nueva función optimizada para obtener solo el conteo con filtros
    async def get_filtered_count(
        self, 
        filtros: Dict[str, Optional[str]] = None,
        table: str = "clients_pravi"
    ) -> int:
        """
        Obtiene el conteo total de registros que cumplen con los filtros
        """
        filtros = filtros or {}
        
        # Construir consulta solo para contar (más eficiente)
        query = self.client.table(table).select("id", count="exact")
        
        # Aplicar filtros
        query = self._apply_filters_to_query(query, filtros)
        
        # Ejecutar consulta
        resp = await asyncio.to_thread(lambda: query.execute())
        
        return resp.count or 0
    
    def _apply_filters_to_query(self, query, filtros: Dict[str, Optional[str]]):
        """
        Aplica filtros a la consulta de Supabase
        """
        # Filtro por teléfono (búsqueda exacta o parcial)
        if filtros.get("telefono"):
            query = query.ilike("telefono", f"%{filtros['telefono']}%")
        
        # Filtro por nombre (búsqueda parcial, insensible a mayúsculas)
        if filtros.get("nombre"):
            query = query.ilike("nombre", f"%{filtros['nombre']}%")
        
        # Filtro por categoría (búsqueda exacta)
        if filtros.get("categoria"):
            query = query.eq("categoria", filtros["categoria"])

        # Filtro por estilo (búsqueda exacta)
        if filtros.get("estilo"):
            query = query.eq("estilo", filtros["estilo"])
        
        # Filtro por presupuesto (búsqueda exacta)
        if filtros.get("presupuesto"):
            query = query.eq("presupuesto", filtros["presupuesto"])

        # Filtros por fecha (rango)
        if filtros.get("fecha_desde"):
            query = query.gte("primera_interaccion", filtros["fecha_desde"])
        
        if filtros.get("fecha_hasta"):
            query = query.lte("primera_interaccion", filtros["fecha_hasta"])
        
        return query
    

    @staticmethod
    def transform_data(
        data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        # Mapea o formatea cada item según tu schema Pydantic
        return data