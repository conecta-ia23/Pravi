from pydantic import BaseModel
from typing import Optional, Union
from datetime import datetime

class ClientOut(BaseModel):
    primera_interaccion: Optional[datetime]
    ultima_interaccion: Optional[datetime]
    telefono: Optional[str]
    nombre: Optional[str]
    categoria: Optional[str]
    estilo: Optional[str]
    presupuesto: Optional[Union[int, float]]
    tiempo: Optional[str]
    planos: Optional[str]
    cita: Optional[datetime]
    cualificacion: Optional[str]
    resumen: Optional[str]
    correo: Optional[str]

    class Config:
        from_attributes = True