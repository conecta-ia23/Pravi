import { useEffect, useState } from "react";
import { fetchDashboardMetrics } from "../services/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Card, CardContent, Typography, CircularProgress } from "@mui/material";

export default function DashboardFaseBarChart() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardMetrics().then(setMetrics).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card 
        elevation={3} 
        sx={{ 
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: "var(--card)",
          color: "var(--card-foreground)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
        }}
      >
        <CircularProgress sx={{ color: "var(--ring)" }} />
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card 
        elevation={3} 
        sx={{ 
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: "var(--card)",
          color: "var(--muted-foreground)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
        }}
      >
        <Typography>No hay métricas disponibles.</Typography>
      </Card>
    );
  }

  const fasesData = [
    { name: "Calificados", value: metrics.calificados },
    { name: "Con Estilos", value: metrics.con_estilo },
    { name: "Sin Cita", value: metrics.sin_cita },
    { name: "Seguimiento", value: metrics.seguimiento }
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
        <Typography variant="h6" gutterBottom sx={{ color: "var(--card-foreground)" }}>
          Métricas Comparativas
        </Typography>

        <ResponsiveContainer width="100%" height={242}>
          <BarChart data={fasesData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="name"
              tick={{ fill: "var(--muted-foreground)" }}
              stroke="var(--muted-foreground)"
              tickLine={{ stroke: "var(--muted-foreground)" }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--muted-foreground)" }}
              stroke="var(--muted-foreground)"
              tickLine={{ stroke: "var(--muted-foreground)" }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                color: "var(--popover-foreground)",
              }}
              labelStyle={{ color: "var(--popover-foreground)" }}
              itemStyle={{ color: "var(--popover-foreground)" }}
              formatter={(value: any) => [value, "Leads"]}
            />
            <Legend wrapperStyle={{ color: "var(--muted-foreground)" }} />
            <Bar dataKey="value" name="Leads" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}