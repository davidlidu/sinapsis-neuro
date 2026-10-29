"""Etiquetas QR para productos sin código de barras ni nombre legible."""
import html
import io

import qrcode
import qrcode.image.svg

from ..models import Producto


def qr_svg(texto: str) -> str:
    img = qrcode.make(texto, image_factory=qrcode.image.svg.SvgPathImage, box_size=10, border=2)
    salida = io.BytesIO()
    img.save(salida)
    svg = salida.getvalue().decode()
    return svg[svg.find("<svg"):]


def hoja_etiquetas(productos: list[Producto]) -> str:
    """Hoja carta lista para imprimir: 3 columnas de etiquetas de 6 x 3 cm aprox."""
    tarjetas = "".join(
        f"""<div class="et"><div class="qr">{qr_svg(p.codigo_qr)}</div>
        <div class="tx"><b>{html.escape(p.nombre)}</b><span>{html.escape(p.presentacion)}</span>
        <code>{html.escape(p.codigo_qr)}</code><small>Cód. farmacia {html.escape(p.referencia)}</small></div></div>"""
        for p in productos if p.codigo_qr
    )
    return f"""<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Etiquetas QR · Sinapsis</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
@page {{ size: letter; margin: 10mm; }}
body {{ font-family: Inter, system-ui, sans-serif; color: #1e293b; background: #fff; margin: 0; }}
header {{ display: flex; justify-content: space-between; align-items: center; margin: 0 0 6mm; font-size: 11px; color: #5b6b80; }}
header button {{ font: 600 13px Inter, sans-serif; background: #7ed957; color: #051923; border: 0; border-radius: 6px; padding: 8px 14px; cursor: pointer; }}
.grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; }}
.et {{ display: flex; gap: 2mm; border: 1px solid #1e293b33; border-radius: 6px; padding: 2mm; height: 30mm; box-sizing: border-box; break-inside: avoid; }}
.qr svg {{ width: 26mm; height: 26mm; display: block; }}
.tx {{ display: flex; flex-direction: column; gap: 1mm; min-width: 0; font-size: 9px; line-height: 1.25; }}
.tx b {{ font-size: 10px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }}
.tx span, .tx small {{ color: #5b6b80; }}
code {{ font-family: "JetBrains Mono", monospace; font-size: 10px; }}
@media print {{ header button {{ display: none; }} }}
</style></head><body>
<header><span>Sinapsis · Instituto Neurológico de Colombia · {len(productos)} etiquetas</span>
<button onclick="window.print()">Imprimir</button></header>
<div class="grid">{tarjetas}</div></body></html>"""
