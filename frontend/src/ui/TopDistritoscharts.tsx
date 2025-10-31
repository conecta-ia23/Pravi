// src/components/cotizaciones/TopDistritosChart.tsx
import { useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { getTopDistrito } from "../services/apiCotizaciones";

type Item = {
  label: string;       // distrito
  total: number;       // cantidad de leads
  suma_precio?: number;
  promedio?: number;
};

export default function TopDistritosChart({ limit = 5 }: { limit?: number }) {
  const [data, setData] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await getTopDistrito(limit);
        if (mounted) setData(res);
      } catch (e: any) {
        if (mounted) setErr(e?.message ?? "Error al cargar distritos");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [limit]);

  if (loading) return <div className="p-4 rounded-2xl bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)]">Cargando distritos…</div>;
  if (err) return <div className="p-4 rounded-2xl bg-red-900/30 text-red-200">{err}</div>;
  if (!data.length) return <div className="p-4 rounded-2xl bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)]">Sin datos</div>;

  return (
    <div className="p-4 rounded-2xl bg-[var(--card)] text-[var(--card-foreground)] shadow-lg border border-[var(--border)]">
      <h3 className="text-sm uppercase tracking-wide text-[var(--muted-foreground)] mb-3">Distritos más demandados</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={[...data].reverse()}   // el más alto arriba
            layout="vertical"
            margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis type="number" tick={{ fill: "var(--muted-foreground)" }} />
            <YAxis type="category" dataKey="label" width={140} tick={{ fill: "var(--card-foreground)" }} />
            <Tooltip
              contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }}
              labelStyle={{ color: "var(--popover-foreground)" }}
              formatter={(value: any, name: any) => {
                if (name === "total") return [value, "Leads"];
                if (name === "suma_precio") return [`S/ ${Number(value || 0).toLocaleString("es-PE")}`, "Suma"];
                if (name === "promedio") return [`S/ ${Number(value || 0).toLocaleString("es-PE")}`, "Ticket"];
                return [value, name];
              }}
            />
            <Bar dataKey="total" name="Leads" barSize={18} radius={[6, 6, 6, 6]} fill="#7C3AED" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 text-xs text-[var(--muted-foreground)]">
        Tooltip incluye suma y ticket si tu endpoint los envía.
      </div>
    </div>
  );
}
