import { useEffect, useState } from "react";
import { Box, Typography, Divider } from "@mui/material";
import { fetchDashboardCross } from "../services/api";

import { DistributionChart } from "../ui/DistributionChart";
import DashboardFaseBarChart from "../ui/DashboardFaseBarChart";
import DashboardCitasPieChart from "../ui/DashboardCitasPieChart";
import { NuevosMesKPI, SummaryKPICard } from "../ui/LeadsCotizaciones";
import TopEstilosChart from "../ui/TopEstilosChart";
import TopDistritosChart from "../ui/TopDistritoscharts";
import UltimasCotizacionesTable from "../ui/UltimasCotizaciones";
import AreaHistogram from "../ui/Histograma";
import { MonthlyEvolution } from "../ui/MonthyEvolution";
import ProjectDurationChart from "../ui/ProjectDurationChart";
import DashboardKPIs from "../ui/DashboardKPIs";
import ClasificacionDashboard from "../ui/ClasificationDashboard";

export default function Dashboard() {
  const [, setData] = useState<{ tipo: string; cantidad: number }[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardCross("negocio", "id")
      .then((res: Record<string, Record<string, number>>) => {
        const formatted = Object.entries(res).map(([tipo, ids]) => ({
          tipo,
          cantidad: Object.values(ids).filter((v) => v === 1).length,
        }));
        setData(formatted);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box
      sx={{
        // Contenedor principal
        maxWidth: 1400,
        mx: "auto",
        px: { xs: 1.5, sm: 2, md: 3 },
        py: { xs: 1.5, md: 2 },
        display: "grid",
        gap: { xs: 2.5, md: 3 },
        // Ocultar scrollbar (manteniendo scroll)
        overflowY: "auto",
        "&::-webkit-scrollbar": { display: "none" },
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {/* ===== KPIs arriba (full width) ===== */}
      <SectionTitle title="Visión general" />
      <Box>
        <DashboardKPIs />
      </Box>

      {/* ===== Grid principal de 2 columnas (md+) ===== */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          alignItems: "start",
          gap: { xs: 2.5, md: 3 },
        }}
      >
        {/* -------- Columna izquierda: “Agente / Operación” -------- */}
        <Box
          sx={{
            display: "grid",
            gap: { xs: 2, md: 2.5 },
            // Subgrid con alturas mínimas para charts (crecen si necesitan)
            gridAutoRows: "minmax(240px, auto)",
          }}
        >
          <SectionTitle title="Agente / Operación" compact />
          <Box sx={{ minHeight: { xs: 220, sm: 260, md: 280 } }}>
            <DistributionChart />
          </Box>
          <Box sx={{ minHeight: { xs: 220, sm: 260, md: 280 } }}>
            <ClasificacionDashboard />
          </Box>
          <Box sx={{ minHeight: { xs: 220, sm: 260, md: 280 } }}>
            <DashboardFaseBarChart />
          </Box>
          <Box sx={{ minHeight: { xs: 220, sm: 260, md: 280 } }}>
            <DashboardCitasPieChart />
          </Box>
          <Box sx={{ minHeight: { xs: 220, sm: 260, md: 280 } }}>
            <ProjectDurationChart />
          </Box>
        </Box>

        {/* -------- Columna derecha: “Comercial / Cotizaciones” -------- */}
        <Box
          sx={{
            display: "grid",
            gap: { xs: 2, md: 2.5 },
            gridAutoRows: "minmax(240px, auto)",
          }}
        >
          <SectionTitle title="Comercial / Cotizaciones" compact />
          {/* KPIs compactos */}
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              alignItems: "stretch",
            }}
          >
            <Box sx={{ minHeight: 120 }}>
              <NuevosMesKPI />
            </Box>
            <Box sx={{ minHeight: 120 }}>
              <SummaryKPICard />
            </Box>
          </Box>

          <Box sx={{ minHeight: { xs: 240, sm: 280, md: 320 } }}>
            <MonthlyEvolution />
          </Box>
          <Box sx={{ minHeight: { xs: 240, sm: 280, md: 320 } }}>
            <TopEstilosChart />
          </Box>
          <Box sx={{ minHeight: { xs: 240, sm: 280, md: 320 } }}>
            <TopDistritosChart />
          </Box>
          <Box sx={{ minHeight: { xs: 240, sm: 280, md: 320 } }}>
            <UltimasCotizacionesTable />
          </Box>
        </Box>
      </Box>

      {/* ===== Ancho completo abajo ===== */}
      <SectionTitle title="Distribuciones" />
      <Box sx={{ minHeight: { xs: 280, sm: 320, md: 360 } }}>
        <AreaHistogram
          binSize={5}
          clipOutliers
          title="Distribución de áreas de cotización"
        />
      </Box>
    </Box>
  );
}

/** Título de sección con estilo “theme-aware” */
function SectionTitle({ title, compact = false }: { title: string; compact?: boolean }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        alignItems: "center",
        gap: 1,
        mb: compact ? 0 : 0.5,
      }}
    >
      <Typography
        variant="subtitle1"
        sx={{
          color: "var(--card-foreground)",
          fontWeight: 900,
          letterSpacing: 0.2,
        }}
      >
        {title}
      </Typography>
      <Divider
        sx={{
          borderColor: "var(--border)",
          opacity: 0.7,
        }}
      />
    </Box>
  );
}
