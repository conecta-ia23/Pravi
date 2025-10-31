// src/ui/AreaHistogram.tsx
import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Brush, ReferenceLine, Legend } from "recharts";
import { listCotizaciones } from "../services/apiCotizaciones";
import type { CotizacionRow } from "../types/Cotizacion";

type Props = {
  /** Número de páginas a traer como máximo (para no sobrecargar el front). */
  maxPages?: number;
  /** Tamaño de página al pedir al backend. */
  pageSize?: number;
  /** Paso del bin en m² (p.ej. 5 => 0–5, 5–10, …). */
  binSize?: number;
  /** Mostrar/ocultar limpieza de outliers por percentiles (1–99). */
  clipOutliers?: boolean;
  /** Título opcional de la card */
  title?: string;
};

function percentile(arr: number[], p: number) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const w = idx - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

function makeBins(values: number[], binSize: number) {
  if (values.length === 0) return { bins: [] as Array<{ range: string; from: number; to: number; count: number }>, median: 0, mean: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const start = Math.floor(min / binSize) * binSize;
  const end = Math.ceil(max / binSize) * binSize;
  const bins: Array<{ from: number; to: number; count: number; range: string }> = [];
  for (let f = start; f < end; f += binSize) {
    const t = f + binSize;
    bins.push({ from: f, to: t, count: 0, range: `${f}–${t}` });
  }
  // Contar
  for (const v of values) {
    const idx = Math.min(Math.floor((v - start) / binSize), bins.length - 1);
    if (idx >= 0 && idx < bins.length) bins[idx].count += 1;
  }
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const median = percentile(values, 50);
  return { bins, median, mean };
}

export default function AreaHistogram({
  maxPages = 3,
  pageSize = 200,
  binSize = 5,
  clipOutliers = true,
  title = "Distribución de áreas (m²)",
}: Props) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [areas, setAreas] = useState<number[]>([]);

  useEffect(() => {
    let aborted = false;
    async function load() {
      try {
        setLoading(true);
        setErr(null);
        const collected: number[] = [];
        let page = 1;
        for (let i = 0; i < maxPages; i++) {
          const resp = await listCotizaciones({ page, page_size: pageSize, sort_key: "fecha_hora", sort_dir: "desc" });
          const rows: CotizacionRow[] = resp?.data ?? [];
          for (const r of rows) {
            const n = Number(r.area_m2);
            if (Number.isFinite(n) && n > 0) collected.push(n);
          }
          // cortar si ya no hay más
          if (!resp || rows.length < pageSize) break;
          page += 1;
          if (aborted) return;
        }
        if (!aborted) setAreas(collected);
      } catch (e: any) {
        if (!aborted) setErr(e?.message ?? "Error al cargar histogram");
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    load();
    return () => { aborted = true; };
  }, [maxPages, pageSize]);

  const { data, median, mean, count } = useMemo(() => {
    if (areas.length === 0) return { data: [] as any[], median: 0, mean: 0, count: 0 };

    let vals = areas.slice();
    if (clipOutliers && vals.length >= 20) {
      const p1 = percentile(vals, 1);
      const p99 = percentile(vals, 99);
      vals = vals.filter(v => v >= p1 && v <= p99);
    }

    const { bins, median, mean } = makeBins(vals, binSize);
    return { data: bins, median, mean, count: vals.length };
  }, [areas, binSize, clipOutliers]);

  return (
    <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--card-foreground)]">{title}</h3>
        <div className="text-xs text-[var(--muted-foreground)]">
          {loading ? "Cargando…" : `${count} muestras · bin ${binSize} m²`}
        </div>
      </div>

      {err && (
        <div className="mb-3 rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="h-72 w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="range"
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              interval={0}
              minTickGap={8}
              angle={-25}
              height={50}
            />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ background: "var(--popover)", border: "1px solid var(--popover-foreground)", borderRadius: 12 }}
              labelStyle={{ color: "var(--popover-foreground)" }}
              itemStyle={{ color: "var(--popover-foreground)" }}
              formatter={(value: number, name) => {
                if (name === "count") return [value, "Leads"];
                return [value, name];
              }}
            />
            <Legend
              wrapperStyle={{ color: "var(--muted-foreground)" }}
            />
            <Bar dataKey="count" name="Leads" radius={[8, 8, 0, 0]} fill="var(--chart-1)" />
            {/* Líneas de referencia (media y mediana) */}
            {data.length > 0 && (
              <>
                {/* Para ubicarlas en X, buscamos el bin cuyo centro está más cerca de la mediana/media */}
                <ReferenceLine x={closestBinLabel(data, median)} label={{ value: `Mediana ~${median.toFixed(1)} m²`, fill: "var(--muted-foreground)", fontSize: 11 }} stroke="var(--ring)" ifOverflow="extendDomain" />
                <ReferenceLine x={closestBinLabel(data, mean)} label={{ value: `Media ~${mean.toFixed(1)} m²`, fill: "var(--muted-foreground)", fontSize: 11, position: "insideTopRight" }} stroke="var(--muted-foreground)" ifOverflow="extendDomain" />
              </>
            )}
            <Brush dataKey="range" travellerWidth={10} height={24} stroke="var(--border)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-[var(--border)] bg-zinc-950/40 p-3">
          <div className="text-[var(--muted-foreground)]">Media</div>
          <div className="text-[var(--card-foreground)] font-semibold">{mean ? `${mean.toFixed(1)} m²` : "—"}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-zinc-950/40 p-3">
          <div className="text-[var(--muted-foreground)]">Mediana</div>
          <div className="text-[var(--card-foreground)] font-semibold">{median ? `${median.toFixed(1)} m²` : "—"}</div>
        </div>
      </div>
    </div>
  );
}

/** Encuentra la etiqueta del bin cuyo centro está más cerca de un valor. */
function closestBinLabel(
  bins: Array<{ from: number; to: number; range: string }>,
  v: number
) {
  if (!bins.length) return undefined;
  let best = bins[0];
  let bestD = Math.abs((bins[0].from + bins[0].to) / 2 - v);
  for (const b of bins) {
    const center = (b.from + b.to) / 2;
    const d = Math.abs(center - v);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best.range;
}
