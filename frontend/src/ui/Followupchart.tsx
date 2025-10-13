import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { fetchDashboardFollowup } from "../services/api";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
} from "@mui/material";

const COLORS = ["#1a29b3ff", "#74623fff"]; // Azul seguimiento y beige no hay seguimiento

export default function FollowupChart() {
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardFollowup()
      .then((res) => {
        const chartData = [
          { name: "Con seguimiento", value: res.followup_success },
          { name: "Sin seguimiento", value: res.no_followup },
        ];
        setData(chartData);
      })
      .catch((err) => {
        console.error("Error al cargar seguimiento:", err);
        setError("No se pudo cargar el seguimiento.");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ width: "100%" }}>
      <Card elevation={3}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Seguimiento post-cita
          </Typography>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
