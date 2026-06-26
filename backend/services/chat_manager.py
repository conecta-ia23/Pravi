from services.database_manager import SupabaseManager
from datetime import datetime
from fastapi import UploadFile, HTTPException
import requests
import json
import subprocess
import tempfile
from pathlib import Path
import os
import re
import unicodedata
from typing import Optional, Any, Dict

#Configuración WhatsApp (agregar a tus variables de entorno)
WHATSAPP_API_URL = os.getenv("WHATSAPP_API_URL")
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")

supabase = SupabaseManager()

ALLOWED_MEDIA_KINDS = {"image", "audio", "video", "document"}
DEFAULT_STORAGE_BUCKET = "media"

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
    whatsapp_api_base = (WHATSAPP_API_URL or "https://graph.facebook.com/v20.0").rstrip("/")
    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")

    if not WHATSAPP_ACCESS_TOKEN or not phone_number_id:
        raise Exception("Configuración de WhatsApp incompleta para subir multimedia")

    url = f"{whatsapp_api_base}/{phone_number_id}/media"

    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}"
    }

    files = {
        "file": (
            filename or "archivo",
            file_stream,
            mime_type or "application/octet-stream"
        )
    }

    data = {
        "messaging_product": "whatsapp"
    }

    response = requests.post(
        url,
        headers=headers,
        data=data,
        files=files,
        timeout=30
    )

    if not response.ok:
        raise Exception(f"{response.status_code} {response.text}")

    response_data = response.json()
    media_id = response_data.get("id")

    if not media_id:
        raise Exception(f"No se recibió media_id desde WhatsApp: {response_data}")

    return media_id
   
def normalize_media_type(media_type: str | None, mime_type: str | None = None) -> str:
    value = (media_type or mime_type or "").lower().strip()

    if value in {"image", "audio", "video", "document"}:
        return value

    if value.startswith("image/"):
        return "image"
    if value.startswith("audio/"):
        return "audio"
    if value.startswith("video/"):
        return "video"

    return "document"
def send_media_message_to_whatsapp(to: str, media_id: str, media_type: str):
    whatsapp_api_base = (WHATSAPP_API_URL or "https://graph.facebook.com/v20.0").rstrip("/")
    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")

    if not WHATSAPP_ACCESS_TOKEN or not phone_number_id:
        raise Exception("Configuración de WhatsApp incompleta para enviar multimedia")

    url = f"{whatsapp_api_base}/{phone_number_id}/messages"

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

    response = requests.post(url, headers=headers, json=payload, timeout=30)

    if not response.ok:
        raise Exception(f"{response.status_code} {response.text}")

    return response.json()

async def send_whatsapp_message(phone_number: str, message: str):
    """Envía mensaje de texto a WhatsApp usando la API de Meta."""
    try:
        whatsapp_api_base = (WHATSAPP_API_URL or "https://graph.facebook.com/v20.0").rstrip("/")
        phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")

        if not WHATSAPP_ACCESS_TOKEN or not phone_number_id:
            raise Exception("Configuración de WhatsApp incompleta para enviar mensaje")

        url = f"{whatsapp_api_base}/{phone_number_id}/messages"

        response = requests.post(
            url,
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
            },
            timeout=30
        )

        if not response.ok:
            raise Exception(f"{response.status_code} {response.text}")

        return response.json()

    except Exception as e:
        raise Exception(f"Error enviando mensaje a WhatsApp: {e}")

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

SUPPORTED_AUDIO_MIME_TYPES = {
    "audio/aac",
    "audio/mp4",
    "audio/mpeg",
    "audio/amr",
    "audio/ogg",
    "audio/opus",
}

def validate_inbound_media_payload(payload: Dict[str, Any]) -> None:
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Payload inválido")

    session_id = str(payload.get("session_id") or "").strip()
    media_id = str(payload.get("media_id") or "").strip()
    kind = str(payload.get("kind") or "").strip().lower()

    if not session_id:
        raise HTTPException(status_code=400, detail="session_id es requerido")
    if not media_id:
        raise HTTPException(status_code=400, detail="media_id es requerido")
    if kind not in ALLOWED_MEDIA_KINDS:
        raise HTTPException(status_code=400, detail="kind inválido")


def find_existing_inbound_media_message(session_id: str, media_id: str) -> Optional[Dict[str, Any]]:
    try:
        response = supabase.client.table("n8n_chat_pravi")\
            .select("id, message")\
            .eq("session_id", session_id)\
            .execute()
    except Exception as e:
        print(f"Error querying existing inbound media messages: {e}")
        return None

    for row in response.data or []:
        message_payload = row.get("message")
        parsed_payload: Optional[Dict[str, Any]] = None
        if isinstance(message_payload, str):
            try:
                parsed_payload = json.loads(message_payload)
            except json.JSONDecodeError:
                continue
        elif isinstance(message_payload, dict):
            parsed_payload = message_payload

        if isinstance(parsed_payload, dict):
            media_payload = parsed_payload.get("media")
            if isinstance(media_payload, dict) and media_payload.get("whatsapp_media_id") == media_id:
                return row

    return None


def get_whatsapp_media_url(media_id: str) -> str:
    if not WHATSAPP_API_URL or not WHATSAPP_ACCESS_TOKEN:
        raise HTTPException(status_code=500, detail="Configuración de WhatsApp incompleta")

    url = f"{WHATSAPP_API_URL}/{media_id}"
    try:
        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}"},
            timeout=30,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"No se pudo resolver la URL temporal del archivo: {exc}") from exc

    payload = response.json()
    if isinstance(payload, dict):
        media_url = payload.get("url")
        if media_url:
            return media_url
        data_payload = payload.get("data")
        if isinstance(data_payload, dict):
            media_url = data_payload.get("url")
            if media_url:
                return media_url

    raise HTTPException(status_code=502, detail="No se pudo resolver la URL temporal del archivo")


def download_whatsapp_media(media_url: str) -> bytes:
    try:
        access_token = os.getenv("WHATSAPP_ACCESS_TOKEN")
        headers = {
            "Authorization": f"Bearer {access_token}"
        }

        response = requests.get(media_url, headers=headers, timeout=30)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"No se pudo descargar el archivo desde WhatsApp: {exc}")
    return response.content
def sanitize_storage_filename(filename: str, media_id: str) -> str:
    raw_name = filename or f"media-{media_id}"
    normalized = unicodedata.normalize("NFKD", raw_name)
    ascii_name = normalized.encode("ascii", "ignore").decode("ascii")
    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", ascii_name).strip("._-")
    return safe_name or f"media-{media_id}"
def normalize_media_kind_by_mime(kind: str, mime: str) -> str:
    mime = (mime or "").lower()
    if mime.startswith("image/"):
        return "image"
    if mime.startswith("audio/"):
        return "audio"
    if mime.startswith("video/"):
        return "video"
    return kind or "document" 
def upload_inbound_media_to_storage(file_bytes: bytes, session_id: str, media_id: str, filename: str, mime_type: str) -> str:
    safe_filename = sanitize_storage_filename(filename, media_id)
    storage_path = f"whatsapp-inbound/{session_id}/{media_id}-{safe_filename}"
    try:
        storage_client = supabase.client.storage.from_(DEFAULT_STORAGE_BUCKET)

        storage_client.upload(
            storage_path,
            file_bytes,
            file_options={
                "content-type": mime_type or "application/octet-stream",
                "cache-control": "3600",
                "upsert": "true",
            }
        )

        public_url_response = storage_client.get_public_url(storage_path)

        if isinstance(public_url_response, dict):
            public_url = public_url_response.get("publicUrl") or public_url_response.get("public_url")
        else:
            public_url = public_url_response

        if not public_url:
            raise Exception("No public URL returned")

        return str(public_url)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error subiendo archivo a Supabase Storage: {e}")
def build_inbound_media_payload(public_url: str, kind: str, mime_type: str, filename: str, file_bytes: bytes, media_id: str) -> Dict[str, Any]:
    return {
        "url": public_url,
        "kind": kind,
        "mime": mime_type or "application/octet-stream",
        "name": filename,
        "size": len(file_bytes),
        "whatsapp_media_id": media_id,
    }


async def ingest_inbound_media_message(payload: Dict[str, Any], internal_token: Optional[str] = None) -> Dict[str, Any]:
    expected_token = os.getenv("INTERNAL_MEDIA_TOKEN")
    if not expected_token or internal_token != expected_token:
        raise HTTPException(status_code=401, detail="Unauthorized")

    validate_inbound_media_payload(payload)

    session_id = str(payload.get("session_id") or "").strip()
    media_id = str(payload.get("media_id") or "").strip()
    kind = str(payload.get("kind") or "").strip().lower()
    mime = str(payload.get("mime") or "").strip()
    kind = normalize_media_kind_by_mime(kind, mime)
    filename = str(payload.get("filename") or f"{kind}-{media_id}").strip()
    caption = str(payload.get("caption") or "").strip()

    existing_message = find_existing_inbound_media_message(session_id, media_id)
    if existing_message:
        return {
            "success": True,
            "status": "already_exists",
            "media": existing_message.get("message") and json.loads(existing_message.get("message")) if isinstance(existing_message.get("message"), str) else None,
            "message_id": existing_message.get("id"),
        }

    try:
        media_url = get_whatsapp_media_url(media_id)
        file_bytes = download_whatsapp_media(media_url)
        public_url = upload_inbound_media_to_storage(file_bytes, session_id, media_id, filename, mime)
        media_payload = build_inbound_media_payload(public_url, kind, mime, filename, file_bytes, media_id)
        message_payload = {
            "type": "human",
            "media": media_payload,
            "content": caption or "",
        }
        result = persist_message(session_id, message_payload)
        message_id = None
        if getattr(result, "data", None):
            message_id = result.data[0].get("id") if isinstance(result.data[0], dict) else None
        return {
            "success": True,
            "status": "created",
            "media": media_payload,
            "message_id": message_id,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando media entrante: {e}")
    


def convert_audio_to_mp3(file_bytes: bytes, filename: str) -> tuple[bytes, str, str]:
    original_suffix = Path(filename or "audio").suffix or ".audio"
    output_filename = f"{Path(filename or 'audio').stem}.mp3"

    with tempfile.NamedTemporaryFile(delete=False, suffix=original_suffix) as input_file:
        input_file.write(file_bytes)
        input_path = input_file.name

    output_path = f"{input_path}.mp3"

    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                input_path,
                "-vn",
                "-ar",
                "44100",
                "-ac",
                "1",
                "-b:a",
                "128k",
                output_path,
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        with open(output_path, "rb") as converted_file:
            converted_bytes = converted_file.read()

        return converted_bytes, output_filename, "audio/mpeg"

    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="FFmpeg no está instalado en api-pravi. No se puede convertir este audio."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo convertir el audio a MP3: {e}"
        )
    finally:
        try:
            os.remove(input_path)
        except Exception:
            pass

        try:
            os.remove(output_path)
        except Exception:
            pass


async def send_media_message_to_session(session_id: str, file: UploadFile, media_type: str):
    is_active = await get_bot_status(session_id)
    if is_active:
        raise HTTPException(status_code=403, detail="El bot está activo. No se puede intervenir.")

    file_bytes = await file.read()

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Archivo demasiado grande (máx 30MB)")

    mime_type = file.content_type or "application/octet-stream"
    wa_media_type = normalize_media_type(media_type, mime_type)
    upload_filename = file.filename or "archivo"

    if wa_media_type == "audio" and mime_type not in SUPPORTED_AUDIO_MIME_TYPES:
        file_bytes, upload_filename, mime_type = convert_audio_to_mp3(file_bytes, upload_filename)

    timestamp_id = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    safe_filename = sanitize_storage_filename(upload_filename, timestamp_id)
    path = f"chat/{session_id}/{timestamp_id}-{safe_filename}"

    try:
        storage_client = supabase.client.storage.from_("media")
        storage_client.upload(
            path,
            file_bytes,
            file_options={
                "content-type": mime_type,
                "cache-control": "3600",
                "upsert": "true",
            }
        )

        public_url_response = storage_client.get_public_url(path)

        if isinstance(public_url_response, dict):
            public_url = public_url_response.get("publicUrl") or public_url_response.get("public_url")
        else:
            public_url = public_url_response

        if not public_url:
            raise Exception("No public URL returned")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error subiendo archivo: {e}")

    try:
        media_id = upload_media(file_bytes, upload_filename, mime_type)
        send_media_message_to_whatsapp(session_id, media_id, wa_media_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error enviando multimedia a WhatsApp: {e}")

    message_payload = {
        "type": wa_media_type,
        "content": f"Archivo enviado ({upload_filename})",
        "mediaUrl": public_url,
        "tool_calls": [],
        "additional_kwargs": {},
        "response_metadata": {},
        "invalid_tool_calls": []
    }

    result = persist_message(session_id, message_payload)

    return {
        "status": "media_sent",
        "mediaUrl": public_url,
        "data": result.data
    }


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
            "message": message_payload,
            "time": timestamp,
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