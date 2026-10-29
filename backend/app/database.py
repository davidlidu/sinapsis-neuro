"""Conexión a la base de datos (SQLite por defecto)."""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from . import config

_es_sqlite = config.DB_URL.startswith("sqlite")
engine = create_engine(
    config.DB_URL,
    connect_args={"check_same_thread": False} if _es_sqlite else {},
)

if _es_sqlite:
    @event.listens_for(engine, "connect")
    def _pragmas(conexion, _):
        # WAL permite lecturas mientras se escribe; foreign_keys activa las relaciones.
        cursor = conexion.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SesionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def obtener_db():
    db = SesionLocal()
    try:
        yield db
    finally:
        db.close()
