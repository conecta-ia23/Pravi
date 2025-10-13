# services/dashboard_manager.py

import pandas as pd
from typing import Dict, Any
from services.database_module import DataProcessor
from services.database_manager import SupabaseManager

class DashboardManager:
    def __init__(self, supabase_manager: SupabaseManager):
        self.manager = supabase_manager
    
    async def _get_dataframe(self) -> pd.DataFrame:
        data = await self.manager.get_clients_page(page=1, size=1000)
        df = pd.DataFrame(DataProcessor.transform_data(data))
        df = DataProcessor.parse_dates(df)
        df = DataProcessor.add_derived_columns(df)
        return df

    async def get_metrics_summary(self) -> Dict[str, int]:
        data = await self.manager.get_clients_page(page=1, size=1000)
        df = pd.DataFrame(DataProcessor.transform_data(data))
        df = DataProcessor.parse_dates(df)
        df = DataProcessor.add_derived_columns(df)

        return {
        "total_clientes": int(len(df)),
        "con_cita": int(df["tiene_cita"].sum()),
        "sin_cita": int(len(df) - df["tiene_cita"].sum()),
        }


    async def get_distribution_data(self) -> Dict[str, Any]:
        data = await self.manager.get_clients_page(page=1, size=1000)
        df = pd.DataFrame(DataProcessor.transform_data(data))
        df = DataProcessor.parse_dates(df)
        df = DataProcessor.add_derived_columns(df)

        return {
            "por_origen": DataProcessor.get_distribution(df, column="origen"),
            "por_mes": DataProcessor.get_distribution(df, column="mes"),
            "calificacion": DataProcessor.get_qualification_distribution(df),
            "hora_contacto": DataProcessor.contact_hour_distribution(df),
            "categoria_vs_estlo": DataProcessor.cross_distribution(df, row="categoria", col="estilo")
        }

    async def get_filtered_metrics(self, filters: Dict[str, Any]) -> Dict[str, int]:
        data = await self.manager.get_clients_page(page=1, size=1000)
        df = pd.DataFrame(DataProcessor.transform_data(data))
        df = DataProcessor.parse_dates(df)
        df = DataProcessor.add_derived_columns(df)

        filtered_df = DataProcessor.filter_data(df, filters)
        return DataProcessor.get_client_counts(filtered_df)

    async def get_followup_analysis(self) -> Dict[str, int]:
        df = await self._get_dataframe()
        return DataProcessor.get_followup_success(df)
    
    async def get_clients_by_qualification(self) -> Dict[str, Any]:
        df = await self._get_dataframe()
        return DataProcessor.get_clients_by_qualification(df)

    async def get_appointment_hours(self) -> Dict[int, int]:
        df = await self._get_dataframe()
        return DataProcessor.get_appointment_hours_distribution(df)

    async def get_project_duration_distribution(self) -> Dict[str, int]:
        df = await self._get_dataframe()
        return DataProcessor.get_project_duration_distribution(df)

    async def get_custom_cross(self, col1: str, col2: str) -> Dict[str, Dict[str, int]]:
        df = await self._get_dataframe()
        return DataProcessor.get_cross_distribution(df, col1=col1, col2=col2)

    async def get_new_clients_this_month(self) -> int:
        df = await self._get_dataframe()
        current_month = pd.Timestamp.now().month
        current_year = pd.Timestamp.now().year
        return df[(df["mes_num"] == current_month) & (df["año"] == current_year)].shape[0]

    async def get_response_times(self) -> Dict[str, float]:
        df = await self._get_dataframe()
        if "primera_interaccion" in df and "ultima_interaccion" in df:
            df["tiempo_respuesta_dias"] = (
                df["ultima_interaccion"] - df["primera_interaccion"]
            ).dt.total_seconds() / (60 * 60 * 24)
            avg = round(df["tiempo_respuesta_dias"].mean(), 2)
            mediana = round(df["tiempo_respuesta_dias"].median(), 2)
            return {"promedio_dias": avg, "mediana_dias": mediana}
        return {}