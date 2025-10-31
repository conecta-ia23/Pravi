export interface CotizacionRow {
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

// --- Tipos exportados para reutilizar en componentes ---
export type PaginatedResp<T> = {
  total: number;
  page: number;
  page_size: number;
  data: T[];
};

export type MonthlyPoint = {
  x: string;            // "YYYY-MM"
  total: number;        // conteo del mes
  suma_precio: number;  // suma de precio_final del mes
};

export type TopItem = {
  label: string;        // estilo o distrito
  total: number;
  suma_precio?: number;
  promedio?: number;
};

export type SummaryResp = {
  // Soporta ambos esquemas (dashboard/cotizaciones):
  total?: number;
  suma_total?: number;
  promedio?: number;

  total_cotizaciones?: number;
  suma_precio?: number;
  ticket_promedio?: number;
  m2_promedio?: number;
};
