// Comercial.tsx
import ChatViewer from "../components/ChatViewer";
import Datos from "../components/Datos"
import Dashboard from "../components/Dashboard";
import Clasificacion from "./Clasificacion";
import Cotizacion from "../components/Cotizacion";

import { ThemeToggle } from "../context/themeToogle"; 
import { Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  MessageCircle,
  LayoutGrid,
  BarChart2,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function Comercial() {
  const navigate = useNavigate();
  const [mensaje, setMensaje] = useState("");
  const [selectedTab, setSelectedTab] = useState("chat");

  useEffect(() => {
    setMensaje("Acceso concedido");
    const timer = setTimeout(() => setMensaje(""), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("rol");
    navigate("/");
  };

  const tabStyle = (active: boolean) => ({
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: active ? "var(--logout-color)" : "transparent",
    color: active ? "var(--card-text)" : "var(--text-color)",
    padding: "8px 12px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
    transition: "all 0.2s ease-in-out",
  });

  const navButtonStyle = {
    backgroundColor: "transparent",
    border: "none",
    color: "var(--text-color)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    padding: "8px 12px",
    borderRadius: "8px",
    transition: "background 0.2s",
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-color)",
        color: "var(--text-color)",
        fontFamily: "Poppins, sans-serif",
        display: "flex",
        justifyContent: "center",
        transition: "background-color 1s ease, color 0.5s ease", // <-- Agregado

      }}
    >
      <Box
        component="main"
        sx={{
          maxWidth: "1500px",
          width: "100%",
          flexDirection: "column",
          minHeight: "100vh",
          boxSizing: "border-box",
        }}
      >
        {/* Barra superior: botones, título y toggle */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
            mt: 2,
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          {/* Título */}
          <Typography variant="h4" fontWeight="bold" ml={1} sx={{ flex: 1, textAlign: "center" }}>
            Módulo Comercial
          </Typography>
          {/* Botón de cambio de tema */}
          <ThemeToggle />
        </Box>

        <Box sx={{ borderBottom: "1px solid var(--border-color)", mb: 2 }} />

        {/* Alerta */}
        {mensaje && (
          <Box
            sx={{
              position: "fixed",
              bottom: 24,
              right: 24,
              backgroundColor: "var(--card-bg)",
              color: "var(--text-color)",
              padding: "16px 20px",
              borderRadius: "12px",
              boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.4)",
              zIndex: 9999,
              maxWidth: 360,
              border: "1px solid transparent",
            }}
          >
            <Typography fontWeight={600} fontSize={16}>
              Acceso concedido
            </Typography>
            <Typography fontSize={14} color="#cbd5e1">
              Bienvenido al área de Comercial.
            </Typography>
          </Box>
        )}

        {/* Tabs */}
        <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap", marginLeft: 1 }}>
          <Box sx={tabStyle(selectedTab === "chat")} onClick={() => setSelectedTab("chat")}>
            <MessageCircle size={16} />
            <span>Chat</span>
          </Box>
          <Box sx={tabStyle(selectedTab === "clasificacion")} onClick={() => setSelectedTab("clasificacion")}>
            <BarChart2 size={16} />
            <span>Clasificacion</span>
          </Box>
          <Box sx={tabStyle(selectedTab === "datos")} onClick={() => setSelectedTab("datos")}>
            <BarChart2 size={16} />
            <span>Datos</span>
          </Box>
          <Box sx={tabStyle(selectedTab === "cotizacion")} onClick={() => setSelectedTab("cotizacion")}>
            <LayoutGrid size={16} />
            <span>Cotizaciones</span>
          </Box>
          <Box sx={tabStyle(selectedTab === "dashboard")} onClick={() => setSelectedTab("dashboard")}>
            <LayoutGrid size={16} />
            <span>Dashboard</span>
          </Box>
        </Box>

        {/* Panel dinámico */}
        {selectedTab === "chat" && <ChatViewer />}
        {selectedTab === "clasificacion" && <Clasificacion />}
        {selectedTab === "datos" && <Datos />}
        {selectedTab === "cotizacion" && <Cotizacion />}
        {selectedTab === "dashboard" && <Dashboard />}
        {/* Botones de navegación */}
        <Box sx={{ display: "flex", gap: 3, mt: 3, mb: 3 }}>
          <Box
            component="button"
            onClick={() => navigate("/home")}
            sx={navButtonStyle}
          >
            <LayoutGrid size={18} />
            Panel Principal
          </Box>
          <Box
            component="button"
            onClick={handleLogout}
            sx={navButtonStyle}
          >
            <LogOut size={18} />
            Cerrar Sesión
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
