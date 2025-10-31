from pydantic import BaseModel
from typing import Optional, List

class CotizacionBase(BaseModel):
    id: int
    fecha_hora: Optional[str]
    nombre: Optional[str]
    telefono: Optional[str]
    correo: Optional[str]
    proyecto: Optional[str]
    estilo: Optional[str]
    espacios: Optional[str]
    area_m2: Optional[float]
    habitaciones: Optional[int]
    tiempo: Optional[str]
    distrito: Optional[str]
    diseno: Optional[float]
    mobiliario: Optional[float]
    acabados: Optional[float]
    precio_final: Optional[float]
    created_at: Optional[str] = None

class ListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    data: List[CotizacionBase]

class SummaryMetrics(BaseModel):
    total_cotizaciones: int
    suma_precio: float
    ticket_promedio: float
    m2_promedio: float

class SeriesPoint(BaseModel):
    x: str
    total: int
    suma_precio: float

class LabeledAgg(BaseModel):
    label: str
    total: int
    suma_precio: float
    promedio: float
