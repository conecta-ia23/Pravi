import asyncio
from typing import Callable, Optional

class ThreadWorker:
    """ Ejecuta funciones bloqueantes en segundo plano de forma segura. """
    @staticmethod
    async def run_async(func: Callable, *args, **kwargs):
        return await asyncio.to_thread(func, *args, **kwargs)

class AsyncSupabaseWorker:
    """Versión moderna que soporta callbacks y ejecución controlada."""
    def __init__(
        self,
        target: Callable,
        args: Optional[tuple] = (),
        on_success: Optional[Callable] = None,
        on_error: Optional[Callable] = None,
        on_complete: Optional[Callable] = None
    ):
        self.target = target
        self.args = args or ()
        self.on_success = on_success
        self.on_error = on_error
        self.on_complete = on_complete

    async def run(self):
        try:
            result = await asyncio.to_thread(self.target, *self.args)
            if self.on_success:
                await self.on_success(result)
        except Exception as e:
            if self.on_error:
                await self.on_error(e)
        finally:
            if self.on_complete:
                await self.on_complete()