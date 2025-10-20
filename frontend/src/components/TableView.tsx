// src/components/panels/comercial/TableView.tsx
import { useState } from 'react';
import type { Registro } from '../types/Registro'; 
import type { GridColDef } from '@mui/x-data-grid';
import { DataGrid } from '@mui/x-data-grid';
import { 
  Box, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Typography,
  IconButton
} from '@mui/material';
import { Visibility, Close } from '@mui/icons-material';

interface TableViewProps {
  data: Registro[];
  total: number;
  page: number;
  size: number;
  loading?: boolean;
  onPageChange: (p: number) => void;
}

// Función para formatear fecha
const formatDateTime = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) return dateString;
    
    // Formatear como DD/MM/YYYY HH:mm
    return date.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false // Formato 24 horas
    });
  } catch (error) {
    return dateString; // Retornar el valor original si hay error
  }
};



export default function TableView({
  data, total, page, size, loading = false, onPageChange
}: TableViewProps) {
  const [openModal, setOpenModal] = useState(false);
  const [selectedResumen, setSelectedResumen] = useState<{
    nombre: string;
    resumen: string;
  } | null>(null);

  const handleOpenResumen = (nombre: string, resumen: string) => {
    setSelectedResumen({ nombre, resumen });
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedResumen(null);
  };

  // Crear las columnas con anchos optimizados para pantalla completa
  const columns: GridColDef[] = [
    { 
      field: 'primera_interaccion', 
      headerName: 'Primera Interacción', 
      width: 110,
      minWidth: 90,
      renderCell: (params) => formatDateTime(params.value)
    },
    { 
      field: 'ultima_interaccion', 
      headerName: 'Última Interacción', 
      width: 120,
      minWidth: 90,
      renderCell: (params) => formatDateTime(params.value)
    },
    { field: 'seguimiento', headerName: 'Seguimiento', width: 100, minWidth: 70,
      renderCell: (params) => {
        let backgroundColor = 'white';
        switch (params.value) {
          case 'Agendado':
            backgroundColor = '#4caf50'; // verde
            break;
          case 'Seguimiento':
            backgroundColor = '#f44336'; // rojo
            break;
          case 'No Cliente':
            backgroundColor = '#9e9e9e'; // gris
            break;
        }
        return (
          <Box 
            sx={{ 
              backgroundColor, 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              borderRadius: 1 }}
          >
            {params.value}
          </Box>
        );
      }
    },
    { field: 'telefono', headerName: 'Teléfono', width: 95, minWidth: 85 },
    { field: 'nombre', headerName: 'Nombre', width: 90, minWidth: 80 },
    { field: 'calificacion', headerName: 'Cualificación', 
      width: 150, minWidth: 60,
      renderCell: (params) => {
        let backgroundColor = 'white';
        switch (params.value) {
          case '1: Cliente Frío':
            backgroundColor = "#d6ccccf3";
            break;
          case '2: Cliente Interesado':
            backgroundColor = "#71c3ceff";
            break;
          case '3: Cliente Potencial':
            backgroundColor = "#f1b75aff";
            break;
          case '4: Cliente Pre-Calificado':
            backgroundColor = "#ce7752ff";
            break;
          case '5: Cliente Calificado':
            backgroundColor = "#4caf50ff";
            break;
        }
        return (
      <Box sx={{ backgroundColor, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1 }}>
        {params.value}
      </Box>
    );
    } 
  },
    { field: 'categoria', headerName: 'Categoría', width: 85, minWidth: 75 },
    { field: 'presupuesto', headerName: 'Presupuesto', width: 110, minWidth: 100 },
    { field: 'toma_decision', headerName: 'Decisión', width: 100, minWidth: 75 },
    { field: 'estilo', headerName: 'Estilo', width: 85, minWidth: 75 },
    { field: 'tiempo', headerName: 'Tiempo', width: 90, minWidth: 80 },
    { field: 'planos', headerName: 'Planos', width: 100, minWidth: 55 },
    { field: 'cita', headerName: 'Fecha cita', width: 90, minWidth: 75 },
    { field: 'correo', headerName: 'Correo', width: 85, minWidth: 70 },
    { 
      field: 'resumen', 
      headerName: 'Resumen', 
      width: 70,
      minWidth: 60,
      renderCell: (params) => (
        <Button
          variant="outlined"
          size="small"
          startIcon={<Visibility />}
          onClick={() => handleOpenResumen(params.row.nombre, params.value)}
          sx={{ 
            fontSize: '0.65rem',
            padding: '1px 4px',
            minWidth: 'auto',
            height: '26px',
            '& .MuiButton-startIcon': {
              marginRight: '2px',
              '& svg': {
                fontSize: '14px'
              }
            }
          }}
        >
          Ver
        </Button>
      ),
      sortable: false,
      align: 'center',
      headerAlign: 'center'
    },
  ];

  return (
    <Box sx={{ 
      height: '80vh', 
      width: '100%',
      maxWidth: '100vw',
      overflow: 'hidden', // Evita desbordamiento del contenedor
      '& .MuiDataGrid-root': {
        border: 'none',
        width: '100%',
        maxWidth: '100%',
      },
      '& .MuiDataGrid-main': {
        overflow: 'auto',
      },
      '& .MuiDataGrid-virtualScroller': {
        overflow: 'auto',
      },
      '& .MuiDataGrid-scrollbar--horizontal': {
        height: '12px !important',
      },
      '& .MuiDataGrid-scrollbar': {
        '&::-webkit-scrollbar': {
          height: '8px',
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: '#f1f1f1',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#c1c1c1',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: '#a8a8a8',
          },
        },
      },
    }}>
      <DataGrid
        rows={data}
        rowCount={total}
        columns={columns}
        pageSizeOptions={[size]}
        paginationMode="server"
        paginationModel={{ page: page - 1, pageSize: size }}
        onPaginationModelChange={(model) => onPageChange(model.page + 1)}
        loading={loading}
        getRowId={(row) => row.id}
        disableColumnMenu
        autoHeight={false}
        scrollbarSize={12}
        columnBufferPx={200} // Renderiza más columnas para scroll suave
        sx={{
          width: '100%',
          maxWidth: '100%',
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f5f5f5',
            fontWeight: 'bold',
            fontSize: '0.75rem',
            minHeight: '45px !important',
          },
          '& .MuiDataGrid-cell': {
            fontSize: '0.75rem',
            padding: '6px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          },
          '& .MuiDataGrid-row': {
            minHeight: '40px !important',
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: '#f9f9f9',
          },
        }}
        aria-label="Tabla de registros comerciales"
      />

      {/* Modal para mostrar el resumen */}
      <Dialog
        open={openModal}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 24
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1
        }}>
          <Typography variant="h6" component="div">
            Resumen de {selectedResumen?.nombre}
          </Typography>
          <IconButton
            onClick={handleCloseModal}
            size="small"
            sx={{ color: 'grey.500' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers sx={{ py: 3 }}>
          <Typography 
            variant="body1" 
            sx={{ 
              lineHeight: 1.6,
              whiteSpace: 'pre-line',
              color: 'text.primary'
            }}
          >
            {selectedResumen?.resumen || 'No hay resumen disponible'}
          </Typography>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={handleCloseModal} 
            variant="contained"
            size="small"
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}