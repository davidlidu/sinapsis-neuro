"""Ingresos con vencimiento, conteos físicos, lotes y alertas."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import obtener_db
from ..models import Lote, Movimiento, Producto, Usuario
from ..schemas import Conteo, Ingreso, item_json, lote_json, pedido_json, producto_json
from ..seguridad import usuario_actual
from ..services import inventario

router = APIRouter(prefix="/api/inventario", tags=["Inventario"])


@router.post("/ingresos", summary="Registrar un ingreso con fecha de vencimiento")
def ingreso(datos: Ingreso, u: Usuario = Depends(usuario_actual), db: Session = Depends(obtener_db)):
    p = db.get(Producto, datos.producto_id)
    if not p:
        raise HTTPException(404, "Producto no encontrado.")
    if datos.fecha_vencimiento and datos.fecha_ingreso and datos.fecha_vencimiento < datos.fecha_ingreso:
        raise HTTPException(400, "La fecha de vencimiento es anterior a la de ingreso.")
    lote = inventario.registrar_ingreso(db, p, datos.cantidad, datos.fecha_vencimiento,
                                        datos.fecha_ingreso, datos.lote, u.usuario)
    db.commit()
    return {"lote": lote_json(lote), "producto": producto_json(p)}


@router.post("/conteo/{pid}", summary="Registrar el conteo físico de un producto")
def conteo(pid: int, datos: Conteo, u: Usuario = Depends(usuario_actual), db: Session = Depends(obtener_db)):
    p = db.get(Producto, pid)
    if not p:
        raise HTTPException(404, "Producto no encontrado.")
    inventario.registrar_conteo(db, p, datos.cantidad, u.usuario, datos.nota)
    db.commit()
    return producto_json(p)


@router.get("/lotes", summary="Lotes activos, filtrables por estado de vencimiento")
def lotes(estado: str = Query("todos", pattern="^(todos|vencido|por_vencer|vigente|sin_fecha)$"),
          limite: int = Query(200, le=1000),
          _: Usuario = Depends(usuario_actual), db: Session = Depends(obtener_db)):
    filas = db.scalars(select(Lote).options(selectinload(Lote.producto)).where(Lote.estado == "activo")
                       .order_by(Lote.fecha_vencimiento.is_(None), Lote.fecha_vencimiento)).all()
    datos = [lote_json(l) for l in filas]
    if estado != "todos":
        datos = [d for d in datos if d["estado_vencimiento"] == estado]
    return datos[:limite]


@router.get("/movimientos/{pid}", summary="Historial de cambios de cantidad de un producto")
def movimientos(pid: int, _: Usuario = Depends(usuario_actual), db: Session = Depends(obtener_db)):
    return [{"tipo": m.tipo, "antes": m.cantidad_antes, "despues": m.cantidad_despues,
             "detalle": m.detalle, "usuario": m.usuario, "fecha": m.fecha}
            for m in db.scalars(select(Movimiento).where(Movimiento.producto_id == pid)
                                .order_by(Movimiento.fecha.desc(), Movimiento.id.desc()).limit(100))]


@router.get("/resumen", summary="Cifras del panel principal")
def resumen(_: Usuario = Depends(usuario_actual), db: Session = Depends(obtener_db)):
    return inventario.resumen(db)


@router.get("/alertas", summary="Vencidos, por vencer, bajo mínimo y pedidos pendientes")
def alertas(_: Usuario = Depends(usuario_actual), db: Session = Depends(obtener_db)):
    a = inventario.alertas(db)
    return {
        "vencidos": [lote_json(l) for l in a["vencidos"]],
        "por_vencer": [lote_json(l) for l in a["por_vencer"]],
        "bajo_minimo": [producto_json(p) for p in a["bajo_minimo"]],
        "pendientes": [{**item_json(x["item"]), "pedido": pedido_json(x["pedido"]), "dias": x["dias"],
                        "faltante": x["faltante"], "atrasado": x["atrasado"],
                        "posible_desabastecimiento": x["posible_desabastecimiento"]}
                       for x in a["pendientes"]],
    }
