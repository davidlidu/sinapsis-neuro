"""Conexión a la base de datos (SQLite por defecto)."""
from sqlalchemy import create_engine, event, inspect, text
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


# Columnas agregadas después de la primera versión: (tabla, columna, definición SQL).
# create_all no altera tablas existentes, así que se agregan aquí al arrancar.
COLUMNAS_NUEVAS = [
    ("productos", "pruebas_por_unidad", "INTEGER"),
    ("productos", "seccion", "VARCHAR(120) NOT NULL DEFAULT ''"),
    ("pedido_items", "motivo", "VARCHAR(120) NOT NULL DEFAULT ''"),
]


def asegurar_columnas():
    with engine.begin() as con:
        for tabla, columna, definicion in COLUMNAS_NUEVAS:
            existentes = {c["name"] for c in inspect(con).get_columns(tabla)}
            if columna not in existentes:
                con.execute(text(f"ALTER TABLE {tabla} ADD COLUMN {columna} {definicion}"))


def obtener_db():
    db = SesionLocal()
    try:
        yield db
    finally:
        db.close()
