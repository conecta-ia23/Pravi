import React, { useEffect, useState } from "react";
import { fetchDashboardAppointmentHours } from "../services/api";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Chip
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  Tooltip} from 'recharts';

interface HourData {
  hour: number;
  count: number;
}

const DashboardAppointmentHour: React.FC = () => {
  const [data, setData] = useState<HourData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const result = await fetchDashboardAppointmentHours();
        setData(result);
      } catch (err) {
        setError('Error al cargar los datos de horas de citas');
        console.error('Error fetching appointment hours:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Función para determinar el color de cada barra basado en la intensidad
  const getBarColor = (count: number, maxCount: number) => {
    if (maxCount === 0) return '#E0E0E0';
    
    const percentage = count / maxCount;
    if (percentage >= 0.8) return '#424242'; // Gris muy oscuro
    if (percentage >= 0.6) return '#616161'; // Gris oscuro
    if (percentage >= 0.4) return '#757575'; // Gris medio oscuro
    if (percentage >= 0.2) return '#9E9E9E'; // Gris medio
    if (percentage > 0) return '#BDBDBD'; // Gris claro
    return '#E0E0E0'; // Gris muy claro para cero
  };

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: 1,
            p: 1,
            boxShadow: 2
          }}
        >
          <Typography variant="body2" color="text.primary">
            {`Hora: ${label}:00`}
          </Typography>
          <Typography variant="body2" color="primary">
            {`Citas: ${payload[0].value}`}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  // Calcular estadísticas
  const totalCitas = data.reduce((sum, item) => sum + item.count, 0);
  const maxCount = Math.max(...data.map(d => d.count));
  const peakHour = data.find(item => item.count === maxCount);

  if (loading) {
    return (
      <Card sx={{ height: 500 }}>
        <CardContent>
          <Box 
            display="flex" 
            justifyContent="center" 
            alignItems="center" 
            height="100%"
          >
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ height: 500 }}>
        <CardContent>
          <Alert severity="error" sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: { xs: 400, sm: 450, md: 500 }, 
      width: '100%',
      minHeight: 350 }}>
      <CardContent sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        p: { xs: 1, sm: 2 }
      }}>
        {/* Header con título y estadísticas */}
        <Box mb={{ xs: 1, sm: 2 }} sx={{ flexShrink: 0 }}>
          <Typography variant="h6" component="h2" gutterBottom align="center" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }}}>
            Horas con Mayor Concurrencia
          </Typography>
          
          <Grid container spacing={2} justifyContent="center" sx={{ mb: 1 }}>
            <Box>
              <Chip 
                label={`Total: ${totalCitas} citas`} 
                color="primary" 
                variant="outlined"
                size="small"
                sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}
              />
            </Box>
            {peakHour && (
              <Box>
                <Chip 
                  label={`Pico: ${peakHour.hour}:00 (${peakHour.count} citas)`} 
                  color="secondary" 
                  variant="outlined"
                  size="small"
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}
                />
              </Box>
            )}
          </Grid>
        </Box>

        {/* Gráfico */}
        <Box sx={{ flexGrow: 1, minHeight: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 40,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis 
                dataKey="hour"
                tick={{ fontSize: 12, fill: '#666' }}
                axisLine={{ stroke: '#BDBDBD' }}
                tickLine={{ stroke: '#BDBDBD' }}
                interval={0}
                angle={0}
                textAnchor="middle"
                label={{ 
                  value: 'Hora', 
                  position: 'insideBottom', 
                  offset: { xs: -25, sm: -10 },
                  style: { 
                    textAnchor: 'middle', 
                    fontSize: { xs: '12px', sm: '14px' }, 
                    fill: '#666' 
                  }
                }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#666' }}
                axisLine={{ stroke: '#BDBDBD' }}
                tickLine={{ stroke: '#BDBDBD' }}
                label={{ 
                  value: 'Cantidad de citas', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: '12px', fill: '#666' }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="count" 
                radius={[2, 2, 0, 0]}
                stroke="#BDBDBD"
                strokeWidth={0.5}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getBarColor(entry.count, maxCount)} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default DashboardAppointmentHour;