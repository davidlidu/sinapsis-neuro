"""Lista de secciones. Renombrar una sección actualiza los productos que la usan."""
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from ..models import Producto, Seccion


def _por_nombre(db: Session, nombre: str, excepto: int = 0) -> Seccion | None:
    return db.scalar(select(Seccion).where(func.lower(Seccion.nombre) == nombre.lower(), Seccion.id != excepto))


def asegurar(db: Session, nombre: str) -> str:
    """Devuelve el nombre tal como está en la lista; si no existe, la crea (sin confirmar)."""
    nombre = " ".join(nombre.split())
    if not nombre:
        return ""
    s = _por_nombre(db, nombre)
    if s is None:
        s = Seccion(nombre=nombre)
        db.add(s)
        db.flush()
    return s.nombre


def sincronizar(db: Session) -> None:
    """Agrega a la lista las secciones que ya usan los productos (bases anteriores a la lista)."""
    for (nombre,) in db.execute(select(Producto.seccion).where(Producto.seccion != "").distinct()):
        asegurar(db, nombre)
    db.commit()


def listar(db: Session) -> list[dict]:
    conteo = dict(db.execute(select(Producto.seccion, func.count()).where(Producto.activo.is_(True))
                             .group_by(Producto.seccion)).all())
    return [{"id": s.id, "nombre": s.nombre, "productos": conteo.get(s.nombre, 0)}
            for s in db.scalars(select(Seccion).order_by(Seccion.nombre))]


def crear(db: Session, nombre: str) -> Seccion:
    nombre = " ".join(nombre.split())
    if _por_nombre(db, nombre):
        raise ValueError("Ya existe una sección con ese nombre.")
    s = Seccion(nombre=nombre)
    db.add(s)
    db.commit()
    return s


def renombrar(db: Session, s: Seccion, nombre: str) -> Seccion:
    nombre = " ".join(nombre.split())
    if _por_nombre(db, nombre, excepto=s.id):
        raise ValueError("Ya existe una sección con ese nombre.")
    db.execute(update(Producto).where(Producto.seccion == s.nombre).values(seccion=nombre))
    s.nombre = nombre
    db.commit()
    return s


def eliminar(db: Session, s: Seccion, mover_a: str = "") -> None:
    """Los productos de la sección pasan a `mover_a` (otra sección de la lista) o quedan sin sección."""
    destino = ""
    if mover_a:
        d = _por_nombre(db, mover_a, excepto=s.id)
        if d is None:
            raise ValueError("La sección de destino no existe.")
        destino = d.nombre
    db.execute(update(Producto).where(Producto.seccion == s.nombre).values(seccion=destino))
    db.delete(s)
    db.commit()
