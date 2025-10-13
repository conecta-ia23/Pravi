import { useEffect, useState } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import {
  fetchDashboardMetrics,
  fetchDashboardFollowup,
  fetchDashboardNewClientsThisMonth,
} from "../services/api";

export default function DashboardKPIs() {
  const [metrics, setMetrics] = useState<{
    total_clientes: number;
    con_cita: number;
    sin_cita: number;
  } | null>(null);
  const [followup, setFollowup] = useState<{
    followup_success: number;
    no_followup: number;
  } | null>(null);
  const [newClients, setNewClients] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchDashboardMetrics(),
      fetchDashboardFollowup(),
      fetchDashboardNewClientsThisMonth(),
    ])
      .then(([metricsData, followupData, newClientsData]) => {
      console.log("Metrics:", metricsData);
      console.log("Followup:", followupData);
      console.log("New Clients:", newClientsData);
      setMetrics(metricsData);
      setFollowup(followupData);
      setNewClients(newClientsData ?? 0);
      })
      .catch((err) => {
      console.error("Error al cargar KPIs:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Cálculo de éxito de seguimiento
  let followupPercent = 0;
  let followupText = "";
  if (followup) {
    const total = (followup.followup_success ?? 0) + (followup.no_followup ?? 0);
    followupPercent = total > 0 ? Math.round((followup.followup_success / total) * 100) : 0;
    followupText = `${followupPercent}%`;
  }

  return (
    <Box
      sx={{
        width: "100%",
        mb: 3,
        display: "grid",
        gap: 2,
        gridTemplateColumns: {
          xs: "repeat(2, 1fr)",
          sm: "repeat(auto-fit, minmax(200px, 1fr))",
        },
        justifyItems: "center",
        alignItems: "stretch",
      }}
    >
      <KPIBox
        label="Total de clientes"
        value={metrics?.total_clientes}
        loading={loading}
      />
      <KPIBox
        label="Clientes con cita"
        value={metrics?.con_cita}
        loading={loading}
      />
      <KPIBox
        label="Clientes sin cita"
        value={metrics?.sin_cita}
        loading={loading}
      />
      <KPIBox
        label={
          followup
            ? `Éxito de seguimiento (${followup.followup_success} de ${
                (followup.followup_success ?? 0) + (followup.no_followup ?? 0)
              } clientes)`
            : "Éxito de seguimiento"
        }
        value={followupText}
        loading={loading}
      />
      <KPIBox
        label="Nuevos clientes este mes"
        value={newClients}
        loading={loading}
      />
    </Box>
  );
}

function KPIBox({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | string | undefined | null;
  loading: boolean;
}) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: "background.paper",
        boxShadow: 1,
        width: "80%",
        minHeight: 80,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        border: "1px solid var(--border-color)",
      }}
    >
      <Typography
        variant="subtitle2"
        color="text.secondary"
        sx={{ fontWeight: 600, fontSize: 15, textAlign: "center" }}
      >
        {label}
      </Typography>
      {loading ? (
        <CircularProgress size={24} />
      ) : (
        <Typography
          variant="h4"
          sx={{
            color: "text.primary",
            fontWeight: 700,
            fontSize: 32,
            textAlign: "center",
            mt: 0.5,
          }}
        >
          {typeof value === "number" || typeof value === "string" ? value : 0}
        </Typography>
      )}
    </Box>
  );
}