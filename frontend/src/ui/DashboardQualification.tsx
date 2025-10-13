import { useEffect, useState } from "react";
import { fetchDashboardClassification } from "../services/api";
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Star, User, ChevronDown, ChevronUp } from "lucide-react";

type Cliente = {
  nombre: string;
  categoria: string | null;
  fase: string | null;
  negocio: string | null;
  propiedad: string | null;
  tiempo: string | null;
  tiempo_meses: number | null;
};

type Grupo = {
  count: number;
  clientes: Cliente[];
};

export default function DashboardQualification() {
  const [data, setData] = useState<Record<string, Grupo>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    setLoading(true);
    fetchDashboardClassification()
      .then(setData)
      .catch((err) => console.error("Error al cargar clasificación:", err))
      .finally(() => setLoading(false));
  }, []);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const calcularRating = (cliente: Cliente) => {
    const campos = [
      cliente.categoria,
      cliente.fase,
      cliente.negocio,
      cliente.propiedad,
      cliente.tiempo,
      cliente.tiempo_meses !== null ? cliente.tiempo_meses : null,
    ];
    const completados = campos.filter((c) => c !== null && c !== "").length;
    return Math.min(completados, 5); // Normalizado a 5 estrellas máximo
  };

  if (loading) {
    return (
      <Box
        sx={{
          p: 6,
          minHeight: "100vh",
          backgroundColor: "var(--bg-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress
            size={64}
            thickness={4}
            sx={{ color: theme.palette.primary.main, mb: 2 }}
          />
          <Typography sx={{ color: "black", opacity: 0.7 }}>
            Cargando datos...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: isSm ? 1 : 2,
        transition: "all 0.3s",
        backgroundColor: "var(--bg-color)",
        minHeight: "100vh",
        color: "black",
      }}
    >
      {/* Header */}
      <Box sx={{ mb: isSm ? 3 : 6, px: isSm ? 1 : 0 }}>
        <Typography
          variant={isSm ? "h6" : "h5"}
          fontWeight="bold"
          sx={{
            mb: 1.5,
            background: "var(--primary)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Gestión y seguimiento de clientes por etapa del proceso
        </Typography>
      </Box>

      {/* Cards de Resumen */}
      <Box
        sx={{
          display: "flex",
          gap: isSm ? 1 : 2,
          mb: isSm ? 3 : 6,
          flexWrap: isSm ? "wrap" : "nowrap",
          justifyContent: "center",
          "& > div": {
            flexGrow: 1,
            flexShrink: 1,
            
            // en desktop: ancho fijo o base para que esté en una fila
            flexBasis: isSm ? "calc(50% - 8px)" : "150px",
            maxWidth: isSm ? "calc(50% - 8px)" : "180px",
            minWidth: 140,
           },
           [theme.breakpoints.up("md")]: {
            flexWrap: "wrap",
            justifyContent: "center",
            },
        }}
      >
        {Object.entries(data).map(([label, grupo]) => {
          const clientesCompletos = grupo.clientes.filter(
            (c) => calcularRating(c) >= 4
          ).length;

          return (
            <Box
              key={`summary-${label}`}
              sx={{
                borderRadius: 2,
                p: 1,
                transition: "all 0.3s",
                "&:hover": {
                  transform: "scale(1.05)",
                  boxShadow: `0 4px 20px var(--chart-2)`,
                },
                backgroundColor: "white",
                border: `2px solid var(--chart-1)`,
                minWidth: 200,
                flex: "1 1 200px",
              }}
            >
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
              >
                <Box sx={{ p: 1.5, borderRadius: 2 }}>
                  <User size={24} color="var(--bg-color)" />
                </Box>
                <Typography
                  variant="h5"
                  fontWeight="bold"
                  sx={{ color: theme.palette.text.primary }}
                >
                  {grupo.count}
                </Typography>
              </Box>

              <Typography
                variant="subtitle2"
                fontWeight={400}
                sx={{ mb: 1, color: theme.palette.text.primary }}
              >
                {label}
              </Typography>

              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, color: theme.palette.text.primary }}
              >
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  {clientesCompletos}/{grupo.count} completos
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

        {/* Pipeline Columns */}
        <Box
        sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 3,
            justifyContent: "center",
        }}
        >
        {Object.entries(data).map(([label, grupo]) => {
            const isExpanded = expandedGroups[label] ?? false;
            const clientesToShow = isExpanded ? grupo.clientes : grupo.clientes.slice(0, 3);

            return (
            <Box
                key={label}
                sx={{
                flex: "1 1 320px",
                borderRadius: 4,
                overflow: "hidden",
                boxShadow: theme.shadows[3],
                transition: "all 0.3s",
                border: `1px solid ${theme.palette.divider}`,
                minHeight: 600,
                bgcolor: theme.palette.background.paper,
                maxWidth: 500,
                }}
            >
                <Box
                sx={{
                    px: 3,
                    py: 2.5,
                    color: theme.palette.common.white,
                    backgroundColor: "var(--primary)",
                    position: "relative",
                    overflow: "hidden",
                }}
                >
                <Box
                    sx={{
                    position: "relative",
                    zIndex: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    }}
                >
                    <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                        {label}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                        {grupo.count} {grupo.count === 1 ? "cliente" : "clientes"}
                    </Typography>
                    </Box>
                </Box>
                </Box>

                <Box sx={{ p: 2 }}>
                {clientesToShow.map((cliente, i) => {
                    const rating = calcularRating(cliente);

                    return (
                    <Box
                        key={i}
                        sx={{
                        borderRadius: 3,
                        p: 2,
                        mb: 2,
                        transition: "all 0.2s",
                        "&:hover": { transform: "scale(1.02)" },
                        backgroundColor: "transparent",
                        border: `1.5px solid ${theme.palette.divider}`,
                        }}
                    >
                        <Box sx={{ display: "flex", gap: 2 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                            variant="subtitle2"
                            fontWeight={600}
                            sx={{ mb: 1, color: theme.palette.text.primary }}
                            >
                            {cliente.nombre}
                            </Typography>

                            <Box
                            sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 1 }}
                            >
                            {cliente.negocio && (
                                <Typography
                                variant="caption"
                                sx={{ opacity: 0.8, display: "flex", alignItems: "center", gap: 0.5 }}
                                >
                                <Box
                                    component="span"
                                    sx={{
                                    width: 8,
                                    height: 8,
                                    bgcolor: theme.palette.text.primary,
                                    borderRadius: "50%",
                                    display: "inline-block",
                                    }}
                                />
                                {cliente.negocio}
                                </Typography>
                            )}
                            {cliente.categoria && (
                                <Typography variant="caption">📊 {cliente.categoria}</Typography>
                            )}
                            {cliente.fase && (
                                <Typography variant="caption">🎯 {cliente.fase}</Typography>
                            )}
                            {cliente.propiedad && (
                                <Typography variant="caption">🏢 {cliente.propiedad}</Typography>
                            )}
                            {cliente.tiempo && (
                                <Typography variant="caption">⏰ {cliente.tiempo}</Typography>
                            )}
                            {cliente.tiempo_meses !== null && (
                                <Typography variant="caption">📅 {cliente.tiempo_meses} meses</Typography>
                            )}
                            </Box>

                            {/* Estrellas siempre visibles */}
                            <Box sx={{ display: "flex", gap: 0.5 }}>
                            {[...Array(5)].map((_, idx) => (
                                <Star
                                key={idx}
                                size={14}
                                style={{
                                    color:
                                    idx < rating
                                        ? theme.palette.warning.main
                                        : theme.palette.action.disabled,
                                    fill:
                                    idx < rating ? theme.palette.warning.main : "none",
                                }}
                                />
                            ))}
                            </Box>
                        </Box>
                        </Box>
                    </Box>
                    );
                })}

                {grupo.clientes.length > 5 && (
                    <Button
                    onClick={() => toggleGroup(label)}
                    fullWidth
                    variant="outlined"
                    sx={{
                        mt: 2,
                        borderRadius: 3,
                        color: theme.palette.text.primary,
                        borderColor: theme.palette.divider,
                        textTransform: "none",
                    }}
                    >
                    {isExpanded ? (
                        <>
                        Mostrar menos <ChevronUp size={16} />
                        </>
                    ) : (
                        <>
                        Ver todos ({grupo.clientes.length - 5} más) <ChevronDown size={16} />
                        </>
                    )}
                    </Button>
                )}
                </Box>
            </Box>
            );
        })}
        </Box>
    </Box>
  );
}
