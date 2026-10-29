"""Secciones: la lista que se elige en el producto y se administra en Configuración."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import obtener_db
from ..models import Seccion, Usuario
from ..seguridad import solo_admin, usuario_actual
from ..services import secciones

router = APIRouter(prefix="/api/secciones", tags=["Configuración"])


class SeccionEntrada(BaseModel):
    nombre: str = Field(min_length=1, max_length=120)


def _buscar(db: Session, sid: int) -> Seccion:
    s = db.get(Seccion, sid)
    if s is None:
        raise HTTPException(404, "Sección no encontrada.")
    return s


@router.get("", summary="Listar las secciones con su número de productos activos")
def listar(_: Usuario = Depends(usuario_actual), db: Session = Depends(obtener_db)):
    return secciones.listar(db)


@router.post("", summary="Agregar una sección (admin)")
def crear(d: SeccionEntrada, _: Usuario = Depends(solo_admin), db: Session = Depends(obtener_db)):
    try:
        s = secciones.crear(db, d.nombre)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"id": s.id, "nombre": s.nombre}


@router.put("/{sid}", summary="Renombrar una sección; sus productos quedan con el nombre nuevo (admin)")
def renombrar(sid: int, d: SeccionEntrada, _: Usuario = Depends(solo_admin), db: Session = Depends(obtener_db)):
    try:
        s = secciones.renombrar(db, _buscar(db, sid), d.nombre)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"id": s.id, "nombre": s.nombre}


@router.delete("/{sid}", summary="Eliminar una sección; sus productos pasan a `mover_a` o quedan sin sección (admin)")
def eliminar(sid: int, mover_a: str = Query(""), _: Usuario = Depends(solo_admin), db: Session = Depends(obtener_db)):
    try:
        secciones.eliminar(db, _buscar(db, sid), mover_a.strip())
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"ok": True}
