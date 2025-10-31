import { useEffect, useState } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
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
        bgcolor: "var(--card)",
        color: "var(--card-foreground)",
        boxShadow: 2,
        minHeight: 250,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Typography variant="subtitle2" color="var(--muted-foreground)">
        Duración promedio de atención
      </Typography>
      {loading ? (
        <CircularProgress size={24} />
      ) : (
        <>
          <Typography variant="h4" color="var(--card-foreground)">
            {average} meses
          </Typography>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="tiempo"
                tick={{ fill: "var(--muted-foreground)" }}
                stroke="var(--muted-foreground)"
                tickLine={{ stroke: "var(--muted-foreground)" }}
              />
              <YAxis
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
                formatter={(value: any) => [value, "Cantidad"]}
                labelFormatter={(l) => `Mes: ${l}`}
              />
              <Line
                type="monotone"
                dataKey="cantidad"
                stroke="var(--chart-2)"
                strokeWidth={2}
                dot={{ r: 3, stroke: "var(--chart-2)", fill: "var(--chart-2)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </Box>
  );
}
