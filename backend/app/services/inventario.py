"""Reglas de inventario: ingresos con vencimiento, conteos y alertas."""
from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from .. import config
from ..models import Lote, Movimiento, Pedido, PedidoItem, Producto


def _mover(db: Session, p: Producto, nueva: int, tipo: str, detalle: str, usuario: str):
    db.add(Movimiento(producto_id=p.id, tipo=tipo, cantidad_antes=p.cantidad_actual,
                      cantidad_despues=nueva, detalle=detalle[:255], usuario=usuario))
    p.cantidad_actual = nueva


def registrar_ingreso(db: Session, p: Producto, cantidad: int, fecha_vencimiento: date | None,
                      fecha_ingreso: date | None, lote: str, usuario: str,
                      origen: str = "manual", pedido_item_id: int | None = None) -> Lote:
    nuevo = Lote(producto_id=p.id, fecha_ingreso=fecha_ingreso or date.today(),
                 fecha_vencimiento=fecha_vencimiento, lote=lote or "", cantidad=cantidad,
                 origen=origen, pedido_item_id=pedido_item_id, usuario=usuario)
    db.add(nuevo)
    tipo = "recepcion" if origen == "pedido" else "ingreso"
    _mover(db, p, p.cantidad_actual + cantidad, tipo, f"Ingreso de {cantidad} (lote {lote or 's/n'})", usuario)
    return nuevo


def registrar_conteo(db: Session, p: Producto, cantidad: int, usuario: str, nota: str = ""):
    """Inventario físico: la cantidad contada reemplaza a la registrada."""
    _mover(db, p, cantidad, "conteo", nota or "Conteo de inventario", usuario)
    if cantidad == 0:
        for l in p.lotes:
            if l.estado == "activo":
                l.estado = "agotado"


def estado_vencimiento(fecha: date | None, hoy: date | None = None) -> str:
    if fecha is None:
        return "sin_fecha"
    hoy = hoy or date.today()
    if fecha < hoy:
        return "vencido"
    if fecha <= hoy + timedelta(days=config.DIAS_ALERTA_VENCIMIENTO):
        return "por_vencer"
    return "vigente"


def alertas(db: Session) -> dict:
    hoy = date.today()
    limite = hoy + timedelta(days=config.DIAS_ALERTA_VENCIMIENTO)

    lotes = db.scalars(
        select(Lote).options(selectinload(Lote.producto))
        .where(Lote.estado == "activo", Lote.fecha_vencimiento.is_not(None), Lote.fecha_vencimiento <= limite)
        .order_by(Lote.fecha_vencimiento)
    ).all()
    vencidos = [l for l in lotes if l.fecha_vencimiento < hoy]
    por_vencer = [l for l in lotes if l.fecha_vencimiento >= hoy]

    bajo_minimo = db.scalars(
        select(Producto).where(Producto.activo.is_(True), Producto.cantidad_actual < Producto.stock_minimo)
        .order_by(Producto.nombre)
    ).all()

    # Pendientes de pedidos enviados que no han llegado.
    filas = db.execute(
        select(PedidoItem, Pedido).join(Pedido)
        .options(selectinload(PedidoItem.producto))
        .where(Pedido.estado.in_(["enviado", "recibido_parcial", "cerrado_con_pendientes"]),
               PedidoItem.estado.in_(["pendiente", "parcial"]))
        .order_by(Pedido.fecha_envio)
    ).all()
    veces = desabastecimiento_por_producto(db)
    pendientes = []
    for item, pedido in filas:
        dias = (datetime.now() - (pedido.fecha_envio or pedido.fecha_creacion)).days
        pendientes.append({
            "item": item, "pedido": pedido, "dias": dias,
            "faltante": item.cantidad_pedida - item.cantidad_recibida,
            "atrasado": dias >= config.DIAS_ALERTA_PENDIENTE,
            "posible_desabastecimiento": veces.get(item.producto_id, 0) >= config.PEDIDOS_PARA_DESABASTECIMIENTO,
        })
    return {"vencidos": vencidos, "por_vencer": por_vencer, "bajo_minimo": bajo_minimo, "pendientes": pendientes}


def desabastecimiento_por_producto(db: Session) -> dict[int, int]:
    """Cuántos de los últimos pedidos seguidos (ya recibidos o cerrados) dejaron pendiente cada producto.

    Si un producto no llega en N pedidos seguidos (2 por defecto) se marca como
    posible desabastecimiento en farmacia.
    """
    pedidos = db.scalars(
        select(Pedido).options(selectinload(Pedido.items))
        .where(Pedido.estado.in_(["recibido_parcial", "recibido", "cerrado_con_pendientes"]))
        .order_by(Pedido.fecha_envio.desc()).limit(10)
    ).all()
    racha: dict[int, int] = {}
    cortados: set[int] = set()
    for pedido in pedidos:  # del más reciente al más antiguo
        for item in pedido.items:
            pid = item.producto_id
            if pid in cortados:
                continue
            if item.estado in ("pendiente", "parcial"):
                racha[pid] = racha.get(pid, 0) + 1
            elif item.estado == "llego":
                cortados.add(pid)
    return racha


def resumen(db: Session) -> dict:
    a = alertas(db)
    return {
        "productos": db.scalar(select(func.count(Producto.id)).where(Producto.activo.is_(True))) or 0,
        "vencidos": len(a["vencidos"]),
        "por_vencer": len(a["por_vencer"]),
        "bajo_minimo": len(a["bajo_minimo"]),
        "pendientes": len(a["pendientes"]),
        "dias_alerta_vencimiento": config.DIAS_ALERTA_VENCIMIENTO,
    }
