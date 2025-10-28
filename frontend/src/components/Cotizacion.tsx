import { useEffect, useMemo, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---- Config ----
// Asegúrate de definir estas env vars en tu Vite (.env):
// VITE_SUPABASE_URL=...
// VITE_SUPABASE_ANON_KEY=...
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Nombre de la tabla
const TABLE = "cotizaciones" as const;

// Número de filas por página
const PAGE_SIZE = 30;

// ---- Tipos ----
export type CotizacionRow = {
  id: number;
  fecha_hora: string | null; // timestamptz
  nombre: string | null;
  telefono: string | null;
  correo: string | null;
  proyecto: string | null;
  estilo: string | null;
  espacios: string[] | null; // text[]
  area_m2: number | null;
  habitaciones: number | null;
  tiempo: string | null;
  distrito: string | null;
  diseno: number | null;
  mobiliario: number | null;
  acabados: number | null;
  precio_final: number | null;
  created_at?: string | null;
};

// Para ordenar columnas permitidas
const SORTABLE: Array<keyof CotizacionRow> = [
  "fecha_hora",
  "nombre",
  "telefono",
  "correo",
  "proyecto",
  "estilo",
  "area_m2",
  "habitaciones",
  "distrito",
  "precio_final",
  "diseno",
];

type SortState = { key: keyof CotizacionRow; dir: "asc" | "desc" };

// Helpers de formato
const fmtDateTime = (iso: string | null) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("es-PE", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Lima",
    }).format(d);
  } catch {
    return iso;
  }
};

const fmtNumber = (n: number | null) =>
  n == null ? "" : new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 }).format(n);

const fmtArray = (arr: string[] | null) => (arr && arr.length ? arr.join(", ") : "");

// ---- Instancia Supabase (singleton) ----
let supabase: SupabaseClient | null = null;
const getSupabase = () => {
  if (!supabase) supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabase;
};

// ---- Componente principal ----
export default function Cotizacion() {
  const [rows, setRows] = useState<CotizacionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState(""); // búsqueda rápida
  const [sort, setSort] = useState<SortState>({ key: "fecha_hora", dir: "desc" });

  // Recalcular rango de paginación
  const { from, to } = useMemo(() => {
    const f = (page - 1) * PAGE_SIZE;
    const t = f + PAGE_SIZE - 1;
    return { from: f, to: t };
  }, [page]);

  // Construye filtros para RPC
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const sb = getSupabase();

      // --- Conteo total con/ sin búsqueda ---
      let base = sb.from(TABLE).select("id", { count: "exact", head: true });

      if (q.trim()) {
        // Búsqueda básica en varias columnas (ilike)
        const like = `%${q.trim()}%`;
        base = sb
          .from(TABLE)
          .select("id", { count: "exact", head: true })
          .or(
            [
              `nombre.ilike.${like}`,
              `telefono.ilike.${like}`,
              `correo.ilike.${like}`,
              `proyecto.ilike.${like}`,
              `estilo.ilike.${like}`,
              `distrito.ilike.${like}`,
            ].join(",")
          );
      }

      const countRes = await base;
      if (countRes.error) throw countRes.error;
      setTotal(countRes.count ?? 0);

      // --- Selección paginada ---
      let query = sb
        .from(TABLE)
        .select(
          [
            "id",
            "fecha_hora",
            "nombre",
            "telefono",
            "correo",
            "proyecto",
            "estilo",
            "espacios",
            "area_m2",
            "habitaciones",
            "tiempo",
            "distrito",
            "diseno",
            "mobiliario",
            "acabados",
            "precio_final",
            "created_at",
          ].join(",")
        )
        .range(from, to);

      if (q.trim()) {
        const like = `%${q.trim()}%`;
        query = query.or(
          [
            `nombre.ilike.${like}`,
            `telefono.ilike.${like}`,
            `correo.ilike.${like}`,
            `proyecto.ilike.${like}`,
            `estilo.ilike.${like}`,
            `distrito.ilike.${like}`,
          ].join(",")
        );
      }

      if (SORTABLE.includes(sort.key)) {
        query = query.order(sort.key as string, { ascending: sort.dir === "asc" });
      } else {
        query = query.order("fecha_hora", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      setRows((data ?? []) as CotizacionRow[]);
    } catch (err: any) {
      setError(err.message ?? "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q, sort.key, sort.dir]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const changeSort = (key: keyof CotizacionRow) => {
    if (!SORTABLE.includes(key)) return;
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
    setPage(1);
  };

  return (
    <div className="p-4 text-sm text-gray-100 bg-neutral-900 min-h-[60vh]">
      <div className="mb-3 flex flex-col md:flex-row md:items-center gap-3">
        <h2 className="text-lg font-semibold">Cotizaciones</h2>
        <div className="md:ml-auto flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Buscar por nombre, teléfono, correo, proyecto, estilo, distrito"
            className="px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700 w-[320px] outline-none"
          />
          <button
            onClick={() => fetchData()}
            className="px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700 hover:bg-neutral-700"
          >
            Recargar
          </button>
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-neutral-800">
        <table className="min-w-[1000px] w-full text-left">
          <thead className="bg-neutral-800/60">
            <tr>
              {[
                { key: "fecha_hora", label: "Fecha/Hora" },
                { key: "nombre", label: "Nombre" },
                { key: "telefono", label: "Teléfono" },
                { key: "correo", label: "Correo" },
                { key: "proyecto", label: "Proyecto" },
                { key: "estilo", label: "Estilo" },
                { key: "espacios", label: "Espacios" },
                { key: "area_m2", label: "Área (m²)" },
                { key: "habitaciones", label: "Hab." },
                { key: "tiempo", label: "Tiempo" },
                { key: "distrito", label: "Distrito" },
                { key: "diseno", label: "Diseño" },
                { key: "mobiliario", label: "Mobiliario" },
                { key: "acabados", label: "Acabados" },
                { key: "precio_final", label: "Precio Final" },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  className="py-2 px-3 cursor-pointer select-none whitespace-nowrap"
                  onClick={() => changeSort(key as keyof CotizacionRow)}
                  title={SORTABLE.includes(key as keyof CotizacionRow) ? "Ordenar" : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {label}
                    {sort.key === (key as keyof CotizacionRow) && (
                      <span className="text-xs">{sort.dir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={15} className="py-10 text-center text-neutral-400">Cargando…</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={15} className="py-10 text-center text-red-400">{error}</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={15} className="py-10 text-center text-neutral-400">No hay datos.</td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-neutral-800">
                  <td className="py-2 px-3">{fmtDateTime(r.fecha_hora)}</td>
                  <td className="py-2 px-3">{r.nombre ?? ""}</td>
                  <td className="py-2 px-3">{r.telefono ?? ""}</td>
                  <td className="py-2 px-3">{r.correo ?? ""}</td>
                  <td className="py-2 px-3">{r.proyecto ?? ""}</td>
                  <td className="py-2 px-3">{r.estilo ?? ""}</td>
                  <td className="py-2 px-3">{fmtArray(r.espacios)}</td>
                  <td className="py-2 px-3">{fmtNumber(r.area_m2)}</td>
                  <td className="py-2 px-3">{r.habitaciones ?? ""}</td>
                  <td className="py-2 px-3">{r.tiempo ?? ""}</td>
                  <td className="py-2 px-3">{r.distrito ?? ""}</td>
                  <td className="py-2 px-3">{fmtNumber(r.diseno)}</td>
                  <td className="py-2 px-3">{fmtNumber(r.mobiliario)}</td>
                  <td className="py-2 px-3">{fmtNumber(r.acabados)}</td>
                  <td className="py-2 px-3 font-medium">{fmtNumber(r.precio_final)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700 disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="text-neutral-400">Página {page} de {totalPages} • {total} registros</span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700 disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
