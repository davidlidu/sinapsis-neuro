"""Ciclo de pedidos a farmacia.

Borrador (sugerido: en cero, bajo el mínimo o por vencer; confirmado a mano) → Enviado (con PDF)
→ Recibido parcial → Recibido, o Cerrado con pendientes.
"""
from datetime import date, datetime, timedelta

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..models import Lote, Pedido, PedidoItem, Producto
from . import ajustes
from .inventario import registrar_ingreso


class ErrorPedido(ValueError):
    pass


def cantidad_sugerida(p: Producto) -> int:
    """Unidades necesarias para volver a cubrir el stock mínimo.

    Si el producto se cuenta por pruebas, el faltante en pruebas se redondea hacia arriba a kits.
    """
    faltan = max(p.stock_minimo - p.cantidad_actual, 0)
    return -(-faltan // p.pruebas_por_unidad) if p.pruebas_por_unidad else faltan


def _unidades(p: Producto, cantidad: int) -> int:
    return -(-cantidad // p.pruebas_por_unidad) if p.pruebas_por_unidad else cantidad


def crear_borrador(db: Session, usuario: str) -> Pedido:
    """Arma un pedido con lo que está en cero, bajo el mínimo o con lotes que vencen pronto.

    Los días de "vence pronto" se configuran en Más opciones → Configuración. Nunca se envía solo:
    el operador revisa, quita lo que no necesita y confirma con el PDF.
    """
    hoy = date.today()
    limite = hoy + timedelta(days=ajustes.valor("dias_vencimiento_pedido"))
    por_vencer: dict[int, list[Lote]] = {}
    for l in db.scalars(select(Lote).where(Lote.estado == "activo", Lote.fecha_vencimiento.is_not(None),
                                           Lote.fecha_vencimiento <= limite)):
        por_vencer.setdefault(l.producto_id, []).append(l)

    pedido = Pedido(estado="borrador", usuario=usuario)
    db.add(pedido)
    candidatos = db.scalars(select(Producto).where(Producto.activo.is_(True), or_(
        Producto.cantidad_actual <= 0, Producto.cantidad_actual < Producto.stock_minimo,
        Producto.id.in_(por_vencer.keys()))).order_by(Producto.nombre))
    for p in candidatos:
        motivos, q = [], cantidad_sugerida(p)
        if p.cantidad_actual <= 0:
            motivos.append("En cero")
            q = max(q, 1)
        elif p.cantidad_actual < p.stock_minimo:
            motivos.append("Bajo el mínimo")
        if p.id in por_vencer:
            lotes = por_vencer[p.id]
            primero = min(l.fecha_vencimiento for l in lotes)
            dias = (primero - hoy).days
            motivos.append("Vencido" if dias < 0 else "Vence hoy" if dias == 0 else f"Vence en {dias} {'día' if dias == 1 else 'días'}")
            # Reponer lo que se va a perder, sin pedir menos de lo que falta para el mínimo.
            q = max(q, _unidades(p, sum(l.cantidad for l in lotes)), 1)
        pedido.items.append(PedidoItem(producto_id=p.id, cantidad_sugerida=q, cantidad_pedida=q,
                                       motivo=" · ".join(motivos)))
    db.commit()
    return pedido


def borrador_desde_lineas(db: Session, usuario: str, lineas: dict[int, int]) -> Pedido:
    """Borrador armado a mano con el formato de pedido (PDF o Excel) ya lleno."""
    pedido = Pedido(estado="borrador", usuario=usuario)
    db.add(pedido)
    for producto_id, cantidad in lineas.items():
        pedido.items.append(PedidoItem(producto_id=producto_id, cantidad_sugerida=0, cantidad_pedida=cantidad,
                                       motivo="Formato manual"))
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
