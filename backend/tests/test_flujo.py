"""Prueba de punta a punta: carga inicial → identificación → ingreso → pedido → recepción → alertas."""
import io
import os
import tempfile
from datetime import date, timedelta

os.environ["SINAPSIS_DATA_DIR"] = tempfile.mkdtemp(prefix="sinapsis_test_")
os.environ["SINAPSIS_ADMIN_CLAVE"] = "clave-de-prueba"
os.environ.pop("OPENROUTER_API_KEY", None)

import pytest
from fastapi.testclient import TestClient
from openpyxl import load_workbook
from PIL import Image, ImageDraw, ImageFont

from app.main import app
from app.services.catalogo import generar_plantilla
from app.services.texto import normalizar


@pytest.fixture(scope="module")
def c():
    with TestClient(app) as cliente:
        r = cliente.post("/api/auth/login", json={"usuario": "admin", "clave": "clave-de-prueba"})
        assert r.status_code == 200, r.text
        cliente.headers["Authorization"] = f"Bearer {r.json()['token']}"
        yield cliente


def _excel(filas):
    wb = load_workbook(io.BytesIO(generar_plantilla()))
    h = wb["Catalogo"]
    h.delete_rows(2, 2)
    for n, f in enumerate(filas, start=2):
        for col, valor in enumerate(f, start=1):
            h.cell(row=n, column=col, value=valor)
    s = io.BytesIO()
    wb.save(s)
    return s.getvalue()


def test_normalizar():
    assert normalizar("ACETAMINOFÉN 500MG Tabletas") == "acetaminofen 500 mg tab"


def test_sin_sesion_rechaza():
    with TestClient(app) as anon:
        assert anon.get("/api/productos").status_code == 401


def test_carga_valida_errores(c):
    malo = _excel([["", "R1", "", "", "", "", "x", 3, "", ""],
                   ["Uno", "R2", "", "", "", "", 1, 1, "", ""],
                   ["Dos", "R2", "", "", "", "", 1, 1, "31/02/2026", ""]])
    r = c.post("/api/productos/carga?aplicar=true", files={"archivo": ("c.xlsx", malo)}).json()
    assert not r["aplicado"]
    assert any("Fila 2" in e and "nombre vacío" in e for e in r["errores"])
    assert any("Fila 4" in e and "referencia repetida" in e for e in r["errores"])


def test_flujo_completo(c):
    vence = (date.today() + timedelta(days=10)).isoformat()
    archivo = _excel([
        ["Acetaminofén", "MED-0001", "7702001000011", "", "Paracetamol", "500 mg x 100 tab", 20, 35, vence, "L1"],
        ["Levetiracetam", "MED-0002", "", "nombre", "Keppra", "500 mg x 30 tab", 10, 4, "", ""],
        ["Jeringa desechable", "INS-0003", "", "qr", "", "5 ml", 50, 120, "", ""],
        ["Carbamazepina", "MED-0004", "", "", "", "200 mg x 30 tab", 15, 0, "", ""],
    ])
    r = c.post("/api/productos/carga?aplicar=true", files={"archivo": ("c.xlsx", archivo)}).json()
    assert r["aplicado"] and r["creados"] == 4, r

    # Identificación por código de barras y por QR propio
    p1 = c.get("/api/identificar/codigo/7702001000011").json()
    assert p1["referencia"] == "MED-0001"
    jeringa = c.get("/api/productos", params={"q": "jeringa"}).json()[0]
    assert c.get(f"/api/identificar/codigo/{jeringa['codigo_qr']}").json()["id"] == jeringa["id"]

    # Por texto con errores típicos de OCR y por alias
    cands = c.post("/api/identificar/texto", json={"texto": "LEVETIRACETAN 500MG"}).json()["candidatos"]
    assert cands[0]["referencia"] == "MED-0002"
    assert c.post("/api/identificar/texto", json={"texto": "keppra"}).json()["candidatos"][0]["referencia"] == "MED-0002"

    # Confirmar aprende la lectura como alias
    r = c.post("/api/identificar/confirmar", json={"producto_id": cands[0]["id"], "texto_leido": "LEVETlRACETAM 5OO"}).json()
    assert r["alias_aprendido"]

    # Ingreso manual con vencimiento
    lev = cands[0]["id"]
    r = c.post("/api/inventario/ingresos", json={"producto_id": lev, "cantidad": 2,
                                                  "fecha_vencimiento": "2020-01-01", "lote": "VIEJO"}).json()
    assert r["producto"]["cantidad_actual"] == 6

    alertas = c.get("/api/inventario/alertas").json()
    assert len(alertas["vencidos"]) == 1 and len(alertas["por_vencer"]) == 1
    assert {p["referencia"] for p in alertas["bajo_minimo"]} == {"MED-0002", "MED-0004"}

    # Pedido sugerido por stock mínimo, ajustado a mano
    ped = c.post("/api/pedidos").json()
    sug = {i["producto"]["referencia"]: i["cantidad_sugerida"] for i in ped["items"]}
    assert sug == {"MED-0002": 4, "MED-0004": 15}
    assert c.post("/api/pedidos").status_code == 400  # un solo borrador a la vez
    ped = c.put(f"/api/pedidos/{ped['id']}/items", json={"producto_id": jeringa["id"], "cantidad": 30}).json()
    assert ped["total_items"] == 3

    # No se envía sin PDF válido
    assert c.post(f"/api/pedidos/{ped['id']}/enviar", files={"pdf": ("x.pdf", b"hola")}).status_code == 400
    ped = c.post(f"/api/pedidos/{ped['id']}/enviar", files={"pdf": ("pedido.pdf", b"%PDF-1.4 prueba")}).json()
    assert ped["estado"] == "enviado"
    assert c.get(f"/api/pedidos/{ped['id']}/pdf").content.startswith(b"%PDF")

    items = {i["producto"]["referencia"]: i for i in ped["items"]}
    # Llega completo uno, parcial otro, y la jeringa no llega
    c.post(f"/api/pedidos/{ped['id']}/recibir", json={"item_id": items["MED-0002"]["id"], "cantidad": 4,
                                                      "fecha_vencimiento": "2028-01-31", "lote": "K9"})
    r = c.post(f"/api/pedidos/{ped['id']}/recibir", json={"item_id": items["MED-0004"]["id"], "cantidad": 5}).json()
    assert r["item"]["estado"] == "parcial" and r["pedido"]["estado"] == "recibido_parcial"
    assert c.get(f"/api/productos/{lev}").json()["cantidad_actual"] == 10  # lo recibido se sumó

    ped = c.post(f"/api/pedidos/{ped['id']}/cerrar", json={}).json()
    assert ped["estado"] == "cerrado_con_pendientes"
    pend = c.get("/api/inventario/alertas").json()["pendientes"]
    assert {p["producto"]["referencia"] for p in pend} == {"MED-0004", "INS-0003"}
    assert all(not p["posible_desabastecimiento"] for p in pend)

    # Segundo pedido en que la carbamazepina tampoco llega → posible desabastecimiento
    ped2 = c.post("/api/pedidos").json()
    ped2 = c.post(f"/api/pedidos/{ped2['id']}/enviar", files={"pdf": ("p2.pdf", b"%PDF-1.4")}).json()
    c.post(f"/api/pedidos/{ped2['id']}/cerrar", json={})
    pend = c.get("/api/inventario/alertas").json()["pendientes"]
    assert any(p["producto"]["referencia"] == "MED-0004" and p["posible_desabastecimiento"] for p in pend)

    # Entrega tardía sobre un pedido cerrado con pendientes
    r = c.post(f"/api/pedidos/{ped['id']}/recibir", json={"item_id": items["INS-0003"]["id"], "cantidad": 30})
    assert r.status_code == 200 and r.json()["item"]["estado"] == "llego"

    # Conteo físico, historial, etiquetas y exportación
    assert c.post(f"/api/inventario/conteo/{lev}", json={"cantidad": 7}).json()["cantidad_actual"] == 7
    assert c.get(f"/api/inventario/movimientos/{lev}").json()[0]["tipo"] == "conteo"
    hoja = c.get("/api/productos/etiquetas").text
    assert "SNP-" in hoja and "Jeringa" in hoja
    assert c.get("/api/productos/exportar").content[:2] == b"PK"


def test_ocr_foto(c):
    img = Image.new("RGB", (900, 260), "white")
    d = ImageDraw.Draw(img)
    d.text((30, 40), "LEVETIRACETAM", fill="black", font=ImageFont.load_default(size=72))
    d.text((30, 150), "500 mg x 30 tabletas", fill="black", font=ImageFont.load_default(size=48))
    s = io.BytesIO()
    img.save(s, format="JPEG")
    r = c.post("/api/identificar/foto", files={"foto": ("f.jpg", s.getvalue(), "image/jpeg")})
    if r.status_code == 503:
        pytest.skip("Tesseract no instalado")
    datos = r.json()
    assert datos["candidatos"] and datos["candidatos"][0]["referencia"] == "MED-0002", datos


def test_ia_desactivada(c):
    assert c.get("/api/identificar/ia/estado").json()["habilitada"] is False
    r = c.post("/api/identificar/ia", files={"foto": ("f.jpg", b"x", "image/jpeg")})
    assert r.status_code == 503
