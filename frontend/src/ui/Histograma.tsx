// src/ui/AreaHistogram.tsx
import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Brush, ReferenceLine, Legend } from "recharts";
import { getAreaHistogram } from "../services/apiCotizaciones";

type Props = {
  /** Paso del bin en m² (p.ej. 5 => 0–5, 5–10, …). */
  binSize?: number;
  /** Recorta outliers por percentiles 1–99 en el backend. */
  clipOutliers?: boolean;
  /** Título opcional de la card */
  title?: string;
};

type HistogramBin = { from: number; to: number; range: string; count: number };
type HistogramResp = {
  bins: HistogramBin[];
  mean: number;
  median: number;
  count: number;
};

export default function AreaHistogram({
  binSize = 5,
  clipOutliers = true,
  title = "Distribución de áreas (m²)", 
}: Props) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [payload, setPayload] = useState<HistogramResp>({
    bins: [],
    mean: 0,
    median: 0,
    count: 0,
  });

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await getAreaHistogram({
          bin: binSize,
          clip: clipOutliers,
          // opcional: limit (si dejaste ese parámetro en el backend python)
          // limit: 5000,
        });
        if (!aborted) {
          setPayload(res);
        }
      } catch (e: any) {
        if (!aborted) setErr(e?.message ?? "Error al cargar histograma");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [binSize, clipOutliers]);

  const data = useMemo(() => payload.bins ?? [], [payload]);
  const mean = payload.mean ?? 0;
  const median = payload.median ?? 0;
  const count = payload.count ?? 0;

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
