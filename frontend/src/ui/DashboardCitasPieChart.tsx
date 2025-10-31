import { useEffect, useState } from "react";
import { fetchDashboardMetrics } from "../services/api";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, Typography, CircularProgress } from "@mui/material";

export default function DashboardCitasPieChart() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardMetrics().then(setMetrics).finally(() => setLoading(false));
  }, []);

  if (loading) return <CircularProgress />;
  if (!metrics) return <Typography>No hay métricas disponibles.</Typography>;

  const citasData = [
    { name: "Con cita", value: metrics.con_cita },
    { name: "Sin cita", value: metrics.sin_cita }
  ];

  return (
    <Card elevation={3}
      sx={{
        bgcolor: "var(--card)",
        color: "var(--card-foreground)",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom>Distribución de Citas</Typography>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={citasData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {citasData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === 0 ? "var(--chart-1)" : "var(--destructive)"}
                  stroke="var(--card)"
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend
              wrapperStyle={{ color: "var(--muted-foreground)" }}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}