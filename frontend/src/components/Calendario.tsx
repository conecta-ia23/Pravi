import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import esLocale from "@fullcalendar/core/locales/es";
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Box } from '@mui/material';
import { supabase } from "../hooks/supabaseClients";
import "../ui/Calendario.css";
const Calendario = () => {
  const [eventos, setEventos] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const handleEventClick = (clickInfo: any) => {
    setSelectedEvent(clickInfo.event);
  };
  
  const handleClose = () => {
    setSelectedEvent(null);
  };

  useEffect(() => {
    // 👉 Aquí se puede conectar con n8n/Supabase en el futuro
   async function fetchEvents() {
      const { data, error } = await supabase
        .from('clients_pravi')
        .select('id, nombre, cita, tipo_cliente')
        .not('cita', 'is', null);
        
      if (error) {
        console.error('Error al obtener citas:', error);
        return;
      }
   // Mapear a formato que espera FullCalendar
      const mappedEvents = data?.map(event => ({
        id: event.id,
        title: event.nombre,
        start: event.cita,
        end: event.cita ? new Date(new Date(event.cita).getTime() + 60 * 60 * 1000).toISOString() : undefined,
      })) || [];
      
      setEventos(mappedEvents);
    }

    fetchEvents();
  }, []);

  function renderEventContent(eventInfo: any) {
   return (
      <>
        <b>{eventInfo.timeText}</b> <br />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '100%'}}>
          {eventInfo.event.title}
        </span>
      </>
    );
  };

  return (
    <>
    <Box sx={{ minWidth: 40, mx: 'auto', p: 2, mt: 2, color: 'var(--text-color)', backgroundColor: 'var(--card-bg)', borderRadius: 2, boxShadow: 3 }}>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin ]}
        initialView="dayGridMonth"
        events={eventos}
        locale={esLocale}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
        }}
        eventContent={renderEventContent}
        eventClick={handleEventClick}
        height="auto"
      />
    </Box>

      <Dialog open={Boolean(selectedEvent)} onClose={handleClose}>
        <DialogTitle>{selectedEvent?.title}</DialogTitle>
        <DialogContent dividers>
          <DialogContentText>
            <b>Fecha:</b> {selectedEvent?.start?.toLocaleString()} <br />
            <b>Empresa:</b> {selectedEvent?.extendedProps.empresa || 'No disponible'} <br />
            {/* Agrega aquí más detalles si lo deseas */}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default Calendario;


