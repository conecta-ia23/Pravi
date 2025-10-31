// src/ui/UltimasCotizacionesTable.tsx
import { useEffect, useState } from "react";
import { testCotizLast5 } from "../services/apiCotizaciones";

type Row = {
  created_at: string | null;
  fecha_hora: string | null; // timestamptz (UTC en DB)
  nombre: string | null;
  telefono: string | null;
};

function formatDateLima(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    // Mostramos fecha_hora en zona Lima para lectura consistente
    return new Date(iso).toLocaleString("es-PE", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function UltimasCotizacionesTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const data = await testCotizLast5();
      setRows(
        (data ?? []).map((r) => ({
          created_at: r.created_at ?? null,
          fecha_hora: r.fecha_hora ?? null,
          nombre: r.nombre ?? null,
          telefono: r.telefono ?? null,
        }))
      );
    } catch (e: any) {
      setErr(e?.message ?? "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--card-foreground)]">
          Últimas cotizaciones (5)
        </h3>
        <button
          onClick={load}
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--card-foreground)] hover:bg-zinc-800"
        >
          Refrescar
        </button>
      </div>

      {err && (
        <div className="mb-3 rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <th className="px-3 py-2">Fecha (Lima)</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Teléfono</th>
              <th className="px-3 py-2">Creado (UTC)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  <td className="px-3 py-2">
                    <div className="h-4 w-32 animate-pulse rounded bg-[var(--muted)]" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="h-4 w-40 animate-pulse rounded bg-[var(--muted)]" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="h-4 w-28 animate-pulse rounded bg-[var(--muted)]" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="h-4 w-36 animate-pulse rounded bg-[var(--muted)]" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-sm text-[var(--muted-foreground)]" colSpan={4}>
                  Sin registros.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr
                  key={idx}
                  className="rounded-xl bg-[color-mix(in_srgb,var(--card)_85%,transparent)] hover:bg-zinc-950/70"
                >
                  <td className="px-3 py-2 text-sm text-[var(--card-foreground)]">
                    {formatDateLima(r.fecha_hora)}
                  </td>
                  <td className="px-3 py-2 text-sm text-[var(--card-foreground)]">
                    {r.nombre || "—"}
                  </td>
                  <td className="px-3 py-2 text-sm text-[var(--muted-foreground)]">
                    {r.telefono || "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--card-foreground)]">
                    {r.created_at
                      ? new Date(r.created_at).toISOString().replace("T", " ").slice(0, 19)
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
