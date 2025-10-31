# services/cotizacion_dashboard.py
import pandas as pd
import asyncio
import pytz
from datetime import datetime
from typing import List, Dict, Any
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

class CotizacionDashboard:
    def __init__(self):
        # Creamos un cliente fresco en cada instancia (sin cache)
        self.client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.client.postgrest.session.headers.update({
            "Cache-Control": "no-cache"
        })

    # ---------- Helpers internos ----------
    async def _df(self, chunk_size: int = 2000) -> pd.DataFrame:
        """Descarga TODAS las cotizaciones y normaliza columnas clave."""
        all_rows = []
        page = 0
        while True:
            start = page * chunk_size
            end = start + chunk_size - 1
            resp = await asyncio.to_thread(
                lambda: (self.client.table("cotizaciones")
                         .select("id,fecha_hora,created_at,precio_final,area_m2,estilo,distrito")
                         .order("id", desc=False)
                         .range(start, end)
                         .execute())
            )
            chunk = resp.data or []
            all_rows.extend(chunk)
            if len(chunk) < chunk_size:
                break
            page += 1

        df = pd.DataFrame(all_rows)
        required = ["id", "fecha_hora", "created_at", "precio_final", "area_m2", "estilo", "distrito"]
        for c in required:
            if c not in df.columns:
                df[c] = None

        # Convertir a tz-aware
        for col in ["fecha_hora", "created_at"]:
            df[col] = pd.to_datetime(df[col], errors="coerce", utc=True)

        # Normalizar numéricos
        df["precio_final"] = pd.to_numeric(df["precio_final"], errors="coerce")
        df["area_m2"] = pd.to_numeric(df["area_m2"], errors="coerce")
        return df


    # ---------- Métricas sin RPC/Views ----------
    async def summary(self) -> Dict[str, Any]:
        """Métricas globales de cotizaciones."""
        df = await self._df()
        if df.empty:
            return {"total_cotizaciones": 0, "suma_precio": 0, "ticket_promedio": 0, "m2_promedio": 0}
        n = len(df)
        suma = df["precio_final"].fillna(0).sum()
        ticket = suma / n if n else 0
        m2_prom = df["area_m2"].dropna().mean() if n else 0
        return {
            "total_cotizaciones": int(n),
            "suma_precio": float(suma),
            "ticket_promedio": float(ticket),
            "m2_promedio": float(m2_prom),
        }
    

    async def get_cotizaciones_month(self, year: int, month: int, tz: str = "America/Lima") -> Dict[str, Any]:
        """Cuenta y suma del mes (definido en hora local)."""
        lima = pytz.timezone(tz)
        start_local = lima.localize(datetime(year, month, 1))
        if month == 12:
            end_local = lima.localize(datetime(year + 1, 1, 1))
        else:
            end_local = lima.localize(datetime(year, month + 1, 1))

        start_utc = start_local.astimezone(pytz.UTC).isoformat()
        end_utc = end_local.astimezone(pytz.UTC).isoformat()

        # Trae ids (para count exacto) y precio_final (para suma)
        # Nota: count="exact" devuelve el conteo total aunque la página de datos sea limitada.
        resp = await asyncio.to_thread(
            lambda: (self.client.table("cotizaciones")
                     .select("id,precio_final", count="exact")
                     .gte("fecha_hora", start_utc)
                     .lt("fecha_hora", end_utc)
                     .execute())
        )
        total = resp.count or 0
        data = resp.data or []
        suma = 0.0
        for r in data:
            try:
                v = r.get("precio_final")
                if v is None:
                    continue
                suma += float(v)
            except Exception:
                pass
        return {"x": f"{year}-{month:02d}", "total": int(total), "suma_precio": float(suma)}


    async def series_monthly(self, months_back: int = 12, tz: str = "America/Lima") -> List[Dict[str, Any]]:
        """Construye serie de `months_back` meses hacia atrás (en hora local), usando el método mensual."""
        now_local = datetime.now(pytz.timezone(tz))
        serie: List[Dict[str, Any]] = []

        for i in range(months_back):
            y = now_local.year if now_local.month - i > 0 else now_local.year - 1
            m = ((now_local.month - i - 1) % 12) + 1
            item = await self.get_cotizaciones_month(y, m, tz)
            serie.append(item)

        return sorted(serie, key=lambda r: r["x"])


    async def top_estilo(self, limit: int = 5) -> List[Dict[str, Any]]:
        df = await self._df()
        if df.empty:
            return []
        g = (
            df.assign(estilo=df["estilo"].fillna("—"))
              .groupby("estilo")
              .agg(total=("id","count"),
                   suma_precio=("precio_final", lambda x: pd.to_numeric(x, errors="coerce").fillna(0).sum()),
                   promedio=("precio_final", lambda x: pd.to_numeric(x, errors="coerce").dropna().mean() or 0))
              .reset_index()
              .sort_values("suma_precio", ascending=False)
              .head(limit)
        )
        return [
            {"label": r["estilo"], "total": int(r["total"]), "suma_precio": float(r["suma_precio"]), "promedio": float(r["promedio"] or 0)}
            for _, r in g.iterrows()
        ]

    async def top_distrito(self, limit: int = 5) -> List[Dict[str, Any]]:
        df = await self._df()
        if df.empty:
            return []
        g = (
            df.assign(distrito=df["distrito"].fillna("—"))
              .groupby("distrito")
              .agg(total=("id","count"),
                   suma_precio=("precio_final", lambda x: pd.to_numeric(x, errors="coerce").fillna(0).sum()),
                   promedio=("precio_final", lambda x: pd.to_numeric(x, errors="coerce").dropna().mean() or 0))
              .reset_index()
              .sort_values("suma_precio", ascending=False)
              .head(limit)
        )
        return [
            {"label": r["distrito"], "total": int(r["total"]), "suma_precio": float(r["suma_precio"]), "promedio": float(r["promedio"] or 0)}
            for _, r in g.iterrows()
        ]