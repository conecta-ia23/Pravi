import React, { useEffect, useMemo, useState } from "react";
import { getMonthlySeries } from "../services/apiCotizaciones";

// UI helper básico
const CardShell: React.FC<React.PropsWithChildren<{ title?: string }>> = ({ title, children }) => (
  <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4 shadow-sm">
    {title && <h3 className="text-sm text-[var(--muted-foreground)] mb-2">{title}</h3>}
    {children}
  </div>
);

const Skeleton: React.FC<{ lines?: number }> = ({ lines = 1 }) => (
  <div className="animate-pulse space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="h-4 bg-[var(--muted)] rounded" />
    ))}
  </div>
);
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";


// =============== 2) KPI: Nuevos leads este mes ===========
export const NuevosMesKPI: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [series, setSeries] = useState<Array<{ x: string; total: number }>>([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const s = await getMonthlySeries("America/Lima"); // [{ x:"YYYY-MM", total, suma_precio }]
        // asegurar orden ascendente por mes
        setSeries([...s].sort((a, b) => a.x.localeCompare(b.x)));
      } catch (e: any) {
        setErr(e?.message || "Error cargando nuevos del mes.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const nuevosEsteMes = useMemo(() => series.at(-1)?.total ?? 0, [series]);

  return (
    <CardShell>
      {loading ? (
        <Skeleton />
      ) : err ? (
        <div className="text-red-400 text-sm">{err}</div>
      ) : (
        <div>
          <div className="text-[var(--muted-foreground)] text-xs text-center">Nuevos leads este mes</div>
          <div className="text-2xl font-semibold text-[var(--muted-foreground)] text-center">{nuevosEsteMes.toLocaleString("es-PE")}</div>
        </div>
      )}
    </CardShell>
  );
};

// =============== 3) Card combinada =======================
export const SummaryKPICard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [promedio, setPromedio] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${BASE_URL}/cotizaciones/metrics/summary`, {
          headers: { "Cache-Control": "no-store" }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const summary = await res.json();

        // Soporta ambas formas:
        // Nueva: { total, promedio }
        // Antigua: { total_cotizaciones, ticket_promedio }
        const totalVal = Number(
          summary?.total ?? summary?.total_cotizaciones ?? 0
        );
        const promVal = Number(
          summary?.promedio ?? summary?.ticket_promedio ?? 0
        );

        setTotal(Number.isFinite(totalVal) ? totalVal : 0);
        setPromedio(Number.isFinite(promVal) ? promVal : 0);
      } catch (e: any) {
        setErr(e?.message || "Error cargando KPIs generales.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <CardShell>
      {loading ? (
        <Skeleton lines={2} />
      ) : err ? (
        <div className="text-red-400 text-sm">{err}</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[var(--muted-foreground)] text-xs text-center">Clientes totales</div>
            <div className="text-2xl font-semibold text-[var(--muted-foreground)] text-center">
              {total.toLocaleString("es-PE")}
            </div>
          </div>
          <div>
            <div className="text-[var(--muted-foreground)] text-xs text-center">Ticket promedio</div>
            <div className="text-2xl font-semibold text-[var(--muted-foreground)] text-center">
              S/ {Math.round(promedio).toLocaleString("es-PE")}
            </div>
          </div>
        </div>
      )}
    </CardShell>
  );
};