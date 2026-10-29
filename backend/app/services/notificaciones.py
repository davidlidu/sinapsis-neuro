"""Notificaciones push: un resumen diario de alertas a los dispositivos suscritos.

Se usa Web Push estándar (funciona en Android, escritorio y en iPhone con la app instalada).
Las claves VAPID se generan una sola vez y se guardan en DATA_DIR/vapid_privada.pem.
"""
import asyncio
import base64
import json
import logging
from datetime import date, datetime

from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from py_vapid import Vapid
from pywebpush import WebPushException, webpush
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import config
from ..database import SesionLocal
from ..models import Suscripcion
from .inventario import resumen

log = logging.getLogger("sinapsis.notificaciones")
RUTA_CLAVE = config.DATA_DIR / "vapid_privada.pem"
RUTA_ESTADO = config.DATA_DIR / "notificaciones.json"


def _vapid() -> Vapid:
    if RUTA_CLAVE.exists():
        return Vapid.from_file(str(RUTA_CLAVE))
    v = Vapid()
    v.generate_keys()
    v.save_key(str(RUTA_CLAVE))
    return v


def clave_publica() -> str:
    """Clave pública en base64url, tal como la pide el navegador (applicationServerKey)."""
    crudo = _vapid().public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
    return base64.urlsafe_b64encode(crudo).decode().rstrip("=")


def enviar(db: Session, suscripciones: list[Suscripcion], titulo: str, cuerpo: str, url: str = "/#/alertas") -> int:
    """Envía a cada dispositivo. Borra las suscripciones que el navegador ya no reconoce."""
    datos = json.dumps({"titulo": titulo, "cuerpo": cuerpo, "url": url})
    enviados = 0
    for s in suscripciones:
        try:
            webpush({"endpoint": s.endpoint, "keys": {"p256dh": s.p256dh, "auth": s.auth}}, datos,
                    vapid_private_key=str(RUTA_CLAVE), vapid_claims={"sub": config.VAPID_CONTACTO}, ttl=12 * 3600)
            enviados += 1
        except WebPushException as e:
            if e.response is not None and e.response.status_code in (404, 410):
                db.delete(s)
            else:
                log.warning("No se pudo enviar una notificación: %s", e)
    db.commit()
    return enviados


def texto_resumen(r: dict) -> str | None:
    partes = [(r["vencidos"], "lote vencido", "lotes vencidos"),
              (r["por_vencer"], "lote por vencer", "lotes por vencer"),
              (r["bajo_minimo"], "producto bajo el mínimo", "productos bajo el mínimo"),
              (r["pendientes"], "pendiente de farmacia", "pendientes de farmacia")]
    texto = [f"{n} {uno if n == 1 else varios}" for n, uno, varios in partes if n]
    return " · ".join(texto) if texto else None


def enviar_resumen_diario() -> int:
    with SesionLocal() as db:
        cuerpo = texto_resumen(resumen(db))
        if not cuerpo:
            return 0
        return enviar(db, db.scalars(select(Suscripcion)).all(), "Sinapsis · Alertas de hoy", cuerpo)


def _ultimo_envio() -> str:
    try:
        return json.loads(RUTA_ESTADO.read_text()).get("ultimo", "")
    except (OSError, ValueError):
        return ""


async def ciclo_diario():
    """Revisa cada 15 minutos; envía el resumen una vez al día desde HORA_NOTIFICACION."""
    _vapid()
    while True:
        try:
            hoy = date.today().isoformat()
            if datetime.now().hour >= config.HORA_NOTIFICACION and _ultimo_envio() != hoy:
                n = await asyncio.to_thread(enviar_resumen_diario)
                RUTA_ESTADO.write_text(json.dumps({"ultimo": hoy}))
                if n:
                    log.info("Resumen diario enviado a %s dispositivos.", n)
        except Exception:
            log.exception("Falló el resumen diario de notificaciones.")
        await asyncio.sleep(900)
