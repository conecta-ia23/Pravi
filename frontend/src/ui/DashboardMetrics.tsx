import { useEffect, useState } from "react";
import { fetchDashboardMetrics } from "../services/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell
} from "recharts";

import {
  Card, CardContent, Typography, Box } from "@mui/material";

const COLORS = ["#28a745", "#dc3545"];

export default function DashboardMetrics() {
  const [metrics, setMetrics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const data = await fetchDashboardMetrics();
        setMetrics(data);
      } catch (err: any) {
        console.error("Error al cargar métricas:", err);
        setError(err.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, []);

  if (loading) return <p>Cargando métricas...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;
  if (!metrics) return <p>No hay métricas disponibles.</p>;

  // Validar que todas las métricas necesarias estén presentes
  const requiredKeys = [
    "calificados", "atendidos", "reservados", "vendidos",
    "con_cita", "sin_cita"
  ];

  const isValid = requiredKeys.every(key => typeof metrics[key] === "number");

  if (!isValid) {
    return <Typography color="error">Datos incompletos o mal formateados.</Typography>;
  }

  const fasesData = [
    { name: "Calificados", value: metrics.calificados },
    { name: "Atendidos", value: metrics.atendidos },
    { name: "Reservados", value: metrics.reservados },
    { name: "Vendidos", value: metrics.vendidos }
  ];

  const citasData = [
    { name: "Con cita", value: metrics.con_cita },
    { name: "Sin cita", value: metrics.sin_cita }
  ];

  return (
    <Box sx={{ padding: 2 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          flexWrap: "wrap"
        }}
      >
        <Box sx={{ flex: 1, minWidth: 300 }}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Distribución por Fase</Typography>
              <ResponsiveContainer width="100%" height={300}>
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
        </Box>

        <Box sx={{ flex: 1, minWidth: 300 }}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Distribución de Citas</Typography>
              <ResponsiveContainer width="100%" height={300}>
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
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
