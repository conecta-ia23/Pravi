from services.database_manager import SupabaseManager
from datetime import datetime
from fastapi import UploadFile
import requests
import json
import os
from fastapi import HTTPException

#Configuración WhatsApp (agregar a tus variables de entorno)
WHATSAPP_API_URL = os.getenv("WHATSAPP_API_URL")
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")

supabase = SupabaseManager()

async def get_active_conversations():
    response = supabase.client.table("n8n_chat_pravi")\
        .select("*") \
        .order("time", desc=True) \
        .execute()
    
    data = response.data
    sessions = {}
    for row in data:
        sid = row["session_id"]
        if sid not in sessions:
            sessions[sid] = row
    return list(sessions.values())

async def get_conversations_messages(session_id: str):
    """
    Obtiene el histórico completo de mensajes para una sesión.
    """
    response = supabase.client.table("n8n_chat_pravi")\
        .select("*") \
        .eq("session_id", session_id) \
        .order("time") \
        .execute()
    return response.data

async def get_new_messages_since(since: str):
    """
    Recupera mensajes posteriores a un timestamp ISO 8601.
    """
    response = supabase.client.table("n8n_chat_pravi") \
        .select("*") \
        .gt("time", since) \
        .order("time") \
        .execute()
    return response.data


def upload_media(file_stream, filename: str, mime_type: str) -> str:
    url = f"{WHATSAPP_API_URL}/media"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
    }
    files = {
        "file": (filename, file_stream, mime_type),
    }
    data = {
        "messaging_product": "whatsapp",
        "type": mime_type,
    }
    response = requests.post(url, headers=headers, files=files, data=data)
    response.raise_for_status()
    media_id = response.json().get("id")
    return media_id

def send_media_message_to_whatsapp(to: str, media_id: str, media_type: str):
    url = f"{WHATSAPP_API_URL}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": media_type,
        media_type: {
            "id": media_id
        }
    }
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()

async def send_whatsapp_message(phone_number: str, message: str):
    """Envía mensaje a WhatsApp usando la API de Meta (adaptado de Ditto)"""
    try:
        response = requests.post(
            WHATSAPP_API_URL,
            json={
                "messaging_product": "whatsapp",
                "recipient_type": "individual", 
                "to": phone_number,
                "type": "text",
                "text": {"body": message}
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}"
            }
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error sending WhatsApp message: {e}")
        raise

async def send_advisor_message_to_session(session_id: str, message: str):
    is_active = await get_bot_status(session_id)
    if is_active:
        raise HTTPException(status_code=403, detail="El bot está activo. No se puede intervenir.")

    message_payload = {
        "type": "ai",
        "content": message,
        "tool_calls": [],
        "additional_kwargs": {},
        "response_metadata": {},
        "invalid_tool_calls": []
    }

    result = persist_message(session_id, message_payload)
    await send_whatsapp_message(session_id, message)
    return {"status": "message_sent", "data": result.data}


ALLOWED_TYPES = {"image/jpeg", "image/png", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
MAX_FILE_SIZE = 30 * 1024 * 1024  # 30MB
async def send_media_message_to_session(session_id: str, file: UploadFile, media_type: str):
    if media_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido")
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Archivo demasiado grande (máx 30MB)")
    
    is_active = await get_bot_status(session_id)
    if is_active:
        raise HTTPException(status_code=403, detail="El bot está activo. No se puede intervenir.")
    file_bytes = await file.read()
    path = f"chat/{file.filename}"

    try:
        supabase.client.storage.from_("media").upload(path, file_bytes)
        public_url = supabase.client.storage.from_("media").get_public_url(path).get("publicUrl")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error subiendo archivo: {e}")

    try:
        media_id = upload_media(file_bytes, file.filename, file.content_type)
        send_media_message_to_whatsapp(session_id, media_id, media_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error enviando multimedia a WhatsApp: {e}")

    message_payload = {
        "type": media_type,
        "content": f"Archivo enviado ({file.filename})",
        "mediaUrl": public_url,
        "tool_calls": [],
        "additional_kwargs": {},
        "response_metadata": {},
        "invalid_tool_calls": []
    }

    result = await persist_message(session_id, message_payload)
    return {"status": "media_sent", "mediaUrl": public_url, "data": result.data}


async def get_bot_status(session_id: str):
    """Obtiene el estado actual del bot para una sesión específica"""
    try:
        result = supabase.client.table("chat_activation_pravi")\
            .select("is_active")\
            .eq("session_id", session_id)\
            .execute()
        
        if result.data:
            return result.data[0]["is_active"]
        else:
            # Si no existe registro, crear uno activo por defecto
            supabase.client.table("chat_activation_pravi")\
                .insert({"session_id": session_id, "is_active": True})\
                .execute()
            return True
    except Exception as e:
        print(f"Error getting bot status: {e}")
        return True  # Por defecto activo
    
def persist_message(session_id: str, message_payload: dict):
    timestamp = datetime.utcnow().isoformat()
    try:
        response = supabase.client.table("n8n_chat_pravi").insert({
            "session_id": session_id,
            "message": json.dumps(message_payload),
            "time": timestamp
        }).execute()
        return response
    except Exception as e:
        print(f"Error persisting message: {e}")
        raise

# SI en algún momento queremos recuperar un archivo que fue enviado por el usuario y solo tienes el media_id.
#def get_media_url(media_id: str) -> str:
#    url = f"{WHATSAPP_API_URL}/{media_id}"
#    headers = {
#        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}"
#    }
#    response = requests.get(url, headers=headers)
#    response.raise_for_status()
#    json_resp = response.json()
#    return json_resp.get("url")