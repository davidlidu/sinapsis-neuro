from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..database import obtener_db
from ..models import Sesion, Usuario
from ..schemas import CambioClave, Login, NuevoUsuario
from ..seguridad import (crear_sesion, hash_clave, solo_admin, usuario_actual,
                         verificar_clave)

router = APIRouter(prefix="/api/auth", tags=["Usuarios"])


def _u(u: Usuario) -> dict:
    return {"id": u.id, "usuario": u.usuario, "nombre": u.nombre, "rol": u.rol, "activo": u.activo}


@router.post("/login", summary="Ingresar y obtener un token de sesión")
def login(datos: Login, db: Session = Depends(obtener_db)):
    u = db.scalar(select(Usuario).where(Usuario.usuario == datos.usuario.strip().lower()))
    if not u or not u.activo or not verificar_clave(datos.clave, u.clave_hash):
        raise HTTPException(401, "Usuario o clave incorrectos.")
    return {"token": crear_sesion(db, u), "usuario": _u(u)}


@router.post("/logout", summary="Cerrar la sesión actual")
def logout(authorization: str = Header(default=""), db: Session = Depends(obtener_db)):
    db.execute(delete(Sesion).where(Sesion.token == authorization.removeprefix("Bearer ").strip()))
    db.commit()
    return {"ok": True}


@router.get("/yo", summary="Datos del usuario de la sesión")
def yo(u: Usuario = Depends(usuario_actual)):
    return _u(u)


@router.post("/clave", summary="Cambiar la clave propia")
def cambiar_clave(datos: CambioClave, u: Usuario = Depends(usuario_actual), db: Session = Depends(obtener_db)):
    if not verificar_clave(datos.actual, u.clave_hash):
        raise HTTPException(400, "La clave actual no es correcta.")
    db.merge(u).clave_hash = hash_clave(datos.nueva)
    db.commit()
    return {"ok": True}


@router.get("/usuarios", summary="Listar usuarios (admin)")
def listar(_: Usuario = Depends(solo_admin), db: Session = Depends(obtener_db)):
    return [_u(u) for u in db.scalars(select(Usuario).order_by(Usuario.usuario))]


@router.post("/usuarios", summary="Crear usuario (admin)")
def crear(datos: NuevoUsuario, _: Usuario = Depends(solo_admin), db: Session = Depends(obtener_db)):
    nombre = datos.usuario.strip().lower()
    if db.scalar(select(Usuario).where(Usuario.usuario == nombre)):
        raise HTTPException(400, "Ese usuario ya existe.")
    u = Usuario(usuario=nombre, nombre=datos.nombre, clave_hash=hash_clave(datos.clave), rol=datos.rol)
    db.add(u)
    db.commit()
    return _u(u)


@router.post("/usuarios/{uid}/activo", summary="Activar o desactivar un usuario (admin)")
def activar(uid: int, activo: bool, admin: Usuario = Depends(solo_admin), db: Session = Depends(obtener_db)):
    u = db.get(Usuario, uid)
    if not u:
        raise HTTPException(404, "Usuario no encontrado.")
    if u.id == admin.id and not activo:
        raise HTTPException(400, "No puede desactivarse a sí mismo.")
    u.activo = activo
    db.commit()
    return _u(u)
