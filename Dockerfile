# Sinapsis — imagen única (API + app del celular). DeerSystems.
FROM python:3.13-slim

# Tesseract con español para leer los nombres de los productos (OCR sin IA).
RUN apt-get update \
 && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-spa tesseract-ocr-eng \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/app backend/app
COPY frontend frontend

ENV SINAPSIS_DATA_DIR=/datos \
    SINAPSIS_FRONTEND_DIR=/app/frontend \
    PYTHONUNBUFFERED=1

RUN useradd --create-home --uid 1000 sinapsis && mkdir -p /datos && chown sinapsis /datos
USER sinapsis
WORKDIR /app/backend
EXPOSE 8000

HEALTHCHECK --interval=60s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/salud')"

# Un solo proceso: suficiente para el instituto y cuida la RAM del VPS compartido.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--proxy-headers"]
