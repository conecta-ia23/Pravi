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
        "con_estilo": int(df["estilo"].notna().sum()),
        "calificados": int(df["calificacion"].notna().sum()),
        "seguimiento": int((df["seguimiento"] == "Seguimiento").sum()),
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
            "categoria_vs_estilo": DataProcessor.cross_distribution(df, row="categoria", col="estilo")
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
        if df.empty or 'primera_interaccion' not in df.columns:
            return 0

        # Cómputo de mes en zona horaria Lima (sin cambiar tu pipeline global)
        # Si tus timestamps son UTC-naive, ajustamos -5h para "simular" Lima.
        # Si ya guardas en hora local, esto no dañará (solo desplaza si corresponde).
        df = df.copy()
        df['primera_interaccion_local'] = df['primera_interaccion'] - pd.Timedelta(hours=5)

        now_lima = pd.Timestamp.now(tz='America/Lima')
        mes = now_lima.month
        anio = now_lima.year

        mask = (
            df['primera_interaccion_local'].dt.month.eq(mes) &
            df['primera_interaccion_local'].dt.year.eq(anio)
        )
        return int(mask.sum())

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