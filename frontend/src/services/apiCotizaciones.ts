import type { CotizacionRow } from "../types/Cotizacion";
import type { PaginatedResp, SummaryResp, MonthlyPoint, TopItem } from "../types/Cotizacion";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// -------- Cotizaciones: listado paginado --------
export async function listCotizaciones(opts: {
  page?: number;
  page_size?: number;
  q?: string | null;
  sort_key?: string;
  sort_dir?: "asc" | "desc";
} = {}): Promise<PaginatedResp<CotizacionRow>> {
  const {
    page = 1,
    page_size = 30,
    q = null,
    sort_key = "fecha_hora",
    sort_dir = "desc",
  } = opts;

  const params = new URLSearchParams({
    page: String(page),
    page_size: String(page_size),
    sort_key,
    sort_dir,
  });
  if (q) params.set("q", q);

  const res = await fetch(`${BASE_URL}/cotizaciones?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} al listar cotizaciones`);
  return res.json();
}

// -------- Cotizaciones: resumen --------
export async function getCotizSummary(): Promise<SummaryResp> {
  const res = await fetch(`${BASE_URL}/cotizaciones/metrics/summary`);
  if (!res.ok) throw new Error(`HTTP ${res.status} al obtener summary`);
  return res.json();
}

// -------- Cotizaciones: series mensuales --------
export async function getMonthlySeries(tz = "America/Lima"): Promise<MonthlyPoint[]> {
  const params = new URLSearchParams({ tz });
  const res = await fetch(`${BASE_URL}/cotizaciones/metrics/series/monthly?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} al obtener series mensuales`);
  return res.json();
}

// -------- Cotizaciones: top estilo --------
export async function getTopEstilo(limit = 5): Promise<TopItem[]> {
  const res = await fetch(`${BASE_URL}/cotizaciones/metrics/top/estilo?limit=${limit}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} al obtener top estilo`);
  return res.json();
}

// -------- Cotizaciones: top distrito --------
export async function getTopDistrito(limit = 5): Promise<TopItem[]> {
  const res = await fetch(`${BASE_URL}/cotizaciones/metrics/top/distrito?limit=${limit}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} al obtener top distrito`);
  return res.json();
}

// -------- Test unitario: últimos 5 (sin formateo extra) --------
export async function testCotizLast5(): Promise<Array<Pick<CotizacionRow, "created_at" | "fecha_hora" | "nombre" | "telefono">>> {
  const res = await fetch(`${BASE_URL}/cotizaciones/test/last5`);
  if (!res.ok) throw new Error(`HTTP ${res.status} en test/last5`);
  return res.json();
}
