"""Ciclo de pedidos a farmacia.

Borrador (sugerido por stock mínimo, confirmado a mano) → Enviado (con PDF)
→ Recibido parcial → Recibido, o Cerrado con pendientes.
"""
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Pedido, PedidoItem, Producto
from .inventario import registrar_ingreso


class ErrorPedido(ValueError):
    pass


def cantidad_sugerida(p: Producto) -> int:
    """Lo necesario para volver a cubrir el stock mínimo."""
    return max(p.stock_minimo - p.cantidad_actual, 0)


def crear_borrador(db: Session, usuario: str) -> Pedido:
    """Arma un pedido con todo lo que está por debajo del mínimo. Nunca se envía solo."""
    pedido = Pedido(estado="borrador", usuario=usuario)
    db.add(pedido)
    for p in db.scalars(
        select(Producto).where(Producto.activo.is_(True), Producto.cantidad_actual < Producto.stock_minimo)
        .order_by(Producto.nombre)
    ):
        q = cantidad_sugerida(p)
        pedido.items.append(PedidoItem(producto_id=p.id, cantidad_sugerida=q, cantidad_pedida=q))
    db.commit()
    return pedido


def _exigir_borrador(pedido: Pedido):
    if pedido.estado != "borrador":
        raise ErrorPedido("Solo se puede modificar un pedido en borrador.")


def fijar_item(db: Session, pedido: Pedido, producto_id: int, cantidad: int) -> None:
    """Agrega, ajusta o quita (cantidad 0) una línea del borrador."""
    _exigir_borrador(pedido)
    item = next((i for i in pedido.items if i.producto_id == producto_id), None)
    if cantidad <= 0:
        if item:
            pedido.items.remove(item)
    elif item:
        item.cantidad_pedida = cantidad
    else:
        if not db.get(Producto, producto_id):
            raise ErrorPedido("El producto no existe.")
        pedido.items.append(PedidoItem(producto_id=producto_id, cantidad_pedida=cantidad))
    db.commit()


def marcar_enviado(db: Session, pedido: Pedido, ruta_pdf: str, nombre_pdf: str) -> None:
    """Confirmación manual: se adjunta el PDF del pedido final enviado a farmacia."""
    _exigir_borrador(pedido)
    if not pedido.items:
        raise ErrorPedido("El pedido no tiene productos.")
    pedido.archivo_pdf, pedido.nombre_pdf = ruta_pdf, nombre_pdf
    pedido.estado = "enviado"
    pedido.fecha_envio = datetime.now()
    db.commit()


def recibir_item(db: Session, pedido: Pedido, item_id: int, cantidad: int,
                 fecha_vencimiento: date | None, lote: str, usuario: str) -> PedidoItem:
    """Registra lo que llegó de una línea. Lo recibido se suma al inventario."""
    # Un pedido cerrado con pendientes sigue aceptando entregas tardías.
    if pedido.estado not in ("enviado", "recibido_parcial", "cerrado_con_pendientes"):
        raise ErrorPedido("El pedido no está esperando mercancía.")
    item = next((i for i in pedido.items if i.id == item_id), None)
    if item is None:
        raise ErrorPedido("La línea no pertenece a este pedido.")
    if cantidad <= 0:
        raise ErrorPedido("La cantidad recibida debe ser mayor que cero.")
    registrar_ingreso(db, item.producto, cantidad, fecha_vencimiento, date.today(), lote,
                      usuario, origen="pedido", pedido_item_id=item.id)
    item.cantidad_recibida += cantidad
    item.fecha_recepcion = datetime.now()
    item.estado = "llego" if item.cantidad_recibida >= item.cantidad_pedida else "parcial"
    _actualizar_estado(pedido)
    db.commit()
    return item


def _actualizar_estado(pedido: Pedido):
    activos = [i for i in pedido.items if i.estado != "cancelado"]
    if activos and all(i.estado == "llego" for i in activos):
        pedido.estado, pedido.fecha_cierre = "recibido", datetime.now()
    elif pedido.estado == "enviado" and any(i.cantidad_recibida > 0 for i in activos):
        pedido.estado = "recibido_parcial"


def cerrar(db: Session, pedido: Pedido, observaciones: str = "") -> None:
    """Cierra la recepción. Lo que no llegó queda pendiente y con alerta."""
    if pedido.estado not in ("enviado", "recibido_parcial"):
        raise ErrorPedido("Este pedido no se puede cerrar.")
    pendientes = [i for i in pedido.items if i.estado in ("pendiente", "parcial")]
    pedido.estado = "cerrado_con_pendientes" if pendientes else "recibido"
    pedido.fecha_cierre = datetime.now()
    if observaciones:
        pedido.observaciones = observaciones
    db.commit()


def cancelar_pendiente(db: Session, pedido: Pedido, item_id: int, nota: str) -> None:
    """Quita la alerta de una línea que ya no se espera (se pidió en otro lado, etc.)."""
    item = next((i for i in pedido.items if i.id == item_id), None)
    if item is None or item.estado not in ("pendiente", "parcial"):
        raise ErrorPedido("La línea no está pendiente.")
    item.estado, item.nota = "cancelado", nota[:255]
    _actualizar_estado(pedido)
    db.commit()
