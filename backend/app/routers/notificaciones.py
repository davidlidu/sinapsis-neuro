"""Suscripción de dispositivos a las notificaciones push."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import config
from ..database import obtener_db
from ..models import Suscripcion, Usuario
from ..seguridad import usuario_actual
from ..services import notificaciones as svc

router = APIRouter(prefix="/api/notificaciones", tags=["Notificaciones"])


class Claves(BaseModel):
    p256dh: str
    auth: str


class Dispositivo(BaseModel):
    endpoint: str
    keys: Claves


class Endpoint(BaseModel):
    endpoint: str


def _exigir_habilitadas():
    if not config.NOTIFICACIONES_HABILITADAS:
        raise HTTPException(400, "Las notificaciones están desactivadas en el servidor.")


@router.get("/clave", summary="Clave pública para suscribir un dispositivo")
def clave(_: Usuario = Depends(usuario_actual)):
    _exigir_habilitadas()
    return {"clave": svc.clave_publica(), "hora": config.HORA_NOTIFICACION}


@router.post("/suscribir", summary="Activar notificaciones en este dispositivo")
def suscribir(d: Dispositivo, u: Usuario = Depends(usuario_actual), db: Session = Depends(obtener_db)):
    _exigir_habilitadas()
    s = db.scalar(select(Suscripcion).where(Suscripcion.endpoint == d.endpoint)) or Suscripcion(endpoint=d.endpoint)
    s.usuario_id, s.p256dh, s.auth = u.id, d.keys.p256dh, d.keys.auth
    db.add(s)
    db.commit()
    return {"ok": True}


@router.post("/desuscribir", summary="Desactivar notificaciones en este dispositivo")
def desuscribir(d: Endpoint, _: Usuario = Depends(usuario_actual), db: Session = Depends(obtener_db)):
    s = db.scalar(select(Suscripcion).where(Suscripcion.endpoint == d.endpoint))
    if s:
        db.delete(s)
        db.commit()
    return {"ok": True}


@router.post("/probar", summary="Enviar una notificación de prueba a mis dispositivos")
def probar(u: Usuario = Depends(usuario_actual), db: Session = Depends(obtener_db)):
    _exigir_habilitadas()
    subs = db.scalars(select(Suscripcion).where(Suscripcion.usuario_id == u.id)).all()
    if not subs:
        raise HTTPException(400, "Este usuario no tiene dispositivos con notificaciones activas.")
    n = svc.enviar(db, subs, "Sinapsis", "Las notificaciones están activas en este dispositivo.", "/#/")
    return {"enviados": n}
