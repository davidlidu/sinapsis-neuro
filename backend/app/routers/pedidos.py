"""Pedidos a farmacia: borrador sugerido, PDF del pedido final, recepción y pendientes."""
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .. import config
from ..database import obtener_db
from ..models import Pedido, PedidoItem, Usuario
from ..schemas import Cancelacion, Cierre, LineaPedido, Recepcion, item_json, pedido_json
from ..seguridad import usuario_actual
from ..services import pedidos as svc

router = APIRouter(prefix="/api/pedidos", tags=["Pedidos"])
MAX_PDF = 20 * 1024 * 1024


def _pedido(db: Session, pid: int) -> Pedido:
    p = db.scalar(select(Pedido).options(selectinload(Pedido.items).selectinload(PedidoItem.producto))
                  .where(Pedido.id == pid))
    if not p:
        raise HTTPException(404, "Pedido no encontrado.")
    return p


def _accion(fn, *args):
    try:
        return fn(*args)
    except svc.ErrorPedido as e:
        raise HTTPException(400, str(e))


@router.get("", summary="Listar pedidos")
def listar(_: Usuario = Depends(usuario_actual), db: Session = Depends(obtener_db)):
    return [pedido_json(p) for p in db.scalars(
        select(Pedido).options(selectinload(Pedido.items)).order_by(Pedido.id.desc()).limit(100))]


@router.post("", summary="Crear un borrador sugerido por stock mínimo")
def crear(u: Usuario = Depends(usuario_actual), db: Session = Depends(obtener_db)):
    borrador = db.scalar(select(Pedido).where(Pedido.estado == "borrador"))
    if borrador:
        raise HTTPException(400, f"Ya hay un borrador abierto (pedido #{borrador.id}). Termínelo o elimínelo primero.")
    p = svc.crear_borrador(db, u.usuario)
    return pedido_json(_pedido(db, p.id), con_items=True)


@router.get("/{pid}", summary="Detalle de un pedido")
def detalle(pid: int, _: Usuario = Depends(usuario_actual), db: Session = Depends(obtener_db)):
    return pedido_json(_pedido(db, pid), con_items=True)


@router.put("/{pid}/items", summary="Agregar, ajustar o quitar (cantidad 0) una línea del borrador")
def fijar_item(pid: int, datos: LineaPedido, _: Usuario = Depends(usuario_actual), db: Session = Depends(obtener_db)):
    p = _pedido(db, pid)
    _accion(svc.fijar_item, db, p, datos.producto_id, datos.cantidad)
    return pedido_json(_pedido(db, pid), con_items=True)


@router.delete("/{pid}", summary="Eliminar un borrador")
def eliminar(pid: int, _: Usuario = Depends(usuario_actual), db: Session = Depends(obtener_db)):
    p = _pedido(db, pid)
    if p.estado != "borrador":
        raise HTTPException(400, "Solo se puede eliminar un borrador.")
    db.delete(p)
    db.commit()
    return {"ok": True}


@router.post("/{pid}/enviar", summary="Confirmar el pedido adjuntando el PDF enviado a farmacia")
async def enviar(pid: int, pdf: UploadFile = File(...), _: Usuario = Depends(usuario_actual),
                 db: Session = Depends(obtener_db)):
    contenido = await pdf.read()
    if len(contenido) > MAX_PDF:
        raise HTTPException(413, "El PDF supera 20 MB.")
    if not contenido.startswith(b"%PDF"):
        raise HTTPException(400, "El archivo no es un PDF.")
    p = _pedido(db, pid)
    if p.estado != "borrador":
        raise HTTPException(400, "Este pedido ya fue enviado.")
    nombre_archivo = f"pedido_{pid}_{uuid.uuid4().hex[:8]}.pdf"
    (config.PEDIDOS_DIR / nombre_archivo).write_bytes(contenido)
    _accion(svc.marcar_enviado, db, p, nombre_archivo, (pdf.filename or "pedido.pdf")[:255])
    return pedido_json(_pedido(db, pid), con_items=True)


@router.get("/{pid}/pdf", summary="Descargar el PDF del pedido")
def ver_pdf(pid: int, _: Usuario = Depends(usuario_actual), db: Session = Depends(obtener_db)):
    p = _pedido(db, pid)
    if not p.archivo_pdf:
        raise HTTPException(404, "Este pedido no tiene PDF.")
    return FileResponse(config.PEDIDOS_DIR / p.archivo_pdf, media_type="application/pdf",
                        filename=p.nombre_pdf or f"pedido_{pid}.pdf")


@router.post("/{pid}/recibir", summary="Registrar lo que llegó de una línea (se suma al inventario)")
def recibir(pid: int, datos: Recepcion, u: Usuario = Depends(usuario_actual), db: Session = Depends(obtener_db)):
    p = _pedido(db, pid)
    item = _accion(svc.recibir_item, db, p, datos.item_id, datos.cantidad,
                   datos.fecha_vencimiento, datos.lote, u.usuario)
    return {"item": item_json(item), "pedido": pedido_json(_pedido(db, pid))}


@router.post("/{pid}/cancelar-pendiente", summary="Dejar de esperar una línea pendiente")
def cancelar_pendiente(pid: int, datos: Cancelacion, _: Usuario = Depends(usuario_actual),
                       db: Session = Depends(obtener_db)):
    _accion(svc.cancelar_pendiente, db, _pedido(db, pid), datos.item_id, datos.nota)
    return pedido_json(_pedido(db, pid), con_items=True)


@router.post("/{pid}/cerrar", summary="Cerrar la recepción; lo que no llegó queda con alerta")
def cerrar(pid: int, datos: Cierre, _: Usuario = Depends(usuario_actual), db: Session = Depends(obtener_db)):
    _accion(svc.cerrar, db, _pedido(db, pid), datos.observaciones)
    return pedido_json(_pedido(db, pid), con_items=True)
