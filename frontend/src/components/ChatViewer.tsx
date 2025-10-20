import { useState, useEffect, useRef } from "react";
import axios from "axios"
import { Pause, Play, Plus, Send } from "lucide-react";
import { useMediaQuery } from "@mui/material";
import { createClient } from "@supabase/supabase-js"
import { useTheme } from "@mui/material/styles";
import { useToast } from "../hooks/use-toast";

// Configuración de WhatsApp API
const WHATSAPP_API_URL = import.meta.env.VITE_WHATSAPP_API_URL || ""
const WHATSAPP_API_TOKEN = import.meta.env.VITE_WHATSAPP_API_TOKEN || ""
// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ""
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseKey)

const table_chat = "n8n_chat_pravi"
const table_active = "chat_activation_pravi"
const table_records = "clients_pravi" //tabla con los registros, cuando este cargado el nombre mostrarlo

interface Message {
  id: string
  session_id: string
  message: {
    type: "human" | "ai"
    content: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    additional_kwargs?: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response_metadata?: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tool_calls?: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    invalid_tool_calls?: any[]
  }
  time?: string
}

interface ClientInfo {
  nombre: string;
  tipo_cliente?: string | null;
  categoria?: string | null;
}

export default function ChatViewer() {
  const [conversations, setConversations] = useState<{ [key: string]: Message[] }>({})
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [searching, setSearching] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [inputMessage, setInputMessage] = useState("")
  const [isBotActive, setIsBotActive] = useState(true)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [activationStatusLoading, setActivationStatusLoading] = useState(false)
  const isMobile = useMediaQuery(useTheme().breakpoints.down('md'));
  const [error, setError] = useState<string | null>(null);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const conversationListRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const [clientsInfo, setClientsInfo] = useState<{[key: string]: ClientInfo}>({})
  const { toast } = useToast()

  const [showEditNameModal, setShowEditNameModal] = useState(false)
  const [editingName, setEditingName] = useState("")
  const [editingCategoria, setEditingCategoria] = useState("")
  const [editingTipoCliente, setEditingTipoCliente] = useState("")

  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [newPhoneNumber, setNewPhoneNumber] = useState("")
  const [newClientName, setNewClientName] = useState("")
  const [newClientMessage, setNewClientMessage] = useState("")
  
  const PAGE_SIZE = 200

  // Función principal para cargar conversaciones
  const fetchConversations = async (reset = false, searchTerm = searchQuery) => {
    try {
      if (reset) {
        setPage(0)
        setHasMore(true)
        if (!searching) setConversations({})
      }
      
      setLoadingMore(true)
      
      let query = supabase
        .from(table_chat)
        .select("*")
      
      // Agrupamos primero por session_id para obtener solo IDs de sesión únicos
      // Si hay término de búsqueda, lo aplicamos
      if (searchTerm) {
        // Primero buscamos en la tabla de clientes
        const { data: clientMatches, error: clientError } = await supabase
          .from(table_records)
          .select("telefono")
          .ilike("nombre", `%${searchTerm}%`);
        
        if (clientError) throw clientError;
        
        // Obtenemos los números de teléfono que coinciden con la búsqueda por nombre
        const matchingNumbers = clientMatches?.map(client => client.telefono) || [];
        
        // Si encontramos coincidencias por nombre
        if (matchingNumbers.length > 0) {
          query = query.or(`session_id.in.(${matchingNumbers.join(',')}),session_id.ilike.%${searchTerm}%,message->>content.ilike.%${searchTerm}%`);
        } else {
          // Si no hay coincidencias por nombre, buscamos solo en session_id y contenido
          query = query.or(`session_id.ilike.%${searchTerm}%,message->>content.ilike.%${searchTerm}%`);
        }
      }
      
      // Ordenamos por tiempo descendente y aplicamos paginación
      const { data, error } = await query
        .order("time", { ascending: false })
        .range(reset ? 0 : page * PAGE_SIZE, (reset ? 0 : page) * PAGE_SIZE + PAGE_SIZE - 1)
        
      if (error) throw error
      
      // Si no hay más datos para cargar
      if (!data || data.length === 0) {
        setHasMore(false)
        setLoadingMore(false)
        if (reset && !searchTerm) {
          setConversations({})
        }
        return
      }
      
      // Obtener los session_ids únicos de este lote
      const sessionIds = [...new Set(data.map(item => item.session_id))]
      
      // Agregar esta línea después:
      await loadClientsInfo(sessionIds)

      // Para cada session_id, cargar todos sus mensajes
      const newConversations: { [key: string]: Message[] } = { ...(!reset ? conversations : {}) }
      
      await Promise.all(sessionIds.map(async (sessionId) => {
        // Si ya tenemos esta conversación cargada y no estamos reseteando, no la volvemos a cargar
        if (!reset && newConversations[sessionId]) return
        
        const { data: sessionMessages, error: sessionError } = await supabase
          .from(table_chat)
          .select("*")
          .eq("session_id", sessionId)
          .order("time", { ascending: true })
        
        if (sessionError) throw sessionError
        
        if (sessionMessages && sessionMessages.length > 0) {
          newConversations[sessionId] = sessionMessages
        }
      }))
      
      setConversations(newConversations)
      
      // Si no hay sesión activa y hay conversaciones, seleccionamos la más reciente
      if (!activeSessionId && Object.keys(newConversations).length > 0 && reset) {
        const mostRecentSession = Object.entries(newConversations)
          .sort(([, messagesA], [, messagesB]) => {
            const lastTimeA = messagesA[messagesA.length - 1]?.time || ""
            const lastTimeB = messagesB[messagesB.length - 1]?.time || ""
            return new Date(lastTimeB).getTime() - new Date(lastTimeA).getTime()
          })[0][0]
        setActiveSessionId(mostRecentSession)
      }
      
      if (!reset) {
        setPage(prevPage => prevPage + 1)
      }
      
      setLoading(false)
      setLoadingMore(false)
    } catch (error) {
      console.error("Error fetching conversations:", error)
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      })
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const fetchClientInfo = async (phoneNumber: string) => {
    try {
      const { data, error } = await supabase
        .from(table_records)
        .select("nombre, tipo_cliente, categoria")
        .eq("telefono", phoneNumber)
      
      if (error) {
          console.error("Error fetching client info:", error)
        return null
      }
      
      if (!data || data.length === 0) {
        return null
      }
      return data[0]
    } catch (error) {
      console.error("Error fetching client info:", error)
      return null
    }
  }

  const loadClientsInfo = async (sessionIds: string[]) => {
    try {
      const clientsData: {[key: string]: ClientInfo} = {}
      
      await Promise.all(
        sessionIds.map(async (sessionId) => {
          const clientInfo = await fetchClientInfo(sessionId)
          if (clientInfo) {
            clientsData[sessionId] = clientInfo
          }
        })
      )
      
      setClientsInfo(prevClients => ({
        ...prevClients,
        ...clientsData
      }))
    } catch (error) {
      console.error("Error loading clients info:", error)
    }
  }

  const createNewChat = async () => {
    if (!newPhoneNumber.trim() || !newClientName.trim() || !newClientMessage.trim()) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios",
        variant: "destructive",
      })
      return
    }
    
    try {
      // Formato internacional para WhatsApp
      const formattedPhone = newPhoneNumber.startsWith('+') 
        ? newPhoneNumber.replace(/\s+/g, '') 
        : `+${newPhoneNumber.replace(/\s+/g, '')}`;
      
      // 1. Guardar la información del cliente en la tabla de clientes
      const { error: clientError } = await supabase
        .from(table_records)
        .upsert({
          telefono: formattedPhone,
          nombre: newClientName.trim()
        })
      
      if (clientError) throw clientError
      
      // 2. Crear un nuevo mensaje en la tabla de chat
      const timestamp = new Date().toISOString()
      
      const newMessage = {
        session_id: formattedPhone,
        message: {
          type: "ai",
          content: newClientMessage.trim(),
          tool_calls: [],
          additional_kwargs: {},
          response_metadata: {},
          invalid_tool_calls: []
        },
        time: timestamp
      }
      
      const { error: chatError } = await supabase
        .from(table_chat)
        .insert(newMessage)
      
      if (chatError) throw chatError
      
      // 3. Enviar el mensaje por WhatsApp
      await sendWhatsAppMessage(formattedPhone, newClientMessage.trim())
      
      // 4. Actualizar la UI y limpiar el formulario
      setShowNewChatModal(false)
      setNewPhoneNumber("")
      setNewClientName("")
      setNewClientMessage("")
      
      // 5. Cargar la conversación recién creada
      await fetchConversations(true)
      setActiveSessionId(formattedPhone)
      
      toast({
        title: "Éxito",
        description: "Mensaje enviado correctamente",
      })
    } catch (error) {
      console.error("Error creating new chat:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el nuevo chat",
        variant: "destructive",
      })
    }
  }

    const updateClientName = async () => {
      if (!activeSessionId || !editingName.trim()) return;
      
      try {
        const updates = {
          numero: activeSessionId,
          nombre: editingName.trim(),
          tipo_cliente: editingTipoCliente || undefined,
          categoria: editingCategoria || undefined
        };
        
        const { error } = await supabase
          .from(table_records)
          .upsert(updates)
          .eq("numero", activeSessionId);
        
        if (error) throw error;
        
        // Actualizar el estado local
        setClientsInfo(prev => ({
          ...prev,
          [activeSessionId]: {
            nombre: editingName.trim(),
            tipo_cliente: editingTipoCliente || undefined,
            categoria: editingCategoria || undefined
          }
        }));
        
        setShowEditNameModal(false);
        
        toast({
          title: "Nombre actualizado",
          description: "La información del cliente ha sido actualizada",
          variant: "default",
        });
      } catch (error) {
        console.error("Error updating client name:", error);
        toast({
          title: "Error",
          description: "No se pudo actualizar la información del cliente",
          variant: "destructive",
        });
      }
    };
  
  // Preparar datos al abrir el modal
  useEffect(() => {
    if (showEditNameModal && activeSessionId) {
      setEditingName(clientsInfo[activeSessionId]?.nombre || "");
      setEditingTipoCliente(clientsInfo[activeSessionId]?.tipo_cliente || "");
      setEditingCategoria(clientsInfo[activeSessionId]?.categoria || "");
    }
  }, [showEditNameModal, activeSessionId, clientsInfo]);


  // Cargar conversaciones iniciales
  useEffect(() => {
    fetchConversations(true)

  // Suscripción a cambios en la tabla de clientes
  const clientsSubscription = supabase
    .channel(`${table_records}_changes`)
    .on(
      "postgres_changes",
      {
        event: "*", // Escuchar todos los cambios (INSERT, UPDATE, DELETE)
        schema: "public",
        table: table_records,
      },
      (payload) => {
        const clientData = payload.new as {numero: string, nombre: string, tipo_cliente?: string, Categoria?: string};
        
        // Actualizar la información del cliente en el estado
        if (clientData && clientData.numero) {
          setClientsInfo(prev => ({
            ...prev,
            [clientData.numero]: clientData
          }));
        }
      },
    )
    .subscribe()
  // Set up real-time subscription
  const subscription = supabase
    .channel(`${table_chat}_changes`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",  // Solo escuchamos inserciones
        schema: "public",
        table: table_chat,
      },
      (payload) => {
        const newMessage = payload.new as Message;
        
        // Si es un mensaje para la conversación activa, lo añadimos al estado
        if (activeSessionId && newMessage.session_id === activeSessionId) {
          setConversations(prevConversations => ({
            ...prevConversations,
            [activeSessionId]: [
              ...(prevConversations[activeSessionId] || []),
              newMessage
            ]
          }));
        } 
        // Si es un mensaje para otra conversación, actualizamos solo esa conversación
        else if (newMessage.session_id) {
          // Si ya tenemos esta conversación cargada, añadimos el mensaje
          if (conversations[newMessage.session_id]) {
            setConversations(prevConversations => ({
              ...prevConversations,
              [newMessage.session_id]: [
                ...(prevConversations[newMessage.session_id] || []),
                newMessage
              ]
            }));
          } 
          // Si es una conversación nueva, la cargamos
          else {
            fetchActiveConversation(newMessage.session_id);
          }
        }
      },
    )
    .subscribe()

    return () => {
      subscription.unsubscribe()
      clientsSubscription.unsubscribe() 
    }
  }, [])
  
  // Cargar el estado de activación cuando cambia la sesión activa
  useEffect(() => {
    if (activeSessionId) {
      fetchActivationStatus(activeSessionId)
    }
  }, [activeSessionId])
  


  // Función para buscar en la base de datos
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    
    // Configuramos un debounce para no hacer demasiadas peticiones
    const newTimeout = setTimeout(() => {
      if (searchQuery) {
        setSearching(true)
        fetchConversations(true, searchQuery)
      } else if (searching) {
        setSearching(false)
        fetchConversations(true, "")
      }
    }, 500)
    
    setSearchTimeout(newTimeout)
    
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
    }
  }, [searchQuery])
  
  // Detector de scroll para cargar más conversaciones
  useEffect(() => {
    const handleScroll = () => {
      if (!conversationListRef.current || loadingMore || !hasMore) return
      
      const { scrollTop, scrollHeight, clientHeight } = conversationListRef.current
      // Si hemos llegado al 80% del scroll, cargamos más
      if (scrollTop + clientHeight >= scrollHeight * 0.8) {
        fetchConversations(false)
      }
    }
    
    const container = conversationListRef.current
    if (container) {
      container.addEventListener("scroll", handleScroll)
      return () => container.removeEventListener("scroll", handleScroll)
    }
  }, [conversationListRef, loadingMore, hasMore])
  
  // Cargar una conversación específica
  const fetchActiveConversation = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from(table_chat)
        .select("*")
        .eq("session_id", sessionId)
        .order("time", { ascending: true })
      
      if (error) throw error
      
      setConversations(prev => ({
        ...prev,
        [sessionId]: data || []
      }))

    } catch (error) {
      console.error("Error fetching active conversation:", error)
      toast({
        title: "Error",
        description: "Failed to load conversation",
        variant: "destructive",
      })
    }
  }
  
  // Cargar el estado de activación del chatbot
  const fetchActivationStatus = async (sessionId: string) => {
    try {
      setActivationStatusLoading(true)
      
      const { data, error } = await supabase
        .from(table_active)
        .select("*")
        .eq("session_id", sessionId)
        .single()
      
      if (error) {
        if (error.code === "PGRST116") { // No rows returned
          // Si no existe un registro, creamos uno con estado activo por defecto
          await supabase
            .from(table_active)
            .insert({ session_id: sessionId, is_active: true })
          
          setIsBotActive(true)
        } else {
          throw error
        }
      } else if (data) {
        setIsBotActive(data.is_active)
      }
      
      setActivationStatusLoading(false)
    } catch (error) {
      console.error("Error fetching activation status:", error)
      toast({
        title: "Error",
        description: "Failed to load chatbot status",
        variant: "destructive",
      })
      setActivationStatusLoading(false)
      // Por defecto, asumimos que está activo
      setIsBotActive(true)
    }
  }
  
  // Función para cambiar el estado de activación del chatbot
  const toggleChatbotStatus = async () => {
    if (!activeSessionId) return
    
    try {
      setActivationStatusLoading(true)
      
      // Si estamos desactivando el chatbot, mostramos el modal de recordatorio
      if (isBotActive) {
        setShowReminderModal(true)
      }
      
      const newStatus = !isBotActive
      
      // Actualizar en la base de datos
      const { error } = await supabase
        .from(table_active)
        .upsert({ 
          session_id: activeSessionId, 
          is_active: newStatus 
        })
      
      if (error) throw error
      
      setIsBotActive(newStatus)
      
      toast({
        title: newStatus ? "Chatbot activado" : "Chatbot desactivado",
        description: newStatus 
          ? "El chatbot ahora responderá automáticamente" 
          : "Ahora puedes responder manualmente a los mensajes",
        variant: newStatus ? "default" : "destructive",
      })
      
      setActivationStatusLoading(false)
    } catch (error) {
      console.error("Error toggling chatbot status:", error)
      toast({
        title: "Error",
        description: "Failed to update chatbot status",
        variant: "destructive",
      })
      setActivationStatusLoading(false)
    }
  }

// Función para enviar mensaje a WhatsApp
const sendWhatsAppMessage = async (phoneNumber: string, message: string) => {
  try {
    console.log("Sending to:", phoneNumber);
    console.log("Using URL:", WHATSAPP_API_URL);
    console.log("Token length:", WHATSAPP_API_TOKEN.length);
    
    const response = await axios.post(
      WHATSAPP_API_URL,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneNumber,
        type: "text",
        text: {
          body: message
        }
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${WHATSAPP_API_TOKEN}`
        }
      }
    );
    
    console.log("WhatsApp response:", response.data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("WhatsApp API Error:", error.response?.data);
      throw new Error(`WhatsApp API Error: ${error.response?.data?.error?.message || error.message}`);
    }
    throw error;
  }
};

  
  // Función para enviar mensaje manual
// Modificar la función sendMessage
const sendMessage = async () => {
  if (!activeSessionId || !inputMessage.trim() || isBotActive) return
  
  try {
    const timestamp = new Date().toISOString()
    
    // Crear el objeto de mensaje
    const newMessage = {
      session_id: activeSessionId,
      message: {
        type: "ai",
        content: inputMessage.trim(),
        tool_calls: [],
        additional_kwargs: {},
        response_metadata: {},
        invalid_tool_calls: []
      },
      time: timestamp
    }
    
    // Insertar en la base de datos
    const { error } = await supabase
      .from(table_chat)
      .insert(newMessage)
    
    if (error) throw error
    
    // Extraer el número de teléfono del session_id (asumiendo que session_id es el número de WhatsApp)
    const phoneNumber = activeSessionId
    
    // Enviar el mensaje a WhatsApp
    if (phoneNumber) {
      try {
        await sendWhatsAppMessage(phoneNumber, inputMessage.trim())
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (whatsAppError) {
        toast({
          title: "Error",
          description: "Failed to send message through WhatsApp API",
          variant: "destructive",
        })
      }
    }
    
    // Limpiar el input
    setInputMessage("")
    
  } catch (error) {
    console.error("Error sending message:", error)
    toast({
      title: "Error",
      description: "Failed to send message",
      variant: "destructive",
    })
  }
}

// Función para manejar envío de mensajes largos
const handleSendMessage = async () => {
  if (!activeSessionId || !nuevoMensaje.trim()) return;
  
  try {
    setActivationStatusLoading(true);
    
    const timestamp = new Date().toISOString();
    const newMessage = {
      session_id: activeSessionId,
      message: {
        type: "ai",
        content: nuevoMensaje.trim(),
        tool_calls: [],
        additional_kwargs: {},
        response_metadata: {},
        invalid_tool_calls: []
      },
      time: timestamp
    };
    
    // Insertar en base de datos
    const { error } = await supabase
      .from(table_chat)
      .insert(newMessage);
    
    if (error) throw error;
    
    // Enviar por WhatsApp
    await sendWhatsAppMessage(activeSessionId, nuevoMensaje.trim());
    
    // Limpiar y cerrar modal
    setNuevoMensaje("");
    setShowNewMessageModal(false);
    setActivationStatusLoading(false);
    
    toast({
      title: "Mensaje enviado",
      description: "El mensaje se ha enviado correctamente por WhatsApp",
    });
  } catch (error) {
    console.error("Error sending message:", error);
    setActivationStatusLoading(false);
    toast({
      title: "Error",
      description: "No se pudo enviar el mensaje",
      variant: "destructive",
    });
  }
};

  // Filter conversations based on loaded data and sort by last message time
  const filteredConversations = Object.entries(conversations)
    .sort(([, messagesA], [, messagesB]) => {
      const lastTimeA = messagesA[messagesA.length - 1]?.time || ""
      const lastTimeB = messagesB[messagesB.length - 1]?.time || ""
      return new Date(lastTimeB).getTime() - new Date(lastTimeA).getTime()
    })

  // Get the active conversation
  const activeConversation = activeSessionId ? conversations[activeSessionId] : null

  // Format date for conversation list: DD/MM/YYYY HH:MM
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  // Format time for message bubbles: HH:MM
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesRef.current && activeConversation?.length) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [activeConversation])

  return (
    <div className="flex h-[calc(100vh-140px)] overflow-hidden rounded-2xl relative">
      {/* Alert de Error Global */}
      {error && (
        <div className="absolute inset-x-0 top-0 z-[1000]">
          <div className="mx-3 mt-3 rounded-lg bg-red-600/90 text-white shadow p-3 flex items-start justify-between">
            <p className="text-sm leading-5">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-4 inline-flex h-6 w-6 items-center justify-center rounded hover:bg-white/10 focus:outline-none"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Sidebar - Lista de Conversaciones */}
      {(!isMobile || mobileMenuOpen) && (
        <div
          ref={conversationListRef}
        className={`${isMobile ? 'fixed inset-0 z-40 w-full' : 'w-[30%]'} bg-[var(--bg-color)] p-2 overflow-y-auto transition-all`}
        >
          {/* Si mobile: Botón cierre */}
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-2 right-2 rounded-full p-2 text-xl text-slate-400 hover:text-white bg-black/10"
              aria-label="Cerrar menú"
            >×</button>
          )}
          {/* Header del Sidebar */}
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[var(--text-color)] text-lg font-semibold">
              Conversaciones
            </h2>
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-1/2 rounded-md bg-[var(--border-color)] px-3 py-2 text-[var(--text-color)] placeholder:text-slate-400 outline-none ring-0 focus:ring-1 focus:ring-[var(--card-bg)] border border-transparent hover:border-slate-600"
            />
          </div>

          {/* Lista de Conversaciones */}
          {loading ? (
            <div className="flex justify-center mt-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            </div>
          ) : (
            <>
              {filteredConversations.map(([sessionId, msgs]: any) => {
                const lastTime = msgs[msgs.length - 1]?.time || '';
                const lastMessage = msgs[msgs.length - 1]?.message?.content || '';
                const isActive = sessionId === activeSessionId;
                const client = clientsInfo[sessionId];

                return (
                  <div
                    key={sessionId}
                    onClick={() => {
                      setActiveSessionId(sessionId);
                      if (isMobile) (window as any).requestAnimationFrame?.(() => {}), setTimeout(() => {}, 0);
                      if (isMobile) (window as any) && (document.activeElement as HTMLElement)?.blur?.();
                      if (isMobile) (mobileMenuOpen);
                    }}
                    className={`rounded-2xl p-3 mb-3 cursor-pointer flex items-center gap-3 transition-all ${
                      isActive
                        ? 'bg-[var(--secondary)] text-white'
                        : 'text-[var(--text-color)] hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <div className="bg-[var(--card-bg)] text-[var(--text-color)] rounded-full w-10 h-10 flex items-center justify-center text-base shrink-0">
                      👤
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-[15px] ${isActive ? 'font-semibold' : 'font-normal'} text-inherit overflow-hidden text-ellipsis whitespace-nowrap`}
                      >
                        {client?.nombre || sessionId}
                      </div>
                      <div className="text-[12px] text-inherit overflow-hidden text-ellipsis whitespace-nowrap mb-1">
                        {lastMessage}
                      </div>
                      <div className="text-[11px] text-inherit">{formatDate(lastTime)}</div>
                    </div>
                  </div>
                );
              })}

              {loadingMore && (
                <div className="flex justify-center mt-2">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                </div>
              )}

              {!hasMore && filteredConversations.length > 0 && (
                <p className="text-center text-slate-400 text-xs mt-2">
                  No hay más conversaciones
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Panel Principal de Chat */}
      {(!isMobile || !mobileMenuOpen) && (
        <div className="flex-1 flex flex-col bg-[var(--bg-color)]">
          {/* Header del Chat */}
          <div className="flex items-center justify-between p-3 border-b border-[var(--border-color)]">
            {/* Menu Mobile */}
             {isMobile && (
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex text-[#dc0b2c]"
                aria-label="Abrir menú"
              >
                <span className="i-lucide-menu text-2xl" />
              </button>
            )}

            {/* Info del Cliente */}
            <div className="flex items-center gap-2 flex-1">
              <div className="bg-slate-800 text-[var(--text-color)] rounded-full w-[42px] h-[42px] flex items-center justify-center text-[22px] shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
                👤
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <h3 className="text-[var(--text-color)] text-xl font-semibold">
                    {activeSessionId ? (clientsInfo[activeSessionId]?.nombre || activeSessionId) : 'Selecciona una conversación'}
                  </h3>
                  {activeSessionId && (
                    <button
                      onClick={() => setShowEditNameModal(true)}
                      className="ml-1 text-slate-400 hover:text-slate-200 inline-flex items-center justify-center h-6 w-6"
                      title="Editar información del cliente"
                    >
                      <span className="i-lucide-pencil text-[16px]" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">
                    {activeSessionId ? 'WhatsApp Chat' : 'Sin conversación activa'}
                  </span>
                  {activeSessionId && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-white text-[11px] h-5 ${
                        isBotActive ? 'bg-[#dc0b2c]' : 'bg-emerald-600'
                      }`}
                    >
                      <span className={`i-lucide-${isBotActive ? 'bot' : 'user'} text-[14px]`} />
                      {isBotActive ? 'Bot activo' : 'Asesor activo'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Controles del Header */}
            <div className="flex gap-2">
              {activeSessionId && (
                <>
                  <button
                    onClick={toggleChatbotStatus}
                    disabled={activationStatusLoading}
                    title={isBotActive ? 'Pausar bot' : 'Reactivar bot'}
                    className={`inline-flex items-center justify-center rounded-lg px-3 h-10 text-white disabled:bg-gray-500 disabled:text-gray-300 ${
                      isBotActive
                        ? 'bg-amber-500 hover:bg-amber-600'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {activationStatusLoading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                        isBotActive ? <Pause size={18} /> : <Play size={18} />
                      )}
                    </button>

                  {!isBotActive && (
                    <button
                      onClick={() => setShowNewMessageModal(true)}
                      disabled={activationStatusLoading}
                      title="Mensaje largo como asesor"
                      className="inline-flex items-center justify-center rounded-lg px-3 h-10 bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-500 disabled:text-gray-300"
                    >
                      <span className="i-lucide-pencil" />
                    </button>
                  )}
                </>
              )}

              <button
                onClick={() => setShowNewChatModal(true)}
                title="Nuevo chat"
                className="inline-flex items-center justify-center rounded-lg px-3 h-10 bg-[#dc0b2c] text-white hover:bg-[#b91c1c]"
                >
                  <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Área de Mensajes */}
          <div ref={chatMessagesRef} className="flex-1 overflow-y-auto p-3 pt-2">
            {loading || activationStatusLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              </div>
            ) : !activeConversation ? (
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <p className="text-slate-400 text-lg text-center">Selecciona una conversación</p>
                <p className="text-sm text-slate-400 text-center">Elige una conversación de la lista para ver los mensajes</p>
              </div>
            ) : activeConversation.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <p className="text-slate-400 text-center">No hay mensajes en esta conversación</p>
                <p className="text-sm text-slate-400 text-center">Los mensajes aparecerán aquí cuando el cliente escriba</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {activeConversation.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.message.type === 'human' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`${
                        msg.message.type === 'human'
                          ? 'bg-[var(--bubble-in)]'
                          : 'bg-[var(--accent)] text-[var(--bubble-out-foreground)]'
                      } px-3 py-2 rounded-2xl max-w-[70%] text-[14px] break-words shadow-[0_2px_8px_rgba(0,0,0,0.3)]`}
                    >
                      <div className="mb-1">{msg.message.content}</div>
                      <span className="block text-right opacity-70 text-[11px]">{formatTime(msg.time!)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Área de Input */}
          <div className="p-3 pt-0 border-t border-[var(--border-color)]">
            {isBotActive ? (
              <div className="mt-2 flex gap-2">
                <input
                  disabled
                  placeholder="El bot está manejando esta conversación..."
                  className="w-full h-14 rounded-2xl bg-[#363636] text-white px-4 outline-none border border-slate-700"
                />
                <button
                  disabled
                  className="rounded-xl min-w-12 h-14 bg-slate-700 flex items-center justify-center"
                  >
                    <Send size={24} className="text-slate-400" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e as any).key === 'Enter' && !(e as any).shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={activeSessionId ? 'Responder como asesor...' : 'Selecciona una conversación para responder'}
                  disabled={activationStatusLoading || !activeSessionId}
                  rows={1}
                  className="w-full max-h-28 rounded-xl bg-slate-800 text-white px-4 py-3 outline-none border border-slate-700 focus:border-[#dc0b2c] disabled:bg-slate-700 disabled:text-slate-400"
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage?.trim?.() || activationStatusLoading || !activeSessionId}
                  className="rounded-xl min-w-12 self-end h-12 bg-[#dc0b2c] text-white hover:bg-[#b91c1c] disabled:bg-gray-500 disabled:text-gray-300 flex items-center justify-center"
                >
                  {activationStatusLoading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : (
                    <span className="i-lucide-send" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Modales simples (sin librerías) ===== */}

      {/* Modal: Mensaje largo como asesor */}
      {showNewMessageModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowNewMessageModal(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 text-white shadow-xl">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
              <span className="i-lucide-user text-emerald-500" />
              <h4 className="font-semibold">Enviar mensaje como asesor</h4>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-400 mb-2">
                Este mensaje se enviará directamente al WhatsApp del cliente
              </p>
              <textarea
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 outline-none"
                rows={6}
                value={nuevoMensaje}
                onChange={(e) => setNuevoMensaje(e.target.value)}
                placeholder="Escribe tu mensaje aquí..."
                disabled={activationStatusLoading}
              />
            </div>
            <div className="px-4 py-3 border-t border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowNewMessageModal(false);
                  setNuevoMensaje('');
                }}
                disabled={activationStatusLoading}
                className="px-3 py-2 rounded-lg hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!nuevoMensaje?.trim?.() || activationStatusLoading}
                className="px-3 py-2 rounded-lg bg-[#dc0b2c] hover:bg-[#b91c1c] disabled:bg-gray-500"
              >
                {activationStatusLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  'Enviar a WhatsApp'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar información del cliente */}
      {showEditNameModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEditNameModal(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 text-white shadow-xl">
            <div className="px-4 py-3 border-b border-slate-700">
              <h4 className="font-semibold">Editar información del cliente</h4>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-sm text-slate-300">Nombre del cliente</label>
                <input
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 outline-none"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  placeholder="Ingresa el nombre del cliente"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-slate-300">Tipo de cliente</label>
                <input
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 outline-none"
                  value={editingTipoCliente}
                  onChange={(e) => setEditingTipoCliente(e.target.value)}
                  placeholder="Ej: Premium, Regular, Nuevo"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-slate-300">categoria</label>
                <input
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 outline-none"
                  value={editingCategoria}
                  onChange={(e) => setEditingCategoria(e.target.value)}
                  placeholder="categoria del cliente"
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-700 flex justify-end gap-2">
              <button onClick={() => setShowEditNameModal(false)} className="px-3 py-2 rounded-lg hover:bg-white/5">
                Cancelar
              </button>
              <button
                onClick={updateClientName}
                disabled={!editingName?.trim?.()}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-60"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nuevo Chat */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowNewChatModal(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 text-white shadow-xl">
            <div className="px-4 py-3 border-b border-slate-700">
              <h4 className="font-semibold">Crear nueva conversación</h4>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-sm text-slate-300">Número de teléfono</label>
                <input
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 outline-none"
                  value={newPhoneNumber}
                  onChange={(e) => setNewPhoneNumber(e.target.value)}
                  placeholder="+51999999999"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-slate-300">Nombre del cliente</label>
                <input
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 outline-none"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Nombre del cliente"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-slate-300">Mensaje inicial</label>
                <textarea
                  rows={4}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 outline-none"
                  value={newClientMessage}
                  onChange={(e) => setNewClientMessage(e.target.value)}
                  placeholder="Mensaje que se enviará al cliente"
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-700 flex justify-end gap-2">
              <button onClick={() => setShowNewChatModal(false)} className="px-3 py-2 rounded-lg hover:bg-white/5">
                Cancelar
              </button>
              <button
                onClick={createNewChat}
                disabled={!newPhoneNumber?.trim?.() || !newClientName?.trim?.() || !newClientMessage?.trim?.()}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-60"
              >
                Crear y Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Recordatorio */}
      {showReminderModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowReminderModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 text-white shadow-xl">
            <div className="px-4 py-3 border-b border-slate-700">
              <h4 className="font-semibold">Chatbot desactivado</h4>
            </div>
            <div className="p-4">
              <p>
                Has desactivado el chatbot para esta conversación. Recuerda reactivarlo cuando termines de atender al cliente manualmente.
              </p>
            </div>
            <div className="px-4 py-3 border-t border-slate-700 flex justify-end">
              <button
                onClick={() => setShowReminderModal(false)}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
