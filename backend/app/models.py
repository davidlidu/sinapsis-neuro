"""Modelo de datos de Sinapsis. Documentado en docs/modelo-datos.md."""
from datetime import date, datetime

from sqlalchemy import (Boolean, Date, DateTime, ForeignKey, Integer, String, Text,
                        UniqueConstraint, func)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Usuario(Base):
    __tablename__ = "usuarios"
    id: Mapped[int] = mapped_column(primary_key=True)
    usuario: Mapped[str] = mapped_column(String(60), unique=True)
    nombre: Mapped[str] = mapped_column(String(120), default="")
    clave_hash: Mapped[str] = mapped_column(String(255))
    rol: Mapped[str] = mapped_column(String(20), default="operador")  # admin | operador
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    creado: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Sesion(Base):
    __tablename__ = "sesiones"
    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"))
    expira: Mapped[datetime] = mapped_column(DateTime)
    usuario: Mapped[Usuario] = relationship()


class Producto(Base):
    __tablename__ = "productos"
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(200))
    referencia: Mapped[str] = mapped_column(String(80), unique=True)
    codigo_barras: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    # Código propio que va impreso en la etiqueta QR (SNP-000123).
    codigo_qr: Mapped[str | None] = mapped_column(String(32), unique=True, nullable=True)
    presentacion: Mapped[str] = mapped_column(String(120), default="")
    # Cómo se identifica: barras | nombre | qr
    metodo_identificacion: Mapped[str] = mapped_column(String(10), default="nombre")
    nombre_normalizado: Mapped[str] = mapped_column(String(200), default="", index=True)
    stock_minimo: Mapped[int] = mapped_column(Integer, default=0)
    cantidad_actual: Mapped[int] = mapped_column(Integer, default=0)
    foto_referencia: Mapped[str | None] = mapped_column(String(255), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    creado: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    alias: Mapped[list["Alias"]] = relationship(back_populates="producto", cascade="all, delete-orphan")
    lotes: Mapped[list["Lote"]] = relationship(back_populates="producto", cascade="all, delete-orphan")


class Alias(Base):
    """Otros nombres con que aparece un producto. Crece con el uso (lecturas OCR confirmadas)."""
    __tablename__ = "alias"
    __table_args__ = (UniqueConstraint("producto_id", "texto_normalizado"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id", ondelete="CASCADE"))
    texto: Mapped[str] = mapped_column(String(200))
    texto_normalizado: Mapped[str] = mapped_column(String(200), index=True)
    origen: Mapped[str] = mapped_column(String(20), default="catalogo")  # catalogo | aprendido
    producto: Mapped[Producto] = relationship(back_populates="alias")


class Lote(Base):
    """Cada ingreso de un producto con su fecha de vencimiento (antes llamado 'ingresos')."""
    __tablename__ = "lotes"
    id: Mapped[int] = mapped_column(primary_key=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id", ondelete="CASCADE"), index=True)
    fecha_ingreso: Mapped[date] = mapped_column(Date)
    fecha_vencimiento: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    lote: Mapped[str] = mapped_column(String(60), default="")
    cantidad: Mapped[int] = mapped_column(Integer, default=0)
    # El lote deja de alertar cuando se agota o se retira (por vencido, por ejemplo).
    estado: Mapped[str] = mapped_column(String(12), default="activo")  # activo | agotado | retirado
    origen: Mapped[str] = mapped_column(String(20), default="manual")  # manual | carga_inicial | pedido
    pedido_item_id: Mapped[int | None] = mapped_column(ForeignKey("pedido_items.id"), nullable=True)
    usuario: Mapped[str] = mapped_column(String(60), default="")
    fecha_registro: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    producto: Mapped[Producto] = relationship(back_populates="lotes")


class Movimiento(Base):
    """Bitácora de todo cambio de cantidad, para poder auditar el inventario."""
    __tablename__ = "movimientos"
    id: Mapped[int] = mapped_column(primary_key=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id", ondelete="CASCADE"), index=True)
    tipo: Mapped[str] = mapped_column(String(20))  # carga_inicial | ingreso | recepcion | conteo
    cantidad_antes: Mapped[int] = mapped_column(Integer)
    cantidad_despues: Mapped[int] = mapped_column(Integer)
    detalle: Mapped[str] = mapped_column(String(255), default="")
    usuario: Mapped[str] = mapped_column(String(60), default="")
    fecha: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Pedido(Base):
    __tablename__ = "pedidos"
    id: Mapped[int] = mapped_column(primary_key=True)
    # borrador | enviado | recibido_parcial | recibido | cerrado_con_pendientes
    estado: Mapped[str] = mapped_column(String(24), default="borrador")
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    fecha_envio: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    fecha_cierre: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    archivo_pdf: Mapped[str | None] = mapped_column(String(255), nullable=True)
    nombre_pdf: Mapped[str | None] = mapped_column(String(255), nullable=True)
    usuario: Mapped[str] = mapped_column(String(60), default="")
    observaciones: Mapped[str] = mapped_column(Text, default="")
    items: Mapped[list["PedidoItem"]] = relationship(back_populates="pedido", cascade="all, delete-orphan")


class PedidoItem(Base):
    __tablename__ = "pedido_items"
    __table_args__ = (UniqueConstraint("pedido_id", "producto_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    pedido_id: Mapped[int] = mapped_column(ForeignKey("pedidos.id", ondelete="CASCADE"), index=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), index=True)
    cantidad_sugerida: Mapped[int] = mapped_column(Integer, default=0)
    cantidad_pedida: Mapped[int] = mapped_column(Integer, default=0)
    cantidad_recibida: Mapped[int] = mapped_column(Integer, default=0)
    # pendiente | parcial | llego | cancelado
    estado: Mapped[str] = mapped_column(String(12), default="pendiente")
    fecha_recepcion: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    nota: Mapped[str] = mapped_column(String(255), default="")
    pedido: Mapped[Pedido] = relationship(back_populates="items")
    producto: Mapped[Producto] = relationship()


class LlamadaIA(Base):
    """Registro de cada uso del respaldo con IA, para controlar el consumo."""
    __tablename__ = "llamadas_ia"
    id: Mapped[int] = mapped_column(primary_key=True)
    fecha: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)
    modelo: Mapped[str] = mapped_column(String(120))
    exito: Mapped[bool] = mapped_column(Boolean, default=False)
    texto: Mapped[str] = mapped_column(String(500), default="")
    error: Mapped[str] = mapped_column(String(255), default="")
    usuario: Mapped[str] = mapped_column(String(60), default="")
