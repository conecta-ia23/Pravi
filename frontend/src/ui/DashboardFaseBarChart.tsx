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
          justifyContent: 'center'
        }}
      >
        <CircularProgress />
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
          justifyContent: 'center'
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
    <Card elevation={3}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Métricas Comparativas</Typography>
        <ResponsiveContainer width="100%" height={242}>
          <BarChart data={fasesData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#007bff" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}