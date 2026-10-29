"""Normalización de texto para comparar lo que lee el OCR con el catálogo."""
import re
import unicodedata

# Abreviaturas que se unifican para que "500 MG", "500mg" y "500 mg." coincidan.
_UNIDADES = {
    "miligramos": "mg", "miligramo": "mg", "mgs": "mg",
    "mililitros": "ml", "mililitro": "ml", "mls": "ml",
    "gramos": "g", "gramo": "g", "gr": "g", "grs": "g",
    "microgramos": "mcg", "ug": "mcg",
    "tabletas": "tab", "tableta": "tab", "tabs": "tab",
    "capsulas": "cap", "capsula": "cap", "caps": "cap",
    "ampollas": "amp", "ampolla": "amp",
    "unidades": "und", "unidad": "und", "un": "und",
}


def normalizar(texto: str | None) -> str:
    if not texto:
        return ""
    t = unicodedata.normalize("NFKD", str(texto))
    t = "".join(c for c in t if not unicodedata.combining(c)).lower()
    # Separa número y unidad pegados: 500mg -> 500 mg
    t = re.sub(r"(\d)([a-z])", r"\1 \2", t)
    t = re.sub(r"[^a-z0-9%/ ]+", " ", t)
    palabras = [_UNIDADES.get(p, p) for p in t.split()]
    return " ".join(palabras)


def normalizar_codigo(codigo: str | None) -> str:
    """Códigos de barras y QR: sin espacios ni guiones de más, en mayúsculas."""
    if codigo is None:
        return ""
    codigo = str(codigo).strip()
    # Excel suele convertir códigos largos en número con ".0" al final.
    if re.fullmatch(r"\d+\.0", codigo):
        codigo = codigo[:-2]
    return re.sub(r"\s+", "", codigo).upper()
