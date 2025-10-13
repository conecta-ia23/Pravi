// src/services/api.ts
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"; // Ajusta según entorno
//ESTO SE DEBE CAMBIAR CUANDO LO VAYAMOS A SUBIR A PRODUCCIÓN O CUANDO LO QUERRAMOS EJECUTAR EN LOCAL

//Dashboard
export async function fetchDashboardMetrics() {
  const res = await fetch(`${BASE_URL}/dashboard/metrics`);
  return await res.json();
}

export async function fetchDashboarDistribution() {
  const res = await fetch(`${BASE_URL}/dashboard/distribution`);
  return await res.json();
}

export async function fetchDashboardFollowup() {
  const res = await fetch(`${BASE_URL}/dashboard/followup`);
  return await res.json();
}

export async function fetchDashboardAppointmentHours() {
  const res = await fetch(`${BASE_URL}/dashboard/appointment-hours`);
  return await res.json();
}

export async function fetchDashboardProjectDuration() {
  const res = await fetch(`${BASE_URL}/dashboard/project-duration`);
  return await res.json();
}

export async function fetchDashboardNewClientsThisMonth() {
  const res = await fetch(`${BASE_URL}/dashboard/new-this-month`);
  return await res.json();
}

export async function fetchDashboardResponseTimes() {
  const res = await fetch(`${BASE_URL}/dashboard/response-times`);
  return await res.json();
}

export async function fetchDashboardFiltered(filters: Record<string, any>) {
  const res = await fetch(`${BASE_URL}/dashboard/filtered`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(filters)
  });
  return await res.json();
}

export async function fetchDashboardCross(col1: string, col2: string) {
  const res = await fetch(`${BASE_URL}/dashboard/cross`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ col1, col2 })
  });
  return await res.json();
}

export async function fetchDashboardClassification(){
  const res = await fetch(`${BASE_URL}/dashboard/qualification-distribution`);
  return await res.json();
}

//TableView
export async function fetchTableMetrics() {
  const res = await fetch(`${BASE_URL}/table-data/metrics`);
  return await res.json();
}

export async function fetchTableCharts() {
  const res = await fetch(`${BASE_URL}/table-data/charts`);
  return await res.json();
}

export async function fetchClients(
  page = 1,
  size = 50,
  filters: Record<string, string> = {}
) {
  // Construimos querystring con filtros
  const params = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
    ...filters
  });

  const res = await fetch(`${BASE_URL}/table-data/clients?${params}`);
  if (!res.ok) {
    throw new Error(`Error ${res.status}: al obtener clientes`);
  }
  return res.json(); // { total: number, data: any[] }
}

export async function fetchClientCount() {
  const res = await fetch(`${BASE_URL}/clients/count`);
  return await res.json();
}

//ChatViewer
export async function getConversations(){
  const res = await fetch(`${BASE_URL}/chat/conversation`);
  if (!res.ok) throw new Error("Error al obtener conversaciones");
  return await res.json();
}

export async function getMessages(session_id: string) {
  const res = await fetch(`${BASE_URL}/chat/messages/${session_id}`);
  if (!res.ok) throw new Error("Error al obtener mensajes");
  return res.json();
}

export async function fetchUpdates(since: string) {
  const res = await fetch(`${BASE_URL}/chat/updates?since=${encodeURIComponent(since)}`);
  if (!res.ok) throw new Error("Error al obtener nuevos mensajes");
  return res.json();
}

export async function fetchBotStatus(sessionId: string) {
  const res = await fetch(`${BASE_URL}/chat/bot-status/${sessionId}`);
  if (!res.ok) throw new Error("Error al obtener estado del bot");
  return res.json();
}

export async function toggleBot(sessionId: string, isActive: boolean) {
  const res = await fetch(`${BASE_URL}/chat/activation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, is_active: isActive }),
  });
  if (!res.ok) throw new Error("Error cambiando estado del bot");
  return res.json();
}

export async function sendAdvisorMsg(sessionId: string, content: string) {
  const res = await fetch(`${BASE_URL}/chat/send-advisor-message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message: content }),
  });
  if (!res.ok) throw new Error("Error al enviar mensaje del asesor");
  return res.json();
}

// Función para enviar mensaje de texto
export async function sendTextMessage({ session_id, message }: { session_id: string; message: string; }) {
  const formData = new FormData();
  formData.append("session_id", session_id);
  formData.append("message", message);

  const res = await fetch(`${BASE_URL}/chat/send-text`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Error enviando texto: ${await res.text()}`);
  }
  return res.json();
}

// Función para enviar archivo multimedia
export async function sendMediaToSession(sessionId: string, media_type: string, file: File) {
  const formData = new FormData();
  formData.append("session_id", sessionId);
  formData.append("media_type", media_type);
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/chat/send-media`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Error enviando archivo: ${await res.text()}`);
  }
  return res.json();
}

/* export function normalizeMessage(raw: any): Message {
  return {
    id: raw.id,
    session_id: raw.session_id,
    role: raw.message.type === "ai" ? "bot" : "user",
    content: raw.message.content,
    created_at: raw.time,
  };
} */
