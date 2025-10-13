import { useEffect, useState } from 'react';
import { DistributionChart } from '../ui/DistributionChart';
import DashboardFaseBarChart from '../ui/DashboardFaseBarChart';
import DashboardCitasPieChart from '../ui/DashboardCitasPieChart';
import FollowupChart from '../ui/Followupchart';
import ProjectDurationChart from '../ui/ProjectDurationChart';
import DashboardAppointmentHours from '../ui/DashboardApointmentHour';
import DashboardKPIs from '../ui/DashboardKPIs';
import { fetchDashboardCross } from '../services/api';
import ClasificacionDashboard from '../ui/ClasificationDashboard';
import { Box, useTheme, useMediaQuery } from '@mui/material';

export default function Dashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Altura fija para los charts, ajustable por breakpoint
  const chartGap = isMobile ? 1.5 : 2.5;

  const [, setData] = useState<{ tipo: string; cantidad: number }[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardCross('negocio', 'id')
      .then((res: Record<string, Record<string, number>>) => {
        const formatted = Object.entries(res).map(([tipo, ids]) => ({
          tipo,
          cantidad: Object.values(ids).filter(v => v === 1).length,
        }));
        setData(formatted);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box
      sx={{
        padding: 2,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        gap: 4,
        margin: { xs: 1.5, sm: 3 },
        '&::-webkit-scrollbar': {
        display: 'none',
        },
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none', // Internet Explorer y Edge
      }}
    >
      {/* KPIs Section */}
      <Box sx={{ mb: chartGap + 1, width: '100%' }}>
        <DashboardKPIs />
      </Box>

      {/* Main Charts Grid */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          width: '100%',
        }}
      >
        {/* Columna izquierda */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ minHeight: { xs: 220, sm: 260, md: 320 }, mb: 2 }}>
            <DistributionChart />
          </Box>
          <Box sx={{ minHeight: { xs: 220, sm: 260, md: 320 }, mb: 2 }}>
            <FollowupChart />
          </Box>
          <Box sx={{ minHeight: { xs: 220, sm: 260, md: 320 } }}>
            <ClasificacionDashboard />
          </Box>
        </Box>

        {/* Columna derecha */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ minHeight: { xs: 220, sm: 260, md: 320 }, mb: 2 }}>
            <DashboardFaseBarChart />
          </Box>
          <Box sx={{ minHeight: { xs: 220, sm: 260, md: 320 }, mb: 2 }}>
            <DashboardCitasPieChart />
          </Box>
          <Box sx={{ minHeight: { xs: 220, sm: 260, md: 320 } }}>
            <ProjectDurationChart />
          </Box>
        </Box>
      </Box>

      {/* Bottom Full Width Chart */}
      <Box
        sx={{
          mt: chartGap + 1,
          width: '100%',
          height: isMobile ? 250 : 320,
          mb: 8,
        }}
      >
        <DashboardAppointmentHours />
      </Box>
    </Box>
  );
}