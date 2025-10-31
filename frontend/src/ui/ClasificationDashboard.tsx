import { useEffect, useState } from "react";
import { fetchDashboarDistribution } from "../services/api";
import { Box, Typography, CircularProgress } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";

// Paleta de colores para las barras
const BAR_COLORS = [
  "#22335b", // azul oscuro
  "#19b9c4", // celeste
  "#f75c5c", // rojo
  "#ffc233", // amarillo
  "#bada55", // verde lima
  "#ff8c00", // naranja
];

export default function ClasificacionDashboard() {
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboarDistribution().then((res) => {
      // Solo tomamos la sección de calificacion
      const calificacion = res.calificacion || {};
      // Convertimos a un array de objetos para Recharts
      const chartData = Object.entries(calificacion)
        .map(([name, value]) => ({
          name,
          value: typeof value === "number" ? value : Number(value),
        }))
        .filter(({ value }) => !isNaN(value));
      // Orden descendente por valor
      chartData.sort((a, b) => b.value - a.value);
      setData(chartData);
      setLoading(false);
    });
  }, []);

  return (
    <Box sx={{ width: "auto", height: 290, bgcolor: "var(--card)", color: "var(--card-foreground)", border: "1px solid var(--border)",
        p: 2, borderRadius: 2, boxShadow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Typography variant="h6" sx={{ mb: 2, color: 'var(--card-foreground)', textAlign: 'center', fontWeight: 70 }}>
        Calificación de Clientes
      </Typography>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "left", height: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={data}
            layout="vertical"
            margin= {{ top: 5, right: 0, left: 0, bottom: 5 }}
            barCategoryGap="20%"
          >
            <XAxis type="number" 
            domain={[0, Math.max(...data.map((d) => d.value)) * 1.1]}
              tickFormatter={(v) => (v === 0 ? "" : v)}
              hide
            />
            <YAxis dataKey="name" type="category" width={180}
                   tick={{ fontSize: 15, fontWeight: 50, fill: "#222" }}
            />
            <Tooltip />
            <Bar dataKey="value" fill="#1976d2">
                {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              <LabelList dataKey="value" position="right" fill="var(--card-foreground)" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
}