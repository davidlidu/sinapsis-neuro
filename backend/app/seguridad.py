"""Usuarios y sesiones. Claves con PBKDF2 (biblioteca estándar, sin dependencias)."""
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta

from fastapi import Depends, Header, HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from . import config
from .database import obtener_db
from .models import Sesion, Usuario

_ITER = 240_000


def hash_clave(clave: str) -> str:
    sal = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", clave.encode(), bytes.fromhex(sal), _ITER)
    return f"pbkdf2${_ITER}${sal}${dk.hex()}"


def verificar_clave(clave: str, guardado: str) -> bool:
    try:
        _, iteraciones, sal, esperado = guardado.split("$")
        dk = hashlib.pbkdf2_hmac("sha256", clave.encode(), bytes.fromhex(sal), int(iteraciones))
        return hmac.compare_digest(dk.hex(), esperado)
    except ValueError:
        return False


def crear_sesion(db: Session, usuario: Usuario) -> str:
    db.execute(delete(Sesion).where(Sesion.expira < datetime.now()))
    token = secrets.token_urlsafe(32)
    db.add(Sesion(token=token, usuario_id=usuario.id,
                  expira=datetime.now() + timedelta(hours=config.SESION_HORAS)))
    db.commit()
    return token


def asegurar_admin(db: Session) -> str | None:
    """En el primer arranque crea el administrador. Devuelve la clave si se generó una."""
    if db.scalar(select(func.count(Usuario.id))):
        return None
    clave = config.ADMIN_CLAVE or secrets.token_urlsafe(9)
    db.add(Usuario(usuario=config.ADMIN_USUARIO.strip().lower(), nombre="Administrador",
                   clave_hash=hash_clave(clave), rol="admin"))
    db.commit()
    return None if config.ADMIN_CLAVE else clave


def usuario_actual(authorization: str = Header(default=""), db: Session = Depends(obtener_db)) -> Usuario:
    token = authorization.removeprefix("Bearer ").strip()
    sesion = db.get(Sesion, token) if token else None
    if not sesion or sesion.expira < datetime.now() or not sesion.usuario.activo:
        raise HTTPException(401, "Sesión vencida. Vuelva a ingresar.")
    return sesion.usuario


def solo_admin(u: Usuario = Depends(usuario_actual)) -> Usuario:
    if u.rol != "admin":
        raise HTTPException(403, "Esta acción es solo para administradores.")
    return u
