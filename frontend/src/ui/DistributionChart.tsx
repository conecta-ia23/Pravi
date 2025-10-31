import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';

import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress
} from '@mui/material';
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface RawCrossData {
  [categoria: string]: {
    [id: string]: number;
  };
}

export const DistributionChart: React.FC = () => {
  const [chartData, setChartData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${BASE_URL}/dashboard/cross`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ col1: 'categoria', col2: 'id' }),
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const raw: RawCrossData = await response.json();

        const categorias = Object.keys(raw);
        const labels = categorias;
        const data = categorias.map(negocio => {
          const ids = Object.values(raw[negocio]);
          return ids.reduce((sum, val) => sum + val, 0);
        });

        const backgroundColors = categorias.map((_, i) => getColor(i));

        setChartData({
          labels,
          datasets: [
            {
              label: 'Total por negocio',
              data,
              backgroundColor: backgroundColors,
            },
          ],
        });
      } catch (err: any) {
        console.error('Error al cargar datos:', err);
        setError(err.message);
      }
    };

    fetchData();
  }, []);

  const options = {
    responsive: true,
    maintainAspectRatio: false, // CLAVE: Permite que el chart se adapte al contenedor
    plugins: {
      legend: { 
        position: 'top' as const,
        labels: {
          color: "gray",
          padding: 8,
          boxHeight: 10,
          font: { size: 11 },
        }
      },
      tooltip: { 
        mode: 'index' as const, 
        intersect: false,
        backgroundColor: "var(--popover)",
        titleColor: "white",
        bodyColor: "var(--popover-foreground)",
        borderColor: "var(--border)",
        borderWidth: 1,
        titleFont: { size: 11 },
        bodyFont: { size: 10 },
      },
    },
    scales: {
      x: {
        ticks: {
          color: "gray",
          font: { size: 12 },
          maxRotation: 0,
        }
      },
      y: {
        ticks: {
          font: {
            color: "var(--muted-foreground)",
            size: 12, // Use a single number for font size
          }
        }
      }
    },
    layout: {
      padding: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      }
    },
  };

  return (
    <Card 
      elevation={3} 
      sx={{ 
        height: '100%', // ✅ Ocupa toda la altura del contenedor padre
        display: 'flex',
        flexDirection: 'column',
        bgcolor: "var(--card)",
        color: "var(--card-foreground)",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
      }}
    >
      <CardContent 
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          pb: 2, // Padding bottom consistente
          '&:last-child': { pb: 2 }, // Override MUI default
        }}
      >
        <Typography 
          variant="h6" 
          gutterBottom
          sx={{
            mb: { xs: 1, sm: 1.5 }, // Margen más compacto en mobile
            fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' }, // Título más pequeño en mobile
            flexShrink: 0, // No se comprime
            lineHeight: 1.2, // Altura de línea compacta
            color: "var(--card-foreground)",
          }}
        >
          Distribución por categoría de negocio
        </Typography>

        {error && (
          <Typography color="error" sx={{ mb: 2, flexShrink: 0 }}>
            Error: {error}
          </Typography>
        )}

        {!chartData ? (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              flex: 1, // ✅ Ocupa el espacio restante
            }}
          >
            <CircularProgress sx={{ color: "var(--ring)" }} />
          </Box>
        ) : (
          <Box 
            sx={{ 
              flex: 1, // ✅ Ocupa el espacio restante
              minHeight: 0, // Permite que se comprima si es necesario
              position: 'relative',
            }}
          >
            <Bar data={chartData} options={options} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// 🎨 Colores para cada categoría
function getColor(index: number): string {
  const palette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  return palette[index % palette.length];
  }