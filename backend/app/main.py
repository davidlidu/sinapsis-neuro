"""Sinapsis — plataforma de inventario, vencimientos y pedidos.

Desarrollado por DeerSystems para el Instituto Neurológico de Colombia.
Desarrollo sin ánimo de lucro.
"""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import config
from .database import Base, SesionLocal, asegurar_columnas, engine
from .routers import ajustes, auth, identificar, inventario, notificaciones, pedidos, productos, secciones
from .services import ajustes as svc_ajustes
from .services import secciones as svc_secciones
from .services.notificaciones import ciclo_diario
from .seguridad import asegurar_admin

VERSION = "0.3.3"
log = logging.getLogger("sinapsis")


@asynccontextmanager
async def ciclo_de_vida(_: FastAPI):
    Base.metadata.create_all(engine)
    asegurar_columnas()
    with SesionLocal() as db:
        clave = asegurar_admin(db)
        svc_ajustes.cargar(db)
        svc_secciones.sincronizar(db)
    if clave:
        log.warning("Se creó el usuario '%s' con la clave temporal: %s  (cámbiela al ingresar)",
                    config.ADMIN_USUARIO, clave)
    tarea = asyncio.create_task(ciclo_diario()) if config.NOTIFICACIONES_HABILITADAS else None
    yield
    if tarea:
        tarea.cancel()


app = FastAPI(
    title="Sinapsis API",
    version=VERSION,
    description="Inventario, vencimientos y pedidos a farmacia del Instituto Neurológico de Colombia. "
                "Desarrollado por DeerSystems (sin ánimo de lucro).",
    lifespan=ciclo_de_vida,
)

for r in (auth, productos, identificar, inventario, pedidos, notificaciones, ajustes, secciones):
    app.include_router(r.router)


@app.get("/api/salud", tags=["Sistema"], summary="Estado del servicio")
def salud():
    return {"ok": True, "version": VERSION, "ia_respaldo": config.IA_HABILITADA}


# La app del celular (PWA) se sirve desde el mismo servidor.
if config.FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=config.FRONTEND_DIR / "assets"), name="assets")

    @app.get("/", include_in_schema=False)
    def inicio():
        return FileResponse(config.FRONTEND_DIR / "index.html")

    @app.get("/{archivo}", include_in_schema=False)
    def archivo_raiz(archivo: str):
        ruta = (config.FRONTEND_DIR / archivo).resolve()
        if ruta.parent == config.FRONTEND_DIR.resolve() and ruta.is_file():
            return FileResponse(ruta, headers={"Cache-Control": "no-cache"})
        return FileResponse(config.FRONTEND_DIR / "index.html")
