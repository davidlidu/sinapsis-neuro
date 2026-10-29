"""Lectura de texto en fotos con Tesseract (sin IA).

Se usa Pillow para el preprocesamiento en lugar de OpenCV: hace lo necesario
(escala de grises, contraste, tamaño) y pesa mucho menos en el contenedor.
Ver docs/decisiones.md.
"""
import io
import threading

from PIL import Image, ImageFilter, ImageOps

from .. import config

_semaforo = threading.BoundedSemaphore(config.OCR_MAX_SIMULTANEOS)
_idioma_resuelto: str | None = None


class OCRNoDisponible(RuntimeError):
    pass


def _idioma() -> str:
    """Usa los idiomas configurados que estén instalados (spa+eng por defecto)."""
    global _idioma_resuelto
    if _idioma_resuelto is None:
        import pytesseract
        try:
            instalados = set(pytesseract.get_languages(config=""))
        except Exception as e:  # Tesseract no instalado
            raise OCRNoDisponible(str(e)) from e
        pedidos = [i for i in config.OCR_IDIOMA.split("+") if i in instalados]
        _idioma_resuelto = "+".join(pedidos) or "eng"
    return _idioma_resuelto


def preparar_imagen(contenido: bytes, ancho_max: int = 1600) -> Image.Image:
    img = Image.open(io.BytesIO(contenido))
    img = ImageOps.exif_transpose(img)  # respeta la orientación de la foto del celular
    img = img.convert("L")
    if img.width > ancho_max:
        img = img.resize((ancho_max, int(img.height * ancho_max / img.width)))
    elif img.width < 800:
        img = img.resize((img.width * 2, img.height * 2))
    img = ImageOps.autocontrast(img, cutoff=2)
    return img.filter(ImageFilter.SHARPEN)


def leer_texto(contenido: bytes) -> str:
    import pytesseract
    idioma = _idioma()
    img = preparar_imagen(contenido)
    # Un solo OCR a la vez (configurable) para que los picos de RAM no se sumen.
    with _semaforo:
        texto = pytesseract.image_to_string(img, lang=idioma, config="--psm 6")
    lineas = [l.strip() for l in texto.splitlines() if len(l.strip()) >= 3]
    return "\n".join(lineas)
