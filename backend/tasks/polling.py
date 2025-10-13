from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio
from services.database_manager import SupabaseManager

manager = SupabaseManager()

def schedule_polling(scheduler: AsyncIOScheduler):
    """
    Programa el job de polling cada N segundos.
    El propio job puede reprogramarse dinámicamente según éxito o fallo.
    """
    def job():
        asyncio.run(run_polling())

    #scheduler.add_job(job, 'interval', minutes=5, id='poll_clients')

async def run_polling():
    try:
        data = await manager.get_clients_page(page=1, size=50)
        # Aquí almacenas data en base interna (no Redis). Ej: en memoria o BD relacional.
        print(f"Polled {len(data)} clients_pravi")
    except Exception as e:
        print(f"Polling error: {e}")