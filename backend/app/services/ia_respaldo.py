"""Respaldo con IA vía OpenRouter. Solo se usa cuando fallan código y OCR.

La IA únicamente LEE el texto visible en la foto. La búsqueda en el catálogo
y la decisión final siguen siendo locales y del usuario.
"""
import base64
import io
import json
from datetime import datetime, time

import httpx
from PIL import Image, ImageOps
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import config
from ..models import LlamadaIA

URL = "https://openrouter.ai/api/v1/chat/completions"
INSTRUCCION = (
    "Lee el texto visible en la etiqueta o empaque de este producto médico o de farmacia. "
    "Responde solo un JSON con las claves: nombre, presentacion, referencia, codigo. "
    "Usa cadena vacía si algo no se ve. No inventes datos."
)


class IANoDisponible(RuntimeError):
    pass


def llamadas_de_hoy(db: Session) -> int:
    inicio = datetime.combine(datetime.now().date(), time.min)
    return db.scalar(select(func.count(LlamadaIA.id)).where(LlamadaIA.fecha >= inicio)) or 0


def _foto_liviana(contenido: bytes) -> str:
    """Reduce la foto a ~800 px y la comprime para gastar menos."""
    img = ImageOps.exif_transpose(Image.open(io.BytesIO(contenido))).convert("RGB")
    img.thumbnail((800, 800))
    salida = io.BytesIO()
    img.save(salida, format="JPEG", quality=70)
    return base64.b64encode(salida.getvalue()).decode()


def _extraer_json(texto: str) -> dict:
    inicio, fin = texto.find("{"), texto.rfind("}")
    if inicio == -1 or fin == -1:
        return {"nombre": texto.strip()[:200]}
    try:
        return json.loads(texto[inicio:fin + 1])
    except json.JSONDecodeError:
        return {"nombre": texto.strip()[:200]}


def leer_con_ia(db: Session, contenido: bytes, usuario: str) -> dict:
    if not config.IA_HABILITADA:
        raise IANoDisponible("El respaldo con IA no está configurado.")
    if llamadas_de_hoy(db) >= config.IA_LIMITE_DIARIO:
        raise IANoDisponible("Se alcanzó el límite diario de consultas con IA.")

    imagen = _foto_liviana(contenido)
    modelos = [m for m in (config.OPENROUTER_MODELO, config.OPENROUTER_MODELO_ALTERNO) if m]
    ultimo_error = ""
    for modelo in modelos:
        registro = LlamadaIA(modelo=modelo, usuario=usuario)
        try:
            r = httpx.post(
                URL,
                headers={
                    "Authorization": f"Bearer {config.OPENROUTER_API_KEY}",
                    "X-Title": "Sinapsis - DeerSystems",
                },
                json={
                    "model": modelo,
                    "max_tokens": 200,
                    "temperature": 0,
                    "messages": [{
                        "role": "user",
                        "content": [
                            {"type": "text", "text": INSTRUCCION},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{imagen}"}},
                        ],
                    }],
                },
                timeout=40,
            )
            r.raise_for_status()
            texto = r.json()["choices"][0]["message"]["content"] or ""
            datos = _extraer_json(texto)
            registro.exito, registro.texto = True, json.dumps(datos, ensure_ascii=False)[:500]
            db.add(registro)
            db.commit()
            datos["modelo"] = modelo
            return datos
        except Exception as e:  # se intenta con el modelo alterno
            ultimo_error = str(e)[:255]
            registro.error = ultimo_error
            db.add(registro)
            db.commit()
    raise IANoDisponible(f"La IA no respondió: {ultimo_error}")
