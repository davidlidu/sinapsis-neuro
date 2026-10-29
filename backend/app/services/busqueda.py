"""Búsqueda aproximada en el catálogo (RapidFuzz).

Compara el texto leído (por OCR, por IA o escrito a mano) contra el nombre
normalizado de cada producto y contra sus alias, y devuelve las mejores
coincidencias para que el usuario confirme. Nunca decide sola.
"""
from rapidfuzz import fuzz, process
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import config
from ..models import Alias, Producto
from .texto import normalizar, normalizar_codigo

PUNTAJE_MINIMO = 55


def _indice(db: Session) -> tuple[list[str], list[int]]:
    """Lista de textos comparables y el producto al que pertenece cada uno.

    Con ~1.000 productos y sus alias se arma en milisegundos, así que se
    reconstruye en cada búsqueda y nunca queda desactualizado.
    """
    textos, ids = [], []
    for pid, nombre_norm, ref, presentacion in db.execute(
        select(Producto.id, Producto.nombre_normalizado, Producto.referencia, Producto.presentacion)
        .where(Producto.activo.is_(True))
    ):
        textos.append(f"{nombre_norm} {normalizar(presentacion)}".strip())
        ids.append(pid)
        textos.append(normalizar(ref))
        ids.append(pid)
    for pid, alias_norm in db.execute(
        select(Alias.producto_id, Alias.texto_normalizado)
        .join(Producto).where(Producto.activo.is_(True))
    ):
        textos.append(alias_norm)
        ids.append(pid)
    return textos, ids


def buscar_por_texto(db: Session, texto: str, limite: int = config.COINCIDENCIAS_MAX) -> list[dict]:
    consulta = normalizar(texto)
    if not consulta:
        return []
    textos, ids = _indice(db)
    if not textos:
        return []

    # El OCR devuelve varias líneas con ruido: se compara el texto completo y cada línea.
    fragmentos = {consulta}
    for linea in str(texto).splitlines():
        n = normalizar(linea)
        if len(n) >= 3:
            fragmentos.add(n)

    mejores: dict[int, float] = {}
    for fragmento in fragmentos:
        for _, puntaje, idx in process.extract(fragmento, textos, scorer=fuzz.WRatio, limit=limite * 3):
            pid = ids[idx]
            if puntaje > mejores.get(pid, 0):
                mejores[pid] = puntaje

    ordenados = sorted(
        ((pid, p) for pid, p in mejores.items() if p >= PUNTAJE_MINIMO),
        key=lambda x: x[1], reverse=True,
    )[:limite]
    productos = {p.id: p for p in db.scalars(select(Producto).where(Producto.id.in_([pid for pid, _ in ordenados])))}
    return [{"producto": productos[pid], "puntaje": round(p)} for pid, p in ordenados]


def buscar_por_codigo(db: Session, codigo: str) -> Producto | None:
    c = normalizar_codigo(codigo)
    if not c:
        return None
    return db.scalar(
        select(Producto).where(
            (Producto.codigo_barras == c) | (Producto.codigo_qr == c) | (Producto.referencia == c)
        )
    )
