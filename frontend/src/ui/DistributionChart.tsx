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
        const response = await fetch('http://localhost:8000/dashboard/cross', {
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
          padding: 8, // Use a single number for padding
          boxHeight: 10, // Use a single number for boxHeight
          font: {
            size: 11, // Use a single number for font size
          }
        }
      },
      tooltip: { 
        mode: 'index' as const, 
        intersect: false,
        titleFont: { size: 11 }, // Use a single number for font size
        bodyFont: { size: 10 },
      },
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: 12, // Use a single number for font size
          },
          maxRotation: 0, // Use a single number for maxRotation
        }
      },
      y: {
        ticks: {
          font: {
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
            <CircularProgress />
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