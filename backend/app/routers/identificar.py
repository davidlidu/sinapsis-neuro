"""Identificación de productos: código → OCR local → IA de respaldo. El usuario siempre confirma."""
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from rapidfuzz import fuzz
from sqlalchemy.orm import Session

from .. import config
from ..database import obtener_db
from ..models import Alias, Producto, Usuario
from ..schemas import BusquedaTexto, Confirmacion, producto_json
from ..seguridad import usuario_actual
from ..services import ia_respaldo, ocr
from ..services.busqueda import buscar_por_codigo, buscar_por_texto
from ..services.texto import normalizar

router = APIRouter(prefix="/api/identificar", tags=["Identificación"])
MAX_FOTO = 8 * 1024 * 1024


def _candidatos(resultados: list[dict]) -> list[dict]:
    return [{**producto_json(r["producto"]), "puntaje": r["puntaje"]} for r in resultados]


@router.get("/codigo/{valor}", summary="Buscar por código de barras, QR propio o referencia")
def por_codigo(valor: str, _: Usuario = Depends(usuario_actual), db: Session = Depends(obtener_db)):
    p = buscar_por_codigo(db, valor)
    if not p:
        raise HTTPException(404, "Ningún producto tiene ese código.")
    return producto_json(p)


@router.post("/texto", summary="Buscar por texto escrito o leído")
def por_texto(datos: BusquedaTexto, _: Usuario = Depends(usuario_actual), db: Session = Depends(obtener_db)):
    return {"texto": datos.texto, "candidatos": _candidatos(buscar_por_texto(db, datos.texto))}


@router.post("/foto", summary="Leer el nombre en una foto con OCR (Tesseract) y buscarlo")
async def por_foto(foto: UploadFile = File(...), _: Usuario = Depends(usuario_actual),
                   db: Session = Depends(obtener_db)):
    contenido = await foto.read()
    if len(contenido) > MAX_FOTO:
        raise HTTPException(413, "La foto supera 8 MB.")
    try:
        texto = await run_in_threadpool(ocr.leer_texto, contenido)
    except ocr.OCRNoDisponible:
        raise HTTPException(503, "El lector de texto no está instalado en el servidor.")
    except Exception:
        raise HTTPException(400, "No se pudo leer la imagen.")
    return {"texto": texto, "candidatos": _candidatos(buscar_por_texto(db, texto)) if texto else [],
            "ia_disponible": config.IA_HABILITADA}


@router.post("/ia", summary="Respaldo: leer la foto con IA (OpenRouter) y buscar en el catálogo")
async def por_ia(foto: UploadFile = File(...), u: Usuario = Depends(usuario_actual),
                 db: Session = Depends(obtener_db)):
    contenido = await foto.read()
    if len(contenido) > MAX_FOTO:
        raise HTTPException(413, "La foto supera 8 MB.")
    try:
        datos = await run_in_threadpool(ia_respaldo.leer_con_ia, db, contenido, u.usuario)
    except ia_respaldo.IANoDisponible as e:
        raise HTTPException(503, str(e))
    # Si la IA leyó un código, se intenta primero de forma exacta.
    for campo in ("codigo", "referencia"):
        if datos.get(campo):
            p = buscar_por_codigo(db, datos[campo])
            if p:
                return {"leido": datos, "texto": datos[campo], "candidatos": [{**producto_json(p), "puntaje": 100}]}
    texto = " ".join(str(datos.get(c, "")) for c in ("nombre", "presentacion")).strip()
    return {"leido": datos, "texto": texto, "candidatos": _candidatos(buscar_por_texto(db, texto)) if texto else []}


@router.get("/ia/estado", summary="Si el respaldo con IA está activo y cuánto se ha usado hoy")
def estado_ia(_: Usuario = Depends(usuario_actual), db: Session = Depends(obtener_db)):
    return {"habilitada": config.IA_HABILITADA, "usadas_hoy": ia_respaldo.llamadas_de_hoy(db),
            "limite_diario": config.IA_LIMITE_DIARIO}


@router.post("/confirmar", summary="Confirmar el producto correcto y aprender la lectura como alias")
def confirmar(datos: Confirmacion, _: Usuario = Depends(usuario_actual), db: Session = Depends(obtener_db)):
    p = db.get(Producto, datos.producto_id)
    if not p:
        raise HTTPException(404, "Producto no encontrado.")
    aprendido = False
    # Se guarda solo la línea más parecida, para no aprender ruido del OCR.
    lineas = [l for l in datos.texto_leido.splitlines() if len(normalizar(l)) >= 4] or [datos.texto_leido]
    mejor = max(lineas, key=lambda l: fuzz.WRatio(normalizar(l), p.nombre_normalizado), default="")
    tn = normalizar(mejor)[:200]
    if tn and tn != p.nombre_normalizado and all(a.texto_normalizado != tn for a in p.alias):
        p.alias.append(Alias(texto=mejor.strip()[:200], texto_normalizado=tn, origen="aprendido"))
        db.commit()
        aprendido = True
    return {"ok": True, "alias_aprendido": aprendido}
