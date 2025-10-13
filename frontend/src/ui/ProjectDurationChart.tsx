import { useEffect, useState } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { fetchDashboardProjectDuration } from "../services/api";

export default function ProjectDurationChart() {
  const [data, setData] = useState<{ tiempo: number; cantidad: number }[]>([]);
  const [average, setAverage] = useState<string>("0");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  fetchDashboardProjectDuration()
    .then((res: Record<string, number>) => {
      const parsed = Object.entries(res)
        .map(([key, value]) => {
          const tiempo = parseFloat(key);
          const cantidad = typeof value === "number" ? value : 0;
          return { tiempo, cantidad };
        });

      setData(parsed);

      const total = parsed.reduce((acc, item) => acc + item.tiempo * item.cantidad, 0);
      const count = parsed.reduce((acc, item) => acc + item.cantidad, 0);
      setAverage(count === 0 ? "0" : (total / count).toFixed(1));
    })
    .finally(() => setLoading(false));
}, []);

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 2,
        bgcolor: "background.paper",
        boxShadow: 2,
        minHeight: 250,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Typography variant="subtitle2" color="text.secondary">
        Duración promedio de atención
      </Typography>
      {loading ? (
        <CircularProgress size={24} />
      ) : (
        <>
          <Typography variant="h4" color="text.primary">
            {average} meses
          </Typography>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data}>
              <XAxis dataKey="tiempo" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="cantidad" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </Box>
  );
}
