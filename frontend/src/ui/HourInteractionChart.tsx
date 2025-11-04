// src/ui/HourlyInteractionsChart.tsx
import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, ReferenceLine } from "recharts";
import { fetchClients } from "../services/api";

type TableMetricRow = {
  hora_primera_interaccion?: number | null;
  primera_interaccion?: string | null;
};

type Props = {
  title?: string;
  timezone?: string; // por defecto America/Lima
};

function toLimaHour(iso?: string | null, tz = "America/Lima") {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  // obtener hora local en tz Lima de 0-23
  const parts = new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    hour12: false,
    timeZone: tz,
  }).formatToParts(d);
  const hourStr = parts.find(p => p.type === "hour")?.value ?? "0";
  return Number(hourStr);
}

export default function HourlyInteractionsChart({ title = "Actividad por hora (24h)", timezone = "America/Lima" }: Props) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<TableMetricRow[]>([]);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const resp = await fetchClients();
        // el endpoint puede devolver array directo o {data:[]}
        const data: TableMetricRow[] = Array.isArray(resp) ? resp : (resp?.data ?? resp?.items ?? []);
        if (!aborted) setRows(data);
      } catch (e: any) {
        if (!aborted) setErr(e?.message ?? "Error al cargar métricas");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, []);

  const { data, total, peakHour } = useMemo(() => {
    // inicializar 24 horas
    const counts = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
    for (const r of rows) {
      let h: number | null = (r.hora_primera_interaccion ?? null) as number | null;
      if (h == null || !Number.isFinite(h)) {
        h = toLimaHour(r.primera_interaccion, timezone);
      }
      if (h != null && h >= 0 && h <= 23) {
        counts[h].count += 1;
      }
    }
    const total = counts.reduce((a, b) => a + b.count, 0);
    let peakHour = counts[0].hour;
    let peakVal = counts[0].count;
    for (const c of counts) {
      if (c.count > peakVal) { peakVal = c.count; peakHour = c.hour; }
    }
    // mapea hour-> etiqueta “00, 01, … 23”
    const data = counts.map(c => ({ label: c.hour.toString().padStart(2, "0"), count: c.count, hour: c.hour }));
    return { data, total, peakHour };
  }, [rows, timezone]);

  return (
    <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--card-foreground)]">{title}</h3>
        <div className="text-xs text-[var(--muted-foreground)]">
          {loading ? "Cargando…" : `muestras: ${total} · pico: ${String(peakHour).padStart(2,"0")}h`}
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
              dataKey="label"
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <Tooltip
              contentStyle={{ background: "var(--popover)", border: "1px solid var(--popover-foreground)", borderRadius: 12 }}
              labelStyle={{ color: "var(--popover-foreground)" }}
              itemStyle={{ color: "var(--popover-foreground)" }}
              formatter={(value: number, name: string) => {
                if (name === "count") return [value, "Interacciones"];
                return [value, name];
              }}
              labelFormatter={(l) => `${l}:00–${l}:59`}
            />
            {/* Línea de referencia en el pico */}
            <ReferenceLine x={String(peakHour).padStart(2, "0")} stroke="var(--ring)" ifOverflow="extendDomain" />
            <Bar dataKey="count" name="Interacciones" radius={[8, 8, 0, 0]} fill="var(--accent)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-[var(--border)] bg-zinc-950/40 p-3">
          <div className="text-[var(--muted-foreground)]">Total interacciones</div>
          <div className="text-[var(--muted-foreground)] font-semibold">{total}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-zinc-950/40 p-3">
          <div className="text-[var(--muted-foreground)]">Hora pico</div>
          <div className="text-[var(--muted-foreground)] font-semibold">{String(peakHour).padStart(2, "0")}:00</div>
        </div>
      </div>
    </div>
  );
}
