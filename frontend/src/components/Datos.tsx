// src/components/panels/comercial/Datos.tsx
import {useEffect, useState} from 'react';
import { fetchClients } from '../services/api';
import TableView from './TableView'
import type { Registro } from '../types/Registro';
import { Box, Typography, Paper, TextField, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';

export default function Datos(){
  const [clients, setClients] = useState<Registro[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size] = useState(20);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    telefono: '',
    nombre: '',
    categoria: '',
    estilo: '',
    calificacion: '',
    fechaInicio: '',
    fechaFin: ''
  });

  useEffect(() => {
    const load = async () =>{
      setLoading(true);
      try{
        const {total, data} = await fetchClients(page, size, filters);
        setTotal(total);
        setClients(data);
      }catch(error){
        console.error(error);
      }finally{
        setLoading(false);
      }
    };
    load();
  }, [page, size, filters]);

  // Handlers de filtros
  const onChangeFiltro = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPage(1); // Opcional: reiniciar a la página 1 cuando cambias un filtro
  };

  const limpiarFiltros = () => {
    setFilters({
      telefono: '',
      nombre: '',
      categoria: '',
      estilo: '',
      calificacion: '',
      fechaInicio: '',
      fechaFin: ''
    });
    setPage(1);
  };


  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      padding: 1,
    }}>
      <Typography variant="h6" gutterBottom sx={{ flexShrink: 0 }}>
        Registros comerciales
      </Typography>

      {/* Filtros */}
      <Paper sx={{ padding: 2, marginBottom: 2, flexShrink: 0, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <TextField
          label="Teléfono"
          size="small"
          value={filters.telefono}
          onChange={e => onChangeFiltro('telefono', e.target.value)}
          sx={{ minWidth: 170 }}
        />
        <TextField
          label="Nombre"
          size="small"
          value={filters.nombre}
          onChange={e => onChangeFiltro('nombre', e.target.value)}
          sx={{ minWidth: 170 }}
        />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Categoría</InputLabel>
          <Select
            label="Categoría"
            value={filters.categoria}
            onChange={e => onChangeFiltro('categoria', e.target.value)}
          >
            <MenuItem value="">Todas</MenuItem>
            {/* Completa con tus categorías */}
            <MenuItem value="Oficinas">Oficinas</MenuItem>
            <MenuItem value="Comercial">Comercial</MenuItem>
            <MenuItem value="Mobiliario">Mobiliario</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Estilo</InputLabel>
          <Select
            label="Estilo"
            value={filters.estilo}
            onChange={e => onChangeFiltro('estilo', e.target.value)}
          >
            <MenuItem value="">Todas</MenuItem>
            {/* Completa con tus estilos */}
            <MenuItem value="Clasico">Clasico</MenuItem>
            <MenuItem value="Contemporaneo">Contemporaneo</MenuItem>
            <MenuItem value="Industrial">Industrial</MenuItem>
            <MenuItem value="Minimalista">Minimalista</MenuItem>
          </Select>
        </FormControl>

        {/* Puedes agregar filtros de fecha si fetchClients lo soporta */}
        <TextField
          label="Desde"
          type="date"
          size="small"
          value={filters.fechaInicio}
          onChange={e => onChangeFiltro('fechaInicio', e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 150 }}
        />
        <TextField
          label="Hasta"
          type="date"
          size="small"
          value={filters.fechaFin}
          onChange={e => onChangeFiltro('fechaFin', e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 150 }}
        />

        <Button variant="outlined" color="secondary" onClick={limpiarFiltros}>
          Limpiar Filtros
        </Button>
      </Paper>


      <Box sx={{ 
        flex: 1,
        overflow: 'hidden',
        width: '100%',
      }}>
        <TableView
          data={clients}
          total={total}
          page={page}
          size={size}
          onPageChange={setPage}
          loading={loading}
        />
      </Box>
    </Box>
  );
}