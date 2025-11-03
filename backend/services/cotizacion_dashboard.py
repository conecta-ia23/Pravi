# services/cotizacion_dashboard.py
import pandas as pd
import asyncio, math, bisect
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
    

    @staticmethod
    def _percentile(arr: List[float], p: float) -> float:
        if not arr: return 0.0
        s = sorted(arr)
        if len(s) == 1: return float(s[0])
        k = (p/100.0) * (len(s) - 1)
        f = math.floor(k); c = math.ceil(k)
        if f == c: return float(s[f])
        return float(s[f] * (c - k) + s[c] * (k - f))

    def _load_areas_sync(self, limit: int = 5000, page_size: int = 1000) -> List[float]:
        """
        Carga 'area_m2' paginando via PostgREST (sin SQL crudo).
        Lee como máx. 'limit' filas para no demorar.
        """
        values: List[float] = []
        offset = 0
        while len(values) < limit:
            start = offset
            end = min(offset + page_size - 1, limit - 1)
            # Solo la columna necesaria + filtro básico
            resp = (
                self.client.table("cotizaciones")
                .select("area_m2")
                .gt("area_m2", 0)             # > 0
                .order("fecha_hora", desc=True)  # para traer lo más reciente primero
                .range(start, end)
                .execute()
            )
            rows = resp.data or []
            for r in rows:
                v = r.get("area_m2")
                if v is not None:
                    try:
                        fv = float(v)
                        if fv > 0:
                            values.append(fv)
                    except Exception:
                        continue
            # Si vino menos que el page_size, no hay más
            if len(rows) < (end - start + 1):
                break
            offset += page_size
        # recorta a 'limit' por si acaso
        return values[:limit]
    
    async def histogram(self, bin: int = 5, clip: bool = True, limit: int = 5000) -> Dict[str, Any]:
        """
        Histograma calculado en Python.
        - bin: ancho del bin (m²).
        - clip: recorta outliers por percentiles 1–99 si hay >=20 puntos.
        - limit: máximo de filas a leer desde Supabase para no demorar.
        """
        if bin <= 0: bin = 5

        # Supabase client es sync → correr en thread
        values = await asyncio.to_thread(self._load_areas_sync, limit, 1000)
        if not values:
            return {"bins": [], "mean": 0.0, "median": 0.0, "count": 0}

        vals = values
        if clip and len(vals) >= 20:
            p1 = self._percentile(vals, 1)
            p99 = self._percentile(vals, 99)
            vals = [v for v in vals if p1 <= v <= p99]
            if not vals:  # fallback por si se vacía
                vals = values

        # stats
        mean = sum(vals) / len(vals)
        median = self._percentile(vals, 50)

        # binning eficiente con bisect
        v_sorted = sorted(vals)
        vmin, vmax = min(v_sorted), max(v_sorted)
        start = math.floor(vmin / bin) * bin
        end = math.ceil(vmax / bin) * bin
        bins: List[Dict[str, Any]] = []

        left = bisect.bisect_left(v_sorted, start)
        x = start
        while x < end:
            y = x + bin
            right = bisect.bisect_left(v_sorted, y, lo=left)  # busca desde 'left'
            count = right - left
            bins.append({
                "from": int(x),
                "to": int(y),
                "range": f"{int(x)}–{int(y)}",
                "count": int(count),
            })
            left = right
            x = y

        return {
            "bins": bins,
            "mean": round(mean, 2),
            "median": round(median, 2),
            "count": len(vals),
        }