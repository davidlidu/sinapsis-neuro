"""Ajustes editables desde la app. Se guardan en la tabla `ajustes` y se leen desde memoria.

El servidor corre con un solo proceso, así que basta con recargar la copia en memoria al guardar.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import config
from ..models import Ajuste

# clave: (valor por defecto, mínimo, máximo, descripción)
DEFINICIONES = {
    "dias_alerta_vencimiento": (config.DIAS_ALERTA_VENCIMIENTO, 1, 365,
                                "Días antes del vencimiento para avisar en Alertas."),
    "dias_vencimiento_pedido": (10, 0, 365,
                                "Un producto con un lote que vence en estos días entra solo al pedido sugerido."),
}
_valores = {k: d[0] for k, d in DEFINICIONES.items()}


def valor(clave: str) -> int:
    return _valores[clave]


def todos() -> dict:
    return dict(_valores)


def cargar(db: Session) -> None:
    for a in db.scalars(select(Ajuste)):
        if a.clave in DEFINICIONES:
            try:
                _valores[a.clave] = int(a.valor)
            except ValueError:
                pass


def guardar(db: Session, cambios: dict[str, int]) -> dict:
    for clave, nuevo in cambios.items():
        _, minimo, maximo, _ = DEFINICIONES[clave]
        if not minimo <= nuevo <= maximo:
            raise ValueError(f"{clave} debe estar entre {minimo} y {maximo}.")
    for clave, nuevo in cambios.items():
        db.merge(Ajuste(clave=clave, valor=str(nuevo)))
        _valores[clave] = nuevo
    db.commit()
    return todos()
