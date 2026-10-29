"""Carga datos de demostración para probar Sinapsis en local. NO usar en producción.

Uso (desde la carpeta backend):  python ../scripts/datos_demo.py
"""
import random
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.database import Base, SesionLocal, engine  # noqa: E402
from app.models import Producto  # noqa: E402
from app.seguridad import asegurar_admin  # noqa: E402
from app.services import catalogo, inventario, pedidos  # noqa: E402

random.seed(7)
MEDICAMENTOS = [
    ("Levetiracetam", "500 mg x 30 tab"), ("Levetiracetam", "1000 mg x 30 tab"), ("Ácido valproico", "250 mg x 50 cap"),
    ("Carbamazepina", "200 mg x 30 tab"), ("Lamotrigina", "100 mg x 30 tab"), ("Fenitoína", "100 mg x 50 cap"),
    ("Topiramato", "50 mg x 60 tab"), ("Gabapentina", "300 mg x 30 cap"), ("Pregabalina", "75 mg x 28 cap"),
    ("Clonazepam", "2 mg x 30 tab"), ("Levodopa + Carbidopa", "250/25 mg x 30 tab"), ("Pramipexol", "0,25 mg x 30 tab"),
    ("Donepezilo", "10 mg x 28 tab"), ("Memantina", "10 mg x 30 tab"), ("Baclofeno", "10 mg x 30 tab"),
    ("Acetaminofén", "500 mg x 100 tab"), ("Ibuprofeno", "400 mg x 50 tab"), ("Dexametasona", "8 mg/2 ml ampolla"),
    ("Midazolam", "15 mg/3 ml ampolla"), ("Solución salina", "0,9 % x 500 ml"),
]
INSUMOS = [("Jeringa desechable", "5 ml"), ("Jeringa desechable", "10 ml"), ("Guantes de nitrilo", "Talla M x 100"),
           ("Electrodos EEG", "Paquete x 50"), ("Gasa estéril", "7,5 x 7,5 cm x 100"), ("Catéter intravenoso", "Calibre 20")]


def main():
    Base.metadata.create_all(engine)
    with SesionLocal() as db:
        asegurar_admin(db)
        if db.query(Producto).count():
            print("Ya hay productos: no se cargan datos de demostración.")
            return
        filas = []
        hoy = date.today()
        for i, (nombre, pres) in enumerate(MEDICAMENTOS + INSUMOS, start=1):
            es_insumo = i > len(MEDICAMENTOS)
            minimo = random.choice([10, 15, 20, 30, 50])
            cantidad = random.choice([0, minimo // 3, minimo - 2, minimo + 5, minimo * 2])
            filas.append({
                "fila": i + 1, "nombre": nombre, "referencia": f"{'INS' if es_insumo else 'MED'}-{i:04d}",
                "codigo_barras": None if es_insumo or i % 3 == 0 else f"770200{i:07d}",
                "metodo": "qr" if es_insumo else ("barras" if i % 3 else "nombre"), "alias": [],
                "presentacion": pres, "stock_minimo": minimo, "cantidad_actual": cantidad,
                "fecha_vencimiento": hoy + timedelta(days=random.choice([-12, 9, 21, 75, 200, 400])) if cantidad else None,
                "lote": f"L{random.randint(1000, 9999)}" if cantidad else "",
            })
        print(catalogo.aplicar_carga(db, filas, "demo"))
        p = pedidos.crear_borrador(db, "demo")
        pedidos.marcar_enviado(db, p, "", "pedido_demo.pdf")
        for item in p.items[:3]:
            pedidos.recibir_item(db, p, item.id, item.cantidad_pedida, hoy + timedelta(days=300), "R-01", "demo")
        pedidos.cerrar(db, p)
        print("Pedido de demostración:", p.id, p.estado, inventario.resumen(db))


if __name__ == "__main__":
    main()
