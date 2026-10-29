"""Configuración de Sinapsis.

Todo se lee de variables de entorno para no guardar secretos en el código.
Ver `.env.example` en la raíz del proyecto y `docs/despliegue.md`.
"""
import os
from pathlib import Path


def _bool(nombre: str, defecto: bool = False) -> bool:
    valor = os.getenv(nombre)
    if valor is None:
        return defecto
    return valor.strip().lower() in {"1", "true", "si", "sí", "yes"}


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("SINAPSIS_DATA_DIR", BASE_DIR / "data"))
FRONTEND_DIR = Path(os.getenv("SINAPSIS_FRONTEND_DIR", BASE_DIR.parent / "frontend"))

DB_URL = os.getenv("SINAPSIS_DB_URL", f"sqlite:///{DATA_DIR / 'sinapsis.db'}")
PEDIDOS_DIR = DATA_DIR / "pedidos"      # PDF de pedidos a farmacia
FOTOS_DIR = DATA_DIR / "fotos"          # fotos de referencia de productos

# Usuario administrador que se crea en el primer arranque si no existe ninguno.
ADMIN_USUARIO = os.getenv("SINAPSIS_ADMIN_USUARIO", "admin")
ADMIN_CLAVE = os.getenv("SINAPSIS_ADMIN_CLAVE", "")
SESION_HORAS = int(os.getenv("SINAPSIS_SESION_HORAS", "12"))

# Reglas de negocio
DIAS_ALERTA_VENCIMIENTO = int(os.getenv("SINAPSIS_DIAS_ALERTA_VENCIMIENTO", "30"))
DIAS_ALERTA_PENDIENTE = int(os.getenv("SINAPSIS_DIAS_ALERTA_PENDIENTE", "5"))
PEDIDOS_PARA_DESABASTECIMIENTO = int(os.getenv("SINAPSIS_PEDIDOS_DESABASTECIMIENTO", "2"))

# OCR (Tesseract). Se limita la concurrencia para cuidar la RAM del VPS compartido.
OCR_IDIOMA = os.getenv("SINAPSIS_OCR_IDIOMA", "spa+eng")
OCR_MAX_SIMULTANEOS = int(os.getenv("SINAPSIS_OCR_MAX_SIMULTANEOS", "1"))
COINCIDENCIAS_MAX = 5

# Respaldo con IA vía OpenRouter (desactivado si no hay clave).
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODELO = os.getenv("OPENROUTER_MODELO", "")
OPENROUTER_MODELO_ALTERNO = os.getenv("OPENROUTER_MODELO_ALTERNO", "")
IA_LIMITE_DIARIO = int(os.getenv("SINAPSIS_IA_LIMITE_DIARIO", "50"))
IA_HABILITADA = _bool("SINAPSIS_IA_HABILITADA", True) and bool(OPENROUTER_API_KEY and OPENROUTER_MODELO)

for carpeta in (DATA_DIR, PEDIDOS_DIR, FOTOS_DIR):
    carpeta.mkdir(parents=True, exist_ok=True)
