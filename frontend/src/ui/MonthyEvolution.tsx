// src/components/cotizaciones/MonthlyEvolution.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { getMonthlySeries } from "../services/apiCotizaciones";
import type { MonthlyPoint } from "../types/Cotizacion";

type Metric = "total" | "suma_precio";

const monthLabel = (ym: string) => {
  // ym = "YYYY-MM"
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return new Intl.DateTimeFormat("es-PE", { month: "short", year: "numeric" }).format(d);
};

const Card: React.FC<React.PropsWithChildren<{ title?: string; right?: React.ReactNode }>> = ({
  title,
  right,
  children,
}) => (
  <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-2 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm text-[var(--card-foreground)]">{title || "Evolución mensual"}</h3>
      {right}
    </div>
    {children}
  </div>
);

const Skeleton = () => (
  <div className="animate-pulse h-48 bg-[var(--muted)] rounded-lg" />
);

export const MonthlyEvolution: React.FC<{ tz?: string }> = ({ tz = "America/Lima" }) => {
  const [data, setData] = useState<MonthlyPoint[]>([]);
  const [metric, setMetric] = useState<Metric>("total");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await getMonthlySeries(tz);
        if (!mounted) return;
        // Aseguramos tipos numéricos y orden
        const clean = [...res]
          .map(d => ({
            x: d.x,
            total: Number(d.total ?? 0),
            suma_precio: Number(d.suma_precio ?? 0),
          }))
          .sort((a, b) => (a.x < b.x ? -1 : 1));
        setData(clean);
      } catch (e: any) {
        setErr(e?.message || "No se pudo cargar la serie mensual.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [tz]);

  const chartData = useMemo(
    () =>
      data.map(d => ({
        ...d,
        label: monthLabel(d.x),
      })),
    [data]
  );

  const RightControls = (
    <div className="flex items-center gap-2">
      <select
        value={metric}
        onChange={(e) => setMetric(e.target.value as Metric)}
        className="text-[var(--card-foreground)] text-xs rounded-md py-1 border border-[var(--border)] bg-[var(--card)]"
      >
        <option value="total">Leads por mes</option>
        <option value="suma_precio">Suma de precio</option>
      </select>
    </div>
  );

  if (loading) {
    return (
      <Card title="Evolución mensual" right={RightControls}>
        <Skeleton />
      </Card>
    );
  }
  if (err) {
    return (
      <Card title="Evolución mensual" right={RightControls}>
        <div className="text-sm text-red-400">{err}</div>
      </Card>
    );
  }

  return (
    <Card title="Evolución mensual" right={RightControls}>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              axisLine={{ stroke: "#404040" }}
              tickLine={{ stroke: "#404040" }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              axisLine={{ stroke: "#404040" }}
              tickLine={{ stroke: "#404040" }}
              tickFormatter={(v) => (metric === "total" ? `${v}` : `S/ ${Number(v).toLocaleString("es-PE")}`)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              axisLine={{ stroke: "#404040" }}
              tickLine={{ stroke: "#404040" }}
              hide={metric === "total"} // mostramos el derecho solo cuando se grafica monto
            />
            <Tooltip
              formatter={(value: any, name: string) =>
                name === "Leads" ? [value, "Leads"] : [`S/ ${Number(value).toLocaleString("es-PE")}`, "Suma de precio"]
              }
              labelFormatter={(l) => l}
              contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }}
              labelStyle={{ color: "var(--popover-foreground)" }}
              itemStyle={{ color: "var(--popover-foreground)" }}
            />

            {/* Barras para leads */}
            <Bar
              yAxisId="left"
              dataKey="total"
              name="Leads"
              barSize={18}
              fill="#4ade80"
              radius={[6, 6, 0, 0]}
              hide={metric !== "total"}
            />

            {/* Línea para suma de precio */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="suma_precio"
              name="Suma de precio"
              strokeWidth={2}
              dot={{ r: 3, stroke: "var(--chart-2)", fill: "var(--chart-2)" }}
              hide={metric !== "suma_precio"}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default MonthlyEvolution;
