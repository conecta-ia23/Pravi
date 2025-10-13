import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

class DataProcessor:
    @staticmethod
    def parse_dates(df: pd.DataFrame) -> pd.DataFrame:
        for col in ['primera_interaccion', 'ultima_interaccion', 'cita']:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], errors='coerce')
        return df

    @staticmethod
    def add_derived_columns(df: pd.DataFrame) -> pd.DataFrame:
        """
        Enriquecer el DataFrame con columnas derivadas útiles para navegación, análisis y visualización.
        """
        meses_es = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ]
        # Datos derivados de la primera interacción
        if 'primera_interaccion' in df.columns:
            df['hora_contacto'] = df['primera_interaccion'].dt.hour
            df['mes_num'] = df['primera_interaccion'].dt.month
            df['mes'] = df['mes_num'].apply(
                lambda x: meses_es[int(x) - 1] if pd.notna(x) and int(x) in range(1, 13) else "Desconocido"
            )
            df['año'] = df['primera_interaccion'].dt.year
        # Datos derivados de citas
        if 'cita' in df.columns:
            df['tiene_cita'] = ~df['cita'].isna()
            df['hora_cita'] = df['cita'].dt.hour  # necesaria para appointment-hours
        # Cálculo de duración del proyecto en meses
        if 'tiempo_meses' in df.columns:
            df['tiempo_meses'] = pd.to_numeric(df['tiempo_meses'], errors='coerce')
        # Calificación personalizada (si no existe)
        if 'calificacion' in df.columns:
            df['calificacion'] = df.apply(DataProcessor._calculate_qualification, axis=1)
        return df

    @staticmethod
    def _calculate_qualification(row: pd.Series) -> str:
        # 5: Si tiene cita programada (cita no NaN)
        if pd.notna(row.get("cita")):
            return "5: Cliente Calificado"
        # 4: Si ya cargó planos
        if bool(row.get("planos")):
            return "4: Cliente Pre-Calificado"
        # 3: Si indicó un tiempo definido
        if pd.notna(row.get("tiempo")) and row.get("tiempo") != "":
            return "3: Cliente Potencial"
        # 2: Si tiene estilo, presupuesto, toma de decisión o categoría asignada
        if any(pd.notna(row.get(col)) and row.get(col) != "" for col in ["estilo", "presupuesto", "toma_decision", "categoria"]):
            return "2: Cliente Interesado"
        # 1: Si por lo menos tiene categoría
        if pd.notna(row.get("categoria")) and row.get("categoria") != "":
            return "1: Cliente Frío"
        # 0: Sin ningún avance
        return "0: Sin avance"

    @staticmethod
    def transform_data(supabase_data: List[Dict[str, Any]]) -> pd.DataFrame:
        transformed_data = []
        for item in supabase_data:
            try:
                transformed_data.append({
                    "id": item.get("id"),
                    "primera_interaccion": item.get('primera_interaccion', ''),
                    "ultima_interaccion": item.get('ultima_interaccion', ''),
                    "telefono": item.get('telefono', ''),
                    "nombre": item.get('nombre', ''),
                    "categoria": item.get('categoria', ''),
                    "estilo": item.get('estilo', ''),
                    "presupuesto": item.get('presupuesto', None),
                    "toma_decision": item.get('toma_decision', ''),
                    "tiempo": item.get('tiempo', ''),
                    "tiempo_meses": item.get("tiempo_meses", None),
                    "planos": item.get('planos', ''),
                    "cita": item.get('cita', ''),
                    "calificacion": item.get('calificacion', ''),
                    "resumen": item.get('resumen', ''),
                    "correo": item.get('correo', ''),
                    "seguimiento": item.get('seguimiento', 'NO'),
                    "ultimo_seguimiento": item.get('ultimo_seguimiento', None),  # añadir si falta
                    "tipo_cliente": item.get('tipo_cliente', ''),
                })
            except Exception as e:
                print(f"Error transformando fila: {str(e)}")
        df = pd.DataFrame(transformed_data)
        # Convertir campos de fecha si vienen en texto
        for col in ['primera_interaccion', 'ultima_interaccion', 'cita', 'ultimo_seguimiento']:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], errors='coerce').dt.tz_localize(None)

        # Aplicar limpieza y actualización de seguimiento
        df = DataProcessor.limpiar_seguimiento(df)
        # Enriquecer con columnas derivadas
        df = DataProcessor.add_derived_columns(df)        

        return df

    @staticmethod
    def filter_data(df: pd.DataFrame, filters: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
        if df is None or df.empty:
            return pd.DataFrame()

        if filters is None or not filters:
            return df

        filtered_data = df.copy()

        month_map = {
            'Enero': 1, 'Febrero': 2, 'Marzo': 3, 'Abril': 4,
            'Mayo': 5, 'Junio': 6, 'Julio': 7, 'Agosto': 8,
            'Septiembre': 9, 'Octubre': 10, 'Noviembre': 11, 'Diciembre': 12
        }

        if 'mes' in filters and filters['mes'] != 'Todos':
            if filters['mes'] in month_map:
                filtered_data = filtered_data[filtered_data['mes_num'] == month_map[filters['mes']]]
            elif filters['mes'] in filtered_data['mes'].values:
                filtered_data = filtered_data[filtered_data['mes'] == filters['mes']]

        if 'año' in filters and filters['año'] != 'Todos':
            try:
                year = int(filters['año'])
                filtered_data = filtered_data[filtered_data['año'] == year]
            except (ValueError, TypeError):
                pass

        if 'tipo_cliente' in filters and filters['tipo_cliente'] != 'Todos':
            if 'tiene_cita' in filtered_data.columns:
                if filters['tipo_cliente'] == 'Con cita':
                    filtered_data = filtered_data[filtered_data['tiene_cita'] == True]
                elif filters['tipo_cliente'] == 'Sin cita':
                    filtered_data = filtered_data[filtered_data['tiene_cita'] == False]

        return filtered_data

    @staticmethod
    def get_client_counts(df: pd.DataFrame) -> Dict[str, int]:
        if df.empty:
            return {'total': 0, 'con_cita': 0, 'sin_cita': 0}
        total = len(df)
        con_cita = df['tiene_cita'].sum() if 'tiene_cita' in df else 0
        return {'total': total, 'con_cita': int(con_cita), 'sin_cita': total - int(con_cita)}

    @staticmethod
    def get_distribution(df: pd.DataFrame, column: str) -> Dict[str, int]:
        if column in df:
            return df[column].value_counts().to_dict()
        return {}

    @staticmethod
    def cross_distribution(df: pd.DataFrame, row: str, col: str) -> Dict[str, Dict[str, int]]:
        if row in df and col in df:
            result = pd.crosstab(df[row], df[col])
            # Convert all keys to str for type compatibility
            return {str(k): {str(inner_k): int(inner_v) for inner_k, inner_v in v.items()} for k, v in result.T.to_dict().items()}
        return {}

    @staticmethod
    def contact_hour_distribution(df: pd.DataFrame) -> Dict[int, int]:
        if 'hora_contacto' not in df:
            return {}
        df = df.copy()
        df['hora_local'] = (df['hora_contacto'] - 5) % 24
        return df['hora_local'].value_counts().sort_index().to_dict()
    
    @staticmethod
    def get_qualification_distribution(df: pd.DataFrame) -> Dict[str, int]:
        if df.empty or 'calificacion' not in df.columns:
            return {}
        return df['calificacion'].value_counts().to_dict()
    
    @staticmethod
    def get_clients_by_qualification(df: pd.DataFrame) -> Dict[str, Any]:
        if df.empty or 'calificacion' not in df.columns:
            return {'total_clients': 0, 'clients_by_qualification': {}}
        result = {}
        for calificacion, group in df.groupby('calificacion'):
            clientes = group[['nombre', 'categoria', 'estilo', 'presupuesto', 'toma_decision', 'tiempo', 'tiempo_meses']].replace({pd.NA: None, pd.NaT: None, np.nan: None}).to_dict(orient='records')
            result[calificacion] = {
                "count": len(group),
                "clientes": clientes
            }
        return result
    
    @staticmethod
    def get_followup_success(df: pd.DataFrame) -> Dict[str, int]:
        if df.empty or 'cita' not in df.columns or 'seguimiento' not in df.columns:
            return {'followup_success': 0, 'no_followup': 0}
        # Filtrar clientes que tienen cita registrada
        citas_df = df[df['cita'].notnull()]
        # Contar seguimiento exitoso
        followup_success = (citas_df['seguimiento'].str.upper() == 'SI').sum()
        no_followup = (citas_df['seguimiento'].str.upper() != 'SI').sum()
        return {
            'followup_success': int(followup_success),
            'no_followup': int(no_followup)
        }

    @staticmethod
    def limpiar_seguimiento(df: pd.DataFrame) -> pd.DataFrame:
        no_cliente_keywords = ['proveedor', 'consulta de trabajo', 'mensaje raro']  # puedes ampliar

        def es_no_cliente(row):
            combined = ''.join([
                str(row.get('categoria') or '').lower(),
                str(row.get('estilo') or '').lower(),
                str(row.get('resumen') or '').lower()
            ])
            return any(k in combined for k in no_cliente_keywords)

        df['es_no_cliente'] = df.apply(es_no_cliente, axis=1)

        ahora = datetime.utcnow()

        def actualizar_seguimiento(row):
            if row['es_no_cliente']:
                return 'No Cliente'
            if row['tipo_cliente'] == "Con Cita":
                return 'Agendado'
            if row['seguimiento'] == 'SI' and pd.notnull(row['ultimo_seguimiento']):
                if (ahora - row['ultimo_seguimiento']) <= timedelta(days=30):
                    return 'Seguimiento'
            return 'No Cliente'

        df['seguimiento'] = df.apply(actualizar_seguimiento, axis=1)

        # Puedes dejar fuera la asignación del color aquí porque será en frontend

        return df

    @staticmethod
    def get_appointment_hours_distribution(df: pd.DataFrame) -> List[Dict[str, int]]:
        if df.empty or 'tiene_cita' not in df.columns or 'hora_cita' not in df.columns:
            return []
        
        citas_df = df[df['tiene_cita'] == True].copy()
        if citas_df.empty:
            return []

        # Convertir a hora local (UTC-5)
        citas_df['hora_local'] = (citas_df['hora_cita'] - 5) % 24
        
        # Contar las citas por hora
        counts = citas_df['hora_local'].value_counts()
        
        # Crear un diccionario con todas las 24 horas (0-23)
        # Inicializar todas las horas con 0 citas
        all_hours = {hour: 0 for hour in range(24)}
        
        # Actualizar con los conteos reales
        for hour, count in counts.items():
            all_hours[int(hour)] = int(count)
        
        # Convertir a lista de diccionarios ordenada por hora
        return [{"hour": hour, "count": count} for hour, count in sorted(all_hours.items())]

    @staticmethod
    def get_project_duration_distribution(df: pd.DataFrame) -> Dict[str, int]:
        if df.empty or 'tiempo_meses' not in df.columns:
            return {}
        return df['tiempo_meses'].value_counts().sort_index().to_dict()

    @staticmethod
    def get_cross_distribution(df: pd.DataFrame, col1: str, col2: str) -> Dict[str, Dict[str, int]]:
        if df.empty or col1 not in df.columns or col2 not in df.columns:
            return {}
        result = pd.crosstab(df[col1], df[col2])
        return {str(row): {str(col): int(val) for col, val in result.loc[row].items()} for row in result.index}

