"""Sinapsis — plataforma de inventario, vencimientos y pedidos.

Desarrollado por DeerSystems para el Instituto Neurológico de Colombia.
Desarrollo sin ánimo de lucro.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import config
from .database import Base, SesionLocal, engine
from .routers import auth, identificar, inventario, pedidos, productos
from .seguridad import asegurar_admin

VERSION = "0.1.0"
log = logging.getLogger("sinapsis")


@asynccontextmanager
async def ciclo_de_vida(_: FastAPI):
    Base.metadata.create_all(engine)
    with SesionLocal() as db:
        clave = asegurar_admin(db)
    if clave:
        log.warning("Se creó el usuario '%s' con la clave temporal: %s  (cámbiela al ingresar)",
                    config.ADMIN_USUARIO, clave)
    yield


app = FastAPI(
    title="Sinapsis API",
    version=VERSION,
    description="Inventario, vencimientos y pedidos a farmacia del Instituto Neurológico de Colombia. "
                "Desarrollado por DeerSystems (sin ánimo de lucro).",
    lifespan=ciclo_de_vida,
)

for r in (auth, productos, identificar, inventario, pedidos):
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
