// src/components/dashboard/NewClientsKPI.tsx
import { useEffect, useState } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { fetchDashboardNewClientsThisMonth } from "../services/api";

export default function NewClientsKPI() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardNewClientsThisMonth()
      .then((data) => {
        setCount(data ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: "background.paper",
        boxShadow: 2,
        minHeight: 100,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Typography variant="subtitle2" color="text.secondary">
        Nuevos clientes este mes
      </Typography>

      {loading ? (
        <CircularProgress size={24} />
      ) : (
        <Typography variant="h4" color="text.secondary">{count}</Typography>
      )}
    </Box>
  );
}
