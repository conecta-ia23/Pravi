# services/cotizaciones_manager.py
from typing import Dict, Any, List, Tuple, Optional
import pandas as pd
import pytz
import asyncio
from datetime import datetime
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

class CotizacionesManager:
    def __init__(self):
        self.client = create_client(SUPABASE_URL, SUPABASE_KEY)

        # Metodos adicionales para la tabla Cotizaciones serán añadidos aquí.

    async def get_cotizaciones_page(
        self,
        page: int = 1,
        size: int = 30,
        q: Optional[str] = None,
        sort_key: str = "fecha_hora",
        sort_dir: str = "desc",
    ) -> Tuple[int, List[Dict[str, Any]]]:
        table = "cotizaciones"
        from_idx = (page - 1) * size
        to_idx = from_idx + size - 1

        # Conteo
        base = self.client.table(table).select("id", count="exact", head=True)
        if q and q.strip():
            like = f"%{q.strip()}%"
            base = self.client.table(table).select("id", count="exact", head=True).or_(
                f"nombre.ilike.{like},telefono.ilike.{like},correo.ilike.{like},"
                f"proyecto.ilike.{like},estilo.ilike.{like},distrito.ilike.{like}"
            )
        count_res = base.execute()
        total = count_res.count or 0

        # Datos
        sel = self.client.table(table).select(
            "id,created_at,fecha_hora,nombre,telefono,correo,proyecto,estilo,espacios,"
            "area_m2,habitaciones,tiempo,distrito,diseno,mobiliario,acabados,precio_final"
        )
        if q and q.strip():
            like = f"%{q.strip()}%"
            sel = sel.or_(
                f"nombre.ilike.{like},telefono.ilike.{like},correo.ilike.{like},"
                f"proyecto.ilike.{like},estilo.ilike.{like},distrito.ilike.{like}"
            )

        sortable = {
            "fecha_hora","nombre","telefono","correo","proyecto","estilo",
            "area_m2","habitaciones","distrito","precio_final","diseno"
        }
        if sort_key not in sortable:
            sort_key = "fecha_hora"

        sel = sel.order(sort_key, desc=(sort_dir != "asc")).range(from_idx, to_idx)
        data = sel.execute().data or []
        return total, data

    async def get_all_cotizaciones(self, chunk_size: int = 1000) -> List[Dict[str, Any]]:
        """
        Trae TODOS los registros de cotizaciones por páginas, sin vistas ni RPC.
        OJO: si la tabla crece mucho, considera mover agregaciones al SQL.
        """
        page = 1
        all_rows: list[dict] = []
        while True:
            total, data = await self.get_cotizaciones_page(page=page, size=chunk_size)
            if not data:
                break

            all_rows.extend(data)

            # Detén cuando alcanzamos el total real informado por Supabase
            if len(all_rows) >= (total or 0):
                break

            page += 1
        return all_rows


    async def list_paginated(
        self,
        page: int = 1,
        size: int = 30,
        q: str | None = None,
        sort_key: str = "fecha_hora",
        sort_dir: str = "desc",
    ) -> Dict[str, Any]:
        total, data = await self.get_cotizaciones_page(
            page=page, size=size, q=q, sort_key=sort_key, sort_dir=sort_dir
        )
        return {"total": total, "page": page, "page_size": size, "data": data}


    # ---------- TESTS (últimos registros) ----------
    async def last5_raw(self) -> List[Dict[str, Any]]:
        """Obtiene los últimos 5 registros sin formatear"""
        resp = await asyncio.to_thread(
            lambda: (self.client.table("cotizaciones")
                     .select("created_at,fecha_hora,nombre,telefono")
                     .order("fecha_hora", desc=True)
                     .limit(5)
                     .execute())
        )
        return resp.data or []

    async def last5_formatted(self, tz: str = "America/Lima") -> List[Dict[str, Any]]:
        """Obtiene los últimos 5 registros con fecha formateada a hora local"""
        rows = await self.last5_raw()
        if not rows:
            return []
        lima = pytz.timezone(tz)
        for r in rows:
            if r.get("fecha_hora"):
                dt = pd.to_datetime(r["fecha_hora"], utc=True).tz_convert(lima)
                r["fecha_hora_lima"] = dt.strftime("%Y-%m-%d %H:%M:%S")
        return rows