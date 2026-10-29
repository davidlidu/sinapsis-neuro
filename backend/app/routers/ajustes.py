"""Configuración editable por el administrador."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import obtener_db
from ..models import Usuario
from ..seguridad import solo_admin, usuario_actual
from ..services import ajustes

router = APIRouter(prefix="/api/ajustes", tags=["Configuración"])


class CambioAjustes(BaseModel):
    dias_alerta_vencimiento: int | None = Field(default=None, ge=1, le=365)
    dias_vencimiento_pedido: int | None = Field(default=None, ge=0, le=365)


@router.get("", summary="Ver la configuración")
def ver(_: Usuario = Depends(usuario_actual)):
    return {"valores": ajustes.todos(),
            "descripciones": {k: d[3] for k, d in ajustes.DEFINICIONES.items()}}


@router.put("", summary="Cambiar la configuración (admin)")
def cambiar(datos: CambioAjustes, _: Usuario = Depends(solo_admin), db: Session = Depends(obtener_db)):
    try:
        return {"valores": ajustes.guardar(db, datos.model_dump(exclude_none=True))}
    except ValueError as e:
        raise HTTPException(400, str(e))
