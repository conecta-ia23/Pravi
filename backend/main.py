# backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from pydantic import BaseModel

# Importar tus modelos existentes
from routes.dashboard import router as dashboard_router
from routes.table_data import router as table_router
from services.database_manager import SupabaseManager
from services.database_module import DataProcessor
from routes import clients
from routes.clients import router as clients_router
from tasks.polling import schedule_polling
from routes import dashboard
from routes import table_data
from routes.chats import router as chat_router


app = FastAPI(title="VISOR-PRAVI API", version="1.0.0")

# Configurar CORS para React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # URL de tu app React
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar conexión a Supabase
app.include_router(dashboard_router)
app.include_router(table_router)
app.include_router(clients_router)
app.include_router(chat_router)

# Scheduler APScheduler
scheduler = AsyncIOScheduler()
schedule_polling(scheduler)
scheduler.start()

@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown()

@app.get("/")
async def root():
    return {"message": "VISOR-TRAN API is running"}
