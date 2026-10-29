"""Entradas de la API (validadas) y conversión de modelos a JSON."""
from datetime import date

from pydantic import BaseModel, Field

from .models import Lote, Pedido, PedidoItem, Producto
from .services.inventario import estado_vencimiento


# ---------- Entradas ----------
class Login(BaseModel):
    usuario: str
    clave: str


class NuevoUsuario(BaseModel):
    usuario: str = Field(min_length=3, max_length=60)
    nombre: str = ""
    clave: str = Field(min_length=8)
    rol: str = Field(default="operador", pattern="^(admin|operador)$")


class CambioClave(BaseModel):
    actual: str
    nueva: str = Field(min_length=8)


class ProductoEntrada(BaseModel):
    nombre: str = Field(min_length=1, max_length=200)
    referencia: str = Field(min_length=1, max_length=80)
    codigo_barras: str | None = None
    presentacion: str = ""
    metodo_identificacion: str = Field(default="nombre", pattern="^(barras|nombre|qr)$")
    stock_minimo: int = Field(default=0, ge=0)
    pruebas_por_unidad: int | None = Field(default=None, gt=0)
    seccion: str = Field(default="", max_length=120)


class Ingreso(BaseModel):
    producto_id: int
    cantidad: int = Field(gt=0)
    fecha_vencimiento: date | None = None
    fecha_ingreso: date | None = None
    lote: str = ""


class Conteo(BaseModel):
    cantidad: int = Field(ge=0)
    nota: str = ""


class BusquedaTexto(BaseModel):
    texto: str


class Confirmacion(BaseModel):
    producto_id: int
    texto_leido: str = ""


class LineaPedido(BaseModel):
    producto_id: int
    cantidad: int = Field(ge=0)


class Recepcion(BaseModel):
    item_id: int
    cantidad: int = Field(gt=0)
    fecha_vencimiento: date | None = None
    lote: str = ""


class Cancelacion(BaseModel):
    item_id: int
    nota: str = ""


class Cierre(BaseModel):
    observaciones: str = ""


# ---------- Salidas ----------
def producto_json(p: Producto, detalle: bool = False) -> dict:
    d = {
        "id": p.id, "nombre": p.nombre, "referencia": p.referencia,
        "codigo_barras": p.codigo_barras, "codigo_qr": p.codigo_qr,
        "presentacion": p.presentacion, "metodo_identificacion": p.metodo_identificacion,
        "stock_minimo": p.stock_minimo, "cantidad_actual": p.cantidad_actual,
        "pruebas_por_unidad": p.pruebas_por_unidad, "seccion": p.seccion,
        "bajo_minimo": p.cantidad_actual < p.stock_minimo, "activo": p.activo,
    }
    if detalle:
        d["alias"] = [{"id": a.id, "texto": a.texto, "origen": a.origen} for a in p.alias]
        d["lotes"] = [lote_json(l, con_producto=False) for l in
                      sorted(p.lotes, key=lambda l: (l.fecha_vencimiento is None, l.fecha_vencimiento or date.max))
                      if l.estado == "activo"]
    return d


def lote_json(l: Lote, con_producto: bool = True) -> dict:
    d = {
        "id": l.id, "producto_id": l.producto_id, "fecha_ingreso": l.fecha_ingreso,
        "fecha_vencimiento": l.fecha_vencimiento, "lote": l.lote, "cantidad": l.cantidad,
        "estado": l.estado, "origen": l.origen, "usuario": l.usuario,
        "estado_vencimiento": estado_vencimiento(l.fecha_vencimiento),
    }
    if con_producto:
        d["producto"] = {"id": l.producto.id, "nombre": l.producto.nombre,
                         "referencia": l.producto.referencia, "presentacion": l.producto.presentacion,
                         "pruebas_por_unidad": l.producto.pruebas_por_unidad}
    return d


def item_json(i: PedidoItem) -> dict:
    return {
        "id": i.id, "producto_id": i.producto_id,
        "producto": {"nombre": i.producto.nombre, "referencia": i.producto.referencia,
                     "presentacion": i.producto.presentacion, "codigo_barras": i.producto.codigo_barras,
                     "codigo_qr": i.producto.codigo_qr, "cantidad_actual": i.producto.cantidad_actual,
                     "stock_minimo": i.producto.stock_minimo,
                     "pruebas_por_unidad": i.producto.pruebas_por_unidad},
        "cantidad_sugerida": i.cantidad_sugerida, "cantidad_pedida": i.cantidad_pedida,
        "cantidad_recibida": i.cantidad_recibida, "estado": i.estado,
        "fecha_recepcion": i.fecha_recepcion, "nota": i.nota, "motivo": i.motivo,
    }


def pedido_json(p: Pedido, con_items: bool = False) -> dict:
    d = {
        "id": p.id, "estado": p.estado, "fecha_creacion": p.fecha_creacion,
        "fecha_envio": p.fecha_envio, "fecha_cierre": p.fecha_cierre,
        "tiene_pdf": bool(p.archivo_pdf), "nombre_pdf": p.nombre_pdf,
        "usuario": p.usuario, "observaciones": p.observaciones,
        "total_items": len(p.items),
        "pendientes": sum(1 for i in p.items if i.estado in ("pendiente", "parcial")),
    }
    if con_items:
        d["items"] = [item_json(i) for i in sorted(p.items, key=lambda i: i.producto.nombre)]
    return d
