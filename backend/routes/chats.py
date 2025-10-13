from fastapi import APIRouter, Body, Query, UploadFile, File, Form, HTTPException
from schemas.chat import BotActivationRequest, AdvisorMessageRequest
from services.chat_manager import (get_active_conversations , 
                                   get_conversations_messages,
                                   get_bot_status, 
                                   get_new_messages_since, send_advisor_message_to_session, 
                                   send_media_message_to_session, supabase )

router = APIRouter(prefix="/chat", tags=["Chat Viewer"])

@router.get("/conversation")
async def list_conversations():
    return await get_active_conversations()

@router.get("/messages/{session_id}")
async def list_messages(session_id: str):
    return await get_conversations_messages(session_id)

@router.get("/updates")
async def get_updates(since:str = Query(None)):
    return await get_new_messages_since(since)

@router.get("/bot-status/{session_id}")
async def get_bot_status_endpoint(session_id: str):
    """Obtiene el estado del bot para una sesión"""
    status = await get_bot_status(session_id)
    return {"session_id": session_id, "is_active": status}

@router.post("/bot-status")
async def set_bot_status(
    payload: BotActivationRequest = Body(...)
):
    try:
        record = {
            "session_id": payload.session_id,
            "is_active": payload.is_active
        }
        result = supabase.client.table("chat_activation_pravi") \
            .upsert(record, on_conflict="session_id") \
            .execute()

        status = "bot_resumed" if payload.is_active else "bot_paused"
        return {"status": status, "data": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating bot status: {e}")

# Agregar este endpoint a tu archivo chats.py
@router.post("/send-advisor-message")
async def send_advisor_message(payload: AdvisorMessageRequest):
    """Endpoint para enviar mensajes del asesor"""
    session_id = payload.session_id
    message = payload.message

    if not session_id or not message:
        raise HTTPException(status_code=400, detail="session_id y message son requeridos")
    
    return await send_advisor_message_to_session(session_id, message)

@router.post("/send-media")
async def send_media(
    session_id: str = Form(...),
    media_type: str = Form(...),
    file: UploadFile = File(...)
):
    return await send_media_message_to_session(session_id, file, media_type)


#Futura mejora// no se si funcione pero por ahora no se implementará, a menos que sea necesaria de urgencia

#@router.get("/last-message-id/{session_id}")
#async def get_last_message_id(session_id: str):
#   response = supabase.client.table("n8n_chat_pravi")\
#       .select("id")\
#       .eq("session_id", session_id)\
#       .order("id", desc=True)\
#       .limit(1)\
#       .execute()
#   return response.data[0] if response.data else None

