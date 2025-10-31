// src/components/cotizaciones/TopEstilosChart.tsx
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getTopEstilo } from "../services/apiCotizaciones";

type Item = {
  label: string;
  total: number;
  suma_precio?: number;
  promedio?: number;
};

export default function TopEstilosChart({ limit = 5 }: { limit?: number }) {
  const [data, setData] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await getTopEstilo(limit);
        if (mounted) setData(res);
      } catch (e: any) {
        if (mounted) setErr(e?.message ?? "Error al cargar estilos");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [limit]);

  if (loading) return <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)]">Cargando estilos…</div>;
  if (err) return <div className="p-4 rounded-2xl bg-red-900/30 text-red-200">{err}</div>;
  if (!data.length) return <div className="p-4 rounded-2xl bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)]">Sin datos</div>;

  // Recharts espera claves numéricas; ya vienen como total/suma_precio/promedio
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-[var(--card-foreground)] shadow-lg">
      <h3 className="text-sm uppercase tracking-wide text-[var(--muted-foreground)] mb-3">Estilos más cotizados</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={[...data].reverse()} // para que el más alto quede arriba
            layout="vertical"
            margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis type="number" tick={{ fill: "var(--muted-foreground)" }} />
            <YAxis
              type="category"
              dataKey="label"
              width={120}
              tick={{ fill: "var(--muted-foreground)" }}
            />
            <Tooltip
              contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }}
              labelStyle={{ color: "var(--popover-foreground)" }}
              formatter={(value: number | string, name: string) => {
                if (name === "total") return [value, "Leads"];
                if (name === "suma_precio") return [`S/ ${Number(value || 0).toLocaleString("es-PE")}`, "Suma"];
                if (name === "promedio") return [`S/ ${Number(value || 0).toLocaleString("es-PE")}`, "Ticket"];
                return [value, name];
              }}
            />
            {/* Color fijo; si quieres gradiente, cambiamos fill por url(#id) como ya viste */}
            <Bar dataKey="total" name="Leads" barSize={18} radius={[6, 6, 6, 6]} fill="#00B4D8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 text-xs text-[var(--muted-foreground)]">
        {/* Tooltip muestra también suma y ticket promedio por estilo (si vienen en el endpoint). */}
      </div>
    </div>
  );
}
