# backend/services/data_utils.py
import numpy as np
import pandas as pd

def sanitize_dataframe(df: pd.DataFrame) -> list[dict]:
    """
    Limpia un DataFrame para que sea JSON-serializable:
    - Reemplaza NaN, NaT, inf, -inf por None
    - Convierte tipos NumPy a tipos nativos
    - Devuelve una lista de diccionarios
    """
    df_clean = df.replace([np.nan, pd.NaT, np.inf, -np.inf], None)
    df_clean = df_clean.astype(object)
    return df_clean.to_dict(orient="records")
